-- Drop existing if needed to ensure type change (UUID -> TEXT)
DROP TABLE IF EXISTS crm_service_categories CASCADE;

-- Create crm_service_categories table
CREATE TABLE IF NOT EXISTS crm_service_categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE crm_service_categories ENABLE ROW LEVEL SECURITY;

-- Simple policies
DROP POLICY IF EXISTS "Allow all for authenticated users" ON crm_service_categories;
CREATE POLICY "Allow all for authenticated users" ON crm_service_categories
    FOR ALL 
    TO authenticated 
    USING (true)
    WITH CHECK (true);

-- Enable Realtime (Idempotent check)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'crm_service_categories'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE crm_service_categories;
    END IF;
END $$;

-- Add category_id to crm_services
-- Note: Using TEXT to match the new ID type
ALTER TABLE crm_services DROP COLUMN IF EXISTS category_id;
ALTER TABLE crm_services ADD COLUMN category_id TEXT REFERENCES crm_service_categories(id);

-- Create an index for performance
CREATE INDEX IF NOT EXISTS idx_crm_services_category_id ON crm_services(category_id);
