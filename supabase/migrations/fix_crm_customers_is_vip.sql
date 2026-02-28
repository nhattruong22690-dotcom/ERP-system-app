-- ADD is_vip COLUMN TO crm_customers
ALTER TABLE public.crm_customers ADD COLUMN IF NOT EXISTS is_vip BOOLEAN DEFAULT false;

-- Optional: Update is_vip based on existing rank if needed
-- UPDATE public.crm_customers SET is_vip = true WHERE rank IN ('Platinum', 'Gold');

-- Ensure Realtime is enabled for crm_customers (already exists but just in case)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'crm_customers'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_customers;
    END IF;
END $$;
