import React from 'react'
import { Search } from 'lucide-react'

interface LeadFiltersProps {
    searchTerm: string
    setSearchTerm: (val: string) => void
    filterStatus: string
    setFilterStatus: (val: string) => void
    filterSource: string
    setFilterSource: (val: string) => void
    branchFilter: string
    setBranchFilter: (val: string) => void
    canViewAll: boolean
    statusChips: Record<string, { label: string; color: string }>
    sources: string[]
    branches: any[]
}

export const LeadFilters: React.FC<LeadFiltersProps> = ({
    searchTerm, setSearchTerm,
    filterStatus, setFilterStatus,
    filterSource, setFilterSource,
    branchFilter, setBranchFilter,
    canViewAll,
    statusChips,
    sources,
    branches
}) => {
    return (
        <div className="bg-white p-6 rounded-[32px] border border-gold-light/20 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div className="flex flex-wrap items-center gap-3">
                <select
                    className="bg-beige-soft/50 border-none rounded-xl text-[11px] font-black py-2.5 px-6 focus:ring-2 focus:ring-gold-muted/20 outline-none transition-all uppercase tracking-widest text-gold-muted italic appearance-none cursor-pointer hover:bg-gold-light/20"
                    value={filterStatus}
                    onChange={e => setFilterStatus(e.target.value)}
                >
                    <option value="">Tất cả trạng thái</option>
                    {Object.entries(statusChips).map(([val, { label }]) => (
                        <option key={val} value={val}>{label}</option>
                    ))}
                </select>
                <select
                    className="bg-beige-soft/50 border-none rounded-xl text-[11px] font-black py-2.5 px-6 focus:ring-2 focus:ring-gold-muted/20 outline-none transition-all uppercase tracking-widest text-gold-muted italic appearance-none cursor-pointer hover:bg-gold-light/20"
                    value={filterSource}
                    onChange={e => setFilterSource(e.target.value)}
                >
                    <option value="">Tất cả nguồn</option>
                    {sources.map(s => <option key={s} value={s}>{s}</option>)}
                </select>

                {canViewAll && (
                    <select
                        className="bg-beige-soft/50 border-none rounded-xl text-[11px] font-black py-2.5 px-6 focus:ring-2 focus:ring-gold-muted/20 outline-none transition-all uppercase tracking-widest text-gold-muted italic appearance-none cursor-pointer hover:bg-gold-light/20"
                        value={branchFilter}
                        onChange={e => setBranchFilter(e.target.value)}
                    >
                        <option value="all">Tất cả chi nhánh</option>
                        {branches.filter(b => b.type !== 'hq').map(b => (
                            <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                    </select>
                )}
            </div>

            <div className="relative group min-w-[320px]">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gold-muted/40 group-focus-within:text-gold-muted transition-colors" size={18} strokeWidth={2.5} />
                <input
                    type="text"
                    placeholder="Tìm tên hoặc SĐT..."
                    className="w-full pl-14 pr-6 py-4 bg-beige-soft/30 border-none rounded-2xl text-[12px] font-bold text-text-main placeholder:text-text-soft/20 focus:ring-2 focus:ring-gold-muted/20 outline-none transition-all italic tracking-tight"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>
        </div>
    )
}
