
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
  console.log('Checking crm_leads schema...');
  const { data, error } = await supabase.from('crm_leads').select('*').limit(1);
  if (error) {
    console.error('Error fetching lead:', error);
  } else {
    console.log('Lead columns:', Object.keys(data[0] || {}));
    if (data[0]) {
        console.log('Sample lead:', JSON.stringify(data[0], null, 2));
    }
  }
}

test();
