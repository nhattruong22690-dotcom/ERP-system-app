import { Category, MonthlyPlan, CategoryPlan, CashFlowRow, Transaction, AlertItem, Branch, Lead, CommissionSetting, Tier, Customer, ServiceOrder, Appointment, MembershipTier, AppState, CustomerRank, TreatmentCard } from './types'

// Tính plannedAmount từ rate hoặc fixedAmount
export function calcPlannedAmount(cp: CategoryPlan, kpiRevenue: number): number {
    if (cp.disabled) return 0
    if (cp.rate !== undefined && cp.rate > 0) return Math.round(cp.rate * kpiRevenue)
    return cp.fixedAmount ?? 0
}

// Tái tính toàn bộ plan sau khi thay đổi KPI hoặc rate
export function recalcPlan(plan: MonthlyPlan): MonthlyPlan {
    return {
        ...plan,
        categoryPlans: plan.categoryPlans.map(cp => ({
            ...cp,
            plannedAmount: calcPlannedAmount(cp, plan.kpiRevenue),
        })),
        updatedAt: new Date().toISOString(),
    }
}

// Lấy tổng thực tế của 1 category trong 1 khoảng thời gian hoặc theo tháng tại 1 chi nhánh
export function getActualForCategory(
    transactions: Transaction[],
    branchId: string,
    categoryId: string,
    year: number,
    month: number,
    fromDate?: string,
    toDate?: string
): number {
    return transactions
        .filter(tx => {
            if (tx.branchId !== branchId) return false
            if (tx.categoryId !== categoryId) return false

            const txDate = tx.date.split('T')[0]
            if (fromDate && toDate) {
                return txDate >= fromDate && txDate <= toDate
            } else {
                return new Date(tx.date).getFullYear() === year &&
                    new Date(tx.date).getMonth() + 1 === month
            }
        })
        .reduce((sum, tx) => sum + tx.amount, 0)
}

// Build cash flow rows để so sánh KH vs Thực tế
export function buildCashFlowRows(
    plan: MonthlyPlan,
    categories: Category[],
    transactions: Transaction[],
    fromDate?: string,
    toDate?: string
): CashFlowRow[] {
    return plan.categoryPlans
        .filter(cp => !cp.disabled)
        .map(cp => {
            const cat = categories.find(c => c.id === cp.categoryId)
            if (!cat) return null
            const actual = getActualForCategory(transactions, plan.branchId, cp.categoryId, plan.year, plan.month, fromDate, toDate)
            const planned = cp.plannedAmount
            const delta = actual - planned
            const pct = planned > 0 ? (actual / planned) * 100 : actual > 0 ? 999 : 0

            const isRevenue = cat.section === 'revenue'
            const remaining = isRevenue ? actual - planned : planned - actual
            const isNegativeStatus = isRevenue ? (actual < planned) : (actual > planned)

            let status: 'ok' | 'warning' | 'exceeded' = 'ok'
            if (isRevenue) {
                if (pct < (cp.alertThreshold * 100)) status = planned > 0 ? 'warning' : 'ok'
                if (actual < planned * 0.5) status = 'exceeded'
            } else {
                if (pct >= (cp.alertThreshold * 100) && pct < 100) status = 'warning'
                if (pct > 100) status = 'exceeded'
            }

            return {
                categoryId: cp.categoryId,
                categoryName: cat.name,
                section: cat.section,
                planned,
                actual,
                delta,
                remaining,
                isNegativeStatus,
                pct,
                alertThreshold: cp.alertThreshold,
                status,
                disabled: cp.disabled,
            } as CashFlowRow
        })
        .filter(Boolean) as CashFlowRow[]
}

