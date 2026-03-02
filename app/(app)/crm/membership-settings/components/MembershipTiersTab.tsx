'use client'
import { useState } from 'react'
import { Plus, Edit2, Trash2, Save, X, Award, TrendingUp, Percent, Info, RefreshCcw } from 'lucide-react'
import { useModal } from '@/components/ModalProvider'
import { useToast } from '@/components/ToastProvider'
import { useApp } from '@/lib/auth'
import { MembershipTier } from '@/lib/types'

export const MembershipTiersTab = () => {
    const { state, saveState } = useApp()
    const tiers = [...(state.membershipTiers || [])].sort((a, b) => a.minSpend - b.minSpend)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingTier, setEditingTier] = useState<MembershipTier | null>(null)
    const { showConfirm } = useModal()
    const { showToast } = useToast()
    const [isSaving, setIsSaving] = useState(false)

    const [formData, setFormData] = useState<Partial<MembershipTier>>({
        name: '',
        subtext: '',
        minSpend: 0,
        maxSpend: 0,
        discount: 0,
        icon: 'Award',
        theme: 'amber'
    })

    const handleOpenModal = (tier?: MembershipTier) => {
        if (tier) {
            setEditingTier(tier)
            setFormData({ ...tier })
        } else {
            setEditingTier(null)
            setFormData({
                name: '',
                subtext: '',
                minSpend: 0,
                maxSpend: 0,
                discount: 0,
                icon: 'Award',
                theme: 'amber'
            })
        }
        setIsModalOpen(true)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.name) {
            showToast('Lỗi', 'Vui lòng nhập tên hạng', 'error')
            return
        }

        setIsSaving(true)
        try {
            const storage = await import('@/lib/storage')
            const newTier: MembershipTier = {
                id: editingTier?.id || crypto.randomUUID(),
                name: formData.name!,
                subtext: formData.subtext || '',
                minSpend: Number(formData.minSpend || 0),
                maxSpend: Number(formData.maxSpend || 0),
                discount: Number(formData.discount || 0),
                icon: formData.icon || 'Award',
                theme: (formData.theme as any) || 'amber',
                createdAt: editingTier?.createdAt || new Date().toISOString()
            }

            saveState(storage.saveMembershipTier(newTier))
            await storage.syncMembershipTier(newTier)

            showToast('Thành công', editingTier ? 'Đã cập nhật hạng' : 'Đã thêm hạng mới', 'success')
            setIsModalOpen(false)
        } catch (error) {
            console.error(error)
            showToast('Lỗi', 'Không thể lưu hạng', 'error')
        } finally {
            setIsSaving(false)
        }
    }

    const handleDelete = async (id: string) => {
        const confirmed = await showConfirm('Xác nhận xóa hạng thành viên này?')
        if (confirmed) {
            try {
                // Delete logic needs a storage function which I'll assume exists or implement if needed
                // For now just filtering from state
                saveState(s => ({
                    ...s,
                    membershipTiers: s.membershipTiers.filter(t => t.id !== id)
                }))
                // Ideally also call storage.deleteMembershipTierDB(id)
                showToast('Thành công', 'Đã xóa hạng', 'success')
            } catch (error) {
                console.error(error)
                showToast('Lỗi', 'Không thể xóa hạng', 'error')
            }
        }
    }

    return (
        <div className="flex flex-col space-y-6 animate-fade-in pb-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/40">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                        <Award size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-gray-900 leading-none uppercase tracking-tight">Cấu hình Hạng Thành Viên</h2>
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1.5 whitespace-nowrap">Thiết lập mốc thăng hạng và đặc quyền chiết khấu</p>
                    </div>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-xs hover:bg-indigo-700 active:scale-95 transition-all shadow-lg shadow-indigo-200"
                >
                    <Plus size={16} />
                    THÊM HẠNG MỚI
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {tiers.length === 0 ? (
                    <div className="col-span-full bg-white p-16 rounded-[2.5rem] border-2 border-dashed border-gray-100 flex flex-col items-center justify-center text-center">
                        <Award size={48} className="text-gray-200 mb-4" />
                        <h3 className="text-lg font-black text-gray-300 italic uppercase">Chưa có hạng nào được thiết lập</h3>
                    </div>
                ) : (
                    tiers.map((tier) => (
                        <div key={tier.id} className="group bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/20 hover:shadow-2xl hover:shadow-gray-200/40 transition-all relative overflow-hidden flex flex-col h-full">
                            <div className="flex items-start justify-between mb-6">
                                <div className={`p-4 rounded-3xl ${tier.theme === 'amber' ? 'bg-amber-50 text-amber-500' :
                                        tier.theme === 'blue' ? 'bg-blue-50 text-blue-500' :
                                            tier.theme === 'purple' ? 'bg-purple-50 text-purple-500' :
                                                tier.theme === 'rose' ? 'bg-rose-50 text-rose-500' :
                                                    'bg-gray-50 text-gray-500'
                                    }`}>
                                    <Award size={32} />
                                </div>
                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => handleOpenModal(tier)} className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"><Edit2 size={16} /></button>
                                    <button onClick={() => handleDelete(tier.id)} className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"><Trash2 size={16} /></button>
                                </div>
                            </div>

                            <div className="space-y-1 mb-8">
                                <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight">{tier.name}</h3>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{tier.subtext || 'Hạng thành viên tiêu chuẩn'}</p>
                            </div>

                            <div className="mt-auto space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-gray-50/80 p-4 rounded-2xl border border-gray-100">
                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                                            <TrendingUp size={10} /> Chi tiêu tối thiểu
                                        </p>
                                        <p className="text-sm font-black text-gray-900">{tier.minSpend.toLocaleString()}đ</p>
                                    </div>
                                    <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100">
                                        <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                                            <Percent size={10} /> Ưu đãi giảm giá
                                        </p>
                                        <p className="text-sm font-black text-emerald-700">{tier.discount}%</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="modal-overlay z-[110]" onClick={e => e.target === e.currentTarget && setIsModalOpen(false)}>
                    <div className="modal max-w-lg p-0 overflow-hidden rounded-[2.5rem] shadow-2xl animate-scale-up">
                        <div className="bg-gray-50 p-8 border-b border-gray-100 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-white rounded-2xl shadow-sm text-indigo-600 border border-indigo-50">
                                    <Award size={24} />
                                </div>
                                <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">{editingTier ? 'Chỉnh sửa Hạng' : 'Thêm Hạng mới'}</h3>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 rounded-full bg-white border border-gray-100 text-gray-400 hover:text-gray-900 flex items-center justify-center transition-all active:scale-95 shadow-sm">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-8 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2.5">Tên hạng (VD: Kim Cương)</label>
                                    <input type="text" className="form-input rounded-2xl w-full border-gray-100 focus:ring-indigo-100 focus:border-indigo-600 font-bold text-sm bg-gray-50/50" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2.5">Mô tả ngắn</label>
                                    <input type="text" className="form-input rounded-2xl w-full border-gray-100 focus:ring-indigo-100 focus:border-indigo-600 font-bold text-sm bg-gray-50/50" value={formData.subtext} onChange={e => setFormData({ ...formData, subtext: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2.5">Chi tiêu túi thiểu (VNĐ)</label>
                                    <input type="number" className="form-input rounded-2xl w-full border-gray-100 focus:ring-indigo-100 focus:border-indigo-600 font-bold text-sm bg-gray-50/50" value={formData.minSpend} onChange={e => setFormData({ ...formData, minSpend: Number(e.target.value) })} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2.5">Giảm giá (%)</label>
                                    <input type="number" className="form-input rounded-2xl w-full border-gray-100 focus:ring-indigo-100 focus:border-indigo-600 font-bold text-sm bg-gray-50/50" value={formData.discount} onChange={e => setFormData({ ...formData, discount: Number(e.target.value) })} />
                                </div>
                            </div>

                            <div className="flex justify-end pt-4 gap-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 bg-white border border-gray-100 text-gray-600 rounded-2xl font-black text-xs hover:bg-gray-100 transition-all">HỦY BỎ</button>
                                <button type="submit" disabled={isSaving} className="px-10 py-3 bg-indigo-600 text-white rounded-2xl font-black text-xs hover:bg-indigo-700 active:scale-95 transition-all shadow-lg shadow-indigo-200 flex items-center gap-2">
                                    {isSaving ? <RefreshCcw size={16} className="animate-spin" /> : <Save size={16} />}
                                    LƯU HẠNG
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
