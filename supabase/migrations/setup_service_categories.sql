-- CREATE TABLE crm_service_categories
CREATE TABLE IF NOT EXISTS public.crm_service_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.crm_service_categories ENABLE ROW LEVEL SECURITY;

-- Allow all access (custom auth)
DROP POLICY IF EXISTS "Allow all access to service categories" ON public.crm_service_categories;
CREATE POLICY "Allow all access to service categories" ON public.crm_service_categories FOR ALL USING (true) WITH CHECK (true);

-- Enable Realtime
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'crm_service_categories'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_service_categories;
    END IF;
END $$;
