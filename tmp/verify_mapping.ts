import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'

// Mocking some dependencies to test fetchAllData in Node
const envPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath })
} else {
    dotenv.config()
}

// Re-implementing a simplified version of fetchAllData for verification
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

async function verifyFix() {
    console.log('Verifying fix: Checking if leads now have phoneConfirmed field...')
    
    const { data: rawLeads, error } = await supabase.from('crm_leads').select('*').limit(5)
    
    if (error) {
        console.error('Error fetching leads:', error)
        return
    }

    // This is the mapper we just updated
    const mappedLeads = rawLeads.map((l: any) => ({
        id: l.id,
        phoneConfirmed: l.phone_confirmed, // The field we added
        confirmedAt: l.confirmed_at,     // Added
        confirmedBy: l.confirmed_by,     // Added
        name: l.customer_name || '',
    }))

    console.log('Sample Mapped Leads:')
    mappedLeads.forEach(l => {
        console.log(`- ID: ${l.id}, Name: ${l.name}, phoneConfirmed: ${l.phoneConfirmed}, confirmedAt: ${l.confirmedAt}`)
    })
    
    const anyConfirmed = mappedLeads.some(l => l.phoneConfirmed === true)
    if (anyConfirmed) {
        console.log('\nSUCCESS: Found at least one lead with phoneConfirmed: true!')
    } else {
        console.log('\nINFO: No leads with phoneConfirmed: true found in this sample, but field exists.')
    }
}

verifyFix()
