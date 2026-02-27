-- Chuyển đổi các cột UUID sang TEXT để tương thích với ID định dạng chuỗi của ứng dụng (vd: u-admin, b-hq)
-- Do ID là ID của lead có thể được sinh ra từ client không theo chuẩn UUID

-- 1. Bỏ ràng buộc mặc định nếu có (gen_random_uuid)
ALTER TABLE public.crm_leads ALTER COLUMN id DROP DEFAULT;

-- 2. Thay đổi kiểu dữ liệu các cột ID sang TEXT
ALTER TABLE public.crm_leads ALTER COLUMN id TYPE text;
ALTER TABLE public.crm_leads ALTER COLUMN sale_page_staff_id TYPE text;
ALTER TABLE public.crm_leads ALTER COLUMN sale_tele_staff_id TYPE text;
ALTER TABLE public.crm_leads ALTER COLUMN branch_id TYPE text;
ALTER TABLE public.crm_leads ALTER COLUMN customer_id TYPE text;

-- 3. Khôi phục lại giá trị ID mặc định (sử dụng chuỗi ngẫu nhiên nếu cần, nhưng thường client sẽ truyền ID)
COMMENT ON TABLE public.crm_leads IS 'Bảng quản lý lead với ID hỗ trợ định dạng TEXT';
