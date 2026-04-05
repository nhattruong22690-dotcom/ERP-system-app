import {
    AppState, User, Branch, PaymentAccount, Category, MonthlyPlan,
    Transaction, ActivityLog, Customer, Appointment, ServiceOrder,
    CommissionSetting, Lead, CommissionLog, UserMission,
    JobTitle, Attendance, CrmService, MembershipTier, SalaryHistory,
    Bonus, Deduction, SalaryAdvance, PayrollRoster, LoyaltySettings, ServiceCategory
} from '@/lib/types'
import { seedData } from '@/lib/seed'
import { supabase } from '@/lib/supabase/supabase'
import { generateId } from '@/lib/utils/id'

import { fetchCustomerHistory } from '@/lib/supabase/supabaseFetch'
import { recalculateCustomerStats } from '@/lib/utils/calculations'

const STORAGE_KEY = 'taichinh_app_prod_v1' // Force reset from v1 mock data

export function getState(): AppState {
    const initial = getInitialState()
    if (typeof window === 'undefined') return initial
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (!raw) {
            // Only write to localStorage if it's actually empty
            localStorage.setItem(STORAGE_KEY, JSON.stringify(initial))
            return initial
        }
        const parsed = JSON.parse(raw) as AppState

        // Safety: If users list is empty, something is wrong, inject seed users
        if (!parsed.users || parsed.users.length === 0) {
            console.warn('LocalStorage users empty, restoring from seed.')
            parsed.users = initial.users
        }

        // Ensure other critical arrays exist
        parsed.branches = parsed.branches || initial.branches
        parsed.accounts = parsed.accounts || initial.accounts
        parsed.categories = parsed.categories || initial.categories
        parsed.plans = parsed.plans || []
        parsed.transactions = parsed.transactions || []
        parsed.activityLogs = parsed.activityLogs || []
        parsed.customers = parsed.customers || []
        parsed.appointments = parsed.appointments || []
        parsed.services = parsed.services || []
        parsed.membershipTiers = parsed.membershipTiers || []
        parsed.serviceCategories = parsed.serviceCategories || []
        parsed.jobTitles = parsed.jobTitles || []
        parsed.dismissedAlerts = parsed.dismissedAlerts || []
        parsed.starredAlerts = parsed.starredAlerts || []

        return parsed
    } catch (e) {
        console.error('Error reading localStorage:', e)
        return initial
    }
}

export function setState(state: AppState): void {
    if (typeof window === 'undefined') return

    try {
        // Exclude heavy data that exceeds localStorage quota (5MB)
        // Since we fetchAllData on mount, we don't need to bulk-store these locally
        const metaState = { ...state }

        // Remove heavy arrays
        const heavyKeys: (keyof AppState)[] = [
            'customers',
            'transactions',
            'appointments',
            'activityLogs',
            'leads',
            'commissionLogs',
            'attendance',
            'treatmentCards',
            'bonuses',
            'deductions',
            'salaryAdvances',
            'salaryHistory',
            'serviceCategories'
        ]

        heavyKeys.forEach(key => {
            if (metaState[key]) {
                (metaState as any)[key] = []
            }
        })

        const serialized = JSON.stringify(metaState)
        localStorage.setItem(STORAGE_KEY, serialized)
    } catch (e) {
        console.error('Failed to save to localStorage (Quota likely exceeded):', e)
        // If it still fails, we might need to be even more aggressive or just clear it
    }
}

export async function syncActivityLogSideEffect(log: Omit<ActivityLog, 'id' | 'createdAt'>) {
    const id = generateId()
    const createdAt = new Date().toISOString()
    const activityLog: ActivityLog = { ...log, id, createdAt }

    const { error } = await supabase.from('activity_logs').insert({
        id, user_id: activityLog.userId, type: activityLog.type,
        entity_type: activityLog.entityType, entity_id: activityLog.entityId,
        details: activityLog.details, created_at: createdAt
    })
    if (error) console.error('Supabase Error (ActivityLog):', error)
    return activityLog
}

export function updateState(updater: (s: AppState) => AppState): AppState {
    const s = getState()
    const next = updater(s)
    setState(next)
    return next
}

export function saveActivityLog(log: Omit<ActivityLog, 'id' | 'createdAt'>) {
    const id = generateId()
    const createdAt = new Date().toISOString()
    const fullLog: ActivityLog = { ...log, id, createdAt }

    // Side effect
    supabase.from('activity_logs').insert({
        id: fullLog.id, user_id: fullLog.userId, type: fullLog.type,
        entity_type: fullLog.entityType, entity_id: fullLog.entityId,
        details: fullLog.details, created_at: fullLog.createdAt
    }).then(r => r.error && console.error('Supabase Error (ActivityLog):', r.error))

    // This function returns the updater for use with saveState
    return (s: AppState): AppState => ({
        ...s,
        activityLogs: [fullLog, ...(s.activityLogs || [])].slice(0, 100)
    })
}

// ---- helpers ----
/**
 * Sync User to DB & Log
 */
export async function syncUser(user: User, currentUserId: string | undefined) {
    const { error } = await supabase.from('users').upsert({
        id: user.id, username: user.username, display_name: user.displayName, password: user.password,
        role: user.role, allowed_pages: user.allowedPages, permissions: user.permissions,
        branch_id: user.branchId, title: user.title, job_title_id: user.jobTitleId, created_at: user.createdAt,
        email: user.email, avatar_url: user.avatarUrl, is_active: user.isActive !== false,
        work_status: user.workStatus,
        has_attendance: user.hasAttendance,
        salary_config: user.salaryConfig,
        view_all_branches: user.viewAllBranches || false,
        view_branch_tx_from_hq: user.viewBranchTransactionsFromHQ || false
    })
    if (error) {
        console.error('Supabase Error (User):', { message: error.message, code: error.code, details: error.details, hint: error.hint })
        console.error('Error details:', {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint
        })
        return false
    }
    return true
}

export function saveUser(user: User) {
    return (s: AppState): AppState => ({
        ...s,
        users: s.users.some(u => u.id === user.id)
            ? s.users.map(u => u.id === user.id ? user : u)
            : [...s.users, user]
    })
}

/**
 * Sync Branch to DB & Log
 */
export async function syncBranch(branch: Branch, currentUserId: string | undefined) {
    const { error } = await supabase.from('branches').upsert({
        id: branch.id, name: branch.name, code: branch.code, type: branch.type, is_headquarter: branch.isHeadquarter,
        icon: branch.icon, color: branch.color,
        created_at: branch.createdAt
    })
    if (error) console.error('Supabase Error (Branch):', error.message || error)
    return null
}

/**
 * Sync Salary History to DB & Log
 */
export async function syncSalaryHistory(history: SalaryHistory) {
    const { error } = await supabase.from('crm_salary_history').insert({
        id: history.id,
        user_id: history.userId,
        changed_by: history.changedBy,
        old_config: history.oldConfig,
        new_config: history.newConfig,
        change_reason: history.changeReason || '',
        created_at: history.createdAt
    })

    if (error) {
        console.error('Supabase Error (SalaryHistory):', JSON.stringify(error))
        console.error('  -> code:', error.code)
        console.error('  -> message:', error.message)
        console.error('  -> details:', error.details)
        console.error('  -> hint:', error.hint)
        return false
    }
    return true
}

