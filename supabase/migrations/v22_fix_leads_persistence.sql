-- FIX LỖI UUID VÀ BỔ SUNG CÁC CỘT CẦN THIẾT CHO LEADS & APPOINTMENTS (V22)
-- Bản cập nhật chính thức để hỗ trợ ID định dạng TEXT (u-admin, lead_...)

-- 1. Xử lý crm_leads: Drop các ràng buộc FK cũ (nếu có) trước khi đổi kiểu dữ liệu
DO $$ 
BEGIN 
    -- Drop các constraint có thể gây lỗi khi đổi type sang TEXT
    ALTER TABLE public.crm_leads DROP CONSTRAINT IF EXISTS crm_leads_confirmed_by_fkey;
    ALTER TABLE public.crm_leads DROP CONSTRAINT IF EXISTS crm_leads_kpi_excluded_by_fkey;
    ALTER TABLE public.crm_leads DROP CONSTRAINT IF EXISTS crm_leads_customer_id_fkey;
    ALTER TABLE public.crm_leads DROP CONSTRAINT IF EXISTS crm_leads_branch_id_fkey;
    ALTER TABLE public.crm_leads DROP CONSTRAINT IF EXISTS crm_leads_sale_page_id_fkey;
    ALTER TABLE public.crm_leads DROP CONSTRAINT IF EXISTS crm_leads_sale_page_staff_id_fkey;
    ALTER TABLE public.crm_leads DROP CONSTRAINT IF EXISTS crm_leads_sale_tele_staff_id_fkey;
EXCEPTION WHEN OTHERS THEN 
    NULL;
END $$;

-- 2. Chuyển đổi các cột sang TEXT trong crm_leads
ALTER TABLE public.crm_leads ALTER COLUMN id TYPE text;
ALTER TABLE public.crm_leads ALTER COLUMN sale_page_staff_id TYPE text;
ALTER TABLE public.crm_leads ALTER COLUMN sale_tele_staff_id TYPE text;
ALTER TABLE public.crm_leads ALTER COLUMN customer_id TYPE text;
ALTER TABLE public.crm_leads ALTER COLUMN branch_id TYPE text;

-- 3. Bổ sung các cột xác thực SĐT và KPI cho crm_leads (Đảm bảo kiểu TEXT ngay từ đầu)
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS phone_confirmed BOOLEAN DEFAULT FALSE;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS confirmed_by TEXT;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS actual_service_value NUMERIC DEFAULT 0;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS service_note TEXT;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS kpi_confirmed BOOLEAN DEFAULT TRUE;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS kpi_exclusion_note TEXT;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS kpi_excluded_by TEXT;
ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS kpi_excluded_at TIMESTAMP WITH TIME ZONE;

-- Đảm bảo đổi type cho confirmed_by và kpi_excluded_by nếu đã tồn tại là UUID
ALTER TABLE public.crm_leads ALTER COLUMN confirmed_by TYPE text;
ALTER TABLE public.crm_leads ALTER COLUMN kpi_excluded_by TYPE text;

-- 4. Xử lý crm_appointments: Drop các ràng buộc FK
DO $$ 
BEGIN 
    ALTER TABLE public.crm_appointments DROP CONSTRAINT IF EXISTS crm_appointments_staff_id_fkey;
    ALTER TABLE public.crm_appointments DROP CONSTRAINT IF EXISTS crm_appointments_sale_tele_id_fkey;
    ALTER TABLE public.crm_appointments DROP CONSTRAINT IF EXISTS crm_appointments_sale_page_id_fkey;
    ALTER TABLE public.crm_appointments DROP CONSTRAINT IF EXISTS crm_appointments_customer_id_fkey;
    ALTER TABLE public.crm_appointments DROP CONSTRAINT IF EXISTS crm_appointments_branch_id_fkey;
    ALTER TABLE public.crm_appointments DROP CONSTRAINT IF EXISTS crm_appointments_kpi_excluded_by_fkey;
EXCEPTION WHEN OTHERS THEN 
    NULL;
END $$;

-- 5. Chuyển đổi các cột sang TEXT trong crm_appointments
ALTER TABLE public.crm_appointments ALTER COLUMN staff_id TYPE text;
ALTER TABLE public.crm_appointments ALTER COLUMN sale_tele_id TYPE text;
ALTER TABLE public.crm_appointments ALTER COLUMN sale_page_id TYPE text;
ALTER TABLE public.crm_appointments ALTER COLUMN customer_id TYPE text;
ALTER TABLE public.crm_appointments ALTER COLUMN branch_id TYPE text;
ALTER TABLE public.crm_appointments ALTER COLUMN kpi_excluded_by TYPE text;

-- 6. Ghi chú và hoàn thiện
COMMENT ON COLUMN public.crm_leads.confirmed_by IS 'Staff ID xác nhận SĐT chính xác (TEXT để hỗ trợ u-admin)';
COMMENT ON TABLE public.crm_leads IS 'Bảng Leads - Đã fix hoàn toàn lỗi UUID mismatch và ràng buộc FK';
