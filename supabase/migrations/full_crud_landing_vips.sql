-- migration.sql
-- 1. Xóa khóa chính (Primary Key) hiện tại (dùng kiểu UUID)
ALTER TABLE "public"."landing_vips" DROP CONSTRAINT IF EXISTS "landing_vips_pkey";

-- 2. Đổi kiểu dữ liệu của cột id từ UUID sang TEXT
ALTER TABLE "public"."landing_vips" ALTER COLUMN "id" TYPE text USING id::text;

-- 3. Thiết lập mã sinh ID động mới: random chuỗi hex, cắt lấy 10 ký tự, viết hoa (VD: 8A4F9B2C1D)
ALTER TABLE "public"."landing_vips" ALTER COLUMN "id" SET DEFAULT upper(substr(md5(random()::text), 1, 10));

-- 4. Khôi phục lại khóa chính
ALTER TABLE "public"."landing_vips" ADD PRIMARY KEY ("id");

-- Đảm bảo đã có đầy đủ các cột CRUD (Chạy lại ko sao do có IF NOT EXISTS)
ALTER TABLE "public"."landing_vips"
ADD COLUMN IF NOT EXISTS "phone_number" text,
ADD COLUMN IF NOT EXISTS "birth_date" date,
ADD COLUMN IF NOT EXISTS "card_value" numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS "branch" text,
ADD COLUMN IF NOT EXISTS "notes" text;
