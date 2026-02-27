-- FIX LIÊN KẾT SALE & LEAD TRONG LỊCH HẸN (V20.8)
-- Chạy đoạn này trong SQL Editor của Supabase

-- 1. Bổ sung các cột thông tin Sale và Lead vào bảng Lịch hẹn
ALTER TABLE crm_appointments ADD COLUMN IF NOT EXISTS lead_id TEXT;
ALTER TABLE crm_appointments ADD COLUMN IF NOT EXISTS sale_tele_id TEXT;
ALTER TABLE crm_appointments ADD COLUMN IF NOT EXISTS sale_tele_name TEXT;
ALTER TABLE crm_appointments ADD COLUMN IF NOT EXISTS sale_page_id TEXT;
ALTER TABLE crm_appointments ADD COLUMN IF NOT EXISTS sale_page_name TEXT;

-- 2. Bổ sung các trường bổ trợ nếu chưa có
ALTER TABLE crm_appointments ADD COLUMN IF NOT EXISTS price NUMERIC DEFAULT 0;
ALTER TABLE crm_appointments ADD COLUMN IF NOT EXISTS end_time TIME;
ALTER TABLE crm_appointments ADD COLUMN IF NOT EXISTS logs JSONB DEFAULT '[]'::jsonb;
ALTER TABLE crm_appointments ADD COLUMN IF NOT EXISTS red_flags JSONB DEFAULT '[]'::jsonb;
ALTER TABLE crm_appointments ADD COLUMN IF NOT EXISTS service_entries JSONB DEFAULT '[]'::jsonb;

-- 3. (Tùy chọn) Index để tìm kiếm nhanh
CREATE INDEX IF NOT EXISTS idx_crm_appointments_lead_id ON crm_appointments(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_appointments_sale_page_id ON crm_appointments(sale_page_id);