export function saveSalaryHistory(history: SalaryHistory) {
    return (s: AppState): AppState => ({
        ...s,
        salaryHistory: [...s.salaryHistory, history]
    })
}

// ================================================================
// BONUS (Thưởng KPI + % Doanh số)
// ================================================================
export async function syncBonus(bonus: Bonus) {
    const { error } = await supabase.from('crm_bonuses').upsert({
        id: bonus.id, user_id: bonus.userId, branch_id: bonus.branchId,
        type: bonus.type, amount: bonus.amount, date: bonus.date, period: bonus.period,
        note: bonus.note, created_by: bonus.createdBy, created_at: bonus.createdAt
    })
    if (error) { console.error('Supabase Error (Bonus):', error.message); return false }
    return true
}

export function saveBonus(bonus: Bonus) {
    return (s: AppState): AppState => ({
        ...s,
        bonuses: [...(s.bonuses || []), bonus]
    })
}

export async function deleteBonus(id: string) {
    const { error } = await supabase.from('crm_bonuses').delete().eq('id', id)
    if (error) { console.error('Supabase Error (Delete Bonus):', error.message); return false }
    return true
}

export function removeBonus(id: string) {
    return (s: AppState): AppState => ({
        ...s,
        bonuses: (s.bonuses || []).filter(b => b.id !== id)
    })
}

// Bổ sung hàm update để edit
export function updateBonus(bonus: Bonus) {
    return (s: AppState): AppState => ({
        ...s,
        bonuses: (s.bonuses || []).map(b => b.id === bonus.id ? bonus : b)
    })
}

// ================================================================
// DEDUCTION (Giảm trừ vi phạm)
// ================================================================
export async function syncDeduction(ded: Deduction) {
    const { error } = await supabase.from('crm_deductions').upsert({
        id: ded.id, user_id: ded.userId, type: ded.type,
        amount: ded.amount, date: ded.date, period: ded.period, note: ded.note,
        created_by: ded.createdBy, created_at: ded.createdAt
    })
    if (error) { console.error('Supabase Error (Deduction):', error.message); return false }
    return true
}

export function saveDeduction(ded: Deduction) {
    return (s: AppState): AppState => ({
        ...s,
        deductions: [...(s.deductions || []), ded]
    })
}

export async function deleteDeduction(id: string) {
    const { error } = await supabase.from('crm_deductions').delete().eq('id', id)
    if (error) { console.error('Supabase Error (Delete Deduction):', error.message); return false }
    return true
}

export function removeDeduction(id: string) {
    return (s: AppState): AppState => ({
        ...s,
        deductions: (s.deductions || []).filter(d => d.id !== id)
    })
}

export function updateDeduction(ded: Deduction) {
    return (s: AppState): AppState => ({
        ...s,
        deductions: (s.deductions || []).map(d => d.id === ded.id ? ded : d)
    })
}

// ================================================================
// SALARY ADVANCE (Ứng lương)
// ================================================================
export async function syncSalaryAdvance(adv: SalaryAdvance) {
    const { error } = await supabase.from('crm_salary_advances').upsert({
        id: adv.id, user_id: adv.userId, amount: adv.amount, date: adv.date, period: adv.period,
        status: adv.status, note: adv.note, created_by: adv.createdBy,
        approved_by: adv.approvedBy,
        approved_at: adv.approvedAt,
        paid_by: adv.paidBy,
        paid_at: adv.paidAt,
        paid_note: adv.paidNote,
        created_at: adv.createdAt
    })
    if (error) { console.error('Supabase Error (SalaryAdvance):', error.message); return false }
    return true
}

export function saveSalaryAdvance(adv: SalaryAdvance) {
    return (s: AppState): AppState => ({
        ...s,
        salaryAdvances: s.salaryAdvances.some(a => a.id === adv.id)
            ? s.salaryAdvances.map(a => a.id === adv.id ? adv : a)
            : [...s.salaryAdvances, adv]
    })
}

export async function deleteSalaryAdvance(id: string) {
    const { error } = await supabase.from('crm_salary_advances').delete().eq('id', id)
    if (error) { console.error('Supabase Error (Delete SalaryAdvance):', error.message); return false }
    return true
}

export function removeSalaryAdvance(id: string) {
    return (s: AppState): AppState => ({
        ...s,
        salaryAdvances: s.salaryAdvances.filter(a => a.id !== id)
    })
}

export function updateSalaryAdvance(adv: SalaryAdvance) {
    return (s: AppState): AppState => ({
        ...s,
        salaryAdvances: s.salaryAdvances.map(a => a.id === adv.id ? adv : a)
    })
}

// ================================================================
// PAYROLL ROSTERS (Danh sách lương cố định theo tháng)
// ================================================================
export async function syncPayrollRoster(roster: PayrollRoster) {
    const { error } = await supabase.from('crm_payroll_rosters').insert({
        id: roster.id, period: roster.period, user_id: roster.userId,
        created_by: roster.createdBy, created_at: roster.createdAt
    })
    if (error) { console.error('Supabase Error (PayrollRoster):', error.message); return false }
    return true
}

export function savePayrollRoster(roster: PayrollRoster) {
    return (s: AppState): AppState => ({
        ...s,
        payrollRosters: [...(s.payrollRosters || []), roster]
    })
}

export async function deletePayrollRoster(period: string, userId: string) {
    const { error } = await supabase.from('crm_payroll_rosters')
        .delete()
        .eq('period', period)
        .eq('user_id', userId)
    if (error) { console.error('Supabase Error (Delete Roster):', error.message); return false }
    return true
}

export function removePayrollRoster(period: string, userId: string) {
    return (s: AppState): AppState => ({
        ...s,
        payrollRosters: (s.payrollRosters || []).filter(r => !(r.period === period && r.userId === userId))
    })
}

export async function bulkSyncPayrollRosters(rosters: PayrollRoster[]) {
    if (rosters.length === 0) return true
    const { error } = await supabase.from('crm_payroll_rosters').insert(
        rosters.map(r => ({
            id: r.id, period: r.period, user_id: r.userId,
            created_by: r.createdBy, created_at: r.createdAt
        }))
    )
    if (error) { console.error('Supabase Error (BulkRosters):', error.message); return false }
    return true
}

export function saveBulkPayrollRosters(rosters: PayrollRoster[]) {
    return (s: AppState): AppState => ({
        ...s,
        payrollRosters: [...(s.payrollRosters || []), ...rosters]
    })
}

/**
 * Sync Attendance to DB
 */