// Build alert items for all branches
export function buildAlerts(
    plans: MonthlyPlan[],
    categories: Category[],
    transactions: Transaction[],
    branches: Branch[],
    includeAll: boolean = false,
    fromDate?: string,
    toDate?: string
): AlertItem[] {
    const alerts: AlertItem[] = []
    for (const plan of plans) {
        const rows = buildCashFlowRows(plan, categories, transactions, fromDate, toDate)
        for (const row of rows) {
            if (includeAll || row.status === 'warning' || row.status === 'exceeded') {
                const branch = branches.find(b => b.id === plan.branchId)
                alerts.push({
                    categoryId: row.categoryId,
                    categoryName: row.categoryName,
                    branchName: branch?.name ?? plan.branchId,
                    branchId: plan.branchId,
                    month: plan.month,
                    year: plan.year,
                    planned: row.planned,
                    actual: row.actual,
                    pct: row.pct,
                    status: row.status,
                })
            }
        }
    }
    return alerts.sort((a, b) => {
        if (a.status === b.status) return 0
        if (a.status === 'exceeded') return -1
        if (b.status === 'exceeded') return 1
        if (a.status === 'warning') return -1
        if (b.status === 'warning') return 1
        return 0
    })
}

// Format VND
export function fmtVND(amount: number): string {
    if (amount === 0) return '—'
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)
}

export function fmtPct(rate: number): string {
    return (rate * 100).toFixed(2) + '%'
}

// Tính số dư hiện tại của toàn bộ tài khoản
export function calculateAccountBalances(state: { accounts: any[], transactions: Transaction[] }): Record<string, number> {
    const balances: Record<string, number> = {}

    // Khởi tạo với số dư ban đầu
    state.accounts.forEach(acc => {
        balances[acc.id] = acc.initialBalance || 0
    })

    // Cộng/trừ theo giao dịch
    state.transactions.forEach(tx => {
        if (!balances[tx.paymentAccountId]) balances[tx.paymentAccountId] = 0

        if (tx.type === 'income') {
            balances[tx.paymentAccountId] += tx.amount
        } else if (tx.type === 'expense') {
            balances[tx.paymentAccountId] -= tx.amount
        } else if (tx.type === 'transfer' && tx.toPaymentAccountId) {
            // Debit source
            balances[tx.paymentAccountId] -= tx.amount
            // Credit destination
            if (!balances[tx.toPaymentAccountId]) balances[tx.toPaymentAccountId] = 0
            balances[tx.toPaymentAccountId] += tx.amount
        }
    })

    return balances
}

export function fmtDate(isoDate: string): string {
    return new Date(isoDate).toLocaleDateString('vi-VN')
}

// V21: Tính hoa hồng SĐT dựa trên quy tắc Tiered
export function calculateLeadCommission(
    leads: Lead[],
    settings: CommissionSetting[],
    userId: string,
    monthStr: string // "YYYY-MM"
): { count: number; amount: number; ruleName: string } {
    // Tìm các quy tắc lấy SĐT
    // Ưu tiên hành động 'lead_phone', sau đó mới đến các ruleCode cũ
    let activeRules = settings.filter(s => (s.action === 'lead_phone' || s.ruleCode === 'phone_collect') && s.isActive)

    if (activeRules.length === 0) {
        return { count: 0, amount: 0, ruleName: 'Quy tắc chưa bật' }
    }


    // Lọc lead do user này lấy SĐT trong tháng
    const userLeads = leads.filter(l =>
        (l.salePageStaffId === userId || l.salePageId === userId) &&
        l.phone &&
        (l.phoneObtainedAt || l.createdAt).startsWith(monthStr)
    )

    const count = userLeads.length
    let totalAmount = 0
    const ruleNames: string[] = []

    activeRules.forEach(rule => {
        let ruleAmount = 0
        if (rule.type === 'tiered' && rule.tiers) {
            const sortedTiers = [...rule.tiers].sort((a, b) => b.min - a.min)
            const tier = sortedTiers.find(t => count >= t.min)
            if (tier) {
                ruleAmount = count * tier.amount
            }
        } else if (rule.type === 'fixed') {
            ruleAmount = count * rule.amount
        } else if (rule.type === 'kpi' && rule.condition) {
            try {
                // Regex to find comparison like >= 50
                const minMatch = rule.condition.match(/>=\s*(\d+)/)
                if (minMatch) {
                    const min = parseInt(minMatch[1])
                    if (count >= min) ruleAmount = rule.amount
                }
            } catch (e) {
                console.error('KPI condition error:', rule.condition)
            }
        }

        if (ruleAmount > 0) {
            totalAmount += ruleAmount
            ruleNames.push(rule.name)
        }
    })

    return {
        count,
        amount: totalAmount,
        ruleName: ruleNames.length > 0 ? ruleNames.join(' + ') : activeRules[0].name
    }
}

