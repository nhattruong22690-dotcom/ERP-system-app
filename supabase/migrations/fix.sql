-- Script bổ sung thêm một số cột còn thiếu ở bảng cũ
-- 1. Bảng Danh mục (Categories)
ALTER TABLE categories ADD COLUMN IF NOT EXISTS is_rate_based BOOLEAN DEFAULT false;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS default_rate DOUBLE PRECISION;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT false;

-- 2. Bảng Kế hoạch tháng (Monthly Plans)
ALTER TABLE monthly_plans ADD COLUMN IF NOT EXISTS kpi_revenue DOUBLE PRECISION DEFAULT 0;
ALTER TABLE monthly_plans ADD COLUMN IF NOT EXISTS tax_rate DOUBLE PRECISION DEFAULT 0;
ALTER TABLE monthly_plans ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- 3. Bảng Chi tiết kế hoạch (Category Plans)
ALTER TABLE category_plans ADD COLUMN IF NOT EXISTS rate DOUBLE PRECISION;
ALTER TABLE category_plans ADD COLUMN IF NOT EXISTS fixed_amount DOUBLE PRECISION;
ALTER TABLE category_plans ADD COLUMN IF NOT EXISTS disabled BOOLEAN DEFAULT false;

-- 4. Bảng Nhật ký hoạt động (Activity Logs)
CREATE TABLE IF NOT EXISTS activity_logs (
  id text primary key,
  user_id text not null references users(id),
  type text not null,
  entity_type text not null,
  entity_id text not null,
  details text,
  created_at timestamp with time zone default now()
);
ALTER TABLE activity_logs DISABLE ROW LEVEL SECURITY;
