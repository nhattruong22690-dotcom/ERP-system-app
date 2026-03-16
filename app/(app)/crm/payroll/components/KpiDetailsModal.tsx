'use client'
import { TrendingUp, XCircle, Star, Gift, Info, Search, CheckCircle2, FileText } from 'lucide-react'

interface KpiDetailsModalProps {
    isOpen: boolean
    onClose: () => void
    data: any
    monthStr: string
    formatVND: (amount: number) => string
    isAdminOrAccounting: boolean
    isSubmitting: boolean
    onToggleConfirm: (type: 'lead' | 'appointment', id: string, currentStatus: boolean) => void
}

export default function KpiDetailsModal({
    isOpen,
    onClose,
    data,
    monthStr,
    formatVND,
    isAdminOrAccounting,
    isSubmitting,
    onToggleConfirm
}: KpiDetailsModalProps) {
    if (!isOpen || !data) return null

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 md:p-6 bg-black/40 backdrop-blur-md animate-fade-in overflow-y-auto cursor-pointer md:left-[280px]" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
            <div className="bg-white w-full max-w-6xl h-[90vh] rounded-[32px] md:rounded-[40px] shadow-2xl overflow-hidden flex flex-col md:flex-row animate-modal-up border border-gold-light/20 my-auto cursor-default relative" onClick={(e) => e.stopPropagation()}>

                {/* Left Side: Branding Sidebar */}
                <div className="w-full md:w-[240px] bg-text-main relative overflow-hidden flex flex-col p-8 text-white shrink-0 items-center justify-between border-b md:border-b-0 md:border-r border-white/5">
                    <div className="absolute inset-0 opacity-20" style={{ background: 'radial-gradient(circle at 20% 150%, #C5A059, transparent), radial-gradient(circle at 80% -50%, #F2EBE1, transparent)' }}></div>

                    <div className="relative z-10 flex flex-col items-center w-full">
                        <div className="w-24 h-24 rounded-[32px] bg-white/10 border border-white/20 flex items-center justify-center mb-6 backdrop-blur-md shadow-2xl relative group overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-transparent group-hover:scale-110 transition-transform duration-700"></div>
                            <TrendingUp size={40} className="text-gold-muted drop-shadow-sm relative z-10" strokeWidth={2.5} />
                        </div>

                        <div className="text-center space-y-1">
                            <h4 className="text-[10px] text-gold-muted font-black uppercase tracking-[0.3em] italic">Đối soát hiệu suất</h4>
                            <p className="text-[14px] text-white font-serif font-black uppercase tracking-widest whitespace-nowrap">Báo cáo KPI</p>
                            <div className="w-10 h-1 bg-gold-muted/30 mx-auto rounded-full mt-4"></div>
                        </div>

                        <div className="mt-8 flex flex-col items-center gap-4 w-full">
                            <div className="w-full p-4 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm">
                                <div className="text-[8px] text-white/40 font-black uppercase tracking-widest mb-2 text-center">Chu kỳ báo cáo</div>
                                <div className="text-center">
                                    <span className="text-sm font-serif font-black text-gold-muted uppercase italic">{monthStr}</span>
                                </div>
                            </div>

                            <div className="w-full space-y-2 px-1">
                                <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-white/40">
                                    <span>Tỉ lệ hoàn thành</span>
                                    <span className="text-gold-muted">{data.kpiCommission.kpiPct}%</span>
                                </div>
                                <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gold-muted transition-all duration-1000"
                                        style={{ width: `${Math.min(data.kpiCommission.kpiPct, 100)}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="relative z-10 w-full">
                        <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl">
                            <div className="text-[8px] text-indigo-300 font-black uppercase tracking-widest mb-1 text-center italic">Nhân sự thực hiện</div>
                            <div className="text-center text-[11px] font-black text-white uppercase tracking-wider">{data.user.displayName}</div>
                            <div className="text-center text-[8px] text-white/30 font-bold uppercase mt-1">@{data.user.username}</div>
                        </div>
                    </div>
                </div>

                {/* Right Side: Content Area */}
                <div className="flex-1 bg-white flex flex-col relative min-w-0">
                    {/* Top Right Actions */}
                    <div className="absolute top-8 right-8 z-20 flex items-center gap-3">
                        <button onClick={onClose} className="w-12 h-12 rounded-2xl bg-white text-text-soft hover:text-rose-500 flex items-center justify-center transition-all shadow-sm border border-gold-light/20 active:scale-90">
                            <XCircle size={22} strokeWidth={2.5} />
                        </button>
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-1 p-8 md:p-12 space-y-12 overflow-y-auto luxury-scrollbar bg-beige-soft/5">

                        {/* Title Section */}
                        <div className="relative">
                            <div className="flex items-center gap-2 mb-2">
                                <Star size={14} className="text-amber-500 fill-amber-500" />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-text-soft/60 italic">Kê khai đóng góp chỉ tiêu tháng</span>
                            </div>
                            <h3 className="text-4xl font-serif font-black text-text-main tracking-tighter uppercase leading-none italic">
                                Chi tiết <span className="text-indigo-600">Bonus & KPI</span>
                            </h3>
                            <div className="flex items-center gap-4 mt-6">
                                <div className="flex -space-x-2">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="w-6 h-6 rounded-full border-2 border-white bg-beige-soft flex items-center justify-center text-[8px] font-black text-text-soft">
                                            {i}
                                        </div>
                                    ))}
                                </div>
                                <span className="text-[9px] font-black text-text-soft/40 uppercase tracking-widest italic">Dữ liệu được đối soát tự động bởi hệ thống TaiChinh</span>
                            </div>
                        </div>

                        {/* Performance Dashboard */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Target Card */}
                            <div className="lg:col-span-1 p-8 bg-white border border-gold-light/20 rounded-[32px] shadow-luxury relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/50 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110 duration-700" />
                                <h4 className="text-[11px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-8 flex items-center gap-2 italic relative z-10">
                                    <Star size={14} fill="currentColor" /> KPI Targets
                                </h4>
                                <div className="space-y-8 relative z-10">
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <div className="text-[9px] font-black text-text-soft/40 uppercase tracking-widest mb-2">Mục tiêu sàn</div>
                                            <div className="text-3xl font-serif font-black text-text-main">{data.kpiDetails.targetKpi}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-[9px] font-black text-text-soft/40 uppercase tracking-widest mb-2">Đã hoàn thành</div>
                                            <div className="text-3xl font-serif font-black text-emerald-600">{data.kpiDetails.actualKpi}</div>
                                        </div>
                                    </div>
                                    <div className="h-2.5 bg-gray-100/50 rounded-full overflow-hidden border border-gold-light/5 shadow-inner">
                                        <div
                                            className={`h-full transition-all duration-1000 ease-out shadow-sm ${data.kpiCommission.kpiPct >= 100 ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]' : 'bg-indigo-600 shadow-[0_0_10px_rgba(79,70,229,0.4)]'}`}
                                            style={{ width: `${Math.min(data.kpiCommission.kpiPct, 100)}%` }}
                                        />
                                    </div>
                                    <div className="flex justify-between items-center bg-beige-soft/30 p-4 rounded-2xl border border-gold-light/10">
                                        <span className="text-[10px] font-black text-text-soft/50 uppercase tracking-widest italic">Hiệu suất tổng thể</span>
                                        <span className="text-sm font-black text-indigo-600">{data.kpiCommission.kpiPct}%</span>
                                    </div>
                                </div>
                            </div>

                            {/* Bonus Grid */}
                            <div className="lg:col-span-2 p-8 bg-white/40 border border-gold-light/10 rounded-[32px] shadow-sm flex flex-col">
                                <div className="flex items-center justify-between mb-8">
                                    <h4 className="text-[11px] font-black text-text-soft/60 uppercase tracking-[0.2em] flex items-center gap-2 italic">
                                        <Gift size={15} /> Thu nhập thưởng dự kiến
                                    </h4>
                                    <div className="flex gap-1">
                                        {data.kpiDetails.breakdown.map((_: string, i: number) => (
                                            <div key={i} className="w-1 h-1 rounded-full bg-gold-muted/30"></div>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                                    <div className="p-5 bg-white rounded-3xl border border-gold-light/10 shadow-sm transition-all hover:scale-105 hover:border-emerald-200">
                                        <div className="text-[8px] font-black text-emerald-500 uppercase tracking-widest mb-2 opacity-60">Thưởng SĐT</div>
                                        <div className="text-lg font-black text-text-main tabular-nums">
                                            {formatVND(data.kpiDetails.leads.reduce((s: number, l: any) => s + (l.bonusSdt || 0), 0))}
                                        </div>
                                    </div>
                                    <div className="p-5 bg-white rounded-3xl border border-gold-light/10 shadow-sm transition-all hover:scale-105 hover:border-blue-200">
                                        <div className="text-[8px] font-black text-blue-500 uppercase tracking-widest mb-2 opacity-60">Check-in</div>
                                        <div className="text-lg font-black text-text-main tabular-nums">
                                            {formatVND(data.kpiDetails.appointments.reduce((s: number, a: any) => s + (a.bonusCheckin || 0), 0))}
                                        </div>
                                    </div>
                                    <div className="p-5 bg-white rounded-3xl border border-gold-light/10 shadow-sm transition-all hover:scale-105 hover:border-violet-200">
                                        <div className="text-[8px] font-black text-violet-500 uppercase tracking-widest mb-2 opacity-60">Hoa hồng PS</div>
                                        <div className="text-lg font-black text-text-main tabular-nums">
                                            {formatVND(data.kpiCommission.commissionAmount)}
                                        </div>
                                    </div>
                                    <div className="p-5 bg-text-main rounded-3xl shadow-luxury transition-all hover:scale-105 ring-4 ring-gold-muted/5">
                                        <div className="text-[8px] font-black text-gold-light/60 uppercase tracking-widest mb-2 italic">Tổng Bonus</div>
                                        <div className="text-lg font-black text-white tabular-nums">
                                            {formatVND(data.totalBonus)}
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-8 flex flex-wrap gap-2 pt-8 border-t border-gold-light/5">
                                    {data.kpiDetails.breakdown.map((line: string, i: number) => (
                                        <span key={i} className="text-[9px] font-black text-text-soft/40 bg-white px-4 py-2 rounded-xl border border-gold-light/10 shadow-sm uppercase tracking-tighter italic">
                                            {line}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Detailed Table Section */}
                        <div className="space-y-6">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
                                <h4 className="text-[11px] font-black text-text-main uppercase tracking-[0.2em] flex items-center gap-3 italic">
                                    <Search size={16} strokeWidth={2.5} className="text-indigo-400" /> Nhật ký đóng góp KPI chi tiết
                                </h4>
                                <div className="flex items-center gap-3 bg-rose-50/50 px-4 py-2 rounded-2xl border border-rose-100 shadow-sm">
                                    <Info size={14} className="text-rose-400" />
                                    <span className="text-[9px] font-black text-rose-600 uppercase tracking-widest italic leading-tight">Chế độ xem đối soát. Mọi thay đổi đều được lưu vết hệ thống.</span>
                                </div>
                            </div>

                            {/* Service Order Splits Section (New) */}
                            {data.kpiDetails.serviceOrders && data.kpiDetails.serviceOrders.length > 0 && (
                                <div className="bg-emerald-50/10 border border-emerald-100 rounded-[32px] p-8 mb-6">
                                    <h5 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-6 flex items-center gap-2 italic">
                                        <CheckCircle2 size={14} /> Hoa hồng thực hiện dịch vụ (KTV / Bác sĩ)
                                    </h5>
                                    <div className="space-y-3">
                                        {data.kpiDetails.serviceOrders.map((detail: string, i: number) => (
                                            <div key={i} className="flex justify-between items-center bg-white p-4 rounded-2xl border border-emerald-50 shadow-sm">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                                        <FileText size={14} />
                                                    </div>
                                                    <span className="text-[12px] font-bold text-text-main">{detail.split(': +')[0]}</span>
                                                </div>
                                                <span className="text-[13px] font-black text-emerald-600 tabular-nums">+{detail.split(': +')[1]}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="bg-white border border-gold-light/20 rounded-[40px] overflow-hidden shadow-luxury">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-beige-soft/30 border-b border-gold-light/10">
                                                <th className="pl-10 pr-6 py-6 text-[9px] font-black text-text-soft/40 uppercase tracking-[0.2em] italic">Khách hàng / Mã ĐS</th>
                                                <th className="px-6 py-6 text-[9px] font-black text-text-soft/40 uppercase tracking-[0.2em] italic">Liên hệ</th>
                                                <th className="px-6 py-6 text-[9px] font-black text-text-soft/40 uppercase tracking-[0.2em] italic text-right">Lấy SĐT</th>
                                                <th className="px-6 py-6 text-[9px] font-black text-text-soft/40 uppercase tracking-[0.2em] italic text-right">Check-in</th>
                                                <th className="px-6 py-6 text-[9px] font-black text-text-soft/40 uppercase tracking-[0.2em] italic text-right">Ps Dịch vụ</th>
                                                <th className="pl-6 pr-10 py-6 text-[9px] font-black text-text-soft/40 uppercase tracking-[0.2em] italic text-center">Trạng thái</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gold-light/5">
                                            {[...data.kpiDetails.leads.map((l: any) => ({ ...l, _type: 'lead' })), ...data.kpiDetails.appointments.map((a: any) => ({ ...a, _type: 'appointment' }))].map((item: any) => (
                                                <tr key={item.id} className={`group hover:bg-beige-soft/10 transition-all ${item.kpiConfirmed === false ? 'bg-rose-50/10' : ''}`}>
                                                    <td className="pl-10 pr-6 py-6">
                                                        <div className="flex items-center gap-4">
                                                            <div className={`w-2 h-2 rounded-full ${item.kpiConfirmed === false ? 'bg-rose-400' : 'bg-indigo-300'} group-hover:scale-125 transition-transform`} />
                                                            <div>
                                                                <div className="text-[12px] font-black text-text-main group-hover:text-indigo-600 transition-colors uppercase tracking-tight">
                                                                    {item.name || `Hẹn: ${item.id.slice(0, 6)}`}
                                                                </div>
                                                                <div className="text-[9px] font-mono font-bold text-text-soft/20 uppercase mt-0.5">#{item.id.slice(0, 8)}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-6 text-[11px] font-black text-text-soft/60 tabular-nums">
                                                        {item.phone || <span className="opacity-10 italic">N/A</span>}
                                                    </td>
                                                    <td className="px-6 py-6 text-right font-black text-[13px] text-emerald-600 tabular-nums">
                                                        {item.bonusSdt > 0 ? `+${formatVND(item.bonusSdt)}` : '-'}
                                                    </td>
                                                    <td className="px-6 py-6 text-right font-black text-[13px] text-blue-600 tabular-nums">
                                                        {item.bonusCheckin > 0 ? `+${formatVND(item.bonusCheckin)}` : '-'}
                                                    </td>
                                                    <td className="px-6 py-6 text-right font-black text-[13px] text-violet-600 tabular-nums">
                                                        {item.bonusPsDv > 0 ? `+${formatVND(item.bonusPsDv)}` : '-'}
                                                    </td>
                                                    <td className="pl-6 pr-10 py-6 text-center">
                                                        <div className="flex items-center justify-center gap-3">
                                                            {item.kpiConfirmed === false && (
                                                                <div className="group/reason relative">
                                                                    <div className="w-9 h-9 rounded-xl bg-rose-600 text-white flex items-center justify-center shadow-lg shadow-rose-100 cursor-help animate-pulse">
                                                                        <FileText size={16} />
                                                                    </div>
                                                                    <div className="absolute bottom-full right-0 mb-4 hidden group-hover/reason:block w-64 p-5 bg-gray-900 text-white rounded-[24px] shadow-2xl z-50 border border-white/10 animate-modal-up">
                                                                        <div className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-2 italic">Lý do từ chối chỉ tiêu:</div>
                                                                        <p className="text-[12px] font-bold text-gray-200 leading-relaxed italic truncate-multi-2">{item.kpiExclusionNote || 'Dữ liệu trùng lặp hoặc không đạt chuẩn'}</p>
                                                                        <div className="mt-4 pt-4 border-t border-white/5 text-[9px] text-white/30 font-bold uppercase tracking-widest flex justify-between">
                                                                            <span>By {item.kpiExcludedBy}</span>
                                                                            <span>{item.kpiExcludedAt?.split('T')[0]}</span>
                                                                        </div>
                                                                        <div className="absolute top-full right-4 border-[8px] border-transparent border-t-gray-900" />
                                                                    </div>
                                                                </div>
                                                            )}
                                                            <button
                                                                disabled={!isAdminOrAccounting || isSubmitting}
                                                                onClick={() => onToggleConfirm(item._type as any, item.id, item.kpiConfirmed !== false)}
                                                                className={`w-10 h-10 rounded-[14px] flex items-center justify-center transition-all ${item.kpiConfirmed !== false
                                                                    ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white border border-emerald-100'
                                                                    : 'bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white border border-rose-100'}`}
                                                            >
                                                                {item.kpiConfirmed !== false ? <CheckCircle2 size={20} strokeWidth={2.5} /> : <XCircle size={20} strokeWidth={2.5} />}
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {data.kpiDetails.leads.length === 0 && data.kpiDetails.appointments.length === 0 && (
                                    <div className="py-24 text-center">
                                        <div className="w-16 h-16 rounded-3xl bg-gray-50 flex items-center justify-center mx-auto mb-4 text-gray-200">
                                            <Search size={32} />
                                        </div>
                                        <p className="text-sm font-black text-text-soft/20 uppercase tracking-widest italic">Hệ thống chưa ghi nhận đóng góp nào trong kỳ này</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Footer Controls */}
                    <div className="px-12 py-8 bg-white border-t border-gold-light/10 flex justify-end gap-5 shrink-0">
                        <button onClick={onClose} className="px-12 h-16 bg-text-main text-white rounded-2xl font-black text-[12px] uppercase tracking-[0.2em] shadow-luxury hover:bg-gold-muted transition-all active:scale-95 flex items-center gap-4 group">
                            Xác nhận hoàn tất đối soát
                            <TrendingUp size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
