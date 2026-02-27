-- Cập nhật bảng users để hỗ trợ cấu hình lương đặc thù dưới dạng JSONB
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS salary_config JSONB DEFAULT '{}'::jsonb;

-- Tạo bảng lưu lại toàn bộ lịch sử thăng tiến/giảm lương của nhân viên
CREATE TABLE IF NOT EXISTS public.crm_salary_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    changed_by TEXT REFERENCES public.users(id) ON DELETE SET NULL,
    old_config JSONB,
    new_config JSONB,
    change_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Phân quyền RLS cho user_salary_history
ALTER TABLE public.crm_salary_history ENABLE ROW LEVEL SECURITY;

-- Ai cũng có thể đọc (trong nội bộ)
CREATE POLICY "Cho phép đọc crm_salary_history" 
ON public.crm_salary_history FOR SELECT 
USING (true);

-- Cho phép insert
CREATE POLICY "Cho phép tạo crm_salary_history" 
ON public.crm_salary_history FOR INSERT 
WITH CHECK (true);

-- (Tùy chọn) Kích hoạt realtime cho bảng mới
alter publication supabase_realtime add table public.crm_salary_history;
