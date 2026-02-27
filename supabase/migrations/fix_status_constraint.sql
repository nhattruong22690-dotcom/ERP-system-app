-- FIX LỖI RÀNG BUỘC TRẠNG THÁI LEAD (V20.6)
-- Chạy đoạn này trong SQL Editor của Supabase

-- 1. Xóa ràng buộc cũ (nếu tên là crm_leads_status_check)
ALTER TABLE crm_leads DROP CONSTRAINT IF EXISTS crm_leads_status_check;

-- 2. Thêm lại ràng buộc mới bao gồm 'new_created' và 'booked'
ALTER TABLE crm_leads ADD CONSTRAINT crm_leads_status_check 
CHECK (status IN ('new', 'new_created', 'contacted', 'booked', 'failed'));

-- 3. (Tùy chọn) Đảm bảo phone_obtained_at tồn tại
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS phone_obtained_at TIMESTAMPTZ;
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS care_logs JSONB DEFAULT '[]'::jsonb;
