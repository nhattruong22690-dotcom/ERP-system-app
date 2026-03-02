'use client'
import { FileText, Search, Plus, Briefcase, Star, TrendingUp, Trash2 } from 'lucide-react'
import UserAvatar from '@/components/UserAvatar'

interface SummaryProps {
    isRosterEmpty: boolean
    filteredData: any[]
    monthStr: string
    isAdminOrAccounting: boolean
    isSubmitting: boolean
    onInitRoster?: () => void
    onAddUser?: () => void
    onDeleteRoster?: (userId: string) => void
    onViewPayslip?: (item: any) => void
    onViewDetails?: (item: any) => void

    // Filters
    selectedBranch?: string
    setSelectedBranch?: (branch: string) => void
    searchTerm?: string
    setSearchTerm?: (term: string) => void
    branches?: any[]
    canViewAll?: boolean

    formatVND: (amount: number) => string
}

export function SummaryHeader({
    isRosterEmpty,
    isAdminOrAccounting,
    onAddUser,
    selectedBranch,
    setSelectedBranch,
    searchTerm,
    setSearchTerm,
    branches,
    canViewAll,
    monthStr
}: Partial<SummaryProps>) {
    return (
        <>
            <div className="p-6 flex flex-col md:flex-row gap-6 bg-white rounded-t-[32px]">
                <div className="flex flex-col gap-1">
                    <h2 className="text-[32px] font-black text-[#3A3A3A] tracking-tight">Bảng lương <span className="text-[#C5A059]">Chi tiết</span></h2>
                    <p className="text-[12px] font-bold text-[#8E8E8E] uppercase tracking-widest">{monthStr}</p>
                </div>
                <div className="flex gap-3 ml-auto w-full md:w-auto items-center">
                    <div className="flex gap-1 p-1 bg-[#F9F6F2] rounded-xl overflow-x-auto">
                        {canViewAll && (
                            <button onClick={() => setSelectedBranch?.('all')} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${selectedBranch === 'all' ? 'bg-white text-[#C5A059] shadow-sm' : 'text-[#8E8E8E] hover:text-[#3A3A3A]'}`}>Tất cả</button>
                        )}
                        {branches?.map(b => (
                            <button key={b.id} onClick={() => setSelectedBranch?.(b.id)} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${selectedBranch === b.id ? 'bg-white text-[#C5A059] shadow-sm' : 'text-[#8E8E8E] hover:text-[#3A3A3A]'}`}>{b.name}</button>
                        ))}
                    </div>
                    <div className="relative group flex-1 md:flex-none">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                        <input type="text" placeholder="Tìm kiếm..." className="pl-9 pr-4 py-2.5 bg-[#F9F6F2] border-none rounded-xl text-xs font-bold focus:ring-2 focus:ring-[#C5A059]/20 w-full md:w-[220px]" value={searchTerm} onChange={e => setSearchTerm?.(e.target.value)} />
                    </div>
                    {isAdminOrAccounting && !isRosterEmpty && (
                        <button
                            onClick={onAddUser}
                            className="flex items-center gap-1.5 px-6 py-2.5 bg-[#C5A059] text-white rounded-xl text-xs font-black shadow-lg shadow-[#C5A059]/20 uppercase tracking-widest hover:bg-[#B38728] transition-all shrink-0"
                        >
                            <Plus size={14} /> Thêm Elite
                        </button>
                    )}
                </div>
            </div>

            {/* Table Header Section */}
            <div className="overflow-x-auto bg-[#F9F6F2] border-t border-[#F2EBE1]">
                <table className="w-full min-w-[1300px] text-left text-sm border-separate border-spacing-0 table-fixed">
                    <thead>
                        <tr>
                            <th className="w-[220px] px-4 py-4 text-xs font-black text-[#C5A059] uppercase tracking-[0.1em] whitespace-nowrap">Elite Member</th>
                            <th className="w-[80px] px-4 py-4 text-xs font-black text-[#C5A059] uppercase tracking-[0.1em] whitespace-nowrap text-center">Công</th>
                            <th className="w-[120px] px-4 py-4 text-xs font-black text-[#C5A059] uppercase tracking-[0.1em] whitespace-nowrap">Cơ Bản</th>
                            <th className="w-[120px] px-4 py-4 text-xs font-black text-[#C5A059] uppercase tracking-[0.1em] whitespace-nowrap">Bồi dưỡng</th>
                            <th className="w-[120px] px-4 py-4 text-xs font-black text-[#C5A059] uppercase tracking-[0.1em] whitespace-nowrap">KPI Performance</th>
                            <th className="w-[120px] px-4 py-4 text-xs font-black text-[#C5A059] uppercase tracking-[0.1em] whitespace-nowrap">% Revenue</th>
                            <th className="w-[120px] px-4 py-4 text-xs font-black text-[#C5A059] uppercase tracking-[0.1em] whitespace-nowrap">Commission</th>
                            <th className="w-[120px] px-4 py-4 text-xs font-black text-[#C5A059] uppercase tracking-[0.1em] whitespace-nowrap">Giảm trừ</th>
                            <th className="w-[120px] px-4 py-4 text-xs font-black text-[#C5A059] uppercase tracking-[0.1em] whitespace-nowrap">Đã tạm ứng</th>
                            <th className="w-[140px] px-4 py-4 text-xs font-black text-[#C5A059] uppercase tracking-[0.1em] whitespace-nowrap">NET PAYOUT</th>
                            <th className="w-[60px] px-4 py-4"></th>
                        </tr>
                    </thead>
                </table>
            </div>
        </>
    )
}