// V22: Tính hoa hồng từ Lịch hẹn dựa trên quy tắc cấu hình
export function calculateAppointmentCommissions(
    appointments: any[],
    settings: CommissionSetting[],
    userId: string,
    monthStr: string // "YYYY-MM"
): { amount: number; count: number; details: string[] } {
    const details: string[] = []
    let totalAmount = 0
    let totalCount = 0

    // Tìm các quy tắc liên quan đến Lịch hẹn (Arrived / Completed)
    const activeRules = settings.filter(s =>
        (s.action === 'appointment_arrived' || s.action === 'appointment_completed') &&
        s.isActive
    )

    if (activeRules.length === 0) return { amount: 0, count: 0, details: [] }

    activeRules.forEach(rule => {
        // Lọc danh sách lịch hẹn phù hợp với quy tắc này
        const targetStatus = rule.action === 'appointment_arrived' ? 'arrived' : 'completed'

        const matchedApts = appointments.filter(a => {
            const isMyApt = (a.staffId === userId || a.saleTeleId === userId || a.salePageId === userId)
            const isRightMonth = a.appointmentDate?.startsWith(monthStr)
            // Nếu là 'arrived', ta chấp nhận cả 'arrived' và 'completed' (vì completed chắc chắn đã arrived)
            const isRightStatus = rule.action === 'appointment_arrived'
                ? (a.status === 'arrived' || a.status === 'completed')
                : (a.status === 'completed')

            return isMyApt && isRightMonth && isRightStatus && a.kpiConfirmed !== false
        })

        if (matchedApts.length > 0) {
            let ruleAmount = 0
            if (rule.type === 'fixed') {
                ruleAmount = matchedApts.length * (rule.amount || 0)
            } else if (rule.type === 'percentage') {
                const totalRevenue = matchedApts.reduce((sum, a) => sum + (a.price || 0), 0)
                ruleAmount = Math.round(totalRevenue * ((rule.amount || 0) / 100))
            }

            if (ruleAmount > 0) {
                totalAmount += ruleAmount
                totalCount += matchedApts.length
                details.push(`${rule.name}: +${fmtVND(ruleAmount)} (${matchedApts.length} lượt)`)
            }
        }
    })

    return { amount: totalAmount, count: totalCount, details }
}

/**
 * V22: Tính thưởng KPI và Hoa hồng dựa trên % đạt chỉ tiêu (KPI Tiered)
 * Dành cho Team Sale Page & Sale Tele
 */