export async function syncAttendance(attendance: Attendance) {
    const { error } = await supabase.from('crm_attendance').upsert({
        id: attendance.id,
        user_id: attendance.userId,
        branch_id: attendance.branchId,
        date: attendance.date,
        status: attendance.status,
        check_in: attendance.checkIn,
        check_out: attendance.checkOut,
        note: attendance.note,
        created_at: attendance.createdAt,
        updated_at: attendance.updatedAt
    })
    if (error) {
        console.error('Supabase Error (Attendance):', error)
        return false
    }
    return true
}

export function saveBranch(branch: Branch) {
    return (s: AppState): AppState => ({
        ...s,
        branches: s.branches.some(b => b.id === branch.id)
            ? s.branches.map(b => b.id === branch.id ? branch : b)
            : [...s.branches, branch]
    })
}

/**
 * Sync Account to DB & Log
 */
export async function syncAccount(account: PaymentAccount, currentUserId: string | undefined) {
    const { error } = await supabase.from('payment_accounts').upsert({
        id: account.id, name: account.name, type: account.type, initial_balance: account.initialBalance,
        branch_id: account.branchId, bank_name: account.bankName, account_number: account.accountNumber,
        account_holder: account.accountHolder, created_at: account.createdAt
    })
    if (error) console.error('Supabase Error (Account):', error)
    return null
}

export function saveAccount(account: PaymentAccount) {
    return (s: AppState): AppState => ({
        ...s,
        accounts: s.accounts.some(a => a.id === account.id)
            ? s.accounts.map(a => a.id === account.id ? account : a)
            : [...s.accounts, account]
    })
}

/**
 * Sync Category to DB & Log
 */
export async function syncCategory(cat: Category, currentUserId: string | undefined) {
    const { error } = await supabase.from('categories').upsert({
        id: cat.id, name: cat.name, section: cat.section, sort_order: cat.sortOrder,
        is_rate_based: cat.isRateBased, default_rate: cat.defaultRate, is_hidden: cat.isHidden, created_at: cat.createdAt
    })
    if (error) console.error('Supabase Error (Category):', error)
    return null
}

export function saveCategory(cat: Category) {
    return (s: AppState): AppState => ({
        ...s,
        categories: s.categories.some(c => c.id === cat.id)
            ? s.categories.map(c => c.id === cat.id ? cat : c)
            : [...s.categories, cat]
    })
}

/**
 * Sync Imported Categories to DB & Log
 */
export async function syncImportCategories(cats: Category[], currentUserId: string | undefined) {
    const payloads = cats.map(cat => ({
        id: cat.id, name: cat.name, section: cat.section, sort_order: cat.sortOrder,
        is_rate_based: cat.isRateBased, default_rate: cat.defaultRate, is_hidden: cat.isHidden, created_at: cat.createdAt
    }))
    const { error } = await supabase.from('categories').upsert(payloads)
    if (error) console.error('Supabase Error (Import Categories):', error)
    return null
}

export function importCategories(cats: Category[]) {
    return (s: AppState): AppState => {
        const newCats = [...s.categories]
        for (const cat of cats) {
            const idx = newCats.findIndex(c => c.id === cat.id)
            if (idx >= 0) newCats[idx] = cat
            else newCats.push(cat)
        }
        return { ...s, categories: newCats }
    }
}
/**
 * Sync Soft Delete Category to DB & Log
 */
export async function syncDeleteCategory(id: string, currentUserId: string | undefined, catName: string) {
    const { error } = await supabase.from('categories').update({ is_hidden: true }).eq('id', id)
    if (error) console.error('Supabase Error (Soft Delete Category):', error)
    return null
}

export function deleteCategory(id: string) {
    return (s: AppState): AppState => ({
        ...s,
        categories: s.categories.map(c => c.id === id ? { ...c, isHidden: true } : c),
        plans: s.plans.map(p => ({
            ...p,
            categoryPlans: p.categoryPlans.filter(cp => cp.categoryId !== id)
        }))
    })
}

/**
 * Sync Plan to DB & Log
 */
export async function syncPlan(plan: MonthlyPlan, currentUserId: string | undefined) {
    const { error } = await supabase.from('monthly_plans').upsert({
        id: plan.id, branch_id: plan.branchId, year: plan.year, month: plan.month,
        kpi_revenue: plan.kpiRevenue, tax_rate: plan.taxRate, created_at: plan.createdAt, updated_at: plan.updatedAt
    })
    if (error) console.error('Supabase Error (Plan):', error)

    if (plan.categoryPlans) {
        const cps = plan.categoryPlans.map(cp => ({
            id: `${plan.id}_${cp.categoryId}`, plan_id: plan.id, category_id: cp.categoryId,
            rate: cp.rate, fixed_amount: cp.fixedAmount, planned_amount: cp.plannedAmount,
            alert_threshold: cp.alertThreshold, disabled: cp.disabled
        }))
        const { error: errorCP } = await supabase.from('category_plans').upsert(cps)
        if (errorCP) console.error('Supabase Error (Category Plans):', errorCP)
    }
    return null
}

export function savePlan(plan: MonthlyPlan) {
    return (s: AppState): AppState => ({
        ...s,
        plans: s.plans.some(p => p.id === plan.id)
            ? s.plans.map(p => p.id === plan.id ? plan : p)
            : [...s.plans, plan]
    })
}

/**
 * Cập nhật Transaction vào Database & Activity Log (Side Effects)
 */
export async function syncTransaction(tx: Transaction, currentUserId: string | undefined, isNew: boolean) {
    // 1. Supabase
    const { error } = await supabase.from('transactions').upsert({
        id: tx.id, branch_id: tx.branchId, date: tx.date, type: tx.type, category_id: tx.categoryId,
        amount: tx.amount, payment_account_id: tx.paymentAccountId, to_payment_account_id: tx.toPaymentAccountId,
        paid_by_branch_id: tx.paidByBranchId, note: tx.note, is_debt: tx.isDebt, status: tx.status,
        created_by: tx.createdBy, created_at: tx.createdAt, updated_by: tx.updatedBy, updated_at: tx.updatedAt
    })
    if (error) console.error('Supabase Error (Transaction):', error)

    // 2. Activity Log
    if (currentUserId) {
        const state = getState()
        const branch = state.branches.find(b => b.id === tx.branchId)
        const account = state.accounts.find(a => a.id === tx.paymentAccountId)
        const toAccount = tx.toPaymentAccountId ? state.accounts.find(a => a.id === tx.toPaymentAccountId) : null
        const cat = state.categories.find(c => c.id === tx.categoryId)

        const typeLabel = tx.type === 'income' ? 'THU' : tx.type === 'expense' ? 'CHI' : 'CHUYỂN'
        let details = `[${typeLabel}] ${branch?.name || tx.branchId} - ${isNew ? 'Thêm mới' : 'Cập nhật'}: ${tx.amount.toLocaleString('vi-VN')}đ`

        if (tx.type !== 'transfer' && cat) {
            details += ` - Danh mục: ${cat.name}`
        }

        if (tx.type === 'transfer' && account && toAccount) {
            details += ` (${account.name} -> ${toAccount.name})`
        } else if (account) {
            details += ` (${account.name})`
        }
        if (tx.note) details += ` - ${tx.note}`

        // 1b. Check for Transaction Alerts
        if (isNew) {
            triggerTransactionAlerts(tx)
        }

        const id = generateId()
        const createdAt = new Date().toISOString()
        const activityLog: ActivityLog = {
            id,
            userId: currentUserId,
            type: isNew ? 'create' : 'update',
            entityType: 'transaction',
            entityId: tx.id,
            details,
            createdAt
        }

        // Luôn ghi log vào Supabase
        supabase.from('activity_logs').insert({
            id, user_id: currentUserId, type: activityLog.type,
            entity_type: activityLog.entityType, entity_id: activityLog.entityId,
            details: activityLog.details, created_at: createdAt
        }).then(r => r.error && console.error('Supabase Error (ActivityLog):', r.error))

        return activityLog
    }
    return null
}

