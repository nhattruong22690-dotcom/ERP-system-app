
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
  const order = {
    id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12", // New Valid UUID
    code: "TEST-003",
    customer_id: "test-customer",
    branch_id: "test-branch",
    appointment_id: "JUNK", // INVALID UUID
    total_amount: 1000,
    status: "draft",
    created_by: "u-admin",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  console.log('Testing upsert with junk appointment_id...');
  const { error } = await supabase.from('crm_service_orders').upsert(order);
  
  if (error) {
    console.error('Upsert Error:', JSON.stringify(error, null, 2));
  } else {
    console.log('Upsert Success!');
  }
}

test();
