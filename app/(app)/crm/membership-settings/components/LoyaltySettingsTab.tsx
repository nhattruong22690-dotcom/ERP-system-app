'use client'
import { useState } from 'react'
import { Save, Zap, Info, ShieldCheck, Power, RefreshCcw } from 'lucide-react'
import { useApp } from '@/lib/auth'
import { useToast } from '@/components/layout/ToastProvider'
import { LoyaltySettings } from '@/lib/types'

export const LoyaltySettingsTab = () => {
    const { state, saveState } = useApp()
    const { showToast } = useToast()
    const [isSaving, setIsSaving] = useState(false)

    // Initial state from app state or defaults
    const [formData, setFormData] = useState<LoyaltySettings>(
        state.loyaltySettings || {
            id: 'default',
            pointsPerVnd: 0.00001, // 1 point per 100,000
            vndPerPoint: 1000,     // 1 point = 1,000
            isActive: true,
            updatedAt: new Date().toISOString()
        }
    )

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSaving(true)
        try {
            const storage = await import('@/lib/storage')
            const updated: LoyaltySettings = {
                ...formData,
                updatedAt: new Date().toISOString()
            }

            saveState(storage.saveLoyaltySettings(updated))
            await storage.syncLoyaltySettings(updated, state.currentUserId)

            showToast('Thành công', 'Đã lưu cấu hình tích điểm', 'success')
        } catch (error) {
            console.error(error)
            showToast('Lỗi', 'Không thể lưu cấu hình', 'error')
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <div className="flex flex-col space-y-6 animate-fade-in pb-10 max-w-4xl mx-auto">
            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/40">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
                            <Zap size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-gray-900 leading-none uppercase tracking-tight">Tích điểm & Quy đổi</h2>
                            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1.5">Thiết lập tỷ lệ nhận điểm và giá trị quy đổi</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-tighter transition-all border ${formData.isActive
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                            : 'bg-gray-100 text-gray-400 border-gray-200'}`}
                    >
                        <Power size={14} />
                        {formData.isActive ? 'HỆ THỐNG ĐANG BẬT' : 'HỆ THỐNG ĐANG TẮT'}
                    </button>
                </div>

                <form onSubmit={handleSave} className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Tỷ lệ tích lũy */}
                        <div className="space-y-4 p-6 bg-gray-50/50 rounded-3xl border border-gray-100">
                            <div className="flex items-center gap-2 mb-2">
                                <h3 className="text-sm font-black text-gray-700 uppercase tracking-widest">Tỷ lệ Tích lũy</h3>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2.5">Mỗi 1 VNĐ chi tiêu được:</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        step="0.000001"
                                        className="form-input rounded-2xl w-full border-white/50 focus:ring-amber-100 focus:border-amber-600 font-black text-lg bg-white shadow-sm pr-16 h-14"
                                        value={formData.pointsPerVnd}
                                        onChange={e => setFormData({ ...formData, pointsPerVnd: Number(e.target.value) })}
                                    />
                                    <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[10px] font-black text-amber-600 uppercase">Điểm</span>
                                </div>
                            </div>
                            <div className="pt-2">
                                <p className="text-[10px] font-bold text-gray-400 italic">
                                    Ví dụ: {formData.pointsPerVnd === 0.00001 ? "Tiêu 100.000 VNĐ được 1 điểm" : `Tiêu 100.000 VNĐ được ${Math.round(100000 * formData.pointsPerVnd)} điểm`}
                                </p>
                            </div>
                        </div>

                        {/* Tỷ lệ quy đổi */}
                        <div className="space-y-4 p-6 bg-gray-50/50 rounded-3xl border border-gray-100">
                            <div className="flex items-center gap-2 mb-2">
                                <h3 className="text-sm font-black text-gray-700 uppercase tracking-widest">Giá trị Quy đổi</h3>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2.5">1 Điểm tương đương:</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        step="1"
                                        className="form-input rounded-2xl w-full border-white/50 focus:ring-emerald-100 focus:border-emerald-600 font-black text-lg bg-white shadow-sm pr-16 h-14"
                                        value={formData.vndPerPoint}
                                        onChange={e => setFormData({ ...formData, vndPerPoint: Number(e.target.value) })}
                                    />
                                    <span className="absolute right-5 top-1/2 -translate-y-1/2 text-[10px] font-black text-emerald-600 uppercase">VNĐ</span>
                                </div>
                            </div>
                            <div className="pt-2">
                                <p className="text-[10px] font-bold text-gray-400 italic">
                                    Ví dụ: Có 100 điểm có thể giảm trừ {Math.round(100 * formData.vndPerPoint).toLocaleString()} VNĐ
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100 flex items-start gap-3">
                        <Info size={16} className="text-amber-500 mt-0.5 shrink-0" />
                        <p className="text-[11px] font-bold text-amber-700 leading-relaxed">
                            <strong>Lưu ý:</strong> Khi thay đổi tỷ lệ tích điểm, các khách hàng đang có điểm sẽ không bị ảnh hưởng. Tỷ lệ mới chỉ áp dụng cho các Phiếu dịch vụ hoàn thành sau thời điểm thay đổi.
                        </p>
                    </div>

                    <div className="flex justify-end pt-4">
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="flex items-center gap-2 px-10 py-4 bg-gray-900 text-white rounded-2xl font-black text-xs hover:bg-black active:scale-95 transition-all shadow-xl shadow-gray-200"
                        >
                            {isSaving ? <RefreshCcw size={16} className="animate-spin" /> : <Save size={16} />}
                            LƯU CÀI ĐẶT NGAY
                        </button>
                    </div>
                </form>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col items-center text-center">
                    <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 mb-4 font-black text-xs shrink-0">1</div>
                    <h4 className="text-xs font-black text-gray-900 uppercase tracking-widest mb-2">Tạo Niềm Tin</h4>
                    <p className="text-[10px] font-bold text-gray-400 leading-relaxed">Hệ thống điểm thưởng rành mạch giúp khách hàng cảm thấy được trân trọng qua từng lần sử dụng dịch vụ.</p>
                </div>
                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col items-center text-center">
                    <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 mb-4 font-black text-xs shrink-0">2</div>
                    <h4 className="text-xs font-black text-gray-900 uppercase tracking-widest mb-2">Thúc Đẩy Chi Tiêu</h4>
                    <p className="text-[10px] font-bold text-gray-400 leading-relaxed">Cơ chế thăng hạng kích thích nhu cầu sử dụng thêm dịch vụ để đạt mức ưu đãi cao hơn.</p>
                </div>
                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col items-center text-center">
                    <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 mb-4 font-black text-xs shrink-0">3</div>
                    <h4 className="text-xs font-black text-gray-900 uppercase tracking-widest mb-2">Quản Lý Dễ Dàng</h4>
                    <p className="text-[10px] font-bold text-gray-400 leading-relaxed">Tự động hóa hoàn toàn việc tính toán, giúp nhân viên không phải cộng điểm thủ công.</p>
                </div>
            </div>
        </div>
    )
}
