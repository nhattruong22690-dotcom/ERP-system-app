
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
  const { data, error } = await supabase.from('crm_stats_cache').select('*');
  if (error) {
    console.error('Error fetching cache:', error);
  } else {
    fs.writeFileSync('stats_cache_test.json', JSON.stringify(data, null, 2));
    console.log('Cache data saved to stats_cache_test.json');
  }
}

test();
