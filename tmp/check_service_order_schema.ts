
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
  console.log('Checking crm_service_orders schema...');
  const { data: orderData, error: orderError } = await supabase.from('crm_service_orders').select('*').limit(1);
  if (orderError) {
    console.error('Error fetching service order:', orderError);
  } else {
    console.log('Service Order columns:', Object.keys(orderData[0] || {}));
    if (orderData[0]) {
        console.log('Sample order:', JSON.stringify(orderData[0], null, 2));
    }
  }

  console.log('\nChecking transactions schema...');
  const { data: txData, error: txError } = await supabase.from('transactions').select('*').limit(1);
  if (txError) {
    console.error('Error fetching transaction:', txError);
  } else {
    console.log('Transaction columns:', Object.keys(txData[0] || {}));
  }
}

test();
