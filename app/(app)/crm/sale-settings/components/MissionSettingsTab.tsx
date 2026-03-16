'use client'
import { useState, useMemo, useEffect } from 'react'
import { Target, Plus, Trash2, Edit2 } from 'lucide-react'
import { generateId } from '@/lib/utils/id'
import { useApp } from '@/lib/auth'
import { UserMission } from '@/lib/types'
import { saveUserMission, syncUserMission } from '@/lib/storage'
import { useToast } from '@/components/layout/ToastProvider'

export const MissionSettingsTab = () => {
    const { state, saveState } = useApp()
    const { showToast } = useToast()
    const [selectedStaff, setSelectedStaff] = useState<string>('')
    const [isSaving, setIsSaving] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')

    // 1. Staff List (Lấy từ User Role Sale)
    const staffList = useMemo(() => {
        return state.users.filter(u => u.role === 'admin' || u.role === 'staff')
            .filter(u => u.displayName?.toLowerCase().includes(searchQuery.toLowerCase()))
    }, [state.users, searchQuery])

    // Auto select first staff
    useEffect(() => {
        if (!selectedStaff && staffList.length > 0) {
            setSelectedStaff(staffList[0].id)
        }
    }, [staffList, selectedStaff])

    // 1.5. Lấy danh sách các Cấu hình Hoa hồng loại "KPI"
    const kpiBonuses = useMemo(() => {
        return state.commissionSettings?.filter(s => s.type === 'kpi' && s.isActive) || []
    }, [state.commissionSettings])

    const staffInfo = useMemo(() => staffList.find(s => s.id === selectedStaff), [staffList, selectedStaff])

    // 2. Draft Missions (Nhiệm vụ đang cấu hình tạm trên giao diện)
    const [draftMissions, setDraftMissions] = useState<UserMission[]>([])

    // Khi chọn Staff Mới => Load Nhiệm vụ cũ của Staff đó vào Draft
    useEffect(() => {
        if (!selectedStaff || !state.userMissions) return
        const existing = state.userMissions.filter(m => m.userId === selectedStaff && m.isActive)
        setDraftMissions(existing)
    }, [selectedStaff, state.userMissions])

    // 3. Logic: Thêm cấu hình Nhiệm vụ trống
    const handleAddMission = (cycle: 'daily' | 'weekly' | 'monthly', metricType: 'booking_count' | 'revenue_total' | 'lead_count') => {
        if (!selectedStaff) return
        const newMission: UserMission = {
            id: generateId(),
            userId: selectedStaff,
            cycle,
            metricType,
            targetValue: metricType === 'revenue_total' ? 50000000 : 10,
            currentValue: 0,
            rewardAmount: kpiBonuses.length > 0 ? kpiBonuses[0].amount : 0,
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }
        setDraftMissions(prev => [...prev, newMission])
    }

    // Xóa khỏi Draft
    const handleRemoveMission = (id: string) => {
        setDraftMissions(prev => prev.filter(m => m.id !== id))
    }

    // Cập nhật giá trị Draft
    const handleUpdateMission = (id: string, field: keyof UserMission, value: any) => {
        setDraftMissions(prev => prev.map(m => m.id === id ? { ...m, [field]: value } : m))
    }

    // 4. Lưu Toàn bộ Draft vào Database (Xóa cũ - Ghi mới)
    const handleSaveMissions = async () => {
        if (!selectedStaff) return
        setIsSaving(true)
        try {
            // Đánh dấu Inactive bản ghi cũ
            const oldMissions = state.userMissions?.filter(m => m.userId === selectedStaff && m.isActive) || []
            for (const old of oldMissions) {
                const deactivated = { ...old, isActive: false, updatedAt: new Date().toISOString() }
                saveState(saveUserMission(deactivated))
                await syncUserMission(deactivated)
            }

            // Upsert bản ghi mới
            for (const draft of draftMissions) {
                const newRecord = { ...draft, isActive: true, updatedAt: new Date().toISOString() }
                saveState(saveUserMission(newRecord))
                await syncUserMission(newRecord)
            }

            showToast('Thành công', 'Đã lưu cấu hình Nhiệm vụ mới')
        } catch (error) {
            console.error(error)
            showToast('Lỗi', 'Không thể lưu cài đặt. Vui lòng thử lại.', 'error' as any)
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <div className="bg-gray-50/50 p-6 rounded-[2.5rem] border border-gray-100">
            <div className="max-w-6xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Thiết lập Nhiệm vụ (Missions)</h1>
                        <p className="text-xs font-bold text-gray-500 mt-1 uppercase tracking-widest">Gán chỉ tiêu Ngày/Tuần/Tháng cho từng cá nhân</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

                    {/* Sidebar: Danh sách nhân sự */}
                    <div className="lg:col-span-1 space-y-4">
                        <div className="relative">
                            <span className="material-icons-round absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">search</span>
                            <input
                                type="text"
                                placeholder="Tìm nhân viên..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-2xl font-bold text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                            />
                        </div>

                        <div className="bg-white rounded-[2rem] border border-gray-100 p-2 space-y-1 h-[500px] overflow-y-auto custom-scrollbar">
                            {staffList.map(staff => (
                                <button
                                    key={staff.id}
                                    onClick={() => setSelectedStaff(staff.id)}
                                    className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all ${selectedStaff === staff.id ? 'bg-indigo-50 border border-indigo-100' : 'hover:bg-gray-50 border border-transparent'
                                        }`}
                                >
                                    <img src={`https://ui-avatars.com/api/?name=${staff.displayName}&background=random`} className="w-10 h-10 rounded-full" />
                                    <div className="text-left flex-1 min-w-0">
                                        <p className={`text-sm font-black truncate ${selectedStaff === staff.id ? 'text-indigo-900' : 'text-gray-900'}`}>{staff.displayName}</p>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{staff.role}</p>
                                    </div>
                                    <span className="material-icons-round text-sm text-gray-300">chevron_right</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Main Content: Cấu hình Nhiệm vụ */}
                    <div className="lg:col-span-3 space-y-6">

                        <div className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-sm border border-gray-100 relative overflow-hidden">
                            {/* Nút lưu góc trên */}
                            <button
                                onClick={handleSaveMissions}
                                disabled={isSaving || !selectedStaff}
                                className="absolute top-6 right-6 px-4 py-2 bg-indigo-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-colors shadow-md flex items-center gap-2 z-10 disabled:opacity-50"
                            >
                                <span className="material-icons-round text-sm">{isSaving ? 'sync' : 'save'}</span> {isSaving ? 'Đang lưu...' : 'Lưu chỉ tiêu'}
                            </button>

                            <div className="flex items-center gap-4 border-b border-gray-50 pb-6 mb-6">
                                <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500">
                                    <span className="material-icons-round text-3xl">emoji_events</span>
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-gray-900">Chỉ tiêu của {staffInfo?.displayName || 'Chưa chọn'}</h2>
                                    <p className="text-xs font-bold text-gray-500 mt-1 uppercase tracking-widest">
                                        Chu kỳ: Tất cả &#8226; Loại: {staffInfo?.role || 'Chưa rõ'}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-8">
                                {/* NHÓM DAILY */}
                                <div className="space-y-4">
                                    <h3 className="text-sm font-black text-gray-900 flex items-center gap-2 uppercase tracking-widest">
                                        <span className="material-icons-round text-blue-500 text-lg">today</span> Nhiệm vụ Hàng ngày (Daily)
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {draftMissions.filter(m => m.cycle === 'daily').map(mission => (
                                            <div key={mission.id} className="bg-gray-50 rounded-2xl p-4 border border-gray-200 hover:border-blue-300 transition-colors group">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div>
                                                        <select
                                                            value={mission.metricType}
                                                            onChange={(e) => handleUpdateMission(mission.id, 'metricType', e.target.value as any)}
                                                            className="text-xs font-black text-gray-900 bg-transparent outline-none border-b border-dashed border-gray-300 cursor-pointer"
                                                        >
                                                            {(staffInfo?.displayName?.toLowerCase().includes('page') || staffInfo?.title?.toLowerCase().includes('page')) ? (
                                                                <>
                                                                    <option value="lead_count">SĐT hợp lệ (Page)</option>
                                                                    <option value="revenue_total">Doanh thu chuẩn</option>
                                                                </>
                                                            ) : (staffInfo?.displayName?.toLowerCase().includes('tele') || staffInfo?.title?.toLowerCase().includes('tele')) ? (
                                                                <>
                                                                    <option value="booking_count">Số lượng Check-in</option>
                                                                    <option value="revenue_total">Doanh thu đạt chuẩn</option>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <option value="booking_count">Số lượng Check-in</option>
                                                                    <option value="revenue_total">Doanh thu tiêu chuẩn</option>
                                                                    <option value="lead_count">Số điện thoại mang về</option>
                                                                </>
                                                            )}
                                                        </select>
                                                        <p className="text-[10px] text-gray-500 font-bold uppercase mt-1 tracking-widest">Target mỗi ngày</p>
                                                    </div>
                                                    <button onClick={() => handleRemoveMission(mission.id)} className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-red-400 hover:text-red-600 shadow-sm">
                                                        <span className="material-icons-round text-sm">delete</span>
                                                    </button>
                                                </div>
                                                <div className="flex items-center gap-3 relative">
                                                    <input
                                                        type="number"
                                                        value={mission.targetValue}
                                                        onChange={(e) => handleUpdateMission(mission.id, 'targetValue', Number(e.target.value))}
                                                        className="w-full pl-3 pr-8 bg-white border border-gray-300 text-right font-black rounded-xl py-2 outline-none focus:border-blue-500 text-blue-700 text-lg"
                                                    />
                                                </div>
                                                <div className="mt-4 pt-4 border-t border-gray-200">
                                                    <p className="text-[10px] font-black uppercase text-gray-400 mb-2">Thưởng nóng (Đồng bộ Hoa Hồng)</p>
                                                    {kpiBonuses.length > 0 ? (
                                                        <select
                                                            value={mission.rewardAmount}
                                                            onChange={(e) => handleUpdateMission(mission.id, 'rewardAmount', Number(e.target.value))}
                                                            className="w-full bg-white border border-emerald-200 text-right font-black rounded-xl py-2 px-3 outline-none focus:border-emerald-500 text-emerald-600 text-lg cursor-pointer max-w-full"
                                                        >
                                                            <option value={0} disabled>-- Chọn mức thưởng --</option>
                                                            {kpiBonuses.map(b => (
                                                                <option key={b.id} value={b.amount}>
                                                                    {b.name || b.ruleCode} ({b.amount.toLocaleString()} ₫)
                                                                </option>
                                                            ))}
                                                        </select>
                                                    ) : (
                                                        <div className="text-xs text-red-500 font-bold bg-red-50 p-2 rounded-lg border border-red-100">
                                                            Chưa có Cấu hình Hoa hồng Nhóm KPI
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}

                                        <button onClick={() => handleAddMission('daily', 'booking_count')} className="bg-white border-2 border-dashed border-gray-300 rounded-2xl p-4 text-gray-400 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 transition-all flex flex-col items-center justify-center gap-2">
                                            <span className="material-icons-round text-3xl">add_circle</span>
                                            <span className="text-xs font-black uppercase tracking-widest">Thêm nhiệm vụ Ngày</span>
                                        </button>
                                    </div>
                                </div>

                                {/* NHÓM WEEKLY */}
                                <div className="space-y-4 pt-4">
                                    <h3 className="text-sm font-black text-gray-900 flex items-center gap-2 uppercase tracking-widest">
                                        <span className="material-icons-round text-purple-500 text-lg">date_range</span> Nhiệm vụ Hàng tuần (Weekly)
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {draftMissions.filter(m => m.cycle === 'weekly').map(mission => (
                                            <div key={mission.id} className="bg-gray-50 rounded-2xl p-4 border border-gray-200 hover:border-purple-300 transition-colors group">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div>
                                                        <select
                                                            value={mission.metricType}
                                                            onChange={(e) => handleUpdateMission(mission.id, 'metricType', e.target.value as any)}
                                                            className="text-xs font-black text-gray-900 bg-transparent outline-none border-b border-dashed border-gray-300 cursor-pointer"
                                                        >
                                                            <option value="booking_count">Số lượng Check-in</option>
                                                            <option value="revenue_total">Doanh thu đạt chuẩn</option>
                                                            <option value="lead_count">Số điện thoại hợp lệ (Page)</option>
                                                        </select>
                                                        <p className="text-[10px] text-gray-500 font-bold uppercase mt-1 tracking-widest">Target mỗi tuần</p>
                                                    </div>
                                                    <button onClick={() => handleRemoveMission(mission.id)} className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-red-400 hover:text-red-600 shadow-sm">
                                                        <span className="material-icons-round text-sm">delete</span>
                                                    </button>
                                                </div>
                                                <div className="flex items-center gap-3 relative">
                                                    <input
                                                        type="number"
                                                        value={mission.targetValue}
                                                        onChange={(e) => handleUpdateMission(mission.id, 'targetValue', Number(e.target.value))}
                                                        className="w-full pl-3 pr-8 bg-white border border-gray-300 text-right font-black rounded-xl py-2 outline-none focus:border-purple-500 text-purple-700 text-lg"
                                                    />
                                                </div>
                                                <div className="mt-4 pt-4 border-t border-gray-200">
                                                    <p className="text-[10px] font-black uppercase text-gray-400 mb-2">Thưởng nóng (Đồng bộ Hoa Hồng)</p>
                                                    {kpiBonuses.length > 0 ? (
                                                        <select
                                                            value={mission.rewardAmount}
                                                            onChange={(e) => handleUpdateMission(mission.id, 'rewardAmount', Number(e.target.value))}
                                                            className="w-full bg-white border border-emerald-200 text-right font-black rounded-xl py-2 px-3 outline-none focus:border-emerald-500 text-emerald-600 text-lg cursor-pointer max-w-full"
                                                        >
                                                            <option value={0} disabled>-- Chọn mức thưởng --</option>
                                                            {kpiBonuses.map(b => (
                                                                <option key={b.id} value={b.amount}>
                                                                    {b.name || b.ruleCode} ({b.amount.toLocaleString()} ₫)
                                                                </option>
                                                            ))}
                                                        </select>
                                                    ) : (
                                                        <div className="text-xs text-red-500 font-bold bg-red-50 p-2 rounded-lg border border-red-100">
                                                            Chưa có Cấu hình Hoa hồng Nhóm KPI
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}

                                        <button onClick={() => handleAddMission('weekly', 'revenue_total')} className="bg-white border-2 border-dashed border-gray-300 rounded-2xl p-4 text-gray-400 hover:bg-purple-50 hover:text-purple-600 hover:border-purple-300 transition-all flex flex-col items-center justify-center gap-2">
                                            <span className="material-icons-round text-3xl">add_circle</span>
                                            <span className="text-xs font-black uppercase tracking-widest">Thêm nhiệm vụ Tuần</span>
                                        </button>
                                    </div>
                                </div>

                                {/* NHÓM MONTHLY - NEW */}
                                <div className="space-y-4 pt-4 border-t border-gray-100 mt-4">
                                    <h3 className="text-sm font-black text-gray-900 flex items-center gap-2 uppercase tracking-widest">
                                        <span className="material-icons-round text-rose-500 text-lg">calendar_month</span> Nhiệm vụ Hàng tháng (Monthly)
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {draftMissions.filter(m => m.cycle === 'monthly').map(mission => (
                                            <div key={mission.id} className="bg-gray-50 rounded-2xl p-4 border border-gray-200 hover:border-rose-300 transition-colors group">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div>
                                                        <select
                                                            value={mission.metricType}
                                                            onChange={(e) => handleUpdateMission(mission.id, 'metricType', e.target.value as any)}
                                                            className="text-xs font-black text-gray-900 bg-transparent outline-none border-b border-dashed border-gray-300 cursor-pointer"
                                                        >
                                                            {(staffInfo?.displayName?.toLowerCase().includes('page') || staffInfo?.title?.toLowerCase().includes('page')) ? (
                                                                <>
                                                                    <option value="lead_count">SĐT hợp lệ tháng (Page)</option>
                                                                    <option value="revenue_total">Doanh thu tổng tháng</option>
                                                                </>
                                                            ) : (staffInfo?.displayName?.toLowerCase().includes('tele') || staffInfo?.title?.toLowerCase().includes('tele')) ? (
                                                                <>
                                                                    <option value="revenue_total">Doanh thu thực thu tháng</option>
                                                                    <option value="booking_count">Số khách đến (Tele)</option>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <option value="revenue_total">Doanh thu tổng tháng</option>
                                                                    <option value="lead_count">SĐT hợp lệ tháng</option>
                                                                    <option value="booking_count">Số khách đến tháng</option>
                                                                </>
                                                            )}
                                                        </select>
                                                        <p className="text-[10px] text-gray-500 font-bold uppercase mt-1 tracking-widest">Chỉ tiêu tháng</p>
                                                    </div>
                                                    <button onClick={() => handleRemoveMission(mission.id)} className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-red-400 hover:text-red-600 shadow-sm">
                                                        <span className="material-icons-round text-sm">delete</span>
                                                    </button>
                                                </div>
                                                <div className="flex items-center gap-3 relative">
                                                    <input
                                                        type="number"
                                                        value={mission.targetValue}
                                                        onChange={(e) => handleUpdateMission(mission.id, 'targetValue', Number(e.target.value))}
                                                        className="w-full pl-3 pr-8 bg-white border border-gray-300 text-right font-black rounded-xl py-2 outline-none focus:border-rose-500 text-rose-700 text-lg"
                                                    />
                                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-400">{mission.metricType === 'revenue_total' ? 'VNĐ' : 'Số'}</span>
                                                </div>
                                                <div className="mt-4 pt-4 border-t border-gray-200">
                                                    <p className="text-[10px] font-black uppercase text-gray-400 mb-2">Thưởng vượt KPI (Nếu có)</p>
                                                    {kpiBonuses.length > 0 ? (
                                                        <select
                                                            value={mission.rewardAmount}
                                                            onChange={(e) => handleUpdateMission(mission.id, 'rewardAmount', Number(e.target.value))}
                                                            className="w-full bg-white border border-emerald-200 text-right font-black rounded-xl py-2 px-3 outline-none focus:border-emerald-500 text-emerald-600 text-lg cursor-pointer max-w-full"
                                                        >
                                                            <option value={0}>-- Không có thưởng thêm --</option>
                                                            {kpiBonuses.map(b => (
                                                                <option key={b.id} value={b.amount}>
                                                                    {b.name || b.ruleCode} ({b.amount.toLocaleString()} ₫)
                                                                </option>
                                                            ))}
                                                        </select>
                                                    ) : (
                                                        <div className="text-xs text-slate-400 font-bold bg-slate-50 p-2 rounded-lg border border-slate-100 text-center">
                                                            Thưởng theo Bậc KPI đã cấu hình
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}

                                        <button onClick={() => handleAddMission('monthly', 'revenue_total')} className="bg-white border-2 border-dashed border-gray-300 rounded-2xl p-4 text-gray-400 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-300 transition-all flex flex-col items-center justify-center gap-2">
                                            <span className="material-icons-round text-3xl">add_circle</span>
                                            <span className="text-xs font-black uppercase tracking-widest">Thêm nhiệm vụ Tháng</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    )
}
