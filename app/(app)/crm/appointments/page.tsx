'use client'
export const dynamic = 'force-dynamic'
import { useState, useMemo, useEffect } from 'react'
import { useApp, canViewAllBranches } from '@/lib/auth'
import { Appointment, Customer, AppointmentStatus, CustomerRank, AppointmentLog, CommissionLog } from '@/lib/types'
import { saveAppointment, syncAppointment, saveCommissionLog, syncCommissionLog, saveLead, syncLead, getState, syncDeleteAppointment } from '@/lib/storage'
import { useModal } from '@/components/ModalProvider'
import { useToast } from '@/components/ToastProvider'
import { CalendarDays, Search, Store, ChevronLeft, ChevronRight, PlusCircle, Receipt, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import PageHeader from '@/components/PageHeader'
import ServiceOrderModal from '@/components/crm/ServiceOrderModal'
import { searchCustomers } from '@/lib/supabaseFetch'

const STATUS_CONFIG: Record<AppointmentStatus, { label: string; color: string; icon: string; bg: string }> = {
    pending: { label: 'Chờ đến', color: '#f59e0b', icon: 'schedule', bg: 'bg-amber-50 text-amber-600 border-amber-200' },
    confirmed: { label: 'Đã xác nhận', color: '#06b6d4', icon: 'verified', bg: 'bg-cyan-50 text-cyan-600 border-cyan-200' },
    arrived: { label: 'Đã đến', color: '#10b981', icon: 'login', bg: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
    completed: { label: 'Hoàn thành', color: '#6366f1', icon: 'check_circle', bg: 'bg-indigo-50 text-indigo-600 border-indigo-200' },
    cancelled: { label: 'Đã hủy', color: '#ef4444', icon: 'cancel', bg: 'bg-red-50 text-red-600 border-red-200' },
    no_show: { label: 'Vắng mặt', color: '#6b7280', icon: 'person_off', bg: 'bg-gray-50 text-gray-500 border-gray-200' },
}

const SOURCE_CONFIG = {
    lead: { label: 'Lead Sale', color: '#ec4899', icon: 'campaign', bg: 'bg-pink-50 text-pink-600 border-pink-100' },
    tele: { label: 'Tele Sale', color: '#6366f1', icon: 'headset_mic', bg: 'bg-indigo-50 text-indigo-600 border-indigo-100' },
    branch: { label: 'Chi nhánh', color: '#10b981', icon: 'store', bg: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
}

const HOURS = Array.from({ length: 16 }, (_, i) => `${(i + 7).toString().padStart(2, '0')}:00`)

export default function AppointmentsPage() {
    const { state, saveState, currentUser } = useApp()
    const { showAlert, showConfirm } = useModal()
    const { showToast } = useToast()

    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
    const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('day')
    const canViewAll = canViewAllBranches(currentUser)
    const [branchFilter, setBranchFilter] = useState<string>(!canViewAll && currentUser?.branchId ? currentUser.branchId : 'all')
    const [globalSearch, setGlobalSearch] = useState('')
    const [showForm, setShowForm] = useState(false)
    const [editing, setEditing] = useState<Appointment | null>(null)
    const [form, setForm] = useState<Partial<Appointment>>({})
    const [customerSearch, setCustomerSearch] = useState('')
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [deleteReason, setDeleteReason] = useState('')
    const [appointmentToDelete, setAppointmentToDelete] = useState<Appointment | null>(null)

    // Service Order Modal state
    const [showServiceOrderForm, setShowServiceOrderForm] = useState(false)
    const [serviceOrderInitialData, setServiceOrderInitialData] = useState<{
        branchId?: string,
        customerId?: string,
        appointmentId?: string
    }>({})

    useEffect(() => {
        if (!canViewAll && currentUser?.branchId) {
            setBranchFilter(currentUser.branchId)
        }
    }, [currentUser, canViewAll])

    // Date formatting for display
    const dateDisplay = useMemo(() => {
        const d = new Date(selectedDate)
        return d.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })
    }, [selectedDate])

    // Base filtered appointments by branch AND search
    const filteredAppointmentsByBranch = useMemo(() => {
        let list = state.appointments || []
        if (branchFilter !== 'all') {
            list = list.filter(a => a.branchId === branchFilter)
        }

        if (globalSearch.trim()) {
            const term = globalSearch.toLowerCase().trim()
            list = list.filter(a => {
                return a.customerName?.toLowerCase().includes(term) ||
                    a.customerPhone?.includes(term) ||
                    a.notes?.toLowerCase().includes(term)
            })
        }
        return list
    }, [state.appointments, branchFilter, globalSearch])

    // Current view range appointments
    const viewAppointments = useMemo(() => {
        if (viewMode === 'day') {
            return filteredAppointmentsByBranch.filter(a => a.appointmentDate === selectedDate)
                .sort((a, b) => (a.appointmentTime || '').localeCompare(b.appointmentTime || ''))
        }

        // Weekly
        if (viewMode === 'week') {
            const curr = new Date(selectedDate)
            const first = curr.getDate() - curr.getDay() + 1 // Monday
            const startStr = new Date(new Date(selectedDate).setDate(first)).toISOString().split('T')[0]
            const endStr = new Date(new Date(selectedDate).setDate(first + 6)).toISOString().split('T')[0]
            return filteredAppointmentsByBranch.filter(a => a.appointmentDate >= startStr && a.appointmentDate <= endStr)
                .sort((a, b) => a.appointmentDate.localeCompare(b.appointmentDate) || (a.appointmentTime || '').localeCompare(b.appointmentTime || ''))
        }

        // Monthly
        const d = new Date(selectedDate)
        const month = d.getMonth()
        const year = d.getFullYear()
        return filteredAppointmentsByBranch.filter(a => {
            const ad = new Date(a.appointmentDate)
            return ad.getMonth() === month && ad.getFullYear() === year
        }).sort((a, b) => a.appointmentDate.localeCompare(b.appointmentDate))
    }, [filteredAppointmentsByBranch, selectedDate, viewMode])

    // Summary Stats
    const stats = useMemo(() => {
        const total = viewAppointments.length
        const arrived = viewAppointments.filter(a => a.status === 'arrived' || a.status === 'completed').length
        const cancelled = viewAppointments.filter(a => a.status === 'cancelled').length
        const noShow = viewAppointments.filter(a => a.status === 'no_show').length
        const pending = viewAppointments.filter(a => a.status === 'pending' || a.status === 'confirmed').length

        return { total, arrived, cancelled, noShow, pending }
    }, [viewAppointments])

    const [isSearchingCustomers, setIsSearchingCustomers] = useState(false)
    const [customerSuggestions, setCustomerSuggestions] = useState<Customer[]>([])

    useEffect(() => {
        const fetchSuggestions = async () => {
            const term = customerSearch.toLowerCase().trim()
            if (!term || term.length < 2 || editing) {
                setCustomerSuggestions([])
                return
            }

            // Fix: If the current search term exactly matches the selected customer's name,
            // don't show the suggestion list again.
            if (form.customerId && (form.customerName === customerSearch || `${form.customerName} - ${form.customerPhone}` === customerSearch)) {
                setCustomerSuggestions([])
                return
            }

            setIsSearchingCustomers(true)
            const results = await searchCustomers(term)
            setCustomerSuggestions(results)
            setIsSearchingCustomers(false)
        }

        const timer = setTimeout(fetchSuggestions, 500)
        return () => clearTimeout(timer)
    }, [customerSearch, editing, form.customerId])

    function changeDate(days: number) {
        const d = new Date(selectedDate)
        d.setDate(d.getDate() + days)
        setSelectedDate(d.toISOString().split('T')[0])
    }

    function openNew(time?: string) {
        setForm({
            appointmentDate: selectedDate,
            appointmentTime: time || '09:00',
            status: 'pending',
            branchId: currentUser?.branchId || (state.branches.find(b => b.type !== 'hq' && !b.isHeadquarter)?.id || state.branches[0]?.id)
        })
        setCustomerSearch('')
        setEditing(null)
        setShowForm(true)
    }

    function openEdit(a: Appointment) {
        setForm({ ...a })
        setCustomerSearch(a.customerName || '')
        setEditing(a)
        setShowForm(true)
    }

    const [isSaving, setIsSaving] = useState(false)
    const [actionMenuId, setActionMenuId] = useState<string | null>(null)

    // Helper to add log
    function createLog(action: string, details: string, oldStatus?: AppointmentStatus, newStatus?: AppointmentStatus): AppointmentLog {
        return {
            id: crypto.randomUUID(),
            userId: currentUser?.id || 'system',
            userDisplayName: currentUser?.displayName || 'Hệ thống',
            action,
            details,
            oldStatus,
            newStatus,
            createdAt: new Date().toISOString()
        }
    }

    async function handleStatusChange(a: Appointment, newStatus: AppointmentStatus) {
        const log = createLog('status_changed', `Thay đổi trạng thái từ ${STATUS_CONFIG[a.status]?.label} sang ${STATUS_CONFIG[newStatus]?.label}`, a.status, newStatus)
        const updated: Appointment = {
            ...a,
            status: newStatus,
            logs: [log, ...(a.logs || [])],
            updatedAt: new Date().toISOString()
        }

        saveState(saveAppointment(updated))
        setActionMenuId(null)

        try {
            await syncAppointment(updated)

            // XỬ LÝ TỰ ĐỘNG CHIA HOA HỒNG KHI KHÁCH ĐỀN (ARRIVED) HOẶC HOÀN THÀNH (COMPLETED)
            if (newStatus === 'arrived' && a.status !== 'arrived') {
                const s = getState()

                // 1. Thưởng Booking (Người tạo Lead hoặc người phụ trách)
                if (updated.leadId) {
                    const lead = s.leads?.find((l: any) => l.id === updated.leadId)
                    if (lead && lead.salePageId) {
                        let targetRules = s.commissionSettings?.filter((r: any) => r.action === 'appointment_arrived' && r.isActive) || []

                        // Fallback cho dữ liệu cũ chưa có 'action'
                        if (targetRules.length === 0) {
                            targetRules = s.commissionSettings?.filter((r: any) => r.ruleCode === 'appointment_set' && r.isActive) || []
                        }

                        for (const rule of targetRules) {
                            const commLog: CommissionLog = {
                                id: crypto.randomUUID(),
                                userId: lead.salePageId,
                                amount: rule.amount || 0,
                                type: rule.ruleCode || 'lead_booking',
                                status: 'approved',
                                appointmentId: updated.id,
                                leadId: lead.id,
                                description: `Tự động: ${rule.name} (Khách Check-in)`,
                                createdAt: new Date().toISOString(),
                                updatedAt: new Date().toISOString()
                            }
                            saveState(saveCommissionLog(commLog))
                            await syncCommissionLog(commLog)
                        }

                        // Cập nhật trạng thái Lead thành booked
                        const updatedLead = { ...lead, status: 'booked' as const }
                        saveState(saveLead(updatedLead))
                        await syncLead(updatedLead)
                    }
                }
            }


            // 2. Thưởng % Dịch vụ cho Sale Tele khi Hoàn thành (Completed)
            if (newStatus === 'completed' && a.status !== 'completed') {
                const s = getState()
                if (updated.saleTeleId && updated.price && updated.price > 0) {
                    let targetRules = s.commissionSettings?.filter((r: any) => r.action === 'appointment_completed' && r.isActive) || []

                    // Fallback cho dữ liệu cũ chưa có 'action'
                    if (targetRules.length === 0) {
                        targetRules = s.commissionSettings?.filter((r: any) => r.ruleCode === 'service_revenue' && r.isActive) || []
                    }

                    for (const rule of targetRules) {
                        const commissionAmount = rule.type === 'percentage'
                            ? Math.round(updated.price * ((rule.amount || 0) / 100))
                            : rule.amount || 0

                        const commLog: CommissionLog = {
                            id: crypto.randomUUID(),
                            userId: updated.saleTeleId,
                            amount: commissionAmount,
                            type: rule.ruleCode || 'service_commission',
                            status: 'pending', // Phải chờ Kế toán duyệt trả
                            appointmentId: updated.id,
                            description: `Tự động: ${rule.name} (${rule.type === 'percentage' ? rule.amount + '%' : rule.amount.toLocaleString() + 'đ'}) x ${updated.price.toLocaleString()}đ`,
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString()
                        }
                        saveState(saveCommissionLog(commLog))
                        await syncCommissionLog(commLog)
                    }
                }
            }


            showToast('Thành công', `Đã cập nhật: ${STATUS_CONFIG[newStatus].label}`)
        } catch (e) {
            showToast('Lỗi', 'Đã lưu cục bộ, lỗi đồng bộ', 'error' as any)
        }
    }

    async function handleDelete(a: Appointment) {
        if (a.logs && a.logs.length > 0) {
            await showAlert('Không thể xóa lịch hẹn đã có lịch sử hoạt động (logs). Vui lòng kiểm tra lại.')
            return
        }

        setAppointmentToDelete(a)
        setDeleteReason('')
        setShowDeleteModal(true)
        setActionMenuId(null)
    }

    async function confirmDelete() {
        if (!appointmentToDelete) return
        if (!deleteReason.trim()) {
            await showAlert('Vui lòng nhập lý do xóa lịch hẹn')
            return
        }

        saveState(s => ({
            ...s,
            appointments: s.appointments.filter(item => item.id !== appointmentToDelete.id),
            leads: appointmentToDelete.leadId ? s.leads.map(l => l.id === appointmentToDelete.leadId ? { ...l, status: 'recare' as any } : l) : s.leads
        }))

        try {
            await syncDeleteAppointment(appointmentToDelete.id, appointmentToDelete.leadId, deleteReason)
            showToast('Thành công', 'Đã xóa lịch hẹn và đồng bộ trạng thái Lead')
        } catch (e) {
            showToast('Lỗi', 'Lỗi đồng bộ server khi xóa', 'error' as any)
        }

        setShowDeleteModal(false)
        setAppointmentToDelete(null)
        setShowForm(false)
    }

    async function handleSave() {
        if (!form.customerId || !form.appointmentDate || !form.appointmentTime) {
            await showAlert('Vui lòng chọn Khách hàng, Ngày và Giờ hẹn')
            return
        }

        setIsSaving(true)
        const isNew = !editing
        const logs = [...(editing?.logs || [])]

        if (isNew) {
            logs.push(createLog('created', 'Tạo mới lịch hẹn'))
        } else if (editing?.notes !== form.notes) {
            logs.push(createLog('note_added', `Cập nhật ghi chú: ${form.notes}`))
        }

        const autoSource = editing?.leadId ? 'lead' as const : (currentUser?.departmentType === 'sale' ? 'tele' as const : 'branch' as const)

        const appointment: Appointment = {
            id: editing?.id || crypto.randomUUID(),
            customerId: form.customerId,
            customerName: form.customerName || editing?.customerName || customerSearch,
            customerPhone: form.customerPhone || editing?.customerPhone,
            customerRank: form.customerRank || editing?.customerRank,
            customerAvatar: form.customerAvatar || editing?.customerAvatar,
            customerRedFlags: form.customerRedFlags || editing?.customerRedFlags || [],
            branchId: form.branchId,
            staffId: currentUser?.id,
            appointmentDate: form.appointmentDate,
            appointmentTime: form.appointmentTime,
            status: (form.status as AppointmentStatus) || 'pending',
            type: form.type,
            notes: form.notes,
            logs: logs,
            leadId: editing?.leadId,
            saleTeleId: editing?.saleTeleId,
            saleTeleName: editing?.saleTeleName,
            salePageId: editing?.salePageId,
            salePageName: editing?.salePageName,
            bookingSource: autoSource,
            createdAt: editing?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }

        saveState(saveAppointment(appointment))
        setTimeout(async () => {
            try {
                await syncAppointment(appointment)
                showToast('Thành công', `Đã lưu lịch hẹn lúc ${appointment.appointmentTime}`)
                setShowForm(false)
            } catch (e) {
                showToast('Lỗi', 'Lỗi đồng bộ server', 'error' as any)
            } finally {
                setIsSaving(false)
            }
        }, 400)
    }

    return (
        <div className="page-container">
            <PageHeader
                icon={CalendarDays}
                title="Lịch hẹn"
                subtitle={dateDisplay}
                description="Hệ thống CRM • Quản lý lịch trình khách hàng"
                actions={
                    <button
                        onClick={() => openNew()}
                        className="px-6 py-3 bg-text-main text-white rounded-[15px] text-[11px] font-black uppercase tracking-[0.2em] shadow-luxury hover:bg-gold-muted hover:shadow-gold-muted/20 transition-all duration-300 flex items-center gap-2 active:scale-95 group"
                    >
                        <PlusCircle size={18} strokeWidth={2.5} className="group-hover:rotate-90 transition-transform duration-500" />
                        Đặt lịch
                    </button>
                }
            >
                <div className="flex flex-wrap items-center gap-3">
                    {/* Quick Search */}
                    <div className="relative hidden lg:block">
                        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-soft opacity-40" />
                        <input
                            type="text"
                            placeholder="Tìm khách, sđt..."
                            className="pl-11 pr-5 py-3 bg-gray-50/50 border border-gray-100 rounded-[15px] text-[11px] font-bold text-text-main focus:ring-4 focus:ring-gold-light/20 outline-none w-48 lg:w-64 transition-all"
                            value={globalSearch}
                            onChange={e => setGlobalSearch(e.target.value)}
                        />
                    </div>

                    {/* View Switcher */}
                    <div className="flex bg-gray-100/50 p-1 rounded-[15px] border border-gray-100">
                        {[
                            { id: 'day', label: 'Ngày' },
                            { id: 'week', label: 'Tuần' },
                            { id: 'month', label: 'Tháng' }
                        ].map(v => (
                            <button
                                key={v.id}
                                onClick={() => setViewMode(v.id as any)}
                                className={`px-4 py-2 rounded-[12px] text-[10px] font-black uppercase tracking-wider transition-all ${viewMode === v.id ? 'bg-white shadow-sm text-text-main border border-gray-100' : 'text-text-soft opacity-40 hover:opacity-100'}`}
                            >
                                {v.label}
                            </button>
                        ))}
                    </div>

                    {canViewAll && (
                        <div className="relative">
                            <Store size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-soft opacity-40" />
                            <select
                                className="pl-10 pr-4 py-3 bg-gray-50/50 border border-gray-100 rounded-[15px] text-[10px] font-black uppercase tracking-wider text-text-main focus:ring-4 focus:ring-gold-light/20 outline-none appearance-none cursor-pointer"
                                value={branchFilter}
                                onChange={e => setBranchFilter(e.target.value)}
                            >
                                <option value="all">Chi nhánh</option>
                                {state.branches?.filter(b => b.type !== 'hq' && !b.isHeadquarter).map(b => (
                                    <option key={b.id} value={b.id}>{b.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Date Picker */}
                    <div className="flex bg-gray-100/50 p-1 rounded-[15px] border border-gray-100 items-center">
                        <button onClick={() => changeDate(-1)} className="p-2 hover:bg-white rounded-[12px] transition-all text-text-soft opacity-40 hover:opacity-100">
                            <ChevronLeft size={16} />
                        </button>
                        <input
                            type="date"
                            className="bg-transparent border-none text-[10px] font-black text-text-main px-2 focus:ring-0 cursor-pointer min-w-[110px] uppercase tracking-wider"
                            value={selectedDate}
                            onChange={e => setSelectedDate(e.target.value)}
                        />
                        <button onClick={() => changeDate(1)} className="p-2 hover:bg-white rounded-[12px] transition-all text-text-soft opacity-40 hover:opacity-100">
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            </PageHeader>

            <div className="content-wrapper">

                {/* Dashboard Stats - Compact */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {[
                        { label: 'Tổng lịch', value: stats.total, icon: 'analytics', color: 'bg-blue-50 text-blue-600', border: 'border-blue-50' },
                        { label: 'Chờ/Xác nhận', value: stats.pending, icon: 'history', color: 'bg-amber-50 text-amber-600', border: 'border-amber-50' },
                        { label: 'Đã đến', value: stats.arrived, icon: 'check_circle', color: 'bg-emerald-50 text-emerald-600', border: 'border-emerald-50' },
                        { label: 'Đã hủy', value: stats.cancelled, icon: 'cancel', color: 'bg-red-50 text-red-600', border: 'border-red-50' },
                        { label: 'Rớt Sale', value: stats.noShow, icon: 'person_off', color: 'bg-gray-100 text-gray-600', border: 'border-gray-100' },
                    ].map((s, i) => (
                        <div key={i} className={`bg-white p-3.5 px-4 rounded-[1.5rem] border ${s.border} shadow-md shadow-gray-100/30 flex flex-col gap-1 relative overflow-hidden group hover:shadow-lg transition-all`}>
                            <span className="material-icons-round absolute -right-1 -bottom-1 text-4xl opacity-5 group-hover:scale-110 transition-transform">{s.icon}</span>
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none">{s.label}</p>
                            <div className="flex items-end gap-1.5 mt-0.5">
                                <span className="text-xl font-black text-gray-900 leading-none">{s.value}</span>
                                <span className={`text-[8px] font-black px-1 py-0.5 rounded-md ${s.color}`}>+Lượt</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 bg-white rounded-[2rem] border border-gray-100 shadow-2xl overflow-hidden flex flex-col min-h-0">
                <div className="overflow-y-auto flex-1 custom-scrollbar p-5">
                    {viewMode === 'day' && (
                        <div className="max-w-5xl mx-auto flex flex-col gap-1 relative">
                            {/* Timeline Guide Line */}
                            <div className="absolute left-20 top-0 bottom-0 w-px bg-gray-100 z-0"></div>

                            {HOURS.map(hour => {
                                const appointments = viewAppointments.filter(a => a.appointmentTime?.startsWith(hour.split(':')[0]))

                                return (
                                    <div key={hour} className={`flex gap-8 group min-h-[100px] relative ${viewAppointments.some(a => a.id === actionMenuId && a.appointmentTime?.startsWith(hour.split(':')[0])) ? 'z-[60]' : 'z-10'}`}>
                                        <div className="w-28 pt-2 flex items-center justify-end gap-3 shrink-0">
                                            <button
                                                onClick={() => openNew(hour)}
                                                className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-primary hover:bg-primary hover:text-gray-900 transition-all shadow-sm active:scale-95 group/addbtn"
                                                title={`Đặt lịch lúc ${hour}`}
                                            >
                                                <span className="material-icons-round text-lg">add</span>
                                            </button>
                                            <span className="text-sm font-black text-gray-900 group-hover:text-primary transition-colors">{hour}</span>
                                        </div>

                                        <div className="flex-1 pb-8 flex flex-col gap-4 relative">
                                            {/* Horizontal dashed line for timeline */}
                                            <div className="absolute top-4 left-0 right-0 border-t border-dashed border-gray-200 -z-10"></div>
                                            {appointments.length > 0 ? (
                                                appointments.map((a: Appointment) => {
                                                    const config = STATUS_CONFIG[a.status as AppointmentStatus] || STATUS_CONFIG.pending
                                                    const isVip = a.customerRank === CustomerRank.PLATINUM || a.customerRank === CustomerRank.GOLD
                                                    const hasRedFlag = (a.customerRedFlags && a.customerRedFlags.length > 0)

                                                    const isMenuOpen = actionMenuId === a.id

                                                    return (
                                                        <div
                                                            key={a.id}
                                                            onClick={() => openEdit(a)}
                                                            className={`p-6 rounded-[2rem] border-2 shadow-xl hover:shadow-2xl transition-all cursor-pointer group/item relative flex flex-col md:flex-row gap-6 items-start md:items-center ${a.status === 'arrived' ? 'bg-emerald-50 border-emerald-200' :
                                                                a.status === 'confirmed' ? 'bg-cyan-50 border-cyan-200' :
                                                                    a.status === 'pending' ? 'bg-amber-50 border-amber-200' :
                                                                        a.status === 'completed' ? 'bg-indigo-50 border-indigo-200' :
                                                                            a.status === 'cancelled' ? 'bg-red-50 border-red-200' :
                                                                                'bg-gray-50 border-gray-200'
                                                                }`}
                                                        >
                                                            <span className="material-icons-round absolute -right-6 -bottom-6 text-9xl opacity-[0.05] group-hover/item:scale-110 transition-transform text-white">{config.icon}</span>


                                                            <div className="flex items-center gap-4 shrink-0">
                                                                <div className="relative">
                                                                    {/* Status Badge above avatar */}
                                                                    <div className="absolute -top-10 left-0 right-0 flex justify-center z-20">
                                                                        <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider border-2 border-dashed shadow-sm whitespace-nowrap ${config.bg}`}>
                                                                            {config.label}
                                                                        </span>
                                                                    </div>

                                                                    <img
                                                                        src={a.customerAvatar || `https://ui-avatars.com/api/?name=${a.customerName}&background=random`}
                                                                        className={`w-14 h-14 rounded-2xl object-cover ring-4 ring-white shadow-md ${isVip ? 'ring-amber-200' : 'ring-gray-100'}`}
                                                                        alt=""
                                                                    />
                                                                    {isVip && (
                                                                        <span className="absolute -top-2 -right-2 w-6 h-6 bg-amber-500 text-white rounded-lg flex items-center justify-center shadow-lg border-2 border-white">
                                                                            <span className="material-icons-round text-[14px]">workspace_premium</span>
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <div>
                                                                    <p className="text-lg font-black text-gray-900">{a.customerName || 'Khách vãng lai'}</p>
                                                                    <div className="flex items-center gap-2 mt-0.5">
                                                                        <span className="text-[10px] bg-white px-2 py-0.5 rounded-md font-black text-gray-900 uppercase tracking-widest border border-gray-200">{a.appointmentTime}</span>
                                                                        <span className="text-[9px] bg-gray-100 px-2 py-0.5 rounded-md font-black text-gray-500 uppercase tracking-widest">LH-{a.appointmentDate.replace(/-/g, '').slice(2)}</span>
                                                                        <span className="text-xs text-gray-600 font-bold">{a.customerPhone}</span>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="flex-1 space-y-2">
                                                                <div className="flex flex-wrap gap-2">
                                                                    {hasRedFlag && (
                                                                        <span className="flex items-center gap-1.5 px-3 py-1 bg-red-500 text-white rounded-full text-[10px] font-black uppercase tracking-wider animate-pulse shadow-lg shadow-red-200">
                                                                            <span className="material-icons-round text-xs">report_problem</span>
                                                                            Cần lưu ý
                                                                        </span>
                                                                    )}
                                                                    <span className="px-3 py-1 bg-white border border-gray-200 rounded-full text-[10px] font-black text-gray-600 uppercase tracking-widest shadow-sm">
                                                                        {state.branches.find(b => b.id === a.branchId)?.name || 'HQ'}
                                                                    </span>
                                                                    {a.bookingSource && SOURCE_CONFIG[a.bookingSource as keyof typeof SOURCE_CONFIG] && (
                                                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm border ${SOURCE_CONFIG[a.bookingSource as keyof typeof SOURCE_CONFIG].bg}`}>
                                                                            <span className="material-icons-round text-xs align-middle mr-1">{SOURCE_CONFIG[a.bookingSource as keyof typeof SOURCE_CONFIG].icon}</span>
                                                                            {SOURCE_CONFIG[a.bookingSource as keyof typeof SOURCE_CONFIG].label}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                {a.notes && (
                                                                    <p className="text-sm font-bold text-gray-900 line-clamp-1 italic">
                                                                        <span className="material-icons-round text-sm align-middle mr-1 opacity-60">edit_note</span>
                                                                        {a.notes}
                                                                    </p>
                                                                )}
                                                            </div>

                                                            {/* Unified Quick Actions */}
                                                            <div className="relative pt-2" onClick={e => e.stopPropagation()}>
                                                                <button
                                                                    onClick={() => setActionMenuId(isMenuOpen ? null : a.id)}
                                                                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-100 text-gray-900 rounded-xl shadow-md hover:shadow-lg transition-all active:scale-95 font-black text-[10px] uppercase tracking-widest"
                                                                >
                                                                    Hành động
                                                                    <span className="material-icons-round text-base transition-transform" style={{ transform: isMenuOpen ? 'rotate(180deg)' : 'none' }}>expand_more</span>
                                                                </button>

                                                                {isMenuOpen && (
                                                                    <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden divide-y divide-gray-50 z-[100] animate-scale-up origin-top-right">
                                                                        <div className="p-2 grid grid-cols-1 gap-1">
                                                                            <div className="flex items-center justify-between px-3 py-2 mb-1">
                                                                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Trạng thái</span>
                                                                                <button onClick={() => setActionMenuId(null)} className="text-gray-400 hover:text-gray-900 transition-colors">
                                                                                    <span className="material-icons-round text-sm">close</span>
                                                                                </button>
                                                                            </div>
                                                                            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
                                                                                const isActive = a.status === key
                                                                                return (
                                                                                    <button
                                                                                        key={key}
                                                                                        onClick={() => handleStatusChange(a, key as AppointmentStatus)}
                                                                                        className={`flex items-center gap-3 w-full p-3 rounded-xl transition-all group/btn ${isActive ? 'bg-primary/10 text-primary' : 'hover:bg-gray-50 text-gray-600 hover:pl-5 active:scale-95'}`}
                                                                                    >
                                                                                        <span className="material-icons-round text-base transition-transform group-hover/btn:scale-125" style={{ color: !isActive ? cfg.color : undefined }}>{cfg.icon}</span>
                                                                                        <span className="text-[11px] font-black uppercase tracking-wider">{cfg.label}</span>
                                                                                        {isActive && <span className="material-icons-round text-sm ml-auto animate-in zoom-in-50 duration-300">check</span>}
                                                                                    </button>
                                                                                )
                                                                            })}
                                                                            <div className="h-px bg-gray-100 my-1"></div>
                                                                            <button
                                                                                onClick={() => handleDelete(a)}
                                                                                className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-red-50 text-red-500 transition-all font-black hover:pl-5 active:scale-95 group/delbtn"
                                                                            >
                                                                                <span className="material-icons-round text-base transition-transform group-hover/delbtn:rotate-12 group-hover/delbtn:scale-125">delete</span>
                                                                                <span className="text-[11px] uppercase tracking-wider">Xóa lịch hẹn</span>
                                                                            </button>
                                                                            <div className="h-px bg-gray-100 my-1"></div>
                                                                            <button
                                                                                onClick={() => {
                                                                                    setActionMenuId(null)
                                                                                    setServiceOrderInitialData({
                                                                                        appointmentId: a.id,
                                                                                        customerId: a.customerId,
                                                                                        branchId: a.branchId || ''
                                                                                    })
                                                                                    setShowServiceOrderForm(true)
                                                                                }}
                                                                                className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-primary/10 text-primary transition-all font-black hover:pl-5 active:scale-95 group/sobtn"
                                                                            >
                                                                                <Receipt size={16} className="transition-transform group-hover/sobtn:scale-125" />
                                                                                <span className="text-[11px] uppercase tracking-wider">Tạo phiếu DV</span>
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )
                                                })
                                            ) : (
                                                <div
                                                    onClick={() => openNew(hour)}
                                                    className="h-14 border border-dashed border-gray-300 rounded-2xl flex items-center px-6 text-gray-600 hover:border-primary/50 hover:bg-primary/5 hover:text-primary transition-all cursor-pointer group/slot"
                                                >
                                                    <span className="material-icons-round text-lg mr-3 opacity-30 group-hover/slot:opacity-100 transition-opacity">add_circle_outline</span>
                                                    <span className="text-xs font-black uppercase tracking-widest opacity-60 group-hover/slot:opacity-100 transition-opacity">Đặt lịch lúc {hour}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}

                    {viewMode === 'week' && (
                        <div className="max-w-6xl mx-auto space-y-8 pb-20">
                            {Array.from({ length: 7 }).map((_, i) => {
                                const curr = new Date(selectedDate)
                                const first = curr.getDate() - curr.getDay() + 1
                                const date = new Date(curr.setDate(first + i))
                                const dateStr = date.toISOString().split('T')[0]
                                const label = date.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' })
                                const dayAppointments = viewAppointments.filter(a => a.appointmentDate === dateStr)
                                const isToday = dateStr === new Date().toISOString().split('T')[0]

                                return (
                                    <div key={dateStr} className={`bg-gray-50/50 rounded-2xl border ${isToday ? 'border-primary/50 bg-primary/5' : 'border-gray-100'} p-4 flex flex-col md:flex-row gap-4`}>
                                        <div
                                            onClick={() => {
                                                setSelectedDate(dateStr)
                                                setViewMode('day')
                                            }}
                                            className="w-24 shrink-0 cursor-pointer hover:bg-white p-2 rounded-xl transition-all group/daylink"
                                        >
                                            <p className={`text-xs font-black uppercase tracking-widest ${isToday ? 'text-primary' : 'text-gray-600'}`}>{label.split(' ')[0]}</p>
                                            <p className="text-xl font-black text-gray-900 leading-none mt-1">{label.split(' ')[1]}</p>
                                            {isToday && <span className="text-[8px] font-black text-primary uppercase tracking-widest block mt-1">Hôm nay</span>}
                                            <span className="material-icons-round text-sm text-primary opacity-0 group-hover/daylink:opacity-100 transition-opacity mt-1">login</span>
                                        </div>
                                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {dayAppointments.map(a => {
                                                const customer = state.customers.find(c => c.id === a.customerId)
                                                const config = STATUS_CONFIG[a.status as AppointmentStatus] || STATUS_CONFIG.pending
                                                return (
                                                    <div key={a.id} onClick={() => openEdit(a)} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center gap-3">
                                                        <div className="w-2 h-10 rounded-full" style={{ backgroundColor: config.color }}></div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-xs font-black text-gray-900 truncate">{customer?.fullName || 'Khách vãng lai'}</p>
                                                            <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest mt-0.5">{a.appointmentTime}</p>
                                                        </div>
                                                        <span className="material-icons-round text-sm text-gray-400">{config.icon}</span>
                                                    </div>
                                                )
                                            })}
                                            {dayAppointments.length === 0 && (
                                                <div className="col-span-full py-4 text-center opacity-30 italic text-sm font-bold">Trống</div>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}

                    {viewMode === 'month' && (
                        <div className="max-w-6xl mx-auto pb-20">
                            <div className="grid grid-cols-7 gap-px bg-gray-100 border border-gray-100 shadow-2xl rounded-3xl overflow-hidden">
                                {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(d => (
                                    <div key={d} className="bg-gray-50 p-4 text-center text-[10px] font-black text-gray-600 uppercase tracking-widest">{d}</div>
                                ))}
                                {(() => {
                                    const d = new Date(selectedDate)
                                    const month = d.getMonth()
                                    const year = d.getFullYear()
                                    const firstDay = new Date(year, month, 1).getDay()
                                    const daysInMonth = new Date(year, month + 1, 0).getDate()
                                    const offset = firstDay === 0 ? 6 : firstDay - 1

                                    return Array.from({ length: 42 }).map((_, i) => {
                                        const dayNum = i - offset + 1
                                        const isValid = dayNum > 0 && dayNum <= daysInMonth
                                        const date = new Date(year, month, dayNum)
                                        const dateStr = date.toISOString().split('T')[0]
                                        const dayAppointments = viewAppointments.filter(a => a.appointmentDate === dateStr)
                                        const isToday = dateStr === new Date().toISOString().split('T')[0]

                                        return (
                                            <div
                                                key={i}
                                                onClick={() => {
                                                    if (isValid) {
                                                        setSelectedDate(dateStr)
                                                        setViewMode('day')
                                                    }
                                                }}
                                                className={`bg-white min-h-[100px] p-2 flex flex-col gap-1 transition-colors relative group/monthday ${!isValid ? 'bg-gray-50/30' : 'hover:bg-primary/5 cursor-pointer'}`}
                                            >
                                                {isValid && (
                                                    <span className="material-icons-round absolute right-2 top-2 text-xs text-primary opacity-0 group-hover/monthday:opacity-100 transition-opacity">login</span>
                                                )}
                                                {isValid && (
                                                    <>
                                                        <span className={`text-xs font-black ${isToday ? 'w-6 h-6 rounded-lg bg-primary text-gray-900 flex items-center justify-center' : 'text-gray-600'}`}>{dayNum}</span>
                                                        <div className="flex flex-col gap-1">
                                                            {dayAppointments.slice(0, 3).map(a => (
                                                                <div key={a.id} className="px-2 py-1 rounded-md bg-gray-50 border border-gray-200 flex items-center gap-1.5 opacity-90 overflow-hidden">
                                                                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: STATUS_CONFIG[a.status as AppointmentStatus]?.color || '#ccc' }}></div>
                                                                    <span className="text-[9px] font-black text-gray-900 truncate">{a.customerName || 'Khách'}</span>
                                                                </div>
                                                            ))}
                                                            {dayAppointments.length > 3 && (
                                                                <span className="text-[9px] font-black text-primary pl-2">+{dayAppointments.length - 3} thêm...</span>
                                                            )}
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        )
                                    })
                                })()}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal Form */}
            {
                showForm && (
                    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                        <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col animate-scale-up">
                            <div className="px-8 py-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                                <div>
                                    <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">
                                        {editing ? 'Cập nhật lịch hẹn' : 'Đặt lịch hẹn mới'}
                                    </h2>
                                    <p className="text-xs text-gray-400 font-bold tracking-widest uppercase mt-1">Chuẩn Spa cao cấp</p>
                                </div>
                                <button onClick={() => setShowForm(false)} className="w-10 h-10 rounded-full bg-white border border-gray-100 text-gray-400 hover:text-gray-900 flex items-center justify-center transition-all active:scale-90 shadow-sm">
                                    <span className="material-icons-round">close</span>
                                </button>
                            </div>

                            <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar max-h-[70vh]">
                                <div className="relative">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Tên khách hàng *</label>
                                    <div className="relative">
                                        <span className="material-icons-round absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">person</span>
                                        <input
                                            className="w-full pl-12 pr-12 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all font-bold"
                                            placeholder="Nhập tên hoặc số điện thoại..."
                                            value={customerSearch}
                                            onChange={e => setCustomerSearch(e.target.value)}
                                            disabled={!!editing}
                                        />
                                        {isSearchingCustomers && (
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                                <Loader2 size={18} className="animate-spin text-primary" />
                                            </div>
                                        )}
                                    </div>
                                    {customerSuggestions.length > 0 && (
                                        <div className="absolute top-full left-0 right-0 z-20 mt-2 bg-white rounded-3xl border border-gray-100 shadow-2xl overflow-hidden divide-y divide-gray-50">
                                            {customerSuggestions.map((c: Customer) => (
                                                <div key={c.id}
                                                    className="p-4 hover:bg-gray-50 flex items-center gap-4 cursor-pointer transition-colors"
                                                    onClick={() => {
                                                        setForm(f => ({
                                                            ...f,
                                                            customerId: c.id,
                                                            branchId: c.branchId || f.branchId,
                                                            customerName: c.fullName,
                                                            customerPhone: c.phone,
                                                            customerRank: c.rank,
                                                            customerAvatar: c.avatar
                                                        }))
                                                        setCustomerSearch(`${c.fullName} - ${c.phone}`)
                                                        setCustomerSuggestions([])
                                                    }}
                                                >
                                                    <div className="relative">
                                                        <img
                                                            src={c.avatar || `https://ui-avatars.com/api/?name=${c.fullName}&background=random`}
                                                            className="w-10 h-10 rounded-xl object-cover"
                                                            alt=""
                                                        />
                                                        {c.rank === CustomerRank.PLATINUM && <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-lg flex items-center justify-center text-[8px] text-white">⭐</span>}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black text-gray-900">{c.fullName} - {c.phone}</p>
                                                        <p className="text-xs text-gray-400 font-bold">Hạng: {c.rank || 'Tiêu chuẩn'}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {form.customerId && (
                                        <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-black">
                                            <span className="material-icons-round text-[14px]">check_circle</span>
                                            Đã chọn: {form.customerName} - {form.customerPhone}
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Ngày hẹn</label>
                                        <input
                                            type="date"
                                            className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl font-bold"
                                            value={form.appointmentDate || ''}
                                            onChange={e => setForm(f => ({ ...f, appointmentDate: e.target.value }))}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Giờ hẹn</label>
                                        <input
                                            type="time"
                                            className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl font-bold"
                                            value={form.appointmentTime || ''}
                                            onChange={e => setForm(f => ({ ...f, appointmentTime: e.target.value }))}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Trạng thái</label>
                                        <select
                                            className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl font-bold appearance-none"
                                            value={form.status || 'pending'}
                                            onChange={e => setForm(f => ({ ...f, status: e.target.value as any }))}
                                        >
                                            {Object.entries(STATUS_CONFIG).map(([key, val]) => (
                                                <option key={key} value={key}>{val.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Chi nhánh</label>
                                        <select
                                            className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl font-bold appearance-none"
                                            value={form.branchId || ''}
                                            onChange={e => setForm(f => ({ ...f, branchId: e.target.value }))}
                                        >
                                            {state.branches.filter(b => b.type !== 'hq' && !b.isHeadquarter).map(b => (
                                                <option key={b.id} value={b.id}>{b.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Ghi chú dịch vụ</label>
                                    <textarea
                                        className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-[2rem] font-bold text-gray-700 min-h-[100px]"
                                        placeholder="Yêu cầu đặc biệt hoặc dịch vụ dự kiến (vd: Làm combo mày môi...)"
                                        value={form.notes || ''}
                                        onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                                    />
                                </div>

                                {/* Activity Logs Section */}
                                {editing && editing.logs && editing.logs.length > 0 && (
                                    <div className="mt-8 pt-8 border-t border-gray-100">
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                            <span className="material-icons-round text-sm">history</span>
                                            Nhật ký hoạt động
                                        </label>
                                        <div className="space-y-4">
                                            {editing.logs.map((log) => (
                                                <div key={log.id} className="flex gap-3 relative">
                                                    <div className="w-px h-full absolute left-3 top-6 bg-gray-100"></div>
                                                    <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center shrink-0 z-10">
                                                        <span className="material-icons-round text-[12px] text-gray-400">
                                                            {log.action === 'created' ? 'add' : log.action === 'status_changed' ? 'sync' : 'edit_note'}
                                                        </span>
                                                    </div>
                                                    <div className="flex-1 bg-gray-50/50 p-3 rounded-2xl border border-gray-50">
                                                        <div className="flex justify-between items-start gap-4">
                                                            <p className="text-[11px] font-black text-gray-900">{log.userDisplayName}</p>
                                                            <p className="text-[9px] text-gray-400 font-bold uppercase">{new Date(log.createdAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}</p>
                                                        </div>
                                                        <p className="text-[10px] text-gray-600 font-bold mt-1">{log.details}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="p-8 bg-gray-50/50 border-t border-gray-50 flex gap-4">
                                <button
                                    onClick={() => setShowForm(false)}
                                    className="flex-1 py-4 bg-white border border-gray-200 rounded-2xl font-black text-gray-400 hover:bg-gray-100 transition-all active:scale-95 text-xs uppercase tracking-widest"
                                >
                                    Hủy
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className={`flex-[2] py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2 ${isSaving ? 'bg-emerald-500 text-white animate-pulse' : 'bg-primary text-gray-900 hover:bg-primary-hover shadow-primary/20'
                                        }`}
                                >
                                    {isSaving ? (
                                        <>
                                            <span className="material-icons-round animate-spin">sync</span>
                                            Đang lưu...
                                        </>
                                    ) : (
                                        <>
                                            <span className="material-icons-round">check_circle</span>
                                            {editing ? 'Lưu thay đổi' : 'Xác nhận đặt lịch'}
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
            {/* Delete Confirmation Modal with Reason (V21.9) */}
            {
                showDeleteModal && (
                    <div className="fixed inset-0 z-[1010] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm animate-fade-in" onClick={() => setShowDeleteModal(false)}></div>
                        <div className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-scale-up">
                            <div className="p-8 pb-0">
                                <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center mb-6">
                                    <span className="material-icons-round text-3xl">delete_sweep</span>
                                </div>
                                <h2 className="text-2xl font-black text-gray-900 leading-tight">Xóa lịch hẹn?</h2>
                                <p className="text-sm font-bold text-gray-400 mt-2 uppercase tracking-widest">Vui lòng nhập lý do xóa để lưu vào nhật ký Lead</p>
                            </div>

                            <div className="p-8">
                                <textarea
                                    className="w-full px-6 py-5 bg-gray-50 border border-gray-100 rounded-[2rem] font-bold text-gray-700 min-h-[120px] focus:ring-2 focus:ring-red-100 outline-none transition-all"
                                    placeholder="Vd: Khách bận đột xuất, Sai thông tin dịch vụ..."
                                    value={deleteReason}
                                    onChange={e => setDeleteReason(e.target.value)}
                                    autoFocus
                                />
                            </div>

                            <div className="p-8 bg-gray-50/50 flex gap-4">
                                <button
                                    onClick={() => setShowDeleteModal(false)}
                                    className="flex-1 py-4 bg-white border border-gray-200 rounded-2xl font-black text-gray-400 hover:bg-gray-100 transition-all active:scale-95 text-xs uppercase tracking-widest"
                                >
                                    Quay lại
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    className="flex-[2] py-4 bg-red-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-red-200 hover:bg-red-600 active:scale-95 transition-all flex items-center justify-center gap-2"
                                >
                                    <span className="material-icons-round">check_circle</span>
                                    Xác nhận xóa
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
            {/* Service Order Modal (Direct creation) */}
            <ServiceOrderModal
                isOpen={showServiceOrderForm}
                onClose={() => setShowServiceOrderForm(false)}
                initialAppointmentId={serviceOrderInitialData.appointmentId}
                initialCustomerId={serviceOrderInitialData.customerId}
                initialBranchId={serviceOrderInitialData.branchId}
            />
        </div>
    )
}
