-- 1. THÊM CÁC CỘT CÒN THIẾU VÀO BẢNG USERS
-- Bảng users hiện tại đang thiếu cột email và avatar_url dẫn đến lỗi khi cập nhật Profile.
ALTER TABLE users ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url text;

-- 2. SỬA LỖI TỪ CHỐI TRUY CẬP (RLS)
-- Vì ứng dụng sử dụng hệ thống Auth tự xây dựng (không dùng Supabase Auth), 
-- việc bật RLS với chính sách auth.uid() sẽ chặn ứng dụng đọc danh sách người dùng.

-- Tùy chọn 1: Tắt hoàn toàn RLS trên bảng users (Khuyến nghị cho cách code hiện tại)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Tùy chọn 2: Nếu muốn giữ RLS, hãy xóa chính sách cũ và tạo chính sách mới cho phép đọc/ghi:
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;

CREATE POLICY "Allow all read access" ON users FOR SELECT USING (true);
CREATE POLICY "Allow all update access" ON users FOR UPDATE USING (true);

-- Chú ý: Hãy chạy toàn bộ file SQL này trong Supabase > SQL Editor.
