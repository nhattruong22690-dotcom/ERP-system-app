'use client'
import React, { useState, useMemo, useRef, useEffect } from 'react'
import { useApp, canViewAllBranches } from '@/lib/auth'
import { buildCashFlowRows, fmtVND, buildAlerts } from '@/lib/utils/calculations'
import { AlertTriangle, CheckCircle, Star, ArrowRightCircle, Landmark, LayoutDashboard, Database, TrendingUp, TrendingDown, Wallet, Activity, BellOff, ChevronDown, ChevronUp } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import PageHeader from '@/components/layout/PageHeader'

const SECTION_LABELS: Record<string, string> = {
    revenue: 'Dòng tiền & Doanh thu',
    fixed_cost: 'Chi phí vận hành cố định',
    variable_cost: 'Chi phí kinh doanh biến đổi',
    fund: 'Các quỹ dự phòng & Vốn',
}
const MONTHS = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12']

export default function CashflowPage() {
    const { currentUser, state, saveState } = useApp()
    const searchParams = useSearchParams()
    const now = new Date()

    const [selectedBranch, setSelectedBranch] = useState(() => {
        const p = searchParams.get('branchId')
        if (p) {
            if (canViewAllBranches(currentUser) || p === currentUser?.branchId) return p
        }
        return canViewAllBranches(currentUser)
            ? (state.branches.find(b => b.type !== 'hq' && !b.isHeadquarter)?.id ?? '')
            : currentUser?.branchId ?? ''
    })
    const [year, setYear] = useState(() => {
        const p = searchParams.get('year')
        return p ? parseInt(p) : now.getFullYear()
    })
    const [month, setMonth] = useState(() => {
        const p = searchParams.get('month')
        return p ? parseInt(p) : now.getMonth() + 1
    })

    // Thêm Date Picker
    const [fromDate, setFromDate] = useState(() => searchParams.get('fromDate') || '')
    const [toDate, setToDate] = useState(() => searchParams.get('toDate') || '')
    const [useDateFilter, setUseDateFilter] = useState(() => !!(searchParams.get('fromDate') && searchParams.get('toDate')))

    const [highlightedCat, setHighlightedCat] = useState<string | null>(
        searchParams.get('highlight')
    )
    const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({})

    const [hideAlerts, setHideAlerts] = useState(false)
    const [isAlertsExpanded, setIsAlertsExpanded] = useState(false)

    useEffect(() => {
        const catId = searchParams.get('highlight')
        if (!catId) return
        const timer = setTimeout(() => {
            const el = rowRefs.current[catId]
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }
            setTimeout(() => setHighlightedCat(null), 4000)
        }, 350)
        return () => clearTimeout(timer)
    }, [searchParams])

    const visibleBranches = canViewAllBranches(currentUser)
        ? state.branches.filter(b => b.type !== 'hq' && !b.isHeadquarter)
        : state.branches.filter(b => b.id === currentUser?.branchId)

    const plan = useMemo(() =>
        state.plans.find(p => p.branchId === selectedBranch && p.year === year && p.month === month)
        , [state.plans, selectedBranch, year, month])

    const rows = useMemo(() => {
        if (!plan) return []
        const activeFromDate = useDateFilter && fromDate ? fromDate : undefined
        const activeToDate = useDateFilter && toDate ? toDate : undefined
        return buildCashFlowRows(plan, state.categories, state.transactions, activeFromDate, activeToDate)
    }, [plan, state.categories, state.transactions, useDateFilter, fromDate, toDate])

    const alerts = useMemo(() => {
        const activeFromDate = useDateFilter && fromDate ? fromDate : undefined
        const activeToDate = useDateFilter && toDate ? toDate : undefined
        return buildAlerts(state.plans, state.categories, state.transactions, state.branches, false, activeFromDate, activeToDate)
            .filter(a => (!selectedBranch || a.branchId === selectedBranch) && a.year === year && a.month === month)
    }, [state, selectedBranch, year, month, useDateFilter, fromDate, toDate])

    function scrollToCategory(catId: string) {
        setHighlightedCat(catId)
        const el = rowRefs.current[catId]
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' })
            setTimeout(() => setHighlightedCat(null), 3000)
        }
    }

    function toggleStar(categoryId: string) {
        const key = `${currentUser?.id}:${selectedBranch}|${month}|${year}|${categoryId}`
        const current = state.starredAlerts || []
        const next = current.includes(key) ? current.filter(k => k !== key) : [...current, key]
        saveState(s => ({ ...s, starredAlerts: next }))
    }

    const sections = ['revenue', 'fixed_cost', 'variable_cost', 'fund'] as const
    const rowsBySection = (section: string) => rows.filter(r => {
        const cat = state.categories.find(c => c.id === r.categoryId)
        return cat?.section === section
    })

    const totalRevenueActual = rowsBySection('revenue').reduce((s, r) => s + r.actual, 0)
    const totalRevenuePlanned = rowsBySection('revenue').reduce((s, r) => s + r.planned, 0)

    const totalExpenseActual = rows.filter(r => {
        const cat = state.categories.find(c => c.id === r.categoryId)
        return cat?.section !== 'revenue' && cat?.section !== 'fund'
    }).reduce((s, r) => s + r.actual, 0)

    const totalExpensePlanned = rows.filter(r => {
        const cat = state.categories.find(c => c.id === r.categoryId)
        return cat?.section !== 'revenue' && cat?.section !== 'fund'
    }).reduce((s, r) => s + r.planned, 0)

    const actualProfit = totalRevenueActual - totalExpenseActual
    const plannedProfit = totalRevenuePlanned - totalExpensePlanned

    const actualTax = actualProfit > 0 ? actualProfit * 0.2 : 0
    const plannedTax = plannedProfit > 0 ? plannedProfit * 0.2 : 0

    const plannedProfitAfterTax = plannedProfit - plannedTax
    const actualProfitAfterTax = actualProfit - actualTax

    return (
        <div className="page-container px-4 md:px-[10%]">
            <PageHeader
                icon={Activity}
                title="Dòng tiền"
                subtitle="& Kế hoạch"
                description="Phân tích tài chính & Hiệu suất kinh doanh"
                actions={
                    <div className="flex items-center gap-4 bg-white p-2.5 rounded-[30px] border border-gold-light/30 shadow-sm">
                        {canViewAllBranches(currentUser) && (
                            <div className="flex items-center gap-2 pl-5">
                                <span className="text-[11px] font-black text-text-soft uppercase tracking-widest opacity-40">Chi nhánh:</span>
                                <select
                                    className="bg-transparent border-none text-[15px] font-bold text-text-main py-2.5 px-4 focus:ring-0 cursor-pointer hover:text-gold-muted transition-colors font-sans"
                                    value={selectedBranch}
                                    onChange={e => setSelectedBranch(e.target.value)}
                                >
                                    <option value="">Toàn hệ thống</option>
                                    {visibleBranches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                </select>
                            </div>
                        )}
                        <div className="flex flex-col md:flex-row items-start md:items-center gap-2 px-4 border-l border-gold-light/20">
                            <div className="flex items-center justify-between w-full md:w-auto mb-1 md:mb-0">
                                <span className="text-[11px] font-black text-text-soft uppercase tracking-widest opacity-40">Chu kỳ:</span>
                                <button
                                    onClick={() => setUseDateFilter(!useDateFilter)}
                                    className="md:ml-3 text-[12px] font-bold text-gold-muted hover:text-gold-light transition-colors underline decoration-gold-light/40 underline-offset-4"
                                >
                                    {useDateFilter ? 'Xem theo Tháng' : 'Lọc từ ngày'}
                                </button>
                            </div>

                            {!useDateFilter ? (
                                <div className="flex items-center gap-1.5 bg-beige-soft/50 rounded-xl pr-3">
                                    <select
                                        className="bg-transparent border-none text-[15px] font-bold text-text-main py-2 pl-3 pr-1.5 focus:ring-0 cursor-pointer hover:text-gold-muted transition-colors"
                                        value={month}
                                        onChange={e => setMonth(+e.target.value)}
                                    >
                                        {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                                    </select>
                                    <select
                                        className="bg-transparent border-none text-[15px] font-bold text-text-main py-2 pl-1.5 pr-2 focus:ring-0 cursor-pointer hover:text-gold-muted transition-colors"
                                        value={year}
                                        onChange={e => setYear(+e.target.value)}
                                    >
                                        {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                                    </select>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2.5 bg-beige-soft/50 rounded-xl px-3 py-1.5">
                                    <input
                                        type="date"
                                        className="bg-transparent border-none text-[14px] font-bold text-text-main py-1.5 px-2 focus:ring-0 cursor-pointer w-[135px]"
                                        value={fromDate}
                                        onChange={e => setFromDate(e.target.value)}
                                    />
                                    <span className="text-text-soft opacity-40 text-[12px]">đến</span>
                                    <input
                                        type="date"
                                        className="bg-transparent border-none text-[14px] font-bold text-text-main py-1.5 px-2 focus:ring-0 cursor-pointer w-[135px]"
                                        value={toDate}
                                        onChange={e => setToDate(e.target.value)}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                }
            />

            {/* ALERT ITEMS — clickable */}
            {!hideAlerts ? (
                alerts.length > 0 && (
                    <div className="mb-12">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-rose-600 animate-pulse"></div>
                                <span className="text-[10px] font-black text-text-soft uppercase tracking-[0.2em] opacity-40">Cảnh báo tài chính ({alerts.length})</span>
                            </div>
                            <button
                                onClick={() => setHideAlerts(true)}
                                className="px-4 py-2 bg-white border border-gold-light/20 rounded-[14px] text-[9px] font-black uppercase tracking-widest text-text-soft hover:text-rose-600 hover:border-rose-200 transition-all flex items-center gap-2 shadow-sm italic"
                            >
                                <BellOff size={14} /> Ẩn toàn bộ
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {(isAlertsExpanded ? alerts : alerts.slice(0, 4)).map((a, i) => (
                                <button key={i} onClick={() => scrollToCategory(a.categoryId)}
                                    className={`flex items-center gap-5 p-6 rounded-[24px] border transition-all text-left group hover:scale-[1.02] active:scale-95 ${a.status === 'exceeded' ? 'bg-rose-50 border-rose-100 text-rose-900' : 'bg-amber-50 border-amber-100 text-amber-900'
                                        }`}
                                >
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:rotate-12 ${a.status === 'exceeded' ? 'bg-white text-rose-600 shadow-sm' : 'bg-white text-amber-600 shadow-sm'
                                        }`}>
                                        <AlertTriangle size={24} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-[14px] font-bold tracking-tight truncate">{a.categoryName}</div>
                                        <div className="text-[11px] font-medium opacity-60 mt-1 uppercase tracking-wide truncate">
                                            {a.status === 'exceeded' ? 'Vượt ngưỡng giới hạn' : 'Sắp đạt ngưỡng cảnh báo'} — Đã dùng {a.pct.toFixed(0)}%
                                        </div>
                                    </div>
                                    <ArrowRightCircle size={18} className="opacity-20 flex-shrink-0 group-hover:opacity-100 transition-opacity" />
                                </button>
                            ))}
                        </div>
                        {alerts.length > 4 && (
                            <div className="mt-4 flex justify-center">
                                <button
                                    onClick={() => setIsAlertsExpanded(!isAlertsExpanded)}
                                    className="px-5 py-2.5 bg-beige-soft/50 border border-gold-light/20 rounded-full text-[10px] font-black uppercase tracking-[0.1em] text-text-soft hover:text-gold-muted hover:border-gold-light/40 transition-all flex items-center gap-2 italic"
                                >
                                    {isAlertsExpanded ? (
                                        <><ChevronUp size={14} /> Thu gọn</>
                                    ) : (
                                        <><ChevronDown size={14} /> Xem thêm {alerts.length - 4} cảnh báo</>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                )
            ) : alerts.length > 0 && (
                <div className="mb-12 flex justify-start">
                    <button
                        onClick={() => setHideAlerts(false)}
                        className="px-5 py-3 bg-white border border-gold-light/20 rounded-[16px] text-[10px] font-black uppercase tracking-widest text-text-soft hover:text-gold-muted hover:border-gold-muted/30 transition-all flex items-center gap-3 shadow-sm italic"
                    >
                        <div className="flex items-center gap-1.5 opacity-60">
                            <AlertTriangle size={14} /> Mở lại cảnh báo ({alerts.length})
                        </div>
                    </button>
                </div>
            )}
            {/* Summary cards Luxury */}
            {plan && (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-8 mb-20">
                    {[
                        { label: 'KPI Mục tiêu', value: plan.kpiRevenue || 0, actual: plan.kpiRevenue || 0, icon: LayoutDashboard, color: 'text-text-main', bg: 'bg-white', iconColor: 'text-gold-muted' },
                        { label: 'Doanh thu thực đạt', value: plan.kpiRevenue || 0, actual: totalRevenueActual, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-white', iconColor: 'text-emerald-600' },
                        { label: 'Lợi nhuận dự kiến', value: plannedProfit, actual: actualProfit, icon: Activity, color: actualProfit >= 0 ? 'text-text-main' : 'text-rose-600', bg: 'bg-white', iconColor: 'text-gold-muted' },
                        { label: 'Lợi nhuận ròng', value: plannedProfitAfterTax, actual: actualProfitAfterTax, icon: Wallet, color: actualProfitAfterTax >= 0 ? 'text-text-main' : 'text-rose-600', bg: 'bg-text-main text-white', iconColor: 'text-white' },
                    ].map((c, i) => {
                        const pct = c.value > 0 ? (c.actual / c.value) * 100 : c.actual > 0 ? 100 : 0
                        const status = c.label === 'Doanh thu thực đạt'
                            ? (pct >= 100 ? 'ok' : pct >= 80 ? 'warning' : 'exceeded')
                            : (pct > 100 ? 'exceeded' : pct >= 80 ? 'warning' : 'ok')
                        const isDark = c.bg.includes('main')

                        return (
                            <div key={c.label} className={`p-8 rounded-[40px] border border-gold-light/20 ${c.bg} shadow-luxury group transition-all duration-500 hover:scale-[1.02]`}>
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 duration-500 flex-shrink-0 ${isDark ? 'bg-white/10 text-white' : 'bg-gold-light/20 ' + c.iconColor}`}>
                                        <c.icon size={28} strokeWidth={1.5} />
                                    </div>
                                    <div className="text-left md:text-right whitespace-nowrap flex-shrink-0">
                                        <p className={`text-[10px] font-black uppercase tracking-[0.2em] opacity-40 ${isDark ? 'text-gold-muted' : 'text-text-soft'}`}>{c.label}</p>
                                        <h3 className={`text-2xl font-serif font-bold mt-2 italic tabular-nums ${c.color} ${isDark ? 'text-white' : ''}`}>{fmtVND(c.actual)}</h3>
                                    </div>
                                </div>
                                {c.label !== 'KPI Mục tiêu' && (
                                    <div>
                                        <div className={`relative h-1 w-full rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-black/5'}`}>
                                            <div
                                                className={`absolute h-full rounded-full transition-all duration-1000 ${status === 'ok' ? 'bg-emerald-500' : status === 'warning' ? 'bg-amber-500' : 'bg-rose-500'
                                                    }`}
                                                style={{ width: `${Math.min(Math.max(pct, 0), 100)}%` }}
                                            />
                                        </div>
                                        <div className={`flex justify-between mt-4 text-[9px] font-black uppercase tracking-widest opacity-30 italic ${isDark ? 'text-white' : 'text-text-soft'}`}>
                                            <span>Dự kiến: {fmtVND(c.value)}</span>
                                            <span>{pct.toFixed(0)}%</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}

            {!plan ? (
                <div className="flex flex-col items-center justify-center py-40 bg-beige-soft/30 rounded-[40px] border-2 border-dashed border-gold-light/40">
                    <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center text-gold-muted shadow-sm mb-6">
                        <AlertTriangle size={40} />
                    </div>
                    <h3 className="text-2xl font-serif text-text-main mb-2">Không tìm thấy dữ liệu tài chính</h3>
                    <p className="text-text-soft opacity-60">Dữ liệu kế hoạch cho giai đoạn này chưa được khởi tạo.</p>
                </div>
            ) : (
                <div className="space-y-24">
                    {sections.map(section => (
                        <div key={section} className="animate-fade-in w-full min-w-0">
                            <div className="flex items-center gap-6 mb-10">
                                <div className="h-[1px] flex-1 bg-gold-light/30"></div>
                                <h3 className="text-xs font-black text-gold-muted uppercase tracking-[0.5em] px-4 whitespace-nowrap opacity-60 italic">{SECTION_LABELS[section]}</h3>
                                <div className="h-[1px] flex-1 bg-gold-light/30"></div>
                            </div>

                            <div className="overflow-x-auto luxury-scrollbar w-full max-w-full min-w-0 px-4">
                                <table className="w-full min-w-[1000px] text-left border-separate border-spacing-y-4">
                                    <thead>
                                        <tr className="bg-beige-soft/40">
                                            <th className="px-10 py-8 text-[11px] font-black text-gold-muted/60 uppercase tracking-[0.4em] border-b border-gold-light/10 italic">Danh mục</th>
                                            <th className="px-10 py-8 text-[11px] font-black text-gold-muted/60 uppercase tracking-[0.4em] border-b border-gold-light/10 italic text-center">Ngân sách</th>
                                            <th className="px-10 py-8 text-[11px] font-black text-gold-muted/60 uppercase tracking-[0.4em] border-b border-gold-light/10 italic text-center">Thực tế</th>
                                            <th className="px-10 py-8 text-[11px] font-black text-gold-muted/60 uppercase tracking-[0.4em] border-b border-gold-light/10 italic text-center">Tỷ lệ</th>
                                            <th className="px-10 py-8 text-[11px] font-black text-gold-muted/60 uppercase tracking-[0.4em] border-b border-gold-light/10 italic text-right">Chênh lệch</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rowsBySection(section).map(r => {
                                            const isExceeded = r.status === 'exceeded'
                                            const isWarning = r.status === 'warning'
                                            const isOK = r.status === 'ok'
                                            const isHighlighted = highlightedCat === r.categoryId
                                            const starKey = `${currentUser?.id}:${selectedBranch}|${month}|${year}|${r.categoryId}`
                                            const isStarred = (state.starredAlerts || []).includes(starKey)

                                            return (
                                                <tr
                                                    key={r.categoryId}
                                                    ref={el => { rowRefs.current[r.categoryId] = el }}
                                                    className={`transition-all transform-gpu duration-500 hover:scale-[1.01] relative hover:z-[60] group bg-white shadow-sm h-24 rounded-[28px] ${isHighlighted ? 'bg-rose-50/30' : ''}`}
                                                >
                                                    <td className={`px-10 py-6 border-y-2 border-l-2 border-dashed rounded-l-[28px] transition-colors group-hover:bg-[#9F1D35]/5 ${isHighlighted ? 'border-rose-600/50' : 'border-[#9F1D35]/50'}`}>
                                                        <div className="flex items-center gap-5">
                                                            <button
                                                                onClick={() => toggleStar(r.categoryId)}
                                                                className={`w-8 h-8 rounded-full border border-gold-light/40 flex items-center justify-center transition-all ${isStarred ? 'bg-gold-muted text-white border-gold-muted shadow-md scale-110' : 'text-text-soft opacity-20 hover:opacity-100 hover:scale-110 hover:border-gold-muted hover:text-gold-muted'
                                                                    }`}
                                                            >
                                                                <Star size={14} fill={isStarred ? 'currentColor' : 'none'} />
                                                            </button>
                                                            <div>
                                                                <h4 className="text-[14px] font-bold text-text-main tracking-tight group-hover:text-gold-muted transition-colors text-tight-wrap max-w-[250px]">{r.categoryName}</h4>
                                                                <div className="flex flex-wrap items-center gap-2 mt-1.5 opacity-60">
                                                                    {isOK ? (
                                                                        <span className="flex items-center gap-1.5 text-[9px] font-black text-emerald-600 uppercase tracking-widest whitespace-nowrap">
                                                                            <CheckCircle size={10} className="flex-shrink-0" /> Dòng tiền tối ưu
                                                                        </span>
                                                                    ) : (
                                                                        <span className={`flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest whitespace-nowrap ${isExceeded ? 'text-rose-600' : 'text-amber-600'}`}>
                                                                            <AlertTriangle size={10} className="flex-shrink-0" /> {isExceeded ? 'Vượt định mức' : 'Cảnh báo an toàn'}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className={`px-10 py-6 border-y-2 border-dashed transition-colors group-hover:bg-[#9F1D35]/5 text-center text-[15px] font-serif font-black italic text-blue-600 ${isHighlighted ? 'border-rose-600/50' : 'border-[#9F1D35]/50'}`}>
                                                        {fmtVND(r.planned)}
                                                    </td>
                                                    <td className={`px-10 py-6 border-y-2 border-dashed transition-colors group-hover:bg-[#9F1D35]/5 text-center text-[15px] font-serif font-black italic text-text-main ${isHighlighted ? 'border-rose-600/50' : 'border-[#9F1D35]/50'}`}>
                                                        {fmtVND(r.actual)}
                                                    </td>
                                                    <td className={`px-10 py-6 border-y-2 border-dashed transition-colors group-hover:bg-[#9F1D35]/5 ${isHighlighted ? 'border-rose-600/50' : 'border-[#9F1D35]/50'}`}>
                                                        <div className="flex items-center gap-5 justify-center">
                                                            <div className="h-1.5 w-24 bg-beige-soft rounded-full overflow-hidden flex-shrink-0 relative">
                                                                <div
                                                                    className={`absolute h-full rounded-full transition-all duration-1000 ${isExceeded ? 'bg-rose-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'
                                                                        }`}
                                                                    style={{ width: `${Math.min(r.pct, 100)}%` }}
                                                                />
                                                            </div>
                                                            <span className={`text-[12px] font-black w-8 tabular-nums ${isExceeded ? 'text-rose-600' : isWarning ? 'text-amber-600' : 'text-emerald-600'
                                                                }`}>{r.pct.toFixed(0)}%</span>
                                                        </div>
                                                    </td>
                                                    <td className={`px-10 py-6 border-y-2 border-r-2 border-dashed rounded-r-[28px] transition-colors group-hover:bg-[#9F1D35]/5 text-right text-[15px] font-serif font-black italic force-nowrap ${isHighlighted ? 'border-rose-600/50' : 'border-[#9F1D35]/50'} ${r.isNegativeStatus ? 'text-[#9F1D35]' : 'text-emerald-600'}`}>
                                                        <div className="flex flex-col items-end gap-1">
                                                            <span>{r.isNegativeStatus ? '-' : '+'}{fmtVND(Math.abs(r.remaining))}</span>
                                                            {isExceeded && r.actual > 0 && r.planned > 0 && (
                                                                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-rose-100/50 text-rose-600 text-[9px] font-sans font-black uppercase tracking-widest border border-rose-200/50">
                                                                    Tỷ lệ: {(((r.actual - r.planned) / r.actual) * 100).toFixed(0)}%
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                    {/* Section Sums */}
                                    <tfoot className="bg-transparent">
                                        <tr className="bg-[#9F1D35] text-white shadow-xl h-24 rounded-[28px] overflow-hidden">
                                            <td className="px-10 py-6 border-y-2 border-l-2 border-dashed rounded-l-[28px] border-[#9F1D35] text-[11px] font-black uppercase tracking-[0.4em] italic opacity-80">Tổng cộng {SECTION_LABELS[section]}</td>
                                            <td className="px-10 py-6 border-y-2 border-dashed border-[#9F1D35] text-[22px] font-serif font-black text-center italic text-blue-200">
                                                {fmtVND(rowsBySection(section).reduce((s, r) => s + r.planned, 0))}
                                            </td>
                                            <td className="px-10 py-6 border-y-2 border-dashed border-[#9F1D35] text-[22px] font-serif font-black text-center italic text-white/90">
                                                {fmtVND(rowsBySection(section).reduce((s, r) => s + r.actual, 0))}
                                            </td>
                                            <td className="px-10 py-6 border-y-2 border-dashed border-[#9F1D35]"></td>
                                            <td className="px-10 py-6 border-y-2 border-r-2 border-dashed rounded-r-[22px] border-[#9F1D35] text-right font-serif font-black text-[22px] italic">
                                                {fmtVND(rowsBySection(section).reduce((s, r) => s + r.remaining, 0))}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    ))}

                    {/* Financial Health by Account */}
                    <div className="animate-fade-in pt-12">
                        <div className="flex items-center gap-4 mb-10">
                            <div className="w-12 h-12 rounded-2xl bg-gold-light/30 flex items-center justify-center text-gold-muted shadow-sm">
                                <Database size={24} strokeWidth={1.5} />
                            </div>
                            <h3 className="text-xl font-serif font-bold italic text-text-main leading-tight">Tổng quan tài chính <span className="italic font-normal text-gold-muted opacity-80">theo Tài khoản</span></h3>
                        </div>

                        <div className="overflow-x-auto luxury-scrollbar px-4 pb-4">
                            <table className="w-full min-w-[1000px] text-left border-separate border-spacing-y-4">
                                <thead>
                                    <tr className="bg-beige-soft/40">
                                        <th className="px-10 py-8 text-[11px] font-black text-gold-muted/60 uppercase tracking-[0.4em] border-b border-gold-light/10 italic text-center">Tài khoản tài sản</th>
                                        <th className="px-10 py-8 text-[11px] font-black text-gold-muted/60 uppercase tracking-[0.4em] border-b border-gold-light/10 italic text-center">Loại hình</th>
                                        <th className="px-10 py-8 text-[11px] font-black text-gold-muted/60 uppercase tracking-[0.4em] border-b border-gold-light/10 italic text-center">Tổng dòng thu (+)</th>
                                        <th className="px-10 py-8 text-[11px] font-black text-gold-muted/60 uppercase tracking-[0.4em] border-b border-gold-light/10 italic text-center">Tổng dòng chi (-)</th>
                                        <th className="px-10 py-8 text-[11px] font-black text-gold-muted/60 uppercase tracking-[0.4em] border-b border-gold-light/10 italic text-right">Biến động ròng</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {state.accounts.filter(a => !a.branchId || a.branchId === selectedBranch).map(acc => {
                                        const txs = state.transactions.filter(tx => {
                                            if (tx.paymentAccountId !== acc.id) return false

                                            if (useDateFilter && fromDate && toDate) {
                                                const txDate = tx.date.split('T')[0]
                                                return txDate >= fromDate && txDate <= toDate
                                            } else {
                                                return new Date(tx.date).getFullYear() === year &&
                                                    new Date(tx.date).getMonth() + 1 === month
                                            }
                                        })
                                        const income = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
                                        const expense = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
                                        if (income === 0 && expense === 0) return null
                                        const net = income - expense
                                        return (
                                            <tr key={acc.id} className="transition-all transform-gpu duration-500 hover:scale-[1.01] relative hover:z-[60] group bg-white shadow-sm h-24 rounded-[28px]">
                                                <td className="px-10 py-6 border-y-2 border-l-2 border-dashed rounded-l-[28px] border-[#9F1D35]/50 group-hover:bg-[#9F1D35]/5 transition-colors text-center">
                                                    <span className="text-[14px] font-black text-text-main tracking-tight uppercase">{acc.name}</span>
                                                </td>
                                                <td className="px-10 py-6 border-y-2 border-dashed border-[#9F1D35]/50 group-hover:bg-[#9F1D35]/5 transition-colors text-center">
                                                    <span className="inline-flex items-center px-4 py-1.5 rounded-full bg-beige-soft text-gold-muted text-[10px] font-black uppercase tracking-widest border border-gold-light/20 italic">
                                                        {acc.type === 'bank' ? 'Thanh khoản: Ngân hàng' : acc.type === 'cash' ? 'Thanh khoản: Tiền mặt' : 'Thanh khoản: POS'}
                                                    </span>
                                                </td>
                                                <td className="px-10 py-6 border-y-2 border-dashed border-[#9F1D35]/50 group-hover:bg-[#9F1D35]/5 transition-colors text-center text-[18px] font-serif font-black text-blue-600 tabular-nums italic">
                                                    {income > 0 ? `+${fmtVND(income)}` : '—'}
                                                </td>
                                                <td className="px-10 py-6 border-y-2 border-dashed border-[#9F1D35]/50 group-hover:bg-[#9F1D35]/5 transition-colors text-center text-[18px] font-serif font-black text-[#9F1D35] tabular-nums italic">
                                                    {expense > 0 ? `-${fmtVND(expense)}` : '—'}
                                                </td>
                                                <td className={`px-10 py-6 border-y-2 border-r-2 border-dashed rounded-r-[28px] border-[#9F1D35]/50 group-hover:bg-[#9F1D35]/5 transition-colors text-right text-[22px] font-serif font-black italic tabular-nums ${net >= 0 ? 'text-emerald-600' : 'text-[#9F1D35]'}`}>
                                                    {net > 0 ? '+' : ''}{fmtVND(net)}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
