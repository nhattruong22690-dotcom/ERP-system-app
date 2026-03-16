'use client'

import React, { useEffect, useState, useMemo } from 'react'
import {
    Calendar,
    CreditCard,
    User as UserIcon,
    Award,
    CheckCircle,
    Clock,
    Phone,
    Cake,
    Mars,
    Venus,
    Rainbow,
    TrendingUp,
    MessageSquare,
    Wallet,
    Sparkles,
    CalendarDays,
    MapPin,
    ClipboardList,
    History
} from 'lucide-react'

export default function TrackingClient({ id }: { id: string }) {
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState('tổng quan')

    useEffect(() => {
        async function fetchData() {
            const customerId = id
            if (!customerId || customerId === 'undefined') return;

            try {
                const res = await fetch(`/api/tracking/${customerId}`)
                const result = await res.json()
                if (result.status === 'success') {
                    setData(result.data)
                } else {
                    setError(result.error || 'Không tìm thấy dữ liệu')
                }
            } catch (err) {
                setError('Lỗi kết nối máy chủ')
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [id])

    // Rank Progress Calculation (omitted for brevity in thoughts but I will provide full file)
    const rankProgress = useMemo(() => {
        if (!data || !data.membershipTiers || !data.customer) return null;
        const tiers = [...data.membershipTiers].sort((a, b) => a.min_spend - b.min_spend);
        if (tiers.length === 0) return { percent: 100, nextTierName: null, minForNext: 0 };

        const currentSpent = data.customer.totalSpent || 0;
        const currentTierIndex = tiers.findIndex(t => currentSpent < (t.min_spend || 0));

        const currentTierIdx = currentTierIndex === -1 ? tiers.length - 1 : currentTierIndex - 1;
        const currentTier = currentTierIdx >= 0 ? tiers[currentTierIdx] : null;
        const nextTier = currentTierIdx + 1 < tiers.length ? tiers[currentTierIdx + 1] : null;

        if (!nextTier) return { percent: 100, nextTierName: null, minForNext: 0 };

        const min = currentTier ? currentTier.min_spend : 0;
        const max = nextTier.min_spend;
        const progress = ((currentSpent - min) / (max - min)) * 100;

        return {
            percent: Math.min(100, Math.max(0, progress)),
            nextTierName: nextTier.name,
            minForNext: nextTier.min_spend
        };
    }, [data])

    if (loading) {
        return (
            <div className="min-h-screen bg-[#020617] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin"></div>
                    <p className="text-amber-500/60 font-black tracking-widest text-[10px] animate-pulse">LUXURY TRACKING SYSTEM</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 text-slate-200">
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-[40px] text-center max-w-md w-full shadow-2xl">
                    <div className="w-16 h-16 bg-rose-500/20 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6">
                        <UserIcon size={32} />
                    </div>
                    <h1 className="text-xl font-black mb-2 tracking-tight">Thông báo</h1>
                    <p className="text-slate-400 mb-8 font-medium">{error}</p>
                    <button onClick={() => window.location.reload()} className="w-full py-4 bg-amber-500 text-[#020617] font-black rounded-2xl shadow-lg active:scale-95 transition-all text-xs tracking-widest uppercase">
                        Thử lại
                    </button>
                </div>
            </div>
        )
    }

    const { customer, treatmentCards, appointments } = data
    const todayStr = new Date().toISOString().split('T')[0];
    const upcomingAppointments = appointments.filter((a: any) => a.appointment_date >= todayStr && ['pending', 'confirmed'].includes(a.status)).reverse();
    const pastAppointments = appointments.filter((a: any) => a.appointment_date < todayStr || !['pending', 'confirmed'].includes(a.status));

    const getStatusConfig = (status: string) => {
        switch (status) {
            case 'pending': return { label: 'Chờ xác nhận', color: 'text-amber-400 bg-amber-400/10 border-amber-400/20', icon: Clock };
            case 'confirmed': return { label: 'Đã xác nhận', color: 'text-blue-400 bg-blue-400/10 border-blue-400/20', icon: CalendarDays };
            case 'arrived': return { label: 'Đã đến', color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20', icon: CheckCircle };
            case 'completed': return { label: 'Hoàn thành', color: 'text-indigo-400 bg-indigo-400/10 border-indigo-400/20', icon: Sparkles };
            case 'cancelled': return { label: 'Đã hủy', color: 'text-rose-400 bg-rose-400/10 border-rose-400/20', icon: Clock };
            default: return { label: status, color: 'text-slate-400 bg-slate-400/10 border-slate-400/20', icon: ClipboardList };
        }
    }

    const formatBirthday = (birthday: string): string => {
        if (!birthday) return '--/--/----';
        const parts = birthday.split('-');
        return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : birthday;
    };

    return (
        <div className="min-h-screen bg-[#020617] text-slate-200 selection:bg-amber-500/30 overflow-x-hidden">
            <style jsx global>{`
                html, body {
                    overflow: auto !important;
                    height: auto !important;
                    min-height: 100% !important;
                    position: relative !important;
                    background: #020617;
                }
                @keyframes floating { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-10px); } }
                .float-animation { animation: floating 3s ease-in-out infinite; }
                .luxury-tracking-page h1, .luxury-tracking-page h2, .luxury-tracking-page h3, .luxury-tracking-page .font-serif { 
                    font-family: var(--font-playfair), serif !important; 
                }
                .luxury-tracking-page {
                    font-family: var(--font-inter), sans-serif !important;
                }
                ::-webkit-scrollbar { width: 4px; }
                ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb { background: rgba(245, 158, 11, 0.2); border-radius: 10px; }
            `}</style>

            <div className="luxury-tracking-page relative flex flex-col min-h-screen">
                <div className="relative overflow-hidden bg-gradient-to-b from-slate-900 to-[#020617] pb-24 pt-16 px-6 shrink-0">
                    <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 blur-[120px] rounded-full -mr-40 -mt-40"></div>
                    <div className="max-w-xl mx-auto relative z-10 flex flex-col items-center">
                        <div className="relative mb-8 text-center">
                            <div className="relative group p-1 bg-gradient-to-tr from-amber-500 to-amber-200 rounded-[40px] shadow-2xl transition-all duration-500 hover:scale-105">
                                <div className="w-28 h-28 rounded-[38px] overflow-hidden bg-[#0f172a] border-2 border-white/5">
                                    {customer.avatar ? (
                                        <img src={customer.avatar} alt={customer.fullName} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-500">
                                            <UserIcon size={48} strokeWidth={1.5} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <h1 className="text-3xl font-black text-white mb-2 tracking-tight flex items-center gap-3">
                            {customer.fullName}
                            {customer.gender === 'nam' ? <Mars className="text-blue-400" size={24} /> : customer.gender === 'nu' ? <Venus className="text-rose-400" size={24} /> : <Rainbow className="text-amber-400" size={20} />}
                        </h1>

                        <div className="flex flex-wrap justify-center gap-2 mb-6">
                            <span className="bg-white/5 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10 text-[10px] font-black uppercase tracking-widest text-amber-500">
                                {customer.rank || 'MEMBER'}
                            </span>
                            <span className="bg-white/5 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                MÃ: {id ? String(id).substring(String(id).length - 6).toUpperCase() : '----'}
                            </span>
                        </div>

                        <div className="flex gap-4">
                            <div className="flex items-center gap-2 text-[13px] text-slate-400 font-medium">
                                <Phone size={14} className="text-amber-500/60" />
                                {customer.phone ? `*${customer.phone.slice(-4)}` : 'Chưa có'}
                            </div>
                            <div className="w-px h-4 bg-white/10 self-center"></div>
                            <div className="flex items-center gap-2 text-[13px] text-slate-400 font-medium">
                                <Cake size={14} className="text-rose-500/60" />
                                {formatBirthday(customer.birthday)}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="max-w-xl mx-auto px-4 sticky top-4 z-[50] w-full shrink-0">
                    <div className="bg-slate-900/95 backdrop-blur-3xl p-1.5 rounded-[28px] border border-white/10 shadow-3xl flex overflow-x-auto no-scrollbar scroll-smooth">
                        {[
                            { id: 'tổng quan', label: 'HỒ SƠ', icon: UserIcon },
                            { id: 'liệu trình', label: 'GÓI', icon: CreditCard },
                            { id: 'lịch hẹn', label: 'LỊCH', icon: Calendar },
                            { id: 'điều trị', label: 'DỊCH VỤ', icon: History },
                            { id: 'thanh toán', label: 'VÍ', icon: Wallet }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`min-w-[70px] flex-1 flex flex-col items-center justify-center gap-1 py-3 px-2 rounded-2xl text-[9px] font-black tracking-widest transition-all shrink-0 ${activeTab === tab.id
                                    ? 'bg-amber-500 text-[#020617] shadow-lg'
                                    : 'text-slate-400 hover:text-white'
                                    }`}
                            >
                                <tab.icon size={16} />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="max-w-xl mx-auto w-full px-6 py-10 flex-grow">
                    {activeTab === 'tổng quan' && (
                        <div className="space-y-8 animate-fade-in">
                            <div className="bg-gradient-to-br from-slate-900 to-black border border-white/5 rounded-[40px] p-8 shadow-2xl relative overflow-hidden group">
                                <div className="relative z-10">
                                    <p className="text-[10px] font-black text-amber-500 uppercase tracking-[0.3em] mb-6 italic">Customer Portfolio</p>
                                    <div className="space-y-6">
                                        <div>
                                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1 opacity-60">Tổng giá trị chi tiêu</p>
                                            <p className="text-4xl font-black text-white italic tracking-tighter">
                                                {customer.totalSpent ? (customer.totalSpent).toLocaleString('vi-VN') : '0'}
                                                <span className="text-sm ml-2 font-black text-slate-600 not-italic">VNĐ</span>
                                            </p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                                                <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Điểm loyalty</p>
                                                <div className="flex items-center gap-2 text-amber-500">
                                                    <Sparkles size={14} />
                                                    <span className="text-xl font-black italic">{customer.points || 0}</span>
                                                </div>
                                            </div>
                                            <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                                                <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Lần ghé cuối</p>
                                                <p className="text-sm font-black text-slate-300 italic truncate">{customer.lastVisit || 'Chưa có'}</p>
                                            </div>
                                        </div>
                                    </div>
                                    {rankProgress && rankProgress.nextTierName && (
                                        <div className="mt-8 pt-6 border-t border-white/5">
                                            <div className="flex justify-between items-end mb-2">
                                                <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Tiến trình thăng hạng</span>
                                                <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest">{rankProgress.nextTierName}</span>
                                            </div>
                                            <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                                                <div className="h-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)] transition-all duration-1000" style={{ width: `${rankProgress.percent}%` }} />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="bg-white/5 border border-dashed border-white/10 rounded-[40px] p-8">
                                <p className="text-sm font-black text-amber-500 uppercase tracking-widest mb-4 italic font-serif">Lời khuyên chuyên môn</p>
                                <p className="text-lg font-serif italic text-slate-300 leading-relaxed opacity-80 min-h-[60px]">
                                    "{customer.professionalNotes || 'Hiện chưa có ghi chú chăm sóc chuyên biệt cho tài khoản này.'}"
                                </p>
                            </div>
                        </div>
                    )}

                    {activeTab === 'liệu trình' && (
                        <div className="space-y-6 animate-fade-in">
                            {treatmentCards.length > 0 ? (
                                treatmentCards.map((card: any) => (
                                    <div key={card.id} className="bg-slate-900 border border-white/5 p-6 rounded-[32px] shadow-xl group transition-all hover:border-amber-500/20">
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-500 border border-amber-500/10">
                                                    <CreditCard size={20} />
                                                </div>
                                                <div>
                                                    <h3 className="font-black text-slate-100 text-sm truncate uppercase tracking-tight">{card.name}</h3>
                                                    <span className={`text-[9px] font-black uppercase tracking-widest ${card.status === 'active' ? 'text-emerald-500' : 'text-slate-500'}`}>
                                                        {card.status === 'active' ? '● ĐANG SỬ DỤNG' : '● HOÀN THÀNH'}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-2xl font-black text-amber-500 italic leading-none">{card.remaining}</p>
                                                <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest mt-1">Buổi còn</p>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                                                <div className="h-full bg-amber-500" style={{ width: `${(card.used / card.total * 100) || 0}%` }} />
                                            </div>
                                            <div className="flex justify-between text-[10px] font-black tracking-widest text-slate-500 uppercase italic">
                                                <span>Sử dụng: {card.used}/{card.total}</span>
                                                {card.expiry_date && <span>Hạn: {new Date(card.expiry_date).toLocaleDateString('vi-VN')}</span>}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="bg-white/5 border border-dashed border-white/10 p-16 rounded-[40px] text-center opacity-40">
                                    <CreditCard size={40} className="mx-auto mb-4" />
                                    <p className="text-[11px] font-black uppercase tracking-widest italic">Chưa có gói dịch vụ</p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'lịch hẹn' && (
                        <div className="space-y-10 animate-fade-in">
                            {upcomingAppointments.length > 0 && (
                                <div className="space-y-4">
                                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.4em] px-2 italic">Lịch sắp tới</p>
                                    {upcomingAppointments.map((app: any) => {
                                        const config = getStatusConfig(app.status);
                                        return (
                                            <div key={app.id} className="bg-blue-900/10 border-l-2 border-blue-500 p-5 rounded-2xl">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div>
                                                        <p className="text-lg font-black text-white italic">{new Date(app.appointment_date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}</p>
                                                        <p className="text-xs font-black text-blue-400">{app.appointment_time}</p>
                                                    </div>
                                                    <span className={`px-2 py-1 rounded-md text-[8px] font-black uppercase tracking-widest border ${config.color}`}>{config.label}</span>
                                                </div>
                                                <p className="text-xs text-slate-400 font-medium italic opacity-70">"{app.notes || 'Xác nhận dịch vụ qua hệ thống'}"</p>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                            <div className="space-y-4">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] px-2 italic">Lịch sử chăm sóc</p>
                                {pastAppointments.slice(0, 5).map((app: any) => {
                                    const config = getStatusConfig(app.status);
                                    return (
                                        <div key={app.id} className="bg-white/5 border border-white/5 p-4 rounded-2xl flex items-center gap-4 group transition-all hover:bg-white/10">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${config.color}`}>
                                                <config.icon size={16} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-black text-slate-100 truncate uppercase tracking-tight">{app.notes || 'Buổi liệu trình'}</p>
                                                <p className="text-[10px] text-slate-500 font-bold opacity-60">{new Date(app.appointment_date).toLocaleDateString('vi-VN')} {app.appointment_time}</p>
                                            </div>
                                            <div className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-md border ${config.color} opacity-60`}>
                                                {config.label === 'Hoàn thành' ? 'DONE' : config.label}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {activeTab === 'điều trị' && (
                        <div className="space-y-8 animate-fade-in py-10">
                            <div className="bg-white/5 border border-dashed border-white/10 rounded-[40px] p-16 text-center shadow-luxury">
                                <History size={64} strokeWidth={1} className="mb-6 mx-auto opacity-10 text-amber-500" />
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.4em] mb-3">Lịch sử điều trị chuyên sâu</h3>
                                <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest italic leading-relaxed max-w-[250px] mx-auto">Hệ thống đang đồng bộ dữ liệu hồ sơ lâm sàng từ chi nhánh...</p>
                            </div>
                        </div>
                    )}

                    {activeTab === 'thanh toán' && (
                        <div className="space-y-8 animate-fade-in py-10">
                            <div className="bg-white/5 border border-dashed border-white/10 rounded-[40px] p-16 text-center shadow-luxury">
                                <Wallet size={64} strokeWidth={1} className="mb-6 mx-auto opacity-10 text-amber-500" />
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.4em] mb-3">Tài chính & Công nợ</h3>
                                <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest italic leading-relaxed max-w-[250px] mx-auto">Dữ liệu công nợ đang được xác thực với bộ phận kế toán...</p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="w-full bg-[#020617] border-t border-white/5 py-12 text-center px-6 shrink-0 mt-auto">
                    <p className="text-[9px] font-black text-amber-500/40 uppercase tracking-[0.6em] mb-2">XINH GROUP ERP SYSTEM</p>
                    <p className="text-[8px] text-slate-700 font-black uppercase tracking-widest">Aesthetic Medical System</p>
                </div>
            </div>
        </div>
    )
}
