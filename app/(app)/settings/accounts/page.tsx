'use client'
import { useState } from 'react'
import { useApp, canManageUsers } from '@/lib/auth'
import { PaymentAccount, AccountType } from '@/lib/types'
import { saveAccount } from '@/lib/storage'
import { useModal } from '@/components/ModalProvider'
import { useToast } from '@/components/ToastProvider'
import { Plus, Edit2, X, QrCode, Download, CreditCard, PlusCircle } from 'lucide-react'
import PageHeader from '@/components/PageHeader'

function uid() { return 'pa-' + Math.random().toString(36).slice(2) }

const TYPES: { value: AccountType; label: string; icon: string }[] = [
    { value: 'bank', label: 'Ngân hàng', icon: '🏦' },
    { value: 'cash', label: 'Tiền mặt', icon: '💵' },
    { value: 'pos', label: 'Máy POS', icon: '💳' },
]

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
    const { currentUser, state, saveState } = useApp()
    const { showAlert, showConfirm } = useModal()
    const { showToast } = useToast()
    const [showForm, setShowForm] = useState(false)
    const [editing, setEditing] = useState<PaymentAccount | null>(null)
    const [qrAccount, setQrAccount] = useState<PaymentAccount | null>(null)
    const [form, setForm] = useState<Partial<PaymentAccount>>({})
    const canEdit = canManageUsers(currentUser)

    function openNew() { setForm({ type: 'bank' }); setEditing(null); setShowForm(true) }
    function openEdit(a: PaymentAccount) { setForm({ ...a }); setEditing(a); setShowForm(true) }
    async function handleSave() {
        if (!form.name || !form.type) { await showAlert('Điền tên và loại'); return }
        const acc: PaymentAccount = {
            id: editing?.id ?? uid(), name: form.name!, type: form.type as AccountType,
            bankName: form.bankName, accountNumber: form.accountNumber,
            accountHolder: form.accountHolder, branchId: form.branchId || undefined,
            createdAt: editing?.createdAt ?? new Date().toISOString(),
        }
        // 1. Pure update
        saveState(saveAccount(acc))

        // 2. Side effects
        import('@/lib/storage').then(m => m.syncAccount(acc, currentUser?.id).then(log => {
            if (log) saveState(s => ({ ...s, activityLogs: [log, ...(s.activityLogs || [])].slice(0, 200) }))
        }))

        showToast('Lưu thành công', `Đã ${editing ? 'cập nhật' : 'thêm mới'} tài khoản ${acc.name}`)
        setShowForm(false)
    }

    return (
        <div className="page-container bg-[#FAF8F6]">
            <PageHeader
                icon={CreditCard}
                title="Tài khoản thanh toán"
                subtitle="Payment Accounts"
                description="Hệ thống quản lý nguồn tiền & Đối soát"
                actions={canEdit && (
                    <button
                        onClick={openNew}
                        className="px-6 py-3 bg-text-main text-white rounded-[15px] text-[11px] font-black uppercase tracking-[0.2em] shadow-luxury hover:bg-gold-muted hover:shadow-gold-muted/20 transition-all duration-300 flex items-center gap-2 active:scale-95 group"
                    >
                        <PlusCircle size={18} strokeWidth={2.5} className="group-hover:rotate-90 transition-transform duration-500" />
                        Thêm tài khoản
                    </button>
                )}
            />

            <div className="px-10 pb-20">
                <div className="bg-white border border-gold-light/20 rounded-[32px] shadow-luxury overflow-hidden animate-fade-in">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left luxury-table border-collapse">
                            <thead>
                                <tr className="bg-beige-soft/50 border-b border-gold-light/20">
                                    <th className="px-8 py-5 text-[10px] font-black text-text-soft uppercase tracking-widest">Tên tài khoản / Chi nhánh</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-text-soft uppercase tracking-widest text-center">Loại</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-text-soft uppercase tracking-widest">Thông tin ngân hàng</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-text-soft uppercase tracking-widest">Số tài khoản</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-text-soft uppercase tracking-widest text-right w-36">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gold-light/10">
                                {state.accounts.map(a => {
                                    const type = TYPES.find(t => t.value === a.type)
                                    const branch = a.branchId ? state.branches.find(b => b.id === a.branchId) : null
                                    return (
                                        <tr key={a.id} className="hover:bg-beige-soft/30 transition-colors group">
                                            <td className="px-8 py-6">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-text-main tracking-tight">{a.name}</span>
                                                    <span className="text-[10px] font-bold text-text-soft uppercase tracking-widest opacity-60 mt-1">
                                                        {branch?.name ?? 'Dùng chung'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-center">
                                                <span className="inline-flex items-center gap-2 px-3 py-1 bg-gold-light border border-gold-muted/20 text-gold-muted text-[10px] font-black rounded-lg uppercase tracking-tight">
                                                    {type?.icon} {type?.label}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex flex-col">
                                                    <span className="text-[13px] font-bold text-text-main">{a.bankName ?? '—'}</span>
                                                    <span className="text-[11px] font-medium text-text-soft opacity-60">{a.accountHolder ?? '—'}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <span className="text-[13px] font-black text-text-main tabular-nums tracking-wider">
                                                    {a.accountNumber ?? '—'}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {a.type === 'bank' && (
                                                        <button
                                                            className="p-3 bg-white text-gold-muted hover:bg-gold-light rounded-xl transition-all shadow-sm active:scale-90 border border-gold-light/20"
                                                            onClick={() => setQrAccount(a)}
                                                            title="Mã QR Nhận tiền"
                                                        >
                                                            <QrCode size={16} strokeWidth={1.5} />
                                                        </button>
                                                    )}
                                                    {canEdit && (
                                                        <button
                                                            className="p-3 bg-gray-50 text-gray-400 hover:text-gold-muted hover:bg-gold-light rounded-xl transition-all shadow-sm active:scale-90 border border-gold-light/10"
                                                            onClick={() => openEdit(a)}
                                                            title="Sửa thông tin"
                                                        >
                                                            <Edit2 size={16} strokeWidth={1.5} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            {/* Luxury Account Setup Modal */}
            {showForm && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 md:p-6 bg-black/40 backdrop-blur-md animate-fade-in overflow-y-auto cursor-pointer md:left-[280px]" onClick={async e => { if (e.target === e.currentTarget && await showConfirm('Bạn có chắc chắn muốn đóng? Dữ liệu đang nhập sẽ bị mất.')) setShowForm(false) }}>
                    <div className="bg-white w-full max-w-xl h-fit rounded-[32px] md:rounded-[40px] shadow-2xl overflow-hidden flex flex-col md:flex-row animate-modal-up border border-gold-light/20 my-auto cursor-default relative" onClick={(e) => e.stopPropagation()}>
                        {/* Left Side: Compact Branding Sidebar */}
                        <div className="w-full md:w-[120px] bg-text-main relative overflow-hidden flex flex-col p-6 text-white shrink-0 items-center justify-center">
                            <div className="absolute inset-0 opacity-20" style={{ background: 'radial-gradient(circle at 20% 150%, #C5A059, transparent), radial-gradient(circle at 80% -50%, #F2EBE1, transparent)' }}></div>
                            <div className="relative z-10 flex flex-col items-center">
                                <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center mb-2">
                                    <CreditCard className="text-gold-muted" size={20} />
                                </div>
                                <p className="text-[10px] text-gold-muted font-black uppercase tracking-[0.2em] opacity-80 text-center">Xinh Group</p>
                            </div>
                        </div>

                        {/* Right Side: Form Layout */}
                        <div className="flex-1 bg-white flex flex-col relative min-w-0 p-8 md:p-10">
                            <button onClick={() => setShowForm(false)} className="absolute top-6 right-6 p-3 hover:bg-rose-50 hover:text-rose-600 text-gray-300 rounded-xl transition-all active:scale-95 shadow-sm border border-gold-light/10 bg-white/50 backdrop-blur-sm">
                                <X size={20} strokeWidth={1.5} />
                            </button>

                            <div className="mb-8">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-1 h-1 rounded-full bg-gold-muted"></div>
                                    <span className="text-[10px] font-black text-gold-muted uppercase tracking-[0.2em] italic">Thiết lập nguồn vốn</span>
                                </div>
                                <h2 className="text-2xl font-serif font-black text-text-main tracking-tight italic uppercase">
                                    {editing ? 'Hiệu chỉnh' : 'Khởi tạo'} <span className="text-gold-muted">Tài khoản</span>
                                </h2>
                            </div>

                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-text-soft/40 block px-1 italic">Tên định danh</label>
                                        <input
                                            className="w-full bg-beige-soft/30 border border-gold-light/20 rounded-xl px-5 py-4 text-[13px] font-bold text-text-main focus:ring-4 focus:ring-gold-muted/5 outline-none transition-all shadow-sm italic"
                                            placeholder="Ví dụ: Techcombank Main..."
                                            value={form.name ?? ''}
                                            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-text-soft/40 block px-1 italic">Phân loại nguồn</label>
                                        <select
                                            className="w-full bg-beige-soft/30 border border-gold-light/20 rounded-xl px-5 py-4 text-[13px] font-bold text-text-main focus:ring-4 focus:ring-gold-muted/5 outline-none transition-all appearance-none shadow-sm italic"
                                            value={form.type ?? 'bank'}
                                            onChange={e => setForm(f => ({ ...f, type: e.target.value as AccountType }))}
                                        >
                                            {TYPES.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
                                        </select>
                                    </div>
                                </div>

                                {form.type === 'bank' && (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-text-soft/40 block px-1 italic">Tên ngân hàng</label>
                                                <input
                                                    className="w-full bg-beige-soft/30 border border-gold-light/20 rounded-xl px-5 py-4 text-[13px] font-bold text-text-main focus:ring-4 focus:ring-gold-muted/5 outline-none transition-all shadow-sm italic"
                                                    placeholder="Vietcombank, Techcombank..."
                                                    value={form.bankName ?? ''}
                                                    onChange={e => setForm(f => ({ ...f, bankName: e.target.value }))}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-text-soft/40 block px-1 italic">Số hiệu tài khoản</label>
                                                <input
                                                    className="w-full bg-beige-soft/30 border border-gold-light/20 rounded-xl px-5 py-4 text-[13px] font-black text-text-main focus:ring-4 focus:ring-gold-muted/5 outline-none transition-all tabular-nums shadow-sm italic"
                                                    value={form.accountNumber ?? ''}
                                                    onChange={e => setForm(f => ({ ...f, accountNumber: e.target.value }))}
                                                    placeholder="0123456789..."
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-text-soft/40 block px-1 italic">Danh tính chủ tài khoản</label>
                                            <input
                                                className="w-full bg-beige-soft/30 border border-gold-light/20 rounded-xl px-5 py-4 text-[13px] font-black text-text-main focus:ring-4 focus:ring-gold-muted/5 outline-none transition-all uppercase shadow-sm italic"
                                                placeholder="NGUYEN VAN A"
                                                value={form.accountHolder ?? ''}
                                                onChange={e => setForm(f => ({ ...f, accountHolder: e.target.value }))}
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-text-soft/40 block px-1 italic">Phạm vi hạch toán (Branch Scope)</label>
                                    <select
                                        className="w-full bg-beige-soft/30 border border-gold-light/20 rounded-xl px-5 py-4 text-[13px] font-bold text-text-main focus:ring-4 focus:ring-gold-muted/5 outline-none transition-all appearance-none shadow-sm italic"
                                        value={form.branchId ?? ''}
                                        onChange={e => setForm(f => ({ ...f, branchId: e.target.value || undefined }))}
                                    >
                                        <option value="">Khả dụng toàn hệ thống</option>
                                        {state.branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                    </select>
                                </div>

                                <div className="pt-8 flex gap-4">
                                    <button
                                        className="flex-1 h-14 rounded-2xl bg-white text-text-soft/60 text-[11px] font-black uppercase tracking-widest border border-gold-light/20 hover:text-rose-600 hover:bg-rose-50 transition-all active:scale-95 italic"
                                        onClick={() => setShowForm(false)}
                                    >
                                        Hủy hạch toán
                                    </button>
                                    <button
                                        className="flex-[2] h-14 rounded-2xl bg-text-main text-white text-[11px] font-black uppercase tracking-[0.2em] shadow-luxury hover:bg-gold-muted transition-all active:scale-95 flex items-center justify-center gap-3 italic"
                                        onClick={handleSave}
                                    >
                                        Xác nhận lưu cấu hình <PlusCircle size={18} strokeWidth={2.5} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Luxury Settings QR Modal */}
            {qrAccount && qrAccount.bankName && qrAccount.accountNumber && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 md:p-6 bg-black/40 backdrop-blur-md animate-fade-in md:left-[280px]" onClick={() => setQrAccount(null)}>
                    <div className="bg-white w-full max-w-[420px] rounded-[48px] shadow-2xl relative z-10 overflow-hidden border border-gold-light/20 animate-modal-up cursor-default" onClick={e => e.stopPropagation()}>
                        {/* Header Gradient */}
                        <div className="h-32 bg-text-main flex items-center justify-between px-10 relative overflow-hidden">
                            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 100% 0, rgba(197,160,89,0.4), transparent)' }}></div>
                            <div className="relative z-10">
                                <h3 className="text-xl font-serif font-black text-white italic tracking-tighter uppercase leading-none italic">Thanh toán <span className="block text-gold-light text-[9px] font-black tracking-[0.4em] mt-2 italic uppercase">VietQR Smart Gateway</span></h3>
                            </div>
                            <button onClick={() => setQrAccount(null)} className="w-10 h-10 rounded-xl bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-all border border-white/10 relative z-30 group">
                                <X size={20} strokeWidth={2.5} className="group-hover:rotate-90 transition-transform duration-500" />
                            </button>
                        </div>

                        <div className="p-10 space-y-8 bg-white relative z-20 text-center">
                            {/* Account Info */}
                            <div className="space-y-2">
                                <p className="text-[10px] font-black text-gold-muted uppercase tracking-[0.3em] italic">{qrAccount.bankName}</p>
                                <p className="text-3xl font-serif font-black text-text-main tabular-nums tracking-widest italic">{qrAccount.accountNumber}</p>
                                <p className="text-[11px] font-black text-text-soft uppercase tracking-widest opacity-40 italic">{qrAccount.accountHolder}</p>
                            </div>

                            {/* QR Preview */}
                            <div className="relative p-6 bg-beige-soft/20 rounded-[40px] border border-gold-light/20 flex items-center justify-center group overflow-hidden mx-auto max-w-[280px]">
                                <div className="absolute inset-0 bg-white opacity-40 backdrop-blur-sm -z-0"></div>
                                <img
                                    src={`https://img.vietqr.io/image/${getBankCode(qrAccount.bankName)}-${qrAccount.accountNumber}-compact2.png?accountName=${encodeURIComponent(qrAccount.accountHolder || '')}`}
                                    alt="VietQR"
                                    className="w-full aspect-square object-contain rounded-2xl relative z-10 shadow-sm"
                                    onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                />
                            </div>

                            <a
                                href={`https://img.vietqr.io/image/${getBankCode(qrAccount.bankName)}-${qrAccount.accountNumber}-compact2.png?accountName=${encodeURIComponent(qrAccount.accountHolder || '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full h-14 bg-text-main text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-luxury flex items-center justify-center gap-3 hover:bg-gold-muted transition-all active:scale-95 italic"
                            >
                                <Download size={18} strokeWidth={2.5} /> Lưu chứng từ QR
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
