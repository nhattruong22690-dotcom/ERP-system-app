-- GÁN CHI NHÁNH CHO LEAD (V20.9)
-- Chạy đoạn này trong SQL Editor của Supabase

-- 1. Bổ sung cột branch_id vào bảng crm_leads
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS branch_id TEXT REFERENCES public.branches(id) ON DELETE SET NULL;

-- 2. Index để tìm kiếm theo chi nhánh nhanh hơn
CREATE INDEX IF NOT EXISTS idx_crm_leads_branch_id ON crm_leads(branch_id);
