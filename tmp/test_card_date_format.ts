
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
  console.log('Testing column types for crm_treatment_cards...');
  
  const { data: customers } = await supabase.from('crm_customers').select('id').limit(1);
  const validCustId = customers?.[0]?.id;

  // Try with ISO date string
  const { error } = await supabase.from('crm_treatment_cards').insert({
    id: 'card_date_test_' + Date.now(),
    name: 'Date Test',
    customer_id: validCustId,
    type: 'package',
    total: 10,
    used: 0,
    remaining: 10,
    status: 'active',
    purchase_date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
    created_at: new Date().toISOString()
  });

  if (error) {
    console.log('Insert failed:');
    console.log(JSON.stringify(error, null, 2));
  } else {
    console.log('Insert with ISO date succeeded!');
  }
}

test();
