import React from 'react'
import {
    History, Zap, History as HistoryIcon, Send, Clock, User as UserIcon,
    XCircle, Save, X, Pencil, CalendarDays, History as HistoryLogo,
    Zap as ZapIcon
} from 'lucide-react'

interface LeadModalsProps {
    // Care Modal
    showCareModal: boolean
    setShowCareModal: (val: boolean) => void
    activeLead: any
    setActiveLead: (val: any) => void
    isEditingInfo: boolean
    setIsEditingInfo: (val: boolean) => void
    careForm: any
    setCareForm: (val: any) => void
    handleAddCareLog: () => void
    handleSaveInline: () => void
    handleCancelInline: () => void
    openBooking: (lead: any) => void
    careResults: any[]

    // Form Modal
    showForm: boolean
    setShowForm: (val: boolean) => void
    form: any
    setForm: (val: any) => void
    handleSave: () => void
    sources: string[]
    statusChips: any
    branches: any[]

    // Booking Modal
    showBookingModal: boolean
    setShowBookingModal: (val: boolean) => void
    bookingForm: any
    setBookingForm: (val: any) => void
    handleBooking: () => void
}

export const LeadModals: React.FC<LeadModalsProps> = ({
    showCareModal, setShowCareModal, activeLead, setActiveLead,
    isEditingInfo, setIsEditingInfo, careForm, setCareForm,
    handleAddCareLog, handleSaveInline, handleCancelInline,
    openBooking, careResults,

    showForm, setShowForm, form, setForm, handleSave,
    sources, statusChips, branches,

    showBookingModal, setShowBookingModal, bookingForm, setBookingForm, handleBooking
}) => {
    return (
        <>
            {/* Modal Care Logs & Timeline */}
            {showCareModal && activeLead && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={() => setShowCareModal(false)} />
                    <div className="relative w-full max-w-5xl bg-white rounded-[40px] shadow-luxury overflow-hidden animate-modal-up flex flex-col h-[90vh] border border-gold-light/20">
                        {/* Header & Basic Info */}
                        <div className="p-10 border-b border-gold-light/10 bg-beige-soft/20">
                            {['booked', 'pending', 'confirmed', 'arrived', 'completed', 'no_show'].includes(activeLead.status) && (
                                <div className="mb-8 p-5 bg-gold-light/10 border border-gold-light/20 rounded-[20px] flex items-center gap-4">
                                    <div className="w-10 h-10 bg-gold-muted text-white rounded-xl shadow-lg shadow-gold-muted/20 flex items-center justify-center group">
                                        <Zap size={20} strokeWidth={1.5} className="animate-pulse" />
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-black text-text-main uppercase tracking-[0.2em] italic">Lead đang vận hành theo lịch hẹn</p>
                                        <p className="text-[10px] font-bold text-text-soft/60 italic mt-0.5">Hệ thống đã khóa các thao tác chỉnh sửa để đảm bảo tính toàn vẹn của lịch hẹn.</p>
                                    </div>
                                </div>
                            )}
                            <div className="flex justify-between items-start mb-8">
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-8 h-8 rounded-lg bg-gold-light/30 flex items-center justify-center text-gold-muted">
                                            <History className="shrink-0" size={18} strokeWidth={1.5} />
                                        </div>
                                        <h2 className="text-3xl font-serif font-black text-text-main italic tracking-tighter uppercase">
                                            Chi tiết hồ sơ <span className="text-gold-muted/50">Lead</span>
                                        </h2>
                                    </div>
                                    <div className="text-[10px] font-black text-gold-muted uppercase tracking-[0.4em] italic opacity-40">Reference: #{activeLead.id}</div>
                                </div>
                                <div className="flex items-center gap-4">
                                    {isEditingInfo ? (
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={handleSaveInline}
                                                className="flex items-center gap-3 bg-text-main text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-luxury active:scale-95 transition-all"
                                            >
                                                <Save size={16} strokeWidth={2} /> Lưu hồ sơ
                                            </button>
                                            <button
                                                onClick={handleCancelInline}
                                                className="flex items-center gap-3 bg-white border border-gold-light/20 text-text-soft px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all"
                                            >
                                                <X size={16} strokeWidth={2} /> Hủy bỏ
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            {activeLead.phone && activeLead.status === 'in_care' && (
                                                <button
                                                    onClick={() => openBooking(activeLead)}
                                                    className="flex items-center gap-3 bg-emerald-600 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-luxury shadow-emerald-200 hover:bg-emerald-700 transition-all active:scale-95"
                                                >
                                                    <CalendarDays size={16} strokeWidth={2} /> Đặt lịch hẹn
                                                </button>
                                            )}
                                            {!['booked', 'pending', 'confirmed', 'arrived', 'completed', 'no_show'].includes(activeLead.status) && (
                                                <button
                                                    onClick={() => setIsEditingInfo(true)}
                                                    className="w-12 h-12 bg-white border border-gold-light/20 text-gold-muted hover:bg-gold-light/10 rounded-xl transition-all active:scale-90 shadow-sm flex items-center justify-center"
                                                    title="Chỉnh sửa thông tin"
                                                >
                                                    <Pencil size={20} strokeWidth={1.5} />
                                                </button>
                                            )}
                                        </>
                                    )}
                                    <button onClick={() => setShowCareModal(false)} className="w-12 h-12 bg-white border border-gold-light/20 text-text-soft/40 hover:text-rose-600 hover:border-rose-100 rounded-xl transition-all shadow-sm flex items-center justify-center">
                                        <X size={20} strokeWidth={2.5} />
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-10">
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-text-soft/40 italic">Họ và tên khách hàng</label>
                                    {isEditingInfo ? (
                                        <input
                                            className="w-full p-3 bg-white border border-gold-light/30 rounded-xl text-xs font-black focus:ring-2 focus:ring-gold-muted/20 outline-none italic"
                                            value={activeLead.name}
                                            onChange={e => setActiveLead({ ...activeLead, name: e.target.value })}
                                        />
                                    ) : (
                                        <p className="text-[14px] font-black text-text-main italic">{activeLead.name}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-text-soft/40 italic">Số điện thoại liên hệ</label>
                                    <div className="flex items-center gap-2">
                                        {isEditingInfo ? (
                                            <input
                                                className="w-full p-3 bg-white border border-gold-light/30 rounded-xl text-xs font-black focus:ring-2 focus:ring-gold-muted/20 outline-none italic text-gold-muted tabular-nums"
                                                value={activeLead.phone || ''}
                                                onChange={e => setActiveLead({ ...activeLead, phone: e.target.value })}
                                            />
                                        ) : (
                                            <>
                                                <p className="text-[14px] font-black text-gold-muted italic tabular-nums">{activeLead.phone || 'N/A'}</p>
                                                {activeLead.phone && activeLead.phoneObtainedAt && (
                                                    <span className={`text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-tighter italic border ${(new Date(activeLead.phoneObtainedAt).getTime() - new Date(activeLead.createdAt).getTime()) / (1000 * 60 * 60) <= 24 ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-indigo-50 text-indigo-600 border-indigo-100'}`}>
                                                        {(new Date(activeLead.phoneObtainedAt).getTime() - new Date(activeLead.createdAt).getTime()) / (1000 * 60 * 60) <= 24 ? 'HOT' : 'COLD'}
                                                    </span>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-text-soft/40 italic">Chi nhánh điều phối</label>
                                    {isEditingInfo ? (
                                        <select
                                            className="w-full p-3 bg-white border border-gold-light/30 rounded-xl text-xs font-black focus:ring-2 focus:ring-gold-muted/20 outline-none italic uppercase appearance-none"
                                            value={activeLead.branchId}
                                            onChange={e => setActiveLead({ ...activeLead, branchId: e.target.value })}
                                        >
                                            {branches.filter(b => b.type !== 'hq' && !b.isHeadquarter).map(b => (
                                                <option key={b.id} value={b.id}>{b.name}</option>
                                            ))}
                                        </select>
                                    ) : (
                                        <p className="text-[12px] font-black text-text-main uppercase tracking-widest italic">
                                            {branches.find(b => b.id.toString() === activeLead.branchId?.toString())?.name || 'N/A'}
                                        </p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-text-soft/40 italic">Nguồn / Ngày khởi tạo</label>
                                    {isEditingInfo ? (
                                        <select
                                            className="w-full p-3 bg-white border border-gold-light/30 rounded-xl text-xs font-black focus:ring-2 focus:ring-gold-muted/20 outline-none italic appearance-none"
                                            value={activeLead.source}
                                            onChange={e => setActiveLead({ ...activeLead, source: e.target.value })}
                                        >
                                            {sources.map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    ) : (
                                        <p className="text-[12px] font-black text-text-main italic">{activeLead.source} • <span className="opacity-40 italic font-black text-[10px]">{new Date(activeLead.createdAt).toLocaleDateString('vi-VN')}</span></p>
                                    )}
                                </div>
                            </div>

                            <div className="mt-8 pt-8 border-t border-gold-light/10">
                                <label className="text-[9px] font-black uppercase tracking-[0.2em] text-text-soft/40 italic block mb-3">Ghi chú vận hành ban đầu</label>
                                {isEditingInfo ? (
                                    <textarea
                                        className="w-full p-5 bg-white border border-gold-light/30 rounded-2xl text-xs font-black italic focus:ring-2 focus:ring-gold-muted/20 outline-none min-h-[100px]"
                                        value={activeLead.notes || ''}
                                        onChange={e => setActiveLead({ ...activeLead, notes: e.target.value })}
                                    />
                                ) : (
                                    <div className="p-6 bg-white/50 rounded-2xl border border-gold-light/10 shadow-inner ring-1 ring-gold-light/5">
                                        <p className="text-xs font-black text-text-soft/60 italic leading-relaxed">"{activeLead.notes || 'Không có ghi chú ban đầu'}"</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-10 bg-white border-b border-gold-light/10 shadow-sm z-10">
                            <div className="max-w-4xl">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2 rounded-xl bg-gold-light/30 text-gold-muted"><ZapIcon size={16} strokeWidth={2} /></div>
                                    <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-gold-muted italic">Cập nhật tương tác mới</h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
                                    <div className="md:col-span-3">
                                        <label className="text-[9px] font-black uppercase tracking-[0.2em] text-text-soft/40 italic block mb-2 px-1">Kết quả chăm sóc</label>
                                        <select
                                            className="w-full p-4 bg-beige-soft/30 border-none rounded-2xl text-xs font-black focus:ring-2 focus:ring-gold-muted/20 shadow-inner appearance-none cursor-pointer italic text-text-main"
                                            value={careForm.result}
                                            onChange={e => setCareForm({ ...careForm, result: e.target.value })}
                                        >
                                            {careResults.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                                        </select>
                                    </div>
                                    <div className="md:col-span-9 relative">
                                        <label className="text-[9px] font-black uppercase tracking-[0.2em] text-text-soft/40 italic block mb-2 px-1">Nội dung nhật ký hệ thống</label>
                                        <input
                                            className="w-full p-4 bg-beige-soft/30 border-none rounded-2xl text-xs font-black pr-16 shadow-inner focus:ring-2 focus:ring-gold-muted/20 outline-none italic placeholder:text-text-soft/20 text-text-main disabled:opacity-40"
                                            placeholder={['booked', 'pending', 'confirmed', 'arrived', 'completed', 'no_show'].includes(activeLead.status) ? "Hồ sơ đang bị khóa..." : "Nhập phản hồi khách hàng tại đây..."}
                                            value={careForm.content}
                                            onChange={e => setCareForm({ ...careForm, content: e.target.value })}
                                            onKeyDown={e => e.key === 'Enter' && !['booked', 'pending', 'confirmed', 'arrived', 'completed', 'no_show'].includes(activeLead.status) && handleAddCareLog()}
                                            disabled={['booked', 'pending', 'confirmed', 'arrived', 'completed', 'no_show'].includes(activeLead.status)}
                                        />
                                        <button
                                            onClick={handleAddCareLog}
                                            disabled={['booked', 'pending', 'confirmed', 'arrived', 'completed', 'no_show'].includes(activeLead.status)}
                                            className="absolute right-2 top-[34px] p-2.5 bg-text-main text-white rounded-xl shadow-luxury active:scale-90 transition-all disabled:opacity-30 disabled:bg-text-soft/20 group overflow-hidden"
                                        >
                                            <Send size={16} strokeWidth={2.5} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Bottom: Timeline */}
                        <div className="flex-1 overflow-y-auto p-12 custom-scrollbar bg-beige-soft/10">
                            <div className="flex items-center gap-3 mb-10 opacity-40">
                                <HistoryLogo size={18} strokeWidth={1.5} className="text-gold-muted" />
                                <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-gold-muted italic">Nhật ký vận hành Timeline</h3>
                            </div>

                            <div className="relative space-y-10 pl-12 border-l border-gold-light/20 ml-4">
                                {(activeLead.careLogs || []).length === 0 ? (
                                    <div className="p-10 text-center bg-white/40 rounded-[32px] border-2 border-dashed border-gold-light/20">
                                        <p className="text-[11px] font-black text-text-soft/40 italic uppercase tracking-[0.2em]">Hệ thống chưa ghi nhận tương tác</p>
                                    </div>
                                ) : (activeLead.careLogs || []).map((log: any) => {
                                    const res = careResults.find(r => r.value === log.result) || { label: log.result, color: 'text-text-soft/60 bg-beige-soft' }
                                    return (
                                        <div key={log.id} className="relative group animate-modal-up">
                                            <div className="absolute -left-[61px] top-1.5 w-12 h-12 bg-white rounded-2xl border border-gold-light/20 flex items-center justify-center shadow-sm z-10 group-hover:bg-gold-muted group-hover:text-white transition-all group-hover:scale-110">
                                                <UserIcon size={16} strokeWidth={2} />
                                            </div>
                                            <div className="bg-white p-8 rounded-[32px] shadow-sm border border-gold-light/10 group-hover:shadow-luxury group-hover:ring-1 group-hover:ring-gold-light/30 transition-all duration-500">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div>
                                                        <div className="text-[11px] font-black text-text-main uppercase tracking-widest italic mb-1">
                                                            {log.userName || 'System Operator'}
                                                        </div>
                                                        <div className="text-[10px] font-black text-gold-muted italic opacity-40 tabular-nums lowercase tracking-tighter">
                                                            {new Date(log.createdAt).toLocaleString('vi-VN')}
                                                        </div>
                                                    </div>
                                                    <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border italic ${res.color}`}>{res.label}</span>
                                                </div>
                                                <p className="text-[13px] font-black text-text-soft italic leading-relaxed tracking-tight">
                                                    {log.content || 'Giao dịch viên không để lại ghi chú'}
                                                </p>
                                            </div>
                                        </div>
                                    )
                                })}

                                <div className="relative group flex items-center gap-5 pt-4">
                                    <div className="absolute -left-[57px] w-10 h-10 bg-gold-muted text-white rounded-[15px] flex items-center justify-center shadow-lg z-10 ring-4 ring-white">
                                        <Clock size={16} strokeWidth={2.5} />
                                    </div>
                                    <div className="bg-white px-6 py-3 rounded-2xl border border-gold-light/20 flex items-center gap-4 shadow-sm group-hover:shadow-md transition-shadow">
                                        <span className="text-[10px] font-black text-gold-muted uppercase tracking-[0.2em] italic">Khởi tạo hệ thống</span>
                                        <span className="text-[10px] font-black text-text-soft/40 italic tabular-nums">{new Date(activeLead.createdAt).toLocaleString('vi-VN')}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Add/Edit Lead */}
            {showForm && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={() => setShowForm(false)} />
                    <div className="relative w-full max-w-2xl bg-white rounded-[40px] p-12 animate-modal-up shadow-luxury border border-gold-light/20">
                        <div className="flex justify-between items-start mb-10">
                            <div>
                                <div className="text-[10px] font-black text-gold-muted uppercase tracking-[0.4em] italic mb-3">CRM System Module</div>
                                <h2 className="text-3xl font-serif font-black text-text-main italic tracking-tighter uppercase">
                                    {form.id ? 'Sửa thông tin hồ sơ' : 'Thêm hồ sơ Lead mới'}
                                </h2>
                            </div>
                            <button onClick={() => setShowForm(false)} className="w-12 h-12 bg-beige-soft/30 hover:bg-rose-50 hover:text-rose-600 text-text-soft/30 rounded-2xl transition-all shadow-sm flex items-center justify-center">
                                <X size={20} strokeWidth={2.5} />
                            </button>
                        </div>

                        <div className="space-y-8">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-gold-muted/40 tracking-[0.2em] block px-1 italic">Họ và tên khách hàng *</label>
                                    <input className="w-full p-4 bg-beige-soft/30 border-none rounded-2xl font-black text-[13px] italic focus:ring-2 focus:ring-gold-muted/20 outline-none text-text-main" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="VD: Nguyễn Kim Anh" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-gold-muted/40 tracking-[0.2em] block px-1 italic">Số điện thoại liên hệ</label>
                                    <input className="w-full p-4 bg-beige-soft/30 border-none rounded-2xl font-black text-[13px] italic focus:ring-2 focus:ring-gold-muted/20 outline-none text-text-main tabular-nums" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="VD: 0987 654 321" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-gold-muted/40 tracking-[0.2em] block px-1 italic">Chi nhánh điều phối</label>
                                    <select className="w-full p-4 bg-beige-soft/30 border-none rounded-2xl font-black text-[12px] italic focus:ring-2 focus:ring-gold-muted/20 outline-none appearance-none cursor-pointer uppercase text-text-main" value={form.branchId} onChange={e => setForm({ ...form, branchId: e.target.value })}>
                                        {branches.filter(b => b.type !== 'hq' && !b.isHeadquarter).map(b => (
                                            <option key={b.id} value={b.id}>{b.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-gold-muted/40 tracking-[0.2em] block px-1 italic">Nguồn dữ liệu</label>
                                    <select className="w-full p-4 bg-beige-soft/30 border-none rounded-2xl font-black text-[12px] italic focus:ring-2 focus:ring-gold-muted/20 outline-none appearance-none cursor-pointer text-text-main" value={form.source} onChange={e => setForm({ ...form, source: e.target.value })}>
                                        {sources.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2 lg:col-span-1 col-span-2">
                                    <label className="text-[10px] font-black uppercase text-gold-muted/40 tracking-[0.2em] block px-1 italic">Trạng thái vận hành ban đầu</label>
                                    <select className="w-full p-4 bg-beige-soft/30 border-none rounded-2xl font-black text-[12px] italic focus:ring-2 focus:ring-gold-muted/20 outline-none appearance-none cursor-pointer text-text-main" value={form.status} onChange={e => setForm({ ...form, status: e.target.value as any })}>
                                        {Object.entries(statusChips).map(([val, item]: [string, any]) => (
                                            <option key={val} value={val}>{item.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-gold-muted/40 tracking-[0.2em] block px-1 italic">Ghi chú yêu cầu đặc biệt</label>
                                <textarea className="w-full p-5 bg-beige-soft/30 border-none rounded-[28px] font-black text-[13px] italic focus:ring-2 focus:ring-gold-muted/20 outline-none text-text-main min-h-[120px] placeholder:text-text-soft/20 ring-1 ring-gold-light/5 shadow-inner" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Khách hàng quan tâm dịch vụ chăm sóc da chuyên sâu..." />
                            </div>
                        </div>

                        <div className="mt-12 flex gap-4">
                            <button onClick={() => setShowForm(false)} className="flex-1 py-5 bg-white border border-gold-light/20 text-text-soft/60 rounded-[20px] font-black text-[11px] uppercase tracking-[0.2em] hover:bg-beige-soft/40 transition-all italic active:scale-95">Hủy bỏ</button>
                            <button onClick={handleSave} className="flex-[2] py-5 bg-text-main text-white rounded-[20px] font-black text-[11px] uppercase tracking-[0.2em] shadow-luxury hover:bg-gold-muted transition-all italic active:scale-95">Xác nhận lưu hồ sơ</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Booking */}
            {showBookingModal && activeLead && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={() => setShowBookingModal(false)} />
                    <div className="relative w-full max-w-xl bg-white rounded-[40px] p-12 animate-modal-up shadow-luxury border border-emerald-100/50">
                        <div className="flex justify-between items-start mb-10">
                            <div>
                                <div className="text-[10px] font-black text-emerald-600/40 uppercase tracking-[0.4em] italic mb-3">Service Booking Module</div>
                                <h2 className="text-3xl font-serif font-black text-text-main italic tracking-tighter uppercase">Xác nhận lịch hẹn Lead</h2>
                                <p className="text-[11px] font-black text-emerald-600 uppercase tracking-widest mt-2 italic tabular-nums">{activeLead.name} • {activeLead.phone}</p>
                            </div>
                            <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-[20px] flex items-center justify-center shadow-sm">
                                <CalendarDays size={32} strokeWidth={1.5} />
                            </div>
                        </div>

                        <div className="space-y-8">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-emerald-600/40 tracking-[0.2em] block px-1 italic">Địa điểm (Chi nhánh khách đến)</label>
                                <select
                                    className="w-full p-4 bg-emerald-50/20 border-emerald-100/50 rounded-2xl font-black text-[13px] italic focus:ring-2 focus:ring-emerald-500/20 outline-none appearance-none cursor-pointer uppercase text-emerald-900"
                                    value={bookingForm.branchId}
                                    onChange={e => setBookingForm({ ...bookingForm, branchId: e.target.value })}
                                >
                                    {branches.filter(b => b.type !== 'hq' && !b.isHeadquarter).map(b => (
                                        <option key={b.id} value={b.id}>{b.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-emerald-600/40 tracking-[0.2em] block px-1 italic">Ngày khách đến</label>
                                    <input type="date" className="w-full p-4 bg-emerald-50/20 border-none rounded-2xl font-black text-[13px] italic focus:ring-2 focus:ring-emerald-500/20 outline-none text-emerald-900 tabular-nums shadow-inner" value={bookingForm.date} onChange={e => setBookingForm({ ...bookingForm, date: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-emerald-600/40 tracking-[0.2em] block px-1 italic">Khung giờ vàng</label>
                                    <input type="time" className="w-full p-4 bg-emerald-50/20 border-none rounded-2xl font-black text-[13px] italic focus:ring-2 focus:ring-emerald-500/20 outline-none text-emerald-900 tabular-nums shadow-inner" value={bookingForm.time} onChange={e => setBookingForm({ ...bookingForm, time: e.target.value })} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase text-emerald-600/40 tracking-[0.2em] block px-1 italic">Yêu cầu đặc biệt tại Spa</label>
                                <textarea className="w-full p-5 bg-emerald-50/20 border-none rounded-[28px] font-black text-[13px] italic focus:ring-2 focus:ring-emerald-500/20 outline-none text-emerald-900 min-h-[120px] placeholder:text-emerald-700/20 shadow-inner" value={bookingForm.notes} onChange={e => setBookingForm({ ...bookingForm, notes: e.target.value })} placeholder="VD: Khách cần kỹ thuật viên kỳ cựu..." />
                            </div>
                        </div>
                        <div className="mt-12 flex gap-4">
                            <button onClick={() => setShowBookingModal(false)} className="flex-1 py-5 bg-white border border-emerald-100 text-emerald-600/60 rounded-[20px] font-black text-[11px] uppercase tracking-[0.2em] hover:bg-emerald-50 transition-all italic active:scale-95">Hủy thao tác</button>
                            <button onClick={handleBooking} className="flex-[2] py-5 bg-emerald-600 text-white rounded-[20px] font-black text-[11px] uppercase tracking-[0.2em] shadow-luxury shadow-emerald-200 hover:bg-emerald-700 transition-all italic active:scale-95">Xác nhận đặt lịch ngay</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
