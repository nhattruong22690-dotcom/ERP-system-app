-- THÊM CÁC CỘT CÒN THIẾU VÀO BẢNG USERS ĐỂ ĐỒNG BỘ DỮ LIỆU NHÂN SỰ
-- Chạy script này trong SQL Editor của Supabase

-- 1. Cột Link tới chức danh động
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS job_title_id TEXT REFERENCES public.crm_job_titles(id);

-- 2. Cột Cấu hình chấm công cho từng cá nhân
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS has_attendance BOOLEAN DEFAULT true;

-- 3. Cột Quyền hạn xem toàn hệ thống cho cá nhân
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS view_all_branches BOOLEAN DEFAULT false;

-- Cập nhật ghi chú
COMMENT ON COLUMN public.users.job_title_id IS 'ID chức danh từ bảng crm_job_titles';
COMMENT ON COLUMN public.users.has_attendance IS 'Xác định nhân sự này có cần chấm công hay không';
COMMENT ON COLUMN public.users.view_all_branches IS 'Quyền xem dữ liệu mọi chi nhánh cho cá nhân (không phụ thuộc vào branch_id)';
