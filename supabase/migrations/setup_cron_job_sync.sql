-- Migration: Setup Daily Cron Job for Cashflow Sync
-- Thời gian chạy: 00:00 hằng ngày (UTC+7) tương ứng 17:00 UTC.

-- 1. Kích hoạt extension pg_cron (nếu chưa có)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Kích hoạt extension net để gọi HTTP (nếu chưa có)
CREATE EXTENSION IF NOT EXISTS net;

-- 3. Xóa job cũ nếu đã tồn tại để tránh trùng lặp
SELECT cron.unschedule('sync-cashflow-daily');

-- 4. Tạo lịch chạy hằng ngày
-- LƯU Ý: Anh/chị cần thay thế <PROJECT_ID> và <SERVICE_ROLE_KEY> bên dưới
-- Hoặc sử dụng bảng vault để bảo mật key (khuyên dùng)
SELECT cron.schedule(
  'sync-cashflow-daily',
  '0 17 * * *',
  $$
  SELECT
    net.http_post(
      url := 'https://<PROJECT_ID>.supabase.co/functions/v1/sync-cashflow',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer <SERVICE_ROLE_KEY>"}'::jsonb,
      body := '{}'::jsonb
    );
  $$
);

-- Hướng dẫn:
-- Anh/chị hãy copy đoạn code SQL này vào phần SQL Editor của Supabase Dashboard.
-- Đừng quên thay <PROJECT_ID> bằng mã dự án và <SERVICE_ROLE_KEY> bằng key Service Role (tìm trong Settings -> API).
