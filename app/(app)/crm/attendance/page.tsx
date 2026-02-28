'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { useApp } from '@/lib/auth'
import { useToast } from '@/components/ToastProvider'
import UserAvatar from '@/components/UserAvatar'
import {
    Calendar,
    Edit3,
    Check,
    AlertCircle,
    Users,
    Clock,
    CheckCircle2,
    Landmark,
    ChevronLeft,
    ChevronRight,
    Search,
    History as HistoryIcon,
    X,
    Plus,
    Building,
    Grid,
    LayoutGrid
} from 'lucide-react'
import { COLOR_MAP, ROLES, Attendance, User, AppState, Branch } from '@/lib/types'
import { syncAttendance } from '@/lib/storage'
import PageHeader from '@/components/PageHeader'

// Modal Component for detailed editing
const AttendanceEditModal = ({
    show,
    onClose,
    user,
    record,
    onSave
}: {
    show: boolean,
    onClose: () => void,
    user: User | null,
    record: Attendance | null,
    onSave: (data: Partial<Attendance>) => void
}) => {
    const [form, setForm] = useState<Partial<Attendance>>(record || {})

    React.useEffect(() => {
        if (record) setForm(record)
        else setForm({ status: 'present', checkIn: '', checkOut: '', note: '' })
    }, [record, show])

    if (!show || !user) return null

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-[32px] w-full max-w-md shadow-2xl border border-white/20 overflow-hidden scale-in-center">
                <div className="p-8 border-b border-var(--border) flex justify-between items-center bg-white">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-var(--beige-soft) text-var(--gold-muted) rounded-2xl shadow-sm border border-var(--border)">
                            <Clock size={22} />
                        </div>
                        <div>
                            <h2 className="text-[18px] font-bold text-var(--text-main) leading-tight">Chỉnh sửa Chấm công</h2>
                            <p className="text-[10px] font-bold text-var(--gold-muted) mt-1 uppercase tracking-[0.2em] opacity-70">{user.displayName}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-var(--beige-soft) rounded-xl transition-all text-var(--text-soft) hover:text-var(--text-main)">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-8 flex flex-col gap-6">
                    <div className="grid grid-cols-3 gap-3">
                        {(['present', 'on_leave', 'absent'] as const).map(s => (
                            <button
                                key={s}
                                onClick={() => setForm({ ...form, status: s })}
                                className={`py-4 rounded-2xl border transition-all flex flex-col items-center gap-2 ${form.status === s
                                    ? (s === 'present' ? 'bg-[#D1FAE5] border-[#065F46] text-[#065F46]' : s === 'on_leave' ? 'bg-[#FAF7F2] border-[#C5A059] text-[#C5A059]' : 'bg-[#FFF5F6] border-[#EF4444] text-[#EF4444]')
                                    : 'bg-white border-var(--border) text-var(--text-soft) opacity-60 hover:opacity-100'}`}
                            >
                                {s === 'present' ? <CheckCircle2 size={18} /> : s === 'on_leave' ? <Landmark size={18} /> : <X size={18} />}
                                <span className="text-[9px] font-bold uppercase tracking-widest">{s === 'present' ? 'Đi làm' : s === 'on_leave' ? 'Nghỉ phép' : 'Vắng mặt'}</span>
                            </button>
                        ))}
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-bold text-var(--gold-muted) uppercase tracking-[0.2em] ml-1">Giờ vào</label>
                            <input
                                type="time"
                                className="w-full bg-var(--beige-soft) border border-var(--border) rounded-2xl py-3.5 px-5 font-bold text-var(--text-main) focus:ring-4 focus:ring-var(--gold-light) outline-none transition-all"
                                value={form.checkIn || ''}
                                onChange={e => setForm({ ...form, checkIn: e.target.value })}
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-bold text-var(--gold-muted) uppercase tracking-[0.2em] ml-1">Giờ ra</label>
                            <input
                                type="time"
                                className="w-full bg-var(--beige-soft) border border-var(--border) rounded-2xl py-3.5 px-5 font-bold text-var(--text-main) focus:ring-4 focus:ring-var(--gold-light) outline-none transition-all"
                                value={form.checkOut || ''}
                                onChange={e => setForm({ ...form, checkOut: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] font-bold text-var(--gold-muted) uppercase tracking-[0.2em] ml-1">Ghi chú</label>
                        <textarea
                            className="w-full bg-var(--beige-soft) border border-var(--border) rounded-2xl py-4 px-5 font-medium text-var(--text-main) focus:ring-4 focus:ring-var(--gold-light) outline-none transition-all min-h-[100px] resize-none"
                            placeholder="Nhập lý do nghỉ hoặc ghi chú..."
                            value={form.note || ''}
                            onChange={e => setForm({ ...form, note: e.target.value })}
                        />
                    </div>
                </div>

                <div className="p-10 bg-var(--beige-soft) border-t border-var(--border) flex gap-4">
                    <button onClick={onClose} className="flex-1 py-4 text-[11px] font-bold text-var(--text-soft) hover:text-var(--text-main) transition-colors uppercase tracking-[0.2em]">Hủy bỏ</button>
                    <button
                        onClick={() => onSave(form)}
                        className="flex-1 py-4 bg-var(--text-main) text-white rounded-2xl font-bold text-[11px] shadow-xl hover:bg-black transition-all uppercase tracking-[0.2em] flex items-center justify-center gap-2"
                    >
                        <Check size={18} /> Xác nhận
                    </button>
                </div>
            </div>
        </div>
    )
}

// Utility for formatting dates in Vietnamese context
const formatDateShort = (dateStr: string) => {
    try {
        const d = new Date(dateStr)
        return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    } catch {
        return dateStr
    }
}

export default function AttendancePage() {
    const { state, saveState, currentUser } = useApp()
    const { showToast } = useToast()

    const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('day')
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])

    // Modal state
    const [editModal, setEditModal] = useState({ show: false, user: null as User | null, record: null as Attendance | null })

    // Auto-select branch if restricted to one branch
    // Global Access (HQ/Admin) can see everything
    const currentUserJobTitle = useMemo(() => state.jobTitles?.find(jt => jt.id === currentUser?.jobTitleId), [state.jobTitles, currentUser])
    const hasGlobalAccess = currentUser?.role === 'admin' || currentUserJobTitle?.departmentType === 'admin' || currentUserJobTitle?.departmentType === 'hq'

    const isRestricted = !!currentUser?.branchId && !hasGlobalAccess
    const [selectedBranch, setSelectedBranch] = useState<string>(isRestricted ? (currentUser?.branchId || '') : 'all')
    const [searchTerm, setSearchTerm] = useState('')

    // Date range helpers
    const currentWeekDays = useMemo(() => {
        const start = new Date(selectedDate)
        const day = start.getDay() || 7 // 1 (Mon) to 7 (Sun)
        start.setDate(start.getDate() - (day - 1))
        return Array.from({ length: 7 }, (_, i) => {
            const d = new Date(start)
            d.setDate(d.getDate() + i)
            return d.toISOString().split('T')[0]
        })
    }, [selectedDate])

    const currentMonthDays = useMemo(() => {
        const d = new Date(selectedDate)
        const year = d.getFullYear()
        const month = d.getMonth()
        const lastDay = new Date(year, month + 1, 0).getDate()
        return Array.from({ length: lastDay }, (_, i) => {
            return new Date(year, month, i + 1).toISOString().split('T')[0]
        })
    }, [selectedDate])

    // Save/Update logic
    const handleSaveAttendance = async (userId: string, date: string, data: Partial<Attendance>) => {
        const existing = state.attendance.find(a => a.userId === userId && a.date === date)
        const now = new Date()

        const newRecord: Attendance = existing ? {
            ...existing,
            ...data,
            updatedAt: now.toISOString()
        } : {
            id: crypto.randomUUID(),
            userId,
            branchId: state.users.find(u => u.id === userId)?.branchId || '',
            date,
            status: 'absent',
            ...data,
            createdAt: now.toISOString(),
            updatedAt: now.toISOString()
        } as Attendance

        const success = await syncAttendance(newRecord)
        if (success) {
            saveState((prev: AppState) => ({
                ...prev,
                attendance: existing
                    ? prev.attendance.map(a => a.id === existing.id ? newRecord : a)
                    : [...prev.attendance, newRecord]
            }))
            showToast('Thành công', 'Đã cập nhật dữ liệu chấm công')
            setEditModal({ ...editModal, show: false })
        }
    }

    // Auto-update selectedBranch if restriction status changes
    React.useEffect(() => {
        if (isRestricted && currentUser?.branchId) {
            setSelectedBranch(currentUser.branchId)
        }
    }, [isRestricted, currentUser?.branchId])

    // Filter active users for selected branch and requirement for attendance
    const activeUsers = useMemo(() => {
        const monthStr = selectedDate.substring(0, 7) // 'YYYY-MM'
        const currentRosterUserIds = state.payrollRosters?.filter(r => r.period === monthStr).map(r => r.userId) || []

        return state.users.filter((u: User) => {
            if (u.workStatus === 'resigned') return false

            // KIỂM TRA MỚI: Chỉ lấy NV có trong danh sách lương (Roster) của tháng này
            // Nếu tháng này chưa có dữ liệu Roster thì hiển thị tất cả
            const monthHasRoster = state.payrollRosters?.some(r => r.period === monthStr)
            if (monthHasRoster && !currentRosterUserIds.includes(u.id)) return false

            // Quyết định hiển thị dựa trên phân cấp (User > JobTitle > Default)
            const jt = state.jobTitles?.find(j => j.id === u.jobTitleId)

            // Logic phân cấp tuyệt đối:
            let isEnabled = true
            if (u.hasAttendance === false) isEnabled = false
            else if (u.hasAttendance === true) isEnabled = true
            else if (jt && jt.hasAttendance === false) isEnabled = false
            else if (jt && jt.hasAttendance === true) isEnabled = true
            else isEnabled = true // Mặc định hiển thị nếu chưa thiết lập

            if (!isEnabled) return false

            if (selectedBranch !== 'all' && u.branchId !== selectedBranch) return false
            if (searchTerm && !u.displayName.toLowerCase().includes(searchTerm.toLowerCase()) && !u.username.toLowerCase().includes(searchTerm.toLowerCase())) return false
            return true
        })
    }, [state.users, state.jobTitles, state.payrollRosters, selectedBranch, searchTerm, selectedDate])

    // Get attendance records for selected date
    const dayAttendance = useMemo(() => {
        return state.attendance.filter((a: Attendance) => a.date === selectedDate)
    }, [state.attendance, selectedDate])

    // Quick Action: Check In/Out
    const handleQuickAttendance = async (userId: string, type: 'checkIn' | 'checkOut') => {
        const existing = dayAttendance.find((a: Attendance) => a.userId === userId)
        const now = new Date()
        const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`

        const newRecord: Attendance = existing ? {
            ...existing,
            [type]: timeStr,
            status: 'present',
            updatedAt: now.toISOString()
        } : {
            id: crypto.randomUUID(),
            userId,
            branchId: state.users.find((u: User) => u.id === userId)?.branchId || '',
            date: selectedDate,
            status: 'present',
            [type]: timeStr,
            createdAt: now.toISOString(),
            updatedAt: now.toISOString()
        }

        const success = await syncAttendance(newRecord)
        if (success) {
            saveState((prev: AppState) => ({
                ...prev,
                attendance: existing
                    ? prev.attendance.map((a: Attendance) => a.id === existing.id ? newRecord : a)
                    : [...prev.attendance, newRecord]
            }))
            showToast('Thành công', `Đã ${type === 'checkIn' ? 'vào ca' : 'tan ca'} lúc ${timeStr}`)
        }
    }

    // Toggle Status: Present / Leave / Absent / Half Leave
    const toggleStatus = async (userId: string, status: 'present' | 'on_leave' | 'absent' | 'half_leave') => {
        const existing = dayAttendance.find((a: Attendance) => a.userId === userId)
        const now = new Date()

        const newRecord: Attendance = existing ? {
            ...existing,
            status,
            updatedAt: now.toISOString()
        } : {
            id: crypto.randomUUID(),
            userId,
            branchId: state.users.find((u: User) => u.id === userId)?.branchId || '',
            date: selectedDate,
            status,
            createdAt: now.toISOString(),
            updatedAt: now.toISOString()
        }

        const success = await syncAttendance(newRecord)
        if (success) {
            saveState((prev: AppState) => ({
                ...prev,
                attendance: existing
                    ? prev.attendance.map((a: Attendance) => a.id === existing.id ? newRecord : a)
                    : [...prev.attendance, newRecord]
            }))
        }
    }

    return (
        <div className="min-h-screen bg-[#FAF8F6]">
            <PageHeader
                icon={Clock}
                title="Chấm công"
                subtitle="Hành chính chuyên nghiệp"
                description="Human Resources • Hệ thống quản lý chuyên nghiệp"
            >
                <div className="flex flex-col sm:flex-row items-center gap-4">
                    {/* View Mode Switcher */}
                    <div className="flex bg-gray-100/50 p-1 rounded-[15px] border border-gray-100 shadow-sm">
                        {(['day', 'week', 'month'] as const).map(m => (
                            <button
                                key={m}
                                onClick={() => setViewMode(m)}
                                className={`px-6 py-2 rounded-[12px] text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === m ? 'bg-white text-text-main shadow-sm border border-gray-100' : 'text-text-soft/40 hover:text-text-main'}`}
                            >
                                {m === 'day' ? 'Ngày' : m === 'week' ? 'Tuần' : 'Tháng'}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center bg-gray-100/50 p-1 rounded-[15px] border border-gray-100 shadow-sm gap-2">
                        <button className="w-9 h-9 rounded-[12px] hover:bg-white text-text-soft opacity-40 hover:opacity-100 transition-all flex items-center justify-center" onClick={() => {
                            const d = new Date(selectedDate)
                            if (viewMode === 'day') d.setDate(d.getDate() - 1)
                            else if (viewMode === 'week') d.setDate(d.getDate() - 7)
                            else d.setMonth(d.getMonth() - 1)
                            setSelectedDate(d.toISOString().split('T')[0])
                        }}>
                            <ChevronLeft size={16} strokeWidth={2.5} />
                        </button>
                        <div className="px-4 text-[11px] font-black text-text-main min-w-[140px] text-center tabular-nums uppercase tracking-wider">
                            {viewMode === 'day' ? formatDateShort(selectedDate) : viewMode === 'week' ? `Tuần ${formatDateShort(currentWeekDays[0])}` : `Tháng ${new Date(selectedDate).getMonth() + 1}/${new Date(selectedDate).getFullYear()}`}
                        </div>
                        <button className="w-9 h-9 rounded-[12px] hover:bg-white text-text-soft opacity-40 hover:opacity-100 transition-all flex items-center justify-center" onClick={() => {
                            const d = new Date(selectedDate)
                            if (viewMode === 'day') d.setDate(d.getDate() + 1)
                            else if (viewMode === 'week') d.setDate(d.getDate() + 7)
                            else d.setMonth(d.getMonth() + 1)
                            setSelectedDate(d.toISOString().split('T')[0])
                        }}>
                            <ChevronRight size={16} strokeWidth={2.5} />
                        </button>
                    </div>
                </div>
            </PageHeader>

            <div className="max-w-[1600px] mx-auto px-10 py-12 space-y-12">
                <div className="flex flex-col gap-6">

                    {/* Stats Summary - Luxury Cards */}
                    {/* Luxury Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        <div className="bg-white p-8 rounded-[40px] shadow-luxury border border-gold-light/20 relative overflow-hidden group hover:scale-[1.02] transition-all duration-500">
                            <div className="absolute -right-10 -top-10 w-32 h-32 bg-gold-light/5 rounded-full blur-3xl group-hover:bg-gold-light/10 transition-colors"></div>
                            <div className="flex items-center gap-5 mb-6">
                                <div className="w-14 h-14 rounded-2xl bg-gold-light/30 flex items-center justify-center text-gold-muted shadow-sm">
                                    <Users size={28} strokeWidth={1.5} />
                                </div>
                                <span className="text-[10px] font-black text-text-soft/40 uppercase tracking-[0.3em] italic">Tổng nhân sự</span>
                            </div>
                            <div className="flex items-baseline gap-2">
                                <h2 className="text-4xl font-serif font-black text-text-main tabular-nums italic">{activeUsers.length}</h2>
                                <span className="text-[10px] font-black text-gold-muted uppercase tracking-widest italic opacity-60">Thành viên</span>
                            </div>
                            <div className="mt-4 flex items-center gap-2">
                                <div className="h-1 flex-1 bg-beige-soft rounded-full overflow-hidden">
                                    <div className="h-full bg-gold-muted w-full transition-all duration-1000"></div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-8 rounded-[40px] shadow-luxury border border-gold-light/20 relative overflow-hidden group hover:scale-[1.02] transition-all duration-500">
                            <div className="flex items-center gap-5 mb-6">
                                <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 shadow-sm border border-emerald-100/50">
                                    <CheckCircle2 size={28} strokeWidth={1.5} />
                                </div>
                                <span className="text-[10px] font-black text-text-soft/40 uppercase tracking-[0.3em] italic">Đã vào ca</span>
                            </div>
                            <div className="flex items-baseline gap-2">
                                <h2 className="text-4xl font-serif font-black text-emerald-600 tabular-nums italic">
                                    {dayAttendance.filter((a: Attendance) => activeUsers.some(u => u.id === a.userId) && a.status === 'present').length}
                                </h2>
                                <span className="text-[10px] font-black text-emerald-600/60 uppercase tracking-widest italic opacity-60">Có mặt</span>
                            </div>
                            <div className="mt-4 flex items-center gap-2">
                                <div className="h-1 flex-1 bg-emerald-50 rounded-full overflow-hidden">
                                    <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${(dayAttendance.filter((a: Attendance) => activeUsers.some(u => u.id === a.userId) && a.status === 'present').length / activeUsers.length) * 100}%` }}></div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-8 rounded-[40px] shadow-luxury border border-gold-light/20 relative overflow-hidden group hover:scale-[1.02] transition-all duration-500">
                            <div className="flex items-center gap-5 mb-6">
                                <div className="w-14 h-14 rounded-2xl bg-gold-light/30 flex items-center justify-center text-gold-muted shadow-sm">
                                    <Landmark size={28} strokeWidth={1.5} />
                                </div>
                                <span className="text-[10px] font-black text-text-soft/40 uppercase tracking-[0.3em] italic">Nghỉ phép</span>
                            </div>
                            <div className="flex items-baseline gap-2">
                                <h2 className="text-4xl font-serif font-black text-gold-muted tabular-nums italic">
                                    {dayAttendance.filter((a: Attendance) => activeUsers.some(u => u.id === a.userId) && (a.status === 'on_leave' || a.status === 'half_leave')).length}
                                </h2>
                                <span className="text-[10px] font-black text-gold-muted/60 uppercase tracking-widest italic opacity-60">Đăng ký</span>
                            </div>
                            <div className="mt-4 flex items-center gap-2">
                                <div className="h-1 flex-1 bg-gold-light/10 rounded-full overflow-hidden">
                                    <div className="h-full bg-gold-muted transition-all duration-1000" style={{ width: `${(dayAttendance.filter((a: Attendance) => activeUsers.some(u => u.id === a.userId) && (a.status === 'on_leave' || a.status === 'half_leave')).length / activeUsers.length) * 100}%` }}></div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-8 rounded-[40px] shadow-luxury border border-gold-light/20 relative overflow-hidden group hover:scale-[1.02] transition-all duration-500">
                            <div className="flex items-center gap-5 mb-6">
                                <div className="w-14 h-14 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600 shadow-sm border border-rose-100/50">
                                    <AlertCircle size={28} strokeWidth={1.5} />
                                </div>
                                <span className="text-[10px] font-black text-text-soft/40 uppercase tracking-[0.3em] italic">Chưa xác nhận</span>
                            </div>
                            <div className="flex items-baseline gap-2">
                                <h2 className="text-4xl font-serif font-black text-rose-600 tabular-nums italic">
                                    {Math.max(0, activeUsers.length - dayAttendance.filter((a: Attendance) => activeUsers.some(u => u.id === a.userId)).length)}
                                </h2>
                                <span className="text-[10px] font-black text-rose-600/60 uppercase tracking-widest italic opacity-60">Vắng mặt</span>
                            </div>
                            <div className="mt-4 flex items-center gap-2">
                                <div className="h-1 flex-1 bg-rose-50 rounded-full overflow-hidden">
                                    <div className="h-full bg-rose-500 transition-all duration-1000" style={{ width: `${(Math.max(0, activeUsers.length - dayAttendance.filter((a: Attendance) => activeUsers.some(u => u.id === a.userId)).length) / activeUsers.length) * 100}%` }}></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Luxury Filter Bar */}
                    <div className="bg-white p-6 rounded-[32px] border border-gold-light/20 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-2 px-4 py-2 bg-gold-light/10 rounded-xl border border-gold-light/20">
                                <Building size={14} className="text-gold-muted" />
                                <span className="text-[9px] font-black uppercase tracking-widest text-gold-muted">Cơ sở vận hành</span>
                            </div>
                            {!isRestricted ? (
                                <div className="flex bg-beige-soft/50 p-1 rounded-2xl ring-1 ring-gold-light/10">
                                    <button
                                        onClick={() => setSelectedBranch('all')}
                                        className={`px-6 py-2 rounded-xl text-[10px] font-black transition-all uppercase tracking-widest ${selectedBranch === 'all' ? 'bg-white text-gold-muted shadow-sm ring-1 ring-gold-light/20' : 'text-text-soft/60 hover:text-text-main'}`}
                                    >
                                        Tất cả
                                    </button>
                                    {state.branches.map((b: Branch) => (
                                        <button
                                            key={b.id}
                                            onClick={() => setSelectedBranch(b.id)}
                                            className={`px-6 py-2 rounded-xl text-[10px] font-black transition-all uppercase tracking-widest ${selectedBranch === b.id ? 'bg-white text-gold-muted shadow-sm ring-1 ring-gold-light/20' : 'text-text-soft/60 hover:text-text-main'}`}
                                        >
                                            {b.name}
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="px-6 py-2 bg-white text-text-main rounded-xl border border-gold-light/20 font-black text-[11px] uppercase tracking-widest shadow-sm ring-1 ring-gold-light/10 italic">
                                    {state.branches.find(b => b.id === selectedBranch)?.name || 'N/A'}
                                </div>
                            )}
                        </div>

                        <div className="relative group min-w-[320px]">
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gold-muted/40 group-focus-within:text-gold-muted transition-colors" size={18} strokeWidth={2.5} />
                            <input
                                type="text"
                                placeholder="Tên nhân sự hoặc Mã số..."
                                className="w-full pl-14 pr-6 py-4 bg-beige-soft/30 border-none rounded-2xl text-[12px] font-bold text-text-main placeholder:text-text-soft/20 focus:ring-2 focus:ring-gold-muted/20 outline-none transition-all italic tracking-tight"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Main Content Area */}
                    <div className="flex flex-col gap-6">
                        {/* Luxury Table Area */}
                        {viewMode === 'day' && (
                            <div className="bg-white rounded-[40px] border border-gold-light/20 shadow-luxury overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-separate border-spacing-0">
                                        <thead>
                                            <tr className="bg-beige-soft/30">
                                                <th className="px-10 py-6 text-[9px] font-black text-text-soft/60 uppercase tracking-[0.2em] border-b border-gold-light/10 italic">Nhân sự / Vị trí</th>
                                                <th className="px-10 py-6 text-[9px] font-black text-text-soft/60 uppercase tracking-[0.2em] border-b border-gold-light/10 italic">Trạng thái điểm danh</th>
                                                <th className="px-10 py-6 text-[9px] font-black text-text-soft/60 uppercase tracking-[0.2em] border-b border-gold-light/10 italic">Giờ vào</th>
                                                <th className="px-10 py-6 text-[9px] font-black text-text-soft/60 uppercase tracking-[0.2em] border-b border-gold-light/10 italic">Giờ ra</th>
                                                <th className="px-10 py-6 text-[9px] font-black text-text-soft/60 uppercase tracking-[0.2em] border-b border-gold-light/10 italic">Nhật ký chuyên cần</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {activeUsers.map((u: User) => {
                                                const record = dayAttendance.find((a: Attendance) => a.userId === u.id)
                                                const status = record?.status || 'absent'
                                                const jt = state.jobTitles?.find((j: any) => j.id === u.jobTitleId)

                                                return (
                                                    <tr key={u.id} className="group hover:bg-beige-soft/20 transition-all duration-300">
                                                        <td className="px-10 py-6">
                                                            <div className="flex items-center gap-5">
                                                                <UserAvatar user={u} size="md" />
                                                                <div onClick={() => setEditModal({ show: true, user: u, record: record || null })} className="cursor-pointer">
                                                                    <div className="text-[14px] font-black text-text-main flex items-center gap-2 group-hover:text-gold-muted transition-colors italic">
                                                                        {u.displayName}
                                                                        <Edit3 size={12} className="text-gold-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                                                                    </div>
                                                                    <div className="text-[9px] font-black text-gold-muted uppercase tracking-[0.2em] mt-1 opacity-60 italic">{jt?.name || u.title}</div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-10 py-6">
                                                            <div className="flex gap-2">
                                                                <button
                                                                    onClick={() => toggleStatus(u.id, 'present')}
                                                                    className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all ${status === 'present' ? 'bg-emerald-50 border-emerald-600 text-emerald-600 shadow-sm ring-1 ring-emerald-600/20' : 'bg-white border-gold-light/30 text-text-soft/40 hover:bg-beige-soft hover:text-text-main'}`}
                                                                    title="Có mặt"
                                                                >
                                                                    <CheckCircle2 size={18} strokeWidth={status === 'present' ? 2.5 : 2} />
                                                                </button>
                                                                <button
                                                                    onClick={() => toggleStatus(u.id, 'on_leave')}
                                                                    className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all ${status === 'on_leave' ? 'bg-gold-light text-gold-muted border-gold-muted shadow-sm ring-1 ring-gold-muted/20' : 'bg-white border-gold-light/30 text-text-soft/40 hover:bg-beige-soft hover:text-text-main'}`}
                                                                    title="Nghỉ phép"
                                                                >
                                                                    <Landmark size={18} strokeWidth={status === 'on_leave' ? 2.5 : 2} />
                                                                </button>
                                                                <button
                                                                    onClick={() => toggleStatus(u.id, 'absent')}
                                                                    className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all ${status === 'absent' ? 'bg-rose-50 border-rose-600 text-rose-600 shadow-sm ring-1 ring-rose-600/20' : 'bg-white border-gold-light/30 text-text-soft/40 hover:bg-beige-soft hover:text-text-main'}`}
                                                                    title="Vắng mặt"
                                                                >
                                                                    <X size={18} strokeWidth={status === 'absent' ? 2.5 : 2} />
                                                                </button>
                                                            </div>
                                                        </td>
                                                        <td className="px-10 py-6">
                                                            {record?.checkIn ? (
                                                                <div className="flex items-center gap-2 text-[13px] font-black text-emerald-600 bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100 italic tabular-nums w-fit group-hover:scale-105 transition-transform">
                                                                    <Clock size={14} strokeWidth={2.5} /> {record.checkIn}
                                                                </div>
                                                            ) : (
                                                                <button
                                                                    onClick={() => handleQuickAttendance(u.id, 'checkIn')}
                                                                    className="inline-flex items-center gap-2 px-4 py-2 text-[10px] font-black text-text-soft/20 border border-gold-light/20 rounded-xl hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 transition-all opacity-0 group-hover:opacity-100 uppercase tracking-widest italic"
                                                                >
                                                                    <Plus size={14} strokeWidth={2.5} /> VÀO CA
                                                                </button>
                                                            )}
                                                        </td>
                                                        <td className="px-10 py-6">
                                                            {record?.checkOut ? (
                                                                <div className="flex items-center gap-2 text-[13px] font-black text-rose-600 bg-rose-50 px-4 py-2 rounded-xl border border-rose-100 italic tabular-nums w-fit group-hover:scale-105 transition-transform">
                                                                    <Clock size={14} strokeWidth={2.5} /> {record.checkOut}
                                                                </div>
                                                            ) : (
                                                                <button
                                                                    onClick={() => handleQuickAttendance(u.id, 'checkOut')}
                                                                    className={`inline-flex items-center gap-2 px-4 py-2 text-[10px] font-black border border-gold-light/20 rounded-xl hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-all uppercase tracking-widest italic ${record?.checkIn ? 'opacity-100 text-text-soft/60' : 'opacity-0 group-hover:opacity-20 cursor-not-allowed'}`}
                                                                    disabled={!record?.checkIn}
                                                                >
                                                                    <Plus size={14} strokeWidth={2.5} /> TAN CA
                                                                </button>
                                                            )}
                                                        </td>
                                                        <td className="px-10 py-6">
                                                            <div className="relative">
                                                                <input
                                                                    type="text"
                                                                    placeholder="Nhật ký nhanh..."
                                                                    className="w-full bg-transparent border-none p-0 text-[11px] font-bold text-text-soft/60 focus:ring-0 placeholder:text-text-soft/10 italic truncate lg:max-w-[200px]"
                                                                    value={record?.note || ''}
                                                                    onChange={async (e) => {
                                                                        const val = e.target.value
                                                                        const existing = dayAttendance.find((a: Attendance) => a.userId === u.id)
                                                                        if (existing) {
                                                                            const updated = { ...existing, note: val, updatedAt: new Date().toISOString() }
                                                                            await syncAttendance(updated)
                                                                            saveState((prev: AppState) => ({
                                                                                ...prev,
                                                                                attendance: prev.attendance.map((a: Attendance) => a.id === existing.id ? updated : a)
                                                                            }))
                                                                        }
                                                                    }}
                                                                />
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {viewMode === 'week' && (
                            <div className="luxury-table-container">
                                <table className="luxury-table">
                                    <thead>
                                        <tr>
                                            <th className="sticky left-0 bg-white z-10" style={{ width: '250px' }}>Nhân sự</th>
                                            {currentWeekDays.map(date => (
                                                <th key={date} style={{ textAlign: 'center' }} className={date === new Date().toISOString().split('T')[0] ? 'bg-var(--gold-light)' : ''}>
                                                    <div className="text-[10px] opacity-60 mb-1">
                                                        {new Date(date).toLocaleDateString('vi-VN', { weekday: 'short' })}
                                                    </div>
                                                    <div className="text-[14px]">
                                                        {new Date(date).getDate()}
                                                    </div>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50 text-[13px] font-medium">
                                        {activeUsers.map(u => (
                                            <tr key={u.id}>
                                                <td className="sticky left-0 bg-white z-10 border-r border-var(--border)">
                                                    <div className="flex items-center gap-3">
                                                        <UserAvatar user={u} size="sm" linkToProfile={true} />
                                                        <div className="font-bold text-var(--text-main)">{u.displayName}</div>
                                                    </div>
                                                </td>
                                                {currentWeekDays.map(date => {
                                                    const record = state.attendance.find(a => a.userId === u.id && a.date === date)
                                                    const status = record?.status
                                                    return (
                                                        <td key={date} style={{ textAlign: 'center' }} className={date === new Date().toISOString().split('T')[0] ? 'bg-var(--gold-light)/30' : ''}>
                                                            <div
                                                                onClick={() => { setSelectedDate(date); setViewMode('day') }}
                                                                className={`w-9 h-9 mx-auto rounded-xl flex items-center justify-center cursor-pointer transition-all hover:scale-110 border ${status === 'present' ? 'bg-[#D1FAE5] border-[#065F46] text-[#065F46]' :
                                                                    status === 'on_leave' ? 'bg-[#FAF7F2] border-[#C5A059] text-[#C5A059]' :
                                                                        status === 'absent' ? 'bg-[#FFF5F6] border-[#EF4444] text-[#EF4444]' :
                                                                            'bg-white border-var(--border) text-var(--text-soft) opacity-20'
                                                                    }`}
                                                            >
                                                                {status === 'present' ? <CheckCircle2 size={16} /> : status === 'on_leave' ? <Landmark size={14} /> : status === 'absent' ? <X size={14} /> : <div className="w-1.5 h-1.5 rounded-full bg-current opacity-30" />}
                                                            </div>
                                                        </td>
                                                    )
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {viewMode === 'month' && (
                            <div className="bg-white rounded-[32px] border border-var(--border) shadow-soft p-10 mb-12">
                                <div className="grid grid-cols-7 gap-6">
                                    {['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN'].map(h => (
                                        <div key={h} className="text-[11px] font-bold text-var(--gold-muted) uppercase tracking-[0.2em] text-center mb-6 opacity-60">{h}</div>
                                    ))}

                                    {Array.from({ length: (new Date(new Date(selectedDate).getFullYear(), new Date(selectedDate).getMonth(), 1).getDay() || 7) - 1 }).map((_, i) => (
                                        <div key={`pad-${i}`} className="aspect-square bg-var(--beige-soft)/30 rounded-3xl"></div>
                                    ))}

                                    {currentMonthDays.map(date => {
                                        const dayRecs = state.attendance.filter(a => a.date === date)
                                        const presentCount = dayRecs.filter(a => a.status === 'present').length
                                        const leaveCount = dayRecs.filter(a => a.status === 'on_leave').length
                                        const isToday = date === new Date().toISOString().split('T')[0]

                                        return (
                                            <div
                                                key={date}
                                                onClick={() => { setSelectedDate(date); setViewMode('day') }}
                                                className={`aspect-square p-5 rounded-[28px] border transition-all cursor-pointer group hover:shadow-xl hover:-translate-y-1 ${isToday ? 'border-var(--gold-muted) bg-var(--gold-light)/20 shadow-lg shadow-var(--gold-light)/50' : 'border-var(--border) bg-white hover:border-var(--gold-muted)'
                                                    }`}
                                            >
                                                <div className="flex justify-between items-start mb-4">
                                                    <span className={`text-[22px] font-serif ${isToday ? 'text-var(--gold-muted)' : 'text-var(--text-main) group-hover:text-var(--gold-muted)'}`}>
                                                        {new Date(date).getDate()}
                                                    </span>
                                                    {dayRecs.length > 0 && <div className="w-2 h-2 rounded-full bg-var(--gold-muted) animate-pulse"></div>}
                                                </div>
                                                <div className="flex flex-col gap-2">
                                                    {presentCount > 0 && (
                                                        <div className="text-[10px] font-bold text-[#065F46] bg-[#D1FAE5] px-2.5 py-1 rounded-xl flex items-center gap-2 border border-[#065F46]/10">
                                                            <div className="w-1 h-1 rounded-full bg-[#065F46]"></div> {presentCount} NV
                                                        </div>
                                                    )}
                                                    {leaveCount > 0 && (
                                                        <div className="text-[10px] font-bold text-var(--gold-muted) bg-var(--beige-soft) px-2.5 py-1 rounded-xl flex items-center gap-2 border border-var(--gold-muted)/10">
                                                            <div className="w-1 h-1 rounded-full bg-var(--gold-muted)"></div> {leaveCount} NGHỈ
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                        {activeUsers.length === 0 && (
                            <div className="flex flex-col items-center justify-center p-20 text-center">
                                <div className="w-16 h-16 bg-var(--beige-soft) rounded-2xl flex items-center justify-center text-var(--gold-muted) mb-4">
                                    <HistoryIcon size={32} />
                                </div>
                                <h3 className="text-[14px] font-bold text-var(--text-main) uppercase tracking-widest">Chưa có dữ liệu nhân sự</h3>
                                <p className="text-[12px] text-var(--text-soft) mt-2 font-medium">Vui lòng điều chỉnh bộ lọc hoặc chi nhánh để xem danh sách.</p>
                            </div>
                        )}
                    </div>

                    <AttendanceEditModal
                        show={editModal.show}
                        user={editModal.user}
                        record={editModal.record}
                        onClose={() => setEditModal({ ...editModal, show: false })}
                        onSave={(data) => {
                            if (editModal.user) {
                                handleSaveAttendance(editModal.user.id, selectedDate, data)
                            }
                        }}
                    />
                </div>
            </div>
        </div>
    )
}
