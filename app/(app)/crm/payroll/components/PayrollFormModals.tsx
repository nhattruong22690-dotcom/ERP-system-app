'use client'
import { Star, Gift, Info, AlertTriangle, CreditCard, Plus, Search, XCircle } from 'lucide-react'
import SearchableUserSelect from './SearchableUserSelect'

interface PayrollFormModalsProps {
    userOptions: any[]
    activeRosterUserOptions: any[]
    form: any
    setForm: (form: any) => void
    isSubmitting: boolean

    showBonusModal: boolean
    setShowBonusModal: (show: boolean) => void
    onAddBonus: () => void

    showDeductionModal: boolean
    setShowDeductionModal: (show: boolean) => void
    onAddDeduction: () => void

    showAdvanceModal: boolean
    setShowAdvanceModal: (show: boolean) => void
    onAddAdvance: (autoApprove: boolean) => void

    showAddUserModal: boolean
    setShowAddUserModal: (show: boolean) => void
    onAddUserToRoster: (userId: string) => void

    isAdminOrAccounting: boolean
}

export default function PayrollFormModals({
    userOptions,
    activeRosterUserOptions,
    form,
    setForm,
    isSubmitting,
    showBonusModal,
    setShowBonusModal,
    onAddBonus,
    showDeductionModal,
    setShowDeductionModal,
    onAddDeduction,
    showAdvanceModal,
    setShowAdvanceModal,
    onAddAdvance,
    showAddUserModal,
    setShowAddUserModal,
    onAddUserToRoster,
    isAdminOrAccounting
}: PayrollFormModalsProps) {
    return (
        <>
            {/* Modal: Thêm Thưởng */}
            {showBonusModal && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 md:p-6 bg-black/40 backdrop-blur-md animate-fade-in overflow-y-auto cursor-pointer md:left-[280px]" onClick={async e => { if (e.target === e.currentTarget) setShowBonusModal(false) }}>
                    <div className="bg-white w-full max-w-xl h-fit rounded-[32px] md:rounded-[40px] shadow-2xl overflow-hidden flex flex-col md:flex-row animate-modal-up border border-gold-light/20 my-auto cursor-default relative" onClick={(e) => e.stopPropagation()}>
                        {/* Left Side: Branding Sidebar */}
                        <div className="w-full md:w-[160px] bg-emerald-600 relative overflow-hidden flex flex-col p-8 text-white shrink-0 items-center justify-center border-b md:border-b-0 md:border-r border-white/5">
                            <div className="absolute inset-0 opacity-20" style={{ background: 'radial-gradient(circle at 20% 150%, #C5A059, transparent), radial-gradient(circle at 80% -50%, #F2EBE1, transparent)' }}></div>
                            <div className="relative z-10 flex flex-col items-center text-center">
                                <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center mb-4 backdrop-blur-md shadow-2xl group-hover:scale-110 transition-transform">
                                    <Star className="text-white" size={32} strokeWidth={1.5} />
                                </div>
                                <h4 className="text-[10px] text-white/60 font-black uppercase tracking-[0.3em] mb-1 italic">Payroll</h4>
                                <p className="text-[12px] text-white font-serif font-black uppercase tracking-[0.1em]">Reward</p>
                            </div>
                        </div>

                        {/* Right Side Form */}
                        <div className="flex-1 bg-white flex flex-col relative min-w-0 p-8 md:p-10">
                            <button onClick={() => setShowBonusModal(false)} className="absolute top-6 right-6 p-3 hover:bg-rose-50 hover:text-rose-600 text-gray-300 rounded-xl transition-all active:scale-95 shadow-sm border border-gold-light/10 bg-white/50 backdrop-blur-sm">
                                <XCircle size={18} strokeWidth={1.5} />
                            </button>

                            <div className="mb-8">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] italic">Ghi nhận thưởng tháng</span>
                                </div>
                                <h3 className="text-2xl font-serif font-black text-text-main tracking-tighter uppercase leading-none">
                                    {form.id ? 'Hiệu chỉnh' : 'Thưởng'} <span className="text-emerald-600">Nhân Viên</span>
                                </h3>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-text-soft/40 block px-1 italic">Chọn nhân viên thụ hưởng</label>
                                    <SearchableUserSelect
                                        options={activeRosterUserOptions}
                                        value={form.userId}
                                        onChange={val => setForm({ ...form, userId: val })}
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-text-soft/40 block px-1 italic">Phân loại thưởng</label>
                                        <select className="w-full bg-beige-soft/30 border border-gold-light/20 rounded-xl px-4 py-3.5 text-[13px] font-bold text-text-main focus:ring-4 focus:ring-gold-muted/5 outline-none transition-all appearance-none italic" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                                            <option value="">Chọn loại...</option>
                                            <option value="kpi">Thưởng KPI</option>
                                            <option value="revenue">Thưởng doanh số</option>
                                            <option value="hot">Thưởng nóng / Khác</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-text-soft/40 block px-1 italic">Giá trị thưởng (VNĐ)</label>
                                        <input type="number" className="w-full bg-beige-soft/30 border border-gold-light/20 rounded-xl px-4 py-3.5 text-[13px] font-black text-emerald-700 focus:ring-4 focus:ring-emerald-500/5 outline-none transition-all tabular-nums italic" placeholder="VD: 500000" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-text-soft/40 block px-1 italic">Ghi chú hạch toán</label>
                                    <textarea className="w-full bg-beige-soft/30 border border-gold-light/20 rounded-xl px-4 py-3 text-[13px] font-medium text-text-main focus:ring-4 focus:ring-gold-muted/5 outline-none transition-all min-h-[100px] resize-none italic" placeholder="Lý do ghi nhận thưởng..." value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} />
                                </div>

                                <div className="pt-6 flex gap-4">
                                    <button onClick={() => setShowBonusModal(false)} className="flex-1 h-14 rounded-2xl bg-white text-text-soft/60 text-[11px] font-black uppercase tracking-widest border border-gold-light/20 hover:text-rose-600 hover:bg-rose-50 transition-all active:scale-95 italic">Hủy hạch toán</button>
                                    <button
                                        onClick={onAddBonus}
                                        disabled={isSubmitting}
                                        className="flex-[2] h-14 rounded-2xl bg-emerald-600 text-white text-[11px] font-black uppercase tracking-[0.2em] shadow-luxury hover:bg-emerald-700 transition-all active:scale-95 flex items-center justify-center gap-3 italic"
                                    >
                                        {isSubmitting ? 'Đang thực thi...' : (form.id ? 'Xác nhận cập nhật' : 'Phát hành thưởng')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Thêm Vi phạm (Deduction) */}
            {showDeductionModal && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 md:p-6 bg-black/40 backdrop-blur-md animate-fade-in overflow-y-auto cursor-pointer md:left-[280px]" onClick={async e => { if (e.target === e.currentTarget) setShowDeductionModal(false) }}>
                    <div className="bg-white w-full max-w-xl h-fit rounded-[32px] md:rounded-[40px] shadow-2xl overflow-hidden flex flex-col md:flex-row animate-modal-up border border-gold-light/20 my-auto cursor-default relative" onClick={(e) => e.stopPropagation()}>
                        {/* Left Side: Branding Sidebar */}
                        <div className="w-full md:w-[160px] bg-rose-600 relative overflow-hidden flex flex-col p-8 text-white shrink-0 items-center justify-center border-b md:border-b-0 md:border-r border-white/5">
                            <div className="absolute inset-0 opacity-20" style={{ background: 'radial-gradient(circle at 20% 150%, #C5A059, transparent), radial-gradient(circle at 80% -50%, #F2EBE1, transparent)' }}></div>
                            <div className="relative z-10 flex flex-col items-center text-center">
                                <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center mb-4 backdrop-blur-md shadow-2xl group-hover:scale-110 transition-transform">
                                    <AlertTriangle className="text-white" size={32} strokeWidth={1.5} />
                                </div>
                                <h4 className="text-[10px] text-white/60 font-black uppercase tracking-[0.3em] mb-1 italic">Payroll</h4>
                                <p className="text-[12px] text-white font-serif font-black uppercase tracking-[0.1em]">Violation</p>
                            </div>
                        </div>

                        {/* Right Side Form */}
                        <div className="flex-1 bg-white flex flex-col relative min-w-0 p-8 md:p-10">
                            <button onClick={() => setShowDeductionModal(false)} className="absolute top-6 right-6 p-3 hover:bg-rose-50 hover:text-rose-600 text-gray-300 rounded-xl transition-all active:scale-95 shadow-sm border border-gold-light/10 bg-white/50 backdrop-blur-sm">
                                <XCircle size={18} strokeWidth={1.5} />
                            </button>

                            <div className="mb-8">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-rose-600 italic">Ghi nhận vi phạm & Giảm trừ</span>
                                </div>
                                <h3 className="text-2xl font-serif font-black text-text-main tracking-tighter uppercase leading-none">
                                    {form.id ? 'Hiệu chỉnh' : 'Truy thu'} <span className="text-rose-600">Sai phạm</span>
                                </h3>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-text-soft/40 block px-1 italic">Chọn nhân viên vi phạm</label>
                                    <SearchableUserSelect
                                        options={activeRosterUserOptions}
                                        value={form.userId}
                                        onChange={val => setForm({ ...form, userId: val })}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-text-soft/40 block px-1 italic">Số tiền khấu trừ (VNĐ)</label>
                                    <input type="number" className="w-full bg-rose-50 border border-rose-100 rounded-xl px-5 py-4 text-[13px] font-black text-rose-700 focus:ring-4 focus:ring-rose-200 outline-none transition-all tabular-nums italic" placeholder="VD: 100000" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-text-soft/40 block px-1 italic">Lý do sai phạm chi tiết</label>
                                    <textarea className="w-full bg-beige-soft/30 border border-gold-light/20 rounded-xl px-4 py-3 text-[13px] font-medium text-text-main focus:ring-4 focus:ring-gold-muted/5 outline-none transition-all min-h-[100px] resize-none italic" placeholder="Đi trễ, vi phạm nội quy,..." value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} />
                                </div>

                                <div className="pt-6 flex gap-4">
                                    <button onClick={() => setShowDeductionModal(false)} className="flex-1 h-14 rounded-2xl bg-white text-text-soft/60 text-[11px] font-black uppercase tracking-widest border border-gold-light/20 hover:text-rose-600 hover:bg-rose-50 transition-all active:scale-95 italic">Hủy hạch toán</button>
                                    <button
                                        onClick={onAddDeduction}
                                        disabled={isSubmitting}
                                        className="flex-[2] h-14 rounded-2xl bg-rose-600 text-white text-[11px] font-black uppercase tracking-[0.2em] shadow-luxury hover:bg-rose-700 transition-all active:scale-95 flex items-center justify-center gap-3 italic"
                                    >
                                        {isSubmitting ? 'Đang thực thi...' : (form.id ? 'Xác nhận cập nhật' : 'Xác nhận truy thu')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Tạm ứng (Advance) */}
            {showAdvanceModal && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 md:p-6 bg-black/40 backdrop-blur-md animate-fade-in overflow-y-auto cursor-pointer md:left-[280px]" onClick={async e => { if (e.target === e.currentTarget) setShowAdvanceModal(false) }}>
                    <div className="bg-white w-full max-w-xl h-fit rounded-[32px] md:rounded-[40px] shadow-2xl overflow-hidden flex flex-col md:flex-row animate-modal-up border border-gold-light/20 my-auto cursor-default relative" onClick={(e) => e.stopPropagation()}>
                        {/* Left Side: Branding Sidebar */}
                        <div className="w-full md:w-[160px] bg-amber-600 relative overflow-hidden flex flex-col p-8 text-white shrink-0 items-center justify-center border-b md:border-b-0 md:border-r border-white/5">
                            <div className="absolute inset-0 opacity-20" style={{ background: 'radial-gradient(circle at 20% 150%, #C5A059, transparent), radial-gradient(circle at 80% -50%, #F2EBE1, transparent)' }}></div>
                            <div className="relative z-10 flex flex-col items-center text-center">
                                <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center mb-4 backdrop-blur-md shadow-2xl group-hover:scale-110 transition-transform">
                                    <CreditCard className="text-white" size={32} strokeWidth={1.5} />
                                </div>
                                <h4 className="text-[10px] text-white/60 font-black uppercase tracking-[0.3em] mb-1 italic">Payroll</h4>
                                <p className="text-[12px] text-white font-serif font-black uppercase tracking-[0.1em]">Advance</p>
                            </div>
                        </div>

                        {/* Right Side Form */}
                        <div className="flex-1 bg-white flex flex-col relative min-w-0 p-8 md:p-10">
                            <button onClick={() => setShowAdvanceModal(false)} className="absolute top-6 right-6 p-3 hover:bg-rose-50 hover:text-rose-600 text-gray-300 rounded-xl transition-all active:scale-95 shadow-sm border border-gold-light/10 bg-white/50 backdrop-blur-sm">
                                <XCircle size={18} strokeWidth={1.5} />
                            </button>

                            <div className="mb-8">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 italic">Quản lý tạm ứng tiền mặt</span>
                                </div>
                                <h3 className="text-2xl font-serif font-black text-text-main tracking-tighter uppercase leading-none">
                                    Phát hành <span className="text-amber-600">Tạm Ứng</span>
                                </h3>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-text-soft/40 block px-1 italic">Chọn nhân viên tạm ứng</label>
                                    <SearchableUserSelect
                                        options={activeRosterUserOptions}
                                        value={form.userId}
                                        onChange={val => setForm({ ...form, userId: val })}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-text-soft/40 block px-1 italic">Hạn mức tạm ứng (VNĐ)</label>
                                    <div className="bg-amber-50/30 rounded-[28px] p-6 border border-amber-100 shadow-inner group transition-all">
                                        <input type="number" className="w-full bg-transparent border-none p-0 text-3xl font-serif font-black text-amber-700 placeholder:text-amber-200 outline-none tabular-nums" placeholder="0" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
                                        <p className="text-[9px] font-bold text-amber-600/40 uppercase tracking-widest mt-2 italic">* Sẽ được ghi nhận nợ và trừ vào phiếu lương cuối kỳ</p>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-text-soft/40 block px-1 italic">Lý do / Nội dung tạm ứng</label>
                                    <textarea className="w-full bg-beige-soft/30 border border-gold-light/20 rounded-xl px-4 py-3 text-[13px] font-medium text-text-main focus:ring-4 focus:ring-gold-muted/5 outline-none transition-all min-h-[80px] resize-none italic" placeholder="Lý do ứng lương..." value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} />
                                </div>

                                <div className="flex flex-col gap-3 pt-4">
                                    <div className="flex gap-4">
                                        <button onClick={() => setShowAdvanceModal(false)} className="flex-1 h-12 rounded-2xl bg-white text-text-soft/60 text-[11px] font-black uppercase tracking-widest border border-gold-light/20 hover:text-rose-600 hover:bg-rose-50 transition-all active:scale-95 italic">Hủy bỏ</button>
                                        <button
                                            onClick={() => onAddAdvance(false)}
                                            disabled={isSubmitting}
                                            className="flex-[2] h-12 rounded-2xl bg-text-main text-white text-[11px] font-black uppercase tracking-[0.2em] shadow-luxury transition-all active:scale-95 flex items-center justify-center gap-3 italic"
                                        >
                                            {form.id ? 'Cập nhật' : 'Gửi yêu cầu'}
                                        </button>
                                    </div>
                                    {isAdminOrAccounting && !form.id && (
                                        <button
                                            onClick={() => onAddAdvance(true)}
                                            disabled={isSubmitting}
                                            className="w-full h-14 bg-amber-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-luxury hover:bg-amber-700 transition-all active:scale-95 flex items-center justify-center gap-3 italic"
                                        >
                                            <Gift size={16} /> Phê duyệt & Hạch toán ngay
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal: Thêm nhân sự vào bảng lương (Roster) */}
            {showAddUserModal && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 md:p-6 bg-black/40 backdrop-blur-md animate-fade-in overflow-y-auto cursor-pointer md:left-[280px]" onClick={async e => { if (e.target === e.currentTarget) setShowAddUserModal(false) }}>
                    <div className="bg-white w-full max-w-xl h-fit rounded-[32px] md:rounded-[40px] shadow-2xl overflow-hidden flex flex-col md:flex-row animate-modal-up border border-gold-light/20 my-auto cursor-default relative" onClick={(e) => e.stopPropagation()}>

                        {/* Left Side: Branding Sidebar */}
                        <div className="w-full md:w-[160px] bg-indigo-600 relative overflow-hidden flex flex-col p-8 text-white shrink-0 items-center justify-center border-b md:border-b-0 md:border-r border-white/5">
                            <div className="absolute inset-0 opacity-20" style={{ background: 'radial-gradient(circle at 20% 150%, #C5A059, transparent), radial-gradient(circle at 80% -50%, #F2EBE1, transparent)' }}></div>
                            <div className="relative z-10 flex flex-col items-center text-center">
                                <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center mb-4 backdrop-blur-md shadow-2xl group-hover:scale-110 transition-transform">
                                    <Plus className="text-white" size={32} strokeWidth={1.5} />
                                </div>
                                <h4 className="text-[10px] text-white/60 font-black uppercase tracking-[0.3em] mb-1 italic">Payroll</h4>
                                <p className="text-[12px] text-white font-serif font-black uppercase tracking-[0.1em]">Roster</p>
                            </div>
                        </div>

                        {/* Right Side Layout */}
                        <div className="flex-1 bg-white flex flex-col relative min-w-0 p-8 md:p-10">
                            <button onClick={() => setShowAddUserModal(false)} className="absolute top-6 right-6 p-3 hover:bg-rose-50 hover:text-rose-600 text-gray-300 rounded-xl transition-all active:scale-95 shadow-sm border border-gold-light/10 bg-white/50 backdrop-blur-sm">
                                <XCircle size={18} strokeWidth={1.5} />
                            </button>

                            <div className="mb-8">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] italic">Bổ sung vào danh sách lương</span>
                                </div>
                                <h3 className="text-2xl font-serif font-black text-text-main tracking-tighter uppercase leading-none">
                                    Thêm <span className="text-indigo-600">Nhân Sự</span>
                                </h3>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-text-soft/40 block px-1 italic">Tìm kiếm nhân sự chưa hạch toán</label>
                                    <SearchableUserSelect
                                        options={userOptions.filter(o => !activeRosterUserOptions.some(ao => ao.id === o.id))}
                                        value={form.userId}
                                        onChange={val => setForm({ ...form, userId: val })}
                                        placeholder="Tìm NV chưa có..."
                                    />
                                </div>

                                <div className="p-5 bg-indigo-50/50 border border-indigo-100 rounded-[24px] flex gap-4 items-start italic">
                                    <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-indigo-600 shrink-0 shadow-sm border border-indigo-100">
                                        <Info size={16} strokeWidth={1.5} />
                                    </div>
                                    <div className="text-[11px] font-bold text-indigo-900/60 leading-relaxed uppercase tracking-tight">
                                        Hệ thống sẽ tự động quét dữ liệu chấm công và doanh số của nhân sự này để tính toán bảng lương tháng hiện tại.
                                    </div>
                                </div>

                                <div className="pt-6 flex gap-4">
                                    <button onClick={() => setShowAddUserModal(false)} className="flex-1 h-12 rounded-xl bg-white text-text-soft/60 text-[11px] font-black uppercase tracking-widest border border-gold-light/20 transition-all active:scale-95 italic">Hủy</button>
                                    <button
                                        onClick={() => onAddUserToRoster(form.userId)}
                                        disabled={isSubmitting || !form.userId}
                                        className="flex-[2] h-12 bg-indigo-600 text-white rounded-xl font-black text-[11px] uppercase tracking-[0.2em] shadow-luxury hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50 italic"
                                    >
                                        Xác nhận thêm nhân sự
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
