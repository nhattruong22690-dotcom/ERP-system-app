'use client'
import { useState } from 'react'
import { useApp, canManageBranches, hasPermission } from '@/lib/auth'
import { Branch, BranchType } from '@/lib/types'
import { saveBranch } from '@/lib/storage'
import { useModal } from '@/components/ModalProvider'
import { useToast } from '@/components/ToastProvider'
import { Plus, Edit2, X, Building2, Store, Users, Megaphone, Palette, Star, Heart, Zap, Coffee, Building, Landmark, MapPin, Tag, Smartphone, Globe, Sparkles, Stethoscope, Syringe, UserCheck, Activity, HeartPulse, Microscope, Crown, PlusCircle } from 'lucide-react'
import * as LucideIcons from 'lucide-react'
import PageHeader from '@/components/PageHeader'

function uid() { return 'b-' + Math.random().toString(36).slice(2) }

const BRANCH_TYPES: { value: BranchType; label: string; icon: any; color: string }[] = [
    { value: 'hq', label: 'Văn Phòng (HQ)', icon: Building2, color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
    { value: 'spa', label: 'Chi nhánh Spa', icon: Store, color: 'text-rose-600 bg-rose-50 border-rose-200' },
    { value: 'sale', label: 'Team Sale', icon: Users, color: 'text-amber-600 bg-amber-50 border-amber-200' },
    { value: 'mkt', label: 'Team Marketing', icon: Megaphone, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
]

const AVAILABLE_ICONS = [
    'Building2', 'Store', 'Users', 'Megaphone', 'Building', 'Landmark', 'MapPin',
    'Tag', 'Smartphone', 'Globe', 'Zap', 'Star', 'Crown', 'Sparkles', 'Map'
]
const AVAILABLE_COLORS = [
    { name: 'Indigo', value: 'indigo', hex: '#4f46e5', classes: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
    { name: 'Rose', value: 'rose', hex: '#e11d48', classes: 'text-rose-600 bg-rose-50 border-rose-200' },
    { name: 'Amber', value: 'amber', hex: '#d97706', classes: 'text-amber-600 bg-amber-50 border-amber-200' },
    { name: 'Emerald', value: 'emerald', hex: '#059669', classes: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
    { name: 'Cyan', value: 'cyan', hex: '#0891b2', classes: 'text-cyan-600 bg-cyan-50 border-cyan-200' },
    { name: 'Fuchsia', value: 'fuchsia', hex: '#c026d3', classes: 'text-fuchsia-600 bg-fuchsia-50 border-fuchsia-200' },
    { name: 'Violet', value: 'violet', hex: '#7c3aed', classes: 'text-violet-600 bg-violet-50 border-violet-200' },
    { name: 'Sky', value: 'sky', hex: '#0284c7', classes: 'text-sky-600 bg-sky-50 border-sky-200' },
    { name: 'Orange', value: 'orange', hex: '#ea580c', classes: 'text-orange-600 bg-orange-50 border-orange-200' },
    { name: 'Pink', value: 'pink', hex: '#db2777', classes: 'text-pink-600 bg-pink-50 border-pink-200' },
    { name: 'Slate', value: 'slate', hex: '#475569', classes: 'text-slate-600 bg-slate-50 border-slate-200' },
]

export default function BranchesPage() {
    const { currentUser, state, saveState } = useApp()
    const { showAlert, showConfirm } = useModal()
    const { showToast } = useToast()
    const [showForm, setShowForm] = useState(false)
    const [editing, setEditing] = useState<Branch | null>(null)
    const [form, setForm] = useState<Partial<Branch>>({})
    const canEdit = hasPermission(currentUser, 'branch_update')
    const canCreate = hasPermission(currentUser, 'branch_create')

    if (!canManageBranches(currentUser)) {
        return null // Or redirect
    }

    function openNew() { setForm({ type: 'spa' }); setEditing(null); setShowForm(true) }
    function openEdit(b: Branch) { setForm({ ...b, type: b.type || (b.isHeadquarter ? 'hq' : 'spa') }); setEditing(b); setShowForm(true) }
    async function handleSave() {
        if (!form.name || !form.code || !form.type) { await showAlert('Điền tên, mã và chọn loại bộ phận'); return }
        const branch: Branch = {
            id: editing?.id ?? uid(),
            name: form.name!,
            code: form.code!,
            type: form.type,
            isHeadquarter: form.type === 'hq',
            icon: form.icon,
            color: form.color,
            createdAt: editing?.createdAt ?? new Date().toISOString()
        }
        // 1. Pure update
        saveState(saveBranch(branch))

        // 2. Side effects
        import('@/lib/storage').then(m => m.syncBranch(branch, currentUser?.id).then(log => {
            if (log) saveState(s => ({ ...s, activityLogs: [log, ...(s.activityLogs || [])].slice(0, 200) }))
        }))

        showToast('Lưu thành công', `Đã ${editing ? 'cập nhật' : 'thêm mới'} bộ phận ${branch.name}`)
        setShowForm(false)
    }

    return (
        <div className="page-container bg-[#FAF8F6]">
            <PageHeader
                icon={Building2}
                title="Hệ thống Quản lý"
                subtitle="Phòng Ban"
                description="Quản lý Chi nhánh & Team Nội bộ"
                actions={canCreate && (
                    <button
                        onClick={openNew}
                        className="px-6 py-3 bg-text-main text-white rounded-[15px] text-[11px] font-black uppercase tracking-[0.2em] shadow-luxury hover:bg-gold-muted hover:shadow-gold-muted/20 transition-all duration-300 flex items-center gap-2 active:scale-95 group"
                    >
                        <PlusCircle size={18} strokeWidth={2.5} className="group-hover:rotate-90 transition-transform duration-500" />
                        Thêm Bộ phận mới
                    </button>
                )}
            />

            <div className="px-10 pb-20">
                <div className="bg-white border border-gold-light/20 rounded-[32px] shadow-luxury overflow-hidden animate-fade-in">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left luxury-table border-collapse">
                            <thead>
                                <tr className="bg-beige-soft/50 border-b border-gold-light/20">
                                    <th className="px-8 py-5 text-[10px] font-black text-text-soft uppercase tracking-widest text-center w-24">Mã</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-text-soft uppercase tracking-widest">Tên Bộ phận / Chi nhánh</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-text-soft uppercase tracking-widest text-center">Phân Loại</th>
                                    {canEdit && <th className="px-8 py-5 text-right w-24" />}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gold-light/10">
                                {state.branches.map(b => {
                                    const typeId = b.type || (b.isHeadquarter ? 'hq' : 'spa')
                                    const t = BRANCH_TYPES.find(x => x.value === typeId)
                                    const Icon = (LucideIcons as any)[b.icon || ''] || t?.icon || Store
                                    const colorObj = AVAILABLE_COLORS.find(c => c.value === b.color)
                                    const colorClass = colorObj?.classes || t?.color
                                    return (
                                        <tr key={b.id} className="hover:bg-beige-soft/30 transition-colors group">
                                            <td className="px-8 py-6 text-center">
                                                <span className="inline-block px-3 py-1 bg-gold-light border border-gold-muted/20 text-gold-muted text-[10px] font-black rounded-lg uppercase tracking-tighter">
                                                    {b.code}
                                                </span>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-4">
                                                    <div className={`p-2.5 rounded-xl border ${colorClass} group-hover:scale-110 transition-transform`}>
                                                        <Icon size={18} strokeWidth={1.5} />
                                                    </div>
                                                    <span className="text-sm font-bold text-text-main tracking-tight">{b.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-center">
                                                <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${colorClass}`}>
                                                    {t?.label}
                                                </span>
                                            </td>
                                            {canEdit && (
                                                <td className="px-8 py-6 text-right">
                                                    <button
                                                        className="p-3 bg-gray-50 text-gray-400 hover:text-gold-muted hover:bg-gold-light rounded-xl transition-all shadow-sm active:scale-90"
                                                        onClick={() => openEdit(b)}
                                                    >
                                                        <Edit2 size={16} strokeWidth={1.5} />
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            {showForm && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 md:p-6 bg-black/40 backdrop-blur-md animate-fade-in overflow-y-auto cursor-pointer md:left-[280px]" onClick={async e => { if (e.target === e.currentTarget && await showConfirm('Bạn có chắc chắn muốn đóng? Dữ liệu đang nhập sẽ bị mất.')) setShowForm(false) }}>
                    <div className="bg-white w-full max-w-2xl h-fit rounded-[32px] md:rounded-[40px] shadow-2xl overflow-hidden flex flex-col md:flex-row animate-modal-up border border-gold-light/20 my-auto cursor-default relative" onClick={(e) => e.stopPropagation()}>

                        {/* Left Side: Compact Branding Sidebar */}
                        <div className="w-full md:w-[120px] bg-text-main relative overflow-hidden flex flex-col p-6 text-white shrink-0 items-center justify-center">
                            <div className="absolute inset-0 opacity-20" style={{ background: 'radial-gradient(circle at 20% 150%, #C5A059, transparent), radial-gradient(circle at 80% -50%, #F2EBE1, transparent)' }}></div>
                            <div className="relative z-10 flex flex-col items-center">
                                <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center mb-2">
                                    <Building2 className="text-gold-muted" size={20} />
                                </div>
                                <p className="text-[10px] text-gold-muted font-black uppercase tracking-[0.2em] opacity-80 text-center">Xinh Group</p>
                            </div>
                        </div>

                        {/* Right Side: Form Layout */}
                        <div className="flex-1 bg-[#FAF7F2]/30 flex flex-col relative min-w-0 p-8 md:p-10">
                            <button onClick={() => setShowForm(false)} className="absolute top-6 right-6 p-3 hover:bg-rose-50 hover:text-rose-600 text-gray-300 rounded-xl transition-all active:scale-95 shadow-sm border border-gold-light/10 bg-white/50 backdrop-blur-sm">
                                <X size={20} strokeWidth={1.5} />
                            </button>

                            <div className="mb-8">
                                <h2 className="text-2xl font-black text-text-main tracking-tight uppercase">
                                    {editing ? 'Hiệu chỉnh Bộ phận' : 'Thiết lập Bộ phận mới'}
                                </h2>
                                <p className="text-[10px] font-bold text-text-soft mt-1 uppercase tracking-widest opacity-40 italic">Cấu trúc tổ chức hệ thống</p>
                            </div>

                            <div className="space-y-6">
                                <div className="grid grid-cols-3 gap-6">
                                    <div className="col-span-2 space-y-2">
                                        <label className="text-[10px] font-black uppercase text-text-soft/40 tracking-widest block pl-1 italic">Tên Chi nhánh / Team *</label>
                                        <input
                                            className="w-full p-4 bg-white border border-gold-light/20 rounded-2xl font-bold text-sm focus:ring-4 focus:ring-gold-muted/5 outline-none transition-all shadow-sm italic"
                                            value={form.name ?? ''}
                                            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                            placeholder="Tên bộ phận..."
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase text-text-soft/40 tracking-widest block pl-1 italic">Mã Bộ phận *</label>
                                        <input
                                            className="w-full p-4 bg-white border border-gold-light/20 rounded-2xl font-bold text-sm focus:ring-4 focus:ring-gold-muted/5 outline-none transition-all text-center shadow-sm italic uppercase"
                                            value={form.code ?? ''}
                                            maxLength={8}
                                            onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                                            placeholder="CODE"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase text-text-soft/40 tracking-widest block pl-1 italic">Phân loại Bộ phận</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {BRANCH_TYPES.map(t => {
                                            const Icon = t.icon
                                            return (
                                                <button
                                                    key={t.value}
                                                    type="button"
                                                    className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all ${form.type === t.value ? 'bg-gold-light/30 border-gold-muted text-gold-muted shadow-lg shadow-gold-muted/5' : 'bg-white border-gold-light/10 text-text-soft/40 hover:border-gold-light'}`}
                                                    onClick={() => setForm(f => ({ ...f, type: t.value }))}
                                                >
                                                    <div className={`p-2 rounded-lg ${form.type === t.value ? 'bg-gold-muted text-white' : 'bg-beige-soft/50'}`}>
                                                        <Icon size={16} strokeWidth={1.5} />
                                                    </div>
                                                    <span className="font-black text-[10px] uppercase tracking-widest">{t.label}</span>
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-8">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase text-text-soft/40 tracking-widest block flex items-center gap-2 pl-1 italic">
                                            <Star size={12} strokeWidth={1.5} className="text-gold-muted" /> Chọn Biểu tượng
                                        </label>
                                        <div className="grid grid-cols-5 gap-2 p-4 bg-white rounded-[24px] border border-gold-light/20 shadow-inner max-h-[160px] overflow-y-auto custom-scrollbar">
                                            {AVAILABLE_ICONS.map(iconName => {
                                                const IconView = (LucideIcons as any)[iconName]
                                                return (
                                                    <button
                                                        key={iconName}
                                                        type="button"
                                                        onClick={() => setForm(f => ({ ...f, icon: iconName }))}
                                                        className={`aspect-square rounded-xl flex items-center justify-center transition-all ${form.icon === iconName ? 'bg-gold-muted shadow-lg shadow-gold-muted/20 text-white scale-110' : 'text-text-soft/20 hover:text-gold-muted hover:bg-beige-soft/50'}`}
                                                    >
                                                        {IconView && <IconView size={16} strokeWidth={1.5} />}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase text-text-soft/40 tracking-widest block flex items-center gap-2 pl-1 italic">
                                            <Palette size={12} strokeWidth={1.5} className="text-gold-muted" /> Tông màu Luxury
                                        </label>
                                        <div className="grid grid-cols-4 gap-2.5 p-4 bg-white rounded-[24px] border border-gold-light/20 shadow-inner">
                                            {AVAILABLE_COLORS.map(c => (
                                                <button
                                                    key={c.value}
                                                    type="button"
                                                    onClick={() => setForm(f => ({ ...f, color: c.value }))}
                                                    className={`w-full aspect-square rounded-xl flex items-center justify-center transition-all ${form.color === c.value ? 'ring-4 ring-gold-muted/20 ring-offset-2 scale-90' : 'hover:scale-95 shadow-sm opacity-60 hover:opacity-100'}`}
                                                    style={{ backgroundColor: c.hex }}
                                                    title={c.name}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-6 flex gap-4">
                                    <button
                                        onClick={() => setShowForm(false)}
                                        className="flex-1 py-5 bg-white text-text-soft/40 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-rose-50 hover:text-rose-600 border border-gold-light/20 transition-all active:scale-95 shadow-sm italic"
                                    >
                                        Hủy bỏ
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        className="flex-[2] py-5 bg-text-main text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-luxury hover:bg-gold-muted transition-all active:scale-95 shadow-lg italic"
                                    >
                                        Lưu cấu hình hệ thống
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