/**
 * Updater thuần túy cho Transaction
 */
export function saveTransaction(tx: Transaction) {
    return (s: AppState): AppState => ({
        ...s,
        transactions: s.transactions.some(t => t.id === tx.id)
            ? s.transactions.map(t => t.id === tx.id ? tx : t)
            : [...s.transactions, tx]
    })
}

/**
 * Xóa Transaction khỏi Database & Activity Log (Side Effects)
 */
export async function syncDeleteTransaction(id: string, currentUserId: string | undefined) {
    const tx = getState().transactions.find(t => t.id === id)
    const { error } = await supabase.from('transactions').delete().eq('id', id)
    if (error) console.error('Supabase Error (Delete TX):', error)

    if (currentUserId && tx) {
        const logId = generateId()
        const createdAt = new Date().toISOString()
        const details = `Xóa giao dịch: ${tx.amount.toLocaleString('vi-VN')}đ - ${tx.note || '(Không có ghi chú)'}`

        supabase.from('activity_logs').insert({
            id: logId, user_id: currentUserId, type: 'delete',
            entity_type: 'transaction', entity_id: id,
            details, created_at: createdAt
        }).then(r => r.error && console.error('Supabase Error (ActivityLog):', r.error))

        return { id: logId, userId: currentUserId, type: 'delete' as const, entityType: 'transaction' as const, entityId: id, details, createdAt }
    }
    return null
}

/**
 * Updater thuần túy cho Xóa Transaction
 */
export function deleteTransaction(id: string) {
    return (s: AppState): AppState => ({ ...s, transactions: s.transactions.filter(t => t.id !== id) })
}

/**
 * CRM: Sync Customer
 */
export async function syncCustomer(customer: Customer) {
    // Ensure lastVisit is a valid timestamp or null
    const lastVisitVal = (!customer.lastVisit || customer.lastVisit === 'Chưa có' || customer.lastVisit === '-')
        ? null
        : customer.lastVisit

    const { error } = await supabase.from('crm_customers').upsert({
        id: customer.id,
        full_name: customer.fullName,
        phone: customer.phone,
        phone2: customer.phone2,
        gender: customer.gender,
        birthday: customer.birthday,
        email: customer.email,
        avatar: customer.avatar,
        facebook: customer.facebook,
        zalo: customer.zalo,
        address: customer.address,
        rank: customer.rank,
        points: customer.points,
        total_spent: customer.totalSpent,
        wallet_balance: customer.walletBalance || 0,
        last_visit: lastVisitVal,
        is_vip: customer.isVip || false,
        medical_notes: customer.medicalNotes,
        professional_notes: customer.professionalNotes,
        branch_id: customer.branchId,
        created_at: customer.createdAt,
        updated_at: customer.updatedAt
    })
    if (error) console.error('Supabase Error (Customer):', { message: error.message, code: error.code, details: error.details, hint: error.hint })

    // Sync Treatment Cards if any
    if (customer.treatmentCards && customer.treatmentCards.length > 0) {
        const cards = customer.treatmentCards.map(card => {
            const data: any = {
                id: card.id,
                customer_id: customer.id,
                name: card.name,
                type: card.type,
                total: card.total,
                used: card.used,
                remaining: card.remaining,
                status: card.status,
                purchase_date: card.purchaseDate,
                created_at: card.createdAt
            }
            if (card.expiryDate) data.expiry_date = card.expiryDate;
            return data;
        })
        const { error: cardError } = await supabase.from('crm_treatment_cards').upsert(cards)
        if (cardError) {
            console.error('🔴 Supabase Error (TreatmentCards):', {
                message: cardError.message,
                code: cardError.code,
                details: cardError.details,
                hint: cardError.hint,
                dataSent: cards
            })
        }
    }
    return null
}


export function saveCustomer(customer: Customer) {
    return (s: AppState): AppState => ({
        ...s,
        customers: s.customers.some(c => c.id === customer.id)
            ? s.customers.map(c => c.id === customer.id ? customer : c)
            : [...s.customers, customer]
    })
}

// ============================================================
// COMMISSIONS, MISSIONS & LEADS
// ============================================================

export async function syncCommissionSetting(setting: CommissionSetting) {
    const { error } = await supabase.from('crm_commission_settings').upsert({
        id: setting.id,
        name: setting.name,
        rule_code: setting.ruleCode,
        action: setting.action || (
            setting.ruleCode === 'phone_collect' ? 'lead_phone' :
                setting.ruleCode === 'appointment_set' ? 'appointment_arrived' :
                    (setting.ruleCode === 'service_revenue' || setting.ruleCode === 'service_commission') ? 'appointment_completed' :
                        'manual'
        ),
        type: setting.type,
        amount: setting.amount,
        tiers: setting.type === 'kpi_tiered' ? setting.kpiTiers : setting.tiers,
        condition: setting.condition,
        is_active: setting.isActive,
        created_at: setting.createdAt,
        updated_at: setting.updatedAt
    })

    if (error) {
        console.error('Supabase Error (CommissionSetting):', { message: error.message, code: error.code, details: error.details, hint: error.hint })
    }
    return null
}

export function saveCommissionSetting(setting: CommissionSetting) {
    return (s: AppState): AppState => ({
        ...s,
        commissionSettings: s.commissionSettings?.some(x => x.id === setting.id)
            ? s.commissionSettings.map(x => x.id === setting.id ? setting : x)
            : [...(s.commissionSettings || []), setting]
    })
}

export async function deleteCommissionSettingDB(id: string) {
    const { error } = await supabase.from('crm_commission_settings').delete().eq('id', id)
    if (error) console.error('Supabase Error (DeleteCommissionSetting):', error)
    return null
}

export function removeCommissionSettingState(id: string) {
    return (s: AppState): AppState => ({
        ...s,
        commissionSettings: s.commissionSettings?.filter(x => x.id !== id) || []
    })
}

export function removeUserMissionState(id: string) {
    return (s: AppState): AppState => ({
        ...s,
        userMissions: s.userMissions?.filter(x => x.id !== id) || []
    })
}

