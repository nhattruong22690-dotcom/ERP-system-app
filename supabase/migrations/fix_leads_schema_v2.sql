-- Thêm các cột còn thiếu cho bảng crm_leads để tương thích với ứng dụng
ALTER TABLE public.crm_leads 
ADD COLUMN IF NOT EXISTS notes text,
ADD COLUMN IF NOT EXISTS customer_id uuid,
ADD COLUMN IF NOT EXISTS branch_id uuid,
ADD COLUMN IF NOT EXISTS phone_obtained_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS care_logs jsonb DEFAULT '[]'::jsonb;

-- Chú thích bổ sung cho các cột
COMMENT ON COLUMN public.crm_leads.notes IS 'Ghi chú bổ sung cho lead';
COMMENT ON COLUMN public.crm_leads.customer_id IS 'ID khách hàng liên kết sau khi chuyển đổi (UUID)';
COMMENT ON COLUMN public.crm_leads.branch_id IS 'ID chi nhánh quản lý lead (UUID)';
COMMENT ON COLUMN public.crm_leads.phone_obtained_at IS 'Thời điểm lấy được số điện thoại để tính hoa hồng nóng/lạnh';
COMMENT ON COLUMN public.crm_leads.care_logs IS 'Lịch sử chăm sóc khách hàng (JSONB)';
