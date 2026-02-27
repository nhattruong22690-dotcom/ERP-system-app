const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

const now = new Date().toISOString()

const data = {
    branches: [
        { id: 'b-hq', name: 'Văn Phòng (HQ)', code: 'HQ', isHeadquarter: true, createdAt: now },
    ],
    users: [
        {
            id: 'u-admin', username: 'admin', displayName: 'Quản trị viên', password: 'admin123',
            role: 'admin', title: 'Administrator', createdAt: now,
            permissions: ['plan_edit', 'transaction_edit_all', 'transaction_lock', 'branch_view_all', 'user_manage', 'branch_manage', 'category_manage', 'account_manage'],
            allowedPages: ['/dashboard', '/planning', '/transactions', '/accounts', '/cashflow', '/settings/branches', '/settings/accounts', '/settings/categories', '/settings/users']
        },
        {
            id: 'u-director', username: 'giamdoc', displayName: 'Giám đốc', password: 'giamdoc123',
            role: 'director', title: 'Giám đốc', createdAt: now,
            permissions: ['plan_edit', 'transaction_edit_all', 'branch_view_all'],
            allowedPages: ['/dashboard', '/planning', '/transactions', '/accounts', '/cashflow']
        },
        {
            id: 'u-ketoan', username: 'ketoan', displayName: 'Trần Thị Lan', password: 'ketoan123',
            role: 'accountant', title: 'Kế toán trưởng', createdAt: now,
            permissions: ['plan_edit', 'transaction_edit_all', 'branch_view_all'],
            allowedPages: ['/dashboard', '/planning', '/transactions', '/accounts', '/cashflow']
        },
    ],
    categories: [
        { id: 'c-rev-dt', name: 'Doanh thu dịch vụ', section: 'revenue', sortOrder: 1, createdAt: now },
        { id: 'c-rev-sp', name: 'Bán sản phẩm', section: 'revenue', sortOrder: 2, createdAt: now },
        { id: 'c-exp-luong', name: 'Lương nhân sự', section: 'cogs', sortOrder: 1, createdAt: now },
        { id: 'c-exp-vt', name: 'Vật tư tiêu hao', section: 'cogs', sortOrder: 2, createdAt: now },
        { id: 'c-exp-mb', name: 'Mặt bằng', section: 'opex_fixed', sortOrder: 1, createdAt: now },
        { id: 'c-exp-mkt', name: 'Marketing', section: 'opex_var', sortOrder: 1, createdAt: now },
    ],
    accounts: [
        { id: 'pa-cash-hq', name: 'Tiền mặt VP', type: 'cash', initialBalance: 0, createdAt: now },
        { id: 'pa-bank-hq', name: 'Ngân hàng VP', type: 'bank', bankName: 'Vietcombank', accountNumber: '0011234567890', accountHolder: 'Công ty', initialBalance: 0, createdAt: now },
    ]
}

async function main() {
    console.log('Inserting branches...')
    for (const b of data.branches) {
        await supabase.from('branches').upsert({
            id: b.id, name: b.name, code: b.code, is_headquarter: b.isHeadquarter,
            created_at: b.createdAt
        })
    }

    console.log('Inserting users...')
    for (const u of data.users) {
        await supabase.from('users').upsert({
            id: u.id, username: u.username, display_name: u.displayName, password: u.password,
            role: u.role, allowed_pages: u.allowedPages, permissions: u.permissions,
            branch_id: u.branchId, title: u.title, created_at: u.createdAt
        })
    }

    console.log('Inserting categories...')
    for (const c of data.categories) {
        await supabase.from('categories').upsert({
            id: c.id, name: c.name, section: c.section, sort_order: c.sortOrder,
            created_at: c.createdAt
        })
    }

    console.log('Inserting payment accounts...')
    for (const a of data.accounts) {
        await supabase.from('payment_accounts').upsert({
            id: a.id, name: a.name, type: a.type, initial_balance: a.initialBalance,
            branch_id: a.branchId, bank_name: a.bankName, account_number: a.accountNumber,
            account_holder: a.accountHolder, created_at: a.createdAt
        })
    }

    console.log('Done mapping entities')
}

main().catch(console.error)
