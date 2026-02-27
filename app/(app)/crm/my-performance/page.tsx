'use client'
import { useState, useMemo } from 'react'
import { useApp } from '@/lib/auth'
import { CommissionLog, UserMission } from '@/lib/types'
import { TrendingUp, Target, Award, Wallet, Clock, CheckCircle2, AlertCircle, ChevronRight, BarChart3, Star, Zap, UserPlus } from 'lucide-react'
import PageHeader from '@/components/PageHeader'

const formatVND = (v: number) => v.toLocaleString('vi-VN') + ' ₫'

export default function MyPerformancePage() {
    const { currentUser, state } = useApp()
    const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7)) // YYYY-MM

    const myLeads = useMemo(() => {
        return state.leads.filter(l => l.salePageId === currentUser?.id && l.createdAt.startsWith(period))
    }, [state.leads, currentUser, period])

    const myCommissions = useMemo(() => {
        return state.commissionLogs.filter(c => c.userId === currentUser?.id && c.createdAt.startsWith(period))
    }, [state.commissionLogs, currentUser, period])

    const myMissions = useMemo(() => {
        return state.userMissions.filter(m => m.userId === currentUser?.id && m.isActive)
    }, [state.userMissions, currentUser])

    const myStats = useMemo(() => {
        const totalComm = myCommissions.reduce((sum, c) => sum + c.amount, 0)
        const pendingComm = myCommissions.filter(c => c.status === 'pending').reduce((sum, c) => sum + c.amount, 0)
        const bookedCount = myLeads.filter(l => l.status === 'booked').length

        return {
            totalLead: myLeads.length,
            bookedLead: bookedCount,
            conversionRate: myLeads.length > 0 ? (bookedCount / myLeads.length * 100).toFixed(1) : '0',
            totalCommission: totalComm,
            pendingCommission: pendingComm
        }
    }, [myLeads, myCommissions])

    return (
        <div className="page-container">
            <PageHeader
                icon={BarChart3}
                title="Hiệu suất Cá nhân"
                subtitle="KPIs & Thu nhập cá nhân"
                description="Hệ thống CRM • Theo dõi mục tiêu và kết quả"
            >
                <div className="flex items-center gap-3 bg-gray-100/50 p-1 rounded-[15px] border border-gray-100 shadow-sm">
                    <span className="text-[10px] font-black text-text-soft opacity-40 uppercase tracking-widest pl-3">Kỳ báo cáo:</span>
                    <input
                        type="month"
                        className="bg-white border-none rounded-[12px] text-[10px] font-black py-2 px-3 focus:ring-0 cursor-pointer uppercase tracking-wider"
                        value={period}
                        onChange={e => setPeriod(e.target.value)}
                    />
                </div>
            </PageHeader>

            <div className="content-wrapper">
                {/* Earnings Overview Card */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl">
                        <div className="absolute top-0 right-0 p-8 opacity-10">
                            <TrendingUp size={160} />
                        </div>
                        <div className="relative z-10 flex flex-col h-full justify-between">
                            <div>
                                <div className="flex items-center gap-2 mb-2 text-indigo-300 font-black uppercase tracking-widest text-xs">
                                    <Star size={14} /> Thu nhập dự tính (Bao gồm tạm tính)
                                </div>
                                <div className="text-5xl font-black tracking-tight mb-2">
                                    {formatVND(myStats.totalCommission)}
                                </div>
                                <div className="flex items-center gap-4 text-emerald-400 text-sm font-bold">
                                    <span className="flex items-center gap-1 bg-emerald-400/10 px-3 py-1 rounded-full"><Award size={14} /> Rank: Gold Sale</span>
                                    <span className="text-slate-400">•</span>
                                    <span className="text-amber-400">Chờ duyệt: {formatVND(myStats.pendingCommission)}</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-6 mt-12 pt-8 border-t border-white/10">
                                <div>
                                    <p className="text-slate-400 text-[10px] uppercase font-black tracking-widest mb-1">Tổng Lead</p>
                                    <p className="text-xl font-black">{myStats.totalLead}</p>
                                </div>
                                <div>
                                    <p className="text-slate-400 text-[10px] uppercase font-black tracking-widest mb-1">Chốt lịch</p>
                                    <p className="text-xl font-black text-emerald-400">{myStats.bookedLead}</p>
                                </div>
                                <div>
                                    <p className="text-slate-400 text-[10px] uppercase font-black tracking-widest mb-1">Tỉ lệ chốt</p>
                                    <p className="text-xl font-black text-indigo-400">{myStats.conversionRate}%</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500">
                                    <Zap size={24} />
                                </div>
                                <div>
                                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Tiến độ KPI</p>
                                    <p className="text-lg font-black text-gray-900">Vượt 15%</p>
                                </div>
                            </div>
                            <ChevronRight className="text-gray-300" />
                        </div>
                        <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                                    <Wallet size={24} />
                                </div>
                                <div>
                                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Số dư ví</p>
                                    <p className="text-lg font-black text-gray-900">{formatVND(0)}</p>
                                </div>
                            </div>
                            <ChevronRight className="text-gray-300" />
                        </div>
                    </div>
                </div>

                {/* Missions Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
                                <Target size={20} className="text-rose-500" /> Nhiệm vụ & Chỉ tiêu
                            </h3>
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-100 px-3 py-1 rounded-full">Đang diễn ra</span>
                        </div>

                        <div className="space-y-4">
                            {myMissions.length === 0 ? (
                                <div className="bg-white p-12 rounded-[2rem] border-2 border-dashed border-gray-200 text-center">
                                    <p className="text-sm font-bold text-gray-400 italic">Quản lý chưa gán nhiệm vụ cho bạn trong kỳ này.</p>
                                </div>
                            ) : myMissions.map(m => {
                                // Simple mock progress calculation
                                let currentVal = 0
                                if (m.metricType === 'lead_count') {
                                    const today = new Date().toISOString().split('T')[0]
                                    currentVal = myLeads.filter(l => l.createdAt.startsWith(today)).length
                                }
                                else if (m.metricType === 'booking_count') currentVal = myStats.bookedLead
                                else currentVal = 0

                                const pct = Math.min(100, Math.round((currentVal / m.targetValue) * 100))

                                return (
                                    <div key={m.id} className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 group hover:border-indigo-200 transition-colors">
                                        <div className="flex justify-between items-start mb-6">
                                            <div>
                                                <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">{m.cycle === 'daily' ? 'Hàng ngày' : m.cycle === 'weekly' ? 'Hàng tuần' : 'Hàng tháng'}</p>
                                                <div className="text-base font-black text-gray-900 group-hover:text-indigo-600 transition-colors">
                                                    {m.metricType === 'lead_count' ? 'Thu thập Lead' : m.metricType === 'booking_count' ? 'Chốt khách đến' : 'Doanh thu cá nhân'}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm font-black text-emerald-500">+{formatVND(m.rewardAmount)}</div>
                                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Phần thưởng</div>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center text-xs font-bold text-gray-500">
                                                <span>Tiến độ: {currentVal} / {m.targetValue}</span>
                                                <span>{pct}%</span>
                                            </div>
                                            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-1000 ${pct >= 100 ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-indigo-600'}`}
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
                                <Clock size={20} className="text-indigo-500" /> Lịch sử Hoa hồng
                            </h3>
                            <button className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline">Xem tất cả</button>
                        </div>

                        <div className="bg-white rounded-[2rem] border border-gray-100 overflow-hidden shadow-sm">
                            {myCommissions.length === 0 ? (
                                <div className="p-12 text-center text-sm font-bold text-gray-400 italic">Chưa có bản ghi hoa hồng nào.</div>
                            ) : (
                                <div className="divide-y divide-gray-50">
                                    {myCommissions.slice(0, 5).map(c => (
                                        <div key={c.id} className="p-5 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${c.type.includes('lead') ? 'bg-blue-50 text-blue-500' : 'bg-emerald-50 text-emerald-500'
                                                    }`}>
                                                    {c.type.includes('lead') ? <UserPlus size={18} /> : <Award size={18} />}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-gray-900 line-clamp-1">{c.description}</p>
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{new Date(c.createdAt).toLocaleDateString('vi-VN')} • {c.type}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm font-black text-gray-900">+{formatVND(c.amount)}</div>
                                                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${c.status === 'pending' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'
                                                    }`}>{c.status === 'pending' ? 'Chờ duyệt' : 'Đã khóa'}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="p-6 bg-indigo-50/50 border border-indigo-100 rounded-[2rem] flex items-center gap-4">
                            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white">
                                <AlertCircle size={24} />
                            </div>
                            <div className="flex-1">
                                <p className="text-xs font-black text-indigo-900 uppercase tracking-widest mb-0.5">Lưu ý</p>
                                <p className="text-[11px] font-bold text-indigo-700/80 leading-relaxed">
                                    Hoa hồng tự động sẽ được cộng vào kỳ lương sau khi được bộ phận Kế toán duyệt. Tỉ lệ chốt thấp có thể ảnh hưởng đến Rank thưởng cuối tháng.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
