'use client'

import { useState, useMemo } from 'react'
import { useApp } from '@/lib/auth'
import { ServiceOrder } from '@/lib/types'
import { Receipt, Search, Edit2, PlusSquare } from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import ServiceOrderModal from '@/components/crm/ServiceOrderModal'

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
    const { state } = useApp()

    const [showForm, setShowForm] = useState(false)
    const [editing, setEditing] = useState<ServiceOrder | null>(null)
    const [search, setSearch] = useState('')
    const [dateFilter, setDateFilter] = useState(new Date().toISOString().slice(0, 10))
    const [branchFilter, setBranchFilter] = useState('')

    const orders = state.serviceOrders || []
    const customers = state.customers || []
    const branches = state.branches || []

    const spaBranches = useMemo(() => branches.filter(b => b.type === 'spa'), [branches])

    const filteredOrders = useMemo(() => {
        const term = search.toLowerCase().trim()
        return orders.filter(o => {
            const customer = customers.find(c => c.id === o.customerId)
            const matchSearch = !term || o.code.toLowerCase().includes(term) ||
                (customer?.fullName || '').toLowerCase().includes(term) ||
                (customer?.phone || '').includes(term)
            const matchDate = !dateFilter || o.createdAt.startsWith(dateFilter)
            const matchBranch = !branchFilter || o.branchId === branchFilter
            return matchSearch && matchDate && matchBranch
        }).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    }, [orders, search, dateFilter, branchFilter, customers])

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
                            placeholder="Tìm kiếm..." value={search} onChange={e => setSearch(e.target.value)} />
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

            <div className="content-wrapper">
                <div className="bg-white rounded-[2rem] border border-gray-100 shadow-2xl overflow-hidden">
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-gray-50/50">
                                    <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">Mã/Ngày</th>
                                    <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">Khách hàng</th>
                                    <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right whitespace-nowrap">Tổng tiền</th>
                                    <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center whitespace-nowrap">Trạng thái</th>
                                    <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right whitespace-nowrap">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredOrders.map(order => {
                                    const customer = customers.find(c => c.id === order.customerId)
                                    const status = STATUS_MAP[order.status]
                                    return (
                                        <tr key={order.id} onClick={() => openEdit(order)} className="hover:bg-gray-50/30 transition-colors group cursor-pointer">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <p className="font-black text-gray-900">{order.code}</p>
                                                <p className="text-[10px] text-gray-400 font-bold">{new Date(order.createdAt).toLocaleDateString('vi-VN')}</p>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <p className="font-bold text-gray-900">{customer?.fullName || '—'}</p>
                                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{customer?.phone || ''}</p>
                                            </td>
                                            <td className="px-6 py-4 text-right font-black text-primary whitespace-nowrap">
                                                {formatCurrency(order.totalAmount)}đ
                                            </td>
                                            <td className="px-6 py-4 text-center whitespace-nowrap">
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${status.bg} ${status.text}`}>
                                                    {status.label}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right whitespace-nowrap">
                                                <button onClick={e => { e.stopPropagation(); openEdit(order) }} className="p-2 text-gray-400 hover:text-primary transition-all">
                                                    <Edit2 size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <ServiceOrderModal
                isOpen={showForm}
                onClose={() => setShowForm(false)}
                editingOrder={editing}
            />
        </div>
    )
}
