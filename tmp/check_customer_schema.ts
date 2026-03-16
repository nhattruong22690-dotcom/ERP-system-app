
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  const { data, error } = await supabase.from('crm_customers').select('*').limit(1);
  if (error) {
    console.error('Error fetching customers:', error);
  } else {
    console.log('Customer columns:', Object.keys(data[0] || {}));
    fs.writeFileSync('customer_schema_test.json', JSON.stringify({
      columns: Object.keys(data[0] || {}),
      sample: data[0]
    }, null, 2));
  }
}

test();
