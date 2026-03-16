'use client'
import React, { useState, useMemo } from 'react'
import { useApp, canEditPlan, canViewAllBranches } from '@/lib/auth'
import { recalcPlan, fmtVND } from '@/lib/utils/calculations'
import { savePlan } from '@/lib/storage'
import { useModal } from '@/components/layout/ModalProvider'
import { useToast } from '@/components/layout/ToastProvider'
import { MonthlyPlan } from '@/lib/types'
import { Save, Copy, Trash2, FileEdit, CheckCircle2, FileText } from 'lucide-react'
import PageHeader from '@/components/layout/PageHeader'

const MONTH_NAMES = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12']
const SECTION_LABELS: Record<string, string> = {
    revenue: '💰 A. CHI TIẾT DOANH THU',
    fixed_cost: '🏢 B1. Chi phí cố định',
    variable_cost: '💼 B2. Chi phí biến động',
    fund: '🏦 C. Quỹ',
}

// Format a number with thousand separators, no decimals
export function fmtNum(v: number) {
    if (v === 0) return ''
    return v.toLocaleString('vi-VN').replace(/,/g, '.')
}
// Parse a dot/comma-formatted string back to number
export function parseNum(s: string) {
    return Number(s.replace(/[^0-9]/g, '')) || 0
}

/** Money input: shows formatted with thousand separators real-time */
export function MoneyInput({
    value, onChange, readOnly, style, className = 'number-input'
}: { value: number; onChange: (v: number) => void; readOnly?: boolean; style?: React.CSSProperties; className?: string }) {
    const [isEditing, setIsEditing] = useState(false)
    const displayValue = value ? fmtNum(value) : (isEditing ? '' : '0')

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
        const raw = e.target.value.replace(/[^0-9]/g, '')
        const num = Number(raw) || 0
        onChange(num)
    }

    if (!isEditing && !readOnly) {
        return (
            <div
                onClick={() => setIsEditing(true)}
                style={{
                    cursor: 'pointer',
                    padding: '12px 16px',
                    borderRadius: '12px',
                    border: '1px solid rgba(197, 160, 89, 0.1)',
                    textAlign: 'right',
                    fontSize: '1rem',
                    fontWeight: 800,
                    minWidth: '120px',
                    transition: 'all 0.15s',
                    background: 'white',
                    ...style
                }}
                onMouseOver={e => (e.currentTarget.style.background = '#f9fafb')}
                onMouseOut={e => (e.currentTarget.style.background = 'white')}
            >
                {fmtVND(value)}
            </div>
        )
    }

    return (
        <input
            className={className}
            type="text"
            inputMode="numeric"
            readOnly={readOnly}
            autoFocus
            value={displayValue}
            placeholder="0"
            maxLength={15}
            onChange={handleChange}
            onBlur={() => setIsEditing(false)}
            onKeyDown={e => e.key === 'Enter' && setIsEditing(false)}
            style={{
                minWidth: 0,
                padding: '12px 16px',
                textAlign: 'right',
                outline: 'none',
                fontSize: '1rem',
                fontWeight: 800,
                borderRadius: '12px',
                border: '1px solid #C5A059',
                boxShadow: '0 0 0 4px rgba(197, 160, 89, 0.1)',
                ...style
            }}
        />
    )
}

/** Compact % input: small fixed-width box + % suffix */
function PctInput({
    value, onChange, readOnly, min = 0, max = 200, step = 0.01,
}: { value: number; onChange: (v: number) => void; readOnly?: boolean; min?: number; max?: number; step?: number }) {
    const [focused, setFocused] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [raw, setRaw] = useState('')

    const display = value === 0 ? '0' : value.toFixed(2).replace(/\.?0+$/, '')

    function handleFocus() { setRaw(display); setFocused(true) }
    function handleBlur() {
        const v = parseFloat(raw) || 0
        onChange(Math.min(max, Math.max(min, v)) / 100)
        setFocused(false)
        setIsEditing(false)
    }

    if (!isEditing && !readOnly) {
        return (
            <div
                onClick={() => { setIsEditing(true); setRaw(display); }}
                style={{
                    cursor: 'pointer',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    textAlign: 'center',
                    background: '#f8fafc',
                    border: '1px solid rgba(226, 232, 240, 0.8)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '2px',
                    transition: 'all 0.2s'
                }}
                onMouseOver={e => e.currentTarget.style.borderColor = '#C5A059'}
                onMouseOut={e => e.currentTarget.style.borderColor = 'rgba(226, 232, 240, 0.8)'}
            >
                {display}<span style={{ fontSize: '0.8rem', color: '#64748b' }}>%</span>
            </div>
        )
    }

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <input
                type="text" inputMode="decimal"
                readOnly={readOnly}
                autoFocus
                value={focused ? raw : display}
                placeholder="0"
                onChange={e => setRaw(e.target.value.replace(/[^0-9.]/g, ''))}
                onFocus={handleFocus}
                onBlur={handleBlur}
                onKeyDown={e => e.key === 'Enter' && handleBlur()}
                style={{
                    width: 65, padding: '8px 10px', border: '1.5px solid #C5A059',
                    borderRadius: 8, background: 'white',
                    fontSize: '0.95rem', textAlign: 'right', outline: 'none',
                    fontVariantNumeric: 'tabular-nums',
                    fontWeight: 700,
                    boxShadow: '0 0 0 3px rgba(197, 160, 89, 0.1)',
                }}
            />
            <span style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600, lineHeight: 1 }}>%</span>
        </div>
    )
}

