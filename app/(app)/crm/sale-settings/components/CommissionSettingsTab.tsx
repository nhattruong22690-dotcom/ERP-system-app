'use client'
import { useState } from 'react'
import { Plus, Trash2, Edit2, Shield, Info, CheckCircle2, Save, X, ChevronRight, Calculator, Settings, Power, AlertTriangle, Star, TrendingUp, Gift, Zap } from 'lucide-react'
import { generateId } from '@/lib/utils/id'

import { useModal } from '@/components/layout/ModalProvider'
import { useToast } from '@/components/layout/ToastProvider'
import { useApp } from '@/lib/auth'
import { CommissionSetting, Tier, KpiTier } from '@/lib/types'

const TRIGGER_ACTIONS = [

    { value: 'lead_phone', label: 'Lấy SĐT khách (Lead)', icon: Zap },
    { value: 'appointment_arrived', label: 'Khách Check-in (Lịch hẹn)', icon: Zap },
    { value: 'appointment_completed', label: 'Hoàn thành dịch vụ (Lịch hẹn)', icon: Zap },
    { value: 'manual', label: 'Nhập tay / Khác', icon: Zap },
]

export const CommissionSettingsTab = () => {

    const { state, saveState } = useApp()
    const policies = state.commissionSettings || []
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingPolicy, setEditingPolicy] = useState<CommissionSetting | null>(null)
    const { showConfirm } = useModal()
    const { showToast } = useToast()

    const [isSaving, setIsSaving] = useState(false)

    // Form State
    const [formData, setFormData] = useState<Partial<CommissionSetting>>({
        name: '',
        ruleCode: '',
        action: 'lead_phone',
        type: 'fixed',
        amount: 0,
        condition: '',
        isActive: true,
        tiers: [],
        kpiTiers: []
    })


    const handleOpenModal = (policy?: CommissionSetting) => {
        if (policy) {
            setEditingPolicy(policy)

            // Map old ruleCodes to actions for the UI dropdown if action is missing
            let initialAction = policy.action
            if (!initialAction) {
                if (policy.ruleCode === 'phone_collect') initialAction = 'lead_phone'
                else if (policy.ruleCode === 'appointment_set') initialAction = 'appointment_arrived'
                else if (policy.ruleCode === 'service_revenue' || policy.ruleCode === 'service_commission') initialAction = 'appointment_completed'
                else initialAction = 'manual'
            }

            setFormData({ ...policy, action: initialAction })
        } else {
            setEditingPolicy(null)
            setFormData({
                name: '',
                ruleCode: '',
                action: 'lead_phone',
                type: 'fixed',
                amount: 0,
                condition: '',
                isActive: true,
                tiers: [],
                kpiTiers: []
            })
        }
        setIsModalOpen(true)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.name || !formData.ruleCode) {
            showToast('Lỗi', 'Vui lòng nhập tên và mã quy tắc', 'error' as any)
            return
        }

        setIsSaving(true)
        try {
            const storage = await import('@/lib/storage')
            const newPolicy: CommissionSetting = {
                id: editingPolicy?.id || generateId(),
                name: formData.name!,
                ruleCode: formData.ruleCode!,
                action: formData.action || 'lead_phone',
                type: (formData.type as any) || 'fixed',
                amount: Number(formData.amount || 0),
                tiers: formData.tiers || [],
                kpiTiers: formData.kpiTiers || [],
                condition: formData.condition || '',
                isActive: formData.isActive !== false,
                createdAt: editingPolicy?.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }


            saveState(storage.saveCommissionSetting(newPolicy))
            await storage.syncCommissionSetting(newPolicy)
            showToast('Thành công', editingPolicy ? 'Đã cập nhật cấu hình' : 'Đã thêm cấu hình mới', 'success' as any)
            setIsModalOpen(false)
        } catch (error) {
            console.error(error)
            showToast('Lỗi', 'Không thể lưu cấu hình', 'error' as any)
        } finally {
            setIsSaving(false)
        }
    }

    const handleDelete = async (id: string) => {
        const confirmed = await showConfirm('Xác nhận xóa cấu hình này?')
        if (confirmed) {
            try {
                const storage = await import('@/lib/storage')
                saveState(s => ({
                    ...s,
                    commissionSettings: s.commissionSettings?.filter(p => p.id !== id)
                }))
                await storage.deleteCommissionSettingDB(id)
                showToast('Thành công', 'Đã xóa cấu hình', 'success' as any)
            } catch (error) {
                console.error(error)
                showToast('Lỗi', 'Không thể xóa cấu hình', 'error' as any)
            }
        }
    }

    const togglePolicy = async (policy: CommissionSetting) => {
        try {
            const storage = await import('@/lib/storage')
            const updated = { ...policy, isActive: !policy.isActive, updatedAt: new Date().toISOString() }
            saveState(storage.saveCommissionSetting(updated))
            await storage.syncCommissionSetting(updated)
            showToast('Thành công', updated.isActive ? 'Đã bật' : 'Đã tắt', 'success' as any)
        } catch (error) {
            console.error(error)
            showToast('Lỗi', 'Không thể cập nhật trạng thái', 'error' as any)
        }
    }

    const addTier = () => {
        const currentTiers = formData.tiers || []
        const lastTier = currentTiers[currentTiers.length - 1]
        const newMin = lastTier ? (lastTier.max || lastTier.min + 1) : 0

        setFormData({
            ...formData,
            tiers: [...currentTiers, { min: newMin, max: null, amount: 0 }]
        })
    }

    const removeTier = (index: number) => {
        setFormData({
            ...formData,
            tiers: formData.tiers?.filter((_, i) => i !== index)
        })
    }

    const updateTier = (index: number, field: keyof Tier, value: any) => {
        const newTiers = [...(formData.tiers || [])]
        newTiers[index] = { ...newTiers[index], [field]: value }
        setFormData({ ...formData, tiers: newTiers })
    }

    const addKpiTier = () => {
        const currentTiers = formData.kpiTiers || []
        setFormData({
            ...formData,
            kpiTiers: [...currentTiers, { minKpi: 0, maxKpi: null, bonusNoPayment: 0, bonusWithPayment: 0, bonusBooking: 0, bonusService: 0, bonusAmount: 0, commissionRate: 0 }]
        })
    }

    const removeKpiTier = (index: number) => {
        setFormData({
            ...formData,
            kpiTiers: formData.kpiTiers?.filter((_, i) => i !== index)
        })
    }

    const updateKpiTier = (index: number, field: keyof KpiTier, value: any) => {
        const newTiers = [...(formData.kpiTiers || [])]
        newTiers[index] = { ...newTiers[index], [field]: value }
        setFormData({ ...formData, kpiTiers: newTiers })
    }

    const applyTemplate = (type: 'sale_page' | 'sale_tele') => {
        if (type === 'sale_page') {
            setFormData({
                ...formData,
                name: 'Chính sách Team Page (Sale Page)',
                ruleCode: 'sale_page_standard',
                action: 'appointment_completed',
                type: 'kpi_tiered',
                kpiTiers: [
                    { minKpi: 90, maxKpi: null, bonusNoPayment: 0, bonusWithPayment: 10000, bonusBooking: 0, bonusService: 0, bonusAmount: 0, commissionRate: 1 },
                    { minKpi: 70, maxKpi: 90, bonusNoPayment: 0, bonusWithPayment: 5000, bonusBooking: 0, bonusService: 0, bonusAmount: 0, commissionRate: 0.5 }
                ],
                condition: 'Thưởng trên SĐT hợp lệ và % Thực thu khi đạt KPI'
            })
        } else {
            setFormData({
                ...formData,
                name: 'Chính sách Team Sale Tele (CSKH)',
                ruleCode: 'sale_tele_standard',
                action: 'appointment_arrived',
                type: 'kpi_tiered',
                kpiTiers: [
                    { minKpi: 90, maxKpi: null, bonusNoPayment: 20000, bonusWithPayment: 40000, bonusBooking: 0, bonusService: 0, bonusAmount: 0, commissionRate: 1 },
                    { minKpi: 70, maxKpi: 90, bonusNoPayment: 10000, bonusWithPayment: 20000, bonusBooking: 0, bonusService: 0, bonusAmount: 0, commissionRate: 0.5 }
                ],
                condition: 'Thưởng cố định (Check-in) và % Thực thu khi đạt KPI'
            })
        }
    }

    return (
        <div className="flex flex-col h-full space-y-6 animate-fade-in pb-10">
            {/* Header section... */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/40">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                        <Calculator size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 leading-none">Cấu hình Hoa hồng</h1>
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1.5 line-clamp-1">Thiết lập quy tắc thưởng cho Sale Page & Tele Sale</p>
                    </div>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-xs hover:bg-indigo-700 active:scale-95 transition-all shadow-lg shadow-indigo-200"
                >
                    <Plus size={16} />
                    THÊM QUY TẮC MỚI
                </button>
            </div>

            {/* Content section... */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Left side: List of policies */}
                <div className="xl:col-span-2 space-y-4">
                    {policies.length === 0 ? (
                        <div className="bg-white p-16 rounded-[2.5rem] border-2 border-dashed border-gray-100 flex flex-col items-center justify-center text-center">
                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 mb-4">
                                <Settings size={32} />
                            </div>
                            <h3 className="text-lg font-bold text-gray-400 italic">Chưa có quy tắc nào được thiết lập</h3>
                            <p className="text-xs text-gray-400 mt-2 max-w-xs">Hãy bắt đầu bằng việc thêm một quy tắc thưởng mới cho đội ngũ của bạn.</p>
                        </div>
                    ) : (
                        policies.map((policy) => (
                            <div
                                key={policy.id}
                                className={`group p-6 rounded-[2rem] border-2 transition-all hover:shadow-2xl hover:shadow-gray-200/50 relative overflow-hidden flex flex-col gap-4 ${policy.isActive ? 'bg-white border-white shadow-xl shadow-gray-200/30' : 'bg-gray-50/50 border-gray-100 opacity-70 grayscale-[0.5]'}`}
                            >
                                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                    <div className="flex items-start gap-4">
                                        <div className={`p-3 rounded-2xl shrink-0 ${policy.type === 'tiered' || policy.type === 'kpi_tiered' ? 'bg-amber-50 text-amber-500' : policy.type === 'kpi' ? 'bg-purple-50 text-purple-500' : 'bg-emerald-50 text-emerald-500'}`}>
                                            {policy.type === 'tiered' || policy.type === 'kpi_tiered' ? <TrendingUp size={24} /> : policy.type === 'kpi' ? <Star size={24} /> : <Gift size={24} />}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-lg font-black text-gray-900">{policy.name}</h3>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-[10px] font-black bg-gray-100 text-gray-500 px-2 py-0.5 rounded-md uppercase tracking-wider">{policy.ruleCode}</span>
                                                    <span className="text-[10px] font-black bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-md uppercase tracking-wider flex items-center gap-1">
                                                        <Zap size={10} />
                                                        {TRIGGER_ACTIONS.find(a => a.value === policy.action)?.label || policy.action}
                                                    </span>
                                                </div>
                                            </div>

                                            <p className="text-sm text-gray-500 font-medium mt-1">{policy.condition || 'Không có mô tả điều kiện cụ thể'}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleOpenModal(policy)}
                                            className="p-2.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                                            title="Sửa"
                                        >
                                            <Edit2 size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(policy.id)}
                                            className="p-2.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                                            title="Xóa"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                        <button
                                            onClick={() => togglePolicy(policy)}
                                            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-black text-[10px] uppercase tracking-tighter transition-all border ${policy.isActive
                                                ? 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100'
                                                : 'bg-gray-100 text-gray-400 border-gray-200 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-100'}`}
                                        >
                                            <Power size={14} />
                                            {policy.isActive ? 'ĐANG BẬT' : 'ĐÃ TẮT'}
                                        </button>
                                    </div>
                                </div>

                                {/* Rules Visualization */}
                                <div className="pl-0 md:pl-16 grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {policy.type === 'kpi_tiered' ? (
                                        <div className="col-span-1 md:col-span-2 space-y-3">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {policy.kpiTiers?.map((tier: KpiTier, idx: number) => (
                                                    <div key={idx} className="bg-amber-50/50 border border-amber-100 p-4 rounded-2xl flex flex-col gap-2 relative overflow-hidden group/tier">
                                                        <div className="absolute top-0 right-0 p-2 opacity-10 group-hover/tier:opacity-20 transition-opacity">
                                                            <TrendingUp size={40} />
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[10px] font-black bg-amber-200 text-amber-700 px-2 py-0.5 rounded-full uppercase tracking-tighter">Đạt {tier.minKpi}% {tier.maxKpi ? `- ${tier.maxKpi}%` : '+'} KPI</span>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-3 mt-1">
                                                            <div className="space-y-1">
                                                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Bonus (Payment)</p>
                                                                <p className="text-xs font-black text-gray-800">{tier.bonusWithPayment.toLocaleString()}đ</p>
                                                            </div>
                                                            <div className="space-y-1">
                                                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Bonus (No Pay)</p>
                                                                <p className="text-xs font-black text-gray-800">{tier.bonusNoPayment.toLocaleString()}đ</p>
                                                            </div>
                                                            <div className="space-y-1 col-span-2 border-t border-amber-100 pt-2 flex items-center justify-between">
                                                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Hoa hồng Thực thu</p>
                                                                <p className="text-sm font-black text-indigo-600">{tier.commissionRate}%</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : policy.type === 'tiered' ? (
                                        <div className="flex flex-wrap gap-2">
                                            {policy.tiers?.map((tier, idx) => (
                                                <div key={idx} className="bg-amber-50/50 border border-amber-100 p-3 rounded-2xl flex flex-col gap-1 min-w-[120px]">
                                                    <span className="text-[9px] font-black text-amber-600 uppercase tracking-widest leading-none">Mốc {idx + 1}</span>
                                                    <p className="text-xs font-bold text-gray-700">{tier.min} - {tier.max || '∞'}</p>
                                                    <p className="text-sm font-black text-amber-700 mt-0.5">{(tier.amount || 0).toLocaleString()}đ</p>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="bg-white border border-gray-100 p-4 rounded-2xl flex items-center justify-between">
                                            <div>
                                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none">Mức thưởng {policy.type === 'kpi' ? 'KPI' : 'Cố định'}</span>
                                                <p className="text-xl font-black text-indigo-600 mt-1">{(policy.amount || 0).toLocaleString()} VNĐ</p>
                                            </div>
                                            <div className="p-2 bg-indigo-50 text-indigo-400 rounded-lg">
                                                <CheckCircle2 size={24} />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Right side: Instructions/Info */}
                <div className="space-y-6">
                    <div className="bg-indigo-900 text-white p-8 rounded-[2.5rem] relative overflow-hidden group">
                        <Calculator className="absolute -right-8 -bottom-8 w-40 h-40 opacity-10 group-hover:scale-110 group-hover:rotate-12 transition-all duration-500" />
                        <h3 className="text-xl font-black mb-4 relative z-10 uppercase tracking-tight">HƯỚNG DẪN CẤU HÌNH</h3>
                        <div className="space-y-4 relative z-10 text-indigo-100/80 text-sm font-medium">
                            <div className="flex gap-3">
                                <div className="w-6 h-6 rounded-full bg-indigo-800 flex items-center justify-center shrink-0 border border-indigo-700 text-xs font-black">1</div>
                                <p><strong>Fixed:</strong> Thưởng một số tiền cố định cho mỗi hành động (VD: chốt lịch 20.000đ)</p>
                            </div>
                            <div className="flex gap-3">
                                <div className="w-6 h-6 rounded-full bg-indigo-800 flex items-center justify-center shrink-0 border border-indigo-700 text-xs font-black">2</div>
                                <p><strong>Tiered:</strong> Thưởng theo bậc thang số lượng (VD: lấy dưới 10 số giá 5k, trên 10 số giá 10k)</p>
                            </div>
                            <div className="flex gap-3">
                                <div className="w-6 h-6 rounded-full bg-indigo-800 flex items-center justify-center shrink-0 border border-indigo-700 text-xs font-black">3</div>
                                <p><strong>KPI:</strong> Thưởng một lần khi đạt chỉ tiêu tổng (VD: Đạt 50tr doanh thu thưởng 1tr)</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/20">
                        <div className="flex items-center gap-2 mb-4">
                            <Info size={18} className="text-amber-500" />
                            <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Lưu ý quan trọng</h3>
                        </div>
                        <ul className="space-y-3 text-xs text-gray-500 font-bold leading-relaxed list-disc pl-4">
                            <li>Mã quy tắc (`ruleCode`) phải duy nhất để hệ thống nhận diện đúng sự kiện.</li>
                            <li>Khi thay đổi mốc Tiered, bậc tiếp theo phải bắt đầu bằng hoặc lớn hơn số bậc trước đó.</li>
                            <li>Tắt cấu hình sẽ lập tức dừng việc cộng dồn hoa hồng cho các sự kiện mới.</li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Modal Form */}
            {isModalOpen && (
                <div className="modal-overlay z-[110]" onClick={e => e.target === e.currentTarget && setIsModalOpen(false)}>
                    <div className="modal max-w-2xl p-0 overflow-hidden rounded-[2.5rem] shadow-2xl animate-scale-up">
                        <div className="bg-gray-50 p-8 border-b border-gray-100 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-white rounded-2xl shadow-sm text-indigo-600 border border-indigo-50">
                                    <Settings size={24} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">{editingPolicy ? 'Chỉnh sửa quy tắc' : 'Thêm quy tắc mới'}</h3>
                                    <p className="text-[10px] text-gray-400 font-black tracking-[0.2em] uppercase mt-1">Cài đặt điều kiện & mức thưởng</p>
                                </div>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 rounded-full bg-white border border-gray-100 text-gray-400 hover:text-gray-900 flex items-center justify-center transition-all active:scale-95 shadow-sm">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2.5">Tên quy tắc</label>
                                    <input
                                        type="text"
                                        className="form-input rounded-2xl w-full border-gray-100 focus:ring-indigo-100 focus:border-indigo-600 font-bold text-sm bg-gray-50/50"
                                        placeholder="VD: Thưởng lấy số điện thoại"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2.5">Kích hoạt khi (Sự kiện)</label>
                                    <select
                                        className="form-input rounded-2xl w-full border-gray-100 focus:ring-indigo-100 focus:border-indigo-600 font-bold text-sm bg-gray-50/50"
                                        value={formData.action}
                                        onChange={e => setFormData({ ...formData, action: e.target.value })}
                                    >
                                        {TRIGGER_ACTIONS.map(a => (
                                            <option key={a.value} value={a.value}>{a.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2.5">Mã quy tắc (System Code / Slug)</label>
                                    <input
                                        type="text"
                                        className="form-input rounded-2xl w-full border-gray-100 focus:ring-indigo-100 focus:border-indigo-600 font-bold text-sm bg-gray-50/50"
                                        placeholder="VD: phone_collect"
                                        value={formData.ruleCode}
                                        onChange={e => setFormData({ ...formData, ruleCode: e.target.value })}
                                        disabled={!!editingPolicy}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2.5">Trạng thái</label>
                                    <div className="flex bg-gray-100 p-1 rounded-xl">
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, isActive: true })}
                                            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${formData.isActive ? 'bg-white shadow-sm text-emerald-600' : 'text-gray-400'}`}
                                        >
                                            KÍCH HOẠT
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, isActive: false })}
                                            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${!formData.isActive ? 'bg-white shadow-sm text-rose-600' : 'text-gray-400'}`}
                                        >
                                            TẠM TẮT
                                        </button>
                                    </div>
                                </div>
                            </div>


                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2.5">Loại quy tắc</label>
                                    <div className="flex bg-gray-100 p-1.5 rounded-2xl gap-1">
                                        {(['fixed', 'percentage', 'tiered', 'kpi', 'kpi_tiered'] as const).map(t => (
                                            <button
                                                key={t}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, type: t })}
                                                className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${formData.type === t ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
                                            >
                                                {t === 'fixed' ? 'CỐ ĐỊNH' : t === 'percentage' ? 'PHẦN TRĂM' : t === 'tiered' ? 'BẬC THANG' : t === 'kpi' ? 'KPI' : 'KPI TIER'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                {formData.type !== 'tiered' && formData.type !== 'kpi_tiered' && (
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2.5">Mức thưởng (VNĐ)</label>
                                        <input
                                            type="number"
                                            className="form-input rounded-2xl w-full border-gray-100 focus:ring-indigo-100 focus:border-indigo-600 font-bold text-sm bg-gray-50/50"
                                            value={formData.amount}
                                            onChange={e => setFormData({ ...formData, amount: Number(e.target.value) })}
                                        />
                                    </div>
                                )}
                                {formData.type === 'kpi_tiered' && (
                                    <div className="col-span-1 md:col-span-2 flex items-center gap-3">
                                        <button
                                            type="button"
                                            onClick={() => applyTemplate('sale_page')}
                                            className="flex-1 py-3 px-4 bg-blue-50 text-blue-700 border border-blue-100 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-100 transition-all flex items-center justify-center gap-2"
                                        >
                                            <Star size={14} /> Mẫu Sale Page
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => applyTemplate('sale_tele')}
                                            className="flex-1 py-3 px-4 bg-purple-50 text-purple-700 border border-purple-100 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-purple-100 transition-all flex items-center justify-center gap-2"
                                        >
                                            <Star size={14} /> Mẫu Sale Tele
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2.5">Điều kiện áp dụng</label>
                                <textarea
                                    className="form-input rounded-2xl w-full border-gray-100 focus:ring-indigo-100 focus:border-indigo-600 font-bold text-sm bg-gray-50/50 h-24"
                                    placeholder="Mô tả cụ thể điều kiện để hưởng quy tắc này..."
                                    value={formData.condition}
                                    onChange={e => setFormData({ ...formData, condition: e.target.value })}
                                />
                            </div>

                            {formData.type === 'tiered' && (
                                <div className="space-y-4 pt-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Cấu hình bậc thang số lượng</label>
                                        <button
                                            type="button"
                                            onClick={addTier}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-tight hover:bg-indigo-100 transition-all border border-indigo-100"
                                        >
                                            <Plus size={14} /> Thêm bậc
                                        </button>
                                    </div>

                                    {(formData.tiers || []).length === 0 && (
                                        <div className="p-10 border-2 border-dashed border-gray-100 rounded-[1.5rem] flex flex-col items-center justify-center bg-gray-50/20">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase">Chưa có phân bậc nào</p>
                                        </div>
                                    )}

                                    <div className="space-y-3">
                                        {(formData.tiers || []).map((tier, idx) => (
                                            <div key={idx} className="flex flex-wrap items-end gap-3 p-4 bg-white border border-gray-100 rounded-2xl shadow-sm animate-in slide-in-from-left-2 duration-300">
                                                <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-[10px] font-black text-indigo-600 shrink-0">{idx + 1}</div>
                                                <div className="flex-1 min-w-[80px]">
                                                    <label className="block text-[8px] font-black text-gray-400 uppercase mb-1.5">Mốc từ</label>
                                                    <input type="number" className="form-input rounded-xl w-full text-xs font-bold" value={tier.min} onChange={e => updateTier(idx, 'min', Number(e.target.value))} />
                                                </div>
                                                <div className="flex-1 min-w-[80px]">
                                                    <label className="block text-[8px] font-black text-gray-400 uppercase mb-1.5">Đến (để trống: ∞)</label>
                                                    <input type="number" className="form-input rounded-xl w-full text-xs font-bold" value={tier.max || ''} placeholder="∞" onChange={e => updateTier(idx, 'max', e.target.value ? Number(e.target.value) : null)} />
                                                </div>
                                                <div className="flex-1 min-w-[80px]">
                                                    <label className="block text-[8px] font-black text-gray-400 uppercase mb-1.5">Mức thưởng</label>
                                                    <input type="number" className="form-input rounded-xl w-full text-xs font-bold" value={tier.amount} onChange={e => updateTier(idx, 'amount', Number(e.target.value))} />
                                                </div>
                                                <button type="button" onClick={() => removeTier(idx)} className="p-2.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"><Trash2 size={16} /></button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {formData.type === 'kpi_tiered' && (
                                <div className="space-y-4 pt-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Cấu hình Bậc KPI Cá nhân</label>
                                        <button
                                            type="button"
                                            onClick={addKpiTier}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-600 rounded-xl text-[10px] font-black uppercase tracking-tight hover:bg-amber-100 transition-all border border-amber-100"
                                        >
                                            <Plus size={14} /> Thêm bậc KPI
                                        </button>
                                    </div>

                                    {(formData.kpiTiers || []).length === 0 && (
                                        <div className="p-10 border-2 border-dashed border-gray-100 rounded-[1.5rem] flex flex-col items-center justify-center bg-gray-50/20">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase">Chưa có phân bậc KPI nào</p>
                                        </div>
                                    )}

                                    <div className="space-y-4">
                                        {(formData.kpiTiers || []).map((tier, idx) => (
                                            <div key={idx} className="p-5 bg-white border border-gray-100 rounded-[2rem] shadow-sm space-y-4 animate-in slide-in-from-bottom-2 duration-300">
                                                <div className="flex items-center justify-between gap-4 border-b border-gray-50 pb-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center text-[10px] font-black text-amber-600">#{idx + 1}</div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[8px] font-black text-gray-400 uppercase tracking-tighter">Từ KPI (%):</span>
                                                            <input type="number" className="w-16 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-xs font-black text-center" value={tier.minKpi} onChange={e => updateKpiTier(idx, 'minKpi', Number(e.target.value))} />
                                                            <span className="text-[8px] font-black text-gray-400 uppercase tracking-tighter">Đến:</span>
                                                            <input type="number" className="w-16 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-xs font-black text-center" value={tier.maxKpi || ''} placeholder="∞" onChange={e => updateKpiTier(idx, 'maxKpi', e.target.value ? Number(e.target.value) : null)} />
                                                        </div>
                                                    </div>
                                                    <button type="button" onClick={() => removeKpiTier(idx)} className="p-2 text-gray-300 hover:text-rose-500 transition-colors"><Trash2 size={16} /></button>
                                                </div>

                                                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                                                    <div>
                                                        <label className="block text-[8px] font-black text-gray-400 uppercase mb-1.5">Bonus (Không phát sinh phí)</label>
                                                        <input type="number" className="form-input rounded-xl w-full text-xs font-bold bg-gray-50/50" value={tier.bonusNoPayment} onChange={e => updateKpiTier(idx, 'bonusNoPayment', Number(e.target.value))} />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[8px] font-black text-gray-400 uppercase mb-1.5">Bonus (Có phát sinh phí)</label>
                                                        <input type="number" className="form-input rounded-xl w-full text-xs font-bold bg-gray-50/50" value={tier.bonusWithPayment} onChange={e => updateKpiTier(idx, 'bonusWithPayment', Number(e.target.value))} />
                                                    </div>
                                                    <div className="col-span-2 lg:col-span-1">
                                                        <label className="block text-[8px] font-black text-gray-400 uppercase mb-1.5">Hoa hồng Thực thu (%)</label>
                                                        <div className="relative">
                                                            <input type="number" step="0.1" className="form-input rounded-xl w-full text-xs font-bold bg-gray-50/50 pr-8" value={tier.commissionRate} onChange={e => updateKpiTier(idx, 'commissionRate', Number(e.target.value))} />
                                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">%</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </form>

                        <div className="p-8 bg-gray-50 flex justify-between items-center rounded-b-[2.5rem]">
                            <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 bg-white border border-gray-100 text-gray-600 rounded-2xl font-black text-xs hover:bg-gray-100 transition-all shadow-sm">HỦY BỎ</button>
                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={isSaving}
                                className="px-10 py-3 bg-indigo-600 text-white rounded-2xl font-black text-xs hover:bg-indigo-700 active:scale-95 transition-all shadow-lg shadow-indigo-200 flex items-center gap-2"
                            >
                                {isSaving ? <Settings className="animate-spin" size={16} /> : <Save size={16} />}
                                {editingPolicy ? 'LƯU THAY ĐỔI' : 'TẠO QUY TẮC'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
