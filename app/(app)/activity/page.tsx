'use client'
import React from 'react'
import { useApp } from '@/lib/auth'
import { ActivityLog } from '@/lib/types'
import { fmtDate } from '@/lib/calculations'
import { Bell, User, Clock, Tag, FileText, ArrowLeftRight, CreditCard, Building2, Trash2, Edit, PlusCircle, TrendingUp, TrendingDown } from 'lucide-react'
import PageHeader from '@/components/PageHeader'

const ENTITY_ICONS: Record<string, any> = {
    transaction: ArrowLeftRight,
    plan: FileText,
    account: CreditCard,
    category: Tag,
    branch: Building2,
    user: User,
}

const TYPE_COLORS: Record<string, string> = {
    create: 'var(--success)',
    update: 'var(--primary)',
    delete: 'var(--danger)',
}

const TYPE_ICONS: Record<string, any> = {
    create: PlusCircle,
    update: Edit,
    delete: Trash2,
}

export default function ActivityPage() {
    const { state, currentUser } = useApp()

    if (!['admin', 'director', 'accountant'].includes(currentUser?.role || '')) {
        return <div className="card" style={{ padding: 40, textAlign: 'center' }}>Bạn không có quyền xem trang này.</div>
    }

    const logs = [...(state.activityLogs || [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt))

    return (
        <div className="page-container bg-[#FAF8F6]">
            {/* Header Luxury Section */}
            <PageHeader
                icon={Bell}
                title="Bảng tin Hoạt động"
                subtitle="Activity Log"
                description="Theo dõi nhật ký hệ thống thời gian thực"
            />

            <div className="px-10 py-12 pb-32 max-w-[1000px] mx-auto animate-fade-in">

                <div className="space-y-4">
                    {logs.length === 0 ? (
                        <div className="bg-white border border-gold-light/20 rounded-[32px] p-20 text-center shadow-luxury">
                            <div className="w-20 h-20 bg-beige-soft rounded-full flex items-center justify-center mx-auto mb-6 opacity-40">
                                <Bell size={32} className="text-text-soft" strokeWidth={1} />
                            </div>
                            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-text-soft opacity-40">Hệ thống chưa ghi nhận hoạt động nào</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {logs.map((log, i) => {
                                const isIncome = log.details.includes('[THU]')
                                const isExpense = log.details.includes('[CHI]')

                                const eType = log.entityType || 'unknown'
                                let Icon = ENTITY_ICONS[eType] || Bell
                                if (eType === 'transaction') {
                                    if (isIncome) Icon = TrendingUp
                                    else if (isExpense) Icon = TrendingDown
                                }

                                const baseColor = TYPE_COLORS[log.type]
                                const semanticColorHex = isIncome ? '#059669' : isExpense ? '#dc2626' : (log.type === 'create' ? '#10b981' : log.type === 'update' ? '#C5A059' : '#dc2626')

                                const TypeIcon = TYPE_ICONS[log.type] || Edit
                                const user = state.users.find(u => u.id === log.userId)
                                const b = state.branches.find(br => br.id === user?.branchId)
                                const branchName = b ? (b.name.toLowerCase().startsWith('cn') ? b.name : `CN ${b.name}`) : ''
                                const time = new Date(log.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
                                const date = fmtDate(log.createdAt)

                                return (
                                    <div key={log.id} className="bg-white border border-gold-light/20 rounded-[24px] p-6 shadow-luxury hover:border-gold-muted/30 transition-all duration-300 group flex gap-6 items-center">

                                        <div className="relative flex-shrink-0">
                                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center group-hover:bg-opacity-80 transition-colors ${log.type === 'create' ? 'bg-emerald-50 text-emerald-600' : log.type === 'update' ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'}`}>
                                                <Icon size={24} strokeWidth={1.5} style={{ color: semanticColorHex }} />
                                            </div>
                                            <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-lg shadow-sm border border-white flex items-center justify-center text-white ${log.type === 'create' ? 'bg-emerald-500' : log.type === 'update' ? 'bg-amber-500' : 'bg-rose-500'}`}>
                                                <TypeIcon size={12} strokeWidth={2} />
                                            </div>
                                        </div>

                                        <div className="flex-1 min-w-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[14px] font-bold text-text-main leading-relaxed tracking-tight">
                                                    {log.details}
                                                </p>
                                                <div className="flex items-center gap-4 mt-2">
                                                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${log.type === 'create' ? 'bg-emerald-50 text-emerald-600' : log.type === 'update' ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'}`}>
                                                        {log.entityType || 'Hệ thống'} • {log.type === 'create' ? 'Tạo mới' : log.type === 'update' ? 'Cập nhật' : 'Xóa'}
                                                    </span>
                                                    <div className="w-1 h-1 rounded-full bg-gold-light/50" />
                                                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-text-soft opacity-40">
                                                        <Clock size={12} strokeWidth={1.5} />
                                                        {time}, {date}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex-shrink-0 flex items-center gap-3 pl-4 border-l border-gold-light/10 min-w-[120px]">
                                                <div className="text-right">
                                                    <p className="text-[11px] font-black text-text-main uppercase tracking-tighter leading-none mb-1">
                                                        {user?.displayName || 'Hệ thống'}
                                                    </p>
                                                    {branchName && (
                                                        <p className="text-[9px] font-bold text-gold-muted uppercase tracking-widest leading-none mb-1">
                                                            {branchName}
                                                        </p>
                                                    )}
                                                    <p className="text-[9px] font-bold text-text-soft/40 uppercase tracking-widest italic leading-none">
                                                        @{user?.username || 'system'}
                                                    </p>
                                                </div>
                                                <div className="w-10 h-10 rounded-full bg-beige-soft border border-gold-light/20 flex items-center justify-center overflow-hidden">
                                                    {user?.avatarUrl ? (
                                                        <img src={user.avatarUrl} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <User size={18} strokeWidth={1.5} className="opacity-30" />
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
