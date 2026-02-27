-- FIX LỖI SCHEMA BẢNG LEADS (V20.2)
-- Chạy đoạn này trong SQL Editor của Supabase

-- 1. Thêm cột phone_obtained_at (để tính hoa hồng nóng/lạnh)
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS phone_obtained_at TIMESTAMPTZ;

-- 2. Thêm cột care_logs (lịch sử chăm sóc chi tiết)
-- Sử dụng kiểu JSONB để lưu mảng các log
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS care_logs JSONB DEFAULT '[]'::jsonb;

-- 3. (Tùy chọn) Nếu bảng crm_leads chưa tồn tại thì tạo mới
-- CREATE TABLE IF NOT EXISTS crm_leads (
--     id TEXT PRIMARY KEY,
--     sale_page_id TEXT,
--     name TEXT NOT NULL,
--     phone TEXT,
--     source TEXT,
--     status TEXT,
--     notes TEXT,
--     phone_obtained_at TIMESTAMPTZ,
--     care_logs JSONB DEFAULT '[]'::jsonb,
--     customer_id TEXT,
--     created_at TIMESTAMPTZ DEFAULT NOW()
-- );
