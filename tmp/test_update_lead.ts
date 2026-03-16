import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'

const envPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath })
} else {
    dotenv.config()
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

async function testUpdate() {
    console.log('Testing update on crm_leads...')
    
    // First, get a lead id
    const { data: leads } = await supabase.from('crm_leads').select('id, phone_confirmed').limit(1)
    if (!leads || leads.length === 0) {
        console.log('No leads found.')
        return
    }
    
    const leadId = leads[0].id
    const currentStatus = leads[0].phone_confirmed
    console.log(`Lead ID: ${leadId}, Current phone_confirmed: ${currentStatus}`)
    
    const newStatus = !currentStatus
    console.log(`Trying to set phone_confirmed to: ${newStatus}`)
    
    const { data, error } = await supabase
        .from('crm_leads')
        .update({ 
            phone_confirmed: newStatus,
            confirmed_at: new Date().toISOString()
        })
        .eq('id', leadId)
        .select()
    
    if (error) {
        console.error('Update failed:', error)
    } else {
        console.log('Update successful! Result:', data)
    }
}

testUpdate()
