import React from 'react'
import { MapPinOff, CalendarDays, ExternalLink, Phone } from 'lucide-react'

interface LeadTableProps {
    filteredLeads: any[]
    state: any
    getRowColor: (status: string) => string
    getEffectiveStatus: (lead: any) => string
    openCare: (lead: any) => void
    statusChips: Record<string, { label: string; color: string }>
}

export const LeadTable: React.FC<LeadTableProps> = ({
    filteredLeads,
    state,
    getRowColor,
    getEffectiveStatus,
    openCare,
    statusChips
}) => {
    return (
        <div className="bg-white rounded-[40px] border border-gold-light/20 shadow-luxury overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-separate border-spacing-0">
                    <thead>
                        <tr className="bg-beige-soft/30">
                            <th className="px-10 py-6 text-[9px] font-black text-text-soft/60 uppercase tracking-[0.2em] border-b border-gold-light/10 italic">Thời gian / Chi nhánh</th>
                            <th className="px-10 py-6 text-[9px] font-black text-text-soft/60 uppercase tracking-[0.2em] border-b border-gold-light/10 italic">Khách hàng / Mã số</th>
                            <th className="px-10 py-6 text-[9px] font-black text-text-soft/60 uppercase tracking-[0.2em] border-b border-gold-light/10 italic">Liên hệ / Nguồn</th>
                            <th className="px-10 py-6 text-[9px] font-black text-text-soft/60 uppercase tracking-[0.2em] border-b border-gold-light/10 italic">Trạng thái vận hành</th>
                            <th className="px-10 py-6 text-[9px] font-black text-text-soft/60 uppercase tracking-[0.2em] border-b border-gold-light/10 italic">Nhật ký cuối</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {filteredLeads.map(lead => {
                            const latestLog = lead.careLogs?.[0]
                            const rowStyle = getRowColor(lead.effectiveStatus)

                            return (
                                <tr
                                    key={lead.id}
                                    className={`group hover:bg-beige-soft/20 transition-all duration-300 cursor-pointer ${rowStyle}`}
                                    onClick={() => openCare(lead)}
                                >
                                    <td className="px-10 py-6">
                                        <div className="flex flex-col gap-1">
                                            <div className="text-[12px] font-black text-text-main italic tabular-nums">
                                                {new Date(lead.createdAt).toLocaleDateString('vi-VN')}
                                            </div>
                                            <div className="flex items-center gap-1.5 opacity-60">
                                                <MapPinOff size={10} className="text-gold-muted" />
                                                <span className="text-[9px] font-black text-gold-muted uppercase tracking-widest italic">
                                                    {state.branches.find((b: any) => b.id.toString() === lead.branchId?.toString())?.name || 'N/A'}
                                                </span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-10 py-6">
                                        <div className="flex items-center gap-5">
                                            <div className="w-12 h-12 rounded-[18px] bg-gold-light/20 flex items-center justify-center text-gold-muted font-serif font-black text-lg border border-gold-light/30 shadow-sm group-hover:scale-110 transition-transform">
                                                {lead.name.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <div className="text-[14px] font-black text-text-main group-hover:text-gold-muted transition-colors italic">
                                                        {lead.name}
                                                    </div>
                                                    {(() => {
                                                        const isAppointmentRelated = ['booked', 'arrived', 'completed', 'no_show', 'cancelled', 'pending', 'confirmed', 'recare'].includes(lead.status);
                                                        if (!isAppointmentRelated) return null;

                                                        const relevantApts = state.appointments.filter((a: any) => a.leadId === lead.id);
                                                        if (relevantApts.length === 0) return null;

                                                        const latestApt = [...relevantApts].sort((a, b) => {
                                                            const timeA = new Date(`${a.appointmentDate}T${a.appointmentTime || '00:00'}`).getTime();
                                                            const timeB = new Date(`${b.appointmentDate}T${b.appointmentTime || '00:00'}`).getTime();
                                                            return timeB - timeA;
                                                        })[0];

                                                        const displayStatus = latestApt.status;
                                                        return (
                                                            <span className={`text-[8px] font-black px-2 py-0.5 rounded-lg border uppercase tracking-widest italic ${statusChips[displayStatus]?.color}`}>
                                                                {statusChips[displayStatus]?.label || displayStatus}
                                                            </span>
                                                        );
                                                    })()}
                                                </div>
                                                <div className="text-[9px] font-black text-gold-muted/40 uppercase tracking-[0.2em] italic">#{lead.id}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-10 py-6">
                                        <div className="flex flex-col gap-2">
                                            {lead.phone ? (
                                                <div className="flex items-center gap-2">
                                                    <div className="flex items-center gap-2 px-3 py-1 bg-white ring-1 ring-gold-light/20 rounded-lg text-[12px] font-black text-text-main italic tabular-nums group-hover:ring-gold-muted/30 transition-all">
                                                        <Phone size={12} className="text-gold-muted" /> {lead.phone}
                                                    </div>
                                                    {lead.phoneObtainedAt && (
                                                        <span className={`text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-tighter italic border ${(new Date(lead.phoneObtainedAt).getTime() - new Date(lead.createdAt).getTime()) / (1000 * 60 * 60) <= 24
                                                            ? 'bg-rose-50 text-rose-600 border-rose-100'
                                                            : 'bg-indigo-50 text-indigo-600 border-indigo-100'
                                                            }`}>
                                                            {(new Date(lead.phoneObtainedAt).getTime() - new Date(lead.createdAt).getTime()) / (1000 * 60 * 60) <= 24 ? 'HOT' : 'COLD'}
                                                        </span>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="text-[11px] font-black text-rose-600 italic uppercase tracking-widest bg-rose-50 px-3 py-1 rounded-lg border border-rose-100 w-fit">Chưa có SĐT</div>
                                            )}
                                            <div className="flex items-center gap-2 opacity-40">
                                                <ExternalLink size={10} className="text-gold-muted" />
                                                <span className="text-[9px] font-black text-text-main uppercase tracking-widest italic">{lead.source}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-10 py-6">
                                        {(() => {
                                            const effectiveStatus = getEffectiveStatus(lead);
                                            let displayStatus = effectiveStatus;

                                            if (['booked', 'arrived', 'completed', 'no_show', 'cancelled', 'pending', 'confirmed', 'recare'].includes(effectiveStatus)) {
                                                const relevantApts = state.appointments.filter((a: any) => a.leadId === lead.id);
                                                if (relevantApts.length > 0) {
                                                    const latestApt = [...relevantApts].sort((a, b) => {
                                                        const timeA = new Date(`${a.appointmentDate}T${a.appointmentTime || '00:00'}`).getTime();
                                                        const timeB = new Date(`${b.appointmentDate}T${b.appointmentTime || '00:00'}`).getTime();
                                                        return timeB - timeA;
                                                    })[0];
                                                    displayStatus = latestApt.status;
                                                }
                                            }

                                            return (
                                                <div className={`px-4 py-2 rounded-xl text-[10px] font-black border uppercase tracking-widest transition-all italic text-center w-fit min-w-[120px] ${statusChips[displayStatus]?.color}`}>
                                                    {statusChips[displayStatus]?.label || displayStatus}
                                                </div>
                                            );
                                        })()}
                                    </td>
                                    <td className="px-10 py-6">
                                        {latestLog ? (
                                            <div className="flex flex-col gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                                                <div className="text-[12px] font-black text-text-main italic line-clamp-1">{latestLog.result}</div>
                                                <div className="text-[9px] font-black text-gold-muted uppercase tracking-widest italic opacity-60">
                                                    {new Date(latestLog.createdAt).toLocaleDateString('vi-VN')} • {latestLog.userName}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-[10px] font-black text-text-soft/20 italic uppercase tracking-[0.2em]">Chưa tương tác</div>
                                        )}
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
