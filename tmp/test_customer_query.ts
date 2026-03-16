
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  console.log('Testing raw query...');
  const { data, count, error } = await supabase
    .from('crm_customers')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(0, 24);

  if (error) {
    console.error('Query Error:', error);
  } else {
    console.log('Success, data count:', data?.length, 'exact count:', count);
  }
}

test();
