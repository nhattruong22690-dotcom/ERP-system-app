'use client'
import { useMemo } from 'react'
import { useApp } from '@/lib/auth'
import { Users, ClipboardList, Phone, Star, Sparkles, UserPlus } from 'lucide-react'
import PageHeader from '@/components/layout/PageHeader'

export default function TeamPage() {
    const { state } = useApp()

    // Calculate lead generation stats per user
    const teamStats = useMemo(() => {
        const activeUsers = state.users.filter(u => u.workStatus !== 'resigned')

        return activeUsers.map(user => {
            const userLeads = state.leads.filter(l => l.salePageId === user.id)
            const leadsWithPhone = userLeads.filter(l => l.phone && l.phone.length > 5).length

            return {
                user,
                leadCount: userLeads.length,
                phoneCount: leadsWithPhone,
                branch: state.branches.find(b => b.id === user.branchId),
                jobTitle: state.jobTitles?.find(jt => jt.id === user.jobTitleId)
            }
        }).sort((a, b) => b.leadCount - a.leadCount)
    }, [state.users, state.leads, state.branches, state.jobTitles])

    const totalLeads = teamStats.reduce((acc, curr) => acc + curr.leadCount, 0)
    const totalPhones = teamStats.reduce((acc, curr) => acc + curr.phoneCount, 0)

    return (
        <div className="page-container">
            {/* Background Texture Overlay */}
            <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-0" style={{ backgroundImage: 'radial-gradient(var(--gold-muted) 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>

            <PageHeader
                icon={Users}
                title="Đội ngũ Tinh Hoa"
                subtitle="Elite Division"
                description="Hệ thống quản trị nguồn lực cao cấp"
            >
                <div className="flex flex-col items-end">
                    <span className="text-[10px] font-black text-text-soft uppercase tracking-[0.3em] mb-1 opacity-40">Total Global Reach</span>
                    <div className="flex items-baseline gap-2">
                        <span className="text-[24px] font-serif font-bold text-text-main tracking-tighter leading-none">
                            {totalLeads.toLocaleString()}
                        </span>
                        <span className="text-[10px] font-black text-gold-muted uppercase tracking-widest opacity-80">Leads</span>
                    </div>
                </div>
            </PageHeader>

            <div className="px-10 py-12 pb-32 max-w-[1200px] mx-auto animate-fade-in relative z-10">
                {/* Stats Section with Glassmorphism */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-20">
                    {[
                        { label: 'Total Consultants', value: teamStats.length, icon: Users, desc: 'Growing the excellence', color: 'bg-beige-soft text-gold-muted' },
                        { label: 'Lead Generation', value: totalLeads, icon: ClipboardList, desc: 'High-intent customers', color: 'bg-text-main text-white' },
                        { label: 'Phone Collection', value: totalPhones, icon: Phone, desc: 'Verified contacts', color: 'bg-beige-soft text-gold-muted' }
                    ].map((stat, i) => (
                        <div key={i} className={`group relative p-10 rounded-[40px] border border-gold-light/20 transition-all duration-500 hover:scale-[1.02] hover:shadow-luxury ${stat.color.includes('bg-text-main') ? stat.color + ' shadow-2xl' : 'bg-white shadow-soft'}`}>
                            {stat.color.includes('bg-text-main') ? (
                                <div className="absolute top-0 right-0 p-8 opacity-10 flex flex-col items-end">
                                    <stat.icon size={120} />
                                </div>
                            ) : (
                                <div className="absolute top-8 right-8 w-16 h-16 rounded-2xl bg-beige-soft flex items-center justify-center text-gold-muted transition-transform group-hover:rotate-12">
                                    <stat.icon size={32} />
                                </div>
                            )}

                            <h3 className={`text-[11px] font-bold uppercase tracking-[0.2em] mb-10 ${stat.color.includes('text-white') ? 'text-gold-muted' : 'text-text-soft opacity-60'}`}>
                                {stat.label}
                            </h3>
                            <div className="flex flex-col gap-2">
                                <p className="text-[56px] font-serif font-bold leading-none tracking-tighter">{stat.value.toLocaleString()}</p>
                                <p className={`text-[12px] font-medium italic ${stat.color.includes('text-white') ? 'text-white/40' : 'text-text-soft'}`}>
                                    {stat.desc}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Aesthetic Separator */}
                <div className="flex flex-col items-center gap-6 mb-20 opacity-30">
                    <div className="h-[100px] w-[1px] bg-gradient-to-b from-transparent via-gold-muted to-transparent"></div>
                    <Sparkles className="text-gold-muted" size={24} />
                </div>

                {/* Team Visualization Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10">
                    {teamStats.map(({ user, leadCount, phoneCount, branch, jobTitle }) => (
                        <div key={user.id} className="group flex flex-col items-center text-center">
                            <div className="relative mb-8">
                                {/* Avatar Backdrop */}
                                <div className="absolute -inset-4 bg-beige-soft rounded-[48px] scale-90 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-500 rotate-6"></div>
                                <div className="relative w-40 h-40 rounded-[48px] bg-white shadow-soft border border-gold-light flex items-center justify-center overflow-hidden transition-all duration-500 group-hover:border-gold-muted group-hover:-translate-y-2">
                                    <div className="absolute inset-0 bg-gradient-to-br from-beige-soft to-transparent opacity-50"></div>
                                    <span className="text-[48px] font-serif font-bold text-gold-muted relative z-10">
                                        {user.displayName[0].toUpperCase()}
                                    </span>
                                </div>
                                <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-2xl bg-text-main text-white flex items-center justify-center shadow-xl border-2 border-white scale-0 group-hover:scale-100 transition-transform delay-100">
                                    <Star size={16} className="text-gold-muted" />
                                </div>
                            </div>

                            <div className="flex flex-col gap-1 items-center mb-6">
                                <div className="px-3 py-1 rounded-full bg-beige-soft border border-gold-light/40 mb-2">
                                    <span className="text-[9px] font-bold text-gold-muted uppercase tracking-widest">{jobTitle?.name || 'K-Beauty Specialist'}</span>
                                </div>
                                <h4 className="text-[24px] font-serif font-bold text-text-main leading-tight group-hover:text-gold-muted transition-colors">{user.displayName}</h4>
                                <p className="text-[11px] font-bold text-text-soft uppercase tracking-[0.2em] opacity-60">{branch?.name || 'Headoffice'}</p>
                            </div>

                            <div className="flex items-center gap-8 py-4 px-8 bg-beige-soft/50 rounded-3xl border border-transparent transition-all group-hover:border-gold-light/20 group-hover:bg-white group-hover:shadow-luxury">
                                <div className="flex flex-col">
                                    <span className="text-[18px] font-serif font-bold text-text-main">{leadCount}</span>
                                    <span className="text-[9px] font-bold text-text-soft uppercase tracking-widest opacity-40">Leads</span>
                                </div>
                                <div className="w-[1px] h-6 bg-gold-light"></div>
                                <div className="flex flex-col">
                                    <span className="text-[18px] font-serif font-bold text-text-main">{phoneCount}</span>
                                    <span className="text-[9px] font-bold text-text-soft uppercase tracking-widest opacity-40">Phones</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer Quote */}
                <div className="mt-40 text-center pb-20 border-t border-gold-light/20 pt-20">
                    <p className="text-[11px] font-bold text-gold-muted uppercase tracking-[0.6em] opacity-40">
                        Crafting Timeless Beauty Through Excellence
                    </p>
                </div>
            </div>
        </div>
    )
}
