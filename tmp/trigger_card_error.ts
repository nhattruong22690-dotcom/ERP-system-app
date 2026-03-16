
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
  console.log('Triggering error for crm_treatment_cards...');
  // Attempting to insert a blank object to trigger missing column/constraint error
  const { data, error } = await supabase.from('crm_treatment_cards').insert({
    id: 'test-error-id'
  });
  
  if (error) {
    console.log('Error triggered (Expected):');
    console.log(JSON.stringify(error, null, 2));
  } else {
    console.log('Insert succeeded? (Unexpected):', data);
  }
}

test();
