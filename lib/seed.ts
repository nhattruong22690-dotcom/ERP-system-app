import { AppState, User, Branch, PaymentAccount, Category, MonthlyPlan } from '@/lib/types'

function uid() {
    return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

// Simple hash (not secure - for demo only)
export function hashPassword(pw: string): string {
    let hash = 0
    for (let i = 0; i < pw.length; i++) {
        hash = ((hash << 5) - hash) + pw.charCodeAt(i)
        hash |= 0
    }
    return hash.toString(16)
}

export function seedData(): AppState {
    const now = new Date().toISOString()

    // BRANCHES - Only keep HQ for clean start
    const branches: Branch[] = [
        { id: 'b-hq', name: 'Văn Phòng (HQ)', code: 'HQ', type: 'hq', isHeadquarter: true, createdAt: now },
    ]

    // USERS - Keep administrative roles
    const users: User[] = [
        {
            id: 'u-admin',
            username: 'admin',
            displayName: 'Quản trị viên',
            password: 'admin123',
            role: 'admin',
            title: 'Administrator',
            hasAttendance: true,
            createdAt: now,
        },
        {
            id: 'u-director',
            username: 'giamdoc',
            displayName: 'Giám đốc',
            password: 'giamdoc123',
            role: 'director',
            title: 'Giám đốc',
            hasAttendance: true,
            createdAt: now,
        },
        {
            id: 'u-ketoan',
            username: 'ketoan',
            displayName: 'Trần Thị Lan',
            password: 'ketoan123',
            role: 'accountant',
            title: 'Kế toán trưởng',
            hasAttendance: true,
            createdAt: now,
        },
    ]

    // PAYMENT ACCOUNTS - Minimal set for HQ
    const accounts: PaymentAccount[] = [
        { id: 'pa-cash-hq', name: 'Tiền mặt VP', type: 'cash', initialBalance: 0, createdAt: now },
        { id: 'pa-bank-hq', name: 'Ngân hàng VP', type: 'bank', bankName: 'Vietcombank', accountNumber: '0011234567890', accountHolder: 'Công ty', initialBalance: 0, createdAt: now },
        { id: 'pa-wallet', name: 'Ví thành viên (Nội bộ)', type: 'cash', initialBalance: 0, createdAt: now },
    ]

    // CATEGORIES - Keep these as they are the core structure
    const categories: Category[] = [
        // Revenue
        { id: 'cat-rev-product', name: 'Bán sản phẩm', section: 'revenue', isRateBased: false, sortOrder: 1, createdAt: now },
        { id: 'cat-rev-service', name: 'Bán dịch vụ', section: 'revenue', isRateBased: false, sortOrder: 2, createdAt: now },
        { id: 'cat-rev-package', name: 'Bán gói làm đẹp', section: 'revenue', isRateBased: false, sortOrder: 3, createdAt: now },
        { id: 'cat-rev-other', name: 'Thu khác', section: 'revenue', isRateBased: false, sortOrder: 4, createdAt: now },
        // Fixed costs
        { id: 'cat-fc-rent', name: 'Tiền thuê VP, MB', section: 'fixed_cost', isRateBased: false, sortOrder: 10, createdAt: now },
        { id: 'cat-fc-license', name: 'Chứng chỉ hành nghề', section: 'fixed_cost', isRateBased: false, sortOrder: 11, createdAt: now },
        { id: 'cat-fc-ops', name: 'Chi phí điều hành VP', section: 'fixed_cost', defaultRate: 0.15, isRateBased: true, sortOrder: 12, createdAt: now },
        { id: 'cat-fc-electric', name: 'Điện', section: 'fixed_cost', isRateBased: false, sortOrder: 13, createdAt: now },
        { id: 'cat-fc-water', name: 'Nước', section: 'fixed_cost', isRateBased: false, sortOrder: 14, createdAt: now },
        { id: 'cat-fc-internet', name: 'Internet', section: 'fixed_cost', isRateBased: false, sortOrder: 15, createdAt: now },
        { id: 'cat-fc-doctor', name: 'Lương bác sĩ', section: 'fixed_cost', isRateBased: false, sortOrder: 16, createdAt: now },
        { id: 'cat-fc-salary', name: 'Lương NV', section: 'fixed_cost', defaultRate: 0.24, isRateBased: true, sortOrder: 17, createdAt: now },
        { id: 'cat-fc-bonus', name: 'Thưởng NV', section: 'fixed_cost', defaultRate: 0.01, isRateBased: true, sortOrder: 18, createdAt: now },
        { id: 'cat-fc-facility', name: 'Cơ sở vật chất', section: 'fixed_cost', isRateBased: false, sortOrder: 19, createdAt: now },
        { id: 'cat-fc-tax', name: 'Thuế', section: 'fixed_cost', isRateBased: false, sortOrder: 20, createdAt: now },
        // Variable costs
        { id: 'cat-vc-marketing', name: 'Marketing', section: 'variable_cost', defaultRate: 0.12, isRateBased: true, sortOrder: 30, createdAt: now },
        { id: 'cat-vc-phone', name: 'Điện thoại', section: 'variable_cost', isRateBased: false, sortOrder: 31, createdAt: now },
        { id: 'cat-vc-hospital', name: 'Phí bệnh viện', section: 'variable_cost', isRateBased: false, sortOrder: 32, createdAt: now },
        { id: 'cat-vc-doctor-fee', name: 'Phí bác sĩ', section: 'variable_cost', isRateBased: false, sortOrder: 33, createdAt: now },
        { id: 'cat-vc-model', name: 'Người mẫu', section: 'variable_cost', isRateBased: false, sortOrder: 34, createdAt: now },
        { id: 'cat-vc-commission', name: 'HH khách', section: 'variable_cost', defaultRate: 0.02, isRateBased: true, sortOrder: 35, createdAt: now },
        { id: 'cat-vc-tools', name: 'Công cụ dụng cụ', section: 'variable_cost', isRateBased: false, sortOrder: 36, createdAt: now },
        { id: 'cat-vc-material', name: 'Nguyên liệu', section: 'variable_cost', defaultRate: 0.12, isRateBased: true, sortOrder: 37, createdAt: now },
        { id: 'cat-vc-sub-material', name: 'Phụ liệu', section: 'variable_cost', defaultRate: 0.005, isRateBased: true, sortOrder: 38, createdAt: now },
        { id: 'cat-vc-base-service', name: 'Dịch vụ cơ sở', section: 'variable_cost', defaultRate: 0.01, isRateBased: true, sortOrder: 39, createdAt: now },
        { id: 'cat-vc-spirit', name: 'Thần thổ', section: 'variable_cost', isRateBased: false, sortOrder: 40, createdAt: now },
        { id: 'cat-vc-support', name: 'Dịch vụ hỗ trợ', section: 'variable_cost', defaultRate: 0.01, isRateBased: true, sortOrder: 41, createdAt: now },
        { id: 'cat-vc-bank-fee', name: 'Phí ngân hàng', section: 'variable_cost', defaultRate: 0.015, isRateBased: true, sortOrder: 42, createdAt: now },
        { id: 'cat-vc-other', name: 'Hỗ trợ khác', section: 'variable_cost', isRateBased: false, sortOrder: 43, createdAt: now },
        // Funds
        { id: 'cat-fund-tet', name: 'Thưởng Tết', section: 'fund', defaultRate: 0.02, isRateBased: true, sortOrder: 50, createdAt: now },
        { id: 'cat-fund-maintain', name: 'Bảo trì khấu hao TS', section: 'fund', defaultRate: 0.01, isRateBased: true, sortOrder: 51, createdAt: now },
        { id: 'cat-fund-reserve', name: 'Quỹ dự phòng', section: 'fund', defaultRate: 0.00833, isRateBased: true, sortOrder: 52, createdAt: now },
        { id: 'cat-fund-reinvest', name: 'Quỹ tái đầu tư', section: 'fund', defaultRate: 0.0125, isRateBased: true, sortOrder: 53, createdAt: now },
        { id: 'cat-fund-ops', name: 'Quỹ vận hành', section: 'fund', defaultRate: 0.00833, isRateBased: true, sortOrder: 54, createdAt: now },
        { id: 'cat-fund-recovery', name: 'Quỹ thu hồi vốn', section: 'fund', defaultRate: 0.01, isRateBased: true, sortOrder: 55, createdAt: now },
        { id: 'cat-fund-dev', name: 'Quỹ phát triển', section: 'fund', defaultRate: 0.00833, isRateBased: true, sortOrder: 56, createdAt: now },
    ]

    return {
        users,
        branches,
        accounts,
        categories,
        plans: [],
        transactions: [],
        customers: [],
        appointments: [],
        services: [],
        membershipTiers: [],
        treatmentCards: [],
        commissionSettings: [
            {
                id: 'rule-phone-collect',
                name: 'Thưởng lấy SĐT (Sale Page)',
                ruleCode: 'phone_collect',
                action: 'lead_phone',
                type: 'tiered',
                amount: 0,
                isActive: true,
                tiers: [
                    { min: 0, max: 200, amount: 5000 },
                    { min: 200, max: null, amount: 8000 }
                ],
                condition: 'Tính dựa trên số lượng SĐT Sale Page lấy được trong tháng',
                createdAt: now,
                updatedAt: now
            },
            {
                id: 'rule-appointment-set',
                name: 'Thưởng chốt lịch (Tele Sale)',
                ruleCode: 'appointment_set',
                action: 'appointment_arrived',
                type: 'fixed',
                amount: 20000,
                isActive: true,
                condition: 'Thưởng khi khách chốt lịch hẹn thành công',
                createdAt: now,
                updatedAt: now
            }
        ],
        leads: [],
        commissionLogs: [],
        userMissions: [],
        jobTitles: [],
        attendance: [],
        salaryHistory: [],
        bonuses: [],
        deductions: [],
        salaryAdvances: [],
        payrollRosters: [],
        serviceOrders: [],
        serviceCategories: [],
        currentUserId: undefined,
        dismissedAlerts: [],
        starredAlerts: [],
        activityLogs: [],
    }
}

function getT1FixedAmount(catId: string): number {
    const fixed: Record<string, number> = {
        'cat-fc-rent': 42000000,
        'cat-fc-license': 63087500,
        'cat-fc-electric': 15000000,
        'cat-fc-water': 2000000,
        'cat-fc-doctor': 60000000,
        'cat-fc-facility': 20000000,
        'cat-fc-tax': 120000000,
        'cat-vc-phone': 4000000,
        'cat-vc-hospital': 15000000,
        'cat-vc-doctor-fee': 5000000,
        'cat-vc-model': 1000000,
        'cat-vc-tools': 2000000,
        'cat-vc-spirit': 3000000,
    }
    return fixed[catId] ?? 0
}

function generateSampleTransactions(now: string) {
    const txns = []
    // Tháng 1 - một số giao dịch mẫu
    txns.push({
        id: 'tx-1', branchId: 'b-govap', date: '2026-01-05', type: 'income' as const,
        categoryId: 'cat-rev-service', amount: 85000000,
        paymentAccountId: 'pa-pos-gv', createdBy: 'u-nv-govap', createdAt: now, updatedAt: now,
        note: 'Doanh thu dịch vụ tuần 1',
    })
    txns.push({
        id: 'tx-2', branchId: 'b-govap', date: '2026-01-10', type: 'expense' as const,
        categoryId: 'cat-fc-salary', amount: 340000000,
        paymentAccountId: 'pa-vcb-gv', createdBy: 'u-ketoan', createdAt: now, updatedAt: now,
        note: 'Lương NV tháng 1',
    })
    txns.push({
        id: 'tx-3', branchId: 'b-govap', date: '2026-01-08', type: 'expense' as const,
        categoryId: 'cat-fc-rent', amount: 42000000,
        paymentAccountId: 'pa-vcb-hq', paidByBranchId: 'b-hq',
        createdBy: 'u-ketoan', createdAt: now, updatedAt: now,
        note: 'VP chi hộ tiền thuê MB tháng 1',
    })
    txns.push({
        id: 'tx-4', branchId: 'b-govap', date: '2026-01-15', type: 'income' as const,
        categoryId: 'cat-rev-product', amount: 120000000,
        paymentAccountId: 'pa-vcb-gv', createdBy: 'u-nv-govap', createdAt: now, updatedAt: now,
        note: 'Doanh thu sản phẩm tuần 2',
    })
    txns.push({
        id: 'tx-5', branchId: 'b-govap', date: '2026-01-20', type: 'expense' as const,
        categoryId: 'cat-vc-marketing', amount: 180000000,
        paymentAccountId: 'pa-tcb-hq', paidByBranchId: 'b-hq',
        createdBy: 'u-ketoan', createdAt: now, updatedAt: now,
        note: 'Marketing tháng 1 — VP chi hộ',
    })
    txns.push({
        id: 'tx-6', branchId: 'b-govap', date: '2026-01-22', type: 'expense' as const,
        categoryId: 'cat-vc-material', amount: 175000000,
        paymentAccountId: 'pa-cash-gv', createdBy: 'u-nv-govap', createdAt: now, updatedAt: now,
        note: 'Mua nguyên liệu',
    })
    txns.push({
        id: 'tx-7', branchId: 'b-govap', date: '2026-01-25', type: 'income' as const,
        categoryId: 'cat-rev-service', amount: 95000000,
        paymentAccountId: 'pa-pos-gv', createdBy: 'u-nv-govap', createdAt: now, updatedAt: now,
        note: 'Doanh thu dịch vụ tuần 3',
    })
    txns.push({
        id: 'tx-8', branchId: 'b-govap', date: '2026-01-28', type: 'expense' as const,
        categoryId: 'cat-fc-electric', amount: 16500000,
        paymentAccountId: 'pa-cash-gv', createdBy: 'u-nv-govap', createdAt: now, updatedAt: now,
        note: 'Tiền điện tháng 1',
    })
    return txns
}
