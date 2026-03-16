'use client'
import { useState, useMemo } from 'react'
import { useApp, canViewAllBranches } from '@/lib/auth'
import { calculateAccountBalances, fmtVND, fmtDate } from '@/lib/utils/calculations'
import { Landmark, Wallet, CreditCard, ChevronRight, X, Calendar, Filter, QrCode, Download, Database } from 'lucide-react'
import { useModal } from '@/components/layout/ModalProvider'
import PageHeader from '@/components/layout/PageHeader'

function getBankCode(bankName: string) {
    if (!bankName) return 'vcb'
    const name = bankName.toLowerCase().replace(/\s+/g, '')
    if (name.includes('vietcom') || name === 'vcb') return 'vcb'
    if (name.includes('techcom') || name === 'tcb') return 'tcb'
    if (name.includes('mbbank') || name.includes('quandoi') || name === 'mb') return 'mb'
    if (name.includes('vietin') || name === 'ctg') return 'ctg'
    if (name.includes('bidv')) return 'bidv'
    if (name.includes('agribank') || name === 'vba') return 'vba'
    if (name.includes('acb')) return 'acb'
    if (name.includes('vpbank') || name === 'vpb') return 'vpb'
    if (name.includes('tpbank') || name === 'tpb' || name.includes('tienphong')) return 'tpb'
    if (name.includes('sacom') || name === 'stb') return 'stb'
    if (name.includes('hdbank') || name === 'hdb') return 'hdb'
    if (name.includes('vib')) return 'vib'
    if (name.includes('msb') || name.includes('hanghai')) return 'msb'
    if (name.includes('seabank') || name === 'sea') return 'sea'
    if (name.includes('ocb') || name.includes('phuongdong')) return 'ocb'
    if (name.includes('exim') || name === 'eib') return 'eib'
    if (name.includes('lien') || name.includes('lpb') || name === 'lpb') return 'lpb'
    if (name.includes('shb')) return 'shb'
    return bankName
}

