-- CREATE TABLE crm_service_orders
CREATE TABLE IF NOT EXISTS public.crm_service_orders (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    customer_id TEXT REFERENCES public.crm_customers(id) ON DELETE CASCADE,
    branch_id TEXT REFERENCES public.branches(id) ON DELETE SET NULL,
    appointment_id TEXT REFERENCES public.crm_appointments(id) ON DELETE SET NULL,
    line_items JSONB DEFAULT '[]'::JSONB,
    total_amount NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed', 'completed', 'cancelled')),
    created_by TEXT REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.crm_service_orders ENABLE ROW LEVEL SECURITY;

-- Allow all access (custom auth)
DROP POLICY IF EXISTS "Allow all access to service orders" ON public.crm_service_orders;
CREATE POLICY "Allow all access to service orders" ON public.crm_service_orders FOR ALL USING (true) WITH CHECK (true);

-- Enable Realtime
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'crm_service_orders'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_service_orders;
    END IF;
END $$;
