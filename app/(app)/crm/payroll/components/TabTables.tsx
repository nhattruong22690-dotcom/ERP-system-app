'use client'
import { Star, TrendingUp, AlertTriangle, CreditCard, CheckCircle2, XCircle, Trash2, Edit2, Play, Info } from 'lucide-react'

interface TabTablesProps {
    activeTab: string
    monthStr: string
    monthBonuses: any[]
    monthDeductions: any[]
    allAdvances: any[]
    pendingCommissions: any[]
    isAdminOrAccounting: boolean
    isSubmitting: boolean
    formatVND: (amount: number) => string
    getUserName: (id: string) => string
    currentUserId: string

    // Handlers
    onDeleteBonus: (id: string) => void
    onDeleteDeduction: (id: string) => void
    onDeleteAdvance: (id: string) => void
    onApproveAdvance: (adv: any) => void
    onRejectAdvance: (adv: any) => void
    onMarkAsPaidAdvance: (adv: any) => void
    onApproveCommission: (log: any) => void
    onRejectCommission: (log: any) => void
    onEditBonus: (bonus: any) => void
    onEditDeduction: (deduction: any) => void
    onEditAdvance: (advance: any) => void
}

export default function TabTables({
    activeTab,
    monthStr,
    monthBonuses,
    monthDeductions,
    allAdvances,
    pendingCommissions,
    isAdminOrAccounting,
    isSubmitting,
    formatVND,
    getUserName,
    currentUserId,
    onDeleteBonus,
    onDeleteDeduction,
    onDeleteAdvance,
    onApproveAdvance,
    onRejectAdvance,
    onMarkAsPaidAdvance,
    onApproveCommission,
    onRejectCommission,
    onEditBonus,
    onEditDeduction,
    onEditAdvance
}: TabTablesProps) {
    if (activeTab === 'summary') return null

    return (
        <div className="p-1 md:p-6 bg-white rounded-[2rem] border border-gray-100 shadow-sm min-h-[400px]">
            {/* TAB: BONUS */}
            {activeTab === 'bonus' && (
                <div>
                    {monthBonuses.length === 0 ? (
                        <div className="text-center py-16 text-gray-400 font-bold">Chưa có khoản thưởng nào trong tháng {monthStr}</div>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {monthBonuses.map(b => (
                                <div key={b.id} className="flex items-center gap-4 p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100 group">
                                    {b.date && (
                                        <div className="flex flex-col items-center justify-center bg-white border border-emerald-200/50 rounded-xl w-12 h-12 shadow-sm shrink-0">
                                            <span className="text-[10px] font-bold text-emerald-600/60 uppercase tracking-wider leading-none mb-0.5">T{b.date.split('-')[1]}</span>
                                            <span className="text-lg font-bold text-emerald-700 leading-none">{b.date.split('-')[2]}</span>
                                        </div>
                                    )}
                                    <div className={`p-2 rounded-xl shrink-0 ${b.type === 'kpi' ? 'bg-indigo-100 text-indigo-600' : 'bg-teal-100 text-teal-600'}`}>
                                        {b.type === 'kpi' ? <Star size={16} /> : <TrendingUp size={16} />}
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-bold text-gray-900 text-sm">{getUserName(b.userId)}</div>
                                        <div className="text-xs text-gray-500 font-semibold">{b.type === 'kpi' ? 'Thưởng KPI Chi nhánh' : 'Thưởng % Doanh số'} — {b.note || '—'}</div>
                                    </div>
                                    <div className="text-emerald-700 font-bold text-base">+{formatVND(b.amount)}</div>
                                    {isAdminOrAccounting && (
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => onEditBonus(b)} className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-white rounded-xl transition-colors"><Edit2 size={14} /></button>
                                            <button onClick={() => onDeleteBonus(b.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-white rounded-xl transition-colors"><Trash2 size={14} /></button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* TAB: DEDUCTION */}
            {activeTab === 'deduction' && (
                <div>
                    {monthDeductions.length === 0 ? (
                        <div className="text-center py-16 text-gray-400 font-bold">Chưa có vi phạm nào trong tháng {monthStr}</div>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {monthDeductions.map(d => (
                                <div key={d.id} className="flex items-center gap-4 p-4 bg-rose-50/50 rounded-2xl border border-rose-100 group">
                                    {d.date && (
                                        <div className="flex flex-col items-center justify-center bg-white border border-rose-200/50 rounded-xl w-12 h-12 shadow-sm shrink-0">
                                            <span className="text-[10px] font-bold text-rose-600/60 uppercase tracking-wider leading-none mb-0.5">T{d.date.split('-')[1]}</span>
                                            <span className="text-lg font-bold text-rose-700 leading-none">{d.date.split('-')[2]}</span>
                                        </div>
                                    )}
                                    <div className="p-2 bg-rose-100 text-rose-600 rounded-xl shrink-0"><AlertTriangle size={16} /></div>
                                    <div className="flex-1">
                                        <div className="font-bold text-gray-900 text-sm">{getUserName(d.userId)}</div>
                                        <div className="text-xs text-gray-500 font-semibold">{d.note || 'Vi phạm nội quy'}</div>
                                    </div>
                                    <div className="text-rose-700 font-bold text-base">-{formatVND(d.amount)}</div>
                                    {isAdminOrAccounting && (
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => onEditDeduction(d)} className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-white rounded-xl transition-colors"><Edit2 size={14} /></button>
                                            <button onClick={() => onDeleteDeduction(d.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-white rounded-xl transition-colors"><Trash2 size={14} /></button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* TAB: ADVANCE */}
            {activeTab === 'advance' && (
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-separate border-spacing-y-2">
                        <thead>
                            <tr className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">
                                <th className="px-4 py-2">Nhân viên</th>
                                <th className="px-4 py-2">Ngày ứng</th>
                                <th className="px-4 py-2 text-right">Số tiền</th>
                                <th className="px-4 py-2 text-center">Trạng thái</th>
                                <th className="px-4 py-2">Người duyệt/chi</th>
                                <th className="px-4 py-2"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {allAdvances.map(a => (
                                <tr key={a.id} className="bg-gray-50/50 hover:bg-white border border-transparent hover:border-gray-100 transition-all group">
                                    <td className="px-4 py-4 rounded-l-2xl font-bold text-gray-900">{getUserName(a.userId)}</td>
                                    <td className="px-4 py-4 text-xs font-bold text-gray-500">{a.date}</td>
                                    <td className="px-4 py-4 text-right">
                                        <div className="text-sm font-black text-gray-900">{formatVND(a.amount)}</div>
                                        <div className="text-[10px] text-gray-400 italic font-medium">{a.note}</div>
                                    </td>
                                    <td className="px-4 py-4 text-center">
                                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${a.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                                            a.status === 'approved' ? 'bg-indigo-100 text-indigo-700' :
                                                a.status === 'rejected' ? 'bg-gray-200 text-gray-500' :
                                                    'bg-amber-100 text-amber-700 animate-pulse'
                                            }`}>
                                            {a.status === 'paid' ? 'Đã chi' : a.status === 'approved' ? 'Chờ chi' : a.status === 'rejected' ? 'Từ chối' : 'Chờ duyệt'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-4 text-xs font-bold text-gray-500">
                                        {a.approvedBy && <div className="flex flex-col"><span>Duyệt: {getUserName(a.approvedBy)}</span><span className="text-[10px] opacity-60">Lúc: {a.approvedAt?.slice(0, 16).replace('T', ' ')}</span></div>}
                                        {a.paidBy && <div className="flex flex-col mt-1 pt-1 border-t border-gray-100"><span>Chi: {getUserName(a.paidBy)}</span><span className="text-[10px] text-emerald-600">Note: {a.paidNote}</span></div>}
                                    </td>
                                    <td className="px-4 py-4 rounded-r-2xl text-right">
                                        {isAdminOrAccounting && (
                                            <div className="flex items-center justify-end gap-1">
                                                {a.status === 'pending' && (
                                                    <>
                                                        <button onClick={() => onApproveAdvance(a)} className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"><CheckCircle2 size={14} /></button>
                                                        <button onClick={() => onRejectAdvance(a)} className="p-2 bg-gray-200 text-gray-500 rounded-xl hover:bg-gray-300 transition-all"><XCircle size={14} /></button>
                                                    </>
                                                )}
                                                {a.status === 'approved' && (
                                                    <button
                                                        onClick={() => onMarkAsPaidAdvance(a)}
                                                        className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all flex items-center gap-1.5"
                                                    >
                                                        <Play size={10} fill="currentColor" /> Xác nhận đã chi
                                                    </button>
                                                )}
                                                {a.status !== 'paid' && (
                                                    <button onClick={() => onDeleteAdvance(a.id)} className="p-2 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={14} /></button>
                                                )}
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {allAdvances.length === 0 && <tr><td colSpan={6} className="text-center py-16 text-gray-400 font-bold">Chưa có dữ liệu tạm ứng</td></tr>}
                        </tbody>
                    </table>
                </div>
            )}

            {/* TAB: COMMISSION APPROVAL */}
            {activeTab === 'commission_approval' && (
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-separate border-spacing-y-2">
                        <thead>
                            <tr className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">
                                <th className="px-4 py-2">Nhân viên</th>
                                <th className="px-4 py-2">Loại / Ghi chú</th>
                                <th className="px-4 py-2 text-right">Số tiền</th>
                                <th className="px-4 py-2 text-center">Ghi nhận lúc</th>
                                <th className="px-4 py-2"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {pendingCommissions.map(log => (
                                <tr key={log.id} className="bg-gray-50/50 hover:bg-indigo-50/30 transition-all group">
                                    <td className="px-4 py-4 rounded-l-2xl font-bold text-gray-900">{getUserName(log.userId)}</td>
                                    <td className="px-4 py-4 text-xs font-bold text-gray-600">
                                        <div className="bg-white px-2 py-0.5 rounded border border-gray-100 w-fit mb-1 text-[9px] uppercase tracking-tighter">{log.type}</div>
                                        {log.note || '—'}
                                    </td>
                                    <td className="px-4 py-4 text-right font-black text-indigo-600 text-sm">+{formatVND(log.amount)}</td>
                                    <td className="px-4 py-4 text-center text-[10px] font-bold text-gray-400">{log.createdAt?.slice(0, 16).replace('T', ' ')}</td>
                                    <td className="px-4 py-4 rounded-r-2xl text-right">
                                        {isAdminOrAccounting && (
                                            <div className="flex items-center justify-end gap-2">
                                                <button onClick={() => onApproveCommission(log)} className="px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all flex items-center gap-1.5">
                                                    <CheckCircle2 size={12} /> Duyệt
                                                </button>
                                                <button onClick={() => onRejectCommission(log)} className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-white rounded-lg transition-all" title="Hủy bỏ">
                                                    <XCircle size={18} />
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {pendingCommissions.length === 0 && <tr><td colSpan={5} className="text-center py-16 text-gray-400 font-bold italic flex flex-col items-center gap-2">
                                <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-300"><CheckCircle2 size={24} /></div>
                                Không có yêu cầu hoa hồng nào đang chờ duyệt
                            </td></tr>}
                        </tbody>
                    </table>
                    <div className="mt-6 p-4 bg-indigo-50 rounded-2xl border border-indigo-100/50 flex items-start gap-3">
                        <Info size={16} className="text-indigo-500 shrink-0 mt-0.5" />
                        <div className="text-[11px] font-bold text-indigo-700 leading-relaxed">
                            <span className="uppercase tracking-widest block mb-1">Hướng dẫn:</span>
                            Đây là nơi kế toán phê duyệt các khoản hoa hồng phát sinh ngoài (từ App CRM, từ Leads, hoặc từ các yêu cầu thủ công).
                            Sau khi "Duyệt", khoản tiền này mới chính thức được cộng vào mục "Hoa hồng" trong bảng lương tổng hợp.
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