// ============================================================
// JOB TITLES
// ============================================================
export async function syncJobTitle(jt: any) {
    const { error } = await supabase.from('crm_job_titles').upsert({
        id: jt.id, name: jt.name, department_type: jt.departmentType,
        default_role: jt.defaultRole,
        icon: jt.icon, color: jt.color,
        has_attendance: jt.hasAttendance,
        allowed_pages: jt.allowedPages,
        permissions: jt.permissions,
        view_branch_tx_from_hq: jt.viewBranchTransactionsFromHQ || false,
        created_at: jt.createdAt
    })
    if (error) {
        console.error('Supabase Error (JobTitle):', { message: error.message, code: error.code, details: error.details, hint: error.hint })
        console.error('  -> code:', error.code, '| message:', error.message, '| details:', error.details)
    }
    return null
}

export function saveJobTitle(jt: any) {
    return (s: AppState): AppState => ({
        ...s,
        jobTitles: s.jobTitles?.some(j => j.id === jt.id)
            ? s.jobTitles.map(j => j.id === jt.id ? jt : j)
            : [...(s.jobTitles || []), jt]
    })
}

export async function deleteJobTitleDB(id: string) {
    const { error } = await supabase.from('crm_job_titles').delete().eq('id', id)
    if (error) console.error('Supabase Error (DeleteJobTitle):', error)
    return null
}

export function removeJobTitleState(id: string) {
    return (s: AppState): AppState => ({
        ...s,
        jobTitles: s.jobTitles?.filter(j => j.id !== id) || []
    })
}

