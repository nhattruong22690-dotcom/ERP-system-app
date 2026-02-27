-- Thêm cột phân quyền vào bảng crm_job_titles
ALTER TABLE crm_job_titles ADD COLUMN IF NOT EXISTS allowed_pages jsonb DEFAULT '[]'::jsonb;
ALTER TABLE crm_job_titles ADD COLUMN IF NOT EXISTS permissions jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN crm_job_titles.allowed_pages IS 'Danh sách các trang được phép truy cập mặc định cho chức vụ này';
COMMENT ON COLUMN crm_job_titles.permissions IS 'Danh sách các hành động được phép thực hiện mặc định cho chức vụ này';
