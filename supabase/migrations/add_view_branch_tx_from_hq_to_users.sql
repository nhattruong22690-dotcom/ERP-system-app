-- THÊM CỘT XEM GIAO DỊCH CHI NHÁNH TỪ VĂN PHÒNG
-- Chạy script này trong SQL Editor của Supabase
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS view_branch_tx_from_hq BOOLEAN DEFAULT false;
ALTER TABLE public.crm_job_titles
ADD COLUMN IF NOT EXISTS view_branch_tx_from_hq BOOLEAN DEFAULT false;
-- Cập nhật ghi chú
COMMENT ON COLUMN public.users.view_branch_tx_from_hq IS 'Quyền xem toàn bộ giao dịch liên quan đến chi nhánh, bao gồm cả các giao dịch do Văn phòng/Admin tạo cho chi nhánh đó';
COMMENT ON COLUMN public.crm_job_titles.view_branch_tx_from_hq IS 'Quyền xem toàn bộ giao dịch liên quan đến chi nhánh (Mặc định cho chức vụ)';