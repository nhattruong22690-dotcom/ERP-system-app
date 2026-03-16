
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
  console.log('Checking IDs...');
  const { data: accounts } = await supabase.from('payment_accounts').select('id, name');
  console.log('Account IDs:', accounts?.map(a => a.id));

  const { data: cats } = await supabase.from('categories').select('id, name');
  console.log('Category IDs:', cats?.map(c => c.id));
}

test();
