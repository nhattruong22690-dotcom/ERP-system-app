'use client'
export const dynamic = 'force-dynamic'
import { useState, useMemo } from 'react'
import { useApp, canViewAllBranches } from '@/lib/auth'
import { Lead, User, LeadCareLog, Appointment } from '@/lib/types'
import { saveLead, syncLead, saveAppointment, syncAppointment, saveCustomer, syncCustomer } from '@/lib/storage'
import { useModal } from '@/components/ModalProvider'
import { useToast } from '@/components/ToastProvider'
import UserAvatar from '@/components/UserAvatar'
import {
    Plus, Search, Phone, Clock,
    CheckCircle2, XCircle, UserPlus, ClipboardList,
    MessageSquare, History, Send, Zap, MapPinOff,
    CalendarDays, ExternalLink, Pencil, Save, X
} from 'lucide-react'

// Import components
import { LeadStats } from './components/LeadStats'
import { LeadFilters } from './components/LeadFilters'
import { LeadTable } from './components/LeadTable'
import { LeadModals } from './components/LeadModals'
import PageHeader from '@/components/PageHeader'

const SOURCES = ['Facebook', 'Zalo', 'Hotline', 'Website', 'TikTok', 'Khác']

// Trạng thái hiển thị (dùng dể render chip)
const STATUS_CHIPS: Record<string, { label: string; color: string }> = {
    new_created: { label: 'Mới tạo (<24h)', color: 'bg-blue-500/10 text-blue-600 border-blue-200' },
    new: { label: 'Mới (Chưa xử lý)', color: 'bg-slate-500/10 text-slate-600 border-slate-200' },
    contacted: { label: 'Đã liên hệ', color: 'bg-amber-500/10 text-amber-600 border-amber-200' },
    failed: { label: 'Thất bại', color: 'bg-rose-500/10 text-rose-600 border-rose-200' },
    spam_data: { label: 'Data trùng/Spam', color: 'bg-rose-900 text-white' },
    low_quality_mess: { label: 'Mess không chất lượng', color: 'bg-amber-900 text-white' },
    no_reach_mess: { label: 'Mess không tiếp cận', color: 'bg-yellow-500 text-black font-bold' },
    in_care: { label: 'Đang chăm sóc', color: 'bg-emerald-600 text-white' },
    recare: { label: 'Chăm sóc lại', color: 'bg-indigo-500 text-white border-indigo-200' },
    pending: { label: 'Chờ xác nhận', color: 'bg-amber-100 text-amber-700 border-amber-200' },
    confirmed: { label: 'Đã xác nhận', color: 'bg-blue-100 text-blue-700 border-blue-200' },
    booked: { label: 'Đã đặt lịch', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-200' },
    arrived: { label: 'Khách đã đến', color: 'bg-emerald-100 text-emerald-700 border-emerald-200 font-black' },
    completed: { label: 'Đã hoàn thành', color: 'bg-indigo-100 text-indigo-700 border-indigo-200 font-black' },
    no_show: { label: 'Khách không đến', color: 'bg-gray-100 text-gray-700 border-gray-200' },
    cancelled: { label: 'Đã hủy lịch', color: 'bg-rose-100 text-rose-700 border-rose-200' },
}


// Danh sách kết quả động theo yêu cầu người dùng
const CARE_RESULTS = [
    { value: 'Tương tác', label: 'Tương tác', color: 'text-emerald-600 bg-emerald-50' },
    { value: 'Quan tâm', label: 'Quan tâm', color: 'text-indigo-600 bg-indigo-50' },
    { value: 'SPAM', label: 'SPAM', color: 'text-rose-600 bg-rose-50' },
    { value: 'Trùng Page', label: 'Trùng Page', color: 'text-rose-600 bg-rose-50' },
    { value: 'CLONE', label: 'CLONE', color: 'text-rose-600 bg-rose-50' },
    { value: 'Phá', label: 'Phá', color: 'text-rose-600 bg-rose-50' },
    { value: 'BLOCK', label: 'BLOCK', color: 'text-rose-600 bg-rose-50' },
    { value: 'Không tương tác', label: 'Không tương tác', color: 'text-amber-600 bg-amber-50' },
    { value: 'Xa', label: 'Xa', color: 'text-amber-600 bg-amber-50' },
    { value: 'Từ chối nghe', label: 'Từ chối nghe', color: 'text-amber-600 bg-amber-50' },
    { value: 'Đã đặt lịch', label: 'Đã đặt lịch', color: 'text-emerald-600 bg-emerald-50' },
    { value: 'Thất bại', label: 'Thất bại', color: 'text-gray-600 bg-gray-50' },
]

const EMPTY_LEAD = (userId?: string, branchId?: string): Partial<Lead> => ({
    name: '',
    phone: '',
    source: 'Facebook',
    status: 'new_created',
    salePageId: userId,
    branchId: branchId,
    notes: '',
    careLogs: []
})

export default function LeadsPage() {
    const { currentUser, state, saveState } = useApp()
    const { showAlert, showConfirm } = useModal()
    const { showToast } = useToast()

    const [showForm, setShowForm] = useState(false)
    const [showCareModal, setShowCareModal] = useState(false)
    const [showBookingModal, setShowBookingModal] = useState(false)
    const [activeLead, setActiveLead] = useState<Lead | null>(null)

    const [form, setForm] = useState<Partial<Lead>>(EMPTY_LEAD(currentUser?.id))
    const [careForm, setCareForm] = useState<Partial<LeadCareLog>>({
        type: 'call',
        result: 'Tương tác',
        content: ''
    })

    const [bookingForm, setBookingForm] = useState({
        date: new Date().toISOString().split('T')[0],
        time: '09:00',
        notes: '',
        branchId: state.branches.find(b => b.type !== 'hq' && !b.isHeadquarter)?.id || state.branches[0]?.id
    })

    const [isEditingInfo, setIsEditingInfo] = useState(false)

    const [searchTerm, setSearchTerm] = useState('')
    const [filterStatus, setFilterStatus] = useState('')
    const [filterSource, setFilterSource] = useState('')
    const canViewAll = canViewAllBranches(currentUser)
    const [branchFilter, setBranchFilter] = useState(!canViewAll && currentUser?.branchId ? currentUser.branchId : 'all')

    // Logic tính trạng thái thực tế (Effective Status)
    const getEffectiveStatus = (lead: Lead): string => {
        if (['booked', 'pending', 'confirmed', 'failed', 'spam_data', 'low_quality_mess', 'no_reach_mess', 'in_care', 'recare', 'arrived', 'completed', 'no_show', 'cancelled'].includes(lead.status)) return lead.status
        const logsCount = (lead.careLogs || []).length
        if (logsCount >= 1) return 'contacted'
        const createdAt = new Date(lead.createdAt).getTime()
        const now = new Date().getTime()
        const diffHours = (now - createdAt) / (1000 * 60 * 60)
        return diffHours < 24 ? 'new_created' : 'new'
    }

    const getRowColor = (status: string) => {
        switch (status) {
            case 'spam_data': return 'bg-rose-900/10 text-rose-900 border-rose-100 hover:bg-rose-900/15'
            case 'low_quality_mess': return 'bg-amber-900/10 text-amber-900 border-amber-100 hover:bg-amber-900/15'
            case 'no_reach_mess': return 'bg-yellow-500/10 text-yellow-800 border-yellow-200 hover:bg-yellow-500/20'
            case 'in_care': return 'bg-emerald-500/10 text-emerald-800 border-emerald-100 hover:bg-emerald-500/20'
            case 'recare': return 'bg-indigo-500/10 text-indigo-800 border-indigo-100 hover:bg-indigo-500/20'
            case 'pending': return 'bg-amber-50/50 text-amber-700 border-amber-100 hover:bg-amber-100/50'
            case 'confirmed': return 'bg-blue-50/50 text-blue-700 border-blue-100 hover:bg-blue-100/50'
            case 'booked': return 'bg-indigo-50/50 text-indigo-700 border-indigo-100 hover:bg-indigo-100/50'
            case 'arrived': return 'bg-emerald-50 text-emerald-900 border-emerald-100 hover:bg-emerald-100'
            case 'completed': return 'bg-indigo-50 text-indigo-900 border-indigo-100 hover:bg-indigo-100'
            case 'no_show': return 'bg-gray-50 text-gray-500 border-gray-100 opacity-60'
            default: return 'hover:bg-gray-50 border-gray-50'
        }
    }

    const filteredLeads = useMemo(() => {
        return (state.leads || [])
            .map(l => ({ ...l, effectiveStatus: getEffectiveStatus(l) }))
            .filter(l => {
                const searchMatch = !searchTerm || l.name.toLowerCase().includes(searchTerm.toLowerCase()) || (l.phone && l.phone.includes(searchTerm))
                if (!searchMatch) return false
                if (filterStatus && l.effectiveStatus !== filterStatus) return false
                if (filterSource && l.source !== filterSource) return false
                const hasTeamAccess = currentUser?.permissions?.includes('crm_lead_view_team')
                if (currentUser?.role !== 'admin' && currentUser?.role !== 'manager' && currentUser?.role !== 'director' && !hasTeamAccess && l.salePageId !== currentUser?.id) return false

                // Branch isolation
                if (branchFilter !== 'all' && l.branchId && l.branchId !== branchFilter) return false
                if (!canViewAll && l.branchId && l.branchId !== currentUser?.branchId) return false

                return true
            })
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    }, [state.leads, searchTerm, filterStatus, filterSource, currentUser, branchFilter, canViewAll])

    const stats = useMemo(() => {
        const todayStr = new Date().toISOString().split('T')[0]
        return {
            total: filteredLeads.length,
            new: filteredLeads.filter(l => l.effectiveStatus === 'new_created' || l.effectiveStatus === 'new').length,
            booked: filteredLeads.filter(l => ['booked', 'pending', 'confirmed', 'arrived', 'completed', 'no_show', 'cancelled'].includes(l.effectiveStatus)).length,
            today: filteredLeads.filter(l => l.createdAt.startsWith(todayStr)).length
        }
    }, [filteredLeads])

    function openNew() {
        const defaultBranch = state.branches.find(b => b.type !== 'hq' && !b.isHeadquarter)?.id || state.branches[0]?.id
        setForm(EMPTY_LEAD(currentUser?.id, defaultBranch))
        setActiveLead(null)
        setShowForm(true)
    }

    function openEdit(l: Lead) {
        setForm(l)
        setActiveLead(l)
        setShowForm(true)
    }

    function openCare(l: Lead) {
        setActiveLead(l)
        setCareForm({ type: 'call', result: 'Tương tác', content: '' })
        setIsEditingInfo(false)
        setShowCareModal(true)
    }

    function openBooking(l: Lead) {
        setActiveLead(l)
        setBookingForm({
            date: new Date().toISOString().split('T')[0],
            time: '10:00',
            notes: l.notes || '',
            branchId: l.branchId || state.branches.find(b => b.type !== 'hq' && !b.isHeadquarter)?.id || state.branches[0]?.id
        })
        setShowBookingModal(true)
    }

    async function handleSave() {
        if (!form.name || !form.source) {
            await showAlert('Vui lòng nhập tên khách và nguồn Lead')
            return
        }

        // Chuẩn hóa SĐT: liền kề, không khoảng trắng, bắt đầu bằng số 0
        let cleanPhone = (form.phone || '').replace(/\s+/g, '')
        if (cleanPhone && !cleanPhone.startsWith('0')) {
            cleanPhone = '0' + cleanPhone
        }

        const lead: Lead = {
            id: activeLead?.id ?? `lead_${crypto.randomUUID().substring(0, 8)}_${crypto.randomUUID().substring(14, 18)}`,
            name: form.name!,
            phone: cleanPhone,
            source: form.source!,
            status: form.status as any,
            notes: form.notes,
            branchId: form.branchId,
            salePageId: form.salePageId ?? currentUser?.id ?? '',
            createdAt: activeLead?.createdAt ?? new Date().toISOString(),
            phoneObtainedAt: activeLead?.phoneObtainedAt,
            careLogs: activeLead?.careLogs || [],
            customerId: form.customerId
        }

        saveState(saveLead(lead))
        syncLead(lead)
        showToast('Thành công', `Đã lưu thông tin lead ${lead.name}`)
        setShowForm(false)
    }

    async function handleAddCareLog() {
        if (!activeLead) return

        const logs = [...(activeLead.careLogs || [])]
        let currentLead = { ...activeLead }
        let hasAutomaticLog = false

        // Tìm Lead cũ để so sánh
        const oldLead = state.leads.find(l => l.id === activeLead.id)

        // 1. Tự động tạo Log nếu SĐT thay đổi
        if (oldLead?.phone !== activeLead.phone) {
            const phoneLog: LeadCareLog = {
                id: crypto.randomUUID(),
                userId: currentUser?.id || '',
                userName: currentUser?.displayName || 'System',
                type: 'other',
                result: 'Cập nhật SĐT',
                content: `Thay đổi Số điện thoại: ${oldLead?.phone || '(Trống)'} → ${activeLead.phone || '(Trống)'}`,
                createdAt: new Date().toISOString()
            }
            logs.unshift(phoneLog)
            hasAutomaticLog = true
        }

        // 2. Tự động tạo Log nếu Tên thay đổi
        if (oldLead?.name !== activeLead.name) {
            const nameLog: LeadCareLog = {
                id: crypto.randomUUID(),
                userId: currentUser?.id || '',
                userName: currentUser?.displayName || 'System',
                type: 'other',
                result: 'Cập nhật Tên',
                content: `Đã đổi tên: ${oldLead?.name || '(Trống)'} → ${activeLead.name}`,
                createdAt: new Date().toISOString()
            }
            logs.unshift(nameLog)
            hasAutomaticLog = true
        }

        // 3. Xử lý Log thủ công (Nội dung chăm sóc)
        // Chỉ thêm Log thủ công nếu:
        // - Có gõ nội dung vào ô Ghi chú.
        // - HOẶC: Không có bất kỳ thông tin nào (SĐT/Tên) thay đổi.
        if (careForm.content?.trim() || !hasAutomaticLog) {
            const manualLog: LeadCareLog = {
                id: crypto.randomUUID(),
                userId: currentUser?.id || '',
                userName: currentUser?.displayName || 'System',
                type: careForm.type as any,
                result: careForm.result!,
                content: careForm.content?.trim() || 'Không có ghi chú thêm',
                createdAt: new Date().toISOString()
            }
            logs.unshift(manualLog)
        }

        // Logic mapping status tự động (V21.8)
        let newStatus = currentLead.status
        const res = careForm.result
        if (['SPAM', 'Trùng Page', 'CLONE', 'Phá', 'BLOCK'].includes(res!)) {
            newStatus = 'spam_data'
        } else if (res === 'Không tương tác') {
            newStatus = 'low_quality_mess'
        } else if (['Xa', 'Từ chối nghe'].includes(res!)) {
            newStatus = 'no_reach_mess'
        } else if (['Tương tác', 'Quan tâm'].includes(res!)) {
            newStatus = 'in_care'
        }

        const updatedLead: Lead = {
            ...currentLead,
            careLogs: logs,
            status: newStatus as any
        }

        // Lưu State trước
        saveState(saveLead(updatedLead))

        // Sync DB và nhận lại lead đã có phoneObtainedAt (nếu có)
        const synced = await syncLead(updatedLead)
        if (synced) {
            saveState(saveLead(synced))
            setActiveLead(synced)
        }

        setCareForm({ ...careForm, content: '' })
        showToast('Ghi nhật ký', 'Đã lưu phản hồi chăm sóc khách hàng')
    }

    async function handleBooking() {
        if (!activeLead) return
        if (!activeLead.phone) {
            await showAlert('Vui lòng bổ sung Số điện thoại trước khi đặt lịch')
            return
        }

        // 1. Tự động khớp Khách hàng qua SĐT (kiểm tra cả sdt 1 và sdt 2)
        const cleanPhone = activeLead.phone.replace(/\s+/g, '')
        let customerId = activeLead.customerId

        if (!customerId) {
            // Tìm trong danh sách khách hàng hiện có
            const existingCustomer = state.customers.find(c =>
                (c.phone && c.phone.replace(/\s+/g, '') === cleanPhone) ||
                (c.phone2 && c.phone2.replace(/\s+/g, '') === cleanPhone)
            )

            if (existingCustomer) {
                customerId = existingCustomer.id
                showToast('Thông tin', `Tự động khớp dữ liệu với khách hàng: ${existingCustomer.fullName}`)
            } else {
                // Tạo mới Customer nếu thực sự chưa có
                customerId = crypto.randomUUID()
                const newCustomer = {
                    id: customerId,
                    fullName: activeLead.name,
                    phone: cleanPhone,
                    rank: 0, points: 0, totalSpent: 0,
                    lastVisit: 'Chưa có',
                    branchId: activeLead.branchId || bookingForm.branchId,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                }
                saveState(saveCustomer(newCustomer as any))
                syncCustomer(newCustomer as any)
            }
        }

        // 2. Tạo Appointment
        const salePage = state.users.find(u => u.id === activeLead.salePageId)

        const apt: Appointment = {
            id: crypto.randomUUID(),
            customerId: customerId,
            branchId: bookingForm.branchId,
            staffId: currentUser?.id,
            saleTeleId: currentUser?.id,
            saleTeleName: currentUser?.displayName || 'System',
            salePageId: activeLead.salePageId,
            salePageName: salePage?.displayName || 'N/A',
            leadId: activeLead.id,
            appointmentDate: bookingForm.date,
            appointmentTime: bookingForm.time,
            status: 'pending',
            bookingSource: 'lead',
            notes: bookingForm.notes,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }

        saveState(saveAppointment(apt))
        syncAppointment(apt)

        showToast('Thành công', 'Đã tạo lịch hẹn và cập nhật trạng thái Lead')
        setShowBookingModal(false)
    }

    async function handleSaveInline() {
        if (!activeLead) return
        if (!activeLead.name) {
            await showAlert('Họ tên không được để trống')
            return
        }

        // V21.8: Log changes to careLogs
        const original = state.leads.find(l => l.id === activeLead.id)
        if (original) {
            const changes: string[] = []
            if (original.name !== activeLead.name) changes.push(`Tên: ${original.name} → ${activeLead.name}`)
            if (original.phone !== activeLead.phone) changes.push(`SĐT: ${original.phone || '(Trống)'} → ${activeLead.phone || '(Trống)'}`)
            if (original.branchId !== activeLead.branchId) {
                const b1 = state.branches.find(b => b.id.toString() === original.branchId?.toString())?.name || 'N/A'
                const b2 = state.branches.find(b => b.id.toString() === activeLead.branchId?.toString())?.name || 'N/A'
                changes.push(`Chi nhánh: ${b1} → ${b2}`)
            }
            if (original.source !== activeLead.source) changes.push(`Nguồn: ${original.source} → ${activeLead.source}`)
            if (original.notes !== activeLead.notes) changes.push(`Ghi chú: ${original.notes || '(Trống)'} → ${activeLead.notes || '(Trống)'}`)

            if (changes.length > 0) {
                const log: LeadCareLog = {
                    id: crypto.randomUUID(),
                    userId: currentUser?.id || 'unknown',
                    userName: currentUser?.displayName || 'Nhân viên',
                    type: 'call',
                    result: 'Cập nhật thông tin',
                    content: `Nhân viên đã chỉnh sửa: ${changes.join(', ')}`,
                    createdAt: new Date().toISOString()
                }
                activeLead.careLogs = [log, ...(activeLead.careLogs || [])]
            }
        }

        saveState(saveLead(activeLead))
        syncLead(activeLead)
        showToast('Thành công', 'Đã cập nhật thông tin Lead')
        setIsEditingInfo(false)
    }

    function handleCancelInline() {
        if (!activeLead) return
        const original = state.leads.find(l => l.id === activeLead.id)
        if (original) {
            setActiveLead(original)
        }
        setIsEditingInfo(false)
    }

    return (
        <div className="min-h-screen bg-[#FAF8F6]">
            <PageHeader
                icon={Zap}
                title="Quản lý Leads"
                subtitle="Hiệu suất & Chuyển đổi"
                description="CRM Module • Tối ưu quy trình chăm sóc khách hàng"
                actions={
                    <button onClick={openNew} className="bg-text-main text-white px-10 py-4 rounded-[20px] font-black text-[11px] uppercase tracking-[0.2em] shadow-luxury hover:bg-gold-muted hover:shadow-gold-muted/20 transition-all duration-300 flex items-center gap-3 active:scale-95 group">
                        <Plus size={18} strokeWidth={2.5} className="group-hover:rotate-90 transition-transform duration-500" /> Thêm Lead mới
                    </button>
                }
            />

            <div className="max-w-[1600px] mx-auto px-10 py-12 space-y-12">
                {/* Stats Bar */}
                <LeadStats stats={stats} />

                <LeadFilters
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    filterStatus={filterStatus}
                    setFilterStatus={setFilterStatus}
                    filterSource={filterSource}
                    setFilterSource={setFilterSource}
                    branchFilter={branchFilter}
                    setBranchFilter={setBranchFilter}
                    canViewAll={canViewAll}
                    statusChips={STATUS_CHIPS}
                    sources={SOURCES}
                    branches={state.branches}
                />

                <LeadTable
                    filteredLeads={filteredLeads}
                    state={state}
                    getRowColor={getRowColor}
                    getEffectiveStatus={getEffectiveStatus}
                    openCare={openCare}
                    statusChips={STATUS_CHIPS}
                />
            </div>

            <LeadModals
                showCareModal={showCareModal}
                setShowCareModal={setShowCareModal}
                activeLead={activeLead}
                setActiveLead={setActiveLead}
                isEditingInfo={isEditingInfo}
                setIsEditingInfo={setIsEditingInfo}
                careForm={careForm}
                setCareForm={setCareForm}
                handleAddCareLog={handleAddCareLog}
                handleSaveInline={handleSaveInline}
                handleCancelInline={handleCancelInline}
                openBooking={openBooking}
                careResults={CARE_RESULTS}
                showForm={showForm}
                setShowForm={setShowForm}
                form={form}
                setForm={setForm}
                handleSave={handleSave}
                sources={SOURCES}
                statusChips={STATUS_CHIPS}
                branches={state.branches}
                showBookingModal={showBookingModal}
                setShowBookingModal={setShowBookingModal}
                bookingForm={bookingForm}
                setBookingForm={setBookingForm}
                handleBooking={handleBooking}
            />

            <style jsx global>{`
                @keyframes modal-up { from { opacity: 0; transform: translateY(20px) scale(0.95); } to { opacity: 1; transform: translateY(0) scale(1); } }
                .animate-modal-up { animation: modal-up 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
                .custom-scrollbar::-webkit-scrollbar { width: 5px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
            `}</style>
        </div>
    )
}
