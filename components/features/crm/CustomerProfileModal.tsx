import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '@/lib/auth';
import { Customer, CustomerRank, User, RoleDefinition, Branch, Appointment } from '@/lib/types';
import {
    CalendarDays,
    Clock,
    MapPin,
    ClipboardList,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Sparkles,
    User as UserIcon,
    Flower,
    Calendar,
    History,
    Wallet,
    MessageSquare,
    Edit3,
    X,
    Cake,
    Phone,
    Mail,
    Fingerprint,
    TrendingUp,
    Zap,
    Facebook,
    Users,
    Mars,
    Venus,
    Rainbow,
    QrCode,
    Copy,
    ExternalLink,
    Loader2
} from 'lucide-react';
import { getCustomerDossier } from '@/lib/services/customerDossier';
import RankAvatar from './RankAvatar';

interface CustomerProfileModalProps {
    customer: Customer;
    onClose: () => void;
    onNavigate: (tab: string) => void;
    onEdit: () => void;
    currentUser: User;
    roles?: RoleDefinition[];
    branches: Branch[];
    appointments?: Appointment[];
    onUpdateTreatmentCard?: (customerId: string, updatedCard: any) => void;
    onDeleteTreatmentCard?: (customerId: string, cardId: string) => void;
}

const CustomerProfileModal: React.FC<CustomerProfileModalProps> = ({
    customer,
    onClose,
    onNavigate,
    onEdit,
    currentUser,
    branches,
    onUpdateTreatmentCard,
    onDeleteTreatmentCard,
    appointments = []
}) => {
    const { state, saveState } = useApp();
    const [activeTab, setActiveTab] = useState('tổng quan');
    const [showQrModal, setShowQrModal] = useState(false);
    const [copySuccess, setCopySuccess] = useState(false);
    const [loadingDossier, setLoadingDossier] = useState(false);
    const [dossier, setDossier] = useState<{
        customer: any;
        serviceOrders: any[];
        treatmentCards: any[];
        appointments: any[];
    } | null>(null);

    const [payingOrder, setPayingOrder] = useState<any | null>(null);
    const [payAmount, setPayAmount] = useState<number>(0);
    const [payMethod, setPayMethod] = useState<'cash' | 'bank' | 'wallet'>('cash');
    const [payDate, setPayDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [isSavingPayment, setIsSavingPayment] = useState(false);

    const currentMonth = new Date().getMonth();
    const activeCustomer = useMemo(() => dossier?.customer || customer, [dossier?.customer, customer]);
    const isBirthdayMonth = activeCustomer.birthday && new Date(activeCustomer.birthday).getMonth() === currentMonth;

    // Fetch Dossier
    useEffect(() => {
        if (customer.id) {
            setLoadingDossier(true);
            getCustomerDossier(String(customer.id))
                .then(data => {
                    if (data) setDossier(data);
                })
                .finally(() => setLoadingDossier(false));
        }
    }, [customer.id]);

    // Financial Summary Derived from Dossier (Fallback if customer record is stale)
    const derivedStats = useMemo(() => {
        if (!dossier?.serviceOrders) return { totalSpent: activeCustomer.totalSpent || 0, totalDebt: 0, walletBalance: activeCustomer.walletBalance || 0 };

        const orders = dossier.serviceOrders;
        // Only count 'confirmed' or 'completed' for spent/wallet
        const validOrders = orders.filter((o: any) => o.status === 'confirmed' || o.status === 'completed');

        const calcSpent = validOrders.reduce((sum: number, o: any) => sum + (o.actual_amount || o.actualAmount || 0), 0);
        const calcDebt = orders.reduce((sum: number, o: any) => sum + (o.debt_amount || o.debtAmount || 0), 0);

        // Wallet top-ups from line items
        let calcWallet = 0;
        validOrders.forEach((order: any) => {
            (order.line_items || order.lineItems || []).forEach((item: any) => {
                if (item.serviceType === 'card') {
                    calcWallet += (item.cardWalletValue || item.price || 0);
                }
            });
        });

        return {
            totalSpent: Math.max(activeCustomer.totalSpent || 0, calcSpent),
            totalDebt: calcDebt,
            walletBalance: Math.max(activeCustomer.walletBalance || 0, calcWallet)
        };
    }, [dossier?.serviceOrders, activeCustomer.totalSpent, activeCustomer.walletBalance]);

    // Rank Progress Calculation
    const rankProgress = useMemo(() => {
        const tiers = [...(state.membershipTiers || [])].sort((a, b) => a.minSpend - b.minSpend);
        if (tiers.length === 0) return { percent: 100, nextTierName: null, minForNext: 0 };

        const currentTierIndex = tiers.findIndex(t => {
            return (derivedStats.totalSpent) < (t.minSpend || 0);
        });

        const currentTierIdx = currentTierIndex === -1 ? tiers.length - 1 : currentTierIndex - 1;
        const nextTier = currentTierIdx + 1 < tiers.length ? tiers[currentTierIdx + 1] : null;

        if (!nextTier || !nextTier.minSpend) return { percent: 100, nextTierName: null, minForNext: 0 };

        const min = currentTierIdx >= 0 ? (tiers[currentTierIdx].minSpend || 0) : 0;
        const max = nextTier.minSpend;

        if (max <= min) return { percent: 100, nextTierName: nextTier.name, minForNext: max };
        const progress = ((derivedStats.totalSpent - min) / (max - min)) * 100;
        return { percent: progress, nextTierName: nextTier.name, minForNext: max };
    }, [state.membershipTiers, derivedStats.totalSpent]);

    const handlePayDebt = async () => {
        if (!payingOrder || payAmount <= 0) return;
        
        setIsSavingPayment(true);
        try {
            const paymentId = 'pay-' + Math.random().toString(36).slice(2, 10);
            const newPayment = {
                id: paymentId,
                method: payMethod,
                amount: payAmount,
                date: new Date(payDate).toISOString(),
                note: 'Khách trả nợ phiếu ' + payingOrder.code
            };

            const updatedPayments = [...(payingOrder.payments || []), newPayment];
            const updatedActual = (payingOrder.actualAmount || payingOrder.actual_amount || 0) + payAmount;
            const updatedDebt = Math.max(0, (payingOrder.totalAmount || 0) - updatedActual);

            const updatedOrder = {
                ...payingOrder,
                payments: updatedPayments,
                actualAmount: updatedActual,
                debtAmount: updatedDebt,
                updatedAt: new Date().toISOString()
            };

            // Using saveServiceOrder from storage (already available in storage.ts)
            const { saveServiceOrder } = await import('@/lib/storage');
            saveState(saveServiceOrder(updatedOrder));
            
            // Reload dossier to reflect changes
            const data = await getCustomerDossier(String(customer.id));
            if (data) setDossier(data);

            setPayingOrder(null);
            setPayAmount(0);
        } catch (error) {
            console.error('Error saving debt payment:', error);
        } finally {
            setIsSavingPayment(false);
        }
    };

    // Standardize ID: branchCode_xxxxxx_xxxx
    const branch = branches.find(b => b.id === activeCustomer.branchId);
    const branchCode = branch?.code || 'HQ';
    const customerIdStr = String(activeCustomer.id);
    const formattedId = `${branchCode}_${customerIdStr.replace(/-/g, '').slice(0, 8)}_${customerIdStr.slice(-4)}`;

    const tabs = [
        { id: 'tổng quan', label: 'Thông tin', icon: UserIcon },
        { id: 'phiếu dịch vụ', label: 'Phiếu dịch vụ', icon: ClipboardList },
        { id: 'liệu trình', label: 'Các gói Dịch Vụ', icon: Flower },
        { id: 'lịch hẹn', label: 'Lịch hẹn', icon: Calendar },
        { id: 'điều trị', label: 'Lịch Sử điều trị', icon: History },
        { id: 'thanh toán', label: 'Tài chính & Công nợ', icon: Wallet },
        { id: 'tương tác', label: 'CSKH', icon: MessageSquare },
    ];

    const allAppointments = useMemo(() => {
        const merged = [...(appointments || []), ...(dossier?.appointments || [])];
        // Remove duplicates by ID
        const unique = Array.from(new Map(merged.map(a => [a.id, a])).values());
        return unique.filter(a => String(a.customerId || '') == String(activeCustomer.id))
            .sort((a, b) => {
                const dateA = `${a.appointmentDate}T${a.appointmentTime || '00:00'}`
                const dateB = `${b.appointmentDate}T${b.appointmentTime || '00:00'}`
                return new Date(dateB).getTime() - new Date(dateA).getTime()
            });
    }, [appointments, dossier?.appointments, activeCustomer.id]);

    const customerAppointments = allAppointments;

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    const upcomingAppointments = customerAppointments.filter(a => {
        const isFutureDate = a.appointmentDate >= todayStr;
        const isActiveStatus = ['pending', 'confirmed'].includes(a.status);
        return isFutureDate && isActiveStatus;
    }).reverse(); // Show soonest first

    const historyAppointments = customerAppointments.filter(a => {
        const isPastDate = a.appointmentDate < todayStr;
        const isClosedStatus = ['arrived', 'completed', 'cancelled', 'no_show'].includes(a.status);
        return isPastDate || isClosedStatus;
    });

    const getStatusConfig = (status: string) => {
        switch (status) {
            case 'pending': return { label: 'Chờ xác nhận', color: 'text-amber-600 bg-amber-50 border-amber-100', icon: Clock };
            case 'confirmed': return { label: 'Đã xác nhận', color: 'text-blue-600 bg-blue-50 border-blue-100', icon: CalendarDays };
            case 'arrived': return { label: 'Đã đến', color: 'text-emerald-600 bg-emerald-50 border-emerald-100', icon: CheckCircle2 };
            case 'completed': return { label: 'Hoàn thành', color: 'text-indigo-600 bg-indigo-50 border-indigo-100', icon: Sparkles };
            case 'cancelled': return { label: 'Đã hủy', color: 'text-rose-600 bg-rose-50 border-rose-100', icon: XCircle };
            case 'no_show': return { label: 'Vắng mặt', color: 'text-gray-500 bg-gray-50 border-gray-100', icon: AlertCircle };
            default: return { label: status, color: 'text-gray-600 bg-gray-50 border-gray-100', icon: ClipboardList };
        }
    }

    const calculateAge = (birthday: string | undefined): number | null => {
        if (!birthday) return null;
        try {
            const birthDate = new Date(birthday);
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }
            return age;
        } catch (e) {
            return null;
        }
    };

    const formatBirthday = (birthday: string | undefined): string => {
        if (!birthday) return '--/--/----';
        try {
            // Assume YYYY-MM-DD
            const parts = birthday.split('-');
            if (parts.length === 3) {
                const [y, m, d] = parts;
                return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
            }
            return birthday; // Fallback
        } catch (e) {
            return '--/--/----';
        }
    };

    return (
        <div
            className="fixed inset-0 md:left-[var(--sidebar-width,280px)] md:w-[calc(100%-var(--sidebar-width,280px))] z-[9999] bg-black/60 backdrop-blur-md animate-fade-in flex items-center justify-center p-2 sm:p-4 md:p-6 lg:p-10 cursor-pointer"
            onClick={onClose}
        >
            <div
                className="bg-white w-full max-w-[1800px] h-[92vh] rounded-[24px] md:rounded-[40px] shadow-2xl flex flex-col animate-modal-up relative border border-white/20 cursor-default overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Actions Top-Right - Fixed Position */}
                <div className="absolute top-4 right-4 md:top-6 md:right-8 flex items-center gap-2 md:gap-4 z-[120]">
                    <button
                        onClick={(e) => { e.stopPropagation(); setShowQrModal(true); }}
                        className="h-10 px-4 md:h-11 md:px-6 rounded-2xl bg-gold-muted text-text-main flex items-center justify-center gap-2 transition-all backdrop-blur-lg border border-white/20 active:scale-95 group shadow-lg font-black text-[10px] md:text-[12px] uppercase tracking-widest"
                    >
                        <QrCode size={18} className="md:w-5 md:h-5 text-text-main" />
                        <span className="hidden sm:inline">QR Theo dõi</span>
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onEdit(); }}
                        className="w-10 h-10 md:w-11 md:h-11 rounded-2xl bg-black/20 hover:bg-black/40 text-white flex items-center justify-center transition-all backdrop-blur-lg border border-white/20 active:scale-90 group shadow-lg"
                    >
                        <Edit3 size={18} className="group-hover:text-gold-muted transition-colors md:w-5 md:h-5" />
                    </button>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 md:w-11 md:h-11 rounded-2xl bg-black/20 hover:bg-black/40 text-white flex items-center justify-center transition-all backdrop-blur-lg border border-white/20 active:scale-90 group shadow-lg"
                    >
                        <X size={18} className="group-hover:text-rose-400 transition-colors md:w-5 md:h-5" />
                    </button>
                </div>

                {/* Scrollable Content Area */}
                <div className="flex-1 overflow-y-auto luxury-scrollbar relative bg-beige-soft/10 pb-10">
                    {/* Header Luxury Background - More Compact */}
                    <div className="h-32 md:h-48 bg-text-main shrink-0 overflow-hidden relative border-b border-gold-muted/20">
                        <div className="absolute inset-0 opacity-20" style={{ background: 'radial-gradient(circle at 20% 150%, #C5A059, transparent), radial-gradient(circle at 80% -50%, #F2EBE1, transparent)' }}></div>
                    </div>

                    <div className="px-4 md:px-12 -mt-16 md:-mt-24 relative z-[130]">
                        {/* Premium Information Box - Refined Compact Style */}
                        <div className="bg-[#FAF7F2]/95 backdrop-blur-xl border-2 border-dashed border-gold-muted/40 rounded-[28px] md:rounded-[40px] p-4 md:p-8 shadow-luxury-lg flex flex-col items-center xl:items-start xl:flex-row gap-6 xl:gap-10 transition-all hover:border-gold-muted/60 group">
                            {/* Avatar Container */}
                            <div className="relative shrink-0">
                                <div className="relative group/avatar">
                                    <RankAvatar
                                        src={activeCustomer.avatar || `https://ui-avatars.com/api/?name=${activeCustomer.fullName}&background=FAF7F2&color=C5A059&size=200&bold=true`}
                                        rank={activeCustomer.rank}
                                        size={140}
                                    />

                                    {/* Status Glow */}
                                    <div className="absolute bottom-6 right-6 w-8 h-8 rounded-full bg-emerald-500 border-4 border-white shadow-lg z-20 animate-pulse"></div>

                                    {/* VIP Badge image - Perfectly positioned overlapping the frame */}
                                    {activeCustomer.isVip && (
                                        <div className="absolute top-full left-1/2 -translate-x-1/2 -translate-y-1/2 z-[150] w-32 h-32 md:w-40 md:h-40 flex items-center justify-center">
                                            <img
                                                src="/images/vip-badge-luxury.png"
                                                alt="VIP"
                                                className="w-full h-full object-contain animate-bounce-slow"
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Golden Frame Accent */}
                                <div className="absolute -inset-4 border border-gold-muted/20 rounded-[58px] z-0 opacity-50 group-hover:inset-0 transition-all duration-700 animate-pulse-slow"></div>
                                {isBirthdayMonth && (
                                    <div className="absolute -top-10 -left-10 w-24 h-24 bg-gradient-to-br from-rose-400 to-rose-600 text-white rounded-[32px] shadow-luxury border-4 border-white flex items-center justify-center animate-bounce z-[50]">
                                        <Cake size={40} strokeWidth={2.5} />
                                    </div>
                                )}
                            </div>

                            {/* Details Container */}
                            <div className="flex-1 flex flex-col gap-2 w-full">
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-6 justify-center xl:justify-start">
                                        <h1 className="text-3xl sm:text-4xl md:text-5xl xl:text-6xl font-serif font-black text-text-main tracking-tighter drop-shadow-sm group-hover:text-gold-muted transition-all duration-500 italic pb-2 break-words">
                                            {activeCustomer.fullName}
                                        </h1>

                                        {/* Art Gender Icon - Next to Name */}
                                        <div className="shrink-0">
                                            {activeCustomer.gender === 'nam' ? (
                                                <div
                                                    className="text-blue-300 transition-all duration-700"
                                                    style={{
                                                        filter: 'drop-shadow(0 0 15px rgba(147,197,253,0.8))',
                                                        animation: 'waving-hand 2s ease-in-out infinite'
                                                    }}
                                                >
                                                    <Mars size={48} strokeWidth={3} />
                                                </div>
                                            ) : activeCustomer.gender === 'nu' ? (
                                                <div
                                                    className="text-pink-400 transition-all duration-700"
                                                    style={{
                                                        filter: 'drop-shadow(0 0 15px rgba(244,114,182,0.8))',
                                                        animation: 'swinging-icon 3s ease-in-out infinite'
                                                    }}
                                                >
                                                    <Venus size={48} strokeWidth={3} />
                                                </div>
                                            ) : (
                                                <div
                                                    className="text-amber-500 transition-all duration-700"
                                                    style={{
                                                        filter: 'drop-shadow(0 0 20px rgba(245,158,11,0.8))',
                                                        animation: 'swinging-icon 3s ease-in-out infinite'
                                                    }}
                                                >
                                                    <Rainbow size={32} strokeWidth={3} className="md:w-12 md:h-12" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <style jsx>{`
                                        @keyframes waving-hand {
                                            0%, 100% { transform: rotate(-5deg); }
                                            50% { transform: rotate(20deg); }
                                        }
                                        @keyframes swinging-icon {
                                            0%, 100% { transform: rotate(-10deg); transform-origin: top center; }
                                            50% { transform: rotate(10deg); transform-origin: top center; }
                                        }
                                        @keyframes spinning-circle {
                                            from { transform: rotate(0deg); }
                                            to { transform: rotate(360deg); }
                                        }
                                    `}</style>

                                <div className="flex flex-wrap items-center gap-4">
                                    {/* ID Badge - Refined Gold Style */}
                                    <div className="flex items-center gap-3 text-gold-muted text-[11px] font-black uppercase tracking-widest bg-gold-muted/5 px-6 py-3 rounded-2xl border border-gold-muted/20 shadow-sm">
                                        <Fingerprint size={16} strokeWidth={3} />
                                        <span>{formattedId}</span>
                                    </div>

                                    {/* Removed standalone rank badge */}
                                </div>

                                {/* Contact Strip - Consistent Gold Theme - Tightened top spacing */}
                                <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-gold-muted/10">
                                    <div className="flex items-center gap-3 bg-white px-6 py-3 rounded-2xl border border-gold-muted/10 text-gold-muted shadow-sm hover:border-gold-muted/30 transition-all">
                                        <Phone size={16} strokeWidth={2.5} />
                                        <span className="text-[15px] font-black tracking-tight">{activeCustomer.phone}</span>
                                    </div>

                                    <div className="flex items-center gap-3 bg-white px-6 py-3 rounded-2xl border border-gold-muted/10 text-gold-muted shadow-sm hover:border-gold-muted/30 transition-all">
                                        <Calendar size={16} strokeWidth={2.5} />
                                        <span className="text-[15px] font-black tracking-tight">{formatBirthday(activeCustomer.birthday)}</span>
                                        {calculateAge(activeCustomer.birthday) && (
                                            <span className="bg-gold-muted/10 text-gold-muted text-[10px] font-black px-3 py-1 rounded-xl ml-1 border border-gold-muted/20">
                                                {calculateAge(activeCustomer.birthday)} TUỔI
                                            </span>
                                        )}
                                    </div>
                                    {activeCustomer.zalo && (
                                        <a
                                            href={`https://zalo.me/${activeCustomer.zalo.replace(/\D/g, '') || activeCustomer.phone.replace(/\D/g, '')}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center justify-center w-12 h-12 bg-white rounded-2xl border border-gold-muted/10 text-sky-500 hover:bg-sky-50 transition-all shadow-sm hover:scale-110 active:scale-95 cursor-pointer"
                                            title="Mở Zalo"
                                        >
                                            <MessageSquare size={20} fill="currentColor" className="opacity-20" />
                                            <span className="absolute font-black text-[9px]">Z</span>
                                        </a>
                                    )}

                                    {activeCustomer.facebook && (
                                        <a
                                            href={activeCustomer.facebook.startsWith('http') ? activeCustomer.facebook : `https://facebook.com/${activeCustomer.facebook}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center justify-center w-12 h-12 bg-white rounded-2xl border border-gold-muted/10 text-blue-600 hover:bg-blue-50 transition-all shadow-sm hover:scale-110 active:scale-95 cursor-pointer"
                                            title="Mở Facebook"
                                        >
                                            <Facebook size={20} />
                                        </a>
                                    )}
                                </div>

                                {/* Last Visit Info */}
                                <div className="flex items-center gap-3 mt-1 px-4">
                                    <div className="flex items-center gap-2 text-gold-muted/60">
                                        <div className="w-1.5 h-1.5 rounded-full bg-gold-muted/40 animate-pulse"></div>
                                        <span className="text-[11px] font-black uppercase tracking-widest italic">
                                            Lần cuối đến Xinh:  {activeCustomer.lastVisit && activeCustomer.lastVisit !== 'Chưa có' ?
                                                (activeCustomer.lastVisit.includes('-') ? activeCustomer.lastVisit.split('-').reverse().join('-') : activeCustomer.lastVisit)
                                                : 'chưa có dữ liệu'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Layout: Full Width Tabbed Content - Now inside the same scroll container! */}
                    <div className="mt-8 md:mt-12 space-y-6 relative z-[140]">
                        {/* Navigation Tabs - Luxury Minimalist */}
                        <div className="flex flex-wrap md:flex-nowrap justify-center gap-1 md:gap-2 p-2 bg-beige-soft/80 rounded-[28px] md:rounded-[32px] border border-gold-light/20 sticky top-2 z-20 backdrop-blur-xl shadow-luxury max-w-full md:max-w-fit mx-2 md:mx-auto">
                            {tabs.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex flex-row items-center justify-center gap-2 py-3 px-4 md:py-4 md:px-8 rounded-[20px] md:rounded-[24px] text-[10px] md:text-[12px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id
                                        ? 'bg-text-main text-white shadow-xl scale-[1.05]'
                                        : 'text-text-soft hover:text-gold-muted hover:bg-white'
                                        }`}
                                >
                                    <tab.icon size={16} strokeWidth={2.5} className="md:w-[18px] md:h-[18px]" />
                                    <span className="inline-block md:inline-block">{tab.label}</span>
                                </button>
                            ))}
                        </div>

                        {/* Tab Content */}
                        <div className="min-h-[400px] px-6 md:px-10 pb-16">
                            {activeTab === 'tổng quan' && (
                                <div className="space-y-12 animate-fade-in">
                                    {/* Finance Section */}
                                    <section>
                                        <div className="flex items-center gap-3 mb-8 sticky top-16 bg-transparent z-10">
                                            <div className="w-12 h-12 rounded-2xl bg-gold-muted/10 text-gold-muted flex items-center justify-center shadow-sm">
                                                <Wallet size={24} />
                                            </div>
                                            <div className="bg-white/60 backdrop-blur-sm px-6 py-2 rounded-2xl flex flex-col border border-gold-muted/5">
                                                <h3 className="text-base font-black text-gray-900 uppercase tracking-widest leading-none">
                                                    Tài chính & Chi tiêu
                                                </h3>
                                                <p className="text-[9px] font-black text-text-soft uppercase tracking-widest mt-1 opacity-60">Thống kê tài chính khách hàng</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                                            {/* Spending Card - Professional Luxury Card */}
                                            <div className="xl:col-span-1">
                                                <div className="bg-text-main p-8 md:p-10 rounded-[32px] md:rounded-[40px] text-white shadow-luxury relative overflow-hidden group h-full">
                                                    <div className="absolute -top-20 -right-20 w-64 h-64 bg-gold-muted/10 rounded-full blur-3xl group-hover:scale-125 transition-transform duration-1000"></div>
                                                    <div className="absolute bottom-0 right-0 p-8 opacity-5">
                                                        <TrendingUp size={160} strokeWidth={1} />
                                                    </div>

                                                    <div className="relative z-10 flex flex-col h-full">
                                                        <div className="flex justify-between items-start mb-10">
                                                            <div>
                                                                <p className="text-[10px] text-white/40 font-black uppercase tracking-[0.3em] mb-2">Tài chính</p>
                                                                <h3 className="text-lg font-serif italic text-gold-muted">Hồ sơ chi tiêu</h3>
                                                            </div>
                                                            <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-gold-muted border border-white/10 shadow-inner">
                                                                <Wallet size={28} strokeWidth={1.5} />
                                                            </div>
                                                        </div>

                                                        <div className="space-y-8 flex-1">
                                                            <div>
                                                                <p className="text-[10px] text-white/40 font-black uppercase tracking-[0.2em] mb-2 opacity-60">Tổng chi tiêu</p>
                                                                <p className="text-3xl md:text-5xl font-serif font-black text-white italic tracking-tighter">
                                                                    {(activeCustomer.totalSpent || 0).toLocaleString('vi-VN')}
                                                                    <span className="text-xl ml-2 font-sans font-normal opacity-30 not-italic">VNĐ</span>
                                                                </p>
                                                            </div>

                                                            <div className="grid grid-cols-2 gap-10">
                                                                <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                                                                    <p className="text-[10px] text-white/40 font-black uppercase tracking-[0.2em] mb-2">Loyalty Points</p>
                                                                    <div className="flex items-center gap-2">
                                                                        <Sparkles size={14} className="text-gold-muted" />
                                                                        <span className="text-[18px] font-black text-white">{(activeCustomer.points || 0).toLocaleString()}</span>
                                                                    </div>
                                                                </div>
                                                                <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                                                                    <p className="text-[10px] text-white/40 font-black uppercase tracking-[0.2em] mb-2">Số dư ví (Thẻ tiền nạp)</p>
                                                                    <span className="text-[18px] font-black text-white italic">{(activeCustomer.walletBalance || 0).toLocaleString()}đ</span>
                                                                </div>
                                                                <div className="bg-white/5 p-4 rounded-2xl border border-white/5 col-span-2 text-center mt-[-1rem]">
                                                                    <p className="text-[10px] text-white/40 font-black uppercase tracking-[0.2em] mb-2">Lần cuối ghé</p>
                                                                    <p className="text-[14px] font-black text-white italic">{activeCustomer.lastVisit || 'Chưa có'}</p>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="mt-12 pt-6 border-t border-white/10">
                                                            <div className="flex justify-between items-end mb-4">
                                                                <span className="text-[10px] text-white/40 font-black uppercase tracking-[0.2em]">Hạng thành viên</span>
                                                                <span className="text-[10px] font-black text-gold-muted tracking-widest uppercase">
                                                                    {rankProgress.nextTierName ? `LÊN ${rankProgress.nextTierName}: ${Math.round(rankProgress.percent)}%` : 'HẠNG TỐI ĐA'}
                                                                </span>
                                                            </div>
                                                            <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                                                                <div className="h-full bg-gold-muted shadow-[0_0_20px_rgba(197,160,89,0.5)] rounded-full transition-all duration-1000" style={{ width: `${rankProgress.percent}%` }}></div>
                                                            </div>
                                                            {rankProgress.nextTierName && (
                                                                <p className="text-[9px] text-white/30 font-bold uppercase mt-3 tracking-wider">
                                                                    Còn thiếu {(rankProgress.minForNext - activeCustomer.totalSpent).toLocaleString()}đ để thăng hạng
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Notes Card */}
                                            <div className="xl:col-span-1">
                                                <div className="bg-[#FAF8F6] border border-gold-muted/10 rounded-[32px] md:rounded-[40px] p-8 md:p-10 relative overflow-hidden flex flex-col shadow-inner h-full min-h-[350px]">
                                                    <div className="flex items-center gap-3 mb-8">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-gold-muted"></div>
                                                        <h3 className="text-[11px] font-black text-gold-muted uppercase tracking-[0.3em]">
                                                            Ghi chú từ chuyên gia
                                                        </h3>
                                                    </div>
                                                    <div className="absolute top-0 right-0 w-40 h-40 bg-gold-muted/5 rounded-full translate-x-10 -translate-y-10"></div>
                                                    <div className="absolute bottom-10 right-10 text-gold-muted/10">
                                                        <MessageSquare size={80} strokeWidth={1} />
                                                    </div>
                                                    <p className="text-[18px] md:text-[22px] text-text-main leading-relaxed font-serif italic relative z-10 flex-1 opacity-80 decoration-gold-muted/20 underline underline-offset-8">
                                                        "{activeCustomer.professionalNotes || 'Chưa có ghi chú chuyên sâu từ đội ngũ chuyên gia/KTV.'}"
                                                    </p>
                                                    <div className="mt-10 flex items-center gap-6">
                                                        <div className="flex -space-x-3">
                                                            {[1, 2, 3].map(i => (
                                                                <div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-gold-light/50 flex items-center justify-center text-[10px] font-bold text-gold-muted">K</div>
                                                            ))}
                                                        </div>
                                                        <div className="h-px flex-1 bg-gold-muted/10"></div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </section>
                                </div>
                            )}

                            {activeTab === 'phiếu dịch vụ' && (
                                <div className="space-y-8 animate-fade-in">
                                    <div className="flex justify-between items-center mb-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-gold-muted/10 text-gold-muted flex items-center justify-center shadow-sm">
                                                <ClipboardList size={20} />
                                            </div>
                                            <h3 className="text-base font-black text-gray-900 uppercase tracking-widest bg-white/40 backdrop-blur-sm px-4 py-2 rounded-xl">
                                                Danh sách Phiếu dịch vụ
                                            </h3>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-6">
                                        {loadingDossier ? (
                                            <div className="flex flex-col items-center justify-center py-20 bg-beige-soft/10 rounded-[40px] border border-dashed border-gold-muted/20">
                                                <Loader2 size={40} className="animate-spin text-gold-muted mb-4" />
                                                <p className="text-[10px] font-black uppercase tracking-widest text-gold-muted/60">Đang tải lịch sử phiếu...</p>
                                            </div>
                                        ) : dossier?.serviceOrders && dossier.serviceOrders.length > 0 ? (
                                            dossier.serviceOrders.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(order => (
                                                <div key={order.id} className="bg-white border border-gold-light/20 rounded-[32px] p-6 hover:border-gold-muted/50 transition-all hover:shadow-luxury group">
                                                    <div className="flex flex-col md:flex-row justify-between gap-6">
                                                        <div className="space-y-4 flex-1">
                                                            <div className="flex items-center gap-3">
                                                                <span className="px-3 py-1 bg-text-main text-white text-[10px] font-black rounded-lg uppercase tracking-widest">{order.code}</span>
                                                                <span className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border ${
                                                                    order.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                                    order.status === 'confirmed' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                                                    order.status === 'cancelled' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                                                    'bg-gray-50 text-gray-400 border-gray-100'
                                                                }`}>
                                                                    {order.status === 'completed' ? 'Hoàn thành' : 
                                                                     order.status === 'confirmed' ? 'Đã xác nhận' : 
                                                                     order.status === 'cancelled' ? 'Đã hủy' : order.status}
                                                                </span>
                                                                <span className="text-[10px] text-gray-400 font-bold">{new Date(order.createdAt).toLocaleDateString('vi-VN')}</span>
                                                            </div>
                                                            <div className="space-y-2">
                                                                {(order.lineItems || order.line_items || []).map((item: any, i: number) => (
                                                                    <div key={i} className="flex justify-between items-center text-sm border-b border-gray-50 pb-2 last:border-0 last:pb-0">
                                                                        <div className="flex flex-col">
                                                                            <span className="font-bold text-gray-900">{item.serviceName}</span>
                                                                            <span className="text-[10px] text-gray-400 uppercase font-black tracking-tight">{item.categoryName || 'Dịch vụ'}</span>
                                                                        </div>
                                                                        <span className="font-serif font-black text-text-main italic">{(item.price || 0).toLocaleString()}đ</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                        <div className="md:w-64 bg-beige-soft/30 rounded-2xl p-4 flex flex-col justify-center space-y-3 border border-gold-light/5">
                                                            <div className="flex justify-between items-center">
                                                                <span className="text-[10px] font-black text-text-soft uppercase tracking-widest opacity-60">Tổng cộng</span>
                                                                <span className="text-lg font-serif font-black text-text-main italic">{(order.totalAmount || 0).toLocaleString()}đ</span>
                                                            </div>
                                                            <div className="flex justify-between items-center">
                                                                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest opacity-60">Đã thu</span>
                                                                <span className="text-md font-serif font-black text-emerald-600 italic">{(order.actualAmount || order.actual_amount || 0).toLocaleString()}đ</span>
                                                            </div>
                                                            {(order.debtAmount > 0 || order.debt_amount > 0) && (
                                                                <div className="flex justify-between items-center pt-2 border-t border-rose-100">
                                                                    <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest">Còn nợ</span>
                                                                    <span className="text-lg font-serif font-black text-rose-600 italic">{((order.debtAmount || order.debt_amount || 0)).toLocaleString()}đ</span>
                                                                </div>
                                                            )}
                                                            {(order.debtAmount > 0 || order.debt_amount > 0) && (
                                                                <button
                                                                    onClick={() => {
                                                                        setPayingOrder(order);
                                                                        setPayAmount(order.debtAmount || order.debt_amount || 0);
                                                                    }}
                                                                    className="w-full mt-2 py-2 bg-rose-600 text-white text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-rose-700 transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
                                                                >
                                                                    <Wallet size={12} /> Thu nợ phiếu
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="py-20 text-center bg-beige-soft/10 rounded-[40px] border border-dashed border-gold-muted/20">
                                                <ClipboardList size={48} className="mx-auto text-gold-muted/20 mb-4" />
                                                <p className="text-[12px] font-black uppercase tracking-widest text-gold-muted/60">Chưa có phiếu dịch vụ nào</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'lịch hẹn' && (
                                <div className="space-y-10 animate-fade-in">
                                    {/* Upcoming Section */}
                                    <section>
                                        <div className="flex items-center gap-3 mb-6 sticky top-16 bg-transparent z-10">
                                            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shadow-sm">
                                                <CalendarDays size={20} />
                                            </div>
                                            <h3 className="text-base font-black text-gray-900 uppercase tracking-widest bg-white/40 backdrop-blur-sm px-4 py-2 rounded-xl">
                                                Lịch hẹn sắp tới
                                            </h3>
                                        </div>

                                        {upcomingAppointments.length > 0 ? (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                                {upcomingAppointments.map(apt => {
                                                    const config = getStatusConfig(apt.status);
                                                    const b = branches.find(b => b.id === apt.branchId);
                                                    return (
                                                        <div key={apt.id} className="bg-white border-2 border-primary/20 rounded-[28px] p-5 shadow-xl shadow-primary/5 hover:border-primary transition-all group">
                                                            <div className="flex justify-between items-start mb-4">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="p-3 bg-gray-50 rounded-2xl text-gray-900 group-hover:bg-primary group-hover:text-gray-900 transition-colors">
                                                                        <CalendarDays size={20} />
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-lg font-black text-gray-900">{new Date(apt.appointmentDate).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit' })}</p>
                                                                        <p className="text-sm font-bold text-gray-400">{apt.appointmentTime}</p>
                                                                    </div>
                                                                </div>
                                                                <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${config.color} flex items-center gap-1.5`}>
                                                                    <config.icon size={12} />
                                                                    {config.label}
                                                                </span>
                                                            </div>
                                                            <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-gray-50">
                                                                <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-tighter">
                                                                    <MapPin size={14} className="text-gray-300" />
                                                                    {b?.name || 'Vui lòng chọn chi nhánh'}
                                                                </div>
                                                                {apt.notes && (
                                                                    <div className="flex items-start gap-2 text-[11px] font-medium text-gray-400 bg-gray-50/50 p-2 rounded-xl border border-gray-100">
                                                                        <ClipboardList size={12} className="shrink-0 mt-0.5" />
                                                                        {apt.notes}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        ) : (
                                            <div className="bg-gray-50/50 p-10 rounded-[2.5rem] border border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-300">
                                                <CalendarDays size={40} className="mb-3 opacity-20" />
                                                <p className="text-sm font-black uppercase tracking-widest opacity-50">Không có lịch hẹn sắp tới</p>
                                                <button onClick={() => onNavigate('create_appointment')} className="mt-4 text-[10px] font-black text-indigo-600 bg-white px-6 py-2 rounded-xl shadow-sm border border-gray-100 hover:bg-indigo-50 transition-all uppercase tracking-widest">
                                                    Đặt lịch ngay
                                                </button>
                                            </div>
                                        )}
                                    </section>

                                    {/* History Section */}
                                    <section>
                                        <div className="flex items-center gap-3 mb-8 pt-10 border-t border-gold-light/20 sticky top-16 bg-transparent z-10">
                                            <div className="w-12 h-12 rounded-2xl bg-beige-soft/50 text-gold-muted flex items-center justify-center shadow-sm">
                                                <ClipboardList size={24} strokeWidth={1.5} />
                                            </div>
                                            <div className="bg-white/40 backdrop-blur-sm px-4 py-2 rounded-xl flex flex-col">
                                                <h3 className="text-base font-serif italic text-text-main leading-none">
                                                    Lịch Hẹn
                                                </h3>
                                                <p className="text-[9px] font-black text-text-soft uppercase tracking-widest opacity-60">Lịch sử lịch hẹn</p>
                                            </div>
                                        </div>
                                        <div className="bg-white rounded-[40px] border border-gold-light/20 shadow-luxury overflow-hidden">
                                            <div className="overflow-x-auto luxury-scrollbar">
                                                <table className="w-full text-left luxury-table border-collapse">
                                                    <thead>
                                                        <tr className="bg-beige-soft/30 border-b border-gold-light/10">
                                                            <th className="px-6 py-4 text-[10px] font-black text-text-soft uppercase tracking-widest">Thời gian</th>
                                                            <th className="px-6 py-4 text-[10px] font-black text-text-soft uppercase tracking-widest">Chi nhánh</th>
                                                            <th className="px-6 py-4 text-[10px] font-black text-text-soft uppercase tracking-widest">Trạng thái</th>
                                                            <th className="px-6 py-4 text-[10px] font-black text-text-soft uppercase tracking-widest">Ghi chú</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gold-light/5">
                                                        {historyAppointments.length > 0 ? (
                                                            historyAppointments.map(apt => {
                                                                const config = getStatusConfig(apt.status);
                                                                const b = branches.find(b => b.id === apt.branchId);
                                                                return (
                                                                    <tr key={apt.id} className="hover:bg-beige-soft/20 transition-colors group">
                                                                        <td className="px-6 py-4">
                                                                            <p className="text-[14px] font-serif font-black text-text-main tracking-tight group-hover:text-gold-muted transition-colors">{new Date(apt.appointmentDate).toLocaleDateString('vi-VN')}</p>
                                                                            <p className="text-[9px] font-black text-gold-muted uppercase tracking-widest opacity-60">{apt.appointmentTime}</p>
                                                                        </td>
                                                                        <td className="px-6 py-4">
                                                                            <div className="flex items-center gap-2">
                                                                                <MapPin size={11} className="text-gold-muted/50" />
                                                                                <p className="text-[11px] font-black text-text-main/70 uppercase tracking-wide">{b?.name || 'Hệ thống'}</p>
                                                                            </div>
                                                                        </td>
                                                                        <td className="px-6 py-4">
                                                                            <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border shadow-sm ${config.color} inline-flex items-center gap-1.5`}>
                                                                                <config.icon size={11} strokeWidth={2.5} />
                                                                                {config.label}
                                                                            </span>
                                                                        </td>
                                                                        <td className="px-6 py-4">
                                                                            <div className="flex items-start gap-2 max-w-xs">
                                                                                <MessageSquare size={12} className="text-gold-muted/30 mt-1 shrink-0" />
                                                                                <p className="text-[13px] text-text-soft leading-relaxed line-clamp-2">{apt.notes || 'Không có ghi chú.'}</p>
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                )
                                                            })
                                                        ) : (
                                                            <tr>
                                                                <td colSpan={4} className="px-10 py-32 text-center">
                                                                    <div className="flex flex-col items-center gap-4 opacity-20">
                                                                        <ClipboardList size={48} strokeWidth={1} />
                                                                        <p className="text-[12px] font-black text-text-soft uppercase tracking-[0.2em]">
                                                                            Khách hàng chưa có lịch sử cuộc hẹn
                                                                        </p>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </section>
                                </div>
                            )
                            }

                            {
                                activeTab === 'liệu trình' && (
                                    <div className="space-y-10 animate-fade-in">
                                        <section>
                                            <div className="flex justify-between items-center mb-8 sticky top-16 bg-transparent z-10 py-2">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shadow-sm">
                                                        <Flower size={20} />
                                                    </div>
                                                    <h3 className="text-base font-black text-gray-900 uppercase tracking-widest bg-white/40 backdrop-blur-sm px-4 py-2 rounded-xl">
                                                        Liệu trình & Dịch vụ
                                                    </h3>
                                                </div>
                                                <button
                                                    onClick={() => onNavigate('sales')}
                                                    className="px-6 py-2 bg-text-main text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-gold-muted transition-all shadow-lg active:scale-95"
                                                >
                                                    + Mua thêm dịch vụ
                                                </button>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                {loadingDossier ? (
                                                    <div className="lg:col-span-3 flex flex-col items-center justify-center py-20 bg-beige-soft/10 rounded-[40px] border border-dashed border-gold-muted/20">
                                                        <Loader2 size={40} className="animate-spin text-gold-muted mb-4" />
                                                        <p className="text-[10px] font-black uppercase tracking-widest text-gold-muted/60">Đang tải dữ liệu liệu trình...</p>
                                                    </div>
                                                ) : (customer.treatmentCards && customer.treatmentCards.length > 0) || (dossier?.treatmentCards && dossier.treatmentCards.length > 0) ? (
                                                    [...(customer.treatmentCards || []), ...(dossier?.treatmentCards || [])]
                                                        // Filter unique by ID
                                                        .reduce((acc: any[], curr) => {
                                                            if (!acc.find(x => x.id === curr.id)) acc.push(curr);
                                                            return acc;
                                                        }, [])
                                                        .sort((a, b) => {
                                                            // Sort by status activity first, then by remaining sessions
                                                            const statusWeight: Record<string, number> = { active: 0, expired: 2, completed: 1 };
                                                            const weightA = statusWeight[a.status] ?? 3;
                                                            const weightB = statusWeight[b.status] ?? 3;
                                                            if (weightA !== weightB) {
                                                                return weightA - weightB;
                                                            }
                                                            return b.remaining - a.remaining;
                                                        })
                                                        .map(card => {
                                                            const isExpiring = card.status === 'active' && card.remaining <= 2;
                                                            const isExpired = card.status === 'expired' || (card.expiryDate && new Date(card.expiryDate) < new Date());

                                                            return (
                                                                <div key={card.id} className="bg-white border border-gold-light/20 rounded-[32px] p-6 hover:border-gold-muted/50 transition-all hover:shadow-luxury group relative overflow-hidden flex flex-col h-full">
                                                                    {/* Status Badge */}
                                                                    <div className="absolute top-4 right-4 z-20">
                                                                        <span className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest shadow-sm ${card.status === 'active' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                                                            card.status === 'expired' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                                                                                'bg-gray-50 text-gray-400 border border-gray-100'
                                                                            }`}>
                                                                            {card.status === 'active' ? 'Đang dùng' : card.status === 'expired' ? 'Hết hạn' : 'Hoàn thành'}
                                                                        </span>
                                                                    </div>

                                                                    <div className="flex items-center gap-4 relative z-10 mb-6">
                                                                        <div className={`w-14 h-14 rounded-[18px] flex items-center justify-center shrink-0 shadow-inner ${card.status === 'active' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                                                            'bg-beige-soft text-text-soft border border-gold-light/10'
                                                                            }`}>
                                                                            <Flower size={24} strokeWidth={1.5} className={card.status === 'active' ? 'animate-pulse-subtle' : ''} />
                                                                        </div>
                                                                        <div className="flex-1 min-w-0 pr-12">
                                                                            <p className="text-[14px] font-serif font-black text-text-main truncate tracking-tight group-hover:text-gold-muted transition-colors leading-tight">{card.name}</p>
                                                                            <p className="text-[9px] text-text-soft font-black uppercase tracking-widest opacity-40 mt-1">Loại: {card.type === 'package' ? 'Gói liệu trình' : 'Dịch vụ lẻ'}</p>
                                                                        </div>
                                                                    </div>

                                                                    <div className="flex-1 space-y-4">
                                                                        <div className="bg-beige-soft/30 rounded-2xl p-4 border border-gold-light/5">
                                                                            <div className="flex justify-between items-end mb-2">
                                                                                <div className="space-y-0.5">
                                                                                    <p className="text-[9px] font-black text-text-soft uppercase tracking-widest opacity-40">Tiến độ sử dụng</p>
                                                                                    <p className="text-[14px] font-black text-text-main">Còn <span className="text-2xl font-serif font-black text-gold-muted italic">{card.remaining}</span>/{card.total} buổi</p>
                                                                                </div>
                                                                                <div className="text-right">
                                                                                    <p className="text-[14px] font-black text-text-main opacity-20">{Math.round((card.used / card.total) * 100)}%</p>
                                                                                </div>
                                                                            </div>
                                                                            <div className="w-full h-2 bg-white/50 rounded-full overflow-hidden border border-gold-light/10">
                                                                                <div
                                                                                    className={`h-full rounded-full transition-all duration-1000 ${isExpired ? 'bg-gray-300' :
                                                                                        isExpiring ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.4)]' :
                                                                                            'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                                                                                        }`}
                                                                                    style={{ width: `${(card.remaining / card.total) * 100}%` }}
                                                                                ></div>
                                                                            </div>
                                                                        </div>

                                                                        <div className="grid grid-cols-2 gap-3">
                                                                            <div className="p-3 bg-white/40 rounded-xl border border-gold-light/10">
                                                                                <p className="text-[8px] font-black text-text-soft uppercase tracking-widest opacity-40 mb-1">Ngày mua</p>
                                                                                <p className="text-[10px] font-bold text-text-main">{card.purchaseDate}</p>
                                                                            </div>
                                                                            <div className="p-3 bg-white/40 rounded-xl border border-gold-light/10">
                                                                                <p className="text-[8px] font-black text-text-soft uppercase tracking-widest opacity-40 mb-1">Hết hạn/BH</p>
                                                                                <p className={`text-[10px] font-bold ${isExpired ? 'text-rose-500' : 'text-text-main'}`}>
                                                                                    {card.expiryDate || card.warrantyExpiryDate || 'Không thời hạn'}
                                                                                </p>
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    {/* Decorative elements */}
                                                                    <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-gold-light/5 rounded-full blur-2xl group-hover:bg-gold-muted/10 transition-all"></div>
                                                                </div>
                                                            );
                                                        })
                                                ) : (
                                                    <div className="lg:col-span-3 bg-beige-soft/20 p-24 rounded-[40px] border border-dashed border-gold-light/30 flex flex-col items-center justify-center text-text-soft text-center opacity-40">
                                                        <Flower size={64} strokeWidth={1} className="mb-6" />
                                                        <p className="text-sm font-black uppercase tracking-[0.2em]">Hiện chưa có liệu trình nào đang hoạt động</p>
                                                    </div>
                                                )}
                                            </div>
                                        </section>
                                    </div>
                                )
                            }

                            {
                                activeTab === 'điều trị' && (
                                    <div className="animate-fade-in">
                                        <div className="flex items-center gap-3 mb-6 sticky top-16 bg-transparent z-10">
                                            <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center shadow-sm">
                                                <History size={20} />
                                            </div>
                                            <h3 className="text-base font-black text-gray-900 uppercase tracking-widest bg-white/40 backdrop-blur-sm px-4 py-2 rounded-xl">
                                                Lịch sử điều trị
                                            </h3>
                                        </div>
                                        <div className="bg-white p-20 rounded-[32px] border border-dashed border-gold-light/20 flex flex-col items-center justify-center text-text-soft text-center shadow-luxury">
                                            <History size={48} strokeWidth={1} className="mb-6 opacity-20 text-gold-muted" />
                                            <p className="text-[11px] font-black text-text-soft uppercase tracking-widest mt-4 opacity-40">Hệ thống đang đồng bộ dữ liệu chuyên sâu...</p>
                                        </div>
                                    </div>
                                )
                            }

                            {
                                activeTab === 'thanh toán' && (
                                    <div className="animate-fade-in">
                                        <div className="flex items-center gap-3 mb-6 sticky top-16 bg-transparent z-10">
                                            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shadow-sm">
                                                <Wallet size={20} />
                                            </div>
                                            <h3 className="text-base font-black text-gray-900 uppercase tracking-widest bg-white/40 backdrop-blur-sm px-4 py-2 rounded-xl">
                                                Tài chính & Công nợ
                                            </h3>
                                        </div>
                                        <div className="flex flex-col md:flex-row gap-6 mb-8">
                                            <div className="flex-1 bg-white p-8 rounded-[40px] border border-gold-light/20 shadow-luxury flex flex-col justify-between">
                                                <div className="flex items-center gap-3 mb-4">
                                                    <div className="w-10 h-10 rounded-xl bg-gold-muted/10 text-gold-muted flex items-center justify-center">
                                                        <TrendingUp size={20} />
                                                    </div>
                                                    <h4 className="text-[10px] font-black text-text-soft uppercase tracking-widest">Tổng chi tiêu</h4>
                                                </div>
                                                <p className="text-3xl lg:text-4xl font-serif font-black text-text-main">
                                                    {(derivedStats.totalSpent || 0).toLocaleString()}
                                                    <span className="text-sm font-sans ml-2 opacity-40 font-normal">VNĐ</span>
                                                </p>
                                            </div>

                                            <div className="flex-1 bg-white p-8 rounded-[40px] border border-gold-light/20 shadow-luxury flex flex-col justify-between">
                                                <div className="flex items-center gap-3 mb-4">
                                                    <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
                                                        <Fingerprint size={20} />
                                                    </div>
                                                    <h4 className="text-[10px] font-black text-text-soft uppercase tracking-widest">Tổng công nợ</h4>
                                                </div>
                                                <p className="text-3xl lg:text-4xl font-serif font-black text-rose-600">
                                                    {(derivedStats.totalDebt || 0).toLocaleString()}
                                                    <span className="text-sm font-sans ml-2 opacity-40 font-normal">VNĐ</span>
                                                </p>
                                            </div>
                                        </div>

                                        <div className="bg-white p-10 lg:p-14 rounded-[32px] border border-gold-light/20 flex flex-col md:flex-row items-center justify-between gap-10 text-text-soft text-center md:text-left shadow-luxury">
                                            <div className="flex flex-col items-center md:items-start">
                                                <Wallet size={48} strokeWidth={1.5} className="mb-6 text-gold-muted" />
                                                <p className="text-[12px] font-black text-text-soft uppercase tracking-widest opacity-60">Số dư thẻ tiền nạp</p>
                                                <p className="text-4xl lg:text-5xl font-serif font-black text-text-main mt-4">
                                                    {(derivedStats.walletBalance || 0).toLocaleString()}
                                                    <span className="text-xl lg:text-2xl font-sans lg:ml-2 font-normal opacity-40">VNĐ</span>
                                                </p>
                                                <div className="mt-6 flex gap-2 w-full md:w-auto">
                                                    <button className="flex-1 md:flex-none px-6 py-2.5 bg-text-main text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-gold-muted transition-all shadow-lg active:scale-95">Nạp tiền</button>
                                                    <button className="flex-1 md:flex-none px-6 py-2.5 bg-beige-soft text-text-main text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-gold-light transition-all shadow-sm active:scale-95">Biến động</button>
                                                </div>
                                            </div>
                                            <div className="w-full md:w-1/2 bg-text-main p-8 rounded-3xl text-white relative overflow-hidden shadow-inner hidden md:block">
                                                <div className="absolute top-0 right-0 w-32 h-32 bg-gold-muted/10 rounded-full translate-x-10 -translate-y-10 blur-xl"></div>
                                                <h4 className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-6">Thẻ tiền trả trước</h4>
                                                <p className="text-sm font-serif italic text-white/80 leading-relaxed">
                                                    Việc nạp tiền trước vào thẻ giúp Khách hàng không cần mang theo tiền mặt hoặc thẻ tín dụng mỗi lần ghé qua, đồng thời tận hưởng trọn vẹn đặc quyền chuyên biệt tại thẩm mỹ viện.
                                                </p>
                                            </div>
                                        </div>

                                        {/* Detailed Service Orders History */}
                                        <div className="mt-10 space-y-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-gold-muted/10 text-gold-muted flex items-center justify-center">
                                                    <History size={16} />
                                                </div>
                                                <h4 className="text-[11px] font-black text-gray-900 uppercase tracking-widest">Lịch sử hóa đơn & Công nợ</h4>
                                            </div>

                                            <div className="bg-white rounded-[32px] border border-gold-light/20 shadow-luxury overflow-hidden">
                                                <div className="overflow-x-auto luxury-scrollbar">
                                                    <table className="w-full text-left luxury-table border-collapse">
                                                        <thead>
                                                            <tr className="bg-beige-soft/30 border-b border-gold-light/10">
                                                                <th className="px-6 py-4 text-[9px] font-black text-text-soft uppercase tracking-widest">Mã phiếu</th>
                                                                <th className="px-6 py-4 text-[9px] font-black text-text-soft uppercase tracking-widest">Ngày lập</th>
                                                                <th className="px-6 py-4 text-[9px] font-black text-text-soft uppercase tracking-widest text-right">Tổng tiền</th>
                                                                <th className="px-6 py-4 text-[9px] font-black text-text-soft uppercase tracking-widest text-right">Đã trả</th>
                                                                <th className="px-6 py-4 text-[9px] font-black text-text-soft uppercase tracking-widest text-right">Còn nợ</th>
                                                                <th className="px-6 py-4 text-[9px] font-black text-text-soft uppercase tracking-widest text-center">Trạng thái</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-gold-light/5">
                                                            {loadingDossier ? (
                                                                <tr>
                                                                    <td colSpan={6} className="px-10 py-10 text-center">
                                                                        <Loader2 size={24} className="animate-spin text-gold-muted mx-auto" />
                                                                    </td>
                                                                </tr>
                                                            ) : dossier?.serviceOrders && dossier.serviceOrders.length > 0 ? (
                                                                dossier.serviceOrders.map(order => (
                                                                    <tr key={order.id} className="hover:bg-beige-soft/10 transition-colors group">
                                                                        <td className="px-6 py-4">
                                                                            <span className="text-[12px] font-black text-text-main group-hover:text-gold-muted transition-colors">{order.code}</span>
                                                                        </td>
                                                                        <td className="px-6 py-4">
                                                                            <span className="text-[12px] text-text-soft font-bold">
                                                                                {new Date(order.createdAt).toLocaleDateString('vi-VN')}
                                                                            </span>
                                                                        </td>
                                                                        <td className="px-6 py-4 text-right">
                                                                            <span className="text-[13px] font-black text-gray-900">{(order.totalAmount || 0).toLocaleString()}đ</span>
                                                                        </td>
                                                                        <td className="px-6 py-4 text-right">
                                                                            <span className="text-[13px] font-bold text-emerald-600">{(order.actualAmount || 0).toLocaleString()}đ</span>
                                                                        </td>
                                                                        <td className="px-6 py-4 text-right">
                                                                            <span className={`text-[13px] font-black ${order.debtAmount > 0 ? 'text-rose-500' : 'text-gray-400'}`}>
                                                                                {(order.debtAmount || 0).toLocaleString()}đ
                                                                            </span>
                                                                        </td>
                                                                        <td className="px-6 py-4 text-center">
                                                                            <span className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest shadow-sm ${order.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                                                                order.status === 'confirmed' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                                                                                    order.status === 'cancelled' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                                                                                        'bg-gray-50 text-gray-400 border border-gray-100'
                                                                                }`}>
                                                                                {order.status}
                                                                            </span>
                                                                        </td>
                                                                    </tr>
                                                                ))
                                                            ) : (
                                                                <tr>
                                                                    <td colSpan={6} className="px-10 py-20 text-center opacity-40">
                                                                        <p className="text-[10px] font-black uppercase tracking-widest">Chưa có lịch sử hóa đơn</p>
                                                                    </td>
                                                                </tr>
                                                            )}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )
                            }

                            {
                                activeTab === 'tương tác' && (
                                    <div className="animate-fade-in">
                                        <div className="flex items-center gap-3 mb-6 sticky top-16 bg-transparent z-10">
                                            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center shadow-sm">
                                                <MessageSquare size={20} />
                                            </div>
                                            <h3 className="text-base font-black text-gray-900 uppercase tracking-widest bg-white/40 backdrop-blur-sm px-4 py-2 rounded-xl">
                                                Nhật ký chăm sóc
                                            </h3>
                                        </div>
                                        <div className="bg-white p-20 rounded-[32px] border border-dashed border-gold-light/20 flex flex-col items-center justify-center text-text-soft text-center shadow-luxury">
                                            <MessageSquare size={48} strokeWidth={1} className="mb-6 opacity-20 text-gold-muted" />
                                            <p className="text-[11px] font-black text-text-soft uppercase tracking-widest mt-4 opacity-40">Tổng hợp tương tác từ đa nền tảng...</p>
                                        </div>
                                    </div>
                                )
                            }
                        </div>
                    </div>
                </div>
            </div>

            {/* QR Tracking Modal */}
            {
                showQrModal && (
                    <div
                        className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 animate-fade-in"
                        onClick={() => setShowQrModal(false)}
                    >
                        <div
                            className="bg-white rounded-[40px] max-w-sm w-full p-8 shadow-2xl animate-modal-up border border-white/20 relative"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button
                                onClick={() => setShowQrModal(false)}
                                className="absolute top-6 right-6 text-gray-400 hover:text-gray-900 transition-colors"
                            >
                                <X size={24} />
                            </button>

                            <div className="flex flex-col items-center">
                                <div className="w-16 h-16 bg-gold-muted/10 rounded-3xl flex items-center justify-center text-gold-muted mb-6">
                                    <QrCode size={32} />
                                </div>

                                <h2 className="text-xl font-bold text-gray-900 mb-2">QR Code Theo dõi</h2>
                                <p className="text-sm text-gray-500 text-center mb-8">Khách hàng scan mã này để xem liệu trình & lịch hẹn cá nhân</p>

                                <div className="aspect-square w-full bg-[#FAF8F6] rounded-[32px] border-2 border-dashed border-gold-muted/20 flex items-center justify-center p-6 mb-8 relative group overflow-hidden">
                                    {/* Simplified Mock QR - Real one would need qrcode library */}
                                    <div className="absolute inset-0 bg-gradient-to-br from-gold-muted/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                    <div className="w-full h-full relative z-10 p-4 bg-white rounded-2xl shadow-inner flex flex-col items-center justify-center border border-gold-muted/10 overflow-hidden">
                                        <img
                                            src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
                                                (typeof window !== 'undefined' ? (process.env.NEXT_PUBLIC_SITE_URL || window.location.origin) : '') + `/tracking?id=${activeCustomer.id}`
                                            )}`}
                                            alt="Tracking QR Code"
                                            className="w-full h-full object-contain"
                                        />
                                    </div>
                                </div>

                                <div className="w-full space-y-3">
                                    <button
                                        onClick={() => {
                                            const url = (process.env.NEXT_PUBLIC_SITE_URL || window.location.origin) + `/tracking?id=${activeCustomer.id}`;
                                            navigator.clipboard.writeText(url);
                                            setCopySuccess(true);
                                            setTimeout(() => setCopySuccess(false), 2000);
                                        }}
                                        className="w-full py-4 bg-gray-50 hover:bg-gray-100 rounded-2xl border border-gray-100 text-gray-900 font-bold text-sm flex items-center justify-center gap-3 transition-all active:scale-95"
                                    >
                                        {copySuccess ? <CheckCircle2 size={18} className="text-emerald-500" /> : <Copy size={18} className="text-gray-400" />}
                                        {copySuccess ? 'Đã sao chép link' : 'Sao chép link theo dõi'}
                                    </button>

                                    <a
                                        href={`/tracking?id=${activeCustomer.id}`}
                                        target="_blank"
                                        className="w-full py-4 bg-text-main text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-3 hover:bg-gold-muted transition-all shadow-lg active:scale-95"
                                    >
                                        <ExternalLink size={18} />
                                        Xem thử giao diện khách
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Debt Repayment Modal */}
            {payingOrder && (
                <div className="fixed inset-0 z-[1100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setPayingOrder(null)}>
                    <div className="bg-white w-full max-w-md rounded-[40px] shadow-2xl overflow-hidden border border-gold-light/20 animate-modal-up" onClick={e => e.stopPropagation()}>
                        <div className="p-8 space-y-6">
                            {(() => {
                                const hasCard = (payingOrder.lineItems || payingOrder.line_items || []).some((li: any) => li.serviceType === 'card' || li.service_type === 'card');
                                return (
                                    <>
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></div>
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-gold-muted">Kế toán thanh toán</span>
                                                </div>
                                                <h3 className="text-xl font-serif font-black text-text-main italic uppercase">Thu nợ phiếu</h3>
                                                <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest leading-none mt-1">{payingOrder.code}</p>
                                            </div>
                                            <button onClick={() => setPayingOrder(null)} className="w-10 h-10 rounded-xl bg-rose-50 text-rose-400 hover:text-rose-600 flex items-center justify-center transition-all border border-rose-100">
                                                <X size={20} strokeWidth={2.5} />
                                            </button>
                                        </div>

                                        <div className="space-y-6">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-text-soft/60 italic block px-1">Ngày thu</label>
                                                    <div className="bg-beige-soft/30 p-3 rounded-2xl border border-gold-light/10">
                                                        <input
                                                            type="date"
                                                            className="w-full bg-transparent border-none p-0 text-sm font-bold text-text-main focus:ring-0"
                                                            value={payDate}
                                                            onChange={e => setPayDate(e.target.value)}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-text-soft/60 italic block px-1">Số tiền (VNĐ)</label>
                                                    <div className="bg-beige-soft/30 p-3 rounded-2xl border border-gold-light/10">
                                                        <input
                                                            type="number"
                                                            className="w-full bg-transparent border-none p-0 text-sm font-black text-text-main focus:ring-0 text-right tabular-nums"
                                                            value={payAmount || ''}
                                                            onChange={e => setPayAmount(Number(e.target.value))}
                                                            placeholder="0"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-text-soft/60 italic block px-1">Phương thức thanh toán</label>
                                                <div className="flex gap-2 bg-beige-soft/20 p-1.5 rounded-2xl border border-gold-light/10 shadow-inner">
                                                    {(['cash', 'bank', 'wallet'] as const).map(m => (
                                                        <button
                                                            key={m}
                                                            disabled={m === 'wallet' && hasCard}
                                                            onClick={() => setPayMethod(m)}
                                                            className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                                                payMethod === m 
                                                                    ? 'bg-text-main text-white shadow-lg scale-105' 
                                                                    : 'text-text-soft hover:bg-white hover:text-text-main'
                                                            } ${m === 'wallet' && hasCard ? 'opacity-50 grayscale' : ''}`}
                                                        >
                                                            {m === 'cash' ? 'Tiền mặt' : m === 'bank' ? 'CK' : 'Ví'}
                                                        </button>
                                                    ))}
                                                </div>
                                                {hasCard && (
                                                    <p className="text-[8px] text-rose-500 font-bold uppercase tracking-tight text-center mt-1 italic">
                                                        * Thẻ không áp dụng thanh toán bằng ví
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="pt-2">
                                            <button
                                                onClick={handlePayDebt}
                                                disabled={isSavingPayment || payAmount <= 0 || (payMethod === 'wallet' && hasCard)}
                                                className="w-full py-5 bg-text-main text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-2xl shadow-luxury hover:bg-gold-muted transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale disabled:scale-100 group"
                                            >
                                                {isSavingPayment ? (
                                                    <Loader2 className="animate-spin" size={18} />
                                                ) : (
                                                    <div className="flex items-center gap-3">
                                                        <CheckCircle2 size={18} className="group-hover:scale-110 transition-transform" />
                                                        <span>Xác nhận thu nợ</span>
                                                    </div>
                                                )}
                                            </button>
                                            <p className="text-center text-[9px] font-black text-text-soft/30 uppercase tracking-[0.3em] mt-5 italic">Giao dịch thu nợ sẽ được lưu vào sổ cái</p>
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
};

export default CustomerProfileModal;
