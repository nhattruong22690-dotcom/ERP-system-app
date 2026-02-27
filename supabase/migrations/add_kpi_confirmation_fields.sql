-- Thêm các trường hỗ trợ xác nhận (confirm) KPI cho Leads và Appointments
-- Nút này dùng để Giám đốc/Kế toán loại bỏ (exclude) các mục không hợp lệ khỏi tính toán KPI

-- 1. Bảng crm_leads
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='crm_leads' AND column_name='kpi_confirmed') THEN
        ALTER TABLE crm_leads ADD COLUMN kpi_confirmed BOOLEAN DEFAULT TRUE;
        ALTER TABLE crm_leads ADD COLUMN kpi_exclusion_note TEXT;
        ALTER TABLE crm_leads ADD COLUMN kpi_excluded_by UUID REFERENCES auth.users(id);
        ALTER TABLE crm_leads ADD COLUMN kpi_excluded_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- 2. Bảng crm_appointments
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='crm_appointments' AND column_name='kpi_confirmed') THEN
        ALTER TABLE crm_appointments ADD COLUMN kpi_confirmed BOOLEAN DEFAULT TRUE;
        ALTER TABLE crm_appointments ADD COLUMN kpi_exclusion_note TEXT;
        ALTER TABLE crm_appointments ADD COLUMN kpi_excluded_by UUID REFERENCES auth.users(id);
        ALTER TABLE crm_appointments ADD COLUMN kpi_excluded_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;
