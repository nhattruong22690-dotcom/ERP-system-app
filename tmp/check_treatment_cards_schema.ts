
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  console.log('Checking crm_treatment_cards schema...');
  const { data, error } = await supabase.from('crm_treatment_cards').select('*').limit(1);
  if (error) {
    console.error('Error fetching card:', error);
  } else {
    console.log('Card columns:', Object.keys(data[0] || {}));
    if (data[0]) {
        console.log('Sample card:', JSON.stringify(data[0], null, 2));
    } else {
        console.log('No data in crm_treatment_cards yet.');
        // Try to trigger a dummy insert to see schema errors or use RPC if available
    }
  }
}

test();
