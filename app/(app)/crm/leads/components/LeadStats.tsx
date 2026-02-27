import React from 'react'
import { ClipboardList, Clock, UserPlus, CheckCircle2 } from 'lucide-react'

interface LeadStatsProps {
    stats: {
        total: number
        today: number
        new: number
        booked: number
    }
}

export const LeadStats: React.FC<LeadStatsProps> = ({ stats }) => {
    const statConfig = [
        { label: 'Tổng Lead', value: stats.total, color: 'text-gold-muted', bg: 'bg-gold-light/30', icon: ClipboardList, suffix: 'Thông tin' },
        { label: 'Hôm nay', value: stats.today, color: 'text-text-main', bg: 'bg-beige-soft', icon: Clock, suffix: 'Mới' },
        { label: 'Cần xử lý', value: stats.new, color: 'text-rose-600', bg: 'bg-rose-50', icon: UserPlus, suffix: 'Chờ' },
        { label: 'Đã chốt', value: stats.booked, color: 'text-emerald-600', bg: 'bg-emerald-50', icon: CheckCircle2, suffix: 'Thành công' },
    ]

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {statConfig.map((s, i) => (
                <div key={i} className="bg-white p-8 rounded-[40px] shadow-luxury border border-gold-light/20 relative overflow-hidden group hover:scale-[1.02] transition-all duration-500">
                    <div className="absolute -right-10 -top-10 w-32 h-32 bg-gold-light/5 rounded-full blur-3xl group-hover:bg-gold-light/10 transition-colors"></div>
                    <div className="flex items-center gap-5 mb-6">
                        <div className={`w-14 h-14 rounded-2xl ${s.bg} flex items-center justify-center ${s.color} shadow-sm border border-gold-light/10`}>
                            <s.icon size={28} strokeWidth={1.5} />
                        </div>
                        <span className="text-[10px] font-black text-text-soft/40 uppercase tracking-[0.3em] italic">{s.label}</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <h2 className={`text-4xl font-serif font-black ${s.color} tabular-nums italic`}>{s.value}</h2>
                        <span className={`text-[10px] font-black ${s.color} uppercase tracking-widest italic opacity-60`}>{s.suffix}</span>
                    </div>
                </div>
            ))}
        </div>
    )
}
