'use client'
import { useState, useMemo } from 'react'
import { useApp, canViewAllBranches, isTransactionRelatedToBranch } from '@/lib/auth'
import { buildAlerts, buildCashFlowRows, fmtVND } from '@/lib/utils/calculations'
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Activity, Target, CreditCard, Wallet, Landmark, LayoutDashboard } from 'lucide-react'
import { calculateAccountBalances } from '@/lib/utils/calculations'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import PageHeader from '@/components/layout/PageHeader'

const MONTHS = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12']

export default function DashboardPage() {
    const { currentUser, state } = useApp()
    const router = useRouter()
    const [selectedBranch, setSelectedBranch] = useState<string>(
        canViewAllBranches(currentUser) ? '' : currentUser?.branchId ?? ''
    )
    const now = new Date()
    const [year, setYear] = useState(now.getFullYear())
    const [month, setMonth] = useState(now.getMonth() + 1)

    const effectiveBranch = canViewAllBranches(currentUser) ? selectedBranch : currentUser?.branchId

    const allAlerts = useMemo(() =>
        buildAlerts(state.plans, state.categories, state.transactions, state.branches)
            .filter(a => !effectiveBranch || a.branchId === effectiveBranch)
        , [state, effectiveBranch])

    const visibleBranches = canViewAllBranches(currentUser)
        ? state.branches.filter(b => b.type !== 'hq' && !b.isHeadquarter)
        : state.branches.filter(b => b.id === currentUser?.branchId)

    const filteredPlans = state.plans.filter(p =>
        p.year === year && p.month === month &&
        (!effectiveBranch || p.branchId === effectiveBranch)
    )

    const totalKPI = filteredPlans.reduce((s, p) => s + p.kpiRevenue, 0)

    const totalActualRevenue = useMemo(() => state.transactions
        .filter(tx => {
            if (tx.type !== 'income') return false
            const d = new Date(tx.date)
            if (d.getFullYear() !== year || d.getMonth() + 1 !== month) return false
            if (effectiveBranch && !isTransactionRelatedToBranch(tx, effectiveBranch, state.accounts)) return false

            if (!canViewAllBranches(currentUser) && !currentUser?.viewBranchTransactionsFromHQ) {
                const creator = state.users.find(u => u.id === tx.createdBy)
                if (creator && (creator.departmentType === 'hq' || creator.departmentType === 'admin' || creator.role === 'admin')) return false
            }
            return true
        })
        .reduce((s, tx) => s + tx.amount, 0), [state.transactions, state.accounts, state.users, year, month, effectiveBranch, currentUser])

    const totalActualExpense = useMemo(() => state.transactions
        .filter(tx => {
            if (tx.type !== 'expense') return false
            const d = new Date(tx.date)
            if (d.getFullYear() !== year || d.getMonth() + 1 !== month) return false
            if (effectiveBranch && !isTransactionRelatedToBranch(tx, effectiveBranch, state.accounts)) return false

            if (!canViewAllBranches(currentUser) && !currentUser?.viewBranchTransactionsFromHQ) {
                const creator = state.users.find(u => u.id === tx.createdBy)
                if (creator && (creator.departmentType === 'hq' || creator.departmentType === 'admin' || creator.role === 'admin')) return false
            }
            return true
        })
        .reduce((s, tx) => s + tx.amount, 0), [state.transactions, state.accounts, state.users, year, month, effectiveBranch, currentUser])

    const revenuePct = totalKPI > 0 ? (totalActualRevenue / totalKPI * 100) : 0

    const accountBalances = useMemo(() => calculateAccountBalances(state), [state])
    const visibleAccounts = useMemo(() => {
        if (canViewAllBranches(currentUser)) return state.accounts
        return state.accounts.filter(a => !a.branchId || a.branchId === currentUser?.branchId)
    }, [state.accounts, currentUser])

    return (
        <div className="page-container px-4 md:px-[1%]">
            <PageHeader
                icon={LayoutDashboard}
                title="Bảng điều khiển"
                subtitle="Tổng quan"
                description="Business Intelligence & Hiệu suất tài chính"
                actions={
                    <div className="flex items-center gap-3 bg-white/60 backdrop-blur-md p-1.5 rounded-[20px] border border-gold-light/30 shadow-luxury transition-all hover:bg-white hover:border-gold-muted/30">
                        {canViewAllBranches(currentUser) && (
                            <div className="flex items-center gap-2 pl-4">
                                <span className="text-[9px] font-black text-text-soft uppercase tracking-widest opacity-50">Chi nhánh:</span>
                                <select
                                    className="bg-transparent border-none text-[12px] font-bold text-text-main py-2 px-3 focus:ring-0 cursor-pointer hover:text-gold-muted transition-colors"
                                    value={selectedBranch}
                                    onChange={e => setSelectedBranch(e.target.value)}
                                >
                                    <option value="">Toàn hệ thống</option>
                                    {visibleBranches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                </select>
                            </div>
                        )}
                        <div className="flex items-center gap-2 px-4 border-l border-gold-light/20">
                            <span className="text-[9px] font-black text-text-soft uppercase tracking-widest opacity-50">Kỳ báo cáo:</span>
                            <div className="flex items-center gap-1">
                                <select
                                    className="bg-transparent border-none text-[12px] font-bold text-text-main py-2 pl-2 pr-1 focus:ring-0 cursor-pointer hover:text-gold-muted transition-colors"
                                    value={month}
                                    onChange={e => setMonth(+e.target.value)}
                                >
                                    {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                                </select>
                                <select
                                    className="bg-transparent border-none text-[12px] font-bold text-text-main py-2 pl-1 pr-2 focus:ring-0 cursor-pointer hover:text-gold-muted transition-colors"
                                    value={year}
                                    onChange={e => setYear(+e.target.value)}
                                >
                                    {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                }
            />

            <div className="py-8 pb-20">
                {/* KPI Stats Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6 mb-10">
                    {/* Stat Item: KPI */}
                    <div className="bg-white p-8 rounded-[32px] border border-gold-light/20 shadow-luxury group hover:border-gold-muted/30 transition-all duration-500">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-beige-soft text-gold-muted flex items-center justify-center transition-transform group-hover:scale-110 duration-500 flex-shrink-0">
                                <Target size={28} strokeWidth={1.5} />
                            </div>
                            <div className="text-left md:text-right whitespace-nowrap flex-shrink-0">
                                <p className="text-[10px] font-bold text-text-soft uppercase tracking-widest opacity-60">KPI Mục tiêu</p>
                                <h3 className="text-xl font-serif font-bold text-text-main mt-1 italic">{fmtVND(totalKPI)}</h3>
                            </div>
                        </div>
                        <div className="relative h-1.5 w-full bg-beige-soft rounded-full overflow-hidden">
                            <div
                                className={`absolute top-0 left-0 h-full transition-all duration-1000 ease-out rounded-full ${revenuePct >= 100 ? 'bg-emerald-500' : revenuePct >= 80 ? 'bg-amber-500' : 'bg-rose-500'}`}
                                style={{ width: `${Math.min(revenuePct, 100)}%` }}
                            />
                        </div>
                    </div>

                    {/* Stat Item: Actual Revenue */}
                    <div className="bg-white p-8 rounded-[32px] border border-gold-light/20 shadow-luxury group hover:border-gold-muted/30 transition-all duration-500">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center transition-transform group-hover:scale-110 duration-500 flex-shrink-0">
                                <TrendingUp size={28} strokeWidth={1.5} />
                            </div>
                            <div className="text-left md:text-right whitespace-nowrap flex-shrink-0">
                                <p className="text-[10px] font-bold text-text-soft uppercase tracking-widest opacity-60">Doanh thu thực tế</p>
                                <h3 className="text-xl font-serif font-bold text-emerald-600 mt-1 italic">{fmtVND(totalActualRevenue)}</h3>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[11px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg">
                                {revenuePct.toFixed(1)}%
                            </span>
                            <span className="text-[10px] font-bold text-text-soft uppercase tracking-widest opacity-40">Đạt được</span>
                        </div>
                    </div>

                    {/* Stat Item: Expenses */}
                    <div className="bg-white p-8 rounded-[32px] border border-gold-light/20 shadow-luxury group hover:border-gold-muted/30 transition-all duration-500">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center transition-transform group-hover:scale-110 duration-500 flex-shrink-0">
                                <TrendingDown size={28} strokeWidth={1.5} />
                            </div>
                            <div className="text-left md:text-right whitespace-nowrap flex-shrink-0">
                                <p className="text-[10px] font-bold text-text-soft uppercase tracking-widest opacity-60">Tổng chi phí</p>
                                <h3 className="text-xl font-serif font-bold text-rose-600 mt-1 italic">{fmtVND(totalActualExpense)}</h3>
                            </div>
                        </div>
                        <p className="text-[10px] font-bold text-text-soft uppercase tracking-widest opacity-40 italic">Dòng tiền chi ra</p>
                    </div>

                    {/* Stat Item: Net Profit */}
                    <div className="bg-white p-8 rounded-[32px] border border-gold-light/20 shadow-luxury group hover:border-gold-muted/30 transition-all duration-500">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-gold-muted text-white flex items-center justify-center transition-transform group-hover:scale-110 duration-500 shadow-lg shadow-gold-muted/20 flex-shrink-0">
                                <Activity size={28} strokeWidth={1.5} />
                            </div>
                            <div className="text-left md:text-right whitespace-nowrap flex-shrink-0">
                                <p className="text-[10px] font-bold text-text-soft uppercase tracking-widest opacity-60">Lợi nhuận gộp</p>
                                <h3 className={`text-xl font-serif font-bold mt-1 italic ${totalActualRevenue - totalActualExpense >= 0 ? 'text-gold-muted' : 'text-rose-600'}`}>
                                    {fmtVND(totalActualRevenue - totalActualExpense)}
                                </h3>
                            </div>
                        </div>
                        <p className="text-[10px] font-bold text-text-soft uppercase tracking-widest opacity-40 italic">Lợi nhuận trước thuế</p>
                    </div>
                </div>

                {/* Branch overview Luxury Table */}
                {visibleBranches.length > 0 && (
                    <div className="mb-12">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-10 h-10 rounded-xl bg-beige-soft flex items-center justify-center text-gold-muted">
                                <Landmark size={20} strokeWidth={1.5} />
                            </div>
                            <h3 className="text-xl font-serif font-bold text-text-main italic">Hiệu năng theo Chi nhánh</h3>
                        </div>

                        <div className="overflow-x-auto luxury-scrollbar w-full max-w-full min-w-0">
                            <table className="w-full min-w-[1000px] text-left border-separate border-spacing-y-4">
                                <thead>
                                    <tr className="bg-beige-soft/40">
                                        <th className="px-8 py-8 text-[11px] font-black text-gold-muted/60 uppercase tracking-[0.4em] border-b border-gold-light/10 italic text-center">Chi nhánh</th>
                                        <th className="px-8 py-8 text-[11px] font-black text-gold-muted/60 uppercase tracking-[0.4em] border-b border-gold-light/10 italic text-center">KPI Mục tiêu</th>
                                        <th className="px-8 py-8 text-[11px] font-black text-gold-muted/60 uppercase tracking-[0.4em] border-b border-gold-light/10 italic text-center">Thực đạt</th>
                                        <th className="px-8 py-8 text-[11px] font-black text-gold-muted/60 uppercase tracking-[0.4em] border-b border-gold-light/10 italic text-center">% Tỉ lệ</th>
                                        <th className="px-8 py-8 text-[11px] font-black text-gold-muted/60 uppercase tracking-[0.4em] border-b border-gold-light/10 italic text-center">Tổng chi phí</th>
                                        <th className="px-8 py-8 text-[11px] font-black text-gold-muted/60 uppercase tracking-[0.4em] border-b border-gold-light/10 italic text-center">Trạng thái</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {visibleBranches.map(branch => {
                                        const plan = state.plans.find(p => p.branchId === branch.id && p.year === year && p.month === month)
                                        const income = state.transactions.filter(tx => tx.type === 'income' && tx.branchId === branch.id && new Date(tx.date).getFullYear() === year && new Date(tx.date).getMonth() + 1 === month).reduce((s, tx) => s + tx.amount, 0)
                                        const expense = state.transactions.filter(tx => tx.type === 'expense' && tx.branchId === branch.id && new Date(tx.date).getFullYear() === year && new Date(tx.date).getMonth() + 1 === month).reduce((s, tx) => s + tx.amount, 0)
                                        const kpi = plan?.kpiRevenue ?? 0
                                        const pct = kpi > 0 ? income / kpi * 100 : 0
                                        const branchAlerts = allAlerts.filter(a => a.branchId === branch.id && a.month === month && a.year === year)
                                        return (
                                            <tr key={branch.id} className="transition-all duration-500 hover:scale-[1.01] group bg-white shadow-sm h-20 rounded-[28px] overflow-hidden">
                                                <td className="px-8 py-6 border-y-2 border-l-2 border-dashed rounded-l-[28px] border-[#9F1D35]/50 group-hover:bg-[#9F1D35]/5 transition-colors max-w-[200px] text-tight-wrap">
                                                    <span className="text-[14px] font-black text-text-main tracking-wide uppercase">{branch.name}</span>
                                                </td>
                                                <td className="px-8 py-6 border-y-2 border-dashed border-[#9F1D35]/50 group-hover:bg-[#9F1D35]/5 transition-colors text-center text-[15px] font-serif font-black italic text-blue-600 force-nowrap">
                                                    {fmtVND(kpi)}
                                                </td>
                                                <td className="px-8 py-6 border-y-2 border-dashed border-[#9F1D35]/50 group-hover:bg-[#9F1D35]/5 transition-colors text-center text-[15px] font-black font-serif text-emerald-600 italic force-nowrap">
                                                    {fmtVND(income)}
                                                </td>
                                                <td className="px-8 py-6 border-y-2 border-dashed border-[#9F1D35]/50 group-hover:bg-[#9F1D35]/5 transition-colors">
                                                    <div className="flex items-center gap-4 justify-center">
                                                        <div className="h-1.5 w-24 bg-beige-soft rounded-full overflow-hidden flex-shrink-0">
                                                            <div
                                                                className={`h-full rounded-full transition-all duration-1000 ${pct >= 100 ? 'bg-emerald-500' : pct >= 80 ? 'bg-amber-500' : 'bg-rose-500'}`}
                                                                style={{ width: `${Math.min(pct, 100)}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-[12px] font-black text-text-main w-8 tabular-nums">{pct.toFixed(0)}%</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-6 border-y-2 border-dashed border-[#9F1D35]/50 group-hover:bg-[#9F1D35]/5 transition-colors text-center text-[15px] font-serif italic text-[#9F1D35] force-nowrap">
                                                    {fmtVND(expense)}
                                                </td>
                                                <td className="px-8 py-6 border-y-2 border-r-2 border-dashed rounded-r-[28px] border-[#9F1D35]/50 group-hover:bg-[#9F1D35]/5 transition-colors text-center">
                                                    {branchAlerts.length > 0 ? (
                                                        <Link href={`/cashflow?branchId=${branch.id}&month=${month}&year=${year}`} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-50 text-rose-600 text-[10px] font-black uppercase tracking-wider border border-rose-100/50 shadow-sm">
                                                            <AlertTriangle size={12} strokeWidth={1.5} /> {branchAlerts.length} Cảnh báo
                                                        </Link>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-wider border border-emerald-100/50 shadow-sm">
                                                            <CheckCircle size={12} strokeWidth={1.5} /> Ổn định
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Recent Transactions Section */}
                <div className="mb-12">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-beige-soft flex items-center justify-center text-gold-muted leading-none">
                                <CreditCard size={20} strokeWidth={1.5} />
                            </div>
                            <h3 className="text-xl font-serif font-bold text-text-main italic">Giao dịch gần đây</h3>
                        </div>
                        <Link href="/transactions" className="text-[10px] font-black text-gold-muted uppercase tracking-[0.2em] border-b-2 border-gold-light hover:border-gold-muted transition-all pb-1">
                            Xem tất cả nhật ký
                        </Link>
                    </div>

                    <div className="overflow-x-auto luxury-scrollbar w-full max-w-full min-w-0">
                        <table className="w-full min-w-[1000px] text-left border-separate border-spacing-y-4">
                            <thead>
                                <tr className="bg-beige-soft/40">
                                    <th className="px-8 py-8 text-[11px] font-black text-gold-muted/60 uppercase tracking-[0.4em] border-b border-gold-light/10 italic text-center">Ngày</th>
                                    <th className="px-8 py-8 text-[11px] font-black text-gold-muted/60 uppercase tracking-[0.4em] border-b border-gold-light/10 italic text-center">Đơn vị</th>
                                    <th className="px-8 py-8 text-[11px] font-black text-gold-muted/60 uppercase tracking-[0.4em] border-b border-gold-light/10 italic text-center">Phân loại</th>
                                    <th className="px-8 py-8 text-[11px] font-black text-gold-muted/60 uppercase tracking-[0.4em] border-b border-gold-light/10 italic text-center">Loại dòng tiền</th>
                                    <th className="px-8 py-8 text-[11px] font-black text-gold-muted/60 uppercase tracking-[0.4em] border-b border-gold-light/10 italic text-center">Phương thức</th>
                                    <th className="px-8 py-8 text-[11px] font-black text-gold-muted/60 uppercase tracking-[0.4em] border-b border-gold-light/10 italic text-right">Số tiền (VND)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {state.transactions
                                    .filter(tx => {
                                        if (effectiveBranch && !isTransactionRelatedToBranch(tx, effectiveBranch, state.accounts)) return false
                                        if (!canViewAllBranches(currentUser) && !currentUser?.viewBranchTransactionsFromHQ) {
                                            const creator = state.users.find(u => u.id === tx.createdBy)
                                            if (creator && (creator.departmentType === 'hq' || creator.departmentType === 'admin' || creator.role === 'admin')) return false
                                        }
                                        return true
                                    })
                                    .sort((a, b) => {
                                        const dateComp = b.date.localeCompare(a.date)
                                        if (dateComp !== 0) return dateComp
                                        return (b.createdAt || '').localeCompare(a.createdAt || '')
                                    })
                                    .slice(0, 8)
                                    .map(tx => {
                                        const cat = state.categories.find(c => c.id === tx.categoryId)
                                        const branch = state.branches.find(b => b.id === tx.branchId)
                                        const account = state.accounts.find(a => a.id === tx.paymentAccountId)
                                        const paidByBranch = tx.paidByBranchId ? state.branches.find(b => b.id === tx.paidByBranchId) : null
                                        return (
                                            <tr key={tx.id} className="transition-all duration-500 hover:scale-[1.01] group bg-white shadow-sm h-20 rounded-[28px] overflow-hidden">
                                                <td className="px-8 py-6 border-y-2 border-l-2 border-dashed rounded-l-[28px] border-[#9F1D35]/50 group-hover:bg-[#9F1D35]/5 transition-colors text-center text-[12px] font-black text-text-soft tabular-nums">
                                                    {new Date(tx.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                                                </td>
                                                <td className="px-8 py-6 border-y-2 border-dashed border-[#9F1D35]/50 group-hover:bg-[#9F1D35]/5 transition-colors text-center">
                                                    <span className="text-[14px] font-black text-text-main tracking-tight uppercase">{branch?.name}</span>
                                                    {paidByBranch && <div className="text-[9px] font-black text-rose-500 uppercase tracking-[0.1em] mt-0.5 italic">Chi hộ</div>}
                                                </td>
                                                <td className="px-8 py-6 border-y-2 border-dashed border-[#9F1D35]/50 group-hover:bg-[#9F1D35]/5 transition-colors text-center text-[14px] font-bold text-text-main opacity-80 italic">
                                                    {cat?.name ?? tx.categoryId}
                                                </td>
                                                <td className="px-8 py-6 border-y-2 border-dashed border-[#9F1D35]/50 group-hover:bg-[#9F1D35]/5 transition-colors text-center">
                                                    <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm ${tx.type === 'income'
                                                        ? 'bg-emerald-50 text-emerald-600 border-emerald-100/50'
                                                        : 'bg-rose-50/50 text-[#9F1D35] border-rose-100/50'
                                                        }`}>
                                                        {tx.type === 'income' ? '↑ Thu nhập' : '↓ Chi phí'}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-6 border-y-2 border-dashed border-[#9F1D35]/50 group-hover:bg-[#9F1D35]/5 transition-colors text-center text-[12px] font-black text-gold-muted/60 uppercase tracking-widest italic">
                                                    {account?.name || 'Tiền mặt'}
                                                </td>
                                                <td className={`px-8 py-6 border-y-2 border-r-2 border-dashed rounded-r-[28px] border-[#9F1D35]/50 group-hover:bg-[#9F1D35]/5 transition-colors text-right text-[18px] font-serif font-black italic tabular-nums ${tx.type === 'income' ? 'text-emerald-600' : 'text-[#9F1D35]'}`}>
                                                    {tx.type === 'income' ? '+' : '-'}{fmtVND(tx.amount)}
                                                </td>
                                            </tr>
                                        )
                                    })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    )
}
