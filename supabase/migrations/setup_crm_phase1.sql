-- Create crm_customers table
CREATE TABLE IF NOT EXISTS public.crm_customers (
    id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    phone2 TEXT,
    gender TEXT CHECK (gender IN ('nam', 'nu', 'khac', null)),
    birthday DATE,
    social_link TEXT,
    notes TEXT,
    branch_id TEXT REFERENCES public.branches(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create crm_appointments table
CREATE TABLE IF NOT EXISTS public.crm_appointments (
    id TEXT PRIMARY KEY,
    customer_id TEXT REFERENCES public.crm_customers(id) ON DELETE CASCADE NOT NULL,
    branch_id TEXT REFERENCES public.branches(id) ON DELETE SET NULL,
    staff_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
    appointment_date DATE NOT NULL,
    appointment_time TIME,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'arrived', 'cancelled', 'no_show', 'completed')),
    type TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Turn on Row Level Security (RLS)
ALTER TABLE public.crm_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_appointments ENABLE ROW LEVEL SECURITY;

-- Allow access (since app uses custom auth)
DROP POLICY IF EXISTS "Allow all access to customers" ON public.crm_customers;
CREATE POLICY "Allow all access to customers" ON public.crm_customers FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to appointments" ON public.crm_appointments;
CREATE POLICY "Allow all access to appointments" ON public.crm_appointments FOR ALL USING (true) WITH CHECK (true);

-- Enable realtime
-- Note: If already added, this might fail or do nothing depending on Supabase version.
-- Usually it's handled via the UI or a single command if not exists.
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

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'crm_appointments'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_appointments;
    END IF;
END $$;
