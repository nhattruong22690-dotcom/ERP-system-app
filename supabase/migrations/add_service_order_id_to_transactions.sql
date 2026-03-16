-- Migration to add service_order_id to transactions table for linking
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='service_order_id') THEN
        ALTER TABLE transactions ADD COLUMN service_order_id TEXT;
        -- Optional: Add a foreign key if appropriate, but TEXT is safer if we don't want to force strict UUID/links yet
        -- ALTER TABLE transactions ADD CONSTRAINT fk_transactions_service_order FOREIGN KEY (service_order_id) REFERENCES crm_service_orders(id) ON DELETE SET NULL;
    END IF;
END $$;
