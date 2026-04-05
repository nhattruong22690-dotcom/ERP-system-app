'use client'
import { useState, useMemo, useEffect } from 'react'
import { useApp, canManageUsers, hasPermission } from '@/lib/auth'
import { saveUser } from '@/lib/storage'
import { useModal } from '@/components/layout/ModalProvider'
import { useToast } from '@/components/layout/ToastProvider'
import JobTitlesModal from '@/components/features/settings/JobTitlesModal'
import UserAvatar from '@/components/ui/UserAvatar'
import { Plus, Edit2, X, Shield, Eye, EyeOff, Search, Power, Settings, BadgeCheck, Phone, CheckCircle2, UserCircle, Building, Store, Award, Check, ChevronDown, Landmark, MapPin, Tag, Smartphone, Globe, Star, Heart, Zap, Coffee, MessageSquare, Scissors, DollarSign, Clock, Sparkles, Trash2, History, ArrowRight, PlusCircle, Lock, KeyRound, ShieldCheck, Database } from 'lucide-react'
import * as LucideIcons from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { generateId } from '@/lib/utils/id'
import PageHeader from '@/components/layout/PageHeader'

import { User, UserRole, JobTitle, COLOR_MAP, ROLES, SalaryConfig, SalaryHistory } from '@/lib/types'
import { PAGE_OPTIONS, PERM_OPTIONS, PERMISSION_GROUPS } from '@/lib/utils/constants'


function uid() { return 'u-' + Math.random().toString(36).slice(2) }


