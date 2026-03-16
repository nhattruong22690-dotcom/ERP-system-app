
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
  console.log('Final check of ID types...');
  
  // Find a valid customer ID first
  const { data: customers } = await supabase.from('crm_customers').select('id').limit(1);
  const validCustId = customers?.[0]?.id;
  
  if (!validCustId) {
    console.log('No valid customer found to test FK.');
    return;
  }

  console.log('Using valid customer ID:', validCustId);

  // Try with "card_..." format for ID
  const { error } = await supabase.from('crm_treatment_cards').insert({
    id: 'card_test_id_12345',
    name: 'Test Card',
    customer_id: validCustId,
    type: 'package',
    total: 10,
    used: 0,
    remaining: 10,
    status: 'active',
    purchase_date: '2024-03-15',
    created_at: new Date().toISOString()
  });

  if (error) {
    console.log('Error with card_... ID and valid Cust ID:');
    console.log(JSON.stringify(error, null, 2));
  } else {
    console.log('card_... ID succeeded with valid Cust ID!');
  }
}

test();
