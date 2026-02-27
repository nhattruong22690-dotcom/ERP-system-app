import { createClient } from '@supabase/supabase-js'
import { seedData } from '../lib/seed'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function main() {
    console.log('Fetching initial data...')
    const data = seedData()

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
            role: u.role, allowed_pages: u.allowedPages || [], permissions: u.permissions || [],
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
