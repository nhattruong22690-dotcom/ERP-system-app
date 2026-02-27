-- XÂY DỰNG HỆ THỐNG QUẢN LÝ HOA HỒNG & KPI CÁ NHÂN (PHASE 4-5)
-- Chạy script này trong SQL Editor của Supabase

-- 1. BẢNG CẤU HÌNH HOA HỒNG (COMMISSION SETTINGS)
CREATE TABLE IF NOT EXISTS public.crm_commission_settings (
    id TEXT PRIMARY KEY,
    role TEXT NOT NULL CHECK (role IN ('sale_page', 'sale_tele', 'technician', 'manager')),
    type TEXT NOT NULL CHECK (type IN ('fixed_amount', 'percentage', 'kpi_bonus')),
    action TEXT NOT NULL, -- Vd: 'get_phone', 'booking_success', 'service_revenue'
    value NUMERIC NOT NULL DEFAULT 0, -- Vd: 10000 hoặc 5
    condition_value NUMERIC DEFAULT 0, -- Dành cho KPI (vd: >= 20 khách)
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Thêm dữ liệu mặc định (Ví dụ)
INSERT INTO public.crm_commission_settings (id, role, type, action, value, condition_value) VALUES 
('lead_phone', 'sale_page', 'fixed_amount', 'get_phone', 10000, 0),
('lead_booking', 'sale_page', 'fixed_amount', 'booking_success', 20000, 0),
('tele_service', 'sale_tele', 'percentage', 'service_revenue', 2.5, 0),
('tele_kpi', 'sale_tele', 'kpi_bonus', 'daily_checkin', 500000, 20)
ON CONFLICT (id) DO NOTHING;


-- 2. BẢNG QUẢN LÝ LEADS (KHÁCH HÀNG TIỀM NĂNG)
CREATE TABLE IF NOT EXISTS public.crm_leads (
    id TEXT PRIMARY KEY,
    sale_page_id TEXT REFERENCES public.users(id) ON DELETE SET NULL, -- Sale Marketing tạo Lead
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    source TEXT NOT NULL, -- 'facebook', 'landing_page', 'tiktok'...
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'booked', 'failed')),
    notes TEXT,
    customer_id TEXT REFERENCES public.crm_customers(id) ON DELETE SET NULL, -- Lập Customer khi chốt
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);


-- 3. CẬP NHẬT LỊCH HẸN ĐỂ TÍNH HOA HỒNG
ALTER TABLE public.crm_appointments 
ADD COLUMN IF NOT EXISTS sale_tele_id TEXT REFERENCES public.users(id) ON DELETE SET NULL, -- Sale chốt lịch
ADD COLUMN IF NOT EXISTS lead_id TEXT REFERENCES public.crm_leads(id) ON DELETE SET NULL; -- Nguồn từ Lead


-- 4. BẢNG THEO DÕI HOA HỒNG CÁ NHÂN (TRACKING LOGS - BẢNG QUAN TRỌNG NHẤT)
CREATE TABLE IF NOT EXISTS public.crm_commission_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES public.users(id) ON DELETE CASCADE NOT NULL, -- Trả cho ai
    amount NUMERIC NOT NULL DEFAULT 0, -- Bao nhiêu tiền (vd: 20000 hoặc tỷ lệ % x Hóa đơn)
    type TEXT NOT NULL, -- 'lead_phone', 'booking', 'service_commission', 'kpi_bonus'
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'cancelled', 'paid')), -- Chờ duyệt / Đã duyệt / Hủy
    appointment_id TEXT REFERENCES public.crm_appointments(id) ON DELETE SET NULL, -- Phát sinh từ Lịch hẹn nào
    lead_id TEXT REFERENCES public.crm_leads(id) ON DELETE SET NULL, -- Hoặc từ Lead nào
    invoice_id TEXT, -- (Sẽ dùng ở Phase Thanh toán)
    description TEXT, -- Mô tả hiển thị cho nhân viên (Vd: "Khách VIP Nguyễn Văn A check-in thành công")
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);


-- 5. BẢNG NHIỆM VỤ CÁ NHÂN (USER MISSIONS)
CREATE TABLE IF NOT EXISTS public.crm_user_missions (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    cycle TEXT NOT NULL CHECK (cycle IN ('daily', 'weekly', 'monthly')),
    metric_type TEXT NOT NULL CHECK (metric_type IN ('booking_count', 'revenue_total', 'lead_count')),
    target_value NUMERIC NOT NULL DEFAULT 0,
    reward_amount NUMERIC NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);


-- 6. BẢO MẬT & POLICIES (Nhân viên chỉ xem hoa hồng của mình)
ALTER TABLE public.crm_commission_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_commission_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_user_missions ENABLE ROW LEVEL SECURITY;

-- Hiện tại App dùng custom auth qua localStorage nên mở tạm quyền truy cập
DROP POLICY IF EXISTS "Allow all access" ON public.crm_commission_settings;
CREATE POLICY "Allow all access" ON public.crm_commission_settings FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access" ON public.crm_leads;
CREATE POLICY "Allow all access" ON public.crm_leads FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access" ON public.crm_commission_logs;
CREATE POLICY "Allow all access" ON public.crm_commission_logs FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access" ON public.crm_user_missions;
CREATE POLICY "Allow all access" ON public.crm_user_missions FOR ALL USING (true) WITH CHECK (true);


-- 7. KÍCH HOẠT REALTIME ĐỂ MÀN HÌNH "MY PERFORMANCE" LUÔN CẬP NHẬT TỨC THÌ
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'crm_commission_settings') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_commission_settings;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'crm_leads') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_leads;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'crm_commission_logs') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_commission_logs;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'crm_user_missions') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.crm_user_missions;
    END IF;
END $$;
