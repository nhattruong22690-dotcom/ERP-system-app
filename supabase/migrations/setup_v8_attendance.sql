-- GIAI ĐOẠN 8: QUẢN TRỊ TRẠNG THÁI & CHẤM CÔNG

-- 1. Cập nhật trạng thái làm việc cho Users
-- Thêm cột work_status nếu chưa tồn tại
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='users' AND COLUMN_NAME='work_status') THEN
        ALTER TABLE users ADD COLUMN work_status TEXT DEFAULT 'working';
    END IF;
END $$;

-- 2. Tạo bảng Chấm công
CREATE TABLE IF NOT EXISTS crm_attendance (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    branch_id TEXT REFERENCES branches(id) ON DELETE SET NULL,
    date DATE NOT NULL,
    status TEXT NOT NULL, -- present (có mặt), on_leave (nghỉ phép), absent (vắng mặt)
    check_in TEXT,       -- Định dạng HH:mm
    check_out TEXT,      -- Định dạng HH:mm
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tạo Index để tối ưu truy vấn theo ngày và người dùng
CREATE INDEX IF NOT EXISTS idx_attendance_date ON crm_attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_user_id ON crm_attendance(user_id);

-- 4. Bật RLS nếu cần (Giả định admin có quyền toàn bộ)
ALTER TABLE crm_attendance ENABLE ROW LEVEL SECURITY;

-- Policy cho phép mọi người (auth) đọc, nhưng chỉ admin/manager sửa? 
-- (Đơn giản hóa: Cho phép service role hoặc auth users tùy cấu hình dự án của anh)
CREATE POLICY "Allow all auth users to read attendance" ON crm_attendance FOR SELECT USING (true);
CREATE POLICY "Allow all auth users to insert/update attendance" ON crm_attendance FOR ALL USING (true);
