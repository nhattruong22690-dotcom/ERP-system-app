-- Migration to add 'type' column to crm_services table
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='crm_services' AND column_name='type') THEN
        ALTER TABLE crm_services ADD COLUMN type TEXT DEFAULT 'single';
    END IF;
END $$;

-- Update existing services if needed (optional, default is 'single')
-- UPDATE crm_services SET type = 'single' WHERE type IS NULL;
