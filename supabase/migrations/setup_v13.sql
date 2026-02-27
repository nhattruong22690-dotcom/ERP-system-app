-- ============================================================
-- V13: Hệ thống Phiếu lương Nâng cao
-- Chạy script này trên Supabase SQL Editor
-- ============================================================

-- 0. PATCH: Thêm cột còn thiếu vào crm_job_titles (nếu chưa có)
ALTER TABLE public.crm_job_titles ADD COLUMN IF NOT EXISTS has_attendance BOOLEAN DEFAULT true;

-- 1. Bảng Thưởng KPI và % Doanh số
CREATE TABLE IF NOT EXISTS public.crm_bonuses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    branch_id TEXT REFERENCES public.branches(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK (type IN ('kpi', 'revenue_share')),
    amount NUMERIC NOT NULL DEFAULT 0,
    period TEXT NOT NULL, -- format: 'YYYY-MM'
    note TEXT,
    created_by TEXT REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.crm_bonuses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Đọc crm_bonuses" ON public.crm_bonuses FOR SELECT USING (true);
CREATE POLICY "Tạo crm_bonuses" ON public.crm_bonuses FOR INSERT WITH CHECK (true);
CREATE POLICY "Sửa crm_bonuses" ON public.crm_bonuses FOR UPDATE USING (true);
CREATE POLICY "Xóa crm_bonuses" ON public.crm_bonuses FOR DELETE USING (true);

-- 2. Bảng Giảm trừ vi phạm / kỷ luật
CREATE TABLE IF NOT EXISTS public.crm_deductions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL DEFAULT 'violation' CHECK (type IN ('violation', 'other')),
    amount NUMERIC NOT NULL DEFAULT 0,
    period TEXT NOT NULL,
    note TEXT,
    created_by TEXT REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.crm_deductions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Đọc crm_deductions" ON public.crm_deductions FOR SELECT USING (true);
CREATE POLICY "Tạo crm_deductions" ON public.crm_deductions FOR INSERT WITH CHECK (true);
CREATE POLICY "Sửa crm_deductions" ON public.crm_deductions FOR UPDATE USING (true);
CREATE POLICY "Xóa crm_deductions" ON public.crm_deductions FOR DELETE USING (true);

-- 3. Bảng Ứng lương
CREATE TABLE IF NOT EXISTS public.crm_salary_advances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL DEFAULT 0,
    period TEXT NOT NULL, -- tháng sẽ bị trừ 'YYYY-MM'
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    note TEXT,
    created_by TEXT REFERENCES public.users(id) ON DELETE SET NULL, -- null = tự nhân viên gửi
    approved_by TEXT REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.crm_salary_advances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Đọc crm_salary_advances" ON public.crm_salary_advances FOR SELECT USING (true);
CREATE POLICY "Tạo crm_salary_advances" ON public.crm_salary_advances FOR INSERT WITH CHECK (true);
CREATE POLICY "Sửa crm_salary_advances" ON public.crm_salary_advances FOR UPDATE USING (true);
CREATE POLICY "Xóa crm_salary_advances" ON public.crm_salary_advances FOR DELETE USING (true);

-- 4. Bật realtime cho 3 bảng mới
ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_bonuses;
ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_deductions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_salary_advances;
