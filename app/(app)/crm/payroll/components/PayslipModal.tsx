'use client'
import { FileText, Clock, TrendingUp, Star, AlertTriangle, XCircle, Briefcase } from 'lucide-react'

interface PayslipModalProps {
    isOpen: boolean
    onClose: () => void
    data: any
    monthStr: string
    formatVND: (amount: number) => string
    state: any
    setActiveTab: (tab: any) => void
}

export default function PayslipModal({
    isOpen,
    onClose,
    data,
    monthStr,
    formatVND,
    state,
    setActiveTab
}: PayslipModalProps) {
    if (!isOpen || !data) return null

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 md:p-6 bg-black/40 backdrop-blur-md animate-fade-in overflow-y-auto cursor-pointer md:left-[280px]" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
            <div className="bg-white w-full max-w-4xl h-[90vh] rounded-[32px] md:rounded-[40px] shadow-2xl overflow-hidden flex flex-col md:flex-row animate-modal-up border border-gold-light/20 my-auto cursor-default relative" onClick={(e) => e.stopPropagation()}>

                {/* Left Side: Branding Sidebar */}
                <div className="w-full md:w-[220px] bg-text-main relative overflow-hidden flex flex-col p-8 text-white shrink-0 items-center justify-between border-b md:border-b-0 md:border-r border-white/5">
                    <div className="absolute inset-0 opacity-20" style={{ background: 'radial-gradient(circle at 20% 150%, #C5A059, transparent), radial-gradient(circle at 80% -50%, #F2EBE1, transparent)' }}></div>

                    <div className="relative z-10 flex flex-col items-center w-full">
                        <div className="w-24 h-24 rounded-[32px] bg-white/10 border border-white/20 flex items-center justify-center mb-6 backdrop-blur-md shadow-2xl relative group overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-gold-muted/20 to-transparent group-hover:scale-110 transition-transform duration-700"></div>
                            <span className="text-4xl font-serif font-black text-gold-muted drop-shadow-sm relative z-10">{data.user.displayName[0].toUpperCase()}</span>
                        </div>

                        <div className="text-center space-y-1">
                            <h4 className="text-[10px] text-gold-muted font-black uppercase tracking-[0.3em] italic">Phiếu lương</h4>
                            <p className="text-[12px] text-white font-black uppercase tracking-widest whitespace-nowrap">{data.user.displayName}</p>
                            <div className="w-10 h-1 bg-gold-muted/30 mx-auto rounded-full mt-4"></div>
                        </div>

                        <div className="mt-8 flex flex-col items-center gap-4 w-full">
                            <div className="w-full p-4 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm">
                                <div className="text-[8px] text-white/40 font-black uppercase tracking-widest mb-2 text-center">Chu kỳ thanh toán</div>
                                <div className="text-center">
                                    <span className="text-sm font-serif font-black text-gold-muted uppercase italic">Tháng {monthStr.split('-')[1]}</span>
                                    <span className="text-[9px] text-white/30 font-bold block mt-0.5 tracking-[0.2em]">{monthStr.split('-')[0]}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="relative z-10 mt-10">
                        <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                            <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">Đã chốt lương</span>
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

                        {/* Summary Header */}
                        <div className="relative">
                            <div className="flex items-center gap-2 mb-2">
                                <FileText size={14} className="text-indigo-500" />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-text-soft/60 italic">Chi tiết kê khai thu nhập</span>
                            </div>
                            <h3 className="text-4xl font-serif font-black text-text-main tracking-tighter uppercase leading-none italic">
                                Bảng lương <span className="text-gold-muted">Cá nhân</span>
                            </h3>
                            <div className="flex items-center gap-3 mt-4">
                                <span className="text-[9px] font-black px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg uppercase tracking-widest border border-indigo-100/50">{data.jobTitle?.name || 'Vị trí chuyên môn'}</span>
                                <span className="w-1.5 h-1.5 rounded-full bg-gold-light/30"></span>
                                <span className="text-[9px] font-black text-text-soft/40 uppercase tracking-widest">{data.branch?.name || 'Hệ thống TaiChinh'}</span>
                            </div>
                        </div>

                        {/* Base Pay Section */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 px-2">
                                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-sm">
                                    <Clock size={16} strokeWidth={2.5} />
                                </div>
                                <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-text-main italic">Công nhật & Lương khoán</h4>
                                <div className="flex-1 h-px bg-gradient-to-r from-gold-light/20 to-transparent"></div>
                            </div>

                            <div className="bg-white rounded-[32px] p-8 border border-gold-light/10 shadow-luxury group transition-all relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/20 rounded-bl-full -mr-16 -mt-16 group-hover:bg-indigo-50/40 transition-colors"></div>

                                <div className="relative z-10 space-y-6">
                                    {data.config.type !== 'fixed' && (
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <span className="text-[10px] font-black text-text-soft/60 uppercase tracking-widest block mb-1">Thời gian làm việc</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-2xl font-serif font-black text-text-main tabular-nums">{data.totalWorkDays}</span>
                                                    <span className="text-[10px] font-black text-text-soft/30 uppercase italic">/ {data.config.standardDays} ngày sàn</span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-[10px] font-black text-text-soft/60 uppercase tracking-widest block mb-1">Hệ số lương cơ sở</span>
                                                <span className="text-lg font-black text-text-main tabular-nums">{formatVND(data.config.baseSalary)}</span>
                                            </div>
                                        </div>
                                    )}

                                    {data.config.type === 'fixed' && (
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-black text-text-soft/60 uppercase tracking-widest block">Lương khoán định kỳ</span>
                                            <span className="text-2xl font-serif font-black text-text-main tabular-nums">{formatVND(data.config.baseSalary)}</span>
                                        </div>
                                    )}

                                    <div className="pt-6 border-t border-gold-light/10 flex justify-between items-end">
                                        <span className="text-[11px] font-black text-text-main uppercase tracking-widest italic">Thành tiền công nhật</span>
                                        <span className="text-3xl font-serif font-black text-emerald-600 tabular-nums">+{formatVND(data.basePay)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Earnings Section */}
                        {(data.totalAllowance > 0 || data.totalBonus > 0 || data.userCommission > 0 || data.revenueShareAmount > 0) && (
                            <div className="space-y-6">
                                <div className="flex items-center gap-3 px-2">
                                    <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-sm">
                                        <TrendingUp size={16} strokeWidth={2.5} />
                                    </div>
                                    <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-text-main italic">Phúc lợi & Thưởng hiệu quả</h4>
                                    <div className="flex-1 h-px bg-gradient-to-r from-emerald-100/50 to-transparent"></div>
                                </div>

                                <div className="bg-emerald-50/10 rounded-[32px] p-8 border border-emerald-100/50 shadow-sm space-y-6">
                                    {/* Phụ cấp danh mục */}
                                    {data.config.allowances?.length > 0 && (
                                        <div className="space-y-3">
                                            {data.config.allowances.map((a: any, i: number) => (
                                                <div key={i} className="flex justify-between items-center bg-white/60 p-4 rounded-2xl border border-emerald-100/30">
                                                    <span className="text-[11px] font-black text-emerald-800/60 uppercase tracking-widest italic flex items-center gap-3">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]"></div> {a.name}
                                                    </span>
                                                    <span className="text-sm font-black text-emerald-700 tabular-nums">+{formatVND(a.amount)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Thưởng nóng/KPI */}
                                    <div className="space-y-3">
                                        {(state.bonuses || []).filter((b: any) => b.userId === data.user.id && b.period === monthStr).map((b: any) => (
                                            <div key={b.id} className="flex justify-between items-center bg-white/60 p-4 rounded-2xl border border-emerald-100/30">
                                                <span className="text-[11px] font-black text-emerald-800/60 uppercase tracking-widest italic flex items-center gap-3">
                                                    <Star size={12} className="text-amber-500 fill-amber-500" /> Thưởng: {b.note || 'Cống hiến'}
                                                </span>
                                                <span className="text-sm font-black text-emerald-700 tabular-nums">+{formatVND(b.amount)}</span>
                                            </div>
                                        ))}

                                        {data.kpiCommission?.bonusKpi > 0 && (
                                            <div className="flex justify-between items-center bg-white/60 p-4 rounded-2xl border border-emerald-100/30">
                                                <span className="text-[11px] font-black text-emerald-800/60 uppercase tracking-widest italic flex items-center gap-3">
                                                    <Star size={12} className="text-amber-500 animate-pulse" /> Thưởng đạt mốc KPI cơ sở
                                                </span>
                                                <span className="text-sm font-black text-emerald-700 tabular-nums">+{formatVND(data.kpiCommission.bonusKpi)}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Auto Commissions details */}
                                    {data.userCommission > 0 && (
                                        <div className="p-6 bg-white border border-emerald-100/50 rounded-2xl space-y-4">
                                            <div className="text-[9px] font-black text-emerald-500/50 uppercase tracking-[0.2em] mb-2 italic">Phân rã hoa hồng tự động</div>
                                            {data.aptComm?.amount > 0 && (
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[11px] font-bold text-text-soft/60 uppercase tracking-widest">• Hẹn khách Check-in</span>
                                                    <span className="text-[13px] font-black text-text-main tabular-nums">+{formatVND(data.aptComm.amount)}</span>
                                                </div>
                                            )}
                                            {data.leadComm?.amount > 0 && (
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[11px] font-bold text-text-soft/60 uppercase tracking-widest">• Khai thác Hotline ({data.leadComm.count})</span>
                                                    <span className="text-[13px] font-black text-text-main tabular-nums">+{formatVND(data.leadComm.amount)}</span>
                                                </div>
                                            )}
                                            {data.logsCommission > 0 && (
                                                <div className="flex justify-between items-center">
                                                    <span className="text-[11px] font-bold text-text-soft/60 uppercase tracking-widest">• Giao dịch phát sinh khác</span>
                                                    <span className="text-[13px] font-black text-text-main tabular-nums">+{formatVND(data.logsCommission)}</span>
                                                </div>
                                            )}
                                            {data.kpiCommission?.commissionAmount > 0 && (
                                                <div className="flex justify-between items-end pt-4 border-t border-emerald-50">
                                                    <div className="flex flex-col">
                                                        <span className="text-[11px] font-black text-emerald-600 uppercase tracking-widest italic flex items-center gap-2">
                                                            Thưởng % doanh số hiệu suất
                                                        </span>
                                                        <span className="text-[9px] font-bold text-text-soft/30 uppercase tracking-widest mt-1">Đạt mốc {data.kpiCommission.kpiPct}% KPI</span>
                                                    </div>
                                                    <span className="text-lg font-serif font-black text-emerald-600 tabular-nums">+{formatVND(data.kpiCommission.commissionAmount)}</span>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {data.revenueShareAmount > 0 && (
                                        <div className="flex justify-between items-center pt-2">
                                            <span className="text-[11px] font-black text-emerald-800/60 uppercase tracking-widest italic">• Bonus doanh thu ({data.config.revenueRate * 100}%)</span>
                                            <span className="text-sm font-black text-emerald-700 tabular-nums">+{formatVND(data.revenueShareAmount)}</span>
                                        </div>
                                    )}

                                    <div className="pt-6 border-t-2 border-emerald-200 border-dashed flex justify-between items-center">
                                        <span className="text-xs font-black text-emerald-900 uppercase tracking-widest italic">Tổng thu nhập bổ sung</span>
                                        <span className="text-3xl font-serif font-black text-emerald-600 tabular-nums">+{formatVND(data.totalAllowance + data.totalBonus + data.userCommission + data.revenueShareAmount)}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Deductions Section */}
                        {(data.totalDeduction > 0 || data.totalAdvance > 0) && (
                            <div className="space-y-6">
                                <div className="flex items-center gap-3 px-2">
                                    <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shadow-sm">
                                        <AlertTriangle size={16} strokeWidth={2.5} />
                                    </div>
                                    <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-text-main italic">Khấu trừ & Tạm ứng</h4>
                                    <div className="flex-1 h-px bg-gradient-to-r from-rose-100/50 to-transparent"></div>
                                </div>

                                <div className="bg-rose-50/10 rounded-[32px] p-8 border border-rose-100/50 shadow-sm space-y-4">
                                    {(state.deductions || []).filter((d: any) => d.userId === data.user.id && d.period === monthStr).map((d: any) => (
                                        <div key={d.id} className="flex justify-between items-center bg-white/60 p-4 rounded-xl border border-rose-100/30">
                                            <span className="text-[11px] font-black text-rose-800/60 uppercase tracking-widest italic flex items-center gap-3">
                                                <div className="w-1.5 h-1.5 rounded-full bg-rose-400"></div> Vi phạm: {d.note || 'Lỗi quy trình'}
                                            </span>
                                            <span className="text-sm font-black text-rose-700 tabular-nums">-{formatVND(d.amount)}</span>
                                        </div>
                                    ))}
                                    {(state.salaryAdvances || []).filter((a: any) => a.userId === data.user.id && a.period === monthStr && a.status === 'paid').map((a: any) => (
                                        <div key={a.id} className="flex justify-between items-center bg-white/60 p-4 rounded-xl border border-amber-100/30">
                                            <span className="text-[11px] font-black text-amber-800/60 uppercase tracking-widest italic flex items-center gap-3">
                                                <div className="w-1.5 h-1.5 rounded-full bg-amber-400"></div> Đã ứng: {a.note || 'Tạm ứng giữa kỳ'}
                                            </span>
                                            <span className="text-sm font-black text-amber-700 tabular-nums">-{formatVND(a.amount)}</span>
                                        </div>
                                    ))}
                                    <div className="pt-6 border-t-2 border-rose-200 border-dashed flex justify-between items-center">
                                        <span className="text-xs font-black text-rose-900 uppercase tracking-widest italic">Tổng khoản giảm trừ</span>
                                        <span className="text-3xl font-serif font-black text-rose-600 tabular-nums">-{formatVND(data.totalDeduction + data.totalAdvance)}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Final Payout Footer */}
                    <div className="bg-text-main p-10 flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden shrink-0">
                        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 0% 0%, rgba(255,255,255,0.2), transparent), radial-gradient(circle at 100% 100%, rgba(197,160,89,0.2), transparent)' }}></div>

                        <div className="relative z-10 space-y-2 text-center md:text-left">
                            <h5 className="text-gold-light/50 font-black text-[10px] tracking-[0.4em] uppercase italic">Thực lãnh chuyển khoản (NET)</h5>
                            <p className="text-white/30 text-[9px] font-bold uppercase tracking-widest leading-relaxed max-w-sm">
                                Số tiền đã bao gồm phụ cấp & thưởng KPI trừ đi các khoản phạt và ứng trước. <br />
                                <span className="text-white/10 mt-1 block italic lowercase">Final Payout Reconciliation Result</span>
                            </p>
                        </div>

                        <div className="relative z-10 text-center md:text-right flex flex-col items-center md:items-end">
                            <span className="text-[9px] font-black text-white/20 tracking-[0.3em] uppercase mb-1">Total Net Income</span>
                            <div className="text-5xl md:text-6xl font-serif font-black text-gold-muted drop-shadow-luxury tabular-nums">
                                {formatVND(data.netPay)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
