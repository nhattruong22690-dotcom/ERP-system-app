-- ============================================================
-- V14: Hệ thống Danh sách Lương Cố định (Payroll Roster)
-- Chạy script này trên Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.crm_payroll_rosters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    period TEXT NOT NULL, -- Tháng tĩnh, vd '2024-03'
    user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_by TEXT REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(period, user_id) -- Tránh 1 nhân viên bị thêm 2 lần trong 1 tháng
);

ALTER TABLE public.crm_payroll_rosters ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Đọc crm_payroll_rosters" ON public.crm_payroll_rosters FOR SELECT USING (true);
CREATE POLICY "Tạo crm_payroll_rosters" ON public.crm_payroll_rosters FOR INSERT WITH CHECK (true);
CREATE POLICY "Sửa crm_payroll_rosters" ON public.crm_payroll_rosters FOR UPDATE USING (true);
CREATE POLICY "Xóa crm_payroll_rosters" ON public.crm_payroll_rosters FOR DELETE USING (true);

-- Bật realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_payroll_rosters;