export default function UsersPage() {
    const { currentUser, state, saveState, updateUserById } = useApp()
    const { showAlert, showConfirm } = useModal()
    const { showToast } = useToast()
    const router = useRouter()
    const [showForm, setShowForm] = useState(false)
    const [editing, setEditing] = useState<User | null>(null)
    const [form, setForm] = useState<Partial<User> & { password?: string }>({})
    const [showPw, setShowPw] = useState<Record<string, boolean>>({})
    const [searchTerm, setSearchTerm] = useState('')
    const [showJobModal, setShowJobModal] = useState(false)
    const [showSalaryModal, setShowSalaryModal] = useState(false)
    const [modalTab, setModalTab] = useState<'info' | 'permissions' | 'account'>('info')
    const [showPasswordChange, setShowPasswordChange] = useState(false)
    const searchParams = useSearchParams()

    // Auto-open user by ID if provided in URL
    useEffect(() => {
        if (showForm || showJobModal || showSalaryModal) {
            document.body.classList.add('lock-scroll')
        } else {
            document.body.classList.remove('lock-scroll')
        }
        return () => {
            document.body.classList.remove('lock-scroll')
        }
    }, [showForm, showJobModal, showSalaryModal])

    useEffect(() => {
        const userId = searchParams.get('id')
        if (userId && state.users.length > 0) {
            const user = state.users.find(u => u.id === userId)
            if (user) {
                openEdit(user)
                // Clear the ID from URL to avoid re-opening on refresh if needed, 
                // but usually keeping it is fine for bookmarking.
            }
        }
    }, [searchParams, state.users])

    // V8: Work Status & Filter States
    const [activeTab, setActiveTab] = useState<'working' | 'resigned'>('working')

    // Global Access (HQ/Admin) can see everything
    const currentUserJobTitle = useMemo(() => state.jobTitles?.find(jt => jt.id === currentUser?.jobTitleId), [state.jobTitles, currentUser])
    const hasGlobalAccess = currentUser?.role === 'admin' || currentUserJobTitle?.departmentType === 'admin' || currentUserJobTitle?.departmentType === 'hq'
    const isRestricted = !!currentUser?.branchId && !hasGlobalAccess

    const [filterBranch, setFilterBranch] = useState<string>(isRestricted ? (currentUser?.branchId || '') : 'all')
    const [filterJobTitle, setFilterJobTitle] = useState<string>('all')

    // Auto-update filterBranch if restriction status changes
    useMemo(() => {
        if (isRestricted && currentUser?.branchId) {
            setFilterBranch(currentUser.branchId)
        }
    }, [isRestricted, currentUser?.branchId])

    const availableJobTitles = useMemo(() => {
        const branchType = (() => {
            if (!form.branchId) return 'hq'
            const currentBranch = state.branches.find(b => b.id === form.branchId)
            if (!currentBranch) return 'hq'
            return currentBranch.type || (currentBranch.isHeadquarter ? 'hq' : 'spa')
        })()

        return (state.jobTitles || []).filter(j => j.departmentType === branchType)
    }, [form.branchId, state.jobTitles, state.branches])

    const onJobTitleChange = (jtId: string) => {
        const jt = state.jobTitles?.find(j => j.id === jtId)
        if (jt) {
            setForm(f => ({
                ...f,
                jobTitleId: jt.id,
                title: jt.name,
                role: jt.defaultRole,
                hasAttendance: jt.hasAttendance,
                allowedPages: jt.allowedPages || [],
                permissions: jt.permissions || [],
                viewBranchTransactionsFromHQ: jt.viewBranchTransactionsFromHQ || false
            }))
        } else {
            setForm(f => ({ ...f, jobTitleId: undefined, title: '' }))
        }
    }

    const grantAllPermissions = () => {
        const allPages = PERMISSION_GROUPS.map(p => p.page.value)
        const allPermissions = PERMISSION_GROUPS.flatMap(g => {
            const perms = []
            if (g.crud?.create) perms.push(g.crud.create)
            if (g.crud?.update) perms.push(g.crud.update)
            if (g.crud?.delete) perms.push(g.crud.delete)
            if (g.crud?.lock) perms.push(g.crud.lock)
            if (g.crud?.extra) g.crud.extra.forEach(ex => perms.push(ex.value))
            return perms
        })

        setForm(f => ({
            ...f,
            allowedPages: Array.from(new Set(allPages)),
            permissions: Array.from(new Set(allPermissions)),
            viewAllBranches: true,
            role: 'admin'
        }))
        showToast('Thành công', 'Đã cấp toàn bộ quyền truy cập và thao tác cho tài khoản này.', 'success' as any)
    }

    if (!canManageUsers(currentUser)) {
        router.replace('/dashboard'); return null
    }

    function openNew() {
        setForm({ role: 'staff', allowedPages: [], permissions: [], isActive: true, workStatus: 'working' }); setEditing(null); setShowForm(true); setModalTab('info'); setShowPasswordChange(false)
    }
    function openEdit(u: User) {
        setForm({ ...u, password: '', isActive: u.isActive !== false, workStatus: u.workStatus || 'working' }); setEditing(u); setShowForm(true); setModalTab('info'); setShowPasswordChange(false)
    }
    async function handleSave() {
        if (!form.username || !form.displayName || !form.role) { await showAlert('Điền đầy đủ thông tin'); return }
        if (!editing && !form.password) { await showAlert('Nhập mật khẩu'); return }
        const isResigning = form.workStatus === 'resigned'
        const user: User = {
            id: editing?.id ?? uid(),
            username: form.username!,
            displayName: form.displayName!,
            password: form.password ? form.password : editing!.password,
            allowedPages: form.allowedPages ?? editing?.allowedPages ?? [],
            permissions: (form.permissions ?? editing?.permissions ?? []).filter(p => p !== 'branch_view_all'),
            role: form.role as UserRole,
            branchId: form.branchId || undefined,
            title: form.title,
            jobTitleId: form.jobTitleId,
            email: form.email,
            avatarUrl: form.avatarUrl,
            workStatus: form.workStatus as any || 'working',
            hasAttendance: form.hasAttendance,
            salaryConfig: form.salaryConfig,
            viewAllBranches: form.viewAllBranches || false,
            viewBranchTransactionsFromHQ: form.viewBranchTransactionsFromHQ || false,
            isActive: isResigning ? false : (form.isActive !== false),
            createdAt: editing?.createdAt ?? new Date().toISOString(),
        }
        // 1. Pure update
        saveState(saveUser(user))

        // 2. Side effects (Await sync to prevent race conditions on refresh)
        try {
            const storage = await import('@/lib/storage')
            const success = await storage.syncUser(user, currentUser?.id)
            if (!success) {
                showToast('Lỗi đồng bộ', 'Không thể lưu dữ liệu lên máy chủ. Vui lòng thử lại.', 'error' as any)
                return
            }

            // Xử lý Lịch sử Lương (nếu có lý do thay đổi được đính kèm từ SalaryConfigModal)
            // (Hiện tại việc lưu thiết lập lương vào DB nằm trọn trong Modal để độc lập)
        } catch (e) {
            console.error(e)
            showToast('Lỗi hệ thống', 'Có lỗi xảy ra khi lưu dữ liệu.', 'error' as any)
            return
        }

        showToast('Lưu thành công', `Đã lưu thông tin người dùng ${user.displayName}`)
        setShowForm(false)
    }

    // V8: Stats & Filtering logic
    const { totalActive, workingCount, leaveCount, resingedCount } = useMemo(() => {
        const activeUsers = state.users.filter(u => u.workStatus !== 'resigned')
        return {
            totalActive: activeUsers.length,
            workingCount: activeUsers.filter(u => u.workStatus === 'working' || !u.workStatus).length,
            leaveCount: activeUsers.filter(u => u.workStatus === 'on_leave').length,
            resingedCount: state.users.filter(u => u.workStatus === 'resigned').length
        }
    }, [state.users])

    const filteredUsers = useMemo(() => {
        return state.users.filter(u => {
            // Tab filtering
            if (activeTab === 'working' && u.workStatus === 'resigned') return false
            if (activeTab === 'resigned' && u.workStatus !== 'resigned') return false

            // Search
            const searchMatch = !searchTerm ||
                u.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                u.username.toLowerCase().includes(searchTerm.toLowerCase())
            if (!searchMatch) return false

            // Branch filter
            if (filterBranch !== 'all' && u.branchId !== filterBranch) return false

            // Job Title filter
            if (filterJobTitle !== 'all' && u.jobTitleId !== filterJobTitle) return false

            return true
        })
    }, [state.users, activeTab, searchTerm, filterBranch, filterJobTitle])

    return (
        <div className="page-container">
            <PageHeader
                icon={UserCircle}
                title="Hồ sơ Nhân sự"
                subtitle="Personnel Profiles"
                description="Quản lý hiệu suất & Trạng thái nhân viên"
                actions={
                    <div className="flex items-center gap-4">
                        <button
                            className="flex items-center gap-3 bg-white text-text-soft/60 px-6 py-4 rounded-[20px] font-black text-[10px] uppercase tracking-widest border border-gold-light/30 shadow-sm hover:text-gold-muted hover:border-gold-muted/30 transition-all group"
                            onClick={() => setShowJobModal(true)}
                        >
                            <Award size={18} strokeWidth={1.5} className="group-hover:rotate-12 transition-transform duration-500" /> Thiết lập chức vụ
                        </button>
                        {hasPermission(currentUser, 'user_create') && (
                            <button
                                className="flex items-center gap-3 bg-text-main text-white px-10 py-5 rounded-[22px] font-black text-[11px] uppercase tracking-widest shadow-luxury hover:bg-gold-muted transition-all active:scale-95 group relative overflow-hidden"
                                onClick={openNew}
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                                <Plus size={18} strokeWidth={2.5} /> Thêm nhân sự
                            </button>
                        )}
                    </div>
                }
            />

            <div className="px-10 py-12 pb-32 max-w-[1600px] mx-auto animate-fade-in">
                {/* Luxury Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                    <div className="bg-white p-8 rounded-[32px] border border-gold-light/20 shadow-luxury group hover:border-gold-muted/30 transition-all duration-500 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-gold-light/20 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
                        <div className="flex justify-between items-start mb-6">
                            <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center transition-transform group-hover:rotate-6 duration-500">
                                <UserCircle size={28} strokeWidth={1.5} />
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-bold text-text-soft uppercase tracking-widest opacity-60">Tổng nhân sự</p>
                                <h3 className="text-3xl font-serif font-bold text-text-main mt-1 italic">{totalActive} <span className="text-xs font-sans text-text-soft not-italic">NGƯỜI</span></h3>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-8 rounded-[32px] border border-gold-light/20 shadow-luxury group hover:border-gold-muted/30 transition-all duration-500 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
                        <div className="flex justify-between items-start mb-6">
                            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center transition-transform group-hover:rotate-6 duration-500">
                                <CheckCircle2 size={28} strokeWidth={1.5} />
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-bold text-text-soft uppercase tracking-widest opacity-60">Đang làm việc</p>
                                <h3 className="text-3xl font-serif font-bold text-emerald-600 mt-1 italic">{workingCount} <span className="text-xs font-sans text-text-soft not-italic">NGƯỜI</span></h3>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-8 rounded-[32px] border border-gold-light/20 shadow-luxury group hover:border-gold-muted/30 transition-all duration-500 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
                        <div className="flex justify-between items-start mb-6">
                            <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center transition-transform group-hover:rotate-6 duration-500">
                                <Landmark size={28} strokeWidth={1.5} />
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-bold text-text-soft uppercase tracking-widest opacity-60">Đang nghỉ phép</p>
                                <h3 className="text-3xl font-serif font-bold text-amber-600 mt-1 italic">{leaveCount} <span className="text-xs font-sans text-text-soft not-italic">NGƯỜI</span></h3>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabs & Filters Luxury */}
                <div className="bg-white/80 backdrop-blur-md rounded-[32px] border border-gold-light/30 shadow-luxury p-2 flex flex-col md:flex-row items-center justify-between gap-6 mb-12 animate-fade-in">
                    <div className="flex gap-2 p-1.5 bg-beige-soft/50 rounded-2xl">
                        <button
                            onClick={() => setActiveTab('working')}
                            className={`px-8 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === 'working' ? 'bg-gold-muted text-white shadow-lg shadow-gold-muted/20' : 'text-text-soft hover:text-gold-muted hover:bg-white'}`}
                        >
                            Đội ngũ nhân sự
                        </button>
                        <button
                            onClick={() => setActiveTab('resigned')}
                            className={`px-8 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === 'resigned' ? 'bg-rose-600 text-white shadow-lg shadow-rose-200' : 'text-text-soft hover:text-rose-600 hover:bg-white'}`}
                        >
                            Nhân viên cũ
                        </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 px-4">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gold-muted/50" size={16} strokeWidth={1.5} />
                            <input
                                type="text"
                                placeholder="Tìm kiếm nhân sự..."
                                className="pl-12 pr-6 py-3 bg-beige-soft/50 border-none rounded-xl text-xs font-bold focus:ring-2 focus:ring-gold-muted/20 w-full md:w-[280px] transition-all placeholder:text-text-soft/40"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>

                        {!isRestricted ? (
                            <select
                                className="bg-beige-soft/50 border-none rounded-xl py-3 px-6 text-xs font-bold focus:ring-2 focus:ring-gold-muted/20 transition-all cursor-pointer min-w-[200px] text-text-main"
                                value={filterBranch}
                                onChange={e => setFilterBranch(e.target.value)}
                            >
                                <option value="all">Mọi chi nhánh</option>
                                {state.branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                        ) : (
                            <div className="flex items-center gap-2 px-6 py-3 bg-gold-light/30 text-gold-muted rounded-xl border border-gold-light/50 font-black text-[10px] uppercase tracking-wider">
                                <Building size={14} strokeWidth={1.5} /> {state.branches.find(b => b.id === filterBranch)?.name || 'Chi nhánh'}
                            </div>
                        )}

                        <select
                            className="bg-beige-soft/50 border-none rounded-xl py-3 px-6 text-xs font-bold focus:ring-2 focus:ring-gold-muted/20 transition-all cursor-pointer min-w-[200px] text-text-main"
                            value={filterJobTitle}
                            onChange={e => setFilterJobTitle(e.target.value)}
                        >
                            <option value="all">Mọi chức vụ</option>
                            {state.jobTitles?.map(j => <option key={j.id} value={j.id}>{j.name}</option>)}
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-12">
                    {Object.entries(
                        filteredUsers.reduce((acc, u) => {
                            const bId = u.branchId || 'global'
                            if (!acc[bId]) acc[bId] = []
                            acc[bId].push(u)
                            return acc
                        }, {} as Record<string, User[]>)
                    ).map(([bId, branchUsers]) => {
                        const isHq = bId === 'global' || (state.branches.find(b => b.id === bId)?.type === 'hq') || (state.branches.find(b => b.id === bId)?.isHeadquarter)
                        const branchName = bId === 'global' ? 'Hệ thống Trung tâm' : (state.branches.find(b => b.id === bId)?.name || 'Bộ phận Nội bộ')
                        return (
                            <div key={bId} className="bg-white border border-gold-light/20 rounded-[32px] shadow-luxury overflow-hidden animate-fade-in">
                                <div className={`px-10 py-8 flex items-center justify-between ${isHq ? 'bg-indigo-900 text-white' : 'bg-gold-muted text-white'}`}>
                                    <div className="flex items-center gap-5">
                                        <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-md">
                                            {isHq ? <Landmark size={24} strokeWidth={1.5} /> : <Store size={24} strokeWidth={1.5} />}
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-serif font-bold italic tracking-tight uppercase leading-none">{branchName}</h3>
                                            <p className="text-[10px] font-bold opacity-60 mt-2 uppercase tracking-[0.2em]">{isHq ? 'Quản trị & Điều hành' : 'Chi nhánh trực thuộc'}</p>
                                        </div>
                                    </div>
                                    <span className="px-5 py-1.5 bg-white/20 rounded-full text-[11px] font-black uppercase tracking-widest backdrop-blur-md border border-white/10">
                                        {branchUsers.length} <span className="opacity-60">nhân sự</span>
                                    </span>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left luxury-table border-collapse">
                                        <thead>
                                            <tr className="bg-beige-soft/50 border-b border-gold-light/20">
                                                <th className="px-4 md:px-10 py-4 md:py-5 text-[9px] font-black text-text-soft uppercase tracking-widest">Thành viên</th>
                                                <th className="px-4 md:px-10 py-4 md:py-5 text-[9px] md:text-[10px] font-black text-text-soft uppercase tracking-widest">Chức vụ & Vị trí</th>
                                                <th className="px-4 md:px-10 py-4 md:py-5 text-[9px] md:text-[10px] font-black text-text-soft uppercase tracking-widest text-center">Phân quyền</th>
                                                <th className="px-4 md:px-10 py-4 md:py-5 text-[9px] md:text-[10px] font-black text-text-soft uppercase tracking-widest text-center">Trạng thái</th>
                                                <th className="px-4 md:px-10 py-4 md:py-5 text-[9px] md:text-[10px] font-black text-text-soft uppercase tracking-widest text-center">Tài khoản</th>
                                                <th className="px-4 md:px-10 py-4 md:py-5 text-[9px] md:text-[10px] font-black text-text-soft uppercase tracking-widest text-right">Hệ thống</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gold-light/10">
                                            {branchUsers.map(u => {
                                                const role = ROLES.find(r => r.value === u.role)
                                                const jt = state.jobTitles?.find(j => j.id === u.jobTitleId)
                                                const jtColor = COLOR_MAP[jt?.color || 'slate']
                                                return (
                                                    <tr key={u.id} className="hover:bg-beige-soft/30 transition-colors group cursor-pointer" onClick={() => openEdit(u)}>
                                                        <td className="px-4 md:px-10 py-4 md:py-6">
                                                            <div className="flex items-center gap-3 md:gap-4">
                                                                <div className="relative shrink-0">
                                                                    <UserAvatar user={u} size="md" className="ring-2 ring-gold-light ring-offset-2 group-hover:scale-110 transition-transform" />
                                                                    {u.isActive !== false && <div className="absolute -bottom-1 -right-1 w-3 h-3 md:w-4 md:h-4 bg-emerald-500 border-2 border-white rounded-full" />}
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <div className="text-[13px] md:text-[14px] font-bold text-text-main tracking-tight leading-none truncate">{u.displayName}</div>
                                                                    <div className="text-[10px] md:text-[11px] font-medium text-text-soft mt-1 md:mt-1.5 opacity-60 tracking-wider italic truncate">@{u.username}</div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 md:px-10 py-4 md:py-6 whitespace-nowrap">
                                                            {jt ? (
                                                                <span
                                                                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all"
                                                                    style={{ color: jtColor.hex, backgroundColor: jtColor.hex + '10', borderColor: jtColor.hex + '20' }}
                                                                >
                                                                    {jt.icon && (() => {
                                                                        const Icon = (LucideIcons as any)[jt.icon]
                                                                        return Icon ? <Icon size={14} strokeWidth={1.5} /> : null
                                                                    })()}
                                                                    {jt.name}
                                                                </span>
                                                            ) : (
                                                                <span className="text-[11px] font-bold text-text-soft opacity-30 tracking-widest">—</span>
                                                            )}
                                                        </td>
                                                        <td className="px-10 py-6 text-center">
                                                            <span
                                                                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-50 border border-slate-100 text-[10px] font-black text-slate-600 uppercase tracking-widest transition-all group-hover:bg-white"
                                                            >
                                                                <Shield size={12} strokeWidth={1.5} style={{ color: role?.color }} /> {role?.label}
                                                            </span>
                                                        </td>
                                                        <td className="px-10 py-6 text-center">
                                                            {(() => {
                                                                const status = u.workStatus || 'working'
                                                                const configs = {
                                                                    working: { label: 'Đang làm', icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
                                                                    on_leave: { label: 'Nghỉ phép', icon: Landmark, color: 'text-amber-600 bg-amber-50 border-amber-100' },
                                                                    resigned: { label: 'Đã nghỉ việc', icon: X, color: 'text-rose-600 bg-rose-50 border-rose-100' }
                                                                }
                                                                const cfg = configs[status as keyof typeof configs] || configs.working
                                                                return (
                                                                    <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest ${cfg.color}`}>
                                                                        <cfg.icon size={12} strokeWidth={1.5} /> {cfg.label}
                                                                    </span>
                                                                )
                                                            })()}
                                                        </td>
                                                        <td className="px-10 py-6 text-center">
                                                            <div className="flex flex-col items-center gap-2" onClick={e => e.stopPropagation()}>
                                                                <div
                                                                    className={`w-10 h-5 rounded-full relative transition-all cursor-pointer ${u.isActive !== false ? 'bg-gold-muted' : 'bg-slate-200 shadow-inner'}`}
                                                                    onClick={async () => {
                                                                        const success = await updateUserById(u.id, { isActive: !u.isActive })
                                                                        if (success) showToast('Cập nhật', `Đã ${!u.isActive ? 'mở khóa' : 'khóa'} tài khoản`)
                                                                    }}
                                                                >
                                                                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full shadow-sm transition-all ${u.isActive !== false ? 'left-6' : 'left-1'}`} />
                                                                </div>
                                                                <span className={`text-[9px] font-black uppercase tracking-widest ${u.isActive !== false ? 'text-gold-muted' : 'text-slate-400'}`}>
                                                                    {u.isActive !== false ? 'Hoạt động' : 'Tạm khóa'}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-10 py-6 text-right" onClick={e => e.stopPropagation()}>
                                                            <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-4 group-hover:translate-x-0">
                                                                {hasPermission(currentUser, 'user_update') && (
                                                                    <button
                                                                        className="w-10 h-10 rounded-[14px] bg-white text-text-soft/40 hover:text-gold-muted shadow-sm border border-gold-light/20 flex items-center justify-center transition-all hover:scale-110 hover:shadow-md"
                                                                        onClick={() => openEdit(u)}
                                                                        title="Chỉnh sửa"
                                                                    >
                                                                        <Edit2 size={18} strokeWidth={2} />
                                                                    </button>
                                                                )}
                                                                <button
                                                                    className="w-10 h-10 rounded-[14px] bg-white text-text-soft/40 hover:text-emerald-600 shadow-sm border border-gold-light/20 flex items-center justify-center transition-all hover:scale-110 hover:shadow-md"
                                                                    onClick={() => openEdit(u)} // Assuming detailed view is part of edit for now
                                                                    title="Xem chi tiết"
                                                                >
                                                                    <Eye size={18} strokeWidth={2} />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )
                    })}
                </div>
                {/* end page-body */}
            </div> {/* end container */}


            {showForm && (
                <div className="fixed inset-0 z-[2200] flex items-center justify-center p-0 md:p-6 bg-black/60 backdrop-blur-md animate-fade-in overflow-y-auto cursor-pointer" onClick={async e => { if (e.target === e.currentTarget && await showConfirm('Bạn có chắc chắn muốn đóng? Dữ liệu đang nhập sẽ bị mất.')) setShowForm(false) }}>
                    <div className="bg-white w-full md:w-[80vw] h-full md:h-[80vh] rounded-none md:rounded-[40px] shadow-2xl overflow-hidden flex flex-col md:flex-row animate-modal-up border-none md:border md:border-gold-light/20 my-auto cursor-default relative" onClick={(e) => e.stopPropagation()}>

                        {/* Left Side: Branding & Profile Sidebar */}
                        <div className="w-full md:w-[240px] bg-text-main relative overflow-hidden flex flex-row md:flex-col p-6 md:p-8 text-white shrink-0 items-center justify-between border-b md:border-b-0 md:border-r border-white/5 h-auto md:h-full">
                            <div className="absolute inset-0 opacity-20" style={{ background: 'radial-gradient(circle at 20% 150%, #C5A059, transparent), radial-gradient(circle at 80% -50%, #F2EBE1, transparent)' }}></div>

                            <div className="relative z-10 flex items-center md:flex-col gap-4 md:gap-0 w-full">
                                <div className="relative mb-0 md:mb-8 group">
                                    <div className="w-20 h-20 md:w-32 md:h-32 rounded-[24px] md:rounded-[40px] bg-white p-1 shadow-2xl transform group-hover:rotate-3 transition-all duration-500">
                                        <div className="w-full h-full rounded-[20px] md:rounded-[32px] bg-beige-soft overflow-hidden border border-gold-light/20 flex items-center justify-center relative">
                                            {form.avatarUrl ? (
                                                <img src={form.avatarUrl} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="text-2xl md:text-4xl font-serif font-black text-gold-muted uppercase">
                                                    {form.displayName ? form.displayName[0] : '?'}
                                                </div>
                                            )}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setShowSalaryModal(true)}
                                        className="absolute -bottom-1 -right-1 md:-bottom-2 md:-right-2 w-8 h-8 md:w-11 md:h-11 rounded-xl md:rounded-2xl bg-gold-muted text-white flex items-center justify-center shadow-luxury border-2 md:border-4 border-text-main hover:bg-gold-light transition-all active:scale-90 group"
                                        title="Thiết lập lương"
                                    >
                                        <DollarSign size={16} strokeWidth={3} className="group-hover:scale-110 transition-transform" />
                                    </button>
                                </div>

                                <div className="text-left md:text-center space-y-1 md:space-y-2 flex-1 md:w-full">
                                    <h4 className="text-[9px] text-gold-muted font-black uppercase tracking-[0.2em] md:tracking-[0.3em] italic">Hồ sơ công tác</h4>
                                    <p className="text-[12px] md:text-[14px] text-white font-serif font-black uppercase tracking-widest leading-tight">
                                        {form.displayName || 'Nhân sự mới'}
                                    </p>
                                    <div className="inline-block px-2 py-0.5 md:px-3 md:py-1 rounded-full bg-white/5 border border-white/10 mt-1">
                                        <span className="text-[8px] md:text-[9px] font-black text-gold-muted uppercase tracking-widest">
                                            {form.username ? `@${form.username}` : 'ID: NEW'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="relative z-10 hidden md:flex w-full space-y-4 mt-8">
                                <div className={`p-4 rounded-2xl transition-all border ${form.isActive !== false ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
                                    <div className="flex items-center justify-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${form.isActive !== false ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></div>
                                        <span className="text-[10px] font-black uppercase tracking-widest">
                                            {form.isActive !== false ? 'Đang hoạt động' : 'Tài khoản khóa'}
                                        </span>
                                    </div>
                                </div>
                                <div className="text-center">
                                    <div className="w-8 h-1 bg-gold-muted/30 mx-auto rounded-full"></div>
                                </div>
                            </div>
                        </div>

                        {/* Right Side: Tabbed Content */}
                        <div className="flex-1 bg-white flex flex-col relative min-w-0">
                            {/* Header + Close */}
                            <div className="px-6 pt-6 md:px-10 md:pt-10 flex justify-between items-start shrink-0">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 mb-1 md:mb-2">
                                        <Shield size={12} className="text-gold-muted" />
                                        <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-text-soft/60 italic">Quản trị nhân sự</span>
                                    </div>
                                    <h3 className="text-2xl md:text-3xl font-serif font-black text-text-main tracking-tighter uppercase leading-none italic truncate">
                                        {editing ? 'Hiệu chỉnh' : 'Khởi tạo'} <span className="text-gold-muted">Hồ Sơ</span>
                                    </h3>
                                </div>
                                <button onClick={() => setShowForm(false)} className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-white text-text-soft hover:text-rose-500 flex items-center justify-center transition-all shadow-sm border border-gold-light/20 active:scale-90 shrink-0">
                                    <X size={20} strokeWidth={2.5} />
                                </button>
                            </div>

                            {/* Tab Bar */}
                            <div className="px-6 md:px-10 pt-4 md:pt-6 shrink-0">
                                <div className="flex gap-1 p-1 bg-beige-soft/50 rounded-2xl overflow-x-auto luxury-scrollbar">
                                    {([
                                        { key: 'info' as const, label: 'Thông tin', icon: UserCircle },
                                        { key: 'permissions' as const, label: 'Phân quyền', icon: Shield },
                                        { key: 'account' as const, label: 'Tài khoản', icon: KeyRound },
                                    ]).map(tab => (
                                        <button
                                            key={tab.key}
                                            onClick={() => setModalTab(tab.key)}
                                            className={`flex-1 min-w-[90px] flex items-center justify-center gap-2 py-2.5 md:py-3 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all ${modalTab === tab.key ? 'bg-text-main text-white shadow-luxury' : 'text-text-soft/50 hover:text-gold-muted hover:bg-white'}`}
                                        >
                                            <tab.icon size={14} strokeWidth={2} />
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Tab Content — Scrollable */}
                            <div className="flex-1 overflow-y-auto luxury-scrollbar p-6 md:p-10">

                                {/* ═══ TAB 1: THÔNG TIN CƠ BẢN ═══ */}
                                {modalTab === 'info' && (
                                    <div className="space-y-8 animate-fade-in">
                                        <section className="space-y-5">
                                            <div className="flex items-center gap-3 border-b border-gold-light/10 pb-3">
                                                <UserCircle size={16} className="text-gold-muted" />
                                                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-gold-muted italic">Thông tin cá nhân</span>
                                            </div>
                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black uppercase text-text-soft/40 tracking-widest block pl-2 italic">Họ và tên *</label>
                                                    <input className="w-full bg-beige-soft/20 border-2 border-transparent focus:border-gold-muted/30 focus:bg-white rounded-[20px] px-6 py-4 text-[14px] font-black text-text-main outline-none transition-all shadow-sm italic" value={form.displayName ?? ''} onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))} placeholder="Họ tên đầy đủ" />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black uppercase text-text-soft/40 tracking-widest block pl-2 italic">Email</label>
                                                    <input className="w-full bg-beige-soft/20 border-2 border-transparent focus:border-gold-muted/30 focus:bg-white rounded-[20px] px-6 py-4 text-[14px] font-bold text-text-main outline-none transition-all shadow-sm" value={form.email ?? ''} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@example.com" />
                                                </div>
                                            </div>
                                        </section>

                                        <section className="space-y-5">
                                            <div className="flex items-center gap-3 border-b border-gold-light/10 pb-3">
                                                <Building size={16} className="text-gold-muted" />
                                                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-gold-muted italic">Thông tin công tác</span>
                                            </div>
                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black uppercase text-text-soft/40 tracking-widest block pl-2 italic">Cơ sở làm việc</label>
                                                    <div className="relative">
                                                        <select className="w-full bg-beige-soft/20 border-2 border-transparent focus:border-gold-muted/30 focus:bg-white rounded-[20px] px-6 py-4 text-[14px] font-black text-text-main outline-none transition-all appearance-none shadow-sm cursor-pointer italic" value={form.branchId ?? ''} onChange={e => setForm(f => ({ ...f, branchId: e.target.value || undefined, jobTitleId: undefined, title: '' }))}>
                                                            <option value="">Chọn chi nhánh...</option>
                                                            {state.branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                                        </select>
                                                        <ChevronDown size={20} className="absolute right-6 top-1/2 -translate-y-1/2 text-gold-muted/40 pointer-events-none" />
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black uppercase text-text-soft/40 tracking-widest block pl-2 italic">Chức vụ phụ trách</label>
                                                    <div className="relative">
                                                        <select className="w-full bg-indigo-50/40 border-2 border-indigo-100 rounded-[20px] px-6 py-4 text-[14px] font-black text-indigo-900 focus:border-indigo-300 outline-none transition-all appearance-none shadow-sm cursor-pointer italic" value={form.jobTitleId ?? ''} onChange={e => onJobTitleChange(e.target.value)}>
                                                            <option value="">Chọn chức danh...</option>
                                                            {availableJobTitles.map(j => <option key={j.id} value={j.id}>{j.name}</option>)}
                                                        </select>
                                                        <ChevronDown size={20} className="absolute right-6 top-1/2 -translate-y-1/2 text-indigo-300 pointer-events-none" />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Work status */}
                                            <div className="bg-gray-50/80 p-5 rounded-[28px] border border-gold-light/10 space-y-3">
                                                <div className="text-[9px] font-black uppercase text-text-soft/40 tracking-[0.2em] text-center italic">Trạng thái hiện diện</div>
                                                <div className="flex flex-wrap gap-2 justify-center">
                                                    {(['working', 'on_leave', 'resigned'] as const).map(s => (
                                                        <button key={s} onClick={() => setForm(f => ({ ...f, workStatus: s, isActive: s !== 'resigned' }))} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${form.workStatus === s || (!form.workStatus && s === 'working') ? 'bg-text-main text-white shadow-luxury border-text-main' : 'bg-white text-text-soft/40 border-gold-light/20 hover:border-gold-muted'}`}>
                                                            {s === 'working' ? '✓ Đang làm' : s === 'on_leave' ? '☕ Nghỉ phép' : '✕ Nghỉ việc'}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Attendance toggle */}
                                            <div className="flex items-center justify-between p-4 bg-white/60 rounded-2xl border border-gold-light/20 hover:border-gold-light/40 cursor-pointer transition-all" onClick={() => setForm(f => ({ ...f, hasAttendance: !f.hasAttendance }))}>
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${form.hasAttendance ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-gray-100 text-text-soft/30'}`}>
                                                        <Clock size={18} strokeWidth={2} />
                                                    </div>
                                                    <div>
                                                        <div className="text-[11px] font-black text-text-main uppercase tracking-widest leading-none">Chấm công App</div>
                                                        <div className="text-[9px] font-bold text-text-soft/40 mt-1">Xác thực dấu vân tay</div>
                                                    </div>
                                                </div>
                                                <div className={`w-11 h-6 rounded-full relative transition-all duration-300 ${form.hasAttendance ? 'bg-indigo-600' : 'bg-gray-200'}`}>
                                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${form.hasAttendance ? 'left-6' : 'left-1'}`} />
                                                </div>
                                            </div>
                                        </section>
                                    </div>
                                )}

                                {/* ═══ TAB 2: PHÂN QUYỀN — CRUD Matrix ═══ */}
                                {modalTab === 'permissions' && (
                                    <div className="space-y-6 animate-fade-in">
                                        <div className="flex items-center justify-between border-b border-gold-light/10 pb-3">
                                            <div className="flex items-center gap-3">
                                                <Shield size={16} className="text-gold-muted" />
                                                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-gold-muted italic">Ma trận phân quyền</span>
                                            </div>
                                            <button onClick={grantAllPermissions} className="px-4 py-2 bg-text-main text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-gold-muted transition-all flex items-center gap-2 shadow-sm italic">
                                                <ShieldCheck size={14} strokeWidth={3} /> Cấp toàn quyền (Admin)
                                            </button>
                                        </div>

                                        <div className="rounded-[24px] border border-gold-light/20 overflow-x-auto shadow-sm luxury-scrollbar">
                                            <table className="w-full text-left border-collapse">
                                                <thead>
                                                    <tr className="bg-beige-soft/50 border-b border-gold-light/20">
                                                        <th className="px-5 py-3.5 text-[9px] font-black text-text-soft uppercase tracking-widest w-[200px]">Trang</th>
                                                        <th className="px-2 py-3.5 text-[9px] font-black text-emerald-600 uppercase tracking-widest text-center w-[60px]">Xem</th>
                                                        <th className="px-2 py-3.5 text-[9px] font-black text-blue-600 uppercase tracking-widest text-center w-[60px]">Thêm</th>
                                                        <th className="px-2 py-3.5 text-[9px] font-black text-amber-600 uppercase tracking-widest text-center w-[60px]">Sửa</th>
                                                        <th className="px-2 py-3.5 text-[9px] font-black text-rose-600 uppercase tracking-widest text-center w-[60px]">Xóa</th>
                                                        <th className="px-2 py-3.5 text-[9px] font-black text-slate-600 uppercase tracking-widest text-center w-[60px]">
                                                            <Lock size={12} className="mx-auto" />
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gold-light/10">
                                                    {PERMISSION_GROUPS.map(group => {
                                                        const pageVal = group.page.value
                                                        const hasRead = form.allowedPages?.includes(pageVal) ?? false
                                                        const hasCreate = group.crud?.create ? (form.permissions?.includes(group.crud.create) ?? false) : false
                                                        const hasUpdate = group.crud?.update ? (form.permissions?.includes(group.crud.update) ?? false) : false
                                                        const hasDelete = group.crud?.delete ? (form.permissions?.includes(group.crud.delete) ?? false) : false
                                                        const hasLock = group.crud?.lock ? (form.permissions?.includes(group.crud.lock) ?? false) : false

                                                        const togglePerm = (permKey: string | undefined) => {
                                                            if (!permKey) return
                                                            const current = form.permissions || []
                                                            const next = current.includes(permKey) ? current.filter(v => v !== permKey) : [...current, permKey]
                                                            setForm(f => ({ ...f, permissions: next }))

                                                            // If enabling an action, ensure the page itself is enabled (auto-enable Read)
                                                            if (!current.includes(permKey) && !form.allowedPages?.includes(pageVal)) {
                                                                setForm(f => ({ ...f, allowedPages: [...(f.allowedPages || []), pageVal], permissions: next }))
                                                            }
                                                        }
                                                        const togglePage = () => {
                                                            const currentPages = form.allowedPages || []
                                                            if (hasRead) {
                                                                setForm(f => ({ ...f, allowedPages: currentPages.filter(v => v !== pageVal) }))
                                                            } else {
                                                                setForm(f => ({ ...f, allowedPages: [...currentPages, pageVal] }))
                                                            }
                                                        }

                                                        const Toggle = ({ active, color, onClick, disabled }: { active: boolean; color: string; onClick: () => void; disabled?: boolean }) => (
                                                            <div className="flex justify-center">
                                                                <div onClick={disabled ? undefined : onClick} className={`w-9 h-5 rounded-full relative transition-all duration-200 cursor-pointer ${disabled ? 'opacity-20 cursor-not-allowed' : ''} ${active && !disabled ? color : 'bg-gray-200'}`}>
                                                                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${active && !disabled ? 'left-[18px]' : 'left-0.5'}`} />
                                                                </div>
                                                            </div>
                                                        )

                                                        return (
                                                            <tr key={pageVal} className={`hover:bg-beige-soft/20 transition-colors`}>
                                                                <td className="px-5 py-3">
                                                                    <span className="text-[11px] font-black text-text-main uppercase tracking-tight">{group.page.label}</span>
                                                                </td>
                                                                <td className="px-2 py-3"><Toggle active={hasRead} color="bg-emerald-500" onClick={togglePage} /></td>
                                                                <td className="px-2 py-3"><Toggle active={hasCreate} color="bg-blue-500" onClick={() => togglePerm(group.crud?.create)} disabled={!group.crud?.create} /></td>
                                                                <td className="px-2 py-3"><Toggle active={hasUpdate} color="bg-amber-500" onClick={() => togglePerm(group.crud?.update)} disabled={!group.crud?.update} /></td>
                                                                <td className="px-2 py-3"><Toggle active={hasDelete} color="bg-rose-500" onClick={() => togglePerm(group.crud?.delete)} disabled={!group.crud?.delete} /></td>
                                                                <td className="px-2 py-3"><Toggle active={hasLock} color="bg-slate-600" onClick={() => togglePerm(group.crud?.lock)} disabled={!group.crud?.lock} /></td>
                                                            </tr>
                                                        )
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Extra permissions */}
                                        {PERMISSION_GROUPS.filter(g => g.crud?.extra && g.crud.extra.length > 0).length > 0 && (
                                            <div className="space-y-3">
                                                <div className="text-[9px] font-black uppercase text-text-soft/40 tracking-[0.2em] italic">Quyền bổ sung</div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                    {PERMISSION_GROUPS.filter(g => g.crud?.extra).flatMap(g => {
                                                        const pageRead = form.allowedPages?.includes(g.page.value) ?? false
                                                        return (g.crud?.extra || []).map(ex => {
                                                            const active = (form.permissions?.includes(ex.value) ?? false) && pageRead
                                                            return (
                                                                <div key={ex.value} className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${active ? 'bg-indigo-50 border-indigo-200' : 'bg-gray-50/50 border-gold-light/10'}`} onClick={() => { const cur = form.permissions || []; setForm(f => ({ ...f, permissions: active ? cur.filter(v => v !== ex.value) : [...cur, ex.value] })) }}>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-[10px] font-black uppercase tracking-tight text-text-main">{g.page.label}</span>
                                                                        <span className="text-[9px] text-text-soft/60">·</span>
                                                                        <span className="text-[10px] font-bold text-text-soft">{ex.label}</span>
                                                                    </div>
                                                                    <div className={`w-9 h-5 rounded-full relative transition-all ${active ? 'bg-indigo-600' : 'bg-gray-200'}`}>
                                                                        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${active ? 'left-[18px]' : 'left-0.5'}`} />
                                                                    </div>
                                                                </div>
                                                            )
                                                        })
                                                    })}
                                                </div>
                                            </div>
                                        )}

                                        {/* ── Branch Scope ── */}
                                        <div className="space-y-4 pt-2">
                                            <div className="flex items-center gap-3 border-b border-gold-light/10 pb-3">
                                                <Building size={16} className="text-gold-muted" />
                                                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-gold-muted italic">Phạm vi xem dữ liệu</span>
                                            </div>

                                            {/* View All Branches toggle */}
                                            <div className={`flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer ${form.viewAllBranches ? 'bg-indigo-50 border-indigo-200 shadow-sm' : 'bg-gray-50/50 border-gold-light/10'}`} onClick={() => setForm(f => ({ ...f, viewAllBranches: !f.viewAllBranches }))}>
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${form.viewAllBranches ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-gray-100 text-text-soft/30'}`}>
                                                        <Globe size={18} strokeWidth={2} />
                                                    </div>
                                                    <div>
                                                        <div className="text-[11px] font-black text-text-main uppercase tracking-widest leading-none">Xem toàn bộ chi nhánh</div>
                                                        <div className="text-[9px] font-bold text-text-soft/40 mt-1">Toàn quyền xem dữ liệu mọi cơ sở</div>
                                                    </div>
                                                </div>
                                                <div className={`w-11 h-6 rounded-full relative transition-all duration-300 ${form.viewAllBranches ? 'bg-indigo-600' : 'bg-gray-200'}`}>
                                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${form.viewAllBranches ? 'left-6' : 'left-1'}`} />
                                                </div>
                                            </div>

                                            {/* View Branch Transactions From HQ toggle */}
                                            <div className={`flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer ${form.viewBranchTransactionsFromHQ ? 'bg-indigo-50 border-indigo-200 shadow-sm' : 'bg-gray-50/50 border-gold-light/10'}`} onClick={() => setForm(f => ({ ...f, viewBranchTransactionsFromHQ: !f.viewBranchTransactionsFromHQ }))}>
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${form.viewBranchTransactionsFromHQ ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-gray-100 text-text-soft/30'}`}>
                                                        <Database size={18} strokeWidth={2} />
                                                    </div>
                                                    <div>
                                                        <div className="text-[11px] font-black text-text-main uppercase tracking-widest leading-none">Xem giao dịch chi nhánh (từ VP)</div>
                                                        <div className="text-[9px] font-bold text-text-soft/40 mt-1">Xem mọi giao dịch thuộc CN, kể cả do VP tạo</div>
                                                    </div>
                                                </div>
                                                <div className={`w-11 h-6 rounded-full relative transition-all duration-300 ${form.viewBranchTransactionsFromHQ ? 'bg-indigo-600' : 'bg-gray-200'}`}>
                                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${form.viewBranchTransactionsFromHQ ? 'left-6' : 'left-1'}`} />
                                                </div>
                                            </div>

                                            {!form.viewAllBranches && (
                                                <div className="bg-amber-50/60 border border-amber-200/60 rounded-2xl p-4 space-y-2">
                                                    <div className="text-[9px] font-black uppercase text-amber-700 tracking-[0.15em]">📍 Chỉ xem dữ liệu chi nhánh được gán</div>
                                                    <div className="text-[10px] text-amber-600/80 font-medium">
                                                        Nhân sự này chỉ có thể xem dữ liệu thuộc chi nhánh <strong>{state.branches.find(b => b.id === form.branchId)?.name || '(chưa gán)'}</strong>. Để mở rộng truy cập, bật "Xem toàn bộ chi nhánh".
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* ═══ TAB 3: QUẢN LÝ TÀI KHOẢN ═══ */}
                                {modalTab === 'account' && (
                                    <div className="space-y-8 animate-fade-in">
                                        <section className="space-y-5">
                                            <div className="flex items-center gap-3 border-b border-gold-light/10 pb-3">
                                                <KeyRound size={16} className="text-gold-muted" />
                                                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-gold-muted italic">Thông tin đăng nhập</span>
                                            </div>
                                            <div className="space-y-5">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black uppercase text-text-soft/40 tracking-widest block pl-2 italic">Tên đăng nhập (Username) *</label>
                                                    <div className="relative group">
                                                        <div className="absolute left-5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-beige-soft/50 flex items-center justify-center text-gold-muted font-black text-sm border border-gold-light/20 group-focus-within:bg-gold-muted group-focus-within:text-white transition-all">@</div>
                                                        <input className="w-full bg-beige-soft/20 border-2 border-transparent focus:border-gold-muted/30 focus:bg-white rounded-[20px] pl-16 pr-6 py-4 text-[14px] font-black text-text-main outline-none transition-all shadow-sm italic" value={form.username ?? ''} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} placeholder="VD: nhat.truong" />
                                                    </div>
                                                </div>
                                            </div>
                                        </section>

                                        {/* Đổi mật khẩu - Expandable */}
                                        <section className="space-y-4">
                                            <button onClick={() => setShowPasswordChange(!showPasswordChange)} className={`w-full flex items-center justify-between p-5 rounded-[24px] border transition-all ${showPasswordChange ? 'bg-amber-50 border-amber-200' : 'bg-beige-soft/30 border-gold-light/20 hover:border-gold-muted/30'}`}>
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${showPasswordChange ? 'bg-amber-500 text-white' : 'bg-gray-100 text-text-soft/40'}`}>
                                                        <Zap size={18} strokeWidth={2.5} />
                                                    </div>
                                                    <div className="text-left">
                                                        <div className="text-[11px] font-black uppercase tracking-widest text-text-main">Đổi mật khẩu</div>
                                                        <div className="text-[9px] font-bold text-text-soft/40 mt-0.5">{showPasswordChange ? 'Đang hiển thị' : 'Nhấn để mở'}</div>
                                                    </div>
                                                </div>
                                                <ChevronDown size={18} className={`text-text-soft/40 transition-transform ${showPasswordChange ? 'rotate-180' : ''}`} />
                                            </button>

                                            {showPasswordChange && (
                                                <div className="space-y-4 pl-2 animate-fade-in">
                                                    {editing && (
                                                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                                                            <span className="text-[10px] font-bold text-text-soft/60 italic">Mật khẩu hiện tại:</span>
                                                            <span className="text-[12px] font-mono font-bold text-text-main blur-[4px] hover:blur-none transition-all cursor-pointer select-none">{editing.password || '••••••'}</span>
                                                        </div>
                                                    )}
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black uppercase text-text-soft/40 tracking-widest block pl-2 italic">Mật khẩu mới {editing && '(Bỏ trống = giữ cũ)'}</label>
                                                        <input className="w-full bg-beige-soft/20 border-2 border-transparent focus:border-gold-muted/30 focus:bg-white rounded-[20px] px-6 py-4 text-[14px] font-black text-text-main outline-none transition-all shadow-sm font-mono tracking-widest" type="password" value={(form as any).password ?? ''} onChange={e => setForm(f => ({ ...f, password: e.target.value } as any))} placeholder="••••••••" />
                                                    </div>
                                                </div>
                                            )}
                                        </section>

                                        {/* Trạng thái tài khoản */}
                                        <section className="space-y-4">
                                            <div className="flex items-center gap-3 border-b border-gold-light/10 pb-3">
                                                <Power size={16} className="text-gold-muted" />
                                                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-gold-muted italic">Trạng thái tài khoản</span>
                                            </div>
                                            <div className="flex gap-3 p-1.5 bg-beige-soft/30 border border-gold-light/10 rounded-[22px]">
                                                <button className={`flex-1 py-3.5 text-[10px] font-black uppercase tracking-[0.2em] rounded-[18px] transition-all flex items-center justify-center gap-2 ${form.isActive !== false ? 'bg-text-main text-white shadow-luxury' : 'text-text-soft/40 hover:bg-white'}`} onClick={() => setForm(f => ({ ...f, isActive: true }))}>
                                                    {form.isActive !== false && <Check size={12} strokeWidth={3} />} Kích hoạt
                                                </button>
                                                <button className={`flex-1 py-3.5 text-[10px] font-black uppercase tracking-[0.2em] rounded-[18px] transition-all flex items-center justify-center gap-2 ${form.isActive === false ? 'bg-rose-600 text-white shadow-lg' : 'text-text-soft/40 hover:bg-white'}`} onClick={() => setForm(f => ({ ...f, isActive: false }))}>
                                                    {form.isActive === false && <Lock size={12} strokeWidth={3} />} Khóa tài khoản
                                                </button>
                                            </div>
                                        </section>
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="p-5 md:p-8 bg-beige-soft/30 border-t border-gold-light/10 flex gap-3 md:gap-4 shrink-0">
                                <button className="flex-1 py-3.5 md:py-4 rounded-xl md:rounded-2xl bg-white text-text-soft/60 text-[10px] md:text-[11px] font-black uppercase tracking-widest border border-gold-light/20 hover:text-rose-500 hover:bg-rose-50 transition-all active:scale-95 italic" onClick={() => setShowForm(false)}>Hủy</button>
                                <button className="flex-[2] py-3.5 md:py-4 rounded-xl md:rounded-2xl bg-text-main text-white text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] shadow-luxury hover:bg-gold-muted transition-all active:scale-95 shadow-lg flex items-center justify-center gap-2 md:gap-3 italic" onClick={handleSave}>
                                    <CheckCircle2 size={16} strokeWidth={2.5} /> Lưu hồ sơ
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Job Titles Modal */}
            {showJobModal && <JobTitlesModal onClose={() => setShowJobModal(false)} />}
            {showSalaryModal && (
                <SalaryConfigModal
                    user={editing!}
                    initialConfig={form.salaryConfig}
                    onSave={(cfg) => { setForm(f => ({ ...f, salaryConfig: cfg })); setShowSalaryModal(false) }}
                    onClose={() => setShowSalaryModal(false)}
                />
            )}
        </div>
    )
}

function SalaryConfigModal({ user, initialConfig, onSave, onClose }: { user: User, initialConfig?: SalaryConfig, onSave: (cfg: SalaryConfig) => void, onClose: () => void }) {
    const { state, saveState, currentUser } = useApp()
    const { showToast } = useToast()
    const [cfg, setCfg] = useState<SalaryConfig>({
        type: initialConfig?.type || 'working_days',
        standardDays: initialConfig?.standardDays || 26,
        baseSalary: initialConfig?.baseSalary || 0,
        allowances: initialConfig?.allowances || []
    })

    const [isPromptingReason, setIsPromptingReason] = useState(false)
    const [changeReason, setChangeReason] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const historyList = useMemo(() => state.salaryHistory.filter(h => h.userId === user?.id).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), [state.salaryHistory, user?.id])

    const handlePreSave = () => {
        const oldJson = JSON.stringify(initialConfig || {})
        const newJson = JSON.stringify(cfg)
        if (oldJson === newJson) {
            onSave(cfg)
        } else {
            setIsPromptingReason(true)
        }
    }

    const handleConfirmSaveWithReason = async () => {
        if (!changeReason.trim()) {
            showToast('Thiếu thông tin', 'Vui lòng nhập lý do điều chỉnh lương.', 'error' as any)
            return
        }

        setIsSubmitting(true)
        try {
            const storage = await import('@/lib/storage')

            const historyObj: SalaryHistory = {
                id: generateId(),
                userId: user.id,
                changedBy: currentUser?.id,
                oldConfig: initialConfig,
                newConfig: cfg,
                changeReason: changeReason.trim(),
                createdAt: new Date().toISOString()
            }

            await storage.syncSalaryHistory(historyObj)
            const updatedUser = { ...user, salaryConfig: cfg }
            await storage.syncUser(updatedUser, currentUser?.id)

            saveState(storage.saveSalaryHistory(historyObj))
            saveState(storage.saveUser(updatedUser))

            showToast('Thành công', 'Đã cập nhật chính sách lương mới.', 'success' as any)
            onSave(cfg)
        } catch (error) {
            console.error(error)
            showToast('Lỗi', 'Có lỗi xảy ra khi lưu lịch sử.', 'error' as any)
        } finally {
            setIsSubmitting(false)
        }
    }

    const addAllowance = () => setCfg(c => ({ ...c, allowances: [...c.allowances, { name: '', amount: 0 }] }))
    const updateAllowance = (i: number, name: string, amount: number) => {
        const _a = [...cfg.allowances]
        _a[i] = { name, amount }
        setCfg(c => ({ ...c, allowances: _a }))
    }
    const removeAllowance = (i: number) => {
        const _a = cfg.allowances.filter((_, idx) => idx !== i)
        setCfg(c => ({ ...c, allowances: _a }))
    }

    return (
        <div className="fixed inset-0 z-[2300] flex items-center justify-center p-4 md:p-6 bg-black/60 backdrop-blur-md animate-fade-in overflow-y-auto cursor-pointer" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
            <div className="bg-white w-full max-w-2xl h-[80vh] rounded-[32px] md:rounded-[40px] shadow-2xl overflow-hidden flex flex-col md:flex-row animate-modal-up border border-gold-light/20 my-auto cursor-default relative" onClick={(e) => e.stopPropagation()}>

                {/* Left Side: Compact Branding Sidebar */}
                <div className="w-full md:w-[120px] bg-text-main relative overflow-hidden flex flex-col p-6 text-white shrink-0 items-center justify-center h-full">
                    <div className="absolute inset-0 opacity-20" style={{ background: 'radial-gradient(circle at 20% 150%, #C5A059, transparent), radial-gradient(circle at 80% -50%, #F2EBE1, transparent)' }}></div>
                    <div className="relative z-10 flex flex-col items-center">
                        <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center mb-2">
                            <DollarSign className="text-gold-muted" size={20} />
                        </div>
                        <p className="text-[10px] text-gold-muted font-black uppercase tracking-[0.2em] opacity-80 text-center">Payroll</p>
                    </div>
                </div>

                {/* Right Side: Form Content */}
                <div className="flex-1 bg-white flex flex-col relative min-w-0 p-8 md:p-10">
                    <button onClick={onClose} className="absolute top-6 right-6 p-3 hover:bg-rose-50 hover:text-rose-600 text-gray-300 rounded-xl transition-all active:scale-95 shadow-sm border border-gold-light/10 bg-white/50 backdrop-blur-sm">
                        <X size={20} strokeWidth={1.5} />
                    </button>

                    <div className="mb-8">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-gold-muted"></div>
                            <span className="text-[10px] font-black text-gold-muted uppercase tracking-[0.2em] italic">Chính sách lương nhân sự</span>
                        </div>
                        <h2 className="text-2xl font-serif font-black text-text-main tracking-tight italic uppercase">
                            Cấu hình <span className="text-gold-muted">Hợp đồng Lương</span>
                        </h2>
                    </div>

                    <div className="space-y-8 flex-1 overflow-y-auto pr-2 luxury-scrollbar">
                        {/* Basic Config */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-text-soft/40 uppercase tracking-[0.2em] italic ml-1">Hình thức hạch toán</label>
                                <select
                                    className="w-full h-14 bg-beige-soft/30 border border-gold-light/20 rounded-xl px-5 text-[13px] font-bold text-text-main focus:outline-none focus:ring-4 focus:ring-gold-muted/5 shadow-sm appearance-none italic"
                                    value={cfg.type}
                                    onChange={e => setCfg(c => ({ ...c, type: e.target.value as 'working_days' | 'fixed' }))}
                                >
                                    <option value="working_days">Chấm công thực tế</option>
                                    <option value="fixed">Gói khoán cố định</option>
                                </select>
                            </div>
                            {cfg.type === 'working_days' && (
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-text-soft/40 uppercase tracking-[0.2em] italic ml-1">Công tiêu chuẩn</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            className="w-full h-14 bg-beige-soft/30 border border-gold-light/20 rounded-xl px-5 pr-14 text-[13px] font-black text-text-main focus:outline-none focus:ring-4 focus:ring-gold-muted/5 shadow-sm italic text-center"
                                            value={cfg.standardDays}
                                            onChange={e => setCfg(c => ({ ...c, standardDays: Number(e.target.value) }))}
                                        />
                                        <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[10px] font-black text-text-soft/30 uppercase tracking-widest italic pointer-events-none">Ngày</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Salary Amount */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-text-soft/40 uppercase tracking-[0.2em] italic ml-1">Lương cơ bản / Hợp đồng</label>
                            <div className="relative group">
                                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-gold-muted flex items-center justify-center pointer-events-none group-focus-within:text-gold-light transition-colors">
                                    <DollarSign size={20} strokeWidth={2.5} />
                                </div>
                                <input
                                    type="number"
                                    className="w-full h-20 bg-beige-soft/30 border-2 border-gold-light/10 rounded-2xl pl-14 pr-8 text-3xl font-serif font-black text-text-main focus:outline-none focus:ring-8 focus:ring-gold-muted/5 shadow-inner transition-all italic"
                                    value={cfg.baseSalary || ''}
                                    placeholder="0"
                                    onChange={e => setCfg(c => ({ ...c, baseSalary: Number(e.target.value) }))}
                                />
                            </div>
                            <div className="p-4 bg-gold-muted/5 border border-gold-muted/10 rounded-2xl">
                                <p className="text-[10px] font-bold text-gold-muted/60 uppercase tracking-widest italic leading-relaxed">
                                    {cfg.type === 'fixed' ? 'Thanh toán trọn gói, không phụ thuộc hệ số công.' : `Tương đương định mức: ${new Intl.NumberFormat('vi-VN').format(Math.round(cfg.baseSalary / (cfg.standardDays || 1)))} VNĐ / ngày công.`}
                                </p>
                            </div>
                        </div>

                        {/* Allowances Section */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between px-1">
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                    <label className="text-[10px] font-black text-text-main uppercase tracking-[0.2em] italic">Danh mục phụ cấp bổ sung</label>
                                </div>
                                <button onClick={addAllowance} className="h-9 px-4 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm flex items-center gap-2 italic">
                                    <Plus size={14} strokeWidth={3} /> Thêm khoản
                                </button>
                            </div>

                            <div className="space-y-3">
                                {(!cfg.allowances || cfg.allowances.length === 0) ? (
                                    <div className="flex flex-col items-center justify-center py-8 bg-beige-soft/10 rounded-[28px] border border-dashed border-gold-light/20">
                                        <span className="text-[10px] font-black text-text-soft/20 uppercase tracking-[0.2em] italic">Chưa áp dụng phụ cấp</span>
                                    </div>
                                ) : cfg.allowances.map((a, i) => (
                                    <div key={i} className="flex gap-3 items-center animate-in fade-in slide-in-from-right-4 duration-300">
                                        <div className="flex-1 relative">
                                            <input
                                                type="text"
                                                placeholder="Tên khoản..."
                                                className="w-full h-14 bg-beige-soft/30 border border-gold-light/10 rounded-xl px-5 text-[12px] font-bold text-text-main focus:outline-none focus:ring-4 focus:ring-gold-muted/5 shadow-sm transition-all italic"
                                                value={a.name}
                                                onChange={e => updateAllowance(i, e.target.value, a.amount)}
                                            />
                                        </div>
                                        <div className="w-[140px] relative">
                                            <input
                                                type="number"
                                                placeholder="Số tiền"
                                                className="w-full h-14 bg-emerald-50/30 border border-emerald-100 rounded-xl px-5 text-[12px] font-black text-emerald-600 focus:outline-none focus:ring-4 focus:ring-emerald-100 shadow-sm transition-all italic text-center tabular-nums"
                                                value={a.amount || ''}
                                                onChange={e => updateAllowance(i, a.name, Number(e.target.value))}
                                            />
                                        </div>
                                        <button onClick={() => removeAllowance(i)} className="w-14 h-14 flex items-center justify-center bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl transition-all shadow-sm group active:scale-90">
                                            <Trash2 size={18} className="group-hover:rotate-12 transition-transform" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* History Feed */}
                        {historyList.length > 0 && (
                            <div className="pt-4 border-t border-gold-light/10">
                                <h4 className="flex items-center gap-2 text-[10px] font-black text-gold-muted uppercase tracking-[0.2em] italic mb-5">
                                    <History size={16} /> Lịch sử hạch toán & Biến động
                                </h4>
                                <div className="space-y-3">
                                    {historyList.slice(0, 3).map(h => (
                                        <div key={h.id} className="bg-white p-5 rounded-[28px] border border-gold-light/20 shadow-sm group hover:border-gold-muted transition-all duration-500">
                                            <div className="flex justify-between items-start mb-3">
                                                <span className="text-[11px] font-black text-text-main italic uppercase tracking-tight">{h.changeReason}</span>
                                                <span className="text-[9px] font-black text-text-soft/30 tabular-nums uppercase">{new Date(h.createdAt).toLocaleDateString('vi-VN')}</span>
                                            </div>
                                            {h.oldConfig && h.newConfig && (
                                                <div className="flex items-center gap-4 bg-beige-soft/20 p-3 rounded-xl border border-gold-light/10">
                                                    <span className="text-[11px] text-text-soft/40 line-through tabular-nums font-bold">{new Intl.NumberFormat('vi-VN').format(h.oldConfig.baseSalary)}đ</span>
                                                    <ArrowRight size={14} className="text-gold-muted animate-pulse" />
                                                    <span className="text-[12px] text-emerald-600 font-black tabular-nums">{new Intl.NumberFormat('vi-VN').format(h.newConfig.baseSalary)} VNĐ</span>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer Controls */}
                    <div className="pt-10 flex gap-4">
                        <button className="flex-1 py-5 rounded-2xl bg-white text-text-soft/40 text-[11px] font-black uppercase tracking-widest border border-gold-light/20 hover:text-rose-500 hover:bg-rose-50 transition-all active:scale-95 italic" onClick={onClose} disabled={isSubmitting}>Hủy bỏ</button>
                        {!isPromptingReason && (
                            <button className="flex-[2] py-5 rounded-2xl bg-text-main text-white text-[11px] font-black uppercase tracking-[0.2em] shadow-luxury hover:bg-gold-muted transition-all active:scale-95 flex items-center justify-center gap-3 italic shadow-lg" onClick={handlePreSave} disabled={isSubmitting}>
                                Xác nhận điều chỉnh <Check size={18} strokeWidth={3} />
                            </button>
                        )}
                    </div>

                    {/* Confirmation Reason Overlay */}
                    {isPromptingReason && (
                        <div className="absolute inset-x-8 bottom-8 z-[50] animate-in fade-in slide-in-from-bottom-10 duration-500">
                            <div className="bg-white p-8 rounded-[40px] shadow-[0_30px_100px_rgba(0,0,0,0.2)] border-2 border-gold-muted/20 space-y-6">
                                <div>
                                    <h4 className="text-xl font-serif font-black text-text-main italic uppercase tracking-tighter">Lý do điều chỉnh</h4>
                                    <p className="text-[10px] font-black text-text-soft/40 uppercase tracking-[0.1em] mt-1 italic leading-relaxed">Vui lòng cung cấp căn cứ để hoàn thiện hồ sơ hạch toán biến động lương định kỳ.</p>
                                </div>
                                <textarea
                                    className="w-full h-36 bg-beige-soft/30 border border-gold-light/20 rounded-3xl p-6 text-[13px] font-bold text-text-main focus:outline-none focus:ring-8 focus:ring-gold-muted/5 italic resize-none shadow-inner"
                                    placeholder="Ví dụ: Tăng lương định kỳ theo thâm niên, Điều chỉnh KPI, Thăng cấp bậc..."
                                    value={changeReason}
                                    onChange={e => setChangeReason(e.target.value)}
                                />
                                <div className="flex gap-4">
                                    <button className="flex-1 py-5 bg-gray-100 text-text-soft/60 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-gray-200 transition-all italic active:scale-95" onClick={() => setIsPromptingReason(false)} disabled={isSubmitting}>Quay lại</button>
                                    <button className="flex-[2] py-5 bg-text-main text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-luxury transition-all active:scale-95 flex items-center justify-center gap-3 italic shadow-lg" onClick={handleConfirmSaveWithReason} disabled={isSubmitting}>
                                        {isSubmitting ? 'ĐANG CHUYỂN DỮ LIỆU...' : 'XÁC NHẬN HỒ SƠ'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
