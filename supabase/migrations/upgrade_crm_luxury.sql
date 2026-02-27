-- NÂNG CẤP DATABASE CRM LÊN CHUẨN LUXURY SPA
-- Chạy script này trong SQL Editor của Supabase

-- 1. Kích hoạt tiện ích UUID (Nếu chưa có)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Cập nhật bảng crm_customers (Thêm các cột profile chuyên sâu)
ALTER TABLE public.crm_customers 
ADD COLUMN IF NOT EXISTS avatar TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS facebook TEXT,
ADD COLUMN IF NOT EXISTS zalo TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS rank TEXT DEFAULT 'Member',
ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_spent NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_visit TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS medical_notes TEXT,
ADD COLUMN IF NOT EXISTS professional_notes TEXT;

-- 3. Tạo bảng Thẻ liệu trình (Treatment Cards)
CREATE TABLE IF NOT EXISTS public.crm_treatment_cards (
    id TEXT PRIMARY KEY,
    customer_id TEXT REFERENCES public.crm_customers(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT CHECK (type IN ('retail', 'package', 'warranty')),
    total INTEGER NOT NULL,
    used INTEGER DEFAULT 0,
    remaining INTEGER NOT NULL,
    expiry_date DATE,
    status TEXT CHECK (status IN ('active', 'expired', 'completed')),
    purchase_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Tạo bảng Dịch vụ (Services)
CREATE TABLE IF NOT EXISTS public.crm_services (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT,
    price NUMERIC NOT NULL,
    duration INTEGER, -- phút
    is_active BOOLEAN DEFAULT true,
    image TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Cập nhật bảng crm_appointments (Thêm các trường logic nâng cao)
ALTER TABLE public.crm_appointments 
ADD COLUMN IF NOT EXISTS end_time TIME,
ADD COLUMN IF NOT EXISTS price NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS type TEXT CHECK (type IN ('new', 'revisit', 'warranty', 'walk-in', 'returning')),
ADD COLUMN IF NOT EXISTS logs JSONB DEFAULT '[]'::JSONB,
ADD COLUMN IF NOT EXISTS red_flags JSONB DEFAULT '[]'::JSONB,
ADD COLUMN IF NOT EXISTS service_entries JSONB DEFAULT '[]'::JSONB;

-- 5.1 Cập nhật Check Constraint cho status (Thêm 'confirmed')
ALTER TABLE public.crm_appointments DROP CONSTRAINT IF EXISTS crm_appointments_status_check;
ALTER TABLE public.crm_appointments ADD CONSTRAINT crm_appointments_status_check CHECK (status IN ('pending', 'confirmed', 'arrived', 'cancelled', 'no_show', 'completed'));

-- 6. Tạo bảng Hạng thành viên (Membership Tiers) để config UI
CREATE TABLE IF NOT EXISTS public.crm_membership_tiers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    subtext TEXT,
    min_spend NUMERIC DEFAULT 0,
    max_spend NUMERIC DEFAULT 0,
    discount INTEGER DEFAULT 0,
    icon TEXT,
    theme TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Dữ liệu mẫu cho Hạng thành viên
INSERT INTO public.crm_membership_tiers (id, name, subtext, min_spend, max_spend, discount, icon, theme)
VALUES 
('bronze', 'Member', 'Dành cho khách hàng mới', 0, 5000000, 0, 'workspace_premium', 'orange'),
('silver', 'Silver Member', 'Chi tiêu tích lũy trung bình', 5000000, 20000000, 5, 'military_tech', 'gray'),
('gold', 'Gold Member', 'Khách hàng thân thiết', 20000000, 50000000, 10, 'stars', 'amber'),
('platinum', 'Platinum Member', 'Khách hàng cao cấp', 50000000, 999999999, 20, 'diamond', 'slate')
ON CONFLICT (id) DO NOTHING;

-- 8. Tắt RLS hoặc tạo Policy cho các bảng mới (vì app dùng custom auth)
ALTER TABLE public.crm_treatment_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_membership_tiers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access" ON public.crm_treatment_cards;
CREATE POLICY "Allow all access" ON public.crm_treatment_cards FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access" ON public.crm_services;
CREATE POLICY "Allow all access" ON public.crm_services FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access" ON public.crm_membership_tiers;
CREATE POLICY "Allow all access" ON public.crm_membership_tiers FOR ALL USING (true) WITH CHECK (true);

-- 9. Kích hoạt Realtime cho các bảng mới
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'crm_treatment_cards') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_treatment_cards;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'crm_services') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_services;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'crm_membership_tiers') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_membership_tiers;
    END IF;
END $$;
