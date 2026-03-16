
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
  console.log('Testing ID formats for crm_treatment_cards...');
  
  // Try with "card_..." format
  const { error: error1 } = await supabase.from('crm_treatment_cards').insert({
    id: 'card_test_id_12345',
    name: 'Test Card',
    customer_id: 'test-cust', // This might fail due to FK if it exists
    type: 'package',
    total: 10,
    used: 0,
    remaining: 10,
    status: 'active',
    purchase_date: '2024-03-15',
    created_at: new Date().toISOString()
  });

  if (error1) {
    console.log('Error with card_... ID:');
    console.log(JSON.stringify(error1, null, 2));
  } else {
    console.log('card_... ID succeeded!');
    return;
  }

  // Try with UUID format
  const { error: error2 } = await supabase.from('crm_treatment_cards').insert({
    id: '00000000-0000-0000-0000-000000000001',
    name: 'Test Card UUID',
    customer_id: null, // Try null if it's allowed
    type: 'package',
    total: 10,
    used: 0,
    remaining: 10,
    status: 'active',
    purchase_date: '2024-03-15',
    created_at: new Date().toISOString()
  });

  if (error2) {
    console.log('Error with UUID ID:');
    console.log(JSON.stringify(error2, null, 2));
  } else {
    console.log('UUID ID succeeded!');
  }
}

test();
