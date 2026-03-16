'use client'

import { useState, useMemo } from 'react'
import { useApp } from '@/lib/auth'
import { ServiceOrder, Customer } from '@/lib/types'
import { Receipt, Search, Edit2, PlusSquare, User } from 'lucide-react'
import PageHeader from '@/components/layout/PageHeader'
import ServiceOrderModal from '@/components/features/crm/ServiceOrderModal'
import CustomerProfileModal from '@/components/features/crm/CustomerProfileModal'
import { useRouter } from 'next/navigation'

const STATUS_MAP: Record<string, { label: string; bg: string; text: string }> = {
    draft: { label: 'Nháp', bg: 'bg-gray-100', text: 'text-gray-500' },
    confirmed: { label: 'Xác nhận', bg: 'bg-blue-50', text: 'text-blue-600' },
    completed: { label: 'Hoàn thành', bg: 'bg-emerald-50', text: 'text-emerald-600' },
    cancelled: { label: 'Hủy', bg: 'bg-red-50', text: 'text-red-600' },
}

function formatCurrency(val: number | string): string {
    const num = typeof val === 'string' ? parseInt(val.replace(/[^\d]/g, '')) || 0 : val
    return num.toLocaleString('vi-VN')
}

export default function ServiceOrdersPage() {
    const { state, currentUser } = useApp()
    const router = useRouter()

    const [showForm, setShowForm] = useState(false)
    const [editing, setEditing] = useState<ServiceOrder | null>(null)
    const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({})
    const [viewCustomer, setViewCustomer] = useState<Customer | null>(null)
    const [search, setSearch] = useState('')
    const [dateFilter, setDateFilter] = useState('') // Default to empty for grouping view
    const [branchFilter, setBranchFilter] = useState('')

    const orders = state.serviceOrders || []
    const customers = state.customers || []
    const branches = state.branches || []

    const spaBranches = useMemo(() => branches.filter(b => b.type === 'spa'), [branches])

    const groupedOrders = useMemo(() => {
        const term = search.toLowerCase().trim()
        const filtered = orders.filter(o => {
            const customer = customers.find(c => c.id === o.customerId)
            const cName = (customer?.fullName || o.customerName || '').toLowerCase()
            const cPhone = (customer?.phone || o.customerPhone || '')
            const matchSearch = !term || o.code.toLowerCase().includes(term) ||
                cName.includes(term) ||
                cPhone.includes(term)
            const matchDate = !dateFilter || o.createdAt.startsWith(dateFilter)
            const matchBranch = !branchFilter || o.branchId === branchFilter
            return matchSearch && matchDate && matchBranch
        })

        // Group by date
        const groups: Record<string, { orders: ServiceOrder[], total: number, actual: number, debt: number }> = {}
        filtered.forEach(o => {
            const date = o.createdAt.slice(0, 10)
            if (!groups[date]) groups[date] = { orders: [], total: 0, actual: 0, debt: 0 }
            groups[date].orders.push(o)
            groups[date].total += (o.totalAmount || 0)
            groups[date].actual += (o.actualAmount || 0)
            groups[date].debt += (o.debtAmount || 0)
        })

        // Sort dates descending and orders within dates descending
        return Object.entries(groups)
            .sort((a, b) => b[0].localeCompare(a[0]))
            .map(([date, data]) => ({
                date,
                ...data,
                orders: data.orders.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
            }))
    }, [orders, search, dateFilter, branchFilter, customers])

    function toggleGroup(date: string) {
        setCollapsedGroups(prev => ({ ...prev, [date]: !prev[date] }))
    }

    function openNew() {
        setEditing(null)
        setShowForm(true)
    }

    function openEdit(order: ServiceOrder) {
        setEditing(order)
        setShowForm(true)
    }

    return (
        <div className="page-container">
            <PageHeader
                icon={Receipt}
                title="Phiếu Dịch Vụ"
                subtitle="CRM • Quản lý dịch vụ"
                actions={
                    <button onClick={openNew} className="px-6 py-3 bg-text-main text-white rounded-[15px] text-[11px] font-black uppercase tracking-widest shadow-luxury hover:bg-gold-muted transition-all flex items-center gap-2">
                        <PlusSquare size={18} /> Tạo mới
                    </button>
                }
            >
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto mt-4 sm:mt-0">
                    <div className="relative w-full sm:w-64">
                        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                        <input className="w-full pl-11 pr-5 py-3 bg-gray-50/50 border border-gray-100 rounded-[15px] text-[11px] font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                            placeholder="Mã phiếu, tên, SĐT..." value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                        <input type="date" className="flex-1 sm:flex-none px-4 py-3 bg-gray-50/50 border border-gray-100 rounded-[15px] text-[11px] font-black uppercase tracking-widest outline-none"
                            value={dateFilter} onChange={e => setDateFilter(e.target.value)} />
                        <select className="flex-1 sm:flex-none px-4 py-3 bg-gray-50/50 border border-gray-100 rounded-[15px] text-[11px] font-black uppercase tracking-widest outline-none"
                            value={branchFilter} onChange={e => setBranchFilter(e.target.value)}>
                            <option value="">Tất cả chi nhánh</option>
                            {spaBranches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                    </div>
                </div>
            </PageHeader>

            <div className="content-wrapper space-y-6">
                {groupedOrders.length === 0 ? (
                    <div className="bg-white rounded-[2rem] p-20 text-center border border-dashed border-gray-200">
                        <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Không tìm thấy dữ liệu phù hợp</p>
                    </div>
                ) : groupedOrders.map(group => {
                    const isCollapsed = !!collapsedGroups[group.date]
                    return (
                        <div key={group.date} className="bg-white rounded-[2rem] border border-gray-100 shadow-xl overflow-hidden animate-fade-in">
                            {/* Group Header */}
                            <div
                                onClick={() => toggleGroup(group.date)}
                                className="px-6 py-5 bg-gray-50/50 flex flex-wrap items-center justify-between gap-4 cursor-pointer hover:bg-gray-50 transition-colors"
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center transition-transform duration-300 ${isCollapsed ? '-rotate-90' : ''}`}>
                                        <span className="material-icons-round text-gray-400">expand_more</span>
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">
                                            {new Date(group.date).toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                        </h3>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                                            {group.orders.length} phiếu dịch vụ
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-6 sm:gap-10">
                                    <div className="text-right">
                                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mb-1">Tổng DV</p>
                                        <p className="text-sm font-black text-gray-900">{formatCurrency(group.total)}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[9px] text-emerald-400 font-bold uppercase tracking-widest mb-1">Thực thu</p>
                                        <p className="text-sm font-black text-emerald-600">{formatCurrency(group.actual)}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[9px] text-red-400 font-bold uppercase tracking-widest mb-1">Nợ</p>
                                        <p className="text-sm font-black text-red-500">{formatCurrency(group.debt)}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Group Content */}
                            {!isCollapsed && (
                                <div className="overflow-x-auto custom-scrollbar animate-slide-down">
                                    <table className="w-full text-left border-t border-gray-50">
                                        <thead>
                                            <tr className="bg-white/50">
                                                <th className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap pl-20">Mã phiếu</th>
                                                <th className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">Khách hàng</th>
                                                <th className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right whitespace-nowrap">Tổng tiền</th>
                                                <th className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right whitespace-nowrap">Thực thu</th>
                                                <th className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right whitespace-nowrap">Còn nợ</th>
                                                <th className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase tracking-widest text-center whitespace-nowrap">Trạng thái</th>
                                                <th className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right whitespace-nowrap">Thao tác</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {group.orders.map(order => {
                                                const customer = customers?.find(c =>
                                                    (order.customerId && c.id == order.customerId) ||
                                                    (order.customerPhone && c.phone?.replace(/[^0-9]/g, '').slice(-9) === order.customerPhone?.replace(/[^0-9]/g, '').slice(-9))
                                                )
                                                const status = STATUS_MAP[order.status]
                                                return (
                                                    <tr key={order.id} onClick={() => openEdit(order)} className="hover:bg-gray-50/30 transition-colors group cursor-pointer">
                                                        <td className="px-6 py-4 whitespace-nowrap pl-20">
                                                            <p className="font-black text-gray-900 text-xs">{order.code}</p>
                                                            <p className="text-[9px] text-gray-400 font-bold uppercase">{order.createdAt.slice(11, 16)}</p>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="flex items-center gap-3">
                                                                <div className="min-w-0">
                                                                    <p className="font-bold text-gray-900 text-xs truncate">{customer?.fullName || order.customerName || '—'}</p>
                                                                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider tabular-nums">{customer?.phone || order.customerPhone || ''}</p>
                                                                </div>
                                                                {customer && (
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setViewCustomer(customer);
                                                                        }}
                                                                        className="shrink-0 w-7 h-7 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 hover:scale-110 shadow-lg shadow-emerald-200/50 active:scale-95 transition-all duration-300 flex items-center justify-center border border-emerald-500"
                                                                        title="Hồ sơ"
                                                                    >
                                                                        <User size={13} strokeWidth={2.5} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-right font-black text-gray-900 text-xs whitespace-nowrap">
                                                            {formatCurrency(order.totalAmount)}đ
                                                        </td>
                                                        <td className="px-6 py-4 text-right font-black text-emerald-600 text-xs whitespace-nowrap">
                                                            {formatCurrency(order.actualAmount || 0)}đ
                                                        </td>
                                                        <td className="px-6 py-4 text-right font-black text-red-500 text-xs whitespace-nowrap">
                                                            {formatCurrency(order.debtAmount || 0)}đ
                                                        </td>
                                                        <td className="px-6 py-4 text-center whitespace-nowrap">
                                                            <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider ${status.bg} ${status.text}`}>
                                                                {status.label}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-right whitespace-nowrap">
                                                            <button onClick={e => { e.stopPropagation(); openEdit(order) }} className="p-2 text-gray-300 hover:text-primary transition-all">
                                                                <Edit2 size={16} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>

            <ServiceOrderModal
                isOpen={showForm}
                onClose={() => setShowForm(false)}
                editingOrder={editing}
            />

            {
                viewCustomer && (
                    <CustomerProfileModal
                        customer={viewCustomer}
                        onClose={() => setViewCustomer(null)}
                        onNavigate={(tab) => {
                            setViewCustomer(null)
                            router.push(`/crm/${tab}`)
                        }}
                        onEdit={() => { }}
                        currentUser={currentUser as any}
                        branches={branches}
                        appointments={state.appointments}
                    />
                )
            }
        </div >
    )
}
