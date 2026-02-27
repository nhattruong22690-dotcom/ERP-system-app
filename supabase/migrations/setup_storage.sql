-- SCRIPT TẠO STORAGE BUCKET TRÊN SUPABASE CHO AVATAR
-- Chạy đoạn mã này trong SQL Editor của Supabase để tạo nơi lưu trữ hình ảnh

-- 1. Tạo bucket 'avatars' (nếu chưa có)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Đảm bảo bucket 'avatars' đang ở chế độ công khai (Public)
UPDATE storage.buckets
SET public = true
WHERE id = 'avatars';

-- 3. Tạo chính sách bảo mật (Policy) cho bucket 'avatars'
-- Xóa chính sách cũ để tránh trùng lặp nếu chạy lại script
DROP POLICY IF EXISTS "Avatar Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Avatar Upload Access" ON storage.objects;
DROP POLICY IF EXISTS "Avatar Delete Access" ON storage.objects;

-- Cho phép tất cả mọi người được XEM ảnh avatar
CREATE POLICY "Avatar Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'avatars' );

-- Cho phép upload/insert ảnh vào bucket 'avatars' (Tất cả mọi người vì ta tự build Auth)
CREATE POLICY "Avatar Upload Access"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'avatars' );

-- Cho phép cập nhật/thay thế ảnh trong bucket 'avatars'
CREATE POLICY "Avatar Update Access"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'avatars' );

-- Cho phép xóa ảnh
CREATE POLICY "Avatar Delete Access"
ON storage.objects FOR DELETE
USING ( bucket_id = 'avatars' );

-- Lưu ý: Vì ứng dụng tự build hệ thống Auth không dùng luồng chuẩn của Supabase,
-- các Policy này đang mở quyền cho public. Nếu dự án production thực sự, 
-- cần có cơ chế cấp token bí mật qua server để upload, nhưng với mô hình hiện tại đây là cách tối ưu nhất.
