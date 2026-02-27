'use client'
import { useState, useMemo } from 'react'
import { useApp, canEditTransaction, canViewAllBranches, canLockTransaction } from '@/lib/auth'
import { fmtVND } from '@/lib/calculations'
import { saveTransaction, deleteTransaction } from '@/lib/storage'
import { Transaction } from '@/lib/types'
import { useModal } from '@/components/ModalProvider'
import { useToast } from '@/components/ToastProvider'
import UserAvatar from '@/components/UserAvatar'
import { Plus, Search, Filter, Calendar, CreditCard, User, Edit2, Trash2, X, Download, AlertCircle, AlertTriangle, CheckCircle2, MoreHorizontal, ArrowRightCircle, Building, LayoutGrid, Eye, Database, TrendingUp, TrendingDown, Activity, LockKeyhole } from 'lucide-react'
import { MoneyInput } from '../planning/page'

import PageHeader from '@/components/PageHeader'

function uid() { return Math.random().toString(36).slice(2) + Date.now().toString(36) }

const EMPTY_TX = (): Partial<Transaction> => ({
    type: 'income', amount: 0, note: '', isDebt: false,
})

export default function TransactionsPage() {
    const { currentUser, state, saveState } = useApp()
    const { showAlert, showConfirm } = useModal()
    const { showToast } = useToast()
    const [showForm, setShowForm] = useState(false)
    const [editingTx, setEditingTx] = useState<Transaction | null>(null)
    const [form, setForm] = useState<Partial<Transaction>>(EMPTY_TX())
    const [isHQPaying, setIsHQPaying] = useState(false)
    const [showBulk, setShowBulk] = useState(false)
    const [filterBranch, setFilterBranch] = useState(
        canViewAllBranches(currentUser) ? '' : currentUser?.branchId ?? ''
    )
    const [filterType, setFilterType] = useState('')
    const [filterDate, setFilterDate] = useState('')
    const [filterMonth, setFilterMonth] = useState<number>(new Date().getMonth() + 1)
    const [filterYear, setFilterYear] = useState<number>(new Date().getFullYear())
    const [filterCat, setFilterCat] = useState('')
    const [filterAccount, setFilterAccount] = useState('')
    const [selectedTxId, setSelectedTxId] = useState<string | null>(null)

    const visibleBranches = canViewAllBranches(currentUser)
        ? state.branches
        : state.branches.filter(b => b.id === currentUser?.branchId)

    const hqBranch = state.branches.find(b => b.type === 'hq' || b.isHeadquarter)

    const filteredTx = useMemo(() => {
        const canViewAll = canViewAllBranches(currentUser)
        return state.transactions
            .filter(tx => {
                // Mandatory branch filter for branch staff
                if (!canViewAll && tx.branchId !== currentUser?.branchId) return false

                if (filterBranch && tx.branchId !== filterBranch) return false
                if (filterType && tx.type !== filterType) return false
                if (filterCat && tx.categoryId !== filterCat) return false
                if (filterAccount && tx.paymentAccountId !== filterAccount) return false

                const d = new Date(tx.date)
                if (filterDate && tx.date !== filterDate) return false
                if (filterMonth && d.getMonth() + 1 !== filterMonth) return false
                if (filterYear && d.getFullYear() !== filterYear) return false

                return true
            })
            .sort((a, b) => {
                const dateComp = b.date.localeCompare(a.date)
                if (dateComp !== 0) return dateComp
                return (b.createdAt || '').localeCompare(a.createdAt || '')
            })
    }, [state.transactions, filterBranch, filterType, filterMonth, filterYear, filterCat, filterAccount, filterDate, currentUser])

    // Calculate current month totals for warning
    const checkOverBudget = (tx: Partial<Transaction>): { over: boolean; pct: number } => {
        if (tx.type !== 'expense' || !tx.categoryId || !tx.branchId || !tx.amount) return { over: false, pct: 0 }
        const d = new Date(tx.date || new Date())
        const plan = state.plans.find(p => p.branchId === tx.branchId && p.year === d.getFullYear() && p.month === d.getMonth() + 1)
        if (!plan) return { over: false, pct: 0 }
        const cp = plan.categoryPlans.find(c => c.categoryId === tx.categoryId)
        if (!cp || cp.plannedAmount === 0) return { over: false, pct: 0 }
        const currentActual = state.transactions
            .filter(t => t.type === 'expense' && t.categoryId === tx.categoryId && t.branchId === tx.branchId
                && new Date(t.date).getFullYear() === d.getFullYear() && new Date(t.date).getMonth() + 1 === d.getMonth() + 1
                && (!editingTx || t.id !== editingTx.id))
            .reduce((s, t) => s + t.amount, 0)
        const total = currentActual + (tx.amount ?? 0)
        const pct = total / cp.plannedAmount * 100
        return { over: pct >= cp.alertThreshold * 100, pct }
    }

    const budgetWarn = checkOverBudget(form)

    function handleCloseModal() {
        setShowForm(false)
        setForm(EMPTY_TX())
        setEditingTx(null)
        setIsHQPaying(false)
    }

    function openNew() {
        setForm({ ...EMPTY_TX(), date: new Date().toISOString().split('T')[0], branchId: filterBranch || visibleBranches.find(b => b.type !== 'hq' && !b.isHeadquarter)?.id })
        setEditingTx(null)
        setIsHQPaying(false)
        setShowForm(true)
    }

    function openEdit(tx: Transaction) {
        setForm({ ...tx })
        setEditingTx(tx)
        setIsHQPaying(!!tx.paidByBranchId)
        setShowForm(true)
    }

    async function handleSave() {
        if (!form.branchId || !form.date || !form.amount || !form.paymentAccountId) {
            await showAlert('Vui lòng điền đầy đủ thông tin'); return
        }
        if (form.type !== 'transfer' && !form.categoryId) {
            await showAlert('Vui lòng chọn danh mục'); return
        }
        if (form.type === 'transfer' && !form.toPaymentAccountId) {
            await showAlert('Vui lòng chọn tài khoản nhận'); return
        }

        // --- Balance Check ---
        if (form.type === 'expense' || form.type === 'transfer') {
            const acc = state.accounts.find(a => a.id === form.paymentAccountId)
            const initial = acc?.initialBalance || 0
            const currentActual = state.transactions
                .filter(t => t.paymentAccountId === form.paymentAccountId && (!editingTx || t.id !== editingTx.id))
                .reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0)

            // Transfers where this account is recipient
            const received = state.transactions
                .filter(t => t.type === 'transfer' && t.toPaymentAccountId === form.paymentAccountId && (!editingTx || t.id !== editingTx.id))
                .reduce((sum, t) => sum + t.amount, 0)

            const available = initial + currentActual + received
            if (available < (form.amount || 0)) {
                await showAlert(`Số dư hiện tại (${fmtVND(available)}) không đủ để thực hiện giao dịch này.`)
                return
            }
        }

        const isNew = !state.transactions.some(t => t.id === (editingTx?.id ?? form.id))
        const tx: Transaction = {
            id: editingTx?.id ?? uid(),
            branchId: form.branchId!,
            date: form.date!,
            type: form.type as any,
            categoryId: form.categoryId!,
            amount: form.amount!,
            paymentAccountId: form.paymentAccountId!,
            toPaymentAccountId: form.toPaymentAccountId,
            paidByBranchId: isHQPaying ? hqBranch?.id : undefined,
            note: form.note,
            isDebt: form.isDebt,
            createdBy: editingTx?.createdBy ?? currentUser?.id ?? '',
            createdAt: editingTx?.createdAt ?? new Date().toISOString(),
            updatedBy: currentUser?.id,
            updatedAt: new Date().toISOString(),
            status: editingTx?.status ?? 'open',
        }

        // 1. Cập nhật state UI ngay lập tức (Pure update)
        saveState(saveTransaction(tx))

        // 2. Chạy side effects (Supabase + Logging) ngầm
        import('@/lib/storage').then(m => m.syncTransaction(tx, currentUser?.id, isNew).then(log => {
            if (log) {
                // Nếu có log mới, cập nhật bảng tin Newfeeds
                saveState(s => ({
                    ...s,
                    activityLogs: [log, ...(s.activityLogs || [])].slice(0, 200)
                }))
            }
        }))

        showToast('Giao dịch đã được lưu', `${tx.type === 'income' ? 'Thu nhập' : tx.type === 'expense' ? 'Chi phí' : 'Chuyển khoản'} ${fmtVND(tx.amount)}`)
        handleCloseModal()
    }

    async function handleDelete(id: string) {
        const canDelete = ['admin', 'director', 'accountant'].includes(currentUser?.role ?? '')
        if (!canDelete) {
            await showAlert('Bạn không có quyền xóa giao dịch. Chỉ Quản trị viên, Giám đốc hoặc Kế toán mới có quyền này.');
            return
        }
        if (await showConfirm('Bạn có chắc chắn muốn xóa giao dịch này?')) {
            const txId = id
            // 1. Pure update
            saveState(deleteTransaction(txId))
            // 2. Side effects
            import('@/lib/storage').then(m => m.syncDeleteTransaction(txId, currentUser?.id).then(log => {
                if (log) {
                    saveState(s => ({
                        ...s,
                        activityLogs: [log, ...(s.activityLogs || [])].slice(0, 200)
                    }))
                }
            }))
            showToast('Đã xóa giao dịch', 'Giao dịch đã được gỡ khỏi hệ thống', 'info')
        }
    }

    // Categories filtered by type
    const expenseCategories = state.categories.filter(c => c.section !== 'revenue' && !c.isHidden).sort((a, b) => a.sortOrder - b.sortOrder)
    const incomeCategories = state.categories.filter(c => c.section === 'revenue' && !c.isHidden).sort((a, b) => a.sortOrder - b.sortOrder)
    const formCats = form.type === 'income' ? incomeCategories : expenseCategories

    // Accounts for selected branch + HQ if paying
    const formAccounts = state.accounts.filter(a => {
        if (!canViewAllBranches(currentUser)) return a.branchId === currentUser?.branchId
        if (isHQPaying) return !a.branchId || a.branchId === hqBranch?.id
        return !a.branchId || a.branchId === form.branchId
    })

    const totalIncome = filteredTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    const totalExpense = filteredTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

    return (
        <div className="page-container bg-[#FAF8F6]">
            <PageHeader
                icon={Database}
                title="Sổ cái"
                subtitle="Giao dịch"
                description="Quản lý dòng tiền & Biến động số dư hệ thống"
                actions={
                    <div className="flex items-center gap-4">
                        <button
                            className="flex items-center gap-3 bg-white text-text-soft/60 px-6 py-4 rounded-[20px] font-black text-[10px] uppercase tracking-widest border border-gold-light/30 shadow-sm hover:text-gold-muted hover:border-gold-muted/30 transition-all group"
                            onClick={() => setShowBulk(true)}
                        >
                            <LayoutGrid size={18} strokeWidth={1.5} className="group-hover:rotate-90 transition-transform duration-500" /> Nhập nhanh
                        </button>
                        <button
                            className="flex items-center gap-3 bg-text-main text-white px-10 py-5 rounded-[22px] font-black text-[11px] uppercase tracking-widest shadow-luxury hover:bg-gold-muted transition-all active:scale-95 group relative overflow-hidden"
                            onClick={openNew}
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                            <Plus size={18} strokeWidth={2.5} /> Thêm giao dịch
                        </button>
                    </div>
                }
            />

            <div className="px-10 py-12 pb-32 max-w-[1600px] mx-auto animate-fade-in space-y-12">
                {/* Luxury Filter Bar */}
                <div className="bg-white p-10 rounded-[48px] border border-gold-light/20 shadow-luxury flex flex-col lg:flex-row lg:items-center justify-between gap-10 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-gold-light/5 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none" />

                    <div className="flex flex-wrap items-center gap-5 relative z-10">
                        <div className="flex items-center gap-4 bg-gold-light/20 px-6 py-4 rounded-2xl border border-gold-light/30 shadow-inner">
                            <Filter size={18} className="text-gold-muted" strokeWidth={2} />
                            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-gold-muted italic">Thông số lọc</span>
                        </div>

                        <div className="h-10 w-px bg-gold-light/20 mx-2 hidden lg:block" />

                        <div className="flex flex-wrap items-center gap-4">
                            <input type="date" className="bg-beige-soft/40 border border-gold-light/10 rounded-2xl px-5 py-4 text-[12px] font-black text-text-main focus:ring-2 focus:ring-gold-muted/20 outline-none transition-all italic tracking-tight" value={filterDate} onChange={e => setFilterDate(e.target.value)} />

                            <select className="bg-beige-soft/40 border border-gold-light/10 rounded-2xl px-6 py-4 text-[12px] font-black text-text-main focus:ring-2 focus:ring-gold-muted/20 outline-none transition-all cursor-pointer italic tracking-tight appearance-none min-w-[140px]" value={filterMonth} onChange={e => setFilterMonth(+e.target.value)}>
                                <option value={0}>Cả năm {filterYear}</option>
                                {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>Tháng {i + 1}</option>)}
                            </select>

                            {canViewAllBranches(currentUser) && (
                                <select className="bg-beige-soft/40 border border-gold-light/10 rounded-2xl px-6 py-4 text-[12px] font-black text-text-main focus:ring-2 focus:ring-gold-muted/20 outline-none transition-all cursor-pointer italic tracking-tight appearance-none min-w-[180px]" value={filterBranch} onChange={e => setFilterBranch(e.target.value)}>
                                    <option value="">🏠 Tất cả chi nhánh</option>
                                    {state.branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                </select>
                            )}

                            <select className="bg-beige-soft/40 border border-gold-light/10 rounded-2xl px-6 py-4 text-[12px] font-black text-text-main focus:ring-2 focus:ring-gold-muted/20 outline-none transition-all cursor-pointer italic tracking-tight appearance-none min-w-[140px]" value={filterType} onChange={e => setFilterType(e.target.value)}>
                                <option value="">💎 Tất cả loại</option>
                                <option value="income">↑ Chỉ Thu</option>
                                <option value="expense">↓ Chỉ Chi</option>
                            </select>

                            <select className="bg-beige-soft/40 border border-gold-light/10 rounded-2xl px-6 py-4 text-[12px] font-black text-text-main focus:ring-2 focus:ring-gold-muted/20 outline-none transition-all cursor-pointer italic tracking-tight appearance-none min-w-[180px]" value={filterCat} onChange={e => setFilterCat(e.target.value)}>
                                <option value="">📁 Tất cả danh mục</option>
                                {state.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>

                            <select className="bg-beige-soft/40 border border-gold-light/10 rounded-2xl px-6 py-4 text-[12px] font-black text-text-main focus:ring-2 focus:ring-gold-muted/20 outline-none transition-all cursor-pointer italic tracking-tight appearance-none min-w-[180px]" value={filterAccount} onChange={e => setFilterAccount(e.target.value)}>
                                <option value="">💳 Tất cả tài khoản</option>
                                {state.accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                            </select>
                        </div>
                    </div>

                    {(filterDate || filterBranch || filterType || filterCat || filterAccount || filterMonth !== (new Date().getMonth() + 1)) && (
                        <button className="relative z-10 flex items-center gap-2 px-6 py-3 bg-rose-50 border border-rose-100 rounded-xl text-[10px] font-black text-rose-600 hover:bg-rose-100 transition-all uppercase tracking-[0.2em] italic group-hover:scale-105" onClick={() => {
                            setFilterDate(''); setFilterBranch(''); setFilterType(''); setFilterCat(''); setFilterAccount('');
                            setFilterMonth(new Date().getMonth() + 1);
                        }}>
                            <X size={14} strokeWidth={3} /> Xóa lọc
                        </button>
                    )}
                </div>

                {/* Luxury Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                    {[
                        { label: 'Tổng thu nhập (+)', value: totalIncome, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50/50', iconBg: 'bg-emerald-100/40', sign: '+' },
                        { label: 'Tổng chi phí (-)', value: totalExpense, icon: TrendingDown, color: 'text-rose-600', bg: 'bg-rose-50/50', iconBg: 'bg-rose-100/40', sign: '-' },
                        { label: 'Biến động ròng', value: totalIncome - totalExpense, icon: Activity, color: (totalIncome - totalExpense) >= 0 ? 'text-gold-muted' : 'text-rose-600', bg: 'bg-white', iconBg: 'bg-gold-light/30', sign: (totalIncome - totalExpense) >= 0 ? '+' : '' },
                    ].map((c, i) => (
                        <div key={c.label} className={`p-10 rounded-[48px] border border-gold-light/20 ${c.bg} shadow-luxury group transition-all duration-700 hover:scale-[1.03] relative overflow-hidden`}>
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-white/20 transition-all" />

                            <div className="flex justify-between items-start mb-10 relative z-10">
                                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-700 group-hover:rotate-[360deg] ${c.iconBg} shadow-sm border border-white`}>
                                    <c.icon size={30} strokeWidth={1.5} className={c.color} />
                                </div>
                                <div className="text-right">
                                    <p className="text-[11px] font-black text-text-soft/40 uppercase tracking-[0.3em] italic mb-3">{c.label}</p>
                                    <h3 className={`text-4xl font-serif font-black italic tabular-nums tracking-tighter ${c.color}`}>{c.sign}{fmtVND(c.value)}</h3>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] text-text-soft/30 italic relative z-10">
                                <div className="w-1.5 h-1.5 rounded-full bg-gold-muted/30" />
                                Theo chu kỳ bộ lọc hiện tại
                            </div>
                        </div>
                    ))}
                </div>

                {/* Luxury Table Area */}
                <div className="bg-white rounded-[48px] border border-gold-light/20 shadow-luxury overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gold-light/5 rounded-full -mr-[250px] -mt-[250px] blur-[100px] pointer-events-none" />

                    <div className="overflow-x-auto relative z-10">
                        <table className="w-full text-left border-separate border-spacing-0">
                            <thead>
                                <tr className="bg-beige-soft/40">
                                    <th className="px-10 py-8 text-[11px] font-black text-gold-muted/60 uppercase tracking-[0.4em] border-b border-gold-light/10 italic">Thời gian / Nhật ký</th>
                                    <th className="px-10 py-8 text-[11px] font-black text-gold-muted/60 uppercase tracking-[0.4em] border-b border-gold-light/10 italic">Thực thể / Tài khoản</th>
                                    <th className="px-10 py-8 text-[11px] font-black text-gold-muted/60 uppercase tracking-[0.4em] border-b border-gold-light/10 italic">Danh mục / Tính chất</th>
                                    <th className="px-10 py-8 text-[11px] font-black text-gold-muted/60 uppercase tracking-[0.4em] border-b border-gold-light/10 italic text-right">Diễn biến số dư</th>
                                    <th className="px-10 py-8 border-b border-gold-light/10"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gold-light/10">
                                {filteredTx.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-10 py-32 text-center">
                                            <div className="flex flex-col items-center gap-4 opacity-30">
                                                <Database size={48} strokeWidth={1} className="text-gold-muted" />
                                                <p className="text-[13px] font-black uppercase tracking-widest text-text-soft italic">Lưu trữ trống - Không tìm thấy giao dịch</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredTx.map(tx => {
                                        const cat = state.categories.find(c => c.id === tx.categoryId)
                                        const branch = state.branches.find(b => b.id === tx.branchId)
                                        const account = state.accounts.find(a => a.id === tx.paymentAccountId)
                                        const paidByBranch = tx.paidByBranchId ? state.branches.find(b => b.id === tx.paidByBranchId) : null
                                        const canEdit_ = canEditTransaction(currentUser, tx)
                                        const isLocked = tx.status === 'locked'
                                        return (
                                            <tr key={tx.id} onClick={() => setSelectedTxId(tx.id)} className="group hover:bg-beige-soft/30 transition-all cursor-pointer">
                                                <td className="px-10 py-10">
                                                    <div className="flex items-center gap-5">
                                                        {isLocked ? (
                                                            <div className="w-12 h-12 rounded-[18px] bg-rose-50 text-rose-600 flex items-center justify-center shadow-sm border border-rose-100 animate-pulse">
                                                                <LockKeyhole size={18} strokeWidth={2.5} />
                                                            </div>
                                                        ) : (
                                                            <div className="w-12 h-12 rounded-[18px] bg-gold-light/30 text-gold-muted flex items-center justify-center border border-gold-light/20 shadow-sm group-hover:scale-110 transition-transform duration-500">
                                                                <Calendar size={18} strokeWidth={2} />
                                                            </div>
                                                        )}
                                                        <div>
                                                            <div className="text-[15px] font-black text-text-main tabular-nums italic tracking-tighter">
                                                                {new Date(tx.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                                            </div>
                                                            <div className="text-[11px] font-bold text-text-soft/50 mt-1.5 line-clamp-1 italic max-w-[280px]">
                                                                {tx.note || 'Không có bản ghi chi tiết'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-10 py-10">
                                                    <div className="space-y-2.5">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-2 h-2 rounded-full bg-gold-muted/40" />
                                                            <span className="text-[13px] font-black text-text-main uppercase tracking-tight">{branch?.name}</span>
                                                            {paidByBranch && (
                                                                <span className="px-2.5 py-0.5 bg-text-main text-white text-[8px] font-black uppercase tracking-widest rounded-lg">VP Chi hộ</span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-2 px-3 py-1.5 bg-beige-soft/50 rounded-xl border border-gold-light/10 w-fit">
                                                            <CreditCard size={14} strokeWidth={2} className="text-gold-muted" />
                                                            <span className="text-[11px] font-black text-text-soft/60 italic tabular-nums">{account?.name}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-10 py-10">
                                                    <div className="flex flex-col gap-3">
                                                        <div className="flex items-center gap-3">
                                                            {tx.isDebt && (
                                                                <span className="px-2.5 py-1 bg-rose-600 text-white text-[9px] font-black uppercase tracking-widest rounded-lg animate-bounce">NỢ</span>
                                                            )}
                                                            <span className="text-[14px] font-serif font-black text-text-main italic">
                                                                {tx.type === 'transfer' ? 'Chuyển khoản nội bộ' : (cat?.name ?? 'Loại khác')}
                                                            </span>
                                                        </div>
                                                        <div className={`w-fit px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.1em] border shadow-sm ${tx.type === 'income' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                            tx.type === 'transfer' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                                                'bg-rose-50 text-rose-600 border-rose-100'
                                                            }`}>
                                                            {tx.type === 'income' ? '💎 Thu nhập' : tx.type === 'transfer' ? '⇄ Chuyển quỹ' : '🧱 Chi phí'}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-10 py-10 text-right">
                                                    <div className={`text-[24px] font-serif font-black italic tabular-nums tracking-tighter ${tx.type === 'income' ? 'text-emerald-600' :
                                                        tx.type === 'transfer' ? 'text-text-main/40' :
                                                            'text-rose-600'
                                                        }`}>
                                                        {tx.type === 'income' ? '+' : tx.type === 'transfer' ? '' : '-'}{fmtVND(tx.amount)}
                                                    </div>
                                                </td>
                                                <td className="px-10 py-10 text-right" onClick={e => e.stopPropagation()}>
                                                    <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-4 group-hover:translate-x-0">
                                                        <button
                                                            className="w-10 h-10 rounded-[14px] bg-white text-text-soft/40 hover:text-gold-muted shadow-sm border border-gold-light/20 flex items-center justify-center transition-all hover:scale-110 hover:shadow-md"
                                                            onClick={() => setSelectedTxId(tx.id)}
                                                            title="Xem chi tiết"
                                                        >
                                                            <Eye size={18} strokeWidth={2} />
                                                        </button>
                                                        {canEdit_ && (
                                                            <>
                                                                <button
                                                                    className="w-10 h-10 rounded-[14px] bg-white text-text-soft/40 hover:text-emerald-600 shadow-sm border border-gold-light/20 flex items-center justify-center transition-all hover:scale-110 hover:shadow-md"
                                                                    onClick={() => openEdit(tx)}
                                                                    title="Sửa"
                                                                >
                                                                    <Edit2 size={18} strokeWidth={2} />
                                                                </button>
                                                                <button
                                                                    className="w-10 h-10 rounded-[14px] bg-white text-text-soft/40 hover:text-rose-600 shadow-sm border border-gold-light/20 flex items-center justify-center transition-all hover:scale-110 hover:shadow-md"
                                                                    onClick={() => handleDelete(tx.id)}
                                                                    title="Xóa"
                                                                >
                                                                    <Trash2 size={18} strokeWidth={2} />
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
                {/* Bulk Modal */}
                {showBulk && (
                    <BulkTransactionModal
                        onClose={() => setShowBulk(false)}
                        onSave={(txs) => {
                            // 1. Pure update
                            saveState(s => ({ ...s, transactions: [...txs, ...s.transactions] }))

                            // 2. Side effects for all new transactions
                            import('@/lib/storage').then(m => {
                                Promise.all(txs.map(tx => m.syncTransaction(tx, currentUser?.id, true))).then(logs => {
                                    const validLogs = logs.filter(l => !!l) as any[]
                                    if (validLogs.length > 0) {
                                        saveState(s => ({
                                            ...s,
                                            activityLogs: [...validLogs, ...(s.activityLogs || [])].slice(0, 200)
                                        }))
                                    }
                                })
                            })

                            showToast('Lưu thành công', `Đã nhập ${txs.length} giao dịch hàng loạt`)
                            setShowBulk(false)
                        }}
                        branches={state.branches}
                        categories={state.categories}
                        accounts={state.accounts}
                        currentUser={currentUser}
                        state={state}
                    />
                )}

            </div>

            {/* Luxury Transaction Form Modal */}
            {showForm && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 md:p-6 bg-black/40 backdrop-blur-md animate-fade-in overflow-y-auto cursor-pointer md:left-[280px]" onClick={async e => { if (e.target === e.currentTarget && await showConfirm('Bạn có chắc chắn muốn đóng? Dữ liệu đang nhập sẽ bị mất.')) handleCloseModal() }}>
                    <div className="bg-white w-full max-w-2xl h-fit rounded-[32px] md:rounded-[40px] shadow-2xl overflow-hidden flex flex-col md:flex-row animate-modal-up border border-gold-light/20 my-auto cursor-default relative" onClick={(e) => e.stopPropagation()}>

                        {/* Left Side Branding */}
                        <div className="w-full md:w-[120px] bg-text-main relative overflow-hidden flex flex-col p-6 text-white shrink-0 items-center justify-center">
                            <div className="absolute inset-0 opacity-20" style={{ background: 'radial-gradient(circle at 20% 150%, #C5A059, transparent), radial-gradient(circle at 80% -50%, #F2EBE1, transparent)' }}></div>
                            <div className="relative z-10 flex flex-col items-center">
                                <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center mb-2">
                                    <Database className="text-gold-muted" size={20} />
                                </div>
                                <p className="text-[10px] text-gold-muted font-black uppercase tracking-[0.2em] opacity-80 text-center">Xinh Group</p>
                            </div>
                        </div>

                        {/* Right Side Form */}
                        <div className="flex-1 bg-white flex flex-col relative min-w-0">
                            {/* Header */}
                            <div className="px-8 pt-8 md:px-10 md:pt-10 flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-gold-muted"></span>
                                        <span className="text-[8px] font-black uppercase tracking-widest text-gold-muted">Kế toán chứng từ</span>
                                    </div>
                                    <h3 className="text-2xl font-serif font-black text-text-main tracking-tighter uppercase leading-none">
                                        {editingTx ? 'Hiệu chỉnh' : 'Khởi tạo'} <span className="text-gold-muted">Giao dịch</span>
                                    </h3>
                                </div>
                                <button onClick={handleCloseModal} className="w-10 h-10 rounded-xl bg-white/80 hover:bg-white text-text-soft hover:text-rose-500 flex items-center justify-center transition-all shadow-sm border border-gold-light/20 active:scale-90">
                                    <X size={18} strokeWidth={2.5} />
                                </button>
                            </div>

                            {/* Body */}
                            <div className="p-8 md:p-10 space-y-6 overflow-y-auto luxury-scrollbar max-h-[75vh]">
                                {/* Type Toggle */}
                                <div className="bg-beige-soft/40 p-1.5 rounded-2xl flex gap-1 border border-gold-light/20 shadow-inner">
                                    {(['income', 'expense', 'transfer'] as const).map(t => (
                                        <button
                                            key={t}
                                            onClick={() => setForm(f => ({ ...f, type: t, categoryId: t === 'transfer' ? undefined : f.categoryId, toPaymentAccountId: t === 'transfer' ? '' : undefined }))}
                                            className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${form.type === t ? 'bg-text-main text-white shadow-luxury' : 'text-text-soft hover:bg-white'}`}
                                        >
                                            {t === 'income' ? '↑ Thu' : t === 'expense' ? '↓ Chi' : '⇄ Quỹ'}
                                        </button>
                                    ))}
                                </div>

                                <div className="grid grid-cols-2 gap-5">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-text-soft/60 block px-1 italic">Ngày hạch toán</label>
                                        <input
                                            type="date"
                                            className="w-full bg-beige-soft/20 border border-gold-light/20 rounded-xl px-4 py-3 text-[13px] font-bold text-text-main focus:ring-4 focus:ring-gold-muted/5 outline-none transition-all tabular-nums"
                                            value={form.date ?? ''}
                                            onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-text-soft/60 block px-1 italic">Chi nhánh</label>
                                        <select
                                            className="w-full bg-beige-soft/20 border border-gold-light/20 rounded-xl px-4 py-3 text-[13px] font-bold text-text-main focus:ring-4 focus:ring-gold-muted/5 outline-none transition-all appearance-none"
                                            value={form.branchId ?? ''}
                                            onChange={e => setForm(f => ({ ...f, branchId: e.target.value }))}
                                            disabled={!canViewAllBranches(currentUser)}
                                        >
                                            <option value="">Chọn chi nhánh</option>
                                            {state.branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                        </select>
                                    </div>
                                </div>

                                {form.type !== 'transfer' && (
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-text-soft/60 block px-1 italic">Danh mục nghiệp vụ</label>
                                        <select
                                            className="w-full bg-beige-soft/20 border border-gold-light/20 rounded-xl px-4 py-3 text-[13px] font-bold text-text-main focus:ring-4 focus:ring-gold-muted/5 outline-none transition-all appearance-none"
                                            value={form.categoryId ?? ''}
                                            onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))}
                                        >
                                            <option value="">Chọn danh mục</option>
                                            {formCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                )}

                                {form.type === 'transfer' && (
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-text-soft/60 block px-1 italic">Tài khoản thụ hưởng</label>
                                        <select
                                            className="w-full bg-beige-soft/20 border border-gold-light/20 rounded-xl px-4 py-3 text-[13px] font-bold text-text-main focus:ring-4 focus:ring-gold-muted/5 outline-none transition-all appearance-none"
                                            value={form.toPaymentAccountId ?? ''}
                                            onChange={e => setForm(f => ({ ...f, toPaymentAccountId: e.target.value }))}
                                        >
                                            <option value="">Chọn tài khoản nhận</option>
                                            {state.accounts.map(a => (
                                                <option key={a.id} value={a.id} disabled={a.id === form.paymentAccountId}>
                                                    {a.type === 'bank' ? '🏦' : a.type === 'cash' ? '💵' : '💳'} {a.name} ({a.branchId ? state.branches.find(b => b.id === a.branchId)?.name : 'Văn phòng'})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                <div className="bg-beige-soft/30 p-6 rounded-[32px] border border-gold-light/20 relative overflow-hidden group shadow-sm">
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-gold-light/15 rounded-full -mr-12 -mt-12 blur-2xl" />
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gold-muted block mb-2 px-1">Giá trị hạch toán (VNĐ)</label>
                                    <div className="flex items-center gap-4">
                                        <MoneyInput
                                            value={form.amount || 0}
                                            onChange={v => setForm(f => ({ ...f, amount: v }))}
                                            className="w-full bg-transparent border-none p-0 text-3xl font-serif font-black text-text-main focus:ring-0 placeholder:text-text-soft/10 tabular-nums tracking-tighter"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-text-soft/60 block px-1 italic">{isHQPaying ? 'Nguồn tiền (Văn phòng chi hộ)' : 'Tài khoản nguồn'}</label>
                                        <select
                                            className="w-full bg-beige-soft/20 border border-gold-light/20 rounded-xl px-4 py-3 text-[13px] font-bold text-text-main focus:ring-4 focus:ring-gold-muted/5 outline-none transition-all appearance-none"
                                            value={form.paymentAccountId ?? ''}
                                            onChange={e => setForm(f => ({ ...f, paymentAccountId: e.target.value }))}
                                        >
                                            <option value="">Chọn tài khoản nguồn</option>
                                            {formAccounts.map(a => (
                                                <option key={a.id} value={a.id}>
                                                    {a.type === 'bank' ? '🏦' : a.type === 'cash' ? '💵' : '💳'} {a.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-text-soft/60 block px-1 italic">Diễn giải</label>
                                        <textarea
                                            className="w-full bg-beige-soft/20 border border-gold-light/20 rounded-xl px-4 py-3 text-[13px] font-bold text-text-main focus:ring-4 focus:ring-gold-muted/5 outline-none transition-all min-h-[80px] resize-none"
                                            placeholder="Nội dung chi tiết..."
                                            value={form.note ?? ''}
                                            onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className={`p-4 rounded-2xl border transition-all cursor-pointer ${form.isDebt ? 'bg-amber-50 border-amber-100 shadow-sm' : 'bg-white border-gold-light/10 opacity-60'}`} onClick={() => setForm(f => ({ ...f, isDebt: !f.isDebt }))}>
                                            <div className="flex items-center gap-3">
                                                <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${form.isDebt ? 'bg-amber-600 border-amber-600 text-white' : 'bg-white border-gray-200'}`}>
                                                    {form.isDebt && <CheckCircle2 size={12} strokeWidth={3} />}
                                                </div>
                                                <span className={`text-[10px] font-black uppercase tracking-widest ${form.isDebt ? 'text-amber-900' : 'text-text-soft'}`}>Khoản NỢ phát sinh</span>
                                            </div>
                                        </div>

                                        {form.type === 'expense' && hqBranch && form.branchId !== hqBranch.id && (
                                            <div className={`p-4 rounded-2xl border transition-all cursor-pointer ${isHQPaying ? 'bg-indigo-50 border-indigo-100 shadow-sm' : 'bg-white border-gold-light/10 opacity-60'}`} onClick={() => setIsHQPaying(!isHQPaying)}>
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${isHQPaying ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-gray-200'}`}>
                                                        {isHQPaying && <CheckCircle2 size={12} strokeWidth={3} />}
                                                    </div>
                                                    <span className={`text-[10px] font-black uppercase tracking-widest ${isHQPaying ? 'text-indigo-900' : 'text-text-soft'}`}>VP Chi hộ nhánh</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {budgetWarn.over && (
                                        <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl flex gap-3 items-center animate-pulse">
                                            <AlertTriangle size={20} className="text-rose-600 flex-shrink-0" />
                                            <div>
                                                <p className="text-[10px] font-black text-rose-900 uppercase tracking-widest leading-none">Vượt {budgetWarn.pct.toFixed(0)}% kế hoạch!</p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="pt-4 flex gap-4">
                                    <button
                                        className="flex-1 h-14 rounded-2xl bg-white text-text-soft/60 text-[11px] font-black uppercase tracking-widest border border-gold-light/20 hover:text-rose-500 hover:bg-rose-50 transition-all active:scale-95"
                                        onClick={handleCloseModal}
                                    >
                                        Hủy bỏ
                                    </button>
                                    <button
                                        className="flex-[2] h-14 rounded-2xl bg-text-main text-white text-[11px] font-black uppercase tracking-[0.2em] shadow-luxury hover:bg-gold-muted transition-all active:scale-95 flex items-center justify-center gap-3"
                                        onClick={handleSave}
                                    >
                                        Lưu hạch toán
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {selectedTxId && <TransactionDetailModal txId={selectedTxId} onClose={() => setSelectedTxId(null)} />}
        </div>
    )
}

function TransactionDetailModal({ txId, onClose }: { txId: string; onClose: () => void }) {
    const { state, saveState } = useApp()
    const tx = state.transactions.find(t => t.id === txId)
    if (!tx) return null

    const cat = state.categories.find(c => c.id === tx.categoryId)
    const branch = state.branches.find(b => b.id === tx.branchId)
    const account = state.accounts.find(a => a.id === tx.paymentAccountId)
    const creator = state.users.find(u => u.id === tx.createdBy)
    const updater = tx.updatedBy ? state.users.find(u => u.id === tx.updatedBy) : null

    const handleToggleLock = () => {
        const newStatus: 'locked' | 'open' = tx.status === 'locked' ? 'open' : 'locked'
        const updatedTx: Transaction = { ...tx, status: newStatus, updatedAt: new Date().toISOString() }
        saveState((s: any) => ({
            ...s,
            transactions: s.transactions.map((t: any) => t.id === txId ? updatedTx : t)
        }))
        // sync to db
        import('@/lib/storage').then(m => m.syncTransaction(updatedTx, state.currentUserId, false))
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <div className="absolute inset-0 bg-text-main/40 backdrop-blur-md animate-in fade-in duration-500" onClick={onClose} />
            <div
                className="relative w-full max-w-2xl bg-white rounded-[48px] shadow-luxury overflow-hidden border border-gold-light/20 flex flex-col animate-modal-up"
                onClick={e => e.stopPropagation()}
            >
                <div className="absolute top-0 right-0 w-64 h-64 bg-gold-light/10 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none" />

                {/* Header */}
                <div className="p-10 border-b border-gold-light/10 flex justify-between items-start relative z-10">
                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <span className="px-4 py-1.5 bg-gold-light/30 text-gold-muted text-[10px] font-black uppercase tracking-[0.2em] rounded-full border border-gold-light/20 shadow-sm">Hồ sơ giao dịch</span>
                            {tx.status === 'locked' && (
                                <span className="px-4 py-1.5 bg-rose-50 text-rose-600 text-[10px] font-black uppercase tracking-[0.2em] rounded-full border border-rose-100 flex items-center gap-2 animate-pulse">
                                    <LockKeyhole size={10} strokeWidth={3} /> Đã khóa
                                </span>
                            )}
                        </div>
                        <h2 className="text-3xl font-serif font-black text-text-main tracking-tighter">Chi tiết chứng từ</h2>
                        <p className="text-text-soft/40 text-[11px] font-black uppercase tracking-widest mt-2">ID: {tx.id.slice(0, 8)}...{tx.id.slice(-4)}</p>
                    </div>
                    <button onClick={onClose} className="w-12 h-12 rounded-2xl flex items-center justify-center bg-beige-soft/50 text-text-soft/40 hover:text-rose-600 hover:bg-rose-50 transition-all group">
                        <X size={24} strokeWidth={1.5} className="group-hover:rotate-90 transition-transform duration-500" />
                    </button>
                </div>

                <div className="p-10 space-y-10 relative z-10">
                    <div className="grid grid-cols-2 gap-10">
                        {/* Left Info */}
                        <div className="space-y-8">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-gold-muted mb-3 block italic opacity-60">Thực thể hạch toán</label>
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-beige-soft/60 flex items-center justify-center text-gold-muted border border-gold-light/10">
                                        <Building size={20} />
                                    </div>
                                    <span className="text-[16px] font-black text-text-main uppercase tracking-tight">{branch?.name}</span>
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-gold-muted mb-3 block italic opacity-60">Tài khoản thanh toán</label>
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-beige-soft/60 flex items-center justify-center text-gold-muted border border-gold-light/10">
                                        <CreditCard size={20} />
                                    </div>
                                    <span className="text-[16px] font-black text-text-soft">{account?.name}</span>
                                </div>
                            </div>
                        </div>

                        {/* Right Info - Amount */}
                        <div className="bg-beige-soft/30 p-8 rounded-[32px] border border-gold-light/10 flex flex-col items-center justify-center text-center shadow-inner">
                            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-gold-muted mb-4 block">Giá trị giao dịch</label>
                            <div className={`text-4xl font-serif font-black tracking-tighter tabular-nums ${tx.type === 'income' ? 'text-emerald-600' :
                                tx.type === 'transfer' ? 'text-gold-muted' :
                                    'text-rose-600'
                                }`}>
                                {tx.type === 'income' ? '+' : tx.type === 'transfer' ? '' : '-'}{fmtVND(tx.amount)}
                            </div>
                            <div className={`mt-4 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border shadow-sm ${tx.type === 'income' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                tx.type === 'transfer' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                    'bg-rose-50 text-rose-600 border-rose-100'
                                }`}>
                                {tx.type === 'income' ? 'Khoản thu' : tx.type === 'transfer' ? 'Chuyển quỹ' : 'Khoản chi'}
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-8 rounded-[32px] border border-gold-light/10 shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-1.5 h-full bg-gold-muted/20 group-hover:bg-gold-muted transition-all" />
                        <label className="text-[10px] font-black uppercase tracking-[0.3em] text-gold-muted mb-3 block opacity-60">Nội dung / Ghi chú</label>
                        <p className="text-[15px] text-text-main font-bold leading-relaxed">{tx.note || '(Không có nội dung chi tiết cho chứng từ này)'}</p>
                    </div>

                    {/* Audit Logs */}
                    <div className="grid grid-cols-2 gap-8 text-[11px] font-black uppercase tracking-widest text-text-soft/40 italic">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full overflow-hidden border border-gold-light/20 ring-4 ring-beige-soft/30">
                                <UserAvatar user={creator} size="sm" />
                            </div>
                            <div>
                                <p className="text-text-soft/60 mb-0.5">Khởi tạo bởi</p>
                                <p className="text-text-main font-bold">{creator?.displayName}</p>
                            </div>
                        </div>
                        {updater && (
                            <div className="flex items-center gap-3 justify-end text-right">
                                <div>
                                    <p className="text-text-soft/60 mb-0.5">Cập nhật bởi</p>
                                    <p className="text-text-main font-bold">{updater?.displayName}</p>
                                </div>
                                <div className="w-10 h-10 rounded-full overflow-hidden border border-gold-light/20 ring-4 ring-beige-soft/30">
                                    <UserAvatar user={updater} size="sm" />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-10 bg-beige-soft/20 flex items-center justify-between gap-6 border-t border-gold-light/10 relative z-10">
                    {canLockTransaction(state.users.find((u: any) => u.id === state.currentUserId)) && (
                        <button
                            onClick={handleToggleLock}
                            className={`flex-1 h-14 rounded-2xl text-[12px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all shadow-sm italic ${tx.status === 'locked'
                                ? 'bg-white text-emerald-600 border border-emerald-100 hover:bg-emerald-50'
                                : 'bg-rose-600 text-white hover:bg-rose-700 shadow-rose-200'
                                }`}
                        >
                            {tx.status === 'locked' ? <><CheckCircle2 size={18} /> Mở khóa giao dịch</> : <><LockKeyhole size={18} /> Khóa giao dịch</>}
                        </button>
                    )}
                    <button
                        className="flex-1 h-14 rounded-2xl bg-white text-text-soft/60 text-[12px] font-black uppercase tracking-[0.2em] border border-gold-light/20 hover:text-gold-muted hover:bg-beige-soft transition-all shadow-sm italic"
                        onClick={onClose}
                    >
                        Quay lại bảng kê
                    </button>
                </div>
            </div>
        </div>
    )
}

function BulkTransactionModal({ onClose, onSave, branches, categories, accounts, currentUser, state }: {
    onClose: () => void;
    onSave: (txs: Transaction[]) => void;
    branches: any[];
    categories: any[];
    accounts: any[];
    currentUser: any;
    state: any;
}) {
    const { showAlert, showConfirm } = useModal()
    const defaultBranchId = currentUser?.branchId || branches.find((b: any) => b.type !== 'hq' && !b.isHeadquarter)?.id || ''
    const [rows, setRows] = useState<any[]>([
        { id: uid(), date: new Date().toISOString().split('T')[0], type: 'expense', amount: 0, branchId: defaultBranchId, categoryId: '', paymentAccountId: accounts[0]?.id || '', note: '' }
    ])

    function addRow() {
        const last = rows[rows.length - 1]
        setRows([...rows, { ...last, id: uid(), amount: 0, note: '' }])
    }

    function removeRow(index: number) {
        if (rows.length > 1) setRows(rows.filter((_, i) => i !== index))
    }

    function updateRow(index: number, field: string, val: any) {
        setRows(rows.map((r, i) => i === index ? { ...r, [field]: val } : r))
    }

    async function handleSaveAll() {
        const validRows = rows.filter(r => {
            if (!r.branchId || !r.paymentAccountId || r.amount <= 0) return false
            if (r.type === 'transfer') return !!r.toPaymentAccountId
            return !!r.categoryId
        })

        if (validRows.length === 0) {
            await showAlert('Vui lòng nhập ít nhất một giao dịch hợp lệ (đầy đủ thông tin và số tiền > 0)')
            return
        }

        // --- Bulk Balance Check ---
        const accUsage: Record<string, number> = {}
        for (const r of validRows) {
            if (r.type === 'expense' || r.type === 'transfer') {
                accUsage[r.paymentAccountId] = (accUsage[r.paymentAccountId] || 0) + r.amount
            }
        }

        for (const [accId, spent] of Object.entries(accUsage)) {
            const acc = accounts.find(a => a.id === accId)
            const initial = acc?.initialBalance || 0
            const txs = state.transactions.filter((t: any) => t.paymentAccountId === accId || t.toPaymentAccountId === accId)
            let currentBalance = initial
            txs.forEach((t: any) => {
                if (t.paymentAccountId === accId) currentBalance -= t.amount
                if (t.toPaymentAccountId === accId) currentBalance += t.amount
            })

            if (currentBalance < spent) {
                await showAlert(`Tài khoản "${acc?.name}" không đủ số dư. Hiện có: ${fmtVND(currentBalance)}, Cần chi: ${fmtVND(spent)}`)
                return
            }
        }

        const now = new Date().toISOString()
        const txs: Transaction[] = validRows.map(r => ({
            ...r,
            status: 'open',
            createdBy: currentUser?.id || '',
            createdAt: now,
            updatedAt: now
        }))

        onSave(txs)
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <div className="absolute inset-0 bg-text-main/40 backdrop-blur-md animate-in fade-in duration-500" onClick={async () => { if (await showConfirm('Bạn có chắc chắn muốn đóng? Dữ liệu đang nhập sẽ bị mất.')) onClose() }} />
            <div
                className="relative w-full max-w-[95vw] lg:max-w-7xl h-[85vh] bg-white rounded-[48px] shadow-luxury overflow-hidden border border-gold-light/20 flex flex-col animate-modal-up"
                onClick={e => e.stopPropagation()}
            >
                {/* Decoration */}
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gold-light/5 rounded-full -mr-64 -mt-64 blur-[120px] pointer-events-none" />

                {/* Header */}
                <div className="p-10 border-b border-gold-light/10 flex justify-between items-center relative z-10">
                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <span className="px-4 py-1.5 bg-gold-light/30 text-gold-muted text-[10px] font-black uppercase tracking-[0.2em] rounded-full border border-gold-light/20 shadow-sm italic">Quản lý chứng từ tập trung</span>
                        </div>
                        <h2 className="text-3xl font-serif font-black italic text-text-main tracking-tighter">Nhập liệu hàng loạt</h2>
                        <p className="text-text-soft/40 text-[11px] font-black uppercase tracking-widest mt-2 italic">Tối ưu hóa quy trình hạch toán đa chứng từ</p>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="text-right hidden sm:block">
                            <p className="text-[10px] font-black uppercase tracking-widest text-gold-muted opacity-60">Tổng số dòng</p>
                            <p className="text-2xl font-serif font-black italic text-text-main tabular-nums">{rows.length}</p>
                        </div>
                        <button onClick={onClose} className="w-12 h-12 rounded-2xl flex items-center justify-center bg-beige-soft/50 text-text-soft/40 hover:text-rose-600 hover:bg-rose-50 transition-all group">
                            <X size={24} strokeWidth={1.5} className="group-hover:rotate-90 transition-transform duration-500" />
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-auto p-10 relative z-10 custom-scrollbar">
                    <div className="space-y-6">
                        {rows.map((row, idx) => {
                            const cats = categories.filter(c => row.type === 'income' ? c.section === 'revenue' : c.section !== 'revenue')
                            const branchAccounts = accounts.filter(a => {
                                if (!canViewAllBranches(currentUser)) return a.branchId === currentUser?.branchId
                                return !a.branchId || a.branchId === row.branchId || a.branchId === branches.find(b => b.type === 'hq' || b.isHeadquarter)?.id
                            })

                            return (
                                <div key={row.id} className="group bg-white p-8 rounded-[32px] border border-gold-light/10 shadow-sm hover:shadow-luxury transition-all duration-500 relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-1.5 h-full bg-gold-light/20 group-hover:bg-gold-muted transition-all" />

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-6 items-end">
                                        <div className="lg:col-span-1">
                                            <label className="text-[9px] font-black uppercase tracking-widest text-gold-muted mb-2 block italic">Ngày</label>
                                            <input
                                                type="date"
                                                className="w-full h-12 bg-beige-soft/30 border border-gold-light/10 rounded-xl px-4 text-[13px] font-bold text-text-main focus:outline-none focus:ring-2 focus:ring-gold-light/40"
                                                value={row.date}
                                                onChange={e => updateRow(idx, 'date', e.target.value)}
                                            />
                                        </div>

                                        <div className="lg:col-span-1">
                                            <label className="text-[9px] font-black uppercase tracking-widest text-gold-muted mb-2 block italic">Loại</label>
                                            <select
                                                className="w-full h-12 bg-beige-soft/30 border border-gold-light/10 rounded-xl px-4 text-[13px] font-bold text-text-main focus:outline-none focus:ring-2 focus:ring-gold-light/40"
                                                value={row.type}
                                                onChange={e => updateRow(idx, 'type', e.target.value)}
                                            >
                                                <option value="expense">Chi phí</option>
                                                <option value="income">Thu nhập</option>
                                                <option value="transfer">Chuyển quỹ</option>
                                            </select>
                                        </div>

                                        <div className="lg:col-span-1">
                                            <label className="text-[9px] font-black uppercase tracking-widest text-gold-muted mb-2 block italic">Chi nhánh</label>
                                            <select
                                                className="w-full h-12 bg-beige-soft/30 border border-gold-light/10 rounded-xl px-4 text-[13px] font-bold text-text-main focus:outline-none focus:ring-2 focus:ring-gold-light/40"
                                                value={row.branchId}
                                                onChange={e => updateRow(idx, 'branchId', e.target.value)}
                                            >
                                                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                            </select>
                                        </div>

                                        <div className="lg:col-span-1">
                                            <label className="text-[9px] font-black uppercase tracking-widest text-gold-muted mb-2 block italic">TK {row.type === 'transfer' ? 'gửi' : ''}</label>
                                            <select
                                                className="w-full h-12 bg-beige-soft/30 border border-gold-light/10 rounded-xl px-4 text-[13px] font-bold text-text-main focus:outline-none focus:ring-2 focus:ring-gold-light/40"
                                                value={row.paymentAccountId}
                                                onChange={e => updateRow(idx, 'paymentAccountId', e.target.value)}
                                            >
                                                {branchAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                                            </select>
                                        </div>

                                        <div className="lg:col-span-1">
                                            <label className="text-[9px] font-black uppercase tracking-widest text-gold-muted mb-2 block italic">
                                                {row.type === 'transfer' ? 'TK nhận' : 'D.Mục'}
                                            </label>
                                            {row.type === 'transfer' ? (
                                                <select
                                                    className="w-full h-12 bg-beige-soft/30 border border-gold-light/10 rounded-xl px-4 text-[13px] font-bold text-text-main focus:outline-none focus:ring-2 focus:ring-gold-light/40"
                                                    value={row.toPaymentAccountId || ''}
                                                    onChange={e => updateRow(idx, 'toPaymentAccountId', e.target.value)}
                                                >
                                                    <option value="">Chọn...</option>
                                                    {accounts.map(a => <option key={a.id} value={a.id} disabled={a.id === row.paymentAccountId}>{a.name}</option>)}
                                                </select>
                                            ) : (
                                                <select
                                                    className="w-full h-12 bg-beige-soft/30 border border-gold-light/10 rounded-xl px-4 text-[13px] font-bold text-text-main focus:outline-none focus:ring-2 focus:ring-gold-light/40"
                                                    value={row.categoryId}
                                                    onChange={e => updateRow(idx, 'categoryId', e.target.value)}
                                                >
                                                    <option value="">Chọn...</option>
                                                    {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                </select>
                                            )}
                                        </div>

                                        <div className="lg:col-span-1">
                                            <label className="text-[9px] font-black uppercase tracking-widest text-gold-muted mb-2 block italic">Số tiền</label>
                                            <MoneyInput
                                                className="w-full h-12 bg-beige-soft/30 border border-gold-light/10 rounded-xl px-4 text-[15px] font-black text-text-main focus:outline-none focus:ring-2 focus:ring-gold-light/40 italic tabular-nums"
                                                value={row.amount}
                                                onChange={val => updateRow(idx, 'amount', val)}
                                            />
                                        </div>

                                        <div className="lg:col-span-1 flex items-center justify-end gap-3">
                                            <button
                                                onClick={() => removeRow(idx)}
                                                className="w-12 h-12 rounded-xl flex items-center justify-center bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors shadow-sm border border-rose-100/50"
                                                disabled={rows.length === 1}
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>

                                        <div className="md:col-span-2 lg:col-span-7 mt-4">
                                            <label className="text-[9px] font-black uppercase tracking-widest text-gold-muted mb-2 block italic opacity-60">Ghi chú chi tiết</label>
                                            <input
                                                type="text"
                                                placeholder="Nội dung hạch toán..."
                                                className="w-full h-12 bg-white border border-gold-light/10 rounded-xl px-4 text-[13px] font-bold text-text-main focus:outline-none focus:ring-2 focus:ring-gold-light/20 italic"
                                                value={row.note}
                                                onChange={e => updateRow(idx, 'note', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    <div className="mt-10 flex justify-center">
                        <button
                            onClick={addRow}
                            className="h-14 px-10 rounded-full bg-white border border-gold-light/20 text-gold-muted text-[12px] font-black uppercase tracking-[0.2em] flex items-center gap-3 hover:bg-beige-soft transition-all shadow-sm italic hover:scale-105"
                        >
                            <Plus size={18} strokeWidth={3} /> Thêm chứng từ
                        </button>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-10 bg-beige-soft/20 border-t border-gold-light/10 flex items-center justify-between relative z-10">
                    <button
                        className="h-14 px-10 rounded-2xl bg-white text-text-soft/60 text-[12px] font-black uppercase tracking-[0.2em] border border-gold-light/20 hover:text-rose-600 hover:bg-rose-50 transition-all shadow-sm italic"
                        onClick={onClose}
                    >
                        Hủy bỏ
                    </button>

                    <button
                        onClick={handleSaveAll}
                        className="h-14 px-12 rounded-2xl bg-text-main text-white text-[12px] font-black uppercase tracking-[0.2em] flex items-center gap-3 hover:bg-gold-muted transition-all shadow-sh-gold italic"
                    >
                        <CheckCircle2 size={18} /> Lưu {rows.length} chứng từ
                    </button>
                </div>
            </div>
        </div>
    )
}