export default function AccountsPage() {
    const { currentUser, state } = useApp()
    const { showConfirm } = useModal()
    const [selectedAccount, setSelectedAccount] = useState<string | null>(null)
    const [filterDate, setFilterDate] = useState('')
    const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1)
    const [filterYear, setFilterYear] = useState(new Date().getFullYear())
    const [qrAccount, setQrAccount] = useState<any>(null)
    const [qrAmount, setQrAmount] = useState('')
    const [qrNote, setQrNote] = useState('')

    const accountBalances = useMemo(() => calculateAccountBalances(state), [state])

    const visibleAccounts = state.accounts.filter(a => {
        if (canViewAllBranches(currentUser)) return true
        return !a.branchId || a.branchId === currentUser?.branchId
    })

    const totalBalance = useMemo(() => {
        return visibleAccounts.reduce((sum, acc) => sum + (accountBalances[acc.id] || 0), 0)
    }, [visibleAccounts, accountBalances])

    const totalCash = useMemo(() => {
        return visibleAccounts.filter(a => a.type === 'cash')
            .reduce((sum, acc) => sum + (accountBalances[acc.id] || 0), 0)
    }, [visibleAccounts, accountBalances])

    const totalBank = useMemo(() => {
        return visibleAccounts.filter(a => a.type !== 'cash')
            .reduce((sum, acc) => sum + (accountBalances[acc.id] || 0), 0)
    }, [visibleAccounts, accountBalances])

    const accDetails = selectedAccount ? state.accounts.find(a => a.id === selectedAccount) : null
    const history = useMemo(() => {
        if (!selectedAccount) return []
        return state.transactions
            .filter(tx => tx.paymentAccountId === selectedAccount || tx.toPaymentAccountId === selectedAccount)
            .filter(tx => {
                const txDate = new Date(tx.date)
                const mMatch = txDate.getMonth() + 1 === filterMonth
                const yMatch = txDate.getFullYear() === filterYear
                const dMatch = !filterDate || tx.date === filterDate
                return mMatch && yMatch && dMatch
            })
            .sort((a, b) => {
                const dateComp = b.date.localeCompare(a.date)
                if (dateComp !== 0) return dateComp
                return (b.createdAt || '').localeCompare(a.createdAt || '')
            })
    }, [selectedAccount, state.transactions, filterDate, filterMonth, filterYear])

    const groupedAccounts = useMemo(() => {
        const visible = state.accounts.filter(a => {
            if (canViewAllBranches(currentUser)) return true
            return !a.branchId || a.branchId === currentUser?.branchId
        })

        const groups: Record<string, { branch: any, accounts: any[] }> = {}

        visible.forEach(acc => {
            const bId = acc.branchId || 'hq'
            if (!groups[bId]) {
                const branch = state.branches.find(b => b.id === bId) || null
                groups[bId] = { branch, accounts: [] }
            }
            groups[bId].accounts.push(acc)
        })

        return Object.entries(groups)
            .sort(([idA, gA], [idB, gB]: [string, any]) => {
                const isHqA = gA.branch?.type === 'hq' || gA.branch?.isHeadquarter;
                const isHqB = gB.branch?.type === 'hq' || gB.branch?.isHeadquarter;
                if (isHqA) return -1
                if (isHqB) return 1
                return (gA.branch?.name || '').localeCompare(gB.branch?.name || '')
            })
    }, [state.accounts, state.branches, currentUser])

    return (
        <div className="page-container">
            <PageHeader
                icon={Landmark}
                title="Tài khoản"
                subtitle="& Sổ quỹ"
                description="Dòng tiền & Số dư thời gian thực"
            />

            <div className="px-10 py-12 pb-32 max-w-[1600px] mx-auto animate-fade-in space-y-12">

                {/* Luxury Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {[
                        { label: 'Tổng số dư khả dụng', value: totalBalance, icon: CreditCard, color: 'text-text-main', bg: 'bg-text-main text-white', iconBg: 'bg-white/10 text-white', shadow: 'shadow-2xl' },
                        { label: 'Tổng tiền mặt', value: totalCash, icon: Wallet, color: 'text-text-main', bg: 'bg-white', iconBg: 'bg-gold-light/20 text-gold-muted', shadow: 'shadow-luxury' },
                        { label: 'Ngân hàng / POS', value: totalBank, icon: Landmark, color: 'text-text-main', bg: 'bg-white', iconBg: 'bg-gold-light/20 text-gold-muted', shadow: 'shadow-luxury' },
                    ].map((c, i) => (
                        <div key={c.label} className={`p-8 rounded-[40px] border border-gold-light/20 ${c.bg} ${c.shadow} group transition-all duration-500 hover:scale-[1.02]`}>
                            <div className="flex justify-between items-start mb-6">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 duration-500 ${c.iconBg}`}>
                                    <c.icon size={28} strokeWidth={1.5} />
                                </div>
                                <div className="text-right">
                                    <p className={`text-[10px] font-black uppercase tracking-[0.2em] opacity-40 ${c.bg.includes('main') ? 'text-gold-muted' : 'text-text-soft'}`}>{c.label}</p>
                                    <h3 className={`text-3xl font-serif font-bold mt-2 italic tabular-nums ${c.bg.includes('main') ? 'text-white' : 'text-text-main'}`}>{fmtVND(c.value)}</h3>
                                </div>
                            </div>
                            <div className={`flex items-center gap-2 text-[9px] font-black uppercase tracking-widest opacity-30 italic ${c.bg.includes('main') ? 'text-white' : 'text-text-soft'}`}>
                                <QrCode size={12} strokeWidth={1.5} /> Hệ thống đồng bộ thời gian thực
                            </div>
                        </div>
                    ))}
                </div>

                {/* Groups by Branch */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
                    {groupedAccounts.map(([branchId, group]) => {
                        const groupTotal = group.accounts.reduce((s: number, a: any) => s + (accountBalances[a.id] || 0), 0)
                        const groupCash = group.accounts.filter((a: any) => a.type === 'cash').reduce((s: number, a: any) => s + (accountBalances[a.id] || 0), 0)
                        const groupBank = group.accounts.filter((a: any) => a.type === 'bank').reduce((s: number, a: any) => s + (accountBalances[a.id] || 0), 0)

                        return (
                            <div key={branchId}>
                                <div className="mb-8 pb-8 border-b-2 border-beige-soft flex flex-col md:flex-row md:items-end justify-between gap-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-gold-light/30 flex items-center justify-center text-gold-muted shadow-sm">
                                            {group.branch?.type === 'hq' || group.branch?.isHeadquarter ? <Landmark size={24} /> : <Calendar size={24} />}
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-serif font-bold text-text-main italic">{group.branch?.name || 'Văn phòng / Ví chung'}</h2>
                                            <p className="text-[10px] font-black text-text-soft/60 uppercase tracking-widest mt-1">Hệ thống quản lý {group.accounts.length} tài khoản</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-8 bg-white px-8 py-4 rounded-[32px] border border-gold-light/20 shadow-sm">
                                        <div className="text-right border-r border-beige-soft pr-8">
                                            <p className="text-[9px] font-black text-text-soft/40 uppercase tracking-widest mb-1">Tổng cộng</p>
                                            <p className="text-xl font-serif font-black text-text-main tabular-nums italic">{fmtVND(groupTotal)}</p>
                                        </div>
                                        <div className="flex items-center gap-6">
                                            <div>
                                                <p className="text-[9px] font-black text-text-soft/40 uppercase tracking-widest mb-1">Tiền mặt</p>
                                                <p className="text-sm font-bold text-gold-muted tabular-nums">{fmtVND(groupCash)}</p>
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-black text-text-soft/40 uppercase tracking-widest mb-1">Ngân hàng</p>
                                                <p className="text-sm font-bold text-text-main tabular-nums">{fmtVND(groupBank)}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                                    {group.accounts.map(acc => {
                                        const bal = accountBalances[acc.id] || 0
                                        const isCash = acc.type === 'cash'
                                        return (
                                            <div key={acc.id} onClick={() => setSelectedAccount(acc.id)} className={`p-8 rounded-[40px] border transition-all cursor-pointer group animate-fade-in ${selectedAccount === acc.id ? 'bg-text-main text-white border-text-main shadow-2xl' : 'bg-white border-gold-light/20 shadow-luxury hover:scale-[1.02]'}`}>
                                                <div className="flex justify-between items-start mb-8">
                                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${selectedAccount === acc.id ? 'bg-white/10 text-white' : (isCash ? 'bg-amber-50 text-amber-600' : 'bg-gold-light/20 text-gold-muted group-hover:bg-white group-hover:shadow-sm')}`}>
                                                        {isCash ? <Wallet size={24} /> : <Landmark size={24} />}
                                                    </div>
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${selectedAccount === acc.id ? 'bg-white/10 text-white' : 'bg-beige-soft text-text-soft/40'}`}>
                                                        <ChevronRight size={14} strokeWidth={2.5} />
                                                    </div>
                                                </div>

                                                <h4 className={`text-lg font-black uppercase leading-tight line-clamp-1 mb-1 ${selectedAccount === acc.id ? 'text-white' : 'text-text-main'}`}>{acc.name}</h4>
                                                <p className={`text-[10px] font-bold uppercase tracking-widest opacity-60 line-clamp-1 italic ${selectedAccount === acc.id ? 'text-gold-muted' : 'text-text-soft'}`}>
                                                    {acc.bankName || (acc.branchId ? state.branches.find(b => b.id === acc.branchId)?.name : 'Văn phòng')}
                                                </p>

                                                <div className="mt-8 pt-8 border-t border-gold-light/10">
                                                    <p className={`text-[9px] font-black uppercase tracking-widest mb-2 opacity-40 ${selectedAccount === acc.id ? 'text-white' : 'text-text-soft'}`}>Số dư khả dụng</p>
                                                    <div className={`text-2xl font-serif font-black tabular-nums tracking-tighter italic ${selectedAccount === acc.id ? 'text-white' : (bal >= 0 ? 'text-text-main' : 'text-rose-600')}`}>
                                                        {fmtVND(bal)}
                                                    </div>
                                                </div>

                                                {acc.accountNumber && (
                                                    <div className={`mt-6 p-4 rounded-2xl border-2 border-dashed flex items-center justify-between gap-3 ${selectedAccount === acc.id ? 'bg-white/5 border-white/10' : 'bg-beige-soft/30 border-gold-light/20'}`}>
                                                        <div className="flex flex-col">
                                                            <span className="text-[8px] font-black uppercase tracking-widest opacity-40">Số tài khoản</span>
                                                            <span className="text-[12px] font-bold tabular-nums tracking-widest">{acc.accountNumber}</span>
                                                        </div>
                                                        {acc.type === 'bank' && (
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); setQrAmount(''); setQrNote(''); setQrAccount(acc) }}
                                                                className={`p-2 rounded-xl border transition-all ${selectedAccount === acc.id ? 'bg-white text-text-main border-white' : 'bg-white text-gold-muted border-gold-light/20 hover:scale-110 active:scale-95'}`}
                                                            >
                                                                <QrCode size={14} />
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )
                    })}
                </div>

            </div>

            {/* Luxury History Modal */}
            {selectedAccount && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-text-main/80 backdrop-blur-md animate-in fade-in duration-300" onClick={async () => { if (await showConfirm('Bạn có chắc chắn muốn đóng?')) setSelectedAccount(null) }}></div>
                    <div className="bg-[#FAF8F6] w-full max-w-5xl max-h-[90vh] rounded-[50px] shadow-2xl relative z-10 flex flex-col overflow-hidden border border-gold-light/20 animate-modal-up">
                        {/* Modal Header */}
                        <div className="h-32 bg-gradient-to-br from-text-main to-gold-muted flex items-center justify-between px-10 relative overflow-hidden flex-shrink-0">
                            <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/5 rounded-full blur-3xl"></div>
                            <div className="relative z-10">
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="px-3 py-1 bg-white/10 text-gold-muted text-[8px] font-black uppercase tracking-widest rounded-full border border-white/10">Bản kê chi tiết</span>
                                </div>
                                <h3 className="text-2xl font-serif font-black text-white tracking-tighter uppercase leading-none">
                                    Lịch sử <span className="text-gold-muted font-black tracking-widest text-lg">Giao dịch</span>
                                </h3>
                                <div className="flex items-center gap-3 mt-3">
                                    <span className="text-[10px] font-black text-white uppercase tracking-widest">{accDetails?.name}</span>
                                    {accDetails?.accountNumber && <span className="text-[10px] font-bold text-gold-muted tabular-nums tracking-widest bg-white/10 px-2 py-0.5 rounded-full border border-white/10">STK: {accDetails.accountNumber}</span>}
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedAccount(null)}
                                className="w-12 h-12 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/30 transition-all border border-white/30 relative z-30"
                            >
                                <X size={20} strokeWidth={2.5} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto p-10 space-y-8 custom-scrollbar bg-white rounded-t-[40px] -mt-6 relative z-20">
                            {/* Luxury Filter Bar in Modal */}
                            <div className="bg-beige-soft/40 p-6 rounded-[32px] border border-gold-light/20 shadow-sm flex flex-wrap items-center gap-4">
                                <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-gold-light/20 shadow-sm">
                                    <Filter size={14} className="text-gold-muted" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-gold-muted">Lọc chu kỳ</span>
                                </div>
                                <input type="date" className="bg-white border-gold-light/20 rounded-xl px-4 py-2.5 text-[12px] font-bold text-text-main focus:ring-2 focus:ring-gold-muted/20 outline-none transition-all tabular-nums" value={filterDate} onChange={e => setFilterDate(e.target.value)} />
                                <select className="bg-white border-gold-light/20 rounded-xl px-4 py-2.5 text-[12px] font-bold text-text-main focus:ring-2 focus:ring-gold-muted/20 outline-none transition-all cursor-pointer appearance-none min-w-[120px]" value={filterMonth} onChange={e => setFilterMonth(+e.target.value)}>
                                    {Array.from({ length: 12 }, (_, i) => (
                                        <option key={i + 1} value={i + 1}>Tháng {i + 1}</option>
                                    ))}
                                </select>
                                <select className="bg-white border-gold-light/20 rounded-xl px-4 py-2.5 text-[12px] font-bold text-text-main focus:ring-2 focus:ring-gold-muted/20 outline-none transition-all cursor-pointer appearance-none min-w-[100px]" value={filterYear} onChange={e => setFilterYear(+e.target.value)}>
                                    {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                                {(filterDate || filterMonth !== (new Date().getMonth() + 1) || filterYear !== (new Date().getFullYear())) && (
                                    <button className="text-[10px] font-black text-rose-600 hover:text-rose-700 transition-colors uppercase tracking-[0.2em] px-4" onClick={() => {
                                        setFilterDate('');
                                        setFilterMonth(new Date().getMonth() + 1);
                                        setFilterYear(new Date().getFullYear())
                                    }}>Xóa lọc</button>
                                )}
                            </div>

                            {/* Luxury Table in Modal */}
                            <div className="bg-white rounded-[40px] border border-gold-light/20 shadow-luxury overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-separate border-spacing-0">
                                        <thead>
                                            <tr className="bg-beige-soft/30">
                                                <th className="px-10 py-6 text-[10px] font-black text-gold-muted/60 uppercase tracking-[0.3em] border-b border-gold-light/10">Thời điểm / Loại</th>
                                                <th className="px-10 py-6 text-[10px] font-black text-gold-muted/60 uppercase tracking-[0.3em] border-b border-gold-light/10">Diễn giải / Chi nhánh</th>
                                                <th className="px-10 py-6 text-[10px] font-black text-gold-muted/60 uppercase tracking-[0.3em] border-b border-gold-light/10 text-right">Biến động (+) (-)</th>
                                                <th className="px-10 py-6 text-[10px] font-black text-gold-muted/60 uppercase tracking-[0.3em] border-b border-gold-light/10">Ghi chú</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gold-light/10">
                                            {history.length > 0 ? history.map(tx => {
                                                const cat = state.categories.find(c => c.id === tx.categoryId)
                                                const br = state.branches.find(b => b.id === tx.branchId)
                                                const isIncome = tx.type === 'income' || (tx.type === 'transfer' && tx.toPaymentAccountId === selectedAccount)
                                                return (
                                                    <tr key={tx.id} className="group hover:bg-beige-soft/20 transition-all">
                                                        <td className="px-10 py-7">
                                                            <div className="flex flex-col gap-2">
                                                                <div className="text-[13px] font-black text-text-main tabular-nums">{fmtDate(tx.date)}</div>
                                                                <div className={`w-fit px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${tx.type === 'income' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                                    tx.type === 'transfer' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                                                        'bg-rose-50 text-rose-600 border-rose-100'
                                                                    }`}>
                                                                    {tx.type === 'income' ? '↑ THU' : tx.type === 'transfer' ? '⇄ CHUYỂN' : '↓ CHI'}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-10 py-7">
                                                            <div className="flex flex-col gap-1.5">
                                                                <div className="text-[14px] font-bold text-text-main tracking-tight">
                                                                    {tx.type === 'transfer'
                                                                        ? (tx.toPaymentAccountId === selectedAccount ? 'Nhận từ: ' : 'Chuyển đến: ') + (state.accounts.find(a => a.id === (tx.toPaymentAccountId === selectedAccount ? tx.paymentAccountId : tx.toPaymentAccountId))?.name || 'Tài khoản khác')
                                                                        : (cat?.name || 'Giao dịch khác')}
                                                                </div>
                                                                <div className="text-[10px] font-black text-text-soft/40 uppercase tracking-widest">{br?.name || 'Văn phòng hệ thống'}</div>
                                                            </div>
                                                        </td>
                                                        <td className="px-10 py-7 text-right">
                                                            <div className={`text-[20px] font-serif font-black tabular-nums tracking-tighter ${isIncome ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                                {isIncome ? '+' : '-'}{fmtVND(tx.amount)}
                                                            </div>
                                                        </td>
                                                        <td className="px-10 py-7">
                                                            <p className="text-[12px] font-bold text-text-soft/80 leading-relaxed max-w-[250px] line-clamp-2">{tx.note || '(Không có diễn giải)'}</p>
                                                        </td>
                                                    </tr>
                                                )
                                            }) : (
                                                <tr>
                                                    <td colSpan={4} className="px-10 py-32 text-center">
                                                        <div className="flex flex-col items-center gap-6 opacity-20">
                                                            <Database size={56} strokeWidth={1} className="text-gold-muted" />
                                                            <p className="text-xs font-black uppercase tracking-[0.4em] text-text-soft italic">Lưu trữ trống cho chu kỳ này</p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Luxury QR Modal */}
            {qrAccount && qrAccount.bankName && qrAccount.accountNumber && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-text-main/80 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setQrAccount(null)}></div>
                    <div className="bg-white w-full max-w-[420px] rounded-[50px] shadow-2xl relative z-10 overflow-hidden border border-gold-light/20 animate-modal-up">
                        {/* Header Gradient */}
                        <div className="h-32 bg-gradient-to-br from-text-main to-gold-muted flex items-center justify-between px-10 relative overflow-hidden">
                            <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/5 rounded-full blur-3xl"></div>
                            <div className="relative z-10">
                                <h3 className="block bold text-gold-muted text-xl text-white font-black tracking-[0.4em] mt-1">VIETQR CODE</h3>
                            </div>
                            <button onClick={() => setQrAccount(null)} className="w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/30 transition-all border border-white/30 relative z-30">
                                <X size={18} strokeWidth={2.5} />
                            </button>
                        </div>

                        <div className="p-10 space-y-8 -mt-6 rounded-t-[40px] bg-white relative z-20">
                            {/* Inputs */}
                            <div className="space-y-4">
                                <div className="bg-beige-soft/30 p-4 rounded-2xl border border-gold-light/20">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-text-soft/80 block mb-2 px-1">Số tiền (VNĐ)</label>
                                    <input
                                        type="text"
                                        className="w-full bg-transparent border border-[#FAD296]/60 rounded-xl px-5 py-4 text-1xl font-serif text-text-main tabular-nums outline-none focus:outline-none focus:ring-0 focus:border-[#FAD296] focus:shadow-[0_0_12px_rgba(250,210,150,0.45)] placeholder:text-text-soft/40 transition-all duration-300"
                                        placeholder="0"
                                        value={qrAmount ? Number(qrAmount).toLocaleString('vi-VN') : ''}
                                        onChange={e => {
                                            const val = e.target.value.replace(/[^0-9]/g, '')
                                            setQrAmount(val)
                                        }}
                                    />
                                </div>
                                <div className="bg-beige-soft/30 p-4 rounded-2xl border border-gold-light/20">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-text-soft/80 block mb-2 px-1">Nội dung</label>
                                    <input
                                        type="text"
                                        className="w-full bg-transparent border border-[#FAD296]/60 rounded-xl px-5 py-4 text-1xl font-serif text-text-main tabular-nums outline-none focus:outline-none focus:ring-0 focus:border-[#FAD296] focus:shadow-[0_0_12px_rgba(250,210,150,0.45)] placeholder:text-text-soft/40 transition-all duration-300"
                                        placeholder="Nhập nội dung chuyển khoản..."
                                        value={qrNote}
                                        onChange={e => setQrNote(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* QR Placeholder/Image */}
                            <div className="relative p-2 bg-white rounded-[40px] shadow-md border border-gold-light/20 flex items-center justify-center group overflow-hidden">
                                <div className="absolute inset-0 bg-gold-muted/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-[40px]"></div>
                                <img
                                    src={`https://img.vietqr.io/image/${getBankCode(qrAccount.bankName)}-${qrAccount.accountNumber}-compact2.png?amount=${qrAmount}&addInfo=${encodeURIComponent(qrNote)}&accountName=${encodeURIComponent(qrAccount.accountHolder || '')}`}
                                    alt="VietQR"
                                    className="w-full aspect-square object-contain rounded-32l relative z-10 scale-[1]"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                />
                            </div>

                            {/* Account Info */}
                            <div className="text-center space-y-2">
                                <p className="text-[10px] font-black text-gold-muted uppercase tracking-[0.3em]">{qrAccount.bankName}</p>
                                <p className="text-3xl font-serif font-black text-text-main tabular-nums tracking-widest">{qrAccount.accountNumber}</p>
                                <p className="text-[12px] font-black text-text-soft uppercase tracking-widest opacity-60">{qrAccount.accountHolder}</p>
                            </div>

                            <a
                                href={`https://img.vietqr.io/image/${getBankCode(qrAccount.bankName)}-${qrAccount.accountNumber}-compact2.png?amount=${qrAmount}&addInfo=${encodeURIComponent(qrNote)}&accountName=${encodeURIComponent(qrAccount.accountHolder || '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full bg-text-main text-white py-5 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-luxury flex items-center justify-center gap-3 hover:bg-gold-muted transition-all active:scale-95"
                            >
                                <Download size={18} strokeWidth={2.5} /> Lưu mã QR thanh toán
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