export function SummaryBody({
    isRosterEmpty,
    filteredData,
    monthStr,
    isAdminOrAccounting,
    isSubmitting,
    onInitRoster,
    onDeleteRoster,
    onViewPayslip,
    onViewDetails,
    formatVND
}: SummaryProps) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full min-w-[1300px] text-left text-sm border-separate border-spacing-0 table-fixed">
                <colgroup>
                    <col className="w-[220px]" />
                    <col className="w-[80px]" />
                    <col className="w-[120px]" />
                    <col className="w-[120px]" />
                    <col className="w-[120px]" />
                    <col className="w-[120px]" />
                    <col className="w-[120px]" />
                    <col className="w-[120px]" />
                    <col className="w-[120px]" />
                    <col className="w-[140px]" />
                    <col className="w-[60px]" />
                </colgroup>
                <tbody>
                    {isRosterEmpty ? (
                        <tr>
                            <td colSpan={11} className="px-6 py-20 text-center">
                                <div className="max-w-sm mx-auto flex flex-col items-center">
                                    <div className="w-20 h-20 bg-[#F9F6F2] rounded-full flex items-center justify-center text-[#C5A059] mb-4">
                                        <FileText size={38} />
                                    </div>
                                    <h3 className="text-[24px] font-black text-[#3A3A3A] mb-2">Bảng lương chưa khởi tạo</h3>
                                    <p className="text-[13px] text-[#8E8E8E] mb-6 font-medium text-center">Hệ thống cần thiết lập danh sách nhân sự Elite cho tháng {monthStr} trước khi tính toán các chỉ số.</p>

                                    {isAdminOrAccounting && (
                                        <button
                                            onClick={onInitRoster}
                                            disabled={isSubmitting}
                                            className="flex items-center gap-2 bg-[#C5A059] text-white px-8 py-3.5 rounded-2xl font-black shadow-xl shadow-[#C5A059]/30 hover:bg-[#B38728] hover:-translate-y-1 transition-all text-xs uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {isSubmitting ? 'Đang khởi tạo...' : 'Thiết lập danh sách Elite'}
                                        </button>
                                    )}
                                </div>
                            </td>
                        </tr>
                    ) : filteredData.length === 0 ? (
                        <tr><td colSpan={11} className="px-6 py-16 text-center text-gray-400 font-bold italic">Không tìm thấy dữ liệu</td></tr>
                    ) : filteredData.map(item => (
                        <tr
                            key={item.user.id}
                            className="group hover:bg-[#F9F6F2]/50 transition-all cursor-pointer"
                            onClick={() => onViewDetails?.(item)}
                        >
                            <td className="px-4 py-5">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-[#F9F6F2] flex items-center justify-center font-black text-[#C5A059] border border-[#F2EBE1] group-hover:bg-white transition-all">
                                        {item.user.displayName[0].toUpperCase()}
                                    </div>
                                    <div>
                                        <div className="font-bold text-[#3A3A3A] text-sm whitespace-nowrap">{item.user.displayName}</div>
                                        <div className="text-[10px] text-[#8E8E8E] font-bold uppercase tracking-widest flex items-center gap-1"><Briefcase size={9} /> {item.jobTitle?.name || 'Partner'}</div>
                                    </div>
                                </div>
                            </td>
                            <td className="px-4 py-5 text-center">
                                <span className={`text-[16px] font-black ${item.totalWorkDays > 0 ? 'text-[#C5A059]' : 'text-[#8E8E8E]/30'}`}>{item.totalWorkDays}</span>
                                <div className="text-[9px] text-[#8E8E8E] font-black uppercase tracking-[0.1em]">Days</div>
                            </td>
                            <td className="px-4 py-5">
                                <div className="monetary text-[#3A3A3A]">{formatVND(item.basePay).replace('₫', '')}</div>
                                <div className="text-[9px] text-[#8E8E8E] font-bold uppercase leading-tight">{item.config.type === 'fixed' ? 'Grant' : `${item.config.standardDays}c`}</div>
                            </td>
                            <td className="px-4 py-5">
                                {item.totalAllowance > 0 ? <span className="monetary monetary-positive">{formatVND(item.totalAllowance).replace('₫', '')}</span> : <span className="text-[#8E8E8E]/20 text-xs">—</span>}
                            </td>
                            <td className="px-4 py-5">
                                {item.totalBonus > 0 ? <span className="monetary monetary-positive">{formatVND(item.totalBonus).replace('₫', '')}</span> : <span className="text-[#8E8E8E]/20 text-xs">—</span>}
                            </td>
                            <td className="px-4 py-5">
                                {item.revenueShareAmount > 0 ? <span className="monetary monetary-positive">{formatVND(item.revenueShareAmount).replace('₫', '')}</span> : <span className="text-[#8E8E8E]/20 text-xs">—</span>}
                            </td>
                            <td className="px-4 py-5">
                                {item.userCommission > 0 ? <span className="monetary monetary-positive">{formatVND(item.userCommission).replace('₫', '')}</span> : <span className="text-[#8E8E8E]/20 text-xs">—</span>}
                            </td>
                            <td className="px-4 py-5">
                                {item.totalDeduction > 0 ? <span className="monetary monetary-negative">{Math.abs(item.totalDeduction).toLocaleString('vi-VN')}</span> : <span className="text-[#8E8E8E]/20 text-xs">—</span>}
                            </td>
                            <td className="px-4 py-5">
                                {item.totalAdvance > 0 ? <span className="monetary monetary-negative">{Math.abs(item.totalAdvance).toLocaleString('vi-VN')}</span> : <span className="text-[#8E8E8E]/20 text-xs">—</span>}
                            </td>
                            <td className="px-4 py-5">
                                <div className={`monetary ${item.netPay >= 0 ? 'monetary-positive' : 'monetary-negative'}`}>
                                    {Math.abs(item.netPay).toLocaleString('vi-VN')}
                                </div>
                                <div className="text-[9px] text-[#8E8E8E] font-black uppercase tracking-widest">Payout</div>
                            </td>
                            <td className="px-4 py-5 text-right">
                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onViewPayslip?.(item); }}
                                        className="h-10 px-4 bg-[#3A3A3A] text-white hover:bg-black rounded-xl transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest shadow-xl shadow-gray-200"
                                        title="Xem Phiếu Lương Chi Tiết"
                                    >
                                        <FileText size={14} /> Payslip
                                    </button>
                                    {isAdminOrAccounting && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onDeleteRoster?.(item.user.id); }}
                                            disabled={isSubmitting}
                                            className="p-2 text-[#8E8E8E] hover:text-[#EF4444] hover:bg-[#EF4444]/5 rounded-xl transition-colors"
                                            title="Bỏ ra khỏi tháng"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>
                            </td>
                        </tr>
                    ))}

                    {/* Total Summary Row */}
                    <tr className={`border-t-2 border-[#F2EBE1] bg-[#F9F6F2]/30 ${filteredData.reduce((s, i) => s + i.netPay, 0) >= 0 ? 'summary-row-positive' : 'summary-row-negative'}`}>
                        <td className="px-4 py-6 font-black uppercase tracking-widest text-sm">Grand Total</td>
                        <td className="px-4 py-6 text-center text-[16px] font-black">{filteredData.reduce((s, i) => s + i.totalWorkDays, 0)}</td>
                        <td className="px-4 py-6"><span className="monetary">{Math.abs(filteredData.reduce((s, i) => s + i.basePay, 0)).toLocaleString('vi-VN')}</span></td>
                        <td className="px-4 py-6"><span className="monetary">{Math.abs(filteredData.reduce((s, i) => s + i.totalAllowance, 0)).toLocaleString('vi-VN')}</span></td>
                        <td className="px-4 py-6"><span className="monetary">{Math.abs(filteredData.reduce((s, i) => s + i.totalBonus, 0)).toLocaleString('vi-VN')}</span></td>
                        <td className="px-4 py-6"><span className="monetary">{Math.abs(filteredData.reduce((s, i) => s + i.revenueShareAmount, 0)).toLocaleString('vi-VN')}</span></td>
                        <td className="px-4 py-6"><span className="monetary">{Math.abs(filteredData.reduce((s, i) => s + i.userCommission, 0)).toLocaleString('vi-VN')}</span></td>
                        <td className="px-4 py-6"><span className="monetary">{Math.abs(filteredData.reduce((s, i) => s + i.totalDeduction, 0)).toLocaleString('vi-VN')}</span></td>
                        <td className="px-4 py-6"><span className="monetary">{Math.abs(filteredData.reduce((s, i) => s + i.totalAdvance, 0)).toLocaleString('vi-VN')}</span></td>
                        <td className="px-4 py-6 font-black">
                            <span className="monetary">
                                {Math.abs(filteredData.reduce((s, i) => s + i.netPay, 0)).toLocaleString('vi-VN')}
                            </span>
                            <div className="text-[10px] uppercase font-black tracking-widest leading-none mt-1">Total Payouts</div>
                        </td>
                        <td className="px-4 py-6"></td>
                    </tr>
                </tbody>
            </table>
        </div>
    )
}
