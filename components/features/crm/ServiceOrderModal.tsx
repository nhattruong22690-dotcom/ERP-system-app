'use client'

import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { useApp, canViewAllBranches } from '@/lib/auth'
import { ServiceOrder, ServiceLineItem, StaffSplit, Customer, Appointment, CustomerRank, AppState, ServicePayment } from '@/lib/types'
import { saveServiceOrder, syncServiceOrder, syncCustomer, saveCustomer, syncAppointment } from '@/lib/storage'
import { recalculateCustomerStats } from '@/lib/utils/calculations'
import { useModal } from '@/components/layout/ModalProvider'
import { useToast } from '@/components/layout/ToastProvider'
import { searchCustomers } from '@/lib/supabase/supabaseFetch'
import { X, Plus, Receipt, Trash2, Edit2, Search, Loader2, Wrench, Package, CreditCard, MessageSquare, PlusSquare, Calendar, Users, ChevronDown, Eye, PlusCircle, User, Check } from 'lucide-react'
import { useRouter } from 'next/navigation'
import CustomerProfileModal from '@/components/features/crm/CustomerProfileModal'
import { generateId } from '@/lib/utils/id'

const SERVICE_TYPES = [
    { value: 'single', label: 'Dịch vụ lẻ', icon: Wrench, color: 'bg-blue-50 text-blue-600 border-blue-100' },
    { value: 'package', label: 'Gói liệu trình', icon: Package, color: 'bg-amber-50 text-amber-600 border-amber-100' },
    { value: 'card', label: 'Thẻ thành viên', icon: CreditCard, color: 'bg-purple-50 text-purple-600 border-purple-100' },
] as const

const PACKAGE_TYPES = [
    { value: 'sessions', label: 'Số buổi' },
    { value: 'duration', label: 'Hạn sử dụng' },
    { value: 'warranty', label: 'Bảo hành' },
] as const

const STATUS_MAP: Record<string, { label: string; bg: string; text: string }> = {
    draft: { label: 'Nháp', bg: 'bg-gray-100', text: 'text-gray-500' },
    confirmed: { label: 'Xác nhận', bg: 'bg-blue-50', text: 'text-blue-600' },
    completed: { label: 'Hoàn thành', bg: 'bg-emerald-50', text: 'text-emerald-600' },
    cancelled: { label: 'Hủy', bg: 'bg-red-50', text: 'text-red-600' },
}

const CUSTOMER_TYPE_LABELS: Record<string, { label: string; bg: string }> = {
    new: { label: 'MỚI', bg: 'bg-emerald-100 text-emerald-700' },
    old: { label: 'CŨ', bg: 'bg-gray-100 text-gray-600' },
    tvt: { label: 'TVT', bg: 'bg-blue-100 text-blue-600' },
}

function formatCurrency(val: number | string): string {
    const num = typeof val === 'string' ? parseInt(val.replace(/[^\d]/g, '')) || 0 : val
    return num.toLocaleString('vi-VN')
}

function parseCurrency(val: string): number {
    return parseInt(val.replace(/[^\d]/g, '')) || 0
}

function generateCode(existingOrders: ServiceOrder[]): string {
    const now = new Date()
    const yy = String(now.getFullYear()).slice(2)
    const mm = String(now.getMonth() + 1).padStart(2, '0')
    const dd = String(now.getDate()).padStart(2, '0')
    const prefix = `SO-${yy}${mm}${dd}`
    const todayCount = existingOrders.filter(o => o.code.startsWith(prefix)).length
    return `${prefix}-${String(todayCount + 1).padStart(3, '0')}`
}

function createEmptyLineItem(index: number, isNewCustomer: boolean): ServiceLineItem {
    return {
        id: generateId(),
        customerType: index === 0 ? (isNewCustomer ? 'new' : 'old') : 'tvt',
        serviceName: '',
        serviceType: 'single',
        description: '',
        price: 0,
        note: '',
        payments: [],
        staffSplits: [],
    }
}

interface ServiceOrderModalProps {
    isOpen: boolean
    onClose: () => void
    editingOrder?: ServiceOrder | null
    initialBranchId?: string
    initialCustomerId?: string
    initialAppointmentId?: string
}

