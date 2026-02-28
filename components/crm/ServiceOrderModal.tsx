'use client'

import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { useApp } from '@/lib/auth'
import { ServiceOrder, ServiceLineItem, StaffSplit, Customer, Appointment } from '@/lib/types'
import { saveServiceOrder, syncServiceOrder } from '@/lib/storage'
import { useModal } from '@/components/ModalProvider'
import { useToast } from '@/components/ToastProvider'
import { searchCustomers } from '@/lib/supabaseFetch'
import { X, Plus, Receipt, Trash2, Edit2, Search, Loader2, Wrench, Package, CreditCard, MessageSquare, PlusSquare, Calendar, Users, ChevronDown, Eye, PlusCircle } from 'lucide-react'

const SERVICE_TYPES = [
    { value: 'single', label: 'Dịch vụ lẻ', icon: Wrench, color: 'bg-blue-50 text-blue-600 border-blue-100' },
    { value: 'package', label: 'Gói liệu trình', icon: Package, color: 'bg-amber-50 text-amber-600 border-amber-100' },
    { value: 'card', label: 'Thẻ khách hàng', icon: CreditCard, color: 'bg-purple-50 text-purple-600 border-purple-100' },
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
        id: crypto.randomUUID(),
        customerType: index === 0 ? (isNewCustomer ? 'new' : 'old') : 'tvt',
        serviceName: '',
        serviceType: 'single',
        description: '',
        price: 0,
        note: '',
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

    // Form state
    const [formCustomerId, setFormCustomerId] = useState('')
    const [formBranchId, setFormBranchId] = useState('')
    const [formAppointmentId, setFormAppointmentId] = useState('')
    const [formLineItems, setFormLineItems] = useState<ServiceLineItem[]>([])
    const [formStatus, setFormStatus] = useState<ServiceOrder['status']>('draft')
    const [editingNoteIdx, setEditingNoteIdx] = useState<number | null>(null)

    // Search dropdowns
    const [customerSearch, setCustomerSearch] = useState('')
    const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
    const [staffSearchIndex, setStaffSearchIndex] = useState<number | null>(null)
    const [staffSearchText, setStaffSearchText] = useState('')
    const [serviceSearchIndex, setServiceSearchIndex] = useState<number | null>(null)
    const [serviceSearchText, setServiceSearchText] = useState('')
    const [customerSuggestions, setCustomerSuggestions] = useState<Customer[]>([])
    const [isSearchingCustomers, setIsSearchingCustomers] = useState(false)

    const orders = state.serviceOrders || []
    const customers = state.customers || []
    const appointments = state.appointments || []
    const services = state.services || []
    const users = state.users || []
    const branches = state.branches || []

    const spaBranches = useMemo(() => branches.filter(b => b.type === 'spa'), [branches])

    const isCustomerNewAtBranch = useCallback((customerId: string, branchId: string) => {
        return !orders.some(o => o.customerId === customerId && o.branchId === branchId && o.status !== 'cancelled')
    }, [orders])

    // Initialize/Reset form
    useEffect(() => {
        if (isOpen) {
            if (editingOrder) {
                setFormCustomerId(editingOrder.customerId)
                setFormBranchId(editingOrder.branchId)
                setFormAppointmentId(editingOrder.appointmentId || '')
                setFormLineItems([...editingOrder.lineItems])
                setFormStatus(editingOrder.status)
                // When editing, we should have the customer in our suggestions list initially if possible
                // or at least show their name in the search box
                const cust = customers.find(c => c.id === editingOrder.customerId)
                if (cust) {
                    setCustomerSearch(cust.fullName)
                    setCustomerSuggestions([cust])
                }
            } else {
                setFormCustomerId(initialCustomerId)
                setFormBranchId(initialBranchId || currentUser?.branchId || '')
                setFormAppointmentId(initialAppointmentId)

                const isNew = initialCustomerId ? isCustomerNewAtBranch(initialCustomerId, initialBranchId || currentUser?.branchId || '') : true
                setFormLineItems([createEmptyLineItem(0, isNew)])
                setFormStatus('draft')

                const cust = customers.find(c => c.id === initialCustomerId)
                if (cust) {
                    setCustomerSearch(cust.fullName)
                    setCustomerSuggestions([cust])
                }
            }
        }
    }, [isOpen, editingOrder, initialCustomerId, initialBranchId, initialAppointmentId, currentUser?.branchId, customers, isCustomerNewAtBranch])

    // Server-side customer search
    useEffect(() => {
        if (!isOpen) return;

        const term = customerSearch.trim();
        // If term is short and not initial values, don't search
        if (term.length < 2) {
            // But if it's empty, show initial empty state or recent? 
            // The user requested only load when search.
            if (term.length === 0) setCustomerSuggestions([]);
            return;
        }

        const delayDebounceFn = setTimeout(async () => {
            setIsSearchingCustomers(true);
            try {
                const results = await searchCustomers(term);
                setCustomerSuggestions(results);
            } finally {
                setIsSearchingCustomers(false);
            }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [customerSearch, isOpen]);

    const selectedCustomer = useMemo(() => {
        // Since state.customers might be empty, we look in our suggestions first
        return customerSuggestions.find(c => c.id === formCustomerId) || customers.find(c => c.id === formCustomerId)
    }, [formCustomerId, customerSuggestions, customers])

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
        if (!editingOrder) {
            return !!formCustomerId || !!formBranchId || formLineItems.some(li => li.serviceName || li.price > 0 || li.note)
        }
        const currentData = { customerId: formCustomerId, branchId: formBranchId, appointmentId: formAppointmentId, lineItems: formLineItems, status: formStatus }
        const originalData = { customerId: editingOrder.customerId, branchId: editingOrder.branchId, appointmentId: editingOrder.appointmentId || '', lineItems: editingOrder.lineItems, status: editingOrder.status }
        return JSON.stringify(currentData) !== JSON.stringify(originalData)
    }, [editingOrder, formCustomerId, formBranchId, formAppointmentId, formLineItems, formStatus])

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
            return { ...item, staffSplits: [...item.staffSplits, { staffId: '', staffName: '', amount: 0 }] }
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
            return {
                ...item,
                staffSplits: item.staffSplits.map((sp, si) => si === splitIndex ? { ...sp, ...updates } : sp)
            }
        }))
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
        const order: ServiceOrder = {
            id: editingOrder?.id || crypto.randomUUID(),
            code: editingOrder?.code || generateCode(orders),
            customerId: formCustomerId,
            branchId: formBranchId,
            appointmentId: formAppointmentId || undefined,
            lineItems: formLineItems,
            totalAmount,
            status: formStatus,
            createdBy: currentUser?.id || '',
            createdAt: editingOrder?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        }

        saveState(saveServiceOrder(order))

        if (order.appointmentId && order.status !== 'draft') {
            saveState(s => ({
                ...s,
                appointments: s.appointments.map(a => a.id === order.appointmentId ? { ...a, price: totalAmount } : a)
            }))
        }

        try {
            await syncServiceOrder(order)
            showToast('Thành công', `Đã lưu phiếu: ${order.code}`)
        } catch {
            showToast('Thành công', 'Đã lưu offline')
        }
        onClose()
    }

    if (!isOpen) return null

    return (
        <>
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-md animate-fade-in" onClick={e => e.target === e.currentTarget && handleCloseInternal()}>
                <div className="bg-white w-full max-w-6xl max-h-[95vh] sm:max-h-[90vh] rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-scale-up border border-white/20">
                    {/* Modal Header */}
                    <div className="px-5 py-4 sm:px-8 sm:py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 shrink-0">
                        <div className="min-w-0">
                            <h2 className="text-base sm:text-xl font-black text-gray-900 uppercase tracking-tight truncate">{editingOrder ? 'Sửa phiếu dịch vụ' : 'Tạo phiếu dịch vụ'}</h2>
                            <p className="text-[9px] sm:text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5 sm:mt-1 opacity-60">{editingOrder?.code || 'Phiếu mới'}</p>
                        </div>
                        <button onClick={handleCloseInternal} className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-white border border-gray-100 text-gray-400 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition-all group shrink-0 ml-4">
                            <X size={18} className="group-hover:rotate-90 transition-transform sm:w-5 sm:h-5" />
                        </button>
                    </div>

                    {/* Modal Body */}
                    <div className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-8 sm:space-y-10 custom-scrollbar">
                        {/* Section 1: Customer & Branch */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-6">
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
                                    {selectedCustomer && (
                                        <div className="mt-2 p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-[11px] font-bold text-emerald-700 flex items-center justify-between">
                                            <span>{selectedCustomer.fullName} — {selectedCustomer.phone}</span>
                                            <button onClick={() => { setFormCustomerId(''); setCustomerSearch('') }} className="text-emerald-400 hover:text-red-500"><X size={14} /></button>
                                        </div>
                                    )}
                                    {showCustomerDropdown && customerSuggestions.length > 0 && !selectedCustomer && (
                                        <div className="absolute z-20 top-full mt-2 w-full bg-white rounded-2xl shadow-2xl border border-gray-100 max-h-60 overflow-y-auto p-2">
                                            {customerSuggestions.map(c => (
                                                <button key={c.id} className="w-full text-left px-4 py-3 hover:bg-gray-50 rounded-xl transition-colors"
                                                    onClick={() => {
                                                        setFormCustomerId(c.id);
                                                        setCustomerSearch(c.fullName);
                                                        setShowCustomerDropdown(false);
                                                        if (!formAppointmentId && c.branchId) setFormBranchId(c.branchId)
                                                    }}>
                                                    <p className="font-bold text-sm text-gray-900">{c.fullName}</p>
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase">{c.phone}</p>
                                                </button>
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

                        {/* Section 2: Services */}
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-black text-gray-700 uppercase tracking-widest flex items-center gap-2 pt-4">
                                    <Receipt size={16} /> Danh sách dịch vụ
                                </h3>
                                <button onClick={addLineItem} className="flex items-center gap-1.5 px-4 py-2 bg-primary/10 text-primary border border-primary/20 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary/20 transition-all">
                                    <Plus size={14} /> Thêm dịch vụ
                                </button>
                            </div>

                            <div className="space-y-6">
                                {formLineItems.map((li, idx) => (
                                    <div key={li.id} className="p-4 sm:p-6 bg-gray-50/50 border border-gray-100 rounded-[1.5rem] sm:rounded-[2rem] space-y-5 sm:space-y-6 relative group border-l-[6px] border-l-primary/10">
                                        {/* Line Header */}
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar-hide whitespace-nowrap pb-1">
                                                <span className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-[11px] font-black text-primary shrink-0">{idx + 1}</span>
                                                <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest shrink-0 ${CUSTOMER_TYPE_LABELS[li.customerType]?.bg || 'bg-gray-100'}`}>{CUSTOMER_TYPE_LABELS[li.customerType]?.label || 'TVT'}</span>
                                                <button onClick={() => setEditingNoteIdx(idx)} className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all shrink-0 ${li.note ? 'bg-amber-100 text-amber-600' : 'bg-white border border-gray-100 text-gray-400 hover:text-gray-600'}`}>
                                                    {li.note ? 'GHI CHÚ ✓' : '+ GHI CHÚ'}
                                                </button>
                                            </div>
                                            {formLineItems.length > 1 && (
                                                <button onClick={() => removeLineItem(idx)} className="p-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>

                                        {/* Line Fields */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-4">
                                                <div className="relative">
                                                    <label className="block text-[9px] font-black text-gray-400 uppercase mb-2">Tên dịch vụ *</label>
                                                    <input className="w-full px-4 py-3 bg-white border border-gray-100 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-primary/10"
                                                        value={li.serviceName}
                                                        onChange={e => { updateLineItem(idx, { serviceName: e.target.value }); setServiceSearchIndex(idx); setServiceSearchText(e.target.value) }}
                                                        onFocus={() => { setServiceSearchIndex(idx); setServiceSearchText(li.serviceName) }}
                                                        onBlur={() => setTimeout(() => setServiceSearchIndex(null), 200)}
                                                    />
                                                    {serviceSearchIndex === idx && serviceSuggestions.length > 0 && (
                                                        <div className="absolute z-30 top-full mt-1 w-full bg-white rounded-xl shadow-2xl border border-gray-100 max-h-40 overflow-y-auto p-1">
                                                            {serviceSuggestions.map(s => (
                                                                <button key={s.id} className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded-lg text-xs"
                                                                    onMouseDown={() => { updateLineItem(idx, { serviceId: s.id, serviceName: s.name, price: s.price }); setServiceSearchIndex(null) }}>
                                                                    <p className="font-bold text-gray-900">{s.name}</p>
                                                                    <p className="text-[9px] text-gray-400 uppercase">{formatCurrency(s.price)}đ</p>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                                <div>
                                                    <label className="block text-[9px] font-black text-gray-400 uppercase mb-2">Mô tả chi tiết</label>
                                                    <textarea className="w-full px-4 py-3 bg-white border border-gray-100 rounded-xl font-bold text-sm outline-none min-h-[80px]"
                                                        placeholder="Nhập mô tả dịch vụ..." value={li.description || ''} onChange={e => updateLineItem(idx, { description: e.target.value })} />
                                                </div>
                                                <div>
                                                    <label className="block text-[9px] font-black text-gray-400 uppercase mb-2">Loại dịch vụ</label>
                                                    <div className="flex gap-1 p-1 bg-white border border-gray-100 rounded-xl overflow-x-auto custom-scrollbar-hide">
                                                        {SERVICE_TYPES.map(st => (
                                                            <button key={st.value} onClick={() => updateLineItem(idx, { serviceType: st.value })}
                                                                className={`flex-1 min-w-fit whitespace-nowrap px-3 py-2 rounded-lg text-[9px] font-black uppercase tracking-tighter flex items-center justify-center gap-1.5 transition-all ${li.serviceType === st.value ? st.color + ' shadow-sm' : 'text-gray-400'}`}>
                                                                <st.icon size={14} /> {st.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Package-specific fields */}
                                                {li.serviceType === 'package' && (
                                                    <div className="p-4 bg-amber-50/50 border border-amber-100 rounded-xl space-y-3 animate-fade-in">
                                                        <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest flex items-center gap-1.5"><Package size={12} /> Thông tin gói liệu trình</p>
                                                        <div>
                                                            <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">Loại gói</label>
                                                            <div className="flex gap-1 p-1 bg-white border border-amber-100 rounded-lg">
                                                                {PACKAGE_TYPES.map(pt => (
                                                                    <button key={pt.value} onClick={() => updateLineItem(idx, { packageType: pt.value })}
                                                                        className={`flex-1 py-1.5 rounded-md text-[9px] font-black uppercase transition-all ${li.packageType === pt.value ? 'bg-amber-100 text-amber-700 shadow-sm' : 'text-gray-400'}`}>
                                                                        {pt.label}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                        {li.packageType === 'sessions' && (
                                                            <div>
                                                                <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">Tổng số buổi</label>
                                                                <input type="number" min="1" className="w-full px-4 py-2 bg-white border border-amber-100 rounded-lg font-bold text-sm outline-none"
                                                                    value={li.totalSessions || ''} onChange={e => updateLineItem(idx, { totalSessions: parseInt(e.target.value) || 0 })} placeholder="VD: 10" />
                                                            </div>
                                                        )}
                                                        {li.packageType === 'duration' && (
                                                            <div>
                                                                <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">Hạn sử dụng</label>
                                                                <input type="date" className="w-full px-4 py-2 bg-white border border-amber-100 rounded-lg font-bold text-sm outline-none"
                                                                    value={li.expiryDate || ''} onChange={e => updateLineItem(idx, { expiryDate: e.target.value })} />
                                                            </div>
                                                        )}
                                                        {li.packageType === 'warranty' && (
                                                            <div>
                                                                <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">Ngày hết hạn bảo hành</label>
                                                                <input type="date" className="w-full px-4 py-2 bg-white border border-amber-100 rounded-lg font-bold text-sm outline-none"
                                                                    value={li.warrantyExpiryDate || ''} onChange={e => updateLineItem(idx, { warrantyExpiryDate: e.target.value })} />
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Card-specific fields */}
                                                {li.serviceType === 'card' && (
                                                    <div className="p-4 bg-purple-50/50 border border-purple-100 rounded-xl space-y-3 animate-fade-in">
                                                        <p className="text-[9px] font-black text-purple-600 uppercase tracking-widest flex items-center gap-1.5"><CreditCard size={12} /> Thông tin thẻ khách hàng</p>
                                                        <div>
                                                            <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">Giá trị thẻ/ví (VNĐ)</label>
                                                            <input className="w-full px-4 py-2 bg-white border border-purple-100 rounded-lg font-bold text-sm outline-none"
                                                                value={formatCurrency(li.cardWalletValue || 0)} onChange={e => updateLineItem(idx, { cardWalletValue: parseCurrency(e.target.value) })} placeholder="0" />
                                                        </div>
                                                        <div>
                                                            <label className="block text-[9px] font-black text-gray-400 uppercase mb-1">Hạn sử dụng thẻ</label>
                                                            <input type="date" className="w-full px-4 py-2 bg-white border border-purple-100 rounded-lg font-bold text-sm outline-none"
                                                                value={li.expiryDate || ''} onChange={e => updateLineItem(idx, { expiryDate: e.target.value })} />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="space-y-4">
                                                <div>
                                                    <label className="block text-[9px] font-black text-gray-400 uppercase mb-2">Giá dịch vụ (VNĐ)</label>
                                                    <input className="w-full px-5 py-3.5 bg-white border border-gray-100 rounded-xl font-black text-2xl text-primary outline-none focus:ring-2 focus:ring-primary/10"
                                                        value={formatCurrency(li.price)} onChange={e => updateLineItem(idx, { price: parseCurrency(e.target.value) })} />
                                                </div>
                                                <div>
                                                    <label className="block text-[9px] font-black text-gray-400 uppercase mb-2">Chia hoa hồng NV</label>
                                                    <div className="space-y-2">
                                                        {li.staffSplits.map((sp, si) => (
                                                            <div key={si} className="flex gap-2">
                                                                <div className="flex-1 relative">
                                                                    <input className="w-full px-3 py-2 bg-white border border-gray-100 rounded-lg font-bold text-xs" placeholder="Tên NV..." value={sp.staffName}
                                                                        onChange={e => { updateStaffSplit(idx, si, { staffName: e.target.value, staffId: '' }); setStaffSearchIndex(idx * 100 + si); setStaffSearchText(e.target.value) }}
                                                                        onFocus={() => { setStaffSearchIndex(idx * 100 + si); setStaffSearchText(sp.staffName) }} onBlur={() => setTimeout(() => setStaffSearchIndex(null), 200)} />
                                                                    {staffSearchIndex === idx * 100 + si && staffSuggestions.length > 0 && (
                                                                        <div className="absolute z-40 top-full mt-1 w-full bg-white rounded-lg shadow-xl border border-gray-100 max-h-32 overflow-y-auto p-1 text-[10px]">
                                                                            {staffSuggestions.map(u => <button key={u.id} className="w-full text-left px-2 py-1.5 hover:bg-gray-50 rounded" onMouseDown={() => { updateStaffSplit(idx, si, { staffId: u.id, staffName: u.displayName }); setStaffSearchIndex(null) }}>{u.displayName}</button>)}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <input className="w-28 px-3 py-2 bg-white border border-gray-100 rounded-lg font-bold text-xs text-right" placeholder="Tiền" value={formatCurrency(sp.amount)} onChange={e => updateStaffSplit(idx, si, { amount: parseCurrency(e.target.value) })} />
                                                                <button onClick={() => removeStaffSplit(idx, si)} className="text-gray-300 hover:text-red-500"><X size={14} /></button>
                                                            </div>
                                                        ))}
                                                        <button onClick={() => addStaffSplit(idx)} className="text-[9px] font-black text-primary uppercase hover:underline">+ Thêm nhân viên chia hoa hồng</button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {li.note && (
                                            <div className="p-4 bg-amber-50/50 border border-amber-100/50 rounded-2xl animate-fade-in">
                                                <p className="text-[9px] font-black text-amber-600 uppercase mb-1 flex items-center gap-1.5"><MessageSquare size={12} /> Chú thích chi nhánh:</p>
                                                <p className="text-xs font-bold text-gray-700 italic">"{li.note}"</p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Modal Footer */}
                    <div className="px-5 py-4 sm:px-8 sm:py-6 bg-gray-50/80 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-0 shrink-0">
                        <div className="text-center sm:text-left">
                            <p className="text-[9px] sm:text-[10px] text-gray-400 font-bold uppercase">Tổng dự kiến</p>
                            <p className="text-xl sm:text-2xl font-black text-primary">{formatCurrency(formLineItems.reduce((s, li) => s + li.price, 0))}đ</p>
                        </div>
                        <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
                            <button onClick={handleCloseInternal} className="flex-1 sm:flex-none sm:px-8 py-3.5 sm:py-4 bg-white border border-gray-200 rounded-2xl font-black text-[10px] sm:text-[11px] text-gray-400 uppercase tracking-widest hover:bg-gray-50 hover:text-gray-600 transition-all">Hủy bỏ</button>
                            <button onClick={handleSave} className="flex-[2] sm:flex-none sm:px-10 py-3.5 sm:py-4 bg-text-main text-white rounded-2xl font-black text-[10px] sm:text-[11px] uppercase tracking-widest shadow-xl hover:bg-gold-muted transition-all active:scale-95">Lưu phiếu</button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ====== NOTE MODAL ====== */}
            {editingNoteIdx !== null && (
                <div className="fixed inset-0 z-[1010] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 animate-scale-up border shadow-2xl">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600"><MessageSquare size={24} /></div>
                            <div>
                                <h3 className="text-xl font-black text-gray-900 uppercase">Ghi chú dịch vụ</h3>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">{formLineItems[editingNoteIdx]?.serviceName || 'N/A'}</p>
                            </div>
                        </div>
                        <textarea autoFocus className="w-full px-6 py-5 bg-gray-50 border border-gray-100 rounded-[2rem] font-bold text-sm outline-none min-h-[150px] focus:ring-4 focus:ring-amber-100"
                            placeholder="Nhập chú thích của chi nhánh..." value={formLineItems[editingNoteIdx]?.note || ''} onChange={e => updateLineItem(editingNoteIdx, { note: e.target.value })} />
                        <div className="grid grid-cols-2 gap-3 mt-8">
                            <button onClick={() => setEditingNoteIdx(null)} className="py-4 bg-gray-100 text-gray-500 rounded-2xl text-xs font-black uppercase">Đóng</button>
                            <button onClick={() => setEditingNoteIdx(null)} className="py-4 bg-amber-500 text-white rounded-2xl text-xs font-black uppercase">Hoàn tất</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