export async function syncLead(lead: Lead) {
    const { error } = await supabase.from('crm_leads').upsert({
        id: lead.id,
        sale_page_staff_id: lead.salePageStaffId || lead.salePageId,
        sale_tele_staff_id: lead.saleTeleStaffId,
        customer_name: lead.name,
        phone: lead.phone,
        source: lead.source,
        social_link: lead.socialLink,
        page_evaluation: lead.pageEvaluation,
        is_appointment_set: lead.isAppointmentSet,
        is_checked_in: lead.isCheckedIn,
        total_service_value: lead.totalServiceValue,
        lifecycle_status: lead.status, // Map status to lifecycle_status
        notes: lead.notes,
        customer_id: lead.customerId,
        branch_id: lead.branchId,
        phone_obtained_at: lead.phoneObtainedAt,
        care_logs: lead.careLogs,
        is_locked: lead.isLocked || false,
        phone_confirmed: lead.phoneConfirmed || false,
        confirmed_by: lead.confirmedBy,
        confirmed_at: lead.confirmedAt,
        actual_service_value: lead.actualServiceValue,
        service_note: lead.serviceNote,
        created_at: lead.createdAt,
        updated_at: lead.updatedAt || new Date().toISOString()
    })
    if (error) {
        console.error('Supabase Error (Lead):', error.message, error.details, error.hint)
        return null
    }

    // V20.1: Auto Commission for Sale Page (Hot/Cold SĐT)
    // Trigger when phone is added for the first time
    const salePageId = lead.salePageStaffId || lead.salePageId
    if (lead.phone && !lead.phoneObtainedAt && salePageId) {
        const createdAt = new Date(lead.createdAt).getTime()
        const now = new Date().getTime()
        const diffHours = (now - createdAt) / (1000 * 60 * 60)

        const isHot = diffHours <= 24
        // Quy tắc mới: KPI chỉ tính khi phoneConfirmed = TRUE
        if (!lead.phoneConfirmed) return lead

        const amount = 10000 // Cố định 10k theo yêu cầu mới
        const type = 'lead_confirmed_phone'

        const comm: CommissionLog = {
            id: generateId(),
            userId: salePageId,
            amount: amount,
            type: type as any,
            status: 'pending',
            leadId: lead.id,
            description: `Hoa hồng Lead ${isHot ? 'Nóng' : 'Lạnh'}: ${lead.name}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }

        // Update lead with phoneObtainedAt to prevent multiple commissions
        lead.phoneObtainedAt = new Date().toISOString()
        await supabase.from('crm_leads').update({ phone_obtained_at: lead.phoneObtainedAt }).eq('id', lead.id)

        syncCommissionLog(comm)
        return lead // Trả về lead đã có phoneObtainedAt
    }
    return lead
}

export function saveLead(lead: Lead) {
    return (s: AppState): AppState => ({
        ...s,
        leads: s.leads?.some(x => x.id === lead.id)
            ? s.leads.map(x => x.id === lead.id ? lead : x)
            : [...(s.leads || []), lead]
    })
}

export async function syncCommissionLog(log: CommissionLog) {
    const { error } = await supabase.from('crm_commission_logs').upsert({
        id: log.id, user_id: log.userId, amount: log.amount,
        type: log.type, status: log.status, appointment_id: log.appointmentId,
        lead_id: log.leadId, invoice_id: log.invoiceId, description: log.description,
        created_at: log.createdAt, updated_at: log.updatedAt
    })
    if (error) {
        console.error('Supabase Error (CommissionLog):', error.message, '| Details:', error.details, '| Hint:', error.hint)
    }
    return null
}

export function saveCommissionLog(log: CommissionLog) {
    return (s: AppState): AppState => ({
        ...s,
        commissionLogs: s.commissionLogs?.some(x => x.id === log.id)
            ? s.commissionLogs.map(x => x.id === log.id ? log : x)
            : [...(s.commissionLogs || []), log]
    })
}

export async function syncUserMission(mission: UserMission) {
    const { error } = await supabase.from('crm_user_missions').upsert({
        id: mission.id, user_id: mission.userId, cycle: mission.cycle,
        metric_type: mission.metricType, target_value: mission.targetValue,
        reward_amount: mission.rewardAmount, is_active: mission.isActive,
        created_at: mission.createdAt, updated_at: mission.updatedAt
    })
    if (error) console.error('Supabase Error (UserMission):', error)
    return null
}

export function saveUserMission(mission: UserMission) {
    return (s: AppState): AppState => ({
        ...s,
        userMissions: s.userMissions?.some(x => x.id === mission.id)
            ? s.userMissions.map(x => x.id === mission.id ? mission : x)
            : [...(s.userMissions || []), mission]
    })
}

/**
 * CRM: Sync Appointment
 */
export async function syncAppointment(apt: Appointment) {
    const { error } = await supabase.from('crm_appointments').upsert({
        id: apt.id, customer_id: apt.customerId, branch_id: apt.branchId, staff_id: apt.staffId,
        appointment_date: apt.appointmentDate, appointment_time: apt.appointmentTime,
        end_time: apt.endTime, status: apt.status, type: apt.type, price: apt.price,
        notes: apt.notes, logs: apt.logs, red_flags: apt.redFlags, service_entries: apt.serviceEntries,
        sale_tele_id: apt.saleTeleId,
        sale_tele_name: apt.saleTeleName,
        sale_page_id: apt.salePageId,
        sale_page_name: apt.salePageName,
        lead_id: apt.leadId,
        booking_source: apt.bookingSource,
        created_at: apt.createdAt, updated_at: apt.updatedAt
    })
    if (error) {
        console.error('Supabase Error (Appointment):', error)
        console.error('Error Details:', error.message, error.details, error.hint)
        return null
    }

    // Tự động cập nhật trạng thái Lead đồng bộ với trạng thái Lịch hẹn
    if (apt.leadId) {
        let leadStatus: string | null = null
        if (apt.status === 'cancelled') {
            leadStatus = 'recare'
        } else if (['pending', 'confirmed', 'booked'].includes(apt.status)) {
            leadStatus = 'booked'
        } else if (['arrived', 'completed', 'no_show'].includes(apt.status)) {
            leadStatus = apt.status
        }

        if (leadStatus) {
            const updatePayload: any = { lifecycle_status: leadStatus }
            if (['pending', 'confirmed', 'booked'].includes(apt.status)) {
                updatePayload.is_locked = true
            }

            const { error: updateLeadError } = await supabase.from('crm_leads').update(updatePayload).eq('id', apt.leadId)
            if (updateLeadError) {
                console.error('Supabase Error (Sync Lead Status from Appointment):', updateLeadError)
            } else {
                console.log(`Synced Lead ${apt.leadId} status to ${leadStatus} from Appointment ${apt.status} (Locked: ${updatePayload.is_locked || 'no change'})`)
            }
        }
    }

    // V20: Auto Commission for Sale Tele (100,000 VND for guests check-in > 5tr)
    if ((apt.status === 'arrived' || apt.status === 'completed') && apt.saleTeleId && (apt.price || 0) >= 5000000) {
        // Check if commission already exists to avoid duplicates
        const { data: existing } = await supabase.from('crm_commission_logs').select('id').eq('appointment_id', apt.id).eq('type', 'sale_tele_high_value')
        if (!existing || existing.length === 0) {
            const comm: CommissionLog = {
                id: generateId(),
                userId: apt.saleTeleId,
                amount: 100000,
                type: 'sale_tele_high_value',
                status: 'pending',
                appointmentId: apt.id,
                description: `Hoa hồng chốt khách VIP (>5tr): ${apt.id.slice(0, 8)}`,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }
            syncCommissionLog(comm)
        }
    }
    return null
}

/**
 * CRM: Sync Delete Appointment
 */
export async function syncDeleteAppointment(id: string, leadId?: string, reason?: string) {
    console.log('Starting syncDeleteAppointment for ID:', id, 'LeadID (from client):', leadId)

    // 1. Fetch appointment from DB first to ensure we have the LATEST lead_id
    // This is a safety measure in case the client state is stale
    const { data: aptSource, error: fetchAptError } = await supabase
        .from('crm_appointments')
        .select('lead_id')
        .eq('id', id)
        .single()

    if (fetchAptError) {
        console.warn('Could not fetch appointment source before deletion (might already be deleted):', fetchAptError.message)
    }

    const finalLeadId = leadId || aptSource?.lead_id
    if (finalLeadId && !leadId) {
        console.log('Recovery: Found leadId from DB that was missing in client:', finalLeadId)
    }

    // 2. Delete the appointment
    const { error: deleteError } = await supabase.from('crm_appointments').delete().eq('id', id)
    if (deleteError) {
        console.error('Supabase Error (Delete Appointment):', deleteError)
        return null
    }
    console.log('Appointment deleted successfully from crm_appointments.')

    // 3. Update Lead if exists
    if (finalLeadId) {
        console.log('Syncing lead update for deletion...', finalLeadId)
        const { data: lead, error: fetchLeadError } = await supabase
            .from('crm_leads')
            .select('care_logs, status')
            .eq('id', finalLeadId)
            .single()

        if (fetchLeadError) {
            console.error('Supabase Error (Fetch Lead for Delete Sync):', fetchLeadError.message)
        }

        if (lead) {
            const user = (getState().users.find(u => u.id === getState().currentUserId))
            const reasonLog = {
                id: generateId(),
                userId: user?.id || 'system',
                userName: user?.displayName || 'Hệ thống',
                type: 'other' as const,
                result: 'Xóa lịch hẹn',
                content: `Lý do xóa lịch hẹn: ${reason || 'Không có lý do'}`,
                createdAt: new Date().toISOString()
            }
            const updatedLogs = [reasonLog, ...(lead.care_logs || [])]
            const { error: updateError } = await supabase.from('crm_leads').update({
                status: 'recare',
                care_logs: updatedLogs
            }).eq('id', finalLeadId)

            if (updateError) {
                console.error('Supabase Error (Update Lead Status on Delete):', updateError)
                console.error('Error Status Code:', (updateError as any).code)
                // If code is 23514 it's a constraint violation
                if ((updateError as any).code === '23514') {
                    console.error('CRITICAL: Database constraint (CHECK) rejected the "recare" status. Please run the SQL fix.')
                }
            } else {
                console.log('Lead status updated to "recare" successfully.')
            }
        } else {
            console.warn('No lead record found in DB for ID:', finalLeadId)
        }
    } else {
        console.log('No leadId found (neither from client nor DB). Skip lead sync.')
    }
    return true
}

export function saveAppointment(apt: Appointment) {
    return (s: AppState): AppState => {
        const nextState = {
            ...s,
            appointments: s.appointments.some(a => a.id === apt.id)
                ? s.appointments.map(a => a.id === apt.id ? apt : a)
                : [...s.appointments, apt]
        }

        // Cập nhật trạng thái Lead trong State nếu có leadId
        if (apt.leadId) {
            let leadStatus = apt.status as any
            if (apt.status === 'cancelled') leadStatus = 'recare'
            else if (['pending', 'confirmed', 'booked'].includes(apt.status)) leadStatus = 'booked'

            nextState.leads = nextState.leads.map(l => {
                if (l.id === apt.leadId) {
                    const isLocked = ['pending', 'confirmed', 'booked', 'arrived', 'completed'].includes(apt.status)
                    return { ...l, status: leadStatus, isLocked }
                }
                return l
            })
        }

        return nextState
    }
}

/**
 * CRM: Sync Medical Services
 */
export async function syncService(service: any) {
    const { error } = await supabase.from('crm_services').upsert({
        id: service.id,
        name: service.name,
        category: service.category,
        category_id: service.categoryId,
        price: service.price,
        duration: service.duration,
        type: service.type,
        is_active: service.isActive,
        image: service.image,
        created_at: service.createdAt
    })
    if (error) console.error('Supabase Error (Service):', error)
    return null
}

export function saveService(service: any) {
    return (s: AppState): AppState => ({
        ...s,
        services: (s as any).services.some((ser: any) => ser.id === service.id)
            ? (s as any).services.map((ser: any) => ser.id === service.id ? service : ser)
            : [...(s as any).services, service]
    })
}

export function saveLoyaltySettings(settings: LoyaltySettings) {
    return (s: AppState): AppState => ({
        ...s,
        loyaltySettings: settings
    })
}

export function saveMembershipTier(tier: MembershipTier) {
    return (s: AppState): AppState => ({
        ...s,
        membershipTiers: s.membershipTiers.some(t => t.id === tier.id)
            ? s.membershipTiers.map(t => t.id === tier.id ? tier : t)
            : [...s.membershipTiers, tier]
    })
}

export function saveServiceOrder(order: any) {
    return (s: AppState): AppState => ({
        ...s,
        serviceOrders: (s.serviceOrders || []).some((o: any) => o.id === order.id)
            ? (s.serviceOrders || []).map((o: any) => o.id === order.id ? order : o)
            : [...(s.serviceOrders || []), order]
    })
}

export async function syncServiceOrder(order: any) {
    try {
        const { error } = await supabase.from('crm_service_orders').upsert({
            id: order.id,
            code: order.code,
            customer_id: order.customerId,
            branch_id: order.branchId,
            appointment_id: order.appointmentId,
            line_items: order.lineItems,
            total_amount: order.totalAmount,
            actual_amount: order.actualAmount,
            debt_amount: order.debtAmount,
            payments: order.payments,
            status: order.status,
            created_by: order.createdBy,
            created_at: order.createdAt,
            updated_at: order.updatedAt,
        })
        if (error) {
            console.error('🔴 Supabase Error (ServiceOrder):', {
                message: error.message,
                code: error.code,
                details: error.details,
                hint: error.hint,
                orderId: order.id
            })
            return null
        }

        // Tạo giao dịch thu chi cho các khoản thanh toán
        if (order.payments && order.payments.length > 0) {
            for (const p of order.payments) {
                let accountId = 'pa-cash-hq'
                if (p.method === 'bank') accountId = 'pa-bank-hq'
                else if (p.method === 'wallet') {
                    // pa-wallet does not exist in payment_accounts, use a generic one or skip
                    // For now, mapping to pa-cash-hq but adding a note
                    accountId = 'pa-cash-hq'
                }

                const { error: txError } = await supabase.from('transactions').upsert({
                    id: p.id,
                    branch_id: order.branchId,
                    date: p.date.split('T')[0],
                    type: 'income',
                    category_id: 'c-rev-dt', // Fixed from 'c-rev-sp' (which is Product Sales)
                    amount: p.amount,
                    payment_account_id: accountId,
                    note: `Thanh toán cho phiếu ${order.code} (${p.method === 'cash' ? 'Tiền mặt' : p.method === 'bank' ? 'Chuyển khoản' : 'Ví'})${p.method === 'wallet' ? ' [Ví thành viên]' : ''}`,
                    service_order_id: order.id,
                    created_by: order.createdBy,
                    created_at: p.date,
                    updated_at: p.date,
                    status: 'open'
                })

                if (txError) {
                    console.error('🔴 Supabase Error (Transaction from ServiceOrder):', JSON.stringify({
                        message: txError.message,
                        code: txError.code,
                        details: txError.details,
                        hint: txError.hint,
                        paymentId: p.id
                    }, null, 2))
                }
            }
        }
        // Tự động cập nhật giá trị dịch vụ thực tế và trạng thái về Lead
        if (order.appointmentId) {
            // 1. Lấy lead_id từ appointment
            const { data: apt } = await supabase.from('crm_appointments').select('lead_id').eq('id', order.appointmentId).single()
            if (apt?.lead_id) {
                const { error: updateLeadError } = await supabase.from('crm_leads').update({
                    actual_service_value: order.actualAmount,
                    // actual_service_at: order.updatedAt || order.createdAt, // Column missing in DB
                    lifecycle_status: 'completed'
                }).eq('id', apt.lead_id)

                if (updateLeadError) {
                    console.error('🔴 Supabase Error (Sync Lead from ServiceOrder):', {
                        message: updateLeadError.message,
                        code: updateLeadError.code,
                        details: updateLeadError.details,
                        hint: updateLeadError.hint,
                        leadId: apt.lead_id
                    })
                } else {
                    console.log(`Synced Lead ${apt.lead_id} actual value: ${order.actualAmount} from ServiceOrder`)
                }
            }

            // 2. Cập nhật trạng thái Appointment thành completed nếu ServiceOrder hoàn tất
            if (order.status === 'completed' || order.status === 'paid') {
                await supabase.from('crm_appointments').update({ status: 'completed' }).eq('id', order.appointmentId)
            }
        }
    } catch (e) {
        console.error('syncServiceOrder failed:', e)
    }
    return null
}

export function setCurrentUser(userId: string | undefined) {
    return updateState(s => ({ ...s, currentUserId: userId }))
}

export function getCurrentUser(): User | undefined {
    const s = getState()
    if (!s.currentUserId) return undefined
    return s.users.find(u => u.id === s.currentUserId)
}

function getInitialState(): AppState {
    return seedData()
}

/**
 * KPI: Manual Confirmation Update for Leads/Appointments
 */
export async function updateLeadKpiStatus(id: string, updateData: any) {
    const { error } = await supabase.from('crm_leads').update({
        kpi_confirmed: updateData.kpi_confirmed,
        kpi_exclusion_note: updateData.kpi_exclusion_note,
        kpi_excluded_by: updateData.kpi_excluded_by,
        kpi_excluded_at: updateData.kpi_excluded_at
    }).eq('id', id)
    if (error) {
        console.error('Supabase Error (updateLeadKpiStatus):', error)
        return false
    }
    return true
}

export async function updateAppointmentKpiStatus(id: string, updateData: any) {
    const { error } = await supabase.from('crm_appointments').update({
        kpi_confirmed: updateData.kpi_confirmed,
        kpi_exclusion_note: updateData.kpi_exclusion_note,
        kpi_excluded_by: updateData.kpi_excluded_by,
        kpi_excluded_at: updateData.kpi_excluded_at
    }).eq('id', id)
    if (error) {
        console.error('Supabase Error (updateAppointmentKpiStatus):', error)
        return false
    }
    return true
}

export async function syncMembershipTier(tier: MembershipTier, currentUserId?: string) {
    const { error } = await supabase.from('crm_membership_tiers').upsert({
        id: tier.id,
        name: tier.name,
        subtext: tier.subtext,
        min_spend: tier.minSpend,
        max_spend: tier.maxSpend,
        discount: tier.discount,
        icon: tier.icon,
        theme: tier.theme,
        created_at: tier.createdAt
    })
    if (error) console.error('Supabase Error (MembershipTier):', error)

    if (currentUserId) {
        const details = `Cấu hình Membership: ${tier.name} (Giảm ${tier.discount}%)`
        const logId = generateId()
        supabase.from('activity_logs').insert({
            id: logId, user_id: currentUserId, type: 'update',
            entity_type: 'membership_tier', entity_id: tier.id,
            details, created_at: new Date().toISOString()
        }).then(r => r.error && console.error('Supabase Error (ActivityLog):', r.error))
    }
    return null
}

export async function syncDeleteMembershipTier(id: string, name: string, currentUserId: string | undefined) {
    const { error } = await supabase.from('crm_membership_tiers').delete().eq('id', id)
    if (error) console.error('Supabase Error (Delete MembershipTier):', error)

    if (currentUserId) {
        const details = `Xóa Hạng thành viên: ${name}`
        const logId = generateId()
        supabase.from('activity_logs').insert({
            id: logId, user_id: currentUserId, type: 'delete',
            entity_type: 'membership_tier', entity_id: id,
            details, created_at: new Date().toISOString()
        }).then(r => r.error && console.error('Supabase Error (ActivityLog):', r.error))
    }
    return null
}

export async function syncLoyaltySettings(settings: LoyaltySettings, currentUserId?: string) {
    const { error } = await supabase.from('crm_loyalty_settings').upsert({
        id: settings.id,
        points_per_vnd: settings.pointsPerVnd,
        vnd_per_point: settings.vndPerPoint,
        is_active: settings.isActive,
        updated_at: settings.updatedAt
    })
    if (error) console.error('Supabase Error (LoyaltySettings):', error)

    if (currentUserId) {
        const details = `Cập nhật cấu hình Tích điểm: ${settings.isActive ? 'Bật' : 'Tắt'} - 1đ/${(1 / settings.pointsPerVnd).toLocaleString()}đ - 1đ=${settings.vndPerPoint.toLocaleString()}đ`
        const logId = generateId()
        supabase.from('activity_logs').insert({
            id: logId, user_id: currentUserId, type: 'update',
            entity_type: 'loyalty_settings', entity_id: settings.id,
            details, created_at: new Date().toISOString()
        }).then(r => r.error && console.error('Supabase Error (ActivityLog):', r.error))
    }
    return null
}


/**
 * Fully recalculates a customer's statistics by fetching their specific history
 * and then updating both the local state and Supabase.
 */
export async function syncRecalculateCustomerStats(customerId: string) {
    try {
        // 1. Fetch targeted history
        const { orders, appointments, customer: rawCustomer } = await fetchCustomerHistory(customerId)
        if (!rawCustomer) {
            console.error('syncRecalculateCustomerStats: Customer not found', customerId)
            return
        }

        // 2. Map types correctly
        const customer: Customer = {
            id: rawCustomer.id,
            fullName: rawCustomer.full_name,
            phone: rawCustomer.phone,
            phone2: rawCustomer.phone2,
            email: rawCustomer.email,
            gender: rawCustomer.gender,
            birthday: rawCustomer.birthday,
            avatar: rawCustomer.avatar,
            facebook: rawCustomer.facebook,
            zalo: rawCustomer.zalo,
            address: rawCustomer.address,
            rank: rawCustomer.rank,
            points: rawCustomer.points || 0,
            totalSpent: rawCustomer.total_spent || 0,
            walletBalance: rawCustomer.wallet_balance || 0,
            lastVisit: rawCustomer.last_visit || 'Chưa có',
            isVip: rawCustomer.is_vip || false,
            medicalNotes: rawCustomer.medical_notes,
            professionalNotes: rawCustomer.professional_notes,
            branchId: rawCustomer.branch_id,
            treatmentCards: rawCustomer.treatment_cards || [],
            createdAt: rawCustomer.created_at,
            updatedAt: rawCustomer.updated_at
        }

        // Map orders and appointments back to frontend types for calculation
        const mappedOrders: ServiceOrder[] = orders.map((o: any) => ({
            id: o.id,
            code: o.code,
            customerId: o.customer_id,
            branchId: o.branch_id,
            lineItems: o.line_items || [],
            totalAmount: o.total_amount || 0,
            actualAmount: o.actual_amount || 0,
            debtAmount: o.debt_amount || 0,
            payments: o.payments || [],
            status: o.status || 'draft',
            createdBy: o.created_by || 'system',
            createdAt: o.created_at,
            updatedAt: o.updated_at
        }))

        const mappedAppts: Appointment[] = appointments.map((a: any) => ({
            id: a.id,
            customerId: a.customer_id,
            branchId: a.branch_id,
            appointmentDate: a.appointment_date,
            status: a.status as any,
            price: a.price || 0,
            createdAt: a.created_at,
            updatedAt: a.updated_at
        }))

        // 3. Get dependencies for calculation
        const state = getState()

        // 4. Recalculate
        const updatedCustomer = recalculateCustomerStats(customer, {
            ...state,
            serviceOrders: mappedOrders,
            appointments: mappedAppts
        } as any)

        // 5. Save back
        if (updatedCustomer) {
            // Update local state if needed (might not be in memory, that's fine)
            // But we mostly care about Supabase for this larger-scale sync
            await syncCustomer(updatedCustomer)
            console.log(`Recalculated and synced stats for customer: ${customer.fullName}`)
        }
    } catch (e) {
        console.error('syncRecalculateCustomerStats failed:', e)
    }
}

// ============================================================
// SERVICE CATEGORIES
// ============================================================

export async function syncServiceCategory(cat: ServiceCategory) {
    const { error } = await supabase.from('crm_service_categories').upsert({
        id: cat.id,
        name: cat.name,
        description: cat.description,
        is_active: cat.isActive,
        created_at: cat.createdAt
    })
    if (error) console.error('Supabase Error (ServiceCategory):', JSON.stringify(error, null, 2))
    return null
}

export function saveServiceCategory(cat: ServiceCategory) {
    return (s: AppState): AppState => ({
        ...s,
        serviceCategories: s.serviceCategories?.some(x => x.id === cat.id)
            ? s.serviceCategories.map(x => x.id === cat.id ? cat : x)
            : [...(s.serviceCategories || []), cat]
    })
}

export async function deleteServiceCategoryDB(id: string) {
    const { error } = await supabase.from('crm_service_categories').delete().eq('id', id)
    if (error) console.error('Supabase Error (Delete ServiceCategory):', error)
    return null
}

export function removeServiceCategoryState(id: string) {
    return (s: AppState): AppState => ({
        ...s,
        serviceCategories: s.serviceCategories?.filter(x => x.id !== id) || []
    })
}

/**
 * Kiểm tra và kích hoạt thông báo toàn hệ thống nếu giao dịch vượt ngưỡng
 */
async function triggerTransactionAlerts(tx: Transaction) {
    try {
        // 1. Lấy tất cả thông báo giao dịch đang kích hoạt
        const { data: alerts, error } = await supabase
            .from('global_notifications')
            .select('*')
            .eq('is_active', true)
            .eq('is_transaction_alert', true)

        if (error || !alerts || alerts.length === 0) return

        const state = getState()
        const branch = state.branches.find(b => b.id === tx.branchId)
        const branchName = branch?.name || tx.branchId

        for (const alert of alerts) {
            // 2. Kiểm tra ngưỡng số tiền
            if (tx.amount >= (alert.min_amount || 0)) {
                // 3. Cập nhật thông báo để kích hoạt realtime cho tất cả user
                const metadata = {
                    amount: tx.amount.toLocaleString('vi-VN') + 'đ',
                    branch: branchName,
                    date: new Date(tx.date).toLocaleDateString('vi-VN')
                }

                await supabase
                    .from('global_notifications')
                    .update({
                        last_triggered_at: new Date().toISOString(),
                        metadata: metadata
                    })
                    .eq('id', alert.id)
            }
        }
    } catch (err) {
        console.error('Error triggering transaction alerts:', err)
    }
}
