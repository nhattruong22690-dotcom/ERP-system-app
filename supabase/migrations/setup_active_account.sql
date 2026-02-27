-- Chạy đoạn mã này trong SQL Editor của Supabase để thêm cột Trạng thái hoạt động
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Đảm bảo tất cả user hiện tại đều đang được kích hoạt mặc định
UPDATE public.users SET is_active = true WHERE is_active IS NULL;
