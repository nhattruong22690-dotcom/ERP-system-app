import React, { useState, useEffect } from 'react';
import { Customer, CustomerRank } from '@/lib/types';
import { useModal } from '@/components/layout/ModalProvider';
import {
    User,
    Phone,
    Mail,
    Facebook,
    Home,
    ClipboardList,
    Check,
    X,
    ChevronRight,
    MapPin,
    Calendar,
    MessageCircle,
    MessageSquare,
    CheckCircle2,
    Sparkles,
    Image as ImageIcon
} from 'lucide-react';

interface CustomerFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    customer: Customer | null;
    onSave: (data: Partial<Customer>) => void;
    onNavigate: (tab: string) => void;
    branches: any[];
}

const CustomerFormModal: React.FC<CustomerFormModalProps> = ({
    isOpen,
    onClose,
    customer,
    onSave,
    branches
}) => {
    const [formData, setFormData] = useState<Partial<Customer>>({});
    const { showConfirm } = useModal();
    const initialFormStateRef = React.useRef<string>('');

    useEffect(() => {
        if (isOpen && !initialFormStateRef.current) {
            const initialData: Partial<Customer> = customer ? { ...customer } : {
                fullName: '',
                phone: '',
                gender: 'nu' as const,
                rank: CustomerRank.MEMBER,
                points: 0,
                totalSpent: 0,
                isVip: false
            };
            setFormData(initialData);
            initialFormStateRef.current = JSON.stringify(initialData);
        } else if (!isOpen) {
            initialFormStateRef.current = '';
        }
    }, [customer, isOpen]);

    const isDirty = React.useMemo(() => {
        if (!isOpen || !initialFormStateRef.current) return false;
        return JSON.stringify(formData) !== initialFormStateRef.current;
    }, [formData, isOpen]);

    const handleCloseInternal = async () => {
        if (isDirty) {
            if (await showConfirm('Dữ liệu khách hàng chưa được lưu. Bạn có chắc chắn muốn đóng?')) {
                onClose();
            }
        } else {
            onClose();
        }
    };

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') handleCloseInternal();
    };

    return (
        <div 
            className="fixed inset-0 z-[1100] flex items-center justify-center p-4 md:p-6 bg-black/60 backdrop-blur-md animate-fade-in overflow-y-auto cursor-pointer" 
            onClick={handleCloseInternal}
            onKeyDown={handleKeyDown}
            role="dialog"
            aria-modal="true"
            aria-labelledby="customer-modal-title"
        >
            <div className="bg-white w-full max-w-7xl h-fit rounded-[32px] md:rounded-[40px] shadow-2xl overflow-hidden flex flex-col md:flex-row animate-scale-up border border-gold-light/20 my-auto cursor-default" onClick={(e) => e.stopPropagation()} tabIndex={-1}>

                {/* Left Side: Compact Branding Sidebar */}
                <div className="w-full md:w-[200px] bg-text-main relative overflow-hidden flex flex-col p-10 text-white shrink-0">
                    <div className="absolute inset-0 opacity-20" style={{ background: 'radial-gradient(circle at 20% 150%, #C5A059, transparent), radial-gradient(circle at 80% -50%, #F2EBE1, transparent)' }}></div>

                    <div className="relative z-10 flex flex-col h-full">
                        <div className="mb-8">
                            <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center mb-5">
                                <Sparkles className="text-gold-muted" size={24} aria-hidden="true" />
                            </div>
                            <h2 id="customer-modal-title" className="text-2xl font-serif font-black tracking-tight leading-tight">
                                {customer ? 'Hồ sơ' : 'Thêm mới'}
                            </h2>
                            <p className="text-[12px] text-gold-muted font-black uppercase tracking-[0.3em] mt-3 opacity-80">Xinh Group</p>
                        </div>
                    </div>
                </div>

                {/* Right Side: Horizontal Form Layout */}
                <div className="flex-1 bg-[#FAF7F2]/30 flex flex-col relative min-w-0">
                    {/* Compact Close Button */}
                    <button
                        onClick={handleCloseInternal}
                        className="absolute top-6 right-6 z-[120] w-10 h-10 rounded-xl bg-white/80 hover:bg-white text-text-soft hover:text-rose-500 flex items-center justify-center transition-all shadow-sm border border-gold-light/20 active:scale-90 focus:outline-offset-2"
                        aria-label="Đóng"
                    >
                        <X size={18} strokeWidth={2.5} />
                    </button>

                    <form onSubmit={handleSubmit} className="flex-1 p-6 md:p-10 overflow-y-auto luxury-scrollbar max-h-[85vh]">
                        <div className="space-y-8">
                            {/* Section 1: Thông tin định danh (Horizontal focus) */}
                            <div>
                                <h3 className="text-[10px] font-black text-gold-muted uppercase tracking-[0.3em] flex items-center gap-3 mb-6">
                                    <div className="w-1.5 h-1.5 rounded-full bg-gold-muted"></div>
                                    Thông tin định danh & Liên hệ
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                                    <div className="md:col-span-12 lg:col-span-4">
                                        <label htmlFor="customer-name" className="block text-[9px] font-black text-text-soft/60 uppercase tracking-widest mb-1.5 ml-1">Họ và tên *</label>
                                        <div className="relative group">
                                            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gold-muted/40 group-focus-within:text-gold-muted" size={16} aria-hidden="true" />
                                            <input
                                                id="customer-name"
                                                type="text"
                                                required
                                                className="w-full pl-12 pr-4 py-4 bg-white border border-gold-light/30 rounded-xl focus:ring-4 focus:ring-gold-muted/5 focus:border-gold-muted/40 outline-none transition-all font-serif italic text-text-main text-base shadow-sm"
                                                placeholder="họ và tên khách hàng..."
                                                value={formData.fullName || ''}
                                                onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="md:col-span-6 lg:col-span-4">
                                        <label htmlFor="customer-phone" className="block text-[9px] font-black text-text-soft/60 uppercase tracking-widest mb-1.5 ml-1">Số điện thoại *</label>
                                        <div className="relative group">
                                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gold-muted/40 group-focus-within:text-gold-muted" size={15} aria-hidden="true" />
                                            <input
                                                id="customer-phone"
                                                type="tel"
                                                required
                                                className="w-full pl-12 pr-4 py-3 bg-white border border-gold-light/30 rounded-xl focus:ring-4 focus:ring-gold-muted/5 focus:border-gold-muted/40 outline-none transition-all font-serif italic text-text-main text-base shadow-sm"
                                                placeholder="số điện thoại..."
                                                value={formData.phone || ''}
                                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="md:col-span-6 lg:col-span-4">
                                        <label htmlFor="customer-email" className="block text-[9px] font-black text-text-soft/60 uppercase tracking-widest mb-1.5 ml-1">Email</label>
                                        <div className="relative group">
                                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gold-muted/40 group-focus-within:text-gold-muted" size={15} aria-hidden="true" />
                                            <input
                                                id="customer-email"
                                                type="email"
                                                className="w-full pl-12 pr-4 py-3 bg-white border border-gold-light/30 rounded-xl focus:ring-4 focus:ring-gold-muted/5 focus:border-gold-muted/40 outline-none transition-all font-serif italic text-text-main text-base shadow-sm"
                                                placeholder="email"
                                                value={formData.email || ''}
                                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Section 2: Đặc điểm & Hệ sinh thái (Horizontal focus) */}
                            <div>
                                <h3 className="text-[10px] font-black text-gold-muted uppercase tracking-[0.3em] flex items-center gap-3 mb-6">
                                    <div className="w-1.5 h-1.5 rounded-full bg-gold-muted"></div>
                                    Phân loại & Mạng xã hội
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                                    <div className="md:col-span-6 lg:col-span-4">
                                        <label className="block text-[9px] font-black text-text-soft/60 uppercase tracking-widest mb-1.5 ml-1">Giới tính</label>
                                        <div className="flex gap-1.5 p-1 bg-white border border-gold-light/30 rounded-xl shadow-sm h-[46px]">
                                            {['nam', 'nu', 'khac'].map((g) => (
                                                <button
                                                    key={g}
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, gender: g as any })}
                                                    className={`flex-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${formData.gender === g ? 'bg-text-main text-white shadow-md' : 'text-text-soft hover:bg-gold-light/10'
                                                        }`}
                                                >
                                                    {g === 'nam' ? 'Nam' : g === 'nu' ? 'Nữ' : 'Khác'}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="md:col-span-6 lg:col-span-4">
                                        <label htmlFor="customer-birthday" className="block text-[9px] font-black text-text-soft/60 uppercase tracking-widest mb-1.5 ml-1">Ngày sinh</label>
                                        <div className="relative group">
                                            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gold-muted/40 group-focus-within:text-gold-muted transition-colors pointer-events-none z-10" size={16} aria-hidden="true" />
                                            <input
                                                id="customer-birthday"
                                                type="text"
                                                placeholder="dd/mm/yyyy"
                                                maxLength={10}
                                                className="w-full pl-12 pr-4 py-3 bg-white border border-gold-light/30 rounded-xl focus:ring-4 focus:ring-gold-muted/5 focus:border-gold-muted/40 outline-none transition-all font-serif italic text-text-main text-sm shadow-sm"
                                                value={formData.birthday || ''}
                                                onChange={e => {
                                                    let val = e.target.value.replace(/\D/g, '');
                                                    if (val.length >= 3 && val.length <= 4) {
                                                        val = val.slice(0, 2) + '/' + val.slice(2);
                                                    } else if (val.length >= 5) {
                                                        val = val.slice(0, 2) + '/' + val.slice(2, 4) + '/' + val.slice(4, 8);
                                                    }
                                                    setFormData({ ...formData, birthday: val });
                                                }}
                                            />
                                        </div>
                                    </div>

                                    <div className="md:col-span-6 lg:col-span-2">
                                        <label htmlFor="customer-facebook" className="block text-[9px] font-black text-text-soft/60 uppercase tracking-widest mb-1.5 ml-1">Facebook</label>
                                        <div className="relative group">
                                            <Facebook className="absolute left-4 top-1/2 -translate-y-1/2 text-[#1877F2]" size={15} aria-hidden="true" />
                                            <input
                                                id="customer-facebook"
                                                type="text"
                                                className="w-full pl-11 pr-4 py-3 bg-white border border-gold-light/30 rounded-xl focus:ring-4 focus:ring-gold-muted/5 focus:border-gold-muted/40 outline-none transition-all font-serif italic text-text-main text-sm shadow-sm"
                                                placeholder="link Fb"
                                                value={formData.facebook || ''}
                                                onChange={e => setFormData({ ...formData, facebook: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="md:col-span-6 lg:col-span-2">
                                        <label htmlFor="customer-zalo" className="block text-[9px] font-black text-text-soft/60 uppercase tracking-widest mb-1.5 ml-1">Số Zalo</label>
                                        <div className="relative group">
                                            <MessageSquare className="absolute left-4 top-1/2 -translate-y-1/2 text-[#0068FF]" size={15} aria-hidden="true" />
                                            <input
                                                id="customer-zalo"
                                                type="text"
                                                className="w-full pl-11 pr-4 py-3 bg-white border border-gold-light/30 rounded-xl focus:ring-4 focus:ring-gold-muted/5 focus:border-gold-muted/40 outline-none transition-all font-serif italic text-text-main text-sm shadow-sm"
                                                placeholder="số Zalo"
                                                value={formData.zalo || ''}
                                                onChange={e => setFormData({ ...formData, zalo: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Section 3: Địa điểm & Ghi chú (Horizontal layout for inputs) */}
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-6 border-t border-gold-muted/10">
                                <div className="lg:col-span-7 space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <div className="md:col-span-1">
                                            <label htmlFor="customer-branch" className="block text-[9px] font-black text-text-soft/60 uppercase tracking-widest mb-1.5 ml-1">Chi nhánh quản lý *</label>
                                            <div className="relative group">
                                                <Home className="absolute left-4 top-1/2 -translate-y-1/2 text-gold-muted/40" size={16} aria-hidden="true" />
                                                <select
                                                    id="customer-branch"
                                                    required
                                                    className="w-full pl-12 pr-10 py-3 bg-white border border-gold-light/30 rounded-xl focus:ring-4 focus:ring-gold-muted/5 focus:border-gold-muted/40 outline-none transition-all font-serif italic text-text-main text-base appearance-none cursor-pointer shadow-sm"
                                                    value={formData.branchId || ''}
                                                    onChange={e => setFormData({ ...formData, branchId: e.target.value })}
                                                >
                                                    <option value="" disabled className="not-serif">Chọn chi nhánh</option>
                                                    {branches.filter(b => b.type === 'spa' && !b.isHeadquarter).map(b => (
                                                        <option key={b.id} value={b.id} className="not-serif">{b.name}</option>
                                                    ))}
                                                </select>
                                                <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 text-gold-muted/30 rotate-90" size={14} strokeWidth={2} aria-hidden="true" />
                                            </div>
                                        </div>
                                        <div className="md:col-span-1">
                                            <label className="block text-[9px] font-black text-text-soft/60 uppercase tracking-widest mb-1.5 ml-1">Đặc quyền</label>
                                            <button
                                                type="button"
                                                onClick={() => setFormData({ ...formData, isVip: !formData.isVip })}
                                                className={`flex items-center w-full h-[46px] px-4 rounded-xl font-bold text-xs uppercase tracking-widest transition-all border ${formData.isVip
                                                    ? 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20'
                                                    : 'bg-gold-muted/5 border-gold-muted/10 text-gold-muted/40 opacity-50'
                                                    }`}
                                            >
                                                <Sparkles size={14} className={`mr-2 ${formData.isVip ? 'animate-pulse' : ''}`} />
                                                {formData.isVip ? 'KHÁCH HÀNG VIP' : 'Gán thẻ VIP'}
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label htmlFor="customer-address" className="block text-[9px] font-black text-text-soft/60 uppercase tracking-widest mb-1.5 ml-1">Địa chỉ cư trú (Long Text)</label>
                                        <div className="relative group">
                                            <MapPin className="absolute left-4 top-4 text-gold-muted/40 group-focus-within:text-gold-muted transition-colors" size={18} aria-hidden="true" />
                                            <textarea
                                                id="customer-address"
                                                rows={3}
                                                className="w-full pl-12 pr-4 py-4 bg-white border border-gold-light/30 rounded-2xl focus:ring-4 focus:ring-gold-muted/5 focus:border-gold-muted/40 outline-none transition-all font-serif italic text-text-main text-base resize-none shadow-sm min-h-[100px]"
                                                placeholder="Nhập địa chỉ chi tiết: Số nhà, đường, phường, quận..."
                                                value={formData.address || ''}
                                                onChange={e => setFormData({ ...formData, address: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="lg:col-span-5">
                                    <label htmlFor="customer-notes" className="block text-[9px] font-black text-text-soft/60 uppercase tracking-widest mb-1.5 ml-1">Ghi chú chuyên môn</label>
                                    <div className="relative group h-[calc(100%-25px)]">
                                        <ClipboardList className="absolute left-4 top-4 text-gold-muted/40 group-focus-within:text-gold-muted transition-colors" size={18} aria-hidden="true" />
                                        <textarea
                                            id="customer-notes"
                                            className="w-full pl-12 pr-4 py-4 bg-white border border-gold-light/30 rounded-[30px] focus:ring-4 focus:ring-gold-muted/5 focus:border-gold-muted/40 outline-none transition-all font-serif italic text-text-main text-base shadow-inner resize-none h-full min-h-[160px]"
                                            placeholder="Ghi nhận tiền sử da, thói quen chăm sóc, sở thích dịch vụ..."
                                            value={formData.professionalNotes || ''}
                                            onChange={e => setFormData({ ...formData, professionalNotes: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </form>

                    {/* Footer Actions */}
                    <div className="px-6 py-8 md:px-10 md:py-8 border-t border-gold-muted/10 bg-white/50 backdrop-blur-md flex justify-end gap-4 shrink-0">
                        <button
                            type="button"
                            onClick={handleCloseInternal}
                            className="px-7 py-3 bg-white border border-gold-light/30 rounded-xl text-[9px] font-black uppercase tracking-widest text-text-soft hover:text-text-main hover:border-gold-muted/40 transition-all active:scale-95 shadow-sm"
                        >
                            Hủy
                        </button>
                        <button
                            onClick={handleSubmit}
                            className="px-10 py-3 bg-text-main text-white rounded-xl text-[9px] font-black uppercase tracking-[0.2em] shadow-luxury hover:bg-gold-muted transition-all active:scale-95 flex items-center gap-2"
                        >
                            <CheckCircle2 size={15} />
                            Lưu hồ sơ
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CustomerFormModal;
