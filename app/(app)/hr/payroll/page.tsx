'use client'
import { useState, useMemo } from 'react'
import { useApp } from '@/lib/auth'
import { Attendance, User, Branch, AppState } from '@/lib/types'
import { fmtVND } from '@/lib/calculations'
import { useModal } from '@/components/ModalProvider'
import {
    DollarSign,
    Calendar,
    User as UserIcon,
    Building,
    Clock,
    FileText,
    Download,
    Calculator,
    ChevronLeft,
    ChevronRight,
    Search,
    Filter,
    ArrowUpRight,
    CheckCircle,
    Briefcase
} from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import { JobTitle } from '@/lib/types'

interface PayrollItem {
    user: User
    totalWorkDays: number
    baseSalary: number
    totalAllowance: number
    config: NonNullable<User['salaryConfig']>
    computedSalary: number
    branch: Branch | undefined
    jobTitle: JobTitle | undefined
}

// Helper to format currency
// Using global fmtVND for consistency

export default function PayrollPage() {
    const { state } = useApp()
    const { showAlert } = useModal()
    const [selectedDate, setSelectedDate] = useState(new Date())
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedBranch, setSelectedBranch] = useState('all')
    const [viewingPayslip, setViewingPayslip] = useState<PayrollItem | null>(null)

    const monthStr = `${selectedDate.getFullYear()}-${(selectedDate.getMonth() + 1).toString().padStart(2, '0')}`

    // Calculate work days for each user in the selected month
    const payrollData = useMemo(() => {
        const users = state.users.filter(u => u.workStatus !== 'resigned')

        return users.map(user => {
            const userAttendance = state.attendance.filter(a =>
                a.userId === user.id &&
                a.date.startsWith(monthStr)
            )

            // Logic: present = 1, half_leave = 0.5, others = 0
            const totalWorkDays = userAttendance.reduce((acc, curr) => {
                if (curr.status === 'present') return acc + 1
                if (curr.status === 'half_leave') return acc + 0.5
                return acc
            }, 0)

            const salaryConfig = user.salaryConfig || { type: 'working_days', standardDays: 26, baseSalary: 0, allowances: [] }
            const config = {
                type: salaryConfig.type || 'working_days',
                standardDays: salaryConfig.standardDays || 26,
                baseSalary: salaryConfig.baseSalary || 0,
                allowances: salaryConfig.allowances || []
            } as NonNullable<User['salaryConfig']>
            
            const totalAllowance = config.allowances.reduce((sum: number, a: { amount?: number }) => sum + (a.amount || 0), 0)

            let computedSalary = 0
            if (config.type === 'fixed') {
                computedSalary = config.baseSalary + totalAllowance
            } else {
                computedSalary = Math.round((config.baseSalary / config.standardDays) * totalWorkDays) + totalAllowance
            }

            return {
                user,
                totalWorkDays,
                baseSalary: config.baseSalary,
                totalAllowance,
                config,
                computedSalary,
                branch: state.branches.find(b => b.id === user.branchId),
                jobTitle: state.jobTitles?.find(jt => jt.id === user.jobTitleId)
            }
        })
    }, [state.users, state.attendance, state.branches, state.jobTitles, monthStr])

    const filteredData = useMemo(() => {
        return payrollData.filter(item => {
            const matchesSearch = item.user.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.user.username.toLowerCase().includes(searchTerm.toLowerCase())
            const matchesBranch = selectedBranch === 'all' || item.user.branchId === selectedBranch
            return matchesSearch && matchesBranch
        })
    }, [payrollData, searchTerm, selectedBranch])

    const totalPayout = filteredData.reduce((acc, curr) => acc + curr.computedSalary, 0)

    const prevMonth = () => {
        const d = new Date(selectedDate)
        d.setMonth(d.getMonth() - 1)
        setSelectedDate(d)
    }

    const nextMonth = () => {
        const d = new Date(selectedDate)
        d.setMonth(d.getMonth() + 1)
        setSelectedDate(d)
    }

    return (
        <div className="page-container">
            <PageHeader
                icon={Calculator}
                title="Tổng hợp Công & Lương"
                subtitle="Chi phí nhân sự"
                description={`Báo cáo chi phí nhân sự • Tháng ${selectedDate.getMonth() + 1}/${selectedDate.getFullYear()}`}
            >
                <div className="flex items-center bg-gray-100/50 p-1 rounded-[15px] border border-gray-100 shadow-sm gap-1">
                    <button onClick={prevMonth} className="w-9 h-9 rounded-[12px] hover:bg-white text-text-soft opacity-40 hover:opacity-100 transition-all flex items-center justify-center">
                        <ChevronLeft size={16} strokeWidth={2.5} />
                    </button>
                    <div className="px-4 text-[11px] font-black text-text-main min-w-[140px] text-center uppercase tracking-wider">
                        Tháng {selectedDate.getMonth() + 1}, {selectedDate.getFullYear()}
                    </div>
                    <button onClick={nextMonth} className="w-9 h-9 rounded-[12px] hover:bg-white text-text-soft opacity-40 hover:opacity-100 transition-all flex items-center justify-center">
                        <ChevronRight size={16} strokeWidth={2.5} />
                    </button>
                </div>
            </PageHeader>

            <div className="px-10 py-12 pb-32 max-w-[1200px] mx-auto animate-fade-in space-y-10">

                {/* Quick Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="bg-text-main p-8 rounded-[40px] text-white shadow-2xl relative overflow-hidden group">
                        <div className="absolute -right-4 -top-4 w-32 h-32 bg-gold-muted/20 rounded-full blur-3xl group-hover:bg-gold-muted/30 transition-all origin-center"></div>
                        <div className="text-[10px] font-black uppercase tracking-[0.3em] text-gold-muted mb-4 opacity-80">Tổng chi trả dự kiến</div>
                        <div className="text-4xl font-serif font-bold tracking-tighter mb-6 tabular-nums">{fmtVND(totalPayout)}</div>
                        <div className="flex items-center gap-2 text-[10px] font-black bg-white/10 w-fit px-4 py-2 rounded-2xl border border-white/5">
                            <UserIcon size={14} strokeWidth={1.5} className="text-gold-muted" /> {filteredData.length} nhân sự tháng này
                        </div>
                    </div>

                    <div className="bg-white p-8 rounded-[40px] border border-gold-light/20 shadow-luxury relative overflow-hidden group">
                        <div className="text-[10px] font-black text-text-soft/60 uppercase tracking-[0.3em] mb-4">Tổng ngày công tích lũy</div>
                        <div className="text-4xl font-serif font-bold text-text-main tracking-tighter leading-none mb-6">
                            {filteredData.reduce((acc, curr) => acc + curr.totalWorkDays, 0)}
                            <span className="text-sm font-bold text-text-soft/40 ml-2 uppercase tracking-widest italic">Công thực tế</span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-gold-muted bg-gold-light/10 px-4 py-2 rounded-2xl border border-gold-light/20 w-fit">
                            <ArrowUpRight size={14} strokeWidth={2} /> Dữ liệu chấm công thời gian thực
                        </div>
                    </div>

                    <div className="bg-beige-soft/30 p-8 rounded-[40px] border border-dashed border-gold-muted/30 flex flex-col items-center justify-center group hover:bg-gold-light/10 transition-all">
                        <button className="flex flex-col items-center gap-4 text-text-soft/60 hover:text-gold-muted transition-all group-hover:scale-105">
                            <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center shadow-sm group-hover:shadow-luxury transition-all">
                                <Download size={24} strokeWidth={1.5} />
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-[0.4em]">Xuất báo cáo Excel</span>
                        </button>
                    </div>
                </div>

                {/* Main Table Area */}
                <div className="bg-white rounded-[40px] border border-gold-light/20 shadow-luxury overflow-hidden">
                    <div className="p-8 border-b border-gold-light/10 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/50">
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="flex gap-2 p-1.5 bg-beige-soft rounded-2xl w-fit">
                                <button
                                    onClick={() => setSelectedBranch('all')}
                                    className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedBranch === 'all' ? 'bg-white text-gold-muted shadow-sm ring-1 ring-gold-light/20' : 'text-text-soft/60 hover:text-text-soft hover:bg-white/50'}`}
                                >
                                    Tất cả
                                </button>
                                {state.branches.map(b => (
                                    <button
                                        key={b.id}
                                        onClick={() => setSelectedBranch(b.id)}
                                        className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedBranch === b.id ? 'bg-white text-gold-muted shadow-sm ring-1 ring-gold-light/20' : 'text-text-soft/60 hover:text-text-soft hover:bg-white/50'}`}
                                    >
                                        {b.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="relative group">
                            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gold-muted/40 group-focus-within:text-gold-muted transition-colors" size={16} strokeWidth={2} />
                            <input
                                type="text"
                                placeholder="Tìm kiếm nhân sự..."
                                className="pl-14 pr-6 py-4 bg-beige-soft/30 border-2 border-transparent rounded-2xl text-[13px] font-bold focus:bg-white focus:border-gold-light/30 focus:ring-4 focus:ring-gold-muted/5 w-full md:w-[320px] transition-all"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-separate border-spacing-0">
                            <thead>
                                <tr className="bg-beige-soft/30">
                                    <th className="px-8 py-5 text-[10px] font-black text-text-soft/60 uppercase tracking-[0.3em] border-b border-gold-light/10">Nhân sự / Chức vụ</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-text-soft/60 uppercase tracking-[0.3em] border-b border-gold-light/10 text-center">Ngày công máy</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-text-soft/60 uppercase tracking-[0.3em] border-b border-gold-light/10">Mức lương cơ bản</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-text-soft/60 uppercase tracking-[0.3em] border-b border-gold-light/10">Tổng phụ cấp</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-text-soft/60 uppercase tracking-[0.3em] border-b border-gold-light/10">Thành tiền tạm tính</th>
                                    <th className="px-8 py-5 border-b border-gold-light/10"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredData.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-20 text-center text-gray-400 font-bold italic">Không tìm thấy dữ liệu phù hợp.</td>
                                    </tr>
                                ) : (
                                    filteredData.map((item) => (
                                        <tr key={item.user.id} className="group hover:bg-beige-soft/20 transition-all duration-300">
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-2xl bg-beige-soft flex items-center justify-center font-black text-gold-muted border border-gold-light/30 group-hover:bg-white group-hover:shadow-luxury transition-all">
                                                        {item.user.displayName[0].toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="text-[14px] font-black text-text-main leading-tight group-hover:text-gold-muted transition-colors">{item.user.displayName}</div>
                                                        <div className="text-[10px] font-bold text-text-soft flex items-center gap-2 mt-1 opacity-60">
                                                            <Briefcase size={12} strokeWidth={1.5} className="text-gold-muted" /> {item.jobTitle?.name || 'Nhân sự'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-center">
                                                <div className="inline-flex flex-col items-center">
                                                    <div className={`text-xl font-serif font-bold ${item.totalWorkDays > 0 ? 'text-text-main' : 'text-text-soft/20'}`}>
                                                        {item.totalWorkDays}
                                                    </div>
                                                    <div className="text-[9px] font-black text-text-soft/40 uppercase tracking-widest mt-1">Ngày công</div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="text-[14px] font-black text-text-main tabular-nums">{fmtVND(item.baseSalary)}</div>
                                                <div className="text-[9px] font-black text-gold-muted uppercase tracking-widest mt-1 opacity-80 italic">
                                                    {item.config.type === 'fixed' ? 'Lương khoán' : `${item.config.standardDays} ngày công chuẩn`}
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 font-black text-emerald-600 text-[14px] tabular-nums">
                                                <div className="group/tooltip relative inline-flex cursor-help items-center gap-1.5">
                                                    {item.totalAllowance > 0 ? (
                                                        <span className="bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">+ {fmtVND(item.totalAllowance)}</span>
                                                    ) : <span className="text-text-soft/20">—</span>}

                                                    {item.config.allowances.length > 0 && (
                                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 w-[240px] p-6 bg-white border border-gold-light/20 shadow-2xl text-[11px] rounded-[24px] opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all z-50 transform translate-y-2 group-hover:tooltip:translate-y-0">
                                                            <div className="font-black text-text-soft uppercase tracking-[0.2em] mb-4 border-b border-beige-soft pb-2 opacity-60">Phụ cấp chi tiết</div>
                                                            <div className="space-y-3">
                                                                {item.config.allowances.map((a: any, i: number) => (
                                                                    <div key={i} className="flex justify-between items-center bg-beige-soft/30 p-2 rounded-xl border border-beige-soft">
                                                                        <span className="text-text-soft font-bold italic">{a.name || 'Phụ cấp'}</span>
                                                                        <span className="font-black text-emerald-600 tabular-nums">{fmtVND(a.amount || 0)}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                            <div className="absolute bottom-[-10px] left-1/2 -translate-x-1/2 border-[10px] border-transparent border-t-white" />
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="text-[20px] font-serif font-black text-text-main tracking-tighter leading-none tabular-nums">{fmtVND(item.computedSalary)}</div>
                                                <div className="flex items-center gap-1.5 text-[9px] font-black text-emerald-600 uppercase tracking-widest mt-1.5 opacity-80">
                                                    <CheckCircle size={10} strokeWidth={2} /> Tạm ứng chốt lương
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <button
                                                    onClick={() => setViewingPayslip(item)}
                                                    className="w-10 h-10 flex items-center justify-center text-gold-muted bg-white rounded-xl transition-all opacity-0 group-hover:opacity-100 shadow-luxury border border-gold-light/20 hover:scale-110 active:scale-95"
                                                >
                                                    <FileText size={20} strokeWidth={1.5} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="bg-white p-8 rounded-[40px] border border-gold-light/20 shadow-luxury flex items-start gap-6 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-gold-muted/40" />
                    <div className="p-4 bg-beige-soft rounded-2xl text-gold-muted shadow-sm flex-shrink-0">
                        <Calendar size={28} strokeWidth={1.5} />
                    </div>
                    <div>
                        <h3 className="text-[11px] font-black text-text-main uppercase tracking-[0.3em] mb-3">Lưu ý & Quy định tính toán lương</h3>
                        <p className="text-[13px] font-medium text-text-soft/80 mt-1 leading-relaxed italic">
                            Hệ thống tự động đồng bộ thời gian trực tuyến để tính toán: <strong>(Lương cơ bản / số công chuẩn) * Số công thực tế + Phụ cấp</strong>.
                            Dữ liệu chấm công được xác thực đa tầng (Vân tay & App). Mọi sai sót vui lòng liên hệ bộ phận Kế toán trước ngày 05 hàng tháng.
                            Các khoản hoa hồng doanh vụ và thưởng KPI được tổng hợp tại báo cáo chi tiết riêng biệt.
                        </p>
                    </div>
                </div>
            </div>

            {/* Payslip Quick View Modal */}
            {viewingPayslip && (
                <div className="modal-overlay" onClick={() => setViewingPayslip(null)}>
                    <div className="modal max-w-lg" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-start mb-8">
                            <div>
                                <h2 className="text-2xl font-serif font-bold text-text-main italic">Phiếu lương <span className="text-gold-muted">Chi tiết</span></h2>
                                <p className="text-[10px] font-black text-text-soft/60 uppercase tracking-widest mt-1">Tháng {selectedDate.getMonth() + 1}/{selectedDate.getFullYear()}</p>
                            </div>
                            <button onClick={() => setViewingPayslip(null)} className="w-10 h-10 rounded-full bg-beige-soft flex items-center justify-center text-text-soft hover:bg-rose-50 hover:text-rose-600 transition-all">
                                <Search size={18} className="rotate-45" />
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div className="p-6 bg-beige-soft/30 rounded-3xl border border-gold-light/20">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center font-black text-gold-muted shadow-sm">
                                        {viewingPayslip.user.displayName[0]}
                                    </div>
                                    <div>
                                        <div className="text-lg font-black text-text-main uppercase">{viewingPayslip.user.displayName}</div>
                                        <div className="text-[10px] font-bold text-text-soft/60 uppercase tracking-widest">{viewingPayslip.jobTitle?.name || 'Nhân sự'}</div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-white rounded-2xl">
                                        <div className="text-[9px] font-black text-text-soft/40 uppercase tracking-widest mb-1">Ngày công thực tế</div>
                                        <div className="text-xl font-serif font-bold text-text-main">{viewingPayslip.totalWorkDays} / {viewingPayslip.config.standardDays || 26}</div>
                                    </div>
                                    <div className="p-4 bg-white rounded-2xl">
                                        <div className="text-[9px] font-black text-text-soft/40 uppercase tracking-widest mb-1">Hệ số lương</div>
                                        <div className="text-xl font-serif font-bold text-emerald-600">{((viewingPayslip.totalWorkDays / (viewingPayslip.config.standardDays || 26)) * 100).toFixed(0)}%</div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex justify-between items-center text-[13px] px-2 font-medium">
                                    <span className="text-text-soft opacity-60">Lương cơ bản</span>
                                    <span className="font-bold">{fmtVND(viewingPayslip.baseSalary)}</span>
                                </div>
                                {viewingPayslip.config.allowances.map((a: { name?: string, amount?: number }, i: number) => (
                                    <div key={i} className="flex justify-between items-center text-[13px] px-2 font-medium">
                                        <span className="text-text-soft opacity-60">{a.name || 'Phụ cấp'}</span>
                                        <span className="font-black text-emerald-600">+ {fmtVND(a.amount || 0)}</span>
                                    </div>
                                ))}
                                <div className="pt-4 border-t border-gold-light/20 flex justify-between items-center px-2">
                                    <span className="text-xs font-black uppercase tracking-[0.2em] text-gold-muted">Tổng thực nhận</span>
                                    <span className="text-2xl font-serif font-black text-text-main italic tabular-nums">{fmtVND(viewingPayslip.computedSalary)}</span>
                                </div>
                            </div>

                            <button onClick={() => { setViewingPayslip(null); showAlert('Tính năng in phiếu lương đang được tối ưu hóa.', 'Thông báo') }} className="w-full py-4 bg-text-main text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-luxury hover:bg-gold-muted transition-all active:scale-95">
                                In phiếu lương (PDF)
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
