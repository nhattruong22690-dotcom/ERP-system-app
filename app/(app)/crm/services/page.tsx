'use client'
import { useState, useMemo } from 'react'
import { useApp } from '@/lib/auth'
import { CrmService } from '@/lib/types'
import { saveService, syncService } from '@/lib/storage'
import { useModal } from '@/components/layout/ModalProvider'
import { useToast } from '@/components/layout/ToastProvider'
import { generateId } from '@/lib/utils/id'
import { Trash2, Edit2, Plus, Search, Check, Tag, LayoutGrid, PlusCircle, X, Settings } from 'lucide-react'
import PageHeader from '@/components/layout/PageHeader'
import ServiceCategoryManagementModal from '@/components/features/crm/ServiceCategoryManagementModal'

export default function ServicesPage() {
    const { state, saveState } = useApp()
    const { showAlert, showConfirm } = useModal()
    const { showToast } = useToast()

    const [showForm, setShowForm] = useState(false)
    const [showCategoryModal, setShowCategoryModal] = useState(false)
    const [editing, setEditing] = useState<CrmService | null>(null)
    const [form, setForm] = useState<Partial<CrmService>>({})
    const [search, setSearch] = useState('')

    const filteredServices = useMemo(() => {
        const term = search.toLowerCase().trim()
        return (state.services || []).filter(s =>
            s.name.toLowerCase().includes(term) || (s.category || '').toLowerCase().includes(term)
        ).sort((a, b) => (a.category || '').localeCompare(b.category || ''))
    }, [state.services, search])

    const serviceCategories = state.serviceCategories || []

    function openNew() {
        setForm({
            isActive: true,
            price: 0,
            duration: 60,
            type: 'single', // Default
            categoryId: serviceCategories[0]?.id,
            category: serviceCategories[0]?.name || ''
        })
        setEditing(null)
        setShowForm(true)
    }

    function openEdit(s: CrmService) {
        setForm({ ...s })
        setEditing(s)
        setShowForm(true)
    }

    async function handleSave() {
        if (!form.name || (!form.category && !form.categoryId)) {
            await showAlert('Vui lòng nhập Tên dịch vụ và chọn Danh mục')
            return
        }

        const service: CrmService = {
            id: editing?.id || generateId(),
            name: form.name,
            category: form.category || '',
            categoryId: form.categoryId,
            price: Number(form.price) || 0,
            duration: Number(form.duration) || 0,
            type: (form.type as any) || 'single',
            isActive: form.isActive !== false,
            image: form.image,
            createdAt: editing?.createdAt || new Date().toISOString()
        }

        saveState(saveService(service))
        try {
            await syncService(service)
            showToast('Thành công', `Đã lưu dịch vụ: ${service.name}`)
            setShowForm(false)
        } catch (e) {
            showToast('Thành công', 'Đã lưu cục bộ')
            setShowForm(false)
        }
    }

    return (
        <div className="page-container">
            <PageHeader
                icon={LayoutGrid}
                title="Dịch vụ"
                subtitle="Bảng giá & Quy trình chuẩn"
                description="Hệ thống CRM • Quản lý danh mục dịch vụ cao cấp"
                actions={
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setShowCategoryModal(true)}
                            className="px-5 py-3 bg-white border border-gray-100 text-gray-400 rounded-[15px] text-[10px] font-black uppercase tracking-widest hover:text-primary hover:border-primary/30 transition-all flex items-center gap-2 shadow-sm active:scale-95"
                        >
                            <Settings size={16} />
                            Quản lý danh mục
                        </button>
                        <button
                            onClick={openNew}
                            className="px-6 py-3 bg-text-main text-white rounded-[15px] text-[11px] font-black uppercase tracking-[0.2em] shadow-luxury hover:bg-gold-muted hover:shadow-gold-muted/20 transition-all duration-300 flex items-center gap-2 active:scale-95 group"
                        >
                            <PlusCircle size={18} strokeWidth={2.5} className="group-hover:rotate-90 transition-transform duration-500" />
                            Thêm mới
                        </button>
                    </div>
                }
            >
                <div className="relative w-64 md:w-80">
                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-soft opacity-40 focus:opacity-100 transition-opacity" />
                    <input
                        className="w-full pl-11 pr-5 py-3 bg-gray-50/50 border border-gray-100 rounded-[15px] text-[11px] font-black uppercase tracking-widest focus:ring-4 focus:ring-gold-light/20 transition-all outline-none placeholder:text-text-soft/20"
                        placeholder="TÌM DỊCH VỤ..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
            </PageHeader>

            <div className="content-wrapper">

                {/* Content Table */}
                <div className="flex-1 bg-white rounded-[2.5rem] border border-gray-100 shadow-2xl overflow-hidden flex flex-col">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50">
                                    <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Dịch vụ</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Phân loại</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Loại hình</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Giá niêm yết</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Thời lượng</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Trạng thái</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredServices.map(s => {
                                    const categoryName = serviceCategories.find(c => c.id === s.categoryId)?.name || s.category
                                    return (
                                        <tr key={s.id} className="hover:bg-gray-50/50 transition-colors group">
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 group-hover:bg-primary/10 group-hover:text-primary transition-all">
                                                        <Tag size={18} />
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-gray-900">{s.name}</p>
                                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter mt-0.5">ID: {s.id.slice(0, 8)}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <span className="px-3 py-1 bg-gray-100 text-gray-500 rounded-lg text-[10px] font-black uppercase tracking-widest">
                                                    {categoryName}
                                                </span>
                                            </td>
                                            <td className="px-8 py-5 text-center">
                                                <span className={`px-2 py-1 rounded text-[9px] font-black uppercase ${
                                                    s.type === 'package' ? 'bg-amber-100 text-amber-600' : 
                                                    s.type === 'card' ? 'bg-purple-100 text-purple-600' : 
                                                    'bg-blue-100 text-blue-600'
                                                }`}>
                                                    {s.type === 'package' ? 'Liệu trình' : s.type === 'card' ? 'Thẻ' : 'DV Lẻ'}
                                                </span>
                                            </td>
                                            <td className="px-8 py-5 text-right font-black text-gray-900">
                                                {s.price.toLocaleString('vi-VN')}đ
                                            </td>
                                            <td className="px-8 py-5 text-center">
                                                <span className="text-sm font-bold text-gray-600">{s.duration}'</span>
                                            </td>
                                            <td className="px-8 py-5 text-center">
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${s.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${s.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></span>
                                                    {s.isActive ? 'Đang hoạt động' : 'Tạm ngưng'}
                                                </span>
                                            </td>
                                            <td className="px-8 py-5 text-right">
                                                <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => openEdit(s)}
                                                        className="w-10 h-10 rounded-xl bg-white border border-gray-100 text-gray-400 hover:text-primary hover:border-primary/30 flex items-center justify-center transition-all shadow-sm active:scale-90"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                                {filteredServices.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-8 py-20 text-center">
                                            <div className="flex flex-col items-center gap-4 opacity-20">
                                                <Tag size={48} />
                                                <p className="font-black text-xl uppercase tracking-widest">Chưa có dịch vụ nào</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Modal Form */}
                {showForm && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                        <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col animate-scale-up">
                            <div className="px-8 py-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                                <div>
                                    <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">
                                        {editing ? 'Cập nhật dịch vụ' : 'Thêm dịch vụ mới'}
                                    </h2>
                                    <p className="text-xs text-gray-400 font-bold tracking-widest uppercase mt-1">Hệ thống dịch vụ Luxury</p>
                                </div>
                                <button onClick={() => setShowForm(false)} className="w-10 h-10 rounded-full bg-white border border-gray-100 text-gray-400 hover:text-gray-900 flex items-center justify-center transition-all active:scale-90 shadow-sm">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-8 space-y-6">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Tên dịch vụ *</label>
                                    <input
                                        className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all font-bold"
                                        placeholder="Ví dụ: Phun xăm thẩm mỹ Combo..."
                                        value={form.name || ''}
                                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Loại hình dịch vụ</label>
                                        <div className="grid grid-cols-3 gap-3 bg-gray-50 p-2 rounded-2xl border border-gray-100">
                                            {[
                                                { id: 'single', label: 'Dịch vụ lẻ', color: 'text-blue-600', bg: 'bg-blue-50' },
                                                { id: 'package', label: 'Liệu trình', color: 'text-amber-600', bg: 'bg-amber-50' },
                                                { id: 'card', label: 'Thẻ / Ví', color: 'text-purple-600', bg: 'bg-purple-50' },
                                            ].map(t => (
                                                <button
                                                    key={t.id}
                                                    onClick={() => setForm(f => ({ ...f, type: t.id as any }))}
                                                    className={`py-2 px-3 rounded-xl text-[10px] font-black uppercase tracking-tight transition-all border ${
                                                        form.type === t.id ? `${t.bg} ${t.color} border-${t.id}-100 shadow-sm` : 'bg-white border-transparent text-gray-400'
                                                    }`}
                                                >
                                                    {t.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Phân loại danh mục</label>
                                        <select
                                            className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl font-bold outline-none cursor-pointer focus:border-primary transition-all text-sm"
                                            value={form.categoryId || ''}
                                            onChange={e => {
                                                const cat = serviceCategories.find(c => c.id === e.target.value)
                                                setForm(f => ({ ...f, categoryId: e.target.value, category: cat?.name || '' }))
                                            }}
                                        >
                                            <option value="">-- Chọn danh mục --</option>
                                            {serviceCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Thời lượng (Phút)</label>
                                        <input
                                            type="number"
                                            className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl font-bold text-sm"
                                            value={form.duration || 0}
                                            onChange={e => setForm(f => ({ ...f, duration: Number(e.target.value) }))}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Giá niêm yết (VNĐ)</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all font-black text-lg text-primary"
                                            value={form.price || 0}
                                            onChange={e => setForm(f => ({ ...f, price: Number(e.target.value) }))}
                                        />
                                        <span className="absolute right-5 top-1/2 -translate-y-1/2 font-black text-gray-300">VNĐ</span>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                    <div>
                                        <p className="text-sm font-black text-gray-700">Trạng thái hoạt động</p>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase">Cho phép đặt lịch với dịch vụ này</p>
                                    </div>
                                    <button
                                        onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}
                                        className={`w-14 h-8 rounded-full relative transition-all ${form.isActive ? 'bg-primary' : 'bg-gray-200'}`}
                                    >
                                        <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-all ${form.isActive ? 'left-7' : 'left-1'}`}></div>
                                    </button>
                                </div>
                            </div>

                            <div className="p-8 bg-gray-50/50 border-t border-gray-50 flex gap-4">
                                <button
                                    onClick={() => setShowForm(false)}
                                    className="flex-1 py-4 bg-white border border-gray-200 rounded-2xl font-black text-gray-500 hover:bg-gray-100 transition-all active:scale-95"
                                >
                                    Hủy bỏ
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="flex-[2] py-4 bg-primary text-gray-900 rounded-2xl font-black shadow-xl shadow-primary/30 hover:bg-primary-hover transition-all active:scale-95 flex items-center justify-center gap-2"
                                >
                                    <Check size={20} />
                                    Lưu dịch vụ
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <ServiceCategoryManagementModal 
                isOpen={showCategoryModal} 
                onClose={() => setShowCategoryModal(false)} 
            />
        </div>
    )
}