export function calculateKpiTieredCommissions(
    userId: string,
    monthStr: string,
    state: {
        users: any[],
        userMissions: any[],
        commissionSettings: any[],
        appointments: any[],
        leads: any[]
    }
): {
    bonusKpi: number,
    commissionAmount: number,
    kpiPct: number,
    targetKpi: number,
    actualKpi: number,
    details: string[],
    matchedLeads: any[],
    matchedAppointments: any[]
} {
    const details: string[] = []
    let bonusKpi = 0
    let commissionAmount = 0
    let kpiPct = 0
    let targetKpi = 0
    let actualKpi = 0

    // 1. Tìm mission của user trong tháng này
    const myMissions = state.userMissions.filter(m =>
        m.userId === userId &&
        m.isActive &&
        // Quan trọng: Phải thuộc tháng đang tính (hoặc không giới hạn ngày)
        (!m.startDate || m.startDate.startsWith(monthStr) || (m.startDate <= `${monthStr}-31` && (m.endDate || '9999') >= `${monthStr}-01`))
    )
    const monthlyMissions = myMissions.filter(m => m.cycle === 'monthly')
    const missionsToCalc = [...(monthlyMissions.length > 0 ? monthlyMissions : myMissions)]

    if (missionsToCalc.length === 0) {
        details.push(`Không tìm thấy chỉ tiêu KPI gán cho tháng ${monthStr}.`)
        return { bonusKpi, commissionAmount, kpiPct, targetKpi, actualKpi, details, matchedLeads: [], matchedAppointments: [] }
    }

    // --- Tự động tính toán CurrentValue dựa trên dữ liệu thực tế ---
    missionsToCalc.forEach(m => {
        if (m.metricType === 'lead_count') {
            m.currentValue = state.leads.filter(l =>
                (l.salePageStaffId === userId || l.salePageId === userId || l.saleTeleStaffId === userId) &&
                l.phone && l.createdAt?.startsWith(monthStr) &&
                l.kpiConfirmed !== false
            ).length
        } else if (m.metricType === 'revenue_total') {
            m.currentValue = state.appointments.filter(a =>
                (a.staffId === userId || a.saleTeleId === userId || a.salePageId === userId) &&
                a.status === 'completed' && a.appointmentDate?.startsWith(monthStr) &&
                a.kpiConfirmed !== false
            ).reduce((sum, a) => sum + (a.price || 0), 0)
        } else if (m.metricType === 'booking_count') {
            m.currentValue = state.appointments.filter(a =>
                (a.staffId === userId || a.saleTeleId === userId || a.salePageId === userId) &&
                (a.status === 'completed' || a.status === 'arrived') &&
                a.appointmentDate?.startsWith(monthStr) &&
                a.kpiConfirmed !== false
            ).length
        }
    })

    // Tính % đạt được trung bình & Tổng Target/Actual cho UI
    targetKpi = missionsToCalc.reduce((s, m) => s + (m.targetValue || 0), 0)
    actualKpi = missionsToCalc.reduce((s, m) => s + (m.currentValue || 0), 0)

    const pcts = missionsToCalc.map(m => {
        const target = m.targetValue || 1
        const current = m.currentValue || 0
        return (current / target) * 100
    })
    kpiPct = Math.round(pcts.reduce((a, b) => a + b, 0) / (pcts.length || 1))

    details.push(`KPI đạt: ${kpiPct}% (Dựa trên ${missionsToCalc.length} chỉ tiêu)`)

    // Thưởng nóng (Daily/Weekly) - Chỉ tính các mission KHÔNG phải monthly
    const hotBonuses = myMissions.filter(m => m.cycle !== 'monthly' && (m.currentValue >= m.targetValue))
        .reduce((sum, m) => sum + (m.rewardAmount || 0), 0)

    if (hotBonuses > 0) {
        bonusKpi += hotBonuses
        details.push(`Thưởng nóng: +${fmtVND(hotBonuses)} (Từ các nhiệm vụ hoàn thành)`)
    }

    // Nếu KPI < 70% thì không được tính Hoa hồng mốc (chỉ được thưởng nóng nếu có)
    if (kpiPct < 70) {
        details.push("KPI < 70%: Không đạt mốc nhận thưởng/hoa hồng bậc thang.")
        return { bonusKpi, commissionAmount, kpiPct, targetKpi, actualKpi, details, matchedLeads: [], matchedAppointments: [] }
    }

    // 2. Tìm quy tắc kpi_tiered
    const userObj = state.users.find(u => u.id === userId)
    const userRole = userObj?.title?.toLowerCase() || ""
    const dept = (userObj?.departmentType || "").toLowerCase()

    // Role detection: Ưu tiên departmentType, sau đó mới tính đến title/displayName
    const isTele = dept === 'sale_tele' || userRole.includes('tele') || userObj?.displayName?.toLowerCase().includes('tele')
    const isPage = dept === 'sale_page' || userRole.includes('page') || userObj?.displayName?.toLowerCase().includes('page')

    // 3. Lọc Leads & Appts để tính chi tiết Bonus (Lọc TRƯỚC khi check 70% để UI có dữ liệu hiển thị)
    const userLeads = state.leads.filter(l =>
        (l.salePageStaffId === userId || l.salePageId === userId || l.saleTeleStaffId === userId) &&
        l.createdAt?.startsWith(monthStr) &&
        l.phone && l.kpiConfirmed !== false
    )

    const userAppointments = state.appointments.filter(a =>
        (a.staffId === userId || a.saleTeleId === userId || a.salePageId === userId) &&
        (a.status === 'completed' || a.status === 'arrived') && // Tính cả khách đã đến
        a.appointmentDate?.startsWith(monthStr) &&
        a.kpiConfirmed !== false
    )

    // 4. Nếu KPI < 70% thì không được tính Hoa hồng mốc (chỉ được thưởng nóng nếu có)
    if (kpiPct < 70) {
        details.push("KPI < 70%: Không đạt mốc để nhận Thưởng/Hoa hồng bậc thang.")
        return {
            bonusKpi, commissionAmount, kpiPct, targetKpi, actualKpi, details,
            matchedLeads: userLeads,
            matchedAppointments: userAppointments
        }
    }

    let rule = state.commissionSettings.find(s =>
        s.type === 'kpi_tiered' && s.isActive &&
        (isTele ? s.name.toLowerCase().includes('tele') : s.name.toLowerCase().includes('page'))
    )

    if (!rule) rule = state.commissionSettings.find(s => s.type === 'kpi_tiered' && s.isActive)

    if (!rule || !rule.kpiTiers) {
        details.push("Không tìm thấy cấu hình thưởng KPI bậc thang (kpi_tiered) đang hoạt động.")
        return {
            bonusKpi, commissionAmount, kpiPct, targetKpi, actualKpi, details,
            matchedLeads: userLeads, matchedAppointments: userAppointments
        }
    }

    // 5. Tìm Tier phù hợp
    const sortedTiers = [...rule.kpiTiers].sort((a, b) => (b.minKpi || 0) - (a.minKpi || 0))
    const tier = sortedTiers.find(t => kpiPct >= t.minKpi)

    if (!tier) {
        details.push(`Không có mốc thưởng phù hợp cho mức ${kpiPct}% KPI.`)
        return {
            bonusKpi, commissionAmount, kpiPct, targetKpi, actualKpi, details,
            matchedLeads: userLeads, matchedAppointments: userAppointments
        }
    }

    details.push(`Áp dụng mốc thưởng: >= ${tier.minKpi}% KPI`)

    // 6. Tính toán chi tiết Bonus từ số liệu đã lọc
    const processedLeads = userLeads.map(l => {
        // Sale Page mới được thưởng lấy SĐT
        const bonusSdt = (!isTele) ? (tier.bonusWithPayment || 0) : 0
        return { ...l, bonusSdt }
    })

    const processedAppointments = userAppointments.map(a => {
        let bonusCheckin = 0
        let bonusPsDv = 0

        // Sale Tele được thưởng Check-in (nếu có rule)
        if (isTele) {
            const hasDeposit = a.status === 'completed' || (a.price && a.price > 0)
            bonusCheckin = hasDeposit ? (tier.bonusWithPayment || 0) : (tier.bonusNoPayment || 0)
        }

        // Hoa hồng % Doanh số (Thực thu) dành cho cả 2 hoặc tùy cấu hình
        if (tier.commissionRate > 0 && a.status === 'completed') {
            bonusPsDv = Math.round((a.price || 0) * (tier.commissionRate / 100))
        }
        return { ...a, bonusCheckin, bonusPsDv }
    })

    // 7. Tổng hợp
    if (isTele) {
        const bonusCheckinTotal = processedAppointments.reduce((s, a) => s + (a.bonusCheckin || 0), 0)
        bonusKpi += bonusCheckinTotal
        commissionAmount = processedAppointments.reduce((s, a) => s + (a.bonusPsDv || 0), 0)
        if (bonusCheckinTotal > 0) details.push(`Thưởng Check-in: +${fmtVND(bonusCheckinTotal)}`)
    } else {
        const bonusSdtTotal = processedLeads.reduce((s, l) => s + (l.bonusSdt || 0), 0)
        bonusKpi += bonusSdtTotal
        commissionAmount = processedAppointments.reduce((s, a) => s + (a.bonusPsDv || 0), 0)
        if (bonusSdtTotal > 0) details.push(`Thưởng Lấy SĐT: +${fmtVND(bonusSdtTotal)}`)
    }

    if (commissionAmount > 0) {
        details.push(`Hoa hồng KPI (% Doanh số): +${fmtVND(commissionAmount)}`)
    }

    // Thưởng cố định nếu có trong tier (ngoài bonusSdt/bonusCheckin)
    if (tier.bonusAmount && tier.bonusAmount > 0) {
        bonusKpi += tier.bonusAmount
        details.push(`Thưởng bậc thang cố định: +${fmtVND(tier.bonusAmount)}`)
    }

    return {
        bonusKpi, commissionAmount, kpiPct, targetKpi, actualKpi, details,
        matchedLeads: processedLeads, matchedAppointments: processedAppointments
    }
}

