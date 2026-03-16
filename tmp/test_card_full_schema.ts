
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
  console.log('Testing ALL column types for crm_treatment_cards...');
  
  const { data: customers } = await supabase.from('crm_customers').select('id').limit(1);
  const validCustId = customers?.[0]?.id;

  const { error } = await supabase.from('crm_treatment_cards').insert({
    id: 'card_full_test_' + Date.now(),
    customer_id: validCustId,
    name: 'Full Test',
    type: 'package',
    total: 10,
    used: 0,
    remaining: 10,
    expiry_date: new Date().toISOString().split('T')[0],
    warranty_expiry_date: new Date().toISOString().split('T')[0], // Optional?
    status: 'active',
    purchase_date: new Date().toISOString().split('T')[0],
    created_at: new Date().toISOString()
  });

  if (error) {
    console.log('Full insert failed:');
    console.log(JSON.stringify(error, null, 2));
  } else {
    console.log('Full insert with all columns succeeded!');
  }
}

test();
