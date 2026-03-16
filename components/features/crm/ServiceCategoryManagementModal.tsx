'use client'
import { useState } from 'react'
import { useApp } from '@/lib/auth'
import { ServiceCategory } from '@/lib/types'
import { saveServiceCategory, deleteServiceCategoryDB, removeServiceCategoryState, syncServiceCategory } from '@/lib/storage'
import { Plus, Edit2, X, Trash2, Tag, Check, ArrowRight, Search } from 'lucide-react'
import { useModal } from '@/components/layout/ModalProvider'
import { useToast } from '@/components/layout/ToastProvider'
import { generateId } from '@/lib/utils/id'

interface ServiceCategoryManagementModalProps {
    isOpen: boolean
    onClose: () => void
}

export default function ServiceCategoryManagementModal({ isOpen, onClose }: ServiceCategoryManagementModalProps) {
    const { currentUser, state, saveState } = useApp()
    const { showAlert, showConfirm } = useModal()
    const { showToast } = useToast()
    const [showForm, setShowForm] = useState(false)
    const [editing, setEditing] = useState<ServiceCategory | null>(null)
    const [form, setForm] = useState<Partial<ServiceCategory>>({})
    const [search, setSearch] = useState('')

    const canEdit = currentUser?.role === 'admin' || currentUser?.role === 'manager'

    if (!isOpen) return null

    function openNew() {
        setForm({
            isActive: true
        })
        setEditing(null)
        setShowForm(true)
    }

    function openEdit(c: ServiceCategory) {
        setForm({ ...c })
        setEditing(c)
        setShowForm(true)
    }

    async function handleSave() {
        if (!form.name) { await showAlert('Vui lòng nhập tên danh mục'); return }
        
        const cat: ServiceCategory = {
            id: editing?.id ?? generateId(),
            name: form.name!,
            description: form.description ?? '',
            isActive: form.isActive ?? true,
            createdAt: editing?.createdAt ?? new Date().toISOString(),
        }

        saveState(saveServiceCategory(cat))
        syncServiceCategory(cat)

        showToast('Lưu thành công', `Đã lưu danh mục ${cat.name}`)
        setShowForm(false)
    }

    async function handleDelete(id: string) {
        const cat = state.serviceCategories?.find(c => c.id === id)
        if (!cat) return
        if (!await showConfirm(`Bạn có chắc muốn xóa danh mục "${cat.name}"?`)) return
        
        const catName = cat.name
        saveState(removeServiceCategoryState(id))
        
        const { deleteServiceCategoryDB: del } = await import('@/lib/storage')
        await del(id)
        
        showToast('Đã xóa', `Danh mục ${catName} đã được xóa khỏi hệ thống`, 'info')
    }

    const filtered = (state.serviceCategories || [])
        .filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()))
        .sort((a, b) => a.name.localeCompare(b.name))

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div className="bg-white w-full max-w-4xl max-h-[85vh] rounded-[2rem] shadow-2xl overflow-hidden flex flex-col animate-scale-up border border-gray-100 relative" onClick={e => e.stopPropagation()}>
                
                {/* Modal Header */}
                <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-sm">
                            <Tag size={20} strokeWidth={2.5} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Danh mục dịch vụ</h2>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-none mt-1">Phân loại & Quản lý</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {canEdit && (
                            <button
                                onClick={openNew}
                                className="px-5 py-2.5 bg-primary text-gray-900 rounded-xl text-[11px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:bg-primary-hover transition-all active:scale-95 flex items-center gap-2"
                            >
                                <Plus size={16} strokeWidth={3} />
                                Thêm mới
                            </button>
                        )}
                        <button onClick={onClose} className="w-10 h-10 rounded-xl bg-white border border-gray-100 text-gray-400 hover:text-rose-500 flex items-center justify-center transition-all shadow-sm active:scale-90">
                            <X size={22} />
                        </button>
                    </div>
                </div>

                {/* Sub-Header: Search */}
                <div className="px-8 py-4 border-b border-gray-50 bg-white shrink-0 flex items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Tìm nhanh danh mục..."
                            className="w-full pl-11 pr-5 py-3 bg-gray-50/50 border border-gray-100 rounded-2xl text-[13px] font-bold focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="px-4 py-2 bg-gray-50 rounded-xl text-[10px] font-black text-gray-400 uppercase tracking-widest border border-gray-100">
                        Tổng số: <span className="text-gray-900">{filtered.length}</span>
                    </div>
                </div>

                {/* Content: Simple Table */}
                <div className="flex-1 overflow-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 bg-white z-10 shadow-sm">
                            <tr>
                                <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Danh mục</th>
                                <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Mô tả</th>
                                <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 text-center">Trạng thái</th>
                                <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 text-right">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-8 py-20 text-center opacity-20">
                                        <Tag size={48} className="mx-auto mb-4" />
                                        <p className="font-black uppercase tracking-widest">Không có dữ liệu</p>
                                    </td>
                                </tr>
                            ) : (
                                filtered.map(c => (
                                    <tr key={c.id} className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 group-hover:bg-primary/20 group-hover:text-primary transition-all">
                                                    <Tag size={14} />
                                                </div>
                                                <span className="font-black text-gray-900">{c.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <p className="text-xs text-gray-500 italic line-clamp-1 max-w-xs">{c.description || '---'}</p>
                                        </td>
                                        <td className="px-8 py-5 text-center">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${c.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${c.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`}></span>
                                                {c.isActive ? 'Hoạt động' : 'Tắt'}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => openEdit(c)} className="w-9 h-9 rounded-xl bg-white border border-gray-100 text-gray-400 hover:text-primary hover:border-primary/30 flex items-center justify-center transition-all shadow-sm active:scale-90">
                                                    <Edit2 size={14} strokeWidth={2.5} />
                                                </button>
                                                <button onClick={() => handleDelete(c.id)} className="w-9 h-9 rounded-xl bg-white border border-gray-100 text-gray-400 hover:text-rose-500 hover:border-rose-100 flex items-center justify-center transition-all shadow-sm active:scale-90">
                                                    <Trash2 size={14} strokeWidth={2.5} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Inner Overlay Form: Simplified */}
                {showForm && (
                    <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/40 backdrop-blur-md animate-fade-in overflow-y-auto">
                        <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl border border-gray-100 p-8 animate-scale-up" onClick={e => e.stopPropagation()}>
                            <div className="flex justify-between items-center mb-8">
                                <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tighter italic">
                                    {editing ? 'Cập nhật' : 'Thêm mới'} <span className="text-primary not-italic">Danh mục</span>
                                </h3>
                                <button onClick={() => setShowForm(false)} className="w-10 h-10 rounded-full border border-gray-50 flex items-center justify-center text-gray-400 hover:text-rose-500 transition-all">
                                    <X size={20} strokeWidth={3} />
                                </button>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Tên danh mục *</label>
                                    <input
                                        className="w-full bg-gray-50/50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all placeholder:text-gray-300 italic"
                                        value={form.name ?? ''}
                                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                        placeholder="Ví dụ: Chăm sóc mặt nâng cao..."
                                        autoFocus
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Mô tả ngắn</label>
                                    <textarea
                                        className="w-full bg-gray-50/50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all min-h-[100px] resize-none italic placeholder:text-gray-300"
                                        value={form.description ?? ''}
                                        onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                        placeholder="Ghi chú về nhóm dịch vụ này..."
                                    />
                                </div>
                                <div 
                                    onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}
                                    className={`p-4 rounded-2xl border-2 flex items-center justify-between cursor-pointer transition-all ${form.isActive ? 'border-primary bg-primary/5' : 'border-gray-100 bg-gray-50 opacity-40'}`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${form.isActive ? 'bg-primary text-gray-900 shadow-md shadow-primary/20' : 'bg-white text-gray-300 shadow-sm'}`}>
                                            <Check size={18} strokeWidth={3} />
                                        </div>
                                        <div>
                                            <p className="text-[11px] font-black uppercase tracking-widest text-gray-900">Đang hoạt động</p>
                                            <p className="text-[9px] font-bold text-gray-400 italic">Hiển thị trong hệ thống</p>
                                        </div>
                                    </div>
                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${form.isActive ? 'border-primary bg-primary' : 'border-gray-200'}`}>
                                        {form.isActive && <Check size={12} strokeWidth={4} />}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-10 flex gap-4">
                                <button
                                    className="flex-1 py-4 bg-gray-50 text-gray-400 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-rose-50 hover:text-rose-500 transition-all border border-gray-100"
                                    onClick={() => setShowForm(false)}
                                >
                                    Bỏ qua
                                </button>
                                <button
                                    className="flex-[2] py-4 bg-primary text-gray-900 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-primary/20 hover:bg-primary-hover transition-all active:scale-95 flex items-center justify-center gap-2"
                                    onClick={handleSave}
                                >
                                    Xác nhận lưu
                                    <ArrowRight size={18} />
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