export default function ServiceOrderModal({
    isOpen,
    onClose,
    editingOrder = null,
    initialBranchId = '',
    initialCustomerId = '',
    initialAppointmentId = ''
}: ServiceOrderModalProps) {
    const { state, saveState, currentUser } = useApp()
    const { showAlert, showConfirm } = useModal()
    const { showToast } = useToast()
    const router = useRouter()

    const canViewAll = canViewAllBranches(currentUser)

    // Customer Profile state
    const [showProfileCustomer, setShowProfileCustomer] = useState(false)
    const [selectedCustomerForProfile, setSelectedCustomerForProfile] = useState<Customer | null>(null)

    // Form state
    const [formCustomerId, setFormCustomerId] = useState('')
    const [formBranchId, setFormBranchId] = useState('')
    const [formAppointmentId, setFormAppointmentId] = useState('')
    const [formLineItems, setFormLineItems] = useState<ServiceLineItem[]>([])
    const [formStatus, setFormStatus] = useState<ServiceOrder['status']>('draft')
    const [formActualAmount, setFormActualAmount] = useState<number>(0)
    const [formPayments, setFormPayments] = useState<ServicePayment[]>([])
    const [initialFormStateRef] = useState<{ snapshot: string }>({ snapshot: '' })
    const [editingNoteIdx, setEditingNoteIdx] = useState<number | null>(null)
    const [showSummaryPopup, setShowSummaryPopup] = useState(false)

    // Search dropdowns
    const [customerSearch, setCustomerSearch] = useState('')
    const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
    const [staffSearchIndex, setStaffSearchIndex] = useState<number | null>(null)
    const [staffSearchText, setStaffSearchText] = useState('')
    const [serviceSearchIndex, setServiceSearchIndex] = useState<number | null>(null)
    const [serviceSearchText, setServiceSearchText] = useState('')
    const [selectedCustomerData, setSelectedCustomerData] = useState<Customer | null>(null)
    const [customerSuggestions, setCustomerSuggestions] = useState<Customer[]>([])
    const [isSearchingCustomers, setIsSearchingCustomers] = useState(false)
    const [hasInitialized, setHasInitialized] = useState(false)

    const orders = state.serviceOrders || []
    const customers = state.customers || []
    const appointments = state.appointments || []
    const services = state.services || []
    const serviceCategories = state.serviceCategories || []
    const users = state.users || []
    const branches = state.branches || []

    const spaBranches = useMemo(() => branches.filter(b => b.type === 'spa'), [branches])

    const isCustomerNewAtBranch = useCallback((customerId: string, branchId: string) => {
        return !orders.some(o => o.customerId === customerId && o.branchId === branchId && o.status !== 'cancelled')
    }, [orders])

    // Initialize/Reset form
    useEffect(() => {
        if (isOpen && !hasInitialized) {
            if (editingOrder) {
                setFormCustomerId(editingOrder.customerId)
                setFormBranchId(editingOrder.branchId)
                setFormAppointmentId(editingOrder.appointmentId || '')
                setFormLineItems([...editingOrder.lineItems])
                setFormStatus(editingOrder.status)
                setFormActualAmount(editingOrder.actualAmount || 0)

                // If existing order has global payments but no per-item payments, 
                // we might want to stay compatible or map them if possible.
                // For now, let's trust lineItems.payments if they exist.
                const allItemPayments = editingOrder.lineItems.flatMap(li => li.payments || [])
                setFormPayments(allItemPayments.length > 0 ? allItemPayments : (editingOrder.payments || []))

                let cust = customers.find(c => c.id === editingOrder.customerId)
                if (!cust && editingOrder.customerName) {
                    cust = {
                        id: editingOrder.customerId,
                        fullName: editingOrder.customerName,
                        phone: editingOrder.customerPhone || 'N/A',
                        avatar: editingOrder.customerAvatar,
                        rank: CustomerRank.MEMBER,
                        points: 0,
                        totalSpent: 0,
                        lastVisit: 'Chưa có',
                        branchId: editingOrder.branchId,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    } as Customer
                }

                if (cust) {
                    setCustomerSearch(`${cust.fullName} - ${cust.phone}`)
                    setSelectedCustomerData(cust)
                }
            } else {
                setFormCustomerId(initialCustomerId)
                setFormAppointmentId(initialAppointmentId)

                let cust = customers.find(c => c.id === initialCustomerId)

                // If not found in customers list (likely because customers aren't all pre-loaded)
                // try to find in appointments if initialAppointmentId is provided
                if (!cust && (initialAppointmentId || initialCustomerId)) {
                    const apt = appointments.find(a => a.id === initialAppointmentId || (a.customerId === initialCustomerId))
                    if (apt && (apt.customerId === initialCustomerId || !initialCustomerId)) {
                        cust = {
                            id: apt.customerId,
                            fullName: apt.customerName || 'Khách vãng lai',
                            phone: apt.customerPhone || 'N/A',
                            avatar: apt.customerAvatar,
                            rank: apt.customerRank || CustomerRank.MEMBER,
                            points: 0,
                            totalSpent: 0,
                            lastVisit: 'Chưa có',
                            branchId: apt.branchId,
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString()
                        } as Customer
                    }
                }

                const targetBranch = initialBranchId || cust?.branchId || currentUser?.branchId || ''
                setFormBranchId(targetBranch)

                const isNew = initialCustomerId ? isCustomerNewAtBranch(initialCustomerId, targetBranch) : true
                const emptyItem = createEmptyLineItem(0, isNew)

                // Pre-fill from appointment if available
                if (initialAppointmentId) {
                    const apt = appointments.find(a => a.id === initialAppointmentId)
                    if (apt) {
                        emptyItem.serviceName = apt.notes || ''
                        emptyItem.price = apt.price || 0
                    }
                }

                setFormLineItems([emptyItem])
                setFormStatus('draft')

                if (cust) {
                    setCustomerSearch(`${cust.fullName} - ${cust.phone}`)
                    setSelectedCustomerData(cust)
                    if (!initialCustomerId) setFormCustomerId(cust.id)
                }
                setFormActualAmount(0)
                setFormPayments([])
            }
            setHasInitialized(true)
        }

        // Capture initial state AFTER first render initialization
        if (isOpen && hasInitialized && !initialFormStateRef.snapshot) {
            const stateToCapture = {
                customerId: formCustomerId,
                branchId: formBranchId,
                appointmentId: formAppointmentId,
                lineItems: formLineItems,
                status: formStatus,
                actualAmount: formActualAmount,
                payments: formPayments
            }
            initialFormStateRef.snapshot = JSON.stringify(stateToCapture)
        }

        if (!isOpen && hasInitialized) {
            setHasInitialized(false)
            setFormCustomerId('')
            setFormBranchId('')
            setFormAppointmentId('')
            setFormLineItems([])
            setFormActualAmount(0)
            setFormPayments([])
            initialFormStateRef.snapshot = ''
            setCustomerSearch('')
            setSelectedCustomerData(null)
            setCustomerSuggestions([])
        }
    }, [isOpen, editingOrder, initialCustomerId, initialBranchId, initialAppointmentId, currentUser, customers, isCustomerNewAtBranch, hasInitialized, formCustomerId, formBranchId, formAppointmentId, formLineItems, formStatus, formActualAmount, formPayments, initialFormStateRef])

    // Server-side customer search
    useEffect(() => {
        if (!isOpen) return;

        const term = customerSearch.trim();
        // If term is short and not initial values, don't search
        if (term.length < 2) {
            if (term.length === 0) setCustomerSuggestions([]);
            return;
        }

        // Fix: If the current search term exactly matches the selected customer's name/phone,
        // don't show the suggestion list again.
        if (formCustomerId && (customerSearch.includes(' - ') || customerSearch.length > 5)) {
            // We can check if selectedCustomer matches
            const sel = selectedCustomer;
            if (sel && (sel.fullName === customerSearch || `${sel.fullName} - ${sel.phone}` === customerSearch)) {
                setCustomerSuggestions([]);
                return;
            }
        }

        const delayDebounceFn = setTimeout(async () => {
            setIsSearchingCustomers(true);
            try {
                const results = await searchCustomers(term, currentUser?.branchId, canViewAll);
                setCustomerSuggestions(results);
            } finally {
                setIsSearchingCustomers(false);
            }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [customerSearch, isOpen]);

    const selectedCustomer = useMemo(() => {
        return selectedCustomerData ||
            customerSuggestions?.find(c => c.id == formCustomerId) ||
            customers?.find(c => c.id == formCustomerId) ||
            customers?.find(c => formCustomerId && c.id?.toString() === formCustomerId?.toString()) ||
            null
    }, [formCustomerId, customerSuggestions, customers, selectedCustomerData])

    const customerAppointments = useMemo(() => {
        if (!formCustomerId) return []
        return appointments.filter(a => a.customerId === formCustomerId)
            .sort((a, b) => b.appointmentDate.localeCompare(a.appointmentDate))
    }, [formCustomerId, appointments])

    const staffSuggestions = useMemo(() => {
        if (!staffSearchText.trim()) return users.filter(u => u.isActive !== false).slice(0, 8)
        const t = staffSearchText.toLowerCase()
        return users.filter(u => u.isActive !== false && u.displayName.toLowerCase().includes(t)).slice(0, 8)
    }, [staffSearchText, users])

    const serviceSuggestions = useMemo(() => {
        if (!serviceSearchText.trim()) return services.filter(s => s.isActive).slice(0, 10)
        const t = serviceSearchText.toLowerCase()
        return services.filter(s => s.isActive && (s.name.toLowerCase().includes(t) || s.category.toLowerCase().includes(t))).slice(0, 10)
    }, [serviceSearchText, services])

    const isFormChanged = useCallback(() => {
        const currentData = {
            customerId: formCustomerId,
            branchId: formBranchId,
            appointmentId: formAppointmentId,
            lineItems: formLineItems,
            status: formStatus,
            actualAmount: formActualAmount,
            payments: formPayments
        }
        const currentStateJson = JSON.stringify(currentData)
        return initialFormStateRef.snapshot !== '' && currentStateJson !== initialFormStateRef.snapshot
    }, [formCustomerId, formBranchId, formAppointmentId, formLineItems, formStatus, formActualAmount, initialFormStateRef])

    const handleCloseInternal = useCallback(async () => {
        if (isFormChanged()) {
            const confirmed = await showConfirm('Cảnh báo!', 'Dữ liệu chưa được lưu, bạn có chắc chắn muốn đóng?')
            if (!confirmed) return
        }
        onClose()
    }, [isFormChanged, showConfirm, onClose])

    function addLineItem() {
        const branchId = formBranchId || currentUser?.branchId || branches[0]?.id || ''
        const isNew = formCustomerId ? isCustomerNewAtBranch(formCustomerId, branchId) : true
        setFormLineItems(prev => [...prev, createEmptyLineItem(prev.length, isNew)])
    }

    function removeLineItem(index: number) {
        setFormLineItems(prev => {
            const next = prev.filter((_, i) => i !== index)
            return next.map((item, i) => ({
                ...item,
                customerType: i === 0 ? item.customerType : 'tvt' as const
            }))
        })
    }

    function updateLineItem(index: number, updates: Partial<ServiceLineItem>) {
        setFormLineItems(prev => prev.map((item, i) => i === index ? { ...item, ...updates } : item))
    }

    function addStaffSplit(lineIndex: number) {
        setFormLineItems(prev => prev.map((item, i) => {
            if (i !== lineIndex) return item
            return {
                ...item,
                staffSplits: [...item.staffSplits, {
                    staffId: '',
                    staffName: '',
                    amount: 0,
                    type: 'fixed',
                    rate: 0
                }]
            }
        }))
    }

    function removeStaffSplit(lineIndex: number, splitIndex: number) {
        setFormLineItems(prev => prev.map((item, i) => {
            if (i !== lineIndex) return item
            return { ...item, staffSplits: item.staffSplits.filter((_, si) => si !== splitIndex) }
        }))
    }

    function updateStaffSplit(lineIndex: number, splitIndex: number, updates: Partial<StaffSplit>) {
        setFormLineItems(prev => prev.map((item, i) => {
            if (i !== lineIndex) return item
            const newSplits = item.staffSplits.map((sp, si) => {
                if (si !== splitIndex) return sp
                const updated = { ...sp, ...updates }

                // Auto calculate amount/rate
                if (updated.type === 'percentage' && (updates.rate !== undefined || updates.type !== undefined)) {
                    updated.amount = Math.round(item.price * (updated.rate || 0) / 100)
                } else if (updated.type === 'fixed' && updates.amount !== undefined) {
                    updated.rate = item.price > 0 ? (updated.amount / item.price) * 100 : 0
                }

                return updated
            })
            return {
                ...item,
                staffSplits: newSplits
            }
        }))
    }

    const hasCardService = useMemo(() => {
        return formLineItems.some(li => li.serviceType === 'card');
    }, [formLineItems]);


    const removePayment = (paymentId: string) => {
        setFormPayments(prev => {
            const newPayments = prev.filter(p => p.id !== paymentId);
            const newActual = newPayments.reduce((s, p) => s + (p.amount || 0), 0);
            setFormActualAmount(newActual);
            return newPayments;
        })

        // Also remove from line items
        setFormLineItems(prev => prev.map(item => ({
            ...item,
            payments: (item.payments || []).filter(p => p.id !== paymentId)
        })))
    }

    const addItemPayment = (lineIdx: number) => {
        const item = formLineItems[lineIdx]
        const remaining = item.price - (item.payments || []).reduce((s, p) => s + p.amount, 0)

        const newPayment: ServicePayment = {
            id: generateId(),
            method: 'cash',
            amount: Math.max(0, remaining),
            date: new Date().toISOString(),
            lineItemId: item.id
        }

        setFormLineItems(prev => prev.map((li, i) => i === lineIdx ? {
            ...li,
            payments: [...(li.payments || []), newPayment]
        } : li))

        setFormPayments(prev => [...prev, newPayment])
        setFormActualAmount(prev => prev + newPayment.amount)
    }

    const updateItemPayment = (lineIdx: number, paymentId: string, updates: Partial<ServicePayment>) => {
        setFormLineItems(prev => prev.map((li, i) => {
            if (i !== lineIdx) return li
            const newPayments = (li.payments || []).map(p => p.id === paymentId ? { ...p, ...updates } : p)
            return { ...li, payments: newPayments }
        }))

        setFormPayments(prev => {
            const newPayments = prev.map(p => p.id === paymentId ? { ...p, ...updates } : p);
            setFormActualAmount(newPayments.reduce((s, p) => s + (p.amount || 0), 0));
            return newPayments;
        })
    }


    async function handleSave() {
        if (!formBranchId) { await showAlert('Vui lòng chọn chi nhánh'); return }
        if (!formCustomerId) { await showAlert('Vui lòng chọn khách hàng'); return }
        if (formLineItems.length === 0) { await showAlert('Vui lòng thêm dịch vụ'); return }
        if (formLineItems.some(li => !li.serviceName.trim())) { await showAlert('Vui lòng điền tên dịch vụ'); return }

        for (const li of formLineItems) {
            const totalSplit = li.staffSplits.reduce((s, sp) => s + sp.amount, 0)
            if (totalSplit > li.price) {
                await showAlert(`Hoa hồng (${formatCurrency(totalSplit)}đ) vượt giá dịch vụ "${li.serviceName}"`)
                return
            }
        }

        const totalAmount = formLineItems.reduce((s, li) => s + li.price, 0)
        const allPayments = formLineItems.flatMap(li => li.payments || [])
        const totalPaid = allPayments.reduce((s, p) => s + (p.amount || 0), 0)

        const order: ServiceOrder = {
            id: editingOrder?.id || generateId(),
            code: editingOrder?.code || generateCode(orders),
            customerId: formCustomerId,
            branchId: formBranchId,
            appointmentId: formAppointmentId || undefined,
            lineItems: formLineItems,
            totalAmount,
            actualAmount: totalPaid,
            debtAmount: totalAmount - totalPaid,
            payments: allPayments,
            status: formStatus,
            customerName: selectedCustomerData?.fullName,
            customerPhone: selectedCustomerData?.phone,
            customerAvatar: selectedCustomerData?.avatar,
            createdBy: currentUser?.id || '',
            createdAt: editingOrder?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        }

        const isNewOrder = !editingOrder
        const log = {
            id: generateId(),
            userId: currentUser?.id || 'system',
            userDisplayName: currentUser?.displayName || 'Hệ thống',
            action: isNewOrder ? 'service_order_created' : 'service_order_updated',
            details: `${isNewOrder ? 'Tạo mới' : 'Cập nhật'} phiếu dịch vụ ${order.code} - Tổng tiền: ${formatCurrency(totalAmount)}đ`,
            createdAt: new Date().toISOString()
        }

        saveState(saveServiceOrder(order))

        if (order.appointmentId) {
            saveState(s => ({
                ...s,
                appointments: (s.appointments || []).map(a =>
                    a.id === order.appointmentId
                        ? { ...a, price: totalAmount, logs: [log, ...(a.logs || [])] }
                        : a
                )
            }))
        }

        try {
            await syncServiceOrder(order)

            // If linked to appointment, sync appointment as well
            if (order.appointmentId) {
                const updatedApt = (await import('@/lib/storage')).getState().appointments.find(a => a.id === order.appointmentId)
                if (updatedApt) {
                    await syncAppointment(updatedApt)
                }
            }

            // Re-calculate customer stats if order is completed or confirmed
            if (order.status === 'completed' || order.status === 'confirmed') {
                // Targeted sync instead of loading all customers
                const { syncRecalculateCustomerStats } = await import('@/lib/storage')
                await syncRecalculateCustomerStats(order.customerId)
            }

            showToast('Thành công', `Đã lưu phiếu: ${order.code}`)
        } catch (error) {
            console.error('Save error:', error)
            showToast('Thành công', 'Đã lưu offline')
        }
        onClose()
    }

    if (!isOpen) return null

    return (
        <>
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-md animate-fade-in" onClick={e => e.target === e.currentTarget && handleCloseInternal()}>
                <div className="bg-white w-full max-w-7xl max-h-[95vh] sm:max-h-[90vh] rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-scale-up border border-white/20">
                    {/* Modal Header */}
                    <div className="px-5 py-4 sm:px-8 sm:py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 shrink-0">
                        <div className="min-w-0">
                            <h2 className="text-base sm:text-xl font-black text-gray-900 uppercase tracking-tight truncate">{editingOrder ? 'Sửa phiếu dịch vụ' : 'Tạo phiếu dịch vụ'}</h2>
                            <p className="text-[9px] sm:text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5 sm:mt-1 opacity-60">{editingOrder?.code || 'Phiếu mới'}</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setShowSummaryPopup(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl hover:bg-emerald-100 transition-all group/sum shadow-sm"
                            >
                                <div className="flex flex-col items-end leading-none">
                                    <span className="text-[8px] font-black uppercase opacity-60">Tổng thanh toán</span>
                                    <span className="text-xs font-black">{formatCurrency(formActualAmount)}đ</span>
                                </div>
                                <Receipt size={18} className="group-hover/sum:rotate-12 transition-transform" />
                            </button>
                            <button onClick={handleCloseInternal} className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-white border border-gray-100 text-gray-400 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition-all group shrink-0">
                                <X size={18} className="group-hover:rotate-90 transition-transform sm:w-5 sm:h-5" />
                            </button>
                        </div>
                    </div>

                    {/* ====== MAIN CONTENT: 2-COLUMN LAYOUT ====== */}
                    <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                        {/* Left Column: Customer Info & Services */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar border-r border-gray-100 bg-white">
                            {/* STICKY HEADER AREA */}
                            <div className="sticky top-0 z-[40] bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm overflow-visible">
                                <div className="p-5 sm:p-8 space-y-8">
                                    {/* Customer & Appointment Info Grid */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-4">
                                            <div className="relative">
                                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Khách hàng *</label>
                                                <div className="relative">
                                                    <input
                                                        className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold text-sm outline-none focus:ring-4 focus:ring-primary/10 transition-all pr-12"
                                                        placeholder="Tìm tên hoặc số điện thoại..."
                                                        value={customerSearch}
                                                        onChange={e => { setCustomerSearch(e.target.value); setShowCustomerDropdown(true) }}
                                                        onFocus={() => setShowCustomerDropdown(true)}
                                                    />
                                                    {isSearchingCustomers && (
                                                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                                            <Loader2 className="animate-spin text-primary/40" size={18} />
                                                        </div>
                                                    )}
                                                </div>
                                                {selectedCustomerData && (
                                                    <div className="mt-2 p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-[11px] font-bold text-emerald-700 flex items-center justify-between gap-3">
                                                        <div className="flex items-center gap-3">
                                                            <span>{selectedCustomerData.fullName} — {selectedCustomerData.phone}</span>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setSelectedCustomerForProfile(selectedCustomerData);
                                                                    setShowProfileCustomer(true);
                                                                }}
                                                                className="w-7 h-7 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 hover:scale-110 shadow-md shadow-emerald-200/50 active:scale-95 transition-all flex items-center justify-center border border-emerald-500"
                                                                title="Xem hồ sơ"
                                                            >
                                                                <User size={13} strokeWidth={2.5} />
                                                            </button>
                                                        </div>
                                                        <button onClick={() => { setFormCustomerId(''); setSelectedCustomerData(null); setCustomerSearch('') }} className="text-emerald-400 hover:text-red-500"><X size={14} /></button>
                                                    </div>
                                                )}
                                                {showCustomerDropdown && customerSuggestions.length > 0 && !selectedCustomerData && (
                                                    <div className="absolute z-20 top-full mt-2 w-full bg-white rounded-2xl shadow-2xl border border-gray-100 max-h-60 overflow-y-auto p-2">
                                                        {customerSuggestions.map(c => (
                                                            <div key={c.id} className="w-full px-4 py-3 hover:bg-gray-50 rounded-xl transition-colors flex items-center gap-4 cursor-pointer group/cust"
                                                                onClick={() => {
                                                                    setFormCustomerId(c.id);
                                                                    setSelectedCustomerData(c);
                                                                    setCustomerSearch(`${c.fullName} - ${c.phone}`);
                                                                    setShowCustomerDropdown(false);
                                                                    if (!formAppointmentId && c.branchId) setFormBranchId(c.branchId)
                                                                }}>
                                                                <div className="relative">
                                                                    <img src={c.avatar || `https://ui-avatars.com/api/?name=${c.fullName}&background=random`} className="w-10 h-10 rounded-xl object-cover" alt="" />
                                                                    {c.rank === CustomerRank.PLATINUM && <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-lg flex items-center justify-center text-[8px] text-white">⭐</span>}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-sm font-black text-gray-900 truncate">{c.fullName} - {c.phone}</p>
                                                                    <p className="text-xs text-gray-400 font-bold truncate">
                                                                        {branches.find(b => b.id === c.branchId)?.name || 'Chưa gán'} - Hạng: {c.rank || 'Tiêu chuẩn'}
                                                                    </p>
                                                                </div>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation()
                                                                        setSelectedCustomerForProfile(c)
                                                                        setShowProfileCustomer(true)
                                                                    }}
                                                                    className="w-8 h-8 rounded-xl flex items-center justify-center transition-all bg-emerald-600 text-white hover:bg-emerald-700 hover:scale-110 shadow-lg shadow-emerald-200/50 active:scale-95 border border-emerald-500 shrink-0"
                                                                    title="Xem hồ sơ"
                                                                >
                                                                    <User size={14} strokeWidth={2.5} />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Liên kết lịch hẹn</label>
                                                <select className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold text-sm outline-none"
                                                    value={formAppointmentId} onChange={e => {
                                                        const aid = e.target.value; setFormAppointmentId(aid);
                                                        if (aid) { const a = appointments.find(x => x.id === aid); if (a?.branchId) setFormBranchId(a.branchId) }
                                                    }}>
                                                    <option value="">— Không liên kết —</option>
                                                    {customerAppointments.map(a => {
                                                        const branch = branches.find(b => b.id === a.branchId)
                                                        const code = `LH-${a.appointmentDate.replace(/-/g, '').slice(2)}-${a.appointmentTime?.replace(':', '') || '0000'}`
                                                        return <option key={a.id} value={a.id}>{code} | {a.appointmentDate} {a.appointmentTime || ''} | {branch?.name || ''}</option>
                                                    })}
                                                </select>
                                            </div>
                                        </div>

                                        <div className="space-y-6">
                                            <div>
                                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Chi nhánh *</label>
                                                <select className={`w-full px-5 py-4 border rounded-2xl font-bold text-sm outline-none transition-all ${!formBranchId ? 'bg-red-50 border-red-200 text-red-500' : 'bg-gray-50 border-gray-100'}`}
                                                    value={formBranchId} onChange={e => setFormBranchId(e.target.value)}>
                                                    <option value="">— Chọn chi nhánh —</option>
                                                    {spaBranches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Trạng thái phiếu</label>
                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-gray-50 p-1.5 rounded-2xl border border-gray-100">
                                                    {Object.entries(STATUS_MAP).map(([k, v]) => (
                                                        <button key={k} onClick={() => setFormStatus(k as any)}
                                                            className={`py-2 sm:py-3 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-tighter transition-all ${formStatus === k ? v.bg + ' ' + v.text + ' shadow-sm border' : 'text-gray-400 hover:text-gray-600'}`}>
                                                            {v.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Header - Sticky as part of the header area */}
                                    <div className="flex items-center justify-between pt-2">
                                        <h3 className="text-sm font-black text-gray-700 uppercase tracking-widest flex items-center gap-2">
                                            <Receipt size={16} /> Danh sách dịch vụ
                                        </h3>
                                        <button onClick={addLineItem} className="flex items-center gap-1.5 px-4 py-2 bg-primary/10 text-primary border border-primary/20 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary/20 transition-all shadow-sm">
                                            <Plus size={14} /> Thêm dịch vụ
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* SCROLLABLE SERVICE ITEMS LIST */}
                            <div className="p-5 sm:p-8 pt-0 sm:pt-0 space-y-8 mt-5">
                                {formLineItems.map((li, idx) => (
                                    <div key={li.id} className="p-5 sm:p-7 bg-white border border-gray-100 rounded-[2rem] space-y-6 relative group shadow-sm hover:shadow-md transition-shadow border-l-[6px] border-l-primary/20">
                                        {/* ROW 1: Name, Service Select, Price, Note Trigger */}
                                        <div className="flex gap-6 items-start">
                                            <div className="flex flex-col gap-2 shrink-0">
                                                <span className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-[12px] font-black text-primary border border-primary/20 shadow-inner">{idx + 1}</span>
                                                <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest text-center ${CUSTOMER_TYPE_LABELS[li.customerType]?.bg || 'bg-gray-100'}`}>
                                                    {CUSTOMER_TYPE_LABELS[li.customerType]?.label || 'TVT'}
                                                </span>
                                            </div>

                                            <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6">
                                                <div className="lg:col-span-2 relative">
                                                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">Tên & Mô tả dịch vụ (Tự do) *</label>
                                                    <div className="flex gap-2">
                                                        <input className="flex-1 px-4 py-3 bg-gray-50/50 border border-gray-100 rounded-xl font-bold text-sm outline-none focus:ring-4 focus:ring-primary/5 transition-all"
                                                            placeholder="Nhập mô tả dịch vụ..."
                                                            value={li.serviceName}
                                                            onChange={e => updateLineItem(idx, { serviceName: e.target.value })}
                                                        />
                                                        <button onClick={() => setEditingNoteIdx(idx)} className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all shrink-0 ${li.note ? 'bg-amber-100 text-amber-600' : 'bg-white border border-gray-100 text-gray-300 hover:text-gray-500'}`}>
                                                            <MessageSquare size={18} />
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="relative">
                                                    <label className="block text-[10px] font-black text-gray-400 uppercase mb-2">Dịch vụ bảng giá *</label>
                                                    <div className="relative">
                                                        <input className={`w-full px-4 py-3 bg-gray-50/50 border rounded-xl font-bold text-sm outline-none focus:ring-4 focus:ring-primary/5 transition-all ${li.serviceId ? 'border-emerald-100' : 'border-gray-100'}`}
                                                            placeholder="Tìm dịch vụ..."
                                                            value={serviceSearchIndex === idx ? serviceSearchText : (services.find(s => s.id === li.serviceId)?.name || '')}
                                                            onChange={e => { setServiceSearchIndex(idx); setServiceSearchText(e.target.value); }}
                                                            onFocus={() => setServiceSearchIndex(idx)}
                                                            onBlur={() => setTimeout(() => setServiceSearchIndex(null), 250)}
                                                        />
                                                        {serviceSearchIndex === idx && (
                                                            <div className="absolute z-[100] top-full mt-2 w-full bg-white rounded-2xl shadow-2xl border border-gray-100 max-h-60 overflow-y-auto p-2">
                                                                {services.filter(s => s.isActive && (serviceSearchText === '' || s.name.toLowerCase().includes(serviceSearchText.toLowerCase()))).map(s => (
                                                                    <button key={s.id} className="w-full text-left px-3 py-3 hover:bg-gray-50 rounded-xl transition-colors mb-1 last:mb-0" onMouseDown={() => {
                                                                        const cat = serviceCategories.find(c => c.id === s.categoryId || c.name === s.category);
                                                                        updateLineItem(idx, {
                                                                            serviceId: s.id, price: s.price, serviceType: s.type || 'single', categoryId: cat?.id || s.categoryId, categoryName: cat?.name || s.category, serviceName: li.serviceName || s.name
                                                                        }); setServiceSearchIndex(null)
                                                                    }}>
                                                                        <p className="text-xs font-black text-gray-900">{s.name}</p>
                                                                        <p className="text-[9px] text-gray-400 font-bold uppercase mt-1">{s.category || 'Chưa phân loại'} • {formatCurrency(s.price)}đ</p>
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                    <div className="relative">
                                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Giá dịch vụ (VNĐ) *</label>
                                                        <input className="w-full px-4 py-3 bg-gray-50 text-emerald-600 border border-gray-100 rounded-xl font-black text-right text-lg outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all shadow-inner" 
                                                            value={formatCurrency(li.price)} onChange={e => updateLineItem(idx, { price: parseCurrency(e.target.value) })} />
                                                    </div>
                                            </div>

                                            <div className="flex flex-col gap-2 shrink-0">
                                                {formLineItems.length > 1 && (
                                                    <button onClick={() => removeLineItem(idx)} className="w-10 h-10 rounded-2xl bg-white border border-gray-100 text-gray-300 hover:text-red-500 hover:bg-red-50 hover:border-red-100 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                                                        <Trash2 size={18} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* ROW 2: Service Type & Configuration (Horizontal) */}
                                        <div className="flex flex-col lg:flex-row gap-8 items-start pt-2">
                                            <div className="w-full lg:w-72 shrink-0">
                                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Phân loại & Cấu hình</label>
                                                <div className="grid grid-cols-1 gap-2">
                                                    {SERVICE_TYPES.filter(st => {
                                                        const isCardCategory = li.categoryName?.toLowerCase().includes('thẻ') || li.serviceName?.toLowerCase().includes('thẻ')
                                                        if (isCardCategory) return st.value === 'card'
                                                        return st.value !== 'card'
                                                    }).map(st => (
                                                        <button key={st.value} onClick={() => updateLineItem(idx, { serviceType: st.value })}
                                                            className={`w-full px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-tight flex items-center gap-4 transition-all border ${li.serviceType === st.value ? 'bg-white text-gray-900 shadow-md border-gray-200' : 'bg-gray-50/50 text-gray-400 border-transparent hover:bg-gray-50'}`}>
                                                            <st.icon size={18} className={li.serviceType === st.value ? 'text-primary' : 'text-gray-300'} />
                                                            <span>{st.label}</span>
                                                            {li.serviceType === st.value && <div className="ml-auto w-2 h-2 rounded-full bg-primary animate-pulse" />}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="flex-1 w-full self-end">
                                                {/* Package Configuration - Horizontal */}
                                                {li.serviceType === 'package' && (
                                                    <div className="p-4 sm:p-5 bg-amber-50/50 border border-amber-100 rounded-3xl space-y-4 animate-slide-in-right">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <Package size={16} className="text-amber-500" />
                                                            <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Cấu hình gói liệu trình</span>
                                                        </div>
                                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                            <div className="space-y-2">
                                                                <label className="block text-[9px] font-black text-amber-400 uppercase">Số buổi học/làm</label>
                                                                <input className="w-full px-4 py-3 rounded-xl border border-amber-100 bg-white text-sm font-black text-amber-700 outline-none focus:ring-4 focus:ring-amber-500/10 transition-all"
                                                                    placeholder="Số buổi..." value={li.totalSessions || ''} onChange={e => updateLineItem(idx, { totalSessions: parseInt(e.target.value) || 0 })} />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <label className="block text-[9px] font-black text-amber-400 uppercase">Hạn dùng (Ngày)</label>
                                                                <div className="relative">
                                                                    <input type="date" className="w-full pl-10 pr-4 py-3 rounded-xl border border-amber-100 bg-white text-sm font-black text-amber-700 outline-none focus:ring-4 focus:ring-amber-500/10 transition-all"
                                                                        value={li.expiryDate ? li.expiryDate.split('T')[0] : ''} onChange={e => updateLineItem(idx, { expiryDate: e.target.value ? new Date(e.target.value).toISOString() : '' })} />
                                                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-300"><Calendar size={16} /></div>
                                                                </div>
                                                            </div>
                                                            <div className="space-y-2">
                                                                <label className="block text-[9px] font-black text-amber-400 uppercase">Bảo hành (Ngày)</label>
                                                                <div className="relative">
                                                                    <input type="date" className="w-full pl-10 pr-4 py-3 rounded-xl border border-amber-100 bg-white text-sm font-black text-amber-700 outline-none focus:ring-4 focus:ring-amber-500/10 transition-all"
                                                                        value={li.warrantyExpiryDate ? li.warrantyExpiryDate.split('T')[0] : ''} onChange={e => updateLineItem(idx, { warrantyExpiryDate: e.target.value ? new Date(e.target.value).toISOString() : '' })} />
                                                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-300"><Calendar size={16} /></div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Card Configuration - Horizontal */}
                                                {li.serviceType === 'card' && (
                                                    <div className="p-4 sm:p-5 bg-purple-50/50 border border-purple-100 rounded-3xl space-y-4 animate-slide-in-right">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <CreditCard size={16} className="text-purple-500" />
                                                            <span className="text-[10px] font-black text-purple-600 uppercase tracking-widest">Nạp tiền vào Ví thành viên</span>
                                                        </div>
                                                        <div className="relative max-w-sm">
                                                            <input className="w-full pl-6 pr-12 py-4 rounded-2xl border border-purple-100 bg-white text-lg font-black text-purple-600 outline-none focus:ring-4 focus:ring-purple-500/10 transition-all text-right shadow-inner"
                                                                placeholder="Giá trị ví..." value={formatCurrency(li.cardWalletValue || 0)}
                                                                onChange={e => updateLineItem(idx, { cardWalletValue: parseCurrency(e.target.value) })} />
                                                            <span className="absolute right-6 top-1/2 -translate-y-1/2 text-sm font-black text-purple-300">đ</span>
                                                        </div>
                                                        <p className="text-[10px] font-bold text-purple-400 uppercase italic">Số dư này sẽ được nạp trực tiếp vào tài khoản khách hàng</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* ROW 2b: Payments Section (Balanced Scale) */}
                                        <div className="p-5 sm:p-6 bg-gray-50/30 border border-gray-100 rounded-[2rem] space-y-5 animate-fade-in">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm"><Receipt size={20} /></div>
                                                    <label className="block text-[11px] font-black text-gray-500 uppercase tracking-[0.1em]">Lịch sử khoản thu</label>
                                                </div>
                                                <button onClick={() => addItemPayment(idx)} className="text-[10px] font-black text-primary uppercase flex items-center gap-2 bg-white hover:bg-primary/5 px-4 py-2 rounded-xl transition-all border border-gray-100 hover:border-primary/20 shadow-sm active:scale-95">
                                                    <Plus size={14} strokeWidth={3} /> Thu mới
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                {(li.payments || []).map(p => (
                                                    <div key={p.id} className="p-4 bg-white border border-gray-100 shadow-lg shadow-gray-200/10 rounded-2xl relative group/pay space-y-3 hover:border-primary/20 transition-all">
                                                        <div className="flex gap-3">
                                                            <select className={`flex-1 bg-gray-50 border border-gray-100 rounded-xl text-[11px] font-black outline-none py-3 px-3 scroll-auto ${p.method === 'wallet' && li.serviceType === 'card' ? 'text-red-500' : 'text-gray-700'}`}
                                                                value={p.method} onChange={e => updateItemPayment(idx, p.id, { method: e.target.value as any })}>
                                                                <option value="cash">Tiền mặt</option>
                                                                <option value="bank">Chuyển khoản</option>
                                                                <option value="wallet" disabled={li.serviceType === 'card'}>Ví (Loyalty)</option>
                                                            </select>
                                                            <div className="relative w-full max-w-[130px]">
                                                                <input className="w-full bg-gray-50 text-right border border-gray-100 rounded-xl text-[13px] font-black text-emerald-600 py-3 px-3 pr-6 focus:ring-2 focus:ring-emerald-500/10 outline-none"
                                                                    value={formatCurrency(p.amount)} onChange={e => updateItemPayment(idx, p.id, { amount: parseCurrency(e.target.value) })} />
                                                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-emerald-300 font-bold">đ</span>
                                                            </div>
                                                        </div>
                                                        <div className="relative">
                                                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><Calendar size={14} /></div>
                                                            <input type="date" className="w-full bg-gray-50 border border-gray-100 rounded-xl text-[11px] font-black py-3 pl-10 pr-3 text-gray-600 outline-none focus:ring-2 focus:ring-primary/10"
                                                                value={p.date ? p.date.split('T')[0] : ''} onChange={e => updateItemPayment(idx, p.id, { date: new Date(e.target.value).toISOString() })} />
                                                        </div>
                                                        <button onClick={() => removePayment(p.id)} className="absolute -top-2 -right-2 w-7 h-7 bg-white text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full flex items-center justify-center shadow-md border border-gray-100 opacity-0 group-hover/pay:opacity-100 transition-all hover:scale-110 active:scale-90"><X size={14} /></button>
                                                    </div>
                                                ))}
                                                {(li.payments || []).length === 0 && (
                                                    <div className="col-span-full py-10 border-2 border-dashed border-gray-100 bg-gray-50/20 rounded-[2rem] flex flex-col items-center justify-center gap-3 opacity-60">
                                                        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-300"><Receipt size={24} /></div>
                                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Chưa ghi nhận khoản thu nào cho dịch vụ này</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* ROW 3: Staff Divisions */}
                                        <div className="pt-6 border-t border-gray-50">
                                            <div className="flex items-center justify-between mb-4">
                                                <label className="text-[11px] font-black text-gray-400 uppercase tracking-wider flex items-center gap-2"><Users size={14} /> Hoa hồng & KPI Nhân viên</label>
                                                <button onClick={() => addStaffSplit(idx)} className="text-[10px] font-black text-amber-600 uppercase flex items-center gap-1.5 hover:bg-amber-50 px-3 py-1.5 rounded-xl transition-all active:scale-95"><PlusCircle size={14} /> Phân bổ nhân sự</button>
                                            </div>
                                            <div className="flex flex-wrap gap-4">
                                                {li.staffSplits.map((sp, si) => (
                                                    <div key={si} className="bg-white border border-gray-200 rounded-2xl flex items-center p-2.5 pl-4 gap-4 shadow-sm group/stf hover:border-amber-200 transition-colors">
                                                        <div className="relative">
                                                            <input className="text-[12px] font-black text-gray-900 border-none bg-transparent p-0 w-32 focus:ring-0" placeholder="Chọn nhân viên..." value={sp.staffName}
                                                                onChange={e => { updateStaffSplit(idx, si, { staffName: e.target.value, staffId: '' }); setStaffSearchIndex(idx * 100 + si); setStaffSearchText(e.target.value) }}
                                                                onFocus={() => { setStaffSearchIndex(idx * 100 + si); setStaffSearchText(sp.staffName) }} onBlur={() => setTimeout(() => setStaffSearchIndex(null), 200)} />
                                                            {staffSearchIndex === idx * 100 + si && staffSuggestions.length > 0 && (
                                                                <div className="absolute z-[110] top-full mt-2 w-48 bg-white rounded-xl shadow-2xl border border-gray-100 max-h-40 overflow-y-auto p-1">
                                                                    {staffSuggestions.map(u => <button key={u.id} className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded-lg text-[10px] font-bold" onMouseDown={() => { updateStaffSplit(idx, si, { staffId: u.id, staffName: u.displayName }); setStaffSearchIndex(null) }}>{u.displayName}</button>)}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="h-8 w-px bg-gray-100" />
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">{sp.type === 'fixed' ? 'VNĐ' : '%'}</span>
                                                            <input className="w-20 text-right text-[12px] font-black text-amber-600 bg-transparent border-none p-0 focus:ring-0"
                                                                value={sp.type === 'percentage' ? sp.rate : formatCurrency(sp.amount)}
                                                                onChange={e => sp.type === 'percentage' ? updateStaffSplit(idx, si, { rate: parseFloat(e.target.value) || 0 }) : updateStaffSplit(idx, si, { amount: parseCurrency(e.target.value) })}
                                                            />
                                                            <button onClick={() => updateStaffSplit(idx, si, { type: sp.type === 'fixed' ? 'percentage' : 'fixed' })} className="w-6 h-6 rounded-lg bg-gray-50 flex items-center justify-center text-[8px] font-black hover:bg-gray-100 transition-colors border border-gray-100">🔁</button>
                                                        </div>
                                                        <button onClick={() => removeStaffSplit(idx, si)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover/stf:opacity-100 transition-opacity ml-1 pr-1"><X size={14} /></button>
                                                    </div>
                                                ))}
                                                {li.staffSplits.length === 0 && <p className="text-[10px] font-bold text-gray-300 uppercase italic py-2 tracking-wide">Chưa gán nhân viên hưởng hoa hồng</p>}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="px-8 py-5 bg-white border-t border-gray-100 flex items-center justify-end gap-3 shrink-0">
                        <button onClick={handleCloseInternal} className="px-8 py-3.5 bg-white border border-gray-100 rounded-2xl font-black text-[10px] text-gray-400 uppercase tracking-widest hover:bg-gray-50 transition-all">Hủy bỏ</button>
                        <button onClick={handleSave} className="px-10 py-3.5 bg-text-main text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-gold-muted/20 hover:bg-gold-muted transition-all active:scale-95">Hoàn tất & Lưu phiếu</button>
                    </div>
                </div>
            </div>

            {/* ====== PAYMENT SUMMARY POPUP ====== */}
            {showSummaryPopup && (
                <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={() => setShowSummaryPopup(false)}>
                    <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-scale-up border flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
                        <div className="px-8 py-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
                            <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                                <Receipt size={18} /> Tổng hợp thanh toán
                            </h3>
                            <button onClick={() => setShowSummaryPopup(false)} className="text-gray-400 hover:text-red-500 transition-colors"><X size={20} /></button>
                        </div>
                        <div className="p-8 overflow-y-auto custom-scrollbar space-y-6">
                            <div className="bg-gray-50/50 rounded-2xl border border-gray-100 overflow-hidden">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-gray-100">
                                            <th className="px-4 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest">Dịch vụ</th>
                                            <th className="px-4 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right">Giá</th>
                                            <th className="px-4 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right">Đã thu</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {formLineItems.map((li, idx) => {
                                            const paid = (li.payments || []).reduce((s, p) => s + p.amount, 0)
                                            const remaining = li.price - paid
                                            return (
                                                <tr key={li.id} className="hover:bg-white transition-colors">
                                                    <td className="px-4 py-4">
                                                        <span className="text-[10px] font-bold text-gray-700 truncate block max-w-[150px]">{li.serviceName || 'Dịch vụ lẻ'}</span>
                                                    </td>
                                                    <td className="px-4 py-4 text-right">
                                                        <span className="text-[10px] font-black text-gray-900">{formatCurrency(li.price)}</span>
                                                    </td>
                                                    <td className="px-4 py-4 text-right">
                                                        <div className="flex flex-col items-end">
                                                            <span className="text-[10px] font-black text-emerald-600">{formatCurrency(paid)}</span>
                                                            {remaining > 0 && <span className="text-[8px] font-bold text-red-400 mt-0.5">-{formatCurrency(remaining)}</span>}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            <div className="space-y-3 pt-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tổng hóa đơn</span>
                                    <span className="text-sm font-black text-gray-900">{formatCurrency(formLineItems.reduce((s, li) => s + li.price, 0))}đ</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Đã thanh toán</span>
                                    <span className="text-xl font-black text-emerald-600">{formatCurrency(formActualAmount)}đ</span>
                                </div>
                                <div className="pt-3 border-t border-gray-50 flex items-center justify-between">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Còn nợ</span>
                                    <span className={`text-xl font-black ${formLineItems.reduce((s, li) => s + li.price, 0) - formActualAmount > 0 ? 'text-red-500' : 'text-gray-400'}`}>
                                        {formatCurrency(formLineItems.reduce((s, li) => s + li.price, 0) - formActualAmount)}đ
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="p-8 pt-0">
                            <button onClick={() => setShowSummaryPopup(false)} className="w-full py-4 bg-gray-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all">Đóng bảng tổng hợp</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ====== NOTE MODAL ====== */}
            {editingNoteIdx !== null && (
                <div className="fixed inset-0 z-[1010] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 animate-scale-up border shadow-2xl">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600"><MessageSquare size={24} /></div>
                            <div>
                                <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Ghi chú dịch vụ</h3>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                                    {editingNoteIdx !== null ? (formLineItems[editingNoteIdx]?.serviceName || 'Dịch vụ') : 'N/A'}
                                </p>
                            </div>
                        </div>
                        <textarea
                            autoFocus
                            className="w-full px-6 py-5 bg-gray-50 border border-gray-100 rounded-[2rem] font-bold text-sm outline-none min-h-[150px] focus:ring-4 focus:ring-amber-100"
                            placeholder="Nhập chú thích của chi nhánh..."
                            value={editingNoteIdx !== null ? (formLineItems[editingNoteIdx]?.note || '') : ''}
                            onChange={e => editingNoteIdx !== null && updateLineItem(editingNoteIdx, { note: e.target.value })}
                        />
                        <div className="grid grid-cols-2 gap-3 mt-8">
                            <button onClick={() => setEditingNoteIdx(null)} className="py-4 bg-gray-100 text-gray-500 rounded-2xl text-xs font-black uppercase">Đóng</button>
                            <button onClick={() => setEditingNoteIdx(null)} className="py-4 bg-amber-500 text-white rounded-2xl text-xs font-black uppercase">Hoàn tất</button>
                        </div>
                    </div>
                </div>
            )}

            {showProfileCustomer && selectedCustomerForProfile && currentUser && (
                <CustomerProfileModal
                    customer={selectedCustomerForProfile as any}
                    onClose={() => setShowProfileCustomer(false)}
                    onNavigate={(tab: string) => {
                        if (!selectedCustomerForProfile) return;
                        setShowProfileCustomer(false);
                        if (tab === 'appointments' || tab === 'create_appointment') {
                            sessionStorage.setItem('createAppointmentForCustomer', selectedCustomerForProfile.id);
                            router.push('/crm/appointments');
                        } else {
                            router.push(`/crm/${tab}`);
                        }
                    }}
                    onEdit={() => {
                        setShowProfileCustomer(false);
                    }}
                    currentUser={currentUser as any}
                    branches={branches as any}
                    appointments={appointments as any}
                />
            )}
        </>
    )
}
