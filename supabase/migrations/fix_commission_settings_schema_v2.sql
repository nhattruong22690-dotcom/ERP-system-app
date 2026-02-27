-- FIX COMMISSION SETTINGS SCHEMA (V3)
-- Dynamic Trigger System

-- 1. DROP old table (CAUTION: This deletes existing commission settings data)
DROP TABLE IF EXISTS public.crm_commission_settings CASCADE;

-- 2. CREATE new table with correct columns
CREATE TABLE public.crm_commission_settings (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    rule_code TEXT NOT NULL UNIQUE, -- Developer/Internal slug
    action TEXT NOT NULL,           -- Trigger Event: 'lead_phone', 'appointment_arrived', 'appointment_completed'
    type TEXT NOT NULL CHECK (type IN ('fixed', 'percentage', 'tiered', 'kpi')),
    amount NUMERIC DEFAULT 0,
    tiers JSONB DEFAULT '[]'::JSONB,
    condition TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. ENABLE RLS
ALTER TABLE public.crm_commission_settings ENABLE ROW LEVEL SECURITY;

-- 4. CREATE Policy (Allow all for custom auth setup)
DROP POLICY IF EXISTS "Allow all access" ON public.crm_commission_settings;
CREATE POLICY "Allow all access" ON public.crm_commission_settings FOR ALL USING (true) WITH CHECK (true);

-- 5. ENABLE Realtime
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'crm_commission_settings') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_commission_settings;
    END IF;
END $$;
