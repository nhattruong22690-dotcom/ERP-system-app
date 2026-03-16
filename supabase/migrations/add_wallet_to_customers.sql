-- Migration to add 'wallet_balance' column to crm_customers table
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='crm_customers' AND column_name='wallet_balance') THEN
        ALTER TABLE crm_customers ADD COLUMN wallet_balance DECIMAL(15,2) DEFAULT 0;
    END IF;
END $$;
