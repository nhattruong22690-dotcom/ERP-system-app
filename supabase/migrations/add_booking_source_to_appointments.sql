-- Phân loại Nguồn Lịch hẹn (V21.10)
-- Bổ sung trường booking_source để theo dõi nguồn gốc lịch hẹn

ALTER TABLE crm_appointments 
ADD COLUMN IF NOT EXISTS booking_source TEXT DEFAULT 'branch';

-- Cập nhật ghi chú cho cột
COMMENT ON COLUMN crm_appointments.booking_source IS 'Nguồn lịch hẹn: lead (Lead Sale), tele (Tele Sale), branch (Tại chi nhánh)';
