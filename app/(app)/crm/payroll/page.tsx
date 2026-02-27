'use client'
import { useState, useMemo, useRef, useEffect } from 'react'
import { useApp } from '@/lib/auth'
import { useToast } from '@/components/ToastProvider'
import { calculateLeadCommission, calculateKpiTieredCommissions, calculateAppointmentCommissions } from '@/lib/calculations'
import {
    Calendar, Clock, FileText, Calculator,
    ChevronLeft, ChevronRight,
    Plus, Star, AlertTriangle, CreditCard, CheckCircle2, Gift, PlusCircle
} from 'lucide-react'
import PageHeader from '@/components/PageHeader'

// New Component Imports
import PayslipModal from './components/PayslipModal'
import KpiDetailsModal from './components/KpiDetailsModal'
import PayrollFormModals from './components/PayrollFormModals'
import { SummaryHeader, SummaryBody } from './components/SummaryTable'
import TabTables from './components/TabTables'

const formatVND = (amount: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)

const EMPTY_FORM = { userId: '', type: '', amount: '', period: '', date: new Date().toISOString().split('T')[0], note: '' }

export default function PayrollPage() {
    const { state, saveState, currentUser } = useApp()
    const { showToast } = useToast()
    const [selectedDate, setSelectedDate] = useState(new Date())
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedBranch, setSelectedBranch] = useState('all')
    const [activeTab, setActiveTab] = useState<'summary' | 'bonus' | 'deduction' | 'advance' | 'commission_approval'>('summary')
    const [showBonusModal, setShowBonusModal] = useState(false)
    const [showDeductionModal, setShowDeductionModal] = useState(false)
    const [showAdvanceModal, setShowAdvanceModal] = useState(false)
    const [showAddUserModal, setShowAddUserModal] = useState(false)
    const [showPayslipModal, setShowPayslipModal] = useState(false)
    const [selectedPayslipData, setSelectedPayslipData] = useState<any>(null)
    const [form, setForm] = useState<any>(EMPTY_FORM)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [showDetailsModal, setShowDetailsModal] = useState(false)
    const [selectedDetailData, setSelectedDetailData] = useState<any>(null)

    const monthStr = `${selectedDate.getFullYear()}-${(selectedDate.getMonth() + 1).toString().padStart(2, '0')}`
    const isAdminOrAccounting = currentUser?.role === 'admin' || currentUser?.role === 'accountant' || currentUser?.role === 'director'

    const payrollData = useMemo(() => {
        // Lấy danh sách Roster của tháng
        const currentRosterUserIds = state.payrollRosters?.filter(r => r.period === monthStr).map(r => r.userId) || []

        // CHỈ LẤY những nhân viên có trong Roster
        const usersInRoster = state.users.filter(u => currentRosterUserIds.includes(u.id))

        return usersInRoster.map(user => {
            const userAttendance = (state.attendance || []).filter(a => a.userId === user.id && a.date.startsWith(monthStr))
            const totalWorkDays = userAttendance.reduce((acc, curr) => {
                if (curr.status === 'present') return acc + 1
                if (curr.status === 'half_leave') return acc + 0.5
                return acc
            }, 0)

            const rawConfig: any = user.salaryConfig || {}
            const config = {
                type: rawConfig.type || 'working_days',
                standardDays: rawConfig.standardDays || 26,
                baseSalary: rawConfig.baseSalary || 0,
                allowances: rawConfig.allowances || [],
                revenueRate: rawConfig.revenueRate || 0
            }
            const totalAllowance = config.allowances.reduce((s: number, a: any) => s + (a.amount || 0), 0)

            let basePay = 0
            if (config.type === 'fixed') {
                basePay = config.baseSalary
            } else {
                basePay = Math.round((config.baseSalary / (config.standardDays || 26)) * totalWorkDays)
            }

            // --- V13: Additional components ---
            const userBonuses = (state.bonuses || []).filter(b => b.userId === user.id && b.period === monthStr)
            const manualBonusTotal = userBonuses.reduce((s, b) => s + (b.amount || 0), 0)

            // Commission (sale team - auto & manual)
            const leadComm = calculateLeadCommission(state.leads || [], state.commissionSettings || [], user.id, monthStr)
            const aptComm = calculateAppointmentCommissions(state.appointments || [], state.commissionSettings || [], user.id, monthStr)

            // V22: KPI Tiered Calculation for Sale teams
            const kpiCommission = calculateKpiTieredCommissions(user.id, monthStr, state)

            const logsCommission = (state.commissionLogs || []).filter(c =>
                c.userId === user.id && c.status === 'approved' &&
                c.createdAt?.startsWith(monthStr.substring(0, 7)) &&
                // Chỉ loại trừ nếu thực sự có rule tự động tương ứng đang trả về giá trị (để tránh double counting)
                !(leadComm.amount > 0 && (c.type === 'lead_hot_phone' || c.type === 'lead_cold_phone')) &&
                !(aptComm.amount > 0 && c.type === 'sale_tele_high_value')
            ).reduce((s, c) => s + (c.amount || 0), 0)

            const pendingLogsCommission = (state.commissionLogs || []).filter(c =>
                c.userId === user.id && c.status === 'pending' &&
                c.createdAt?.startsWith(monthStr.substring(0, 7))
            ).reduce((s, c) => s + (c.amount || 0), 0)

            if (user.displayName.includes('DEBUG')) {
                console.log(`Payroll Debug [${user.displayName}]:`, {
                    leadCommCount: leadComm.count,
                    leadCommAmount: leadComm.amount,
                    aptCommAmount: aptComm.amount,
                    kpiPct: kpiCommission.kpiPct,
                    kpiBonus: kpiCommission.bonusKpi,
                    kpiComm: kpiCommission.commissionAmount,
                    logsComm: logsCommission
                });
            }

            // Tách biệt Thưởng KPI và Hoa hồng theo yêu cầu
            const totalBonus = manualBonusTotal + kpiCommission.bonusKpi
            const userCommission = leadComm.amount + aptComm.amount + logsCommission + kpiCommission.commissionAmount

            // Attach details for modal
            const kpiDetails = {
                leads: kpiCommission.matchedLeads || [],
                appointments: kpiCommission.matchedAppointments || [],
                breakdown: kpiCommission.details || [],
                targetKpi: kpiCommission.targetKpi || 0,
                actualKpi: kpiCommission.actualKpi || 0
            }

            // Revenue share for managers
            let revenueShareAmount = 0
            if (config.revenueRate > 0 && user.branchId) {
                const branchRevenue = (state.appointments || []).filter(a =>
                    a.branchId === user.branchId &&
                    a.appointmentDate?.startsWith(monthStr)
                ).reduce((s, a) => s + (a.price || 0), 0)
                revenueShareAmount = Math.round(branchRevenue * config.revenueRate)
            }

            const userDeductions = (state.deductions || []).filter(d => d.userId === user.id && d.period === monthStr)
            const totalDeduction = userDeductions.reduce((s, d) => s + (d.amount || 0), 0)

            const userAdvances = (state.salaryAdvances || []).filter(a => a.userId === user.id && a.period === monthStr && a.status === 'paid')
            const totalAdvance = userAdvances.reduce((s, a) => s + (a.amount || 0), 0)

            const netPay = basePay + totalAllowance + totalBonus + userCommission + revenueShareAmount - totalDeduction - totalAdvance

            return {
                user, totalWorkDays, baseSalary: config.baseSalary, totalAllowance,
                config, basePay, totalBonus, revenueShareAmount, userCommission,
                leadComm, aptComm, logsCommission, pendingLogsCommission,
                kpiCommission, // New: for detailed tracking
                kpiDetails, // Needed for the modal breakdown
                totalDeduction, totalAdvance, netPay,
                branch: state.branches.find(b => b.id === user.branchId),
                jobTitle: state.jobTitles?.find(jt => jt.id === user.jobTitleId)
            }
        })
    }, [state.users, state.attendance, state.branches, state.jobTitles, state.bonuses,
    state.deductions, state.salaryAdvances, state.commissionLogs, state.appointments, state.payrollRosters,
    state.leads, state.userMissions, state.commissionSettings, monthStr])

    const userOptionsForSelect = useMemo(() => {
        return state.users.filter(u => u.workStatus !== 'resigned').map(u => ({
            id: u.id,
            name: u.displayName,
            username: u.username,
            subtitle: state.jobTitles?.find(jt => jt.id === u.jobTitleId)?.name || 'Chưa có chức vụ/phòng ban'
        }))
    }, [state.users, state.jobTitles])

    const activeRosterUserOptions = useMemo(() => {
        return userOptionsForSelect.filter(o =>
            state.payrollRosters?.some(r => r.period === monthStr && r.userId === o.id)
        )
    }, [userOptionsForSelect, state.payrollRosters, monthStr])

    const isRosterEmpty = payrollData.length === 0

    const filteredData = useMemo(() => payrollData.filter(item => {
        const matchesSearch = item.user.displayName.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesBranch = selectedBranch === 'all' || item.user.branchId === selectedBranch
        return matchesSearch && matchesBranch
    }), [payrollData, searchTerm, selectedBranch])

    const totalPayout = filteredData.reduce((acc, cur) => acc + cur.netPay, 0)

    const prevMonth = () => { const d = new Date(selectedDate); d.setMonth(d.getMonth() - 1); setSelectedDate(d) }
    const nextMonth = () => { const d = new Date(selectedDate); d.setMonth(d.getMonth() + 1); setSelectedDate(d) }

    // --- Roster Actions ---
    const handleInitRoster = async () => {
        if (!isAdminOrAccounting) return
        setIsSubmitting(true)
        try {
            const storage = await import('@/lib/storage')
            // Lấy toàn bộ user đang đi làm (không tính resigned)
            const activeUsersForInit = state.users.filter(u => u.workStatus !== 'resigned')

            const newRosters: import('@/lib/types').PayrollRoster[] = activeUsersForInit.map(u => ({
                id: crypto.randomUUID(),
                period: monthStr,
                userId: u.id,
                createdBy: currentUser?.id,
                createdAt: new Date().toISOString()
            }))

            const success = await storage.bulkSyncPayrollRosters(newRosters)
            if (success) {
                saveState(storage.saveBulkPayrollRosters(newRosters))
                showToast('Khởi tạo thành công', `Đã thêm ${newRosters.length} nhân sự vào bảng lương tháng ${monthStr}`, 'success' as any)
            }
        } catch (error) {
            console.error(error)
            showToast('Lỗi khởi tạo', 'Không thể khởi tạo bảng lương', 'error' as any)
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleAddUserToRoster = async (userId: string) => {
        if (!isAdminOrAccounting || !userId) return
        setIsSubmitting(true)
        try {
            const storage = await import('@/lib/storage')
            const roster: import('@/lib/types').PayrollRoster = {
                id: crypto.randomUUID(),
                period: monthStr,
                userId: userId,
                createdBy: currentUser?.id,
                createdAt: new Date().toISOString()
            }
            const success = await storage.syncPayrollRoster(roster)
            if (success) {
                saveState(storage.savePayrollRoster(roster))
                showToast('Đã thêm', `Đã bổ sung nhân sự vào bảng lương tháng này`, 'success' as any)
            }
        } catch (error) {
            showToast('Lỗi', 'Không thể thêm nhân sự', 'error' as any)
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleDeleteRoster = async (userId: string) => {
        if (!isAdminOrAccounting || !confirm('Xác nhận xóa nhân sự này khỏi bảng lương tháng? Dữ liệu điểm danh của họ trong tháng này sẽ bị ẩn.')) return
        setIsSubmitting(true)
        try {
            const storage = await import('@/lib/storage')
            const success = await storage.deletePayrollRoster(monthStr, userId)
            if (success) {
                saveState(storage.removePayrollRoster(monthStr, userId))
                showToast('Đã xóa', 'Đã xóa nhân sự khỏi danh sách lương tháng.', 'success' as any)
            }
        } catch (error) {
            showToast('Lỗi', 'Không thể xóa nhân sự', 'error' as any)
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleToggleKpiConfirm = async (type: 'lead' | 'appointment', id: string, currentStatus: boolean) => {
        if (!isAdminOrAccounting) return

        let note = ''
        if (currentStatus) { // Nếu đang confirm -> chuyển sang exclude
            note = prompt('Lý do loại bỏ khỏi KPI?') || ''
            if (!note) return
        }

        setIsSubmitting(true)
        try {
            const storage = await import('@/lib/storage')
            const now = new Date().toISOString()
            const updateData = {
                kpi_confirmed: !currentStatus,
                kpi_exclusion_note: note,
                kpi_excluded_by: currentUser?.id,
                kpi_excluded_at: now
            }

            let success = false
            if (type === 'lead') {
                success = await storage.updateLeadKpiStatus(id, updateData)
                if (success) {
                    saveState(s => ({
                        ...s,
                        leads: s.leads.map(l => l.id === id ? {
                            ...l,
                            kpiConfirmed: !currentStatus,
                            kpiExclusionNote: note,
                            kpiExcludedBy: currentUser?.displayName || currentUser?.id,
                            kpiExcludedAt: now
                        } : l)
                    }))
                }
            } else {
                success = await storage.updateAppointmentKpiStatus(id, updateData)
                if (success) {
                    saveState(s => ({
                        ...s,
                        appointments: s.appointments.map(a => a.id === id ? {
                            ...a,
                            kpiConfirmed: !currentStatus,
                            kpiExclusionNote: note,
                            kpiExcludedBy: currentUser?.displayName || currentUser?.id,
                            kpiExcludedAt: now
                        } : a)
                    }))
                }
            }

            if (success) {
                showToast('Thành công', `Đã cập nhật trạng thái KPI`, 'success' as any)
                // Cập nhật local copy để modal thay đổi ngay lập tức
                if (selectedDetailData) {
                    const updateItem = (items: any[]) => items.map(it => it.id === id ? {
                        ...it,
                        kpiConfirmed: !currentStatus,
                        kpiExclusionNote: note,
                        kpiExcludedBy: currentUser?.displayName || currentUser?.id,
                        kpiExcludedAt: now
                    } : it)

                    setSelectedDetailData((prev: any) => ({
                        ...prev,
                        kpiDetails: {
                            ...prev.kpiDetails,
                            leads: type === 'lead' ? updateItem(prev.kpiDetails.leads) : prev.kpiDetails.leads,
                            appointments: type === 'appointment' ? updateItem(prev.kpiDetails.appointments) : prev.kpiDetails.appointments,
                        }
                    }))
                }
            }
        } catch (error) {
            console.error(error)
            showToast('Lỗi', 'Không thể cập nhật trạng thái', 'error' as any)
        } finally {
            setIsSubmitting(false)
        }
    }

    // --- Action helpers ---
    const handleAddBonus = async () => {
        if (!form.userId || !form.amount || !form.type) { showToast('Thiếu thông tin', 'Vui lòng điền đầy đủ.', 'error' as any); return }
        setIsSubmitting(true)
        try {
            const storage = await import('@/lib/storage')
            const isEditing = !!form.id
            const bonus = {
                id: form.id || crypto.randomUUID(),
                userId: form.userId,
                type: form.type,
                amount: Number(form.amount),
                date: form.date,
                period: form.period || monthStr,
                note: form.note,
                createdBy: currentUser?.id,
                createdAt: form.createdAt || new Date().toISOString()
            }
            await storage.syncBonus(bonus)
            if (isEditing) saveState(storage.updateBonus(bonus))
            else saveState(storage.saveBonus(bonus))
            showToast('Thành công', isEditing ? 'Đã cập nhật thưởng.' : 'Khoản thưởng đã được lưu.', 'success' as any)
            setForm(EMPTY_FORM); setShowBonusModal(false)
        } catch (e) { showToast('Lỗi', 'Có lỗi xảy ra.', 'error' as any) }
        finally { setIsSubmitting(false) }
    }

    const handleDeleteBonus = async (id: string) => {
        if (!confirm('Xóa khoản thưởng này?')) return
        setIsSubmitting(true)
        try {
            const storage = await import('@/lib/storage')
            await storage.deleteBonus(id)
            saveState(storage.removeBonus(id))
            showToast('Đã xóa', 'Khoản thưởng đã bị xóa.', 'success' as any)
        } catch (e) { showToast('Lỗi', 'Xóa thất bại.', 'error' as any) }
        finally { setIsSubmitting(false) }
    }

    const handleAddDeduction = async () => {
        if (!form.userId || !form.amount) { showToast('Thiếu thông tin', 'Vui lòng điền đầy đủ.', 'error' as any); return }
        setIsSubmitting(true)
        try {
            const storage = await import('@/lib/storage')
            const isEditing = !!form.id
            const ded: import('@/lib/types').Deduction = {
                id: form.id || crypto.randomUUID(),
                userId: form.userId,
                type: 'violation',
                amount: Number(form.amount),
                date: form.date,
                period: form.period || monthStr,
                note: form.note,
                createdBy: currentUser?.id,
                createdAt: form.createdAt || new Date().toISOString()
            }
            await storage.syncDeduction(ded)
            if (isEditing) saveState(storage.updateDeduction(ded))
            else saveState(storage.saveDeduction(ded))
            showToast('Thành công', isEditing ? 'Đã cập nhật vi phạm.' : 'Khoản giảm trừ đã được lưu.', 'success' as any)
            setForm(EMPTY_FORM); setShowDeductionModal(false)
        } catch (e) { showToast('Lỗi', 'Có lỗi xảy ra.', 'error' as any) }
        finally { setIsSubmitting(false) }
    }

    const handleDeleteDeduction = async (id: string) => {
        if (!confirm('Xóa khoản vi phạm này?')) return
        setIsSubmitting(true)
        try {
            const storage = await import('@/lib/storage')
            await storage.deleteDeduction(id)
            saveState(storage.removeDeduction(id))
            showToast('Đã xóa', 'Khoản vi phạm đã bị xóa.', 'success' as any)
        } catch (e) { showToast('Lỗi', 'Xóa thất bại.', 'error' as any) }
        finally { setIsSubmitting(false) }
    }

    const handleAddAdvance = async (autoApprove: boolean) => {
        if (!form.userId || !form.amount) { showToast('Thiếu thông tin', 'Vui lòng điền đầy đủ.', 'error' as any); return }
        setIsSubmitting(true)
        try {
            const storage = await import('@/lib/storage')
            const isEditing = !!form.id
            const adv: import('@/lib/types').SalaryAdvance = {
                id: form.id || crypto.randomUUID(),
                userId: form.userId,
                amount: Number(form.amount),
                date: form.date,
                period: form.period || monthStr,
                status: isEditing ? form.status : (autoApprove ? 'approved' : 'pending'),
                note: form.note,
                createdBy: currentUser?.id,
                approvedBy: autoApprove && !isEditing ? currentUser?.id : form.approvedBy,
                createdAt: form.createdAt || new Date().toISOString()
            }
            await storage.syncSalaryAdvance(adv)
            if (isEditing) saveState(storage.updateSalaryAdvance(adv))
            else saveState(storage.saveSalaryAdvance(adv))
            showToast('Thành công', isEditing ? 'Đã cập nhật đơn ứng lương.' : (autoApprove ? 'Ứng lương đã được duyệt.' : 'Đã ghi nhận yêu cầu ứng lương, chờ duyệt.'), 'success' as any)
            setForm(EMPTY_FORM); setShowAdvanceModal(false)
        } catch (e) { showToast('Lỗi', 'Có lỗi xảy ra.', 'error' as any) }
        finally { setIsSubmitting(false) }
    }

    const handleDeleteAdvance = async (id: string) => {
        if (!confirm('Xóa đơn ứng lương này?')) return
        setIsSubmitting(true)
        try {
            const storage = await import('@/lib/storage')
            await storage.deleteSalaryAdvance(id)
            saveState(storage.removeSalaryAdvance(id))
            showToast('Đã xóa', 'Đơn ứng lương đã bị xóa.', 'success' as any)
        } catch (e) { showToast('Lỗi', 'Xóa thất bại.', 'error' as any) }
        finally { setIsSubmitting(false) }
    }

    const handleApproveAdvance = async (adv: any) => {
        try {
            const storage = await import('@/lib/storage')
            const updated = {
                ...adv,
                status: 'approved',
                approvedBy: currentUser?.id,
                approvedAt: new Date().toISOString()
            }
            await storage.syncSalaryAdvance(updated)
            saveState(storage.updateSalaryAdvance(updated))
            showToast('Đã duyệt', 'Đơn ứng lương đã được phê duyệt. Xin hãy "Xác nhận đã chi" sau khi chuyển tiền.', 'success' as any)
        } catch (e) { showToast('Lỗi', 'Không thể duyệt.', 'error' as any) }
    }

    const handleRejectAdvance = async (adv: any) => {
        try {
            const storage = await import('@/lib/storage')
            const updated = { ...adv, status: 'rejected', approvedBy: currentUser?.id }
            await storage.syncSalaryAdvance(updated)
            saveState(storage.updateSalaryAdvance(updated))
            showToast('Đã từ chối', 'Đơn ứng lương đã bị từ chối.', 'error' as any)
        } catch (e) { showToast('Lỗi', 'Không thể xử lý.', 'error' as any) }
    }

    const handleApproveCommission = async (log: any) => {
        try {
            const storage = await import('@/lib/storage')
            const updated = {
                ...log,
                status: 'approved',
                updatedAt: new Date().toISOString()
            }
            await storage.syncCommissionLog(updated)
            saveState(storage.saveCommissionLog(updated))
            showToast('Đã duyệt', 'Khoản hoa hồng đã được ghi nhận vào lương.', 'success' as any)
        } catch (e) { showToast('Lỗi', 'Không thể duyệt.', 'error' as any) }
    }

    const handleRejectCommission = async (log: any) => {
        if (!confirm('Bạn có chắc chắn muốn hủy yêu cầu hoa hồng này?')) return
        try {
            const storage = await import('@/lib/storage')
            const updated = {
                ...log,
                status: 'cancelled',
                updatedAt: new Date().toISOString()
            }
            await storage.syncCommissionLog(updated)
            saveState(storage.saveCommissionLog(updated))
            showToast('Đã từ chối', 'Giao dịch hoa hồng đã được hủy.', 'info' as any)
        } catch (e) { showToast('Lỗi', 'Không thể xử lý.', 'error' as any) }
    }


    const handleMarkAsPaidAdvance = async (adv: any) => {
        const note = prompt('Nhập ghi chú chi tiền (VD: Số lệnh chuyển khoản, ngày chi thực tế...):', '')
        if (note === null) return // User cancelled

        try {
            const storage = await import('@/lib/storage')
            const updated = {
                ...adv,
                status: 'paid',
                paidBy: currentUser?.id,
                paidAt: new Date().toISOString(),
                paidNote: note
            }
            await storage.syncSalaryAdvance(updated)
            saveState(storage.updateSalaryAdvance(updated))
            showToast('Đã xác nhận chi tiền', 'Khoản ứng này sẽ được trừ vào lương cuối tháng.', 'success' as any)
        } catch (e) { showToast('Lỗi', 'Không thể xử lý.', 'error' as any) }
    }

    // Data for adjustment tabs
    const monthBonuses = useMemo(() => (state.bonuses || []).filter(b => b.period === monthStr), [state.bonuses, monthStr])
    const monthDeductions = useMemo(() => (state.deductions || []).filter(d => d.period === monthStr), [state.deductions, monthStr])
    const allAdvances = useMemo(() => (state.salaryAdvances || []).filter(a => a.period === monthStr), [state.salaryAdvances, monthStr])
    const pendingAdvances = allAdvances.filter(a => a.status === 'pending')

    const pendingCommissions = useMemo(() => (state.commissionLogs || []).filter(c => c.status === 'pending' && c.createdAt?.startsWith(monthStr.substring(0, 7))), [state.commissionLogs, monthStr])

    const getUserName = (id: string) => state.users.find(u => u.id === id)?.displayName || id

    return (
        <div className="page-container">
            <PageHeader
                icon={Calculator}
                title="Phiếu lương Tổng hợp"
                subtitle={`Chi phí nhân sự tháng ${selectedDate.getMonth() + 1}/${selectedDate.getFullYear()}`}
                description="CRM Finance • Hệ thống thanh khoản chuyên nghiệp"
                actions={
                    <button
                        onClick={handleInitRoster}
                        className="px-6 py-3 bg-text-main text-white rounded-[15px] text-[11px] font-black uppercase tracking-[0.2em] shadow-luxury hover:bg-gold-muted hover:shadow-gold-muted/20 transition-all duration-300 flex items-center gap-2 active:scale-95 group"
                    >
                        <PlusCircle size={18} strokeWidth={2.5} className="group-hover:rotate-90 transition-transform duration-500" />
                        Khởi tạo bảng lương
                    </button>
                }
            >
                <div className="flex items-center bg-gray-100/50 p-1 rounded-[15px] border border-gray-100 shadow-sm gap-2">
                    <button onClick={prevMonth} className="w-9 h-9 rounded-[12px] hover:bg-white text-text-soft opacity-40 hover:opacity-100 transition-all flex items-center justify-center">
                        <ChevronLeft size={16} strokeWidth={2.5} />
                    </button>
                    <div className="px-4 text-[11px] font-black text-text-main min-w-[140px] text-center uppercase tracking-wider">
                        Tháng {selectedDate.getMonth() + 1}, {selectedDate.getFullYear()}
                    </div>
                    <button onClick={nextMonth} className="w-9 h-9 rounded-[12px] hover:bg-white text-text-soft opacity-40 hover:opacity-100 transition-all flex items-center justify-center">
                        <ChevronRight size={16} strokeWidth={2.5} />
                    </button>
                </div>
            </PageHeader>

            <div className="content-wrapper">

                {/* Sticky Header Section: Stats + Tabs + Filters */}
                <div className="sticky top-[44px] z-[40] bg-gray-50/95 backdrop-blur-md pb-4 pt-2 -mx-1 px-1 shadow-sm rounded-b-[2rem]">
                    {/* Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div className="col-span-2 bg-indigo-600 p-6 rounded-[2rem] text-white shadow-xl shadow-indigo-100 relative overflow-hidden">
                            <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
                            <div className="text-[11px] font-bold uppercase tracking-[0.2em] opacity-70 mb-2">Tổng chi NET tháng này</div>
                            <div className="text-3xl font-bold">{formatVND(totalPayout)}</div>
                            <div className="mt-4 flex items-center gap-2 text-[11px] font-bold bg-white/20 w-fit px-3 py-1.5 rounded-full">
                                <Clock size={12} /> {filteredData.length} nhân sự
                            </div>
                        </div>
                        <div className="bg-emerald-50 p-5 rounded-[2rem] border border-emerald-100">
                            <div className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-2 flex items-center gap-1"><Gift size={12} />Tổng thưởng</div>
                            <div className="text-xl font-bold text-emerald-700">{formatVND(filteredData.reduce((s, i) => s + i.totalBonus + i.revenueShareAmount, 0))}</div>
                        </div>
                        <div className="bg-rose-50 p-5 rounded-[2rem] border border-rose-100">
                            <div className="text-xs font-bold text-rose-600 uppercase tracking-wider mb-2 flex items-center gap-1"><AlertTriangle size={12} />Giảm trừ + Ứng</div>
                            <div className="text-xl font-bold text-rose-700">{formatVND(filteredData.reduce((s, i) => s + i.totalDeduction + i.totalAdvance, 0))}</div>
                        </div>
                    </div>

                    {/* Tabs & Filters */}
                    <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
                        <div className="flex items-center gap-1 p-3 border-b border-gray-50 overflow-x-auto bg-white">
                            {[
                                { key: 'summary', label: 'Tổng hợp lương', icon: FileText },
                                { key: 'bonus', label: `Thưởng KPI & DS (${monthBonuses.length})`, icon: Star },
                                { key: 'deduction', label: `Vi phạm (${monthDeductions.length})`, icon: AlertTriangle },
                                { key: 'advance', label: `Ứng lương (${pendingAdvances.length > 0 ? `${pendingAdvances.length} chờ duyệt` : allAdvances.length})`, icon: CreditCard },
                                { key: 'commission_approval', label: `Duyệt hoa hồng (${pendingCommissions.length})`, icon: CheckCircle2 },
                            ].map(tab => (
                                <button
                                    key={tab.key}
                                    onClick={() => setActiveTab(tab.key as any)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${activeTab === tab.key ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}
                                >
                                    <tab.icon size={13} />
                                    {tab.label}
                                </button>
                            ))}
                            {isAdminOrAccounting && activeTab !== 'summary' && (
                                <button
                                    onClick={() => { setForm({ ...EMPTY_FORM, period: monthStr }); if (activeTab === 'bonus') setShowBonusModal(true); else if (activeTab === 'deduction') setShowDeductionModal(true); else setShowAdvanceModal(true) }}
                                    className="ml-auto flex items-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-xs font-bold shrink-0 hover:bg-emerald-100 transition-colors"
                                >
                                    <Plus size={13} /> Thêm mới
                                </button>
                            )}
                        </div>

                        {activeTab === 'summary' && (
                            <SummaryHeader
                                isRosterEmpty={isRosterEmpty}
                                isAdminOrAccounting={isAdminOrAccounting}
                                onAddUser={() => setShowAddUserModal(true)}
                                selectedBranch={selectedBranch}
                                setSelectedBranch={setSelectedBranch}
                                searchTerm={searchTerm}
                                setSearchTerm={setSearchTerm}
                                branches={state.branches}
                            />
                        )}
                    </div>
                </div>

                {activeTab === 'summary' && (
                    <SummaryBody
                        isRosterEmpty={isRosterEmpty}
                        filteredData={filteredData}
                        monthStr={monthStr}
                        isAdminOrAccounting={isAdminOrAccounting}
                        isSubmitting={isSubmitting}
                        onInitRoster={handleInitRoster}
                        onDeleteRoster={handleDeleteRoster}
                        onViewPayslip={(item) => { setSelectedPayslipData(item); setShowPayslipModal(true); }}
                        onViewDetails={(item) => { setSelectedDetailData(item); setShowDetailsModal(true); }}
                        formatVND={formatVND}
                    />
                )}

                {activeTab !== 'summary' && (
                    <TabTables
                        activeTab={activeTab}
                        monthStr={monthStr}
                        monthBonuses={monthBonuses}
                        monthDeductions={monthDeductions}
                        allAdvances={allAdvances}
                        pendingCommissions={pendingCommissions}
                        isAdminOrAccounting={isAdminOrAccounting}
                        isSubmitting={isSubmitting}
                        formatVND={formatVND}
                        getUserName={getUserName}
                        currentUserId={currentUser?.id || ''}
                        onDeleteBonus={handleDeleteBonus}
                        onDeleteDeduction={handleDeleteDeduction}
                        onDeleteAdvance={handleDeleteAdvance}
                        onApproveAdvance={handleApproveAdvance}
                        onRejectAdvance={handleRejectAdvance}
                        onMarkAsPaidAdvance={handleMarkAsPaidAdvance}
                        onApproveCommission={handleApproveCommission}
                        onRejectCommission={handleRejectCommission}
                        onEditBonus={(b) => { setForm({ ...b, amount: b.amount.toString() }); setShowBonusModal(true); }}
                        onEditDeduction={(d) => { setForm({ ...d, amount: d.amount.toString() }); setShowDeductionModal(true); }}
                        onEditAdvance={(a) => { setForm({ ...a, amount: a.amount.toString() }); setShowAdvanceModal(true); }}
                    />
                )}

                {/* Note */}
                <div className="bg-amber-50 p-5 rounded-[2rem] border border-amber-100 flex items-start gap-4">
                    <div className="p-2.5 bg-white rounded-xl text-amber-500 shadow-sm"><Calendar size={18} /></div>
                    <div>
                        <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wider">Công thức NET Thực nhận</h3>
                        <p className="text-[11px] font-bold text-amber-700/70 mt-1 leading-relaxed">
                            <strong>NET = Lương cơ bản (theo công/khoán) + Phụ cấp + Thưởng KPI + Thưởng % Doanh số + Hoa hồng Sale - Vi phạm - Ứng lương đã duyệt</strong>
                            <br />Thưởng % doanh số tự động từ tổng doanh thu Lịch hẹn × tỷ lệ % cấu hình cho Quản lý.
                        </p>
                    </div>
                </div>

                {/* New Integrated Modals */}
                <PayrollFormModals
                    userOptions={userOptionsForSelect}
                    activeRosterUserOptions={activeRosterUserOptions}
                    form={form}
                    setForm={setForm}
                    isSubmitting={isSubmitting}
                    showBonusModal={showBonusModal}
                    setShowBonusModal={setShowBonusModal}
                    onAddBonus={handleAddBonus}
                    showDeductionModal={showDeductionModal}
                    setShowDeductionModal={setShowDeductionModal}
                    onAddDeduction={handleAddDeduction}
                    showAdvanceModal={showAdvanceModal}
                    setShowAdvanceModal={setShowAdvanceModal}
                    onAddAdvance={handleAddAdvance}
                    showAddUserModal={showAddUserModal}
                    setShowAddUserModal={setShowAddUserModal}
                    onAddUserToRoster={handleAddUserToRoster}
                    isAdminOrAccounting={isAdminOrAccounting}
                />

                {showPayslipModal && selectedPayslipData && (
                    <PayslipModal
                        isOpen={showPayslipModal}
                        onClose={() => setShowPayslipModal(false)}
                        data={selectedPayslipData}
                        monthStr={monthStr}
                        formatVND={formatVND}
                        state={state}
                        setActiveTab={setActiveTab}
                    />
                )}

                {showDetailsModal && selectedDetailData && (
                    <KpiDetailsModal
                        isOpen={showDetailsModal}
                        onClose={() => setShowDetailsModal(false)}
                        data={selectedDetailData}
                        monthStr={monthStr}
                        formatVND={formatVND}
                        isAdminOrAccounting={isAdminOrAccounting}
                        isSubmitting={isSubmitting}
                        onToggleConfirm={handleToggleKpiConfirm}
                    />
                )}
            </div>
        </div>
    )
}