export default function PlanningPage() {
    const { currentUser, state, saveState } = useApp()
    const now = new Date()
    const [year, setYear] = useState(now.getFullYear())
    const [month, setMonth] = useState(now.getMonth() + 1)
    const [branchId, setBranchId] = useState(
        canViewAllBranches(currentUser) ? (state.branches.find(b => b.type !== 'hq' && !b.isHeadquarter)?.id ?? '') : currentUser?.branchId ?? ''
    )
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)

    const visibleBranches = canViewAllBranches(currentUser)
        ? state.branches.filter(b => b.type !== 'hq' && !b.isHeadquarter)
        : state.branches.filter(b => b.id === currentUser?.branchId)

    const rawPlan = useMemo(() =>
        state.plans.find(p => p.branchId === branchId && p.year === year && p.month === month)
        , [state.plans, branchId, year, month])

    const plan = useMemo(() => {
        if (!rawPlan) return null
        const missingCats = state.categories.filter(c => !c.isHidden && !rawPlan.categoryPlans.some(cp => cp.categoryId === c.id))
        if (missingCats.length === 0) return rawPlan

        return recalcPlan({
            ...rawPlan,
            categoryPlans: [
                ...rawPlan.categoryPlans,
                ...missingCats.map(c => ({
                    categoryId: c.id,
                    rate: c.defaultRate,
                    plannedAmount: 0,
                    alertThreshold: 0.8,
                    disabled: false
                }))
            ]
        })
    }, [rawPlan, state.categories])

    const [localPlan, setLocalPlan] = useState<MonthlyPlan | null>(null)
    const activePlan = localPlan ?? plan
    const canEdit = canEditPlan(currentUser)
    const { showAlert, showConfirm } = useModal()
    const { showToast } = useToast()

    function initNewPlan() {
        const newPlan: MonthlyPlan = {
            id: `plan-${branchId}-${year}-${month}`,
            branchId, year, month,
            kpiRevenue: 0,
            taxRate: 0.20,
            categoryPlans: state.categories.filter(c => !c.isHidden)
                .map(cat => ({ categoryId: cat.id, rate: cat.defaultRate, plannedAmount: 0, alertThreshold: 0.8, disabled: false })),
            createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        }
        setLocalPlan(newPlan); return newPlan
    }

    async function copyFromPrevMonth() {
        const prevMonth = month === 1 ? 12 : month - 1
        const prevYear = month === 1 ? year - 1 : year
        const prev = state.plans.find(p => p.branchId === branchId && p.year === prevYear && p.month === prevMonth)
        if (!prev) { await showAlert('Không tìm thấy kế hoạch tháng trước'); return }
        setLocalPlan({ ...prev, id: `plan-${branchId}-${year}-${month}`, year, month, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
    }

    function updateKPI(val: number) {
        const base = activePlan ?? initNewPlan()
        setLocalPlan(recalcPlan({ ...base, kpiRevenue: val }))
    }

    function updateTaxRate(val: number) {
        const base = activePlan ?? initNewPlan()
        setLocalPlan({ ...base, taxRate: val, updatedAt: new Date().toISOString() })
    }

    function updateCategoryPlan(categoryId: string, field: 'rate' | 'fixedAmount' | 'alertThreshold' | 'disabled', value: number | boolean) {
        if (!activePlan) return
        setLocalPlan(recalcPlan({ ...activePlan, categoryPlans: activePlan.categoryPlans.map(cp => cp.categoryId === categoryId ? { ...cp, [field]: value } : cp) }))
    }

    async function handleSave() {
        if (!activePlan) return
        setSaving(true)
        await new Promise(r => setTimeout(r, 200))

        try {
            const planToSave = recalcPlan(activePlan)
            saveState(savePlan(planToSave))
            import('@/lib/storage').then(m => m.syncPlan(planToSave, currentUser?.id).then(log => {
                if (log) {
                    saveState(s => ({ ...s, activityLogs: [log, ...(s.activityLogs || [])].slice(0, 200) }))
                }
            }))

            showToast('Đã lưu kế hoạch', `Kế hoạch tháng ${planToSave.month}/${planToSave.year} đã được cập nhật`)
            setSaved(true)
            setTimeout(() => setSaved(false), 2000)
        } catch (e) {
            console.error(e)
            await showAlert('Lỗi khi lưu kế hoạch')
        } finally {
            setSaving(false)
        }
    }

    const categoriesBySection = (section: string) =>
        state.categories.filter(c => c.section === section && !c.isHidden).sort((a, b) => a.sortOrder - b.sortOrder)

    const totalPlannedCost = activePlan?.categoryPlans
        .filter(cp => !cp.disabled)
        .filter(cp => state.categories.find(c => c.id === cp.categoryId)?.section !== 'revenue')
        .reduce((s, cp) => s + cp.plannedAmount, 0) ?? 0

    const plannedProfit = (activePlan?.kpiRevenue ?? 0) - totalPlannedCost
    const taxAmount = plannedProfit > 0 ? plannedProfit * (activePlan?.taxRate ?? 0) : 0
    const profitAfterTax = plannedProfit - taxAmount

    const getSectionTotal = (section: string) => {
        if (!activePlan) return 0
        return activePlan.categoryPlans
            .filter(cp => !cp.disabled)
            .filter(cp => state.categories.find(c => c.id === cp.categoryId)?.section === section)
            .reduce((s, cp) => s + cp.plannedAmount, 0)
    }

    return (
        <div className="page-container">
            <PageHeader
                icon={FileText}
                title="Lập kế hoạch"
                subtitle="Tài chính"
                description="Thiết lập mục tiêu doanh thu & Định mức chi phí"
                actions={
                    <div className="flex gap-4">
                        {canEdit && !plan && (
                            <button className="flex items-center gap-2 bg-white border border-gold-light text-gold-muted px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-sm hover:bg-gold-light transition-all active:scale-95" onClick={copyFromPrevMonth}>
                                <Copy size={14} strokeWidth={1.5} /> Sao chép tháng trước
                            </button>
                        )}
                        {canEdit && (localPlan || !plan) && (
                            <button className="flex items-center gap-2 bg-gold-muted text-white px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-gold-muted/20 hover:bg-gold-muted/90 transition-all active:scale-95 disabled:opacity-50" onClick={handleSave} disabled={saving}>
                                {saving ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <Save size={16} strokeWidth={1.5} />}
                                {saved ? 'Đã lưu hệ thống' : 'Lưu kế hoạch'}
                            </button>
                        )}
                    </div>
                }
            />

            <div className="px-10 py-12 pb-32 max-w-[1200px] mx-auto animate-fade-in space-y-12">
                {/* Selectors */}
                <div className="flex flex-wrap items-center gap-6 bg-white p-6 rounded-[32px] border border-gold-light/20 shadow-luxury">
                    <div className="flex-1 min-w-[200px] flex items-center gap-4">
                        <span className="text-[10px] font-black uppercase tracking-widest text-text-soft/60">Cơ cấu:</span>
                        <div className="flex-1">
                            <select className="w-full bg-beige-soft/30 border-2 border-transparent py-3 px-4 rounded-xl text-sm font-bold focus:bg-white focus:border-gold-light/30 transition-all outline-none" value={branchId}
                                onChange={e => { setBranchId(e.target.value); setLocalPlan(null) }}
                                disabled={!canViewAllBranches(currentUser)}>
                                {visibleBranches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-[10px] font-black uppercase tracking-widest text-text-soft/60">Thời gian:</span>
                        <select className="bg-beige-soft/30 border-2 border-transparent py-3 px-4 rounded-xl text-sm font-bold focus:bg-white focus:border-gold-light/30 transition-all outline-none" value={month} onChange={e => { setMonth(+e.target.value); setLocalPlan(null) }}>
                            {MONTH_NAMES.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                        </select>
                        <select className="bg-beige-soft/30 border-2 border-transparent py-3 px-4 rounded-xl text-sm font-bold focus:bg-white focus:border-gold-light/30 transition-all outline-none" value={year} onChange={e => { setYear(+e.target.value); setLocalPlan(null) }}>
                            {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>
                </div>

                {/* Summary cards */}
                {activePlan && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[
                            { label: 'KPI Target Revenue', value: activePlan.kpiRevenue, color: 'text-text-main', icon: Save },
                            { label: 'Expectation Profit', value: plannedProfit, color: plannedProfit >= 0 ? 'text-emerald-600' : 'text-rose-600', icon: CheckCircle2 },
                            { label: 'Net Profit After Tax', value: profitAfterTax, color: profitAfterTax >= 0 ? 'text-gold-muted' : 'text-rose-600', icon: FileEdit },
                        ].map(c => (
                            <div key={c.label} className="bg-white border border-gold-light/20 rounded-[40px] p-8 shadow-luxury group hover:border-gold-muted/30 transition-all overflow-hidden relative">
                                <div className="absolute top-0 left-0 w-full h-1 bg-beige-soft group-hover:bg-gold-light transition-colors" />
                                <div className="text-[10px] font-black text-text-soft/60 uppercase tracking-[0.2em] mb-4">{c.label}</div>
                                <div className={`text-[32px] font-serif font-bold tracking-tighter ${c.color} leading-none`}>{fmtVND(c.value)}</div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Planning table */}
                <div className="bg-white border border-gold-light/20 rounded-[32px] shadow-luxury overflow-hidden">
                    {!activePlan && !plan ? (
                        <div className="p-20 text-center space-y-8 bg-white/50">
                            <div className="w-20 h-20 bg-beige-soft rounded-3xl flex items-center justify-center mx-auto opacity-30">
                                <FileEdit size={32} strokeWidth={1} />
                            </div>
                            <div className="space-y-2">
                                <p className="text-[11px] font-black uppercase tracking-[0.3em] text-text-soft opacity-40">Chưa có kế hoạch tài chính cho tháng này</p>
                                <p className="text-[13px] font-serif italic text-text-soft/60">Vui lòng khởi tạo hoặc sao chép từ tháng trước để bắt đầu</p>
                            </div>
                            {canEdit && (
                                <button className="bg-gold-muted text-white px-10 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-lg shadow-gold-muted/20 hover:bg-gold-muted/90 transition-all active:scale-95" onClick={initNewPlan}>
                                    Khởi tạo kế hoạch mới
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-separate border-spacing-0">
                                <thead>
                                    <tr className="bg-beige-soft/30">
                                        <th className="px-8 py-5 text-[10px] font-black text-text-soft/60 uppercase tracking-[0.3em] border-b border-gold-light/10">Khoản mục tài chính</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-text-soft/60 uppercase tracking-[0.3em] border-b border-gold-light/10 text-center">Định mức (%)</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-text-soft/60 uppercase tracking-[0.3em] border-b border-gold-light/10 text-right">Số tiền dự tính</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-text-soft/60 uppercase tracking-[0.3em] border-b border-gold-light/10 text-center">Ngưỡng cảnh báo</th>
                                        <th className="px-8 py-5 text-center border-b border-gold-light/10">Dùng</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr className="bg-gold-light/5">
                                        <td colSpan={5} className="px-8 py-3 text-[10px] font-black text-gold-muted uppercase tracking-[0.4em]">KPI DOANH THU MỤC TIÊU</td>
                                    </tr>
                                    <tr className="group hover:bg-beige-soft/20 transition-all border-b border-gold-light/5">
                                        <td className="px-8 py-6">
                                            <div className="text-[14px] font-bold text-text-main">Mục tiêu doanh thu chi nhánh</div>
                                            <p className="text-[10px] text-text-soft/40 italic uppercase tracking-widest mt-1">Tổng doanh thu kỳ vọng từ mọi nguồn</p>
                                        </td>
                                        <td className="px-8 py-6 text-center text-text-soft/20">—</td>
                                        <td className="px-8 py-6 text-right">
                                            <MoneyInput value={activePlan?.kpiRevenue ?? 0} onChange={updateKPI} readOnly={!canEdit}
                                                style={{ fontSize: '1.4rem', fontWeight: 900, color: '#C5A059', background: 'white', border: '1.5px solid rgba(197, 160, 89, 0.3)', borderRadius: '16px', padding: '16px 24px' }} />
                                        </td>
                                        <td colSpan={2} className="px-8 py-6 text-center text-text-soft/20">—</td>
                                    </tr>
                                    {activePlan && (
                                        <tr className="group hover:bg-beige-soft/20 transition-all border-b border-gold-light/5">
                                            <td className="px-8 py-6">
                                                <div className="text-[13px] font-bold text-text-soft">Thuế thu nhập doanh nghiệp (CIT)</div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex justify-center">
                                                    <PctInput
                                                        value={(activePlan?.taxRate ?? 0) * 100}
                                                        onChange={v => updateTaxRate(v)}
                                                        readOnly={!canEdit}
                                                    />
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-right font-black text-text-main text-[14px]">
                                                {fmtVND(taxAmount)}
                                            </td>
                                            <td colSpan={2} />
                                        </tr>
                                    )}

                                    {(['revenue', 'fixed_cost', 'variable_cost', 'fund'] as const).map(section => (
                                        <React.Fragment key={section}>
                                            <tr className="bg-beige-soft/30" key={`sec-${section}`}>
                                                <td colSpan={2} className="px-8 py-3 text-[10px] font-black text-text-main uppercase tracking-[0.4em]">{SECTION_LABELS[section]}</td>
                                                <td className="px-8 py-3 text-right text-[10px] font-black text-gold-muted uppercase tracking-widest">
                                                    Dự chi: {fmtVND(getSectionTotal(section))}
                                                </td>
                                                <td colSpan={2} />
                                            </tr>
                                            {categoriesBySection(section).map(cat => {
                                                const cp = activePlan?.categoryPlans.find(p => p.categoryId === cat.id)
                                                if (!cp) return null
                                                return (
                                                    <tr key={cat.id} className={`group hover:bg-beige-soft/10 transition-all ${cp.disabled ? 'opacity-30 italic' : ''}`}>
                                                        <td className="px-8 py-5">
                                                            <div className="flex items-center gap-3">
                                                                <span className="text-[13px] font-bold text-text-main">{cat.name}</span>
                                                                {cat.isRateBased && (
                                                                    <span className="text-[8px] font-black bg-gold-light/20 text-gold-muted border border-gold-light px-2 py-0.5 rounded-md uppercase tracking-tighter">Tự động</span>
                                                                )}
                                                            </div>
                                                        </td>

                                                        <td className="px-8 py-5">
                                                            {cat.isRateBased ? (
                                                                <div className="flex justify-center">
                                                                    <PctInput
                                                                        value={(cp.rate ?? 0) * 100}
                                                                        onChange={v => updateCategoryPlan(cat.id, 'rate', v)}
                                                                        readOnly={!canEdit || cp.disabled}
                                                                        max={200}
                                                                    />
                                                                </div>
                                                            ) : (
                                                                <div className="text-center text-text-soft/20 text-[10px]">—</div>
                                                            )}
                                                        </td>

                                                        <td className="px-8 py-5 text-right">
                                                            {cat.isRateBased ? (
                                                                <span className="text-[14px] font-black text-text-main opacity-80">{fmtVND(cp.plannedAmount)}</span>
                                                            ) : (
                                                                <MoneyInput
                                                                    value={cp.fixedAmount ?? 0}
                                                                    onChange={v => updateCategoryPlan(cat.id, 'fixedAmount', v)}
                                                                    readOnly={!canEdit || cp.disabled}
                                                                    style={{ background: 'white', border: '1px solid rgba(197, 160, 89, 0.15)', borderRadius: '12px', padding: '10px 14px' }}
                                                                />
                                                            )}
                                                        </td>

                                                        <td className="px-8 py-5">
                                                            <div className="flex justify-center">
                                                                <PctInput
                                                                    value={cp.alertThreshold * 100}
                                                                    onChange={v => updateCategoryPlan(cat.id, 'alertThreshold', v)}
                                                                    readOnly={!canEdit || cp.disabled}
                                                                    min={10} max={100} step={5}
                                                                />
                                                            </div>
                                                        </td>

                                                        <td className="px-8 py-5">
                                                            <div className="flex justify-center">
                                                                <input
                                                                    type="checkbox"
                                                                    className="w-5 h-5 cursor-pointer accent-gold-muted transition-all"
                                                                    checked={!cp.disabled}
                                                                    onChange={(e) => updateCategoryPlan(cat.id, 'disabled', !e.target.checked)}
                                                                    disabled={!canEdit}
                                                                />
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </React.Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