/**
 * Re-calculates customer statistics (Total Spent, Points, Last Visit, Rank)
 * based on completed Service Orders and Appointments.
 */
export function recalculateCustomerStats(customer: Customer, state: AppState): Customer {
    // Include both completed and confirmed orders for financial and treatment tracking
    const orders = (state.serviceOrders || []).filter(o =>
        o.customerId === customer.id && (o.status === 'completed' || o.status === 'confirmed')
    )
    const appointments = (state.appointments || []).filter(a => a.customerId === customer.id && a.status === 'completed')

    // 1. Total Spent (Actual amount paid across all orders)
    const totalSpent = orders.reduce((sum, o) => sum + (o.actualAmount || 0), 0)

    // 2. Loyalty Points
    const settings = state.loyaltySettings || { pointsPerVnd: 0.00001, isActive: true }
    let points = customer.points || 0
    if (settings.isActive) {
        points = Math.floor(totalSpent * (settings.pointsPerVnd || 0.00001))
    }

    // 3. Last Visit
    const lastOrderDate = orders.length > 0
        ? [...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0].createdAt
        : null
    const lastApptDate = appointments.length > 0
        ? [...appointments].sort((a, b) => b.appointmentDate.localeCompare(a.appointmentDate))[0].appointmentDate
        : null

    let lastVisit = customer.lastVisit || 'Chưa có'
    if (lastOrderDate || lastApptDate) {
        const dates = [lastOrderDate, lastApptDate].filter(Boolean) as string[]
        lastVisit = dates.sort().reverse()[0]
    }

    // 4. Rank Determination
    const tiers = [...(state.membershipTiers || [])].sort((a, b) => b.minSpend - a.minSpend)
    let rank = CustomerRank.MEMBER
    for (const tier of tiers) {
        if (totalSpent >= tier.minSpend) {
            if (tier.name === 'Kim Cương') rank = CustomerRank.DIAMOND
            else if (tier.name === 'Bạch Kim') rank = CustomerRank.PLATINUM
            else if (tier.name === 'Vàng') rank = CustomerRank.GOLD
            else if (tier.name === 'Bạc') rank = CustomerRank.SILVER
            else if (tier.name === 'Đồng') rank = CustomerRank.BRONZE
            else rank = CustomerRank.MEMBER
            break
        }
    }

    // 5. Treatment Cards & Wallet Balance
    let walletBalance = 0
    const treatmentCards: TreatmentCard[] = []

    // Map existing cards by a unique property if we want to preserve 'used' (not fully possible with just orders)
    // For now, recreate them accurately from history
    orders.forEach(order => {
        order.lineItems.forEach((item: any) => {
            if (item.serviceType === 'card') {
                walletBalance += (item.cardWalletValue || item.price || 0)
            }
            else if (item.serviceType === 'package' || item.serviceType === 'single') {
                const totalSessions = item.serviceType === 'single' ? 1 : item.totalSessions || 1
                const remaining = totalSessions

                let status: TreatmentCard['status'] = 'active'
                const today = new Date().toISOString().split('T')[0]

                if (item.expiryDate && item.expiryDate < today) {
                    status = 'expired'
                } else if (remaining <= 0) {
                    status = 'completed'
                }

                treatmentCards.push({
                    id: `card_${order.id.slice(0, 8)}_${item.id?.slice(0, 8) || Math.random().toString(36).substr(2, 4)}`,
                    name: item.serviceName,
                    type: item.serviceType === 'package' ? 'package' : 'retail',
                    total: totalSessions,
                    used: 0,
                    remaining: remaining,
                    status: status,
                    expiryDate: item.expiryDate,
                    warrantyExpiryDate: item.warrantyExpiryDate,
                    purchaseDate: new Date(order.createdAt).toLocaleDateString('vi-VN'),
                    createdAt: order.createdAt
                })
            }
        })

        // Deduct used wallet balance
        if ((order as any).payments) {
            (order as any).payments.forEach((p: any) => {
                if (p.method === 'wallet') {
                    walletBalance -= (p.amount || 0)
                }
            })
        }
    })

    return {
        ...customer,
        totalSpent,
        points,
        lastVisit,
        rank,
        walletBalance,
        treatmentCards,
        updatedAt: new Date().toISOString()
    }
}

