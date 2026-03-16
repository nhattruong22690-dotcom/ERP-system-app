'use client'
import { useState, useEffect, useMemo, useRef } from 'react'
import React from 'react'
import { useApp } from '@/lib/auth'
import { JobTitle, DepartmentType, UserRole } from '@/lib/types'
import { saveJobTitle, deleteJobTitleDB, removeJobTitleState } from '@/lib/storage'
import { useModal } from '@/components/layout/ModalProvider'
import { useToast } from '@/components/layout/ToastProvider'
import { Plus, Edit2, Shield, Trash2, Building, Store, Search, X, Tag, Star, Heart, Zap, Coffee, MessageSquare, Scissors, DollarSign, Smartphone, User, Palette, Sparkles, Stethoscope, Syringe, UserCheck, Activity, HeartPulse, Microscope, Crown, Clock, ChevronDown, CheckSquare, Square, Check, CheckCircle2, Info } from 'lucide-react'
import { generateId } from '@/lib/utils/id'
import * as LucideIcons from 'lucide-react'
import { PAGE_OPTIONS, PERM_OPTIONS, PERMISSION_GROUPS } from '@/lib/utils/constants'

const DEPTS: { value: DepartmentType; label: string; icon: any; color: string }[] = [
    { value: 'admin', label: 'Khối Quản trị (Admin)', icon: Crown, color: 'text-purple-600 bg-purple-50 border-purple-200' },
    { value: 'hq', label: 'Khối Văn Phòng (HQ)', icon: Building, color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
    { value: 'spa', label: 'Khối Dịch vụ (Chi nhánh)', icon: Store, color: 'text-rose-600 bg-rose-50 border-rose-200' },
    { value: 'sale', label: 'Khối Kinh doanh (Sale)', icon: Search, color: 'text-amber-600 bg-amber-50 border-amber-200' },
    { value: 'mkt', label: 'Khối Marketing (MKT)', icon: Tag, color: 'text-cyan-600 bg-cyan-50 border-cyan-200' },
]

const ROLES: { value: UserRole; label: string; color: string }[] = [
    { value: 'admin', label: 'Admin', color: 'text-purple-700 bg-purple-100' },
    { value: 'director', label: 'Giám đốc', color: 'text-cyan-700 bg-cyan-100' },
    { value: 'manager', label: 'Quản lý', color: 'text-blue-700 bg-blue-100' },
    { value: 'accountant', label: 'Kế toán', color: 'text-emerald-700 bg-emerald-100' },
    { value: 'staff', label: 'Nhân viên', color: 'text-orange-700 bg-orange-100' },
]

const AVAILABLE_ICONS = [
    'Award', 'Shield', 'User', 'Star', 'Heart', 'Zap', 'Crown', 'UserCheck',
    'Sparkles', 'Stethoscope', 'Syringe', 'Activity', 'HeartPulse', 'Microscope',
    'Scissors', 'MessageSquare', 'Coffee', 'Smartphone', 'Search', 'DollarSign'
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

export default function JobTitlesModal({ onClose }: { onClose: () => void }) {
    const { state, saveState } = useApp()
    const { showAlert, showConfirm } = useModal()
    const { showToast } = useToast()

    const [showForm, setShowForm] = useState(false)
    const [editing, setEditing] = useState<JobTitle | null>(null)
    const [form, setForm] = useState<Partial<JobTitle>>({
        departmentType: 'spa',
        defaultRole: 'staff',
        allowedPages: [],
        permissions: []
    })
    const [expandPerms, setExpandPerms] = useState(false)
    const initialFormStateRef = React.useRef<string>('')

    React.useEffect(() => {
        if (showForm && !initialFormStateRef.current) {
            initialFormStateRef.current = JSON.stringify(form)
        } else if (!showForm) {
            initialFormStateRef.current = ''
        }
    }, [showForm, form])

    const isDirty = React.useMemo(() => {
        if (!showForm || !initialFormStateRef.current) return false
        return JSON.stringify(form) !== initialFormStateRef.current
    }, [showForm, form])

    const handleCloseForm = async () => {
        if (isDirty) {
            if (await showConfirm('Thay đổi chưa được lưu. Bạn có chắc chắn muốn đóng?')) {
                setShowForm(false)
            }
        } else {
            setShowForm(false)
        }
    }

    const jobTitles = state.jobTitles || []

    function openNew() {
        setForm({
            departmentType: 'spa',
            defaultRole: 'staff',
            allowedPages: [],
            permissions: []
        })
        setEditing(null)
        setExpandPerms(false)
        setShowForm(true)
    }

    function openEdit(jt: JobTitle) {
        setForm({
            ...jt,
            allowedPages: jt.allowedPages || [],
            permissions: jt.permissions || []
        })
        setEditing(jt)
        setExpandPerms(false)
        setShowForm(true)
    }

    async function handleSave() {
        if (!form.name || !form.departmentType || !form.defaultRole) {
            await showAlert('Vui lòng nhập đầy đủ Tên chức vụ, Thuộc khối và Quyền mặc định.')
            return
        }

        const newJt: JobTitle = {
            id: editing?.id ?? generateId('jt'),
            name: form.name,
            departmentType: form.departmentType,
            defaultRole: form.defaultRole,
            icon: form.icon,
            color: form.color,
            hasAttendance: form.hasAttendance || false,
            allowedPages: form.allowedPages || [],
            permissions: form.permissions || [],
            createdAt: editing?.createdAt ?? new Date().toISOString()
        }

        saveState(saveJobTitle(newJt))

        try {
            const storage = await import('@/lib/storage')
            await storage.syncJobTitle(newJt)
            showToast('Thành công', 'Đã lưu cấu hình chức vụ')
            setShowForm(false)
        } catch (e) {
            console.error(e)
            showToast('Lỗi', 'Không thể lưu lên cơ sở dữ liệu', 'error' as any)
        }
    }

    async function handleDelete(jt: JobTitle) {
        const inUse = state.users.some(u => u.jobTitleId === jt.id)
        if (inUse) {
            await showAlert(`Không thể xóa chức vụ "${jt.name}" vì đang có nhân sự được phân công. Vui lòng chuyển chức vụ của nhân sự sang chức mới trước khi xóa.`)
            return
        }

        const yes = await showConfirm(`Bạn có chắc muốn xóa VĨNH VIỄN chức vụ "${jt.name}" không?`, 'Xóa chức vụ')
        if (yes) {
            saveState(removeJobTitleState(jt.id))
            try {
                await deleteJobTitleDB(jt.id)
                showToast('Thành công', 'Đã xóa chức vụ')
            } catch (error) {
                console.error(error)
                showToast('Lỗi', 'Không thể xóa dữ liệu', 'error' as any)
            }
        }
    }

    return (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 md:p-6 bg-black/60 backdrop-blur-md animate-fade-in overflow-y-auto cursor-pointer" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
            <div className="bg-white w-full max-w-6xl h-[85vh] rounded-[32px] md:rounded-[40px] shadow-2xl overflow-hidden flex flex-col md:flex-row animate-modal-up border border-gold-light/20 my-auto cursor-default relative" onClick={(e) => e.stopPropagation()}>

                {/* Left Side: Branding Sidebar */}
                <div className="w-full md:w-[180px] bg-text-main relative overflow-hidden flex flex-col p-8 text-white shrink-0 items-center justify-center border-b md:border-b-0 md:border-r border-white/5">
                    <div className="absolute inset-0 opacity-20" style={{ background: 'radial-gradient(circle at 20% 150%, #C5A059, transparent), radial-gradient(circle at 80% -50%, #F2EBE1, transparent)' }}></div>
                    <div className="relative z-10 flex flex-col items-center">
                        <div className="w-20 h-20 rounded-[28px] bg-white/10 border border-white/20 flex items-center justify-center mb-4 backdrop-blur-md">
                            <Shield className="text-gold-muted" size={32} />
                        </div>
                        <div className="text-center">
                            <h4 className="text-[11px] text-gold-muted font-black uppercase tracking-[0.2em] mb-1 italic">Thiết lập</h4>
                            <p className="text-[10px] text-white/40 font-black uppercase tracking-widest whitespace-nowrap">Cơ cấu chức vụ</p>
                            <div className="w-8 h-1 bg-gold-muted/30 mx-auto rounded-full mt-3"></div>
                        </div>

                        <div className="mt-10 flex flex-col items-center gap-2">
                            <div className="text-[24px] font-serif font-black text-gold-muted leading-none">{jobTitles.length}</div>
                            <div className="text-[9px] text-white/40 font-black uppercase tracking-wider">Đang hiệu lực</div>
                        </div>
                    </div>
                </div>

                {/* Right Side: Content Area */}
                <div className="flex-1 bg-white flex flex-col relative min-w-0">
                    {/* Header Controls */}
                    <div className="p-8 md:p-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-gold-light/5">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-text-soft/60">Quản trị nhân sự & Phân quyền</span>
                            </div>
                            <h3 className="text-3xl font-serif font-black text-text-main tracking-tighter uppercase leading-none italic">
                                Danh mục <span className="text-gold-muted">Chức vụ</span>
                            </h3>
                            <p className="text-xs font-bold text-text-soft mt-2 opacity-60 italic">Định nghĩa chức danh toàn hệ thống, cấu hình hoa hồng & quyền truy cập.</p>
                        </div>

                        <div className="flex items-center gap-3">
                            <button onClick={openNew} className="h-14 px-8 bg-text-main text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-luxury hover:bg-gold-muted transition-all active:scale-95 flex items-center gap-3 italic">
                                <Plus size={16} strokeWidth={3} /> Thêm chức vụ mới
                            </button>
                            <button onClick={onClose} className="w-14 h-14 rounded-2xl bg-white text-text-soft hover:text-rose-500 flex items-center justify-center transition-all shadow-sm border border-gold-light/20 active:scale-90">
                                <X size={20} strokeWidth={2.5} />
                            </button>
                        </div>
                    </div>

                    {/* Scrollable List */}
                    <div className="flex-1 p-8 md:p-10 space-y-10 overflow-y-auto luxury-scrollbar bg-beige-soft/5">
                        {DEPTS.map(dept => {
                            const list = jobTitles.filter(j => j.departmentType === dept.value)
                            const Icon = dept.icon
                            return (
                                <section key={dept.value} className="space-y-4">
                                    <div className="flex items-center gap-3 px-2">
                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shadow-sm ${dept.color.split(' ')[1]} ${dept.color.split(' ')[0]}`}>
                                            <Icon size={16} strokeWidth={2.5} />
                                        </div>
                                        <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-text-main/70 italic">{dept.label}</h4>
                                        <div className="flex-1 h-px bg-gradient-to-r from-gold-light/20 to-transparent"></div>
                                        <span className="text-[10px] font-black text-text-soft/30">{list.length} vị trí</span>
                                    </div>

                                    {list.length === 0 ? (
                                        <div className="p-10 text-center bg-white/50 border border-dashed border-gold-light/20 rounded-[32px]">
                                            <p className="text-[10px] font-black text-text-soft/20 uppercase tracking-[0.2em] italic">Chưa phát sinh danh mục</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                                            {list.map(jt => {
                                                const colorObj = AVAILABLE_COLORS.find(c => c.value === jt.color)
                                                return (
                                                    <div key={jt.id} className="bg-white p-5 rounded-3xl border border-gold-light/10 shadow-sm hover:shadow-xl hover:border-gold-muted/30 transition-all duration-500 group relative overflow-hidden">
                                                        <div className="absolute top-0 right-0 w-24 h-24 bg-gold-light/5 rounded-bl-full -mr-12 -mt-12 group-hover:bg-gold-light/10 transition-colors"></div>

                                                        <div className="flex items-start justify-between relative z-10">
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-12 h-12 rounded-2xl bg-beige-soft/50 border border-gold-light/10 flex items-center justify-center text-gold-muted group-hover:scale-110 transition-transform duration-500 shadow-sm">
                                                                    {jt.icon ? (() => {
                                                                        const IconView = (LucideIcons as any)[jt.icon]
                                                                        return IconView ? <IconView size={20} strokeWidth={1.5} style={{ color: colorObj?.hex }} /> : <Shield size={20} />
                                                                    })() : <Shield size={20} />}
                                                                </div>
                                                                <div>
                                                                    <div className="text-[15px] font-black text-text-main tracking-tight leading-none group-hover:text-gold-muted transition-colors">{jt.name}</div>
                                                                    <div className="flex items-center gap-2 mt-2">
                                                                        <span className="text-[9px] font-black uppercase tracking-widest text-text-soft/40 italic">ID: {jt.id.split('_').pop()}</span>
                                                                        {jt.hasAttendance && (
                                                                            <span className="flex items-center gap-1.5 bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest">
                                                                                <Clock size={10} strokeWidth={3} /> Chấm công
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="flex flex-col items-end gap-3">
                                                                <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-wider border ${ROLES.find(r => r.value === jt.defaultRole)?.color.replace('bg-', 'bg-opacity-10 bg-')}`}>
                                                                    {ROLES.find(r => r.value === jt.defaultRole)?.label}
                                                                </span>

                                                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <button onClick={() => openEdit(jt)} className="w-9 h-9 flex items-center justify-center bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm">
                                                                        <Edit2 size={14} />
                                                                    </button>
                                                                    <button onClick={() => handleDelete(jt)} className="w-9 h-9 flex items-center justify-center bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-600 hover:text-white transition-all shadow-sm">
                                                                        <Trash2 size={14} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )}
                                </section>
                            )
                        })}
                    </div>
                </div>

                {/* Sub Modal: Form Edit Overlay */}
                {showForm && (
                    <div className="absolute inset-0 z-[150] flex items-center justify-center p-4 md:p-10 bg-text-main/20 backdrop-blur-xl animate-fade-in rounded-[32px] md:rounded-[40px]">
                        <div className="bg-white w-full max-w-2xl h-fit max-h-[90%] rounded-[32px] shadow-[0_30px_100px_rgba(0,0,0,0.3)] flex flex-col border border-gold-light/20 overflow-hidden animate-modal-up">

                            {/* Sub-Modal Header */}
                            <div className="px-8 py-6 border-b border-gold-light/10 flex justify-between items-center bg-beige-soft/10">
                                <div>
                                    <h3 className="font-serif font-black text-xl text-text-main uppercase tracking-tighter italic">
                                        {editing ? 'Hiệu chỉnh' : 'Thiết lập'} <span className="text-gold-muted font-sans">Chức vụ</span>
                                    </h3>
                                    <p className="text-[10px] font-black text-text-soft/40 uppercase tracking-widest mt-1">Hồ sơ định nghĩa cơ cấu</p>
                                </div>
                                <button onClick={handleCloseForm} className="w-10 h-10 rounded-xl bg-white border border-gold-light/10 text-text-soft hover:text-rose-500 transition-all flex items-center justify-center shadow-sm active:scale-95">
                                    <X size={18} strokeWidth={2.5} />
                                </button>
                            </div>

                            <div className="flex-1 p-8 space-y-8 overflow-y-auto luxury-scrollbar">
                                {/* Basic Info */}
                                <div className="space-y-6">
                                    <div className="form-group">
                                        <label className="text-[10px] font-black text-gold-muted uppercase tracking-[0.2em] italic mb-3 block opacity-70">Tên gọi chức vụ</label>
                                        <input
                                            autoFocus
                                            className="w-full bg-beige-soft/30 border border-gold-light/20 rounded-xl px-5 py-4 text-[14px] font-bold text-text-main focus:outline-none focus:ring-4 focus:ring-gold-muted/5 transition-all italic"
                                            value={form.name || ''}
                                            placeholder="Vd: Quản lý chi nhánh, Kỹ thuật viên..."
                                            onChange={e => setForm({ ...form, name: e.target.value })}
                                        />
                                    </div>

                                    <div className="form-group">
                                        <label className="text-[10px] font-black text-gold-muted uppercase tracking-[0.2em] italic mb-3 block opacity-70">Khối vận hành</label>
                                        <div className="grid grid-cols-2 gap-3">
                                            {DEPTS.map(d => (
                                                <button
                                                    key={d.value}
                                                    type="button"
                                                    onClick={() => setForm({ ...form, departmentType: d.value })}
                                                    className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-all ${form.departmentType === d.value ? 'bg-text-main text-white shadow-luxury border-text-main' : 'bg-white border-gold-light/20 text-text-soft/60 hover:border-gold-muted hover:bg-beige-soft/10'}`}
                                                >
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${form.departmentType === d.value ? 'bg-white/10 text-gold-muted' : 'bg-beige-soft/50 text-text-soft/40'}`}>
                                                        <d.icon size={14} />
                                                    </div>
                                                    <span className="font-black text-[10px] uppercase tracking-wider">{d.label.split('(')[0]}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Visuals */}
                                <div className="grid grid-cols-2 gap-8">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-gold-muted uppercase tracking-[0.2em] italic opacity-70">Biểu tượng</label>
                                        <div className="grid grid-cols-5 gap-2 p-3 bg-beige-soft/30 rounded-2xl border border-gold-light/10">
                                            {AVAILABLE_ICONS.map(iconName => {
                                                const IconView = (LucideIcons as any)[iconName]
                                                return (
                                                    <button
                                                        key={iconName}
                                                        type="button"
                                                        onClick={() => setForm({ ...form, icon: iconName })}
                                                        className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${form.icon === iconName ? 'bg-text-main text-gold-muted shadow-lg' : 'bg-white text-text-soft/30 hover:text-text-main'}`}
                                                    >
                                                        {IconView && <IconView size={16} />}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-gold-muted uppercase tracking-[0.2em] italic opacity-70">Mã màu</label>
                                        <div className="grid grid-cols-4 gap-2 p-3 bg-beige-soft/30 rounded-2xl border border-gold-light/10">
                                            {AVAILABLE_COLORS.map(c => (
                                                <button
                                                    key={c.value}
                                                    type="button"
                                                    onClick={() => setForm({ ...form, color: c.value })}
                                                    className={`w-full aspect-square rounded-lg transition-all ${form.color === c.value ? 'ring-2 ring-offset-2 ring-gold-muted scale-90' : 'hover:scale-105'}`}
                                                    style={{ backgroundColor: c.hex }}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Defaults */}
                                <div className="space-y-6">
                                    <div className="form-group">
                                        <label className="text-[10px] font-black text-gold-muted uppercase tracking-[0.2em] italic mb-3 block opacity-70">Quyền hạn hệ thống mặc định</label>
                                        <select
                                            className="w-full bg-beige-soft/30 border border-gold-light/20 rounded-xl px-5 py-4 text-[13px] font-black text-text-main focus:outline-none focus:ring-4 focus:ring-gold-muted/5 transition-all italic appearance-none"
                                            value={form.defaultRole || 'staff'}
                                            onChange={(e) => setForm({ ...form, defaultRole: e.target.value as UserRole })}
                                        >
                                            {ROLES.map(r => (
                                                <option key={r.value} value={r.value}>{r.label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="flex items-center justify-between p-5 bg-white border border-gold-light/20 rounded-[28px] group hover:border-gold-muted transition-all cursor-pointer shadow-sm" onClick={() => setForm({ ...form, hasAttendance: !form.hasAttendance })}>
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${form.hasAttendance ? 'bg-emerald-50 text-emerald-600 shadow-inner' : 'bg-beige-soft/50 text-text-soft/30'}`}>
                                                <Clock size={20} />
                                            </div>
                                            <div>
                                                <div className="text-[13px] font-black text-text-main uppercase tracking-tight leading-none italic mb-1">Cơ chế Chấm công</div>
                                                <div className="text-[9px] font-bold text-text-soft/40 uppercase tracking-widest italic">Áp dụng bảng công vân tay/app</div>
                                            </div>
                                        </div>
                                        <div className={`w-10 h-5 rounded-full relative transition-colors ${form.hasAttendance ? 'bg-emerald-500' : 'bg-gray-200'}`}>
                                            <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${form.hasAttendance ? 'left-6' : 'left-1'}`} />
                                        </div>
                                    </div>

                                    {/* Granular Permissions Section */}
                                    <div className="border border-gold-light/10 rounded-[32px] overflow-hidden bg-beige-soft/10">
                                        <button
                                            type="button"
                                            onClick={() => setExpandPerms(!expandPerms)}
                                            className="w-full p-6 flex items-center justify-between bg-white hover:bg-beige-soft/20 transition-all"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                                    <Shield size={16} />
                                                </div>
                                                <div className="text-left">
                                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-text-main italic">Ma trận phân quyền mẫu</span>
                                                    {(form.allowedPages?.length || 0) + (form.permissions?.length || 0) > 0 && (
                                                        <div className="text-[8px] font-bold text-indigo-500 uppercase tracking-widest mt-0.5">
                                                            Đang thiết lập {(form.allowedPages?.length || 0)} modules & {(form.permissions?.length || 0)} tác vụ
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <ChevronDown size={14} className={`text-text-soft/40 transition-transform ${expandPerms ? 'rotate-180' : ''}`} />
                                        </button>

                                        {expandPerms && (
                                            <div className="p-6 space-y-4 max-h-[400px] overflow-y-auto luxury-scrollbar">
                                                {PERMISSION_GROUPS.map((group) => {
                                                    const pageActive = (form.allowedPages || []).includes(group.page.value)
                                                    return (
                                                        <div key={group.page.value} className={`p-5 rounded-3xl border transition-all ${pageActive ? 'bg-white border-gold-muted shadow-lg shadow-gold-muted/5' : 'bg-white/50 border-gold-light/10 opacity-60'}`}>
                                                            <div className="flex items-center justify-between mb-4">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const current = form.allowedPages || []
                                                                        const next = pageActive ? current.filter(v => v !== group.page.value) : [...current, group.page.value]
                                                                        setForm({ ...form, allowedPages: next })
                                                                    }}
                                                                    className="flex items-center gap-3"
                                                                >
                                                                    <div className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all ${pageActive ? 'bg-gold-muted border-gold-muted text-white' : 'bg-white border-gold-light/30'}`}>
                                                                        {pageActive && <Check size={14} strokeWidth={3} />}
                                                                    </div>
                                                                    <span className={`text-[11px] font-black uppercase tracking-tight ${pageActive ? 'text-text-main' : 'text-text-soft'}`}>
                                                                        {group.page.label}
                                                                    </span>
                                                                </button>
                                                            </div>

                                                            {group.actions.length > 0 && (
                                                                <div className={`grid grid-cols-1 md:grid-cols-2 gap-2 pl-9 transition-all ${pageActive ? '' : 'opacity-40'}`}>
                                                                    {group.actions.map(action => {
                                                                        const actionActive = (form.permissions || []).includes(action.value)
                                                                        return (
                                                                            <button
                                                                                key={action.value}
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    const current = form.permissions || []
                                                                                    const next = actionActive ? current.filter(v => v !== action.value) : [...current, action.value]
                                                                                    const newForm = { ...form, permissions: next }
                                                                                    // Auto-enable page if an action is enabled
                                                                                    if (!actionActive && !pageActive) {
                                                                                        newForm.allowedPages = [...(form.allowedPages || []), group.page.value]
                                                                                    }
                                                                                    setForm(newForm)
                                                                                }}
                                                                                className={`flex items-center gap-2.5 p-2 px-3 rounded-xl border text-left transition-all ${actionActive ? 'bg-indigo-50 border-indigo-100 text-indigo-700 shadow-sm' : 'bg-transparent border-transparent text-text-soft/40 hover:bg-white hover:border-gold-light/20'}`}
                                                                            >
                                                                                <div className={`w-4 h-4 rounded-md flex items-center justify-center transition-all ${actionActive ? 'bg-indigo-500 text-white' : 'bg-beige-soft text-transparent'}`}>
                                                                                    <Check size={10} strokeWidth={3} />
                                                                                </div>
                                                                                <span className="text-[10px] font-bold uppercase tracking-tight">{action.label}</span>
                                                                            </button>
                                                                        )
                                                                    })}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="p-8 bg-beige-soft/30 border-t border-gold-light/10 flex gap-4">
                                <button onClick={handleCloseForm} className="flex-1 py-4 rounded-2xl bg-white text-text-soft/60 text-[11px] font-black uppercase tracking-widest border border-gold-light/20 hover:text-rose-500 hover:bg-rose-50 transition-all active:scale-95 italic">
                                    Hủy bỏ
                                </button>
                                <button onClick={handleSave} className="flex-[2] py-4 rounded-2xl bg-text-main text-white text-[11px] font-black uppercase tracking-[0.2em] shadow-luxury hover:bg-gold-muted transition-all active:scale-95 flex items-center justify-center gap-3 italic shadow-lg">
                                    {editing ? 'Lưu thay đổi' : 'Hoàn tất thiết lập'} <CheckCircle2 size={16} strokeWidth={2.5} />
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div >
    )
}
