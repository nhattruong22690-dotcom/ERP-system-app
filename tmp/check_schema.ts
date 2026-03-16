import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'

// Try to find .env file
const envPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath })
} else {
    dotenv.config()
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase env variables')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkSchema() {
    console.log('Checking crm_leads schema...')
    const { data, error } = await supabase
        .from('crm_leads')
        .select('*')
        .limit(1)
    
    if (error) {
        console.error('Error fetching leads:', error)
    } else if (data && data.length > 0) {
        console.log('Columns in crm_leads:', Object.keys(data[0]))
    } else {
        console.log('No data in crm_leads to check columns.')
    }
}

checkSchema()
