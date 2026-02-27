-- PHIÊN BẢN SỬA LỖI TỔNG LỰC (NUCLEAR RESET - V3)
-- CẢNH BÁO: Đoạn này sẽ xóa và tạo lại 4 bảng Lương để đảm bảo kiểu dữ liệu đồng nhất là TEXT.
-- Sao lưu dữ liệu nếu cần trước khi chạy.

-- 1. Xóa các bảng cũ
DROP TABLE IF EXISTS crm_salary_advances CASCADE;
DROP TABLE IF EXISTS crm_bonuses CASCADE;
DROP TABLE IF EXISTS crm_deductions CASCADE;
DROP TABLE IF EXISTS crm_payroll_rosters CASCADE;

-- 2. Tạo lại bảng Ứng lương (TEXT IDs)
CREATE TABLE crm_salary_advances (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    amount NUMERIC,
    date DATE,
    period TEXT,
    status TEXT,
    note TEXT,
    created_by TEXT,
    approved_by TEXT,
    approved_at TIMESTAMPTZ,
    paid_by TEXT,
    paid_at TIMESTAMPTZ,
    paid_note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tạo lại bảng Thưởng (TEXT IDs)
CREATE TABLE crm_bonuses (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    branch_id TEXT,
    type TEXT,
    amount NUMERIC,
    date DATE,
    period TEXT,
    note TEXT,
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tạo lại bảng Vi phạm (TEXT IDs)
CREATE TABLE crm_deductions (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    type TEXT,
    amount NUMERIC,
    date DATE,
    period TEXT,
    note TEXT,
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tạo lại bảng Danh sách lương (TEXT IDs)
CREATE TABLE crm_payroll_rosters (
    id TEXT PRIMARY KEY,
    period TEXT,
    user_id TEXT,
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Fix Commission Settings (giữ lại dữ liệu)
ALTER TABLE crm_commission_settings ALTER COLUMN condition_value DROP NOT NULL;

-- 7. Tắt RLS để tránh bị chặn (Tùy chọn)
ALTER TABLE crm_salary_advances DISABLE ROW LEVEL SECURITY;
ALTER TABLE crm_bonuses DISABLE ROW LEVEL SECURITY;
ALTER TABLE crm_deductions DISABLE ROW LEVEL SECURITY;
ALTER TABLE crm_payroll_rosters DISABLE ROW LEVEL SECURITY;

-- 8. Tạo lại Index
CREATE INDEX idx_salary_advances_period ON crm_salary_advances(period);
CREATE INDEX idx_bonuses_period ON crm_bonuses(period);
CREATE INDEX idx_deductions_period ON crm_deductions(period);
