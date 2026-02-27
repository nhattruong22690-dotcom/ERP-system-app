-- UPDATE COMMISSION SETTINGS SCHEMA (V4)
-- Support for KPI-based tiered commissions

-- 1. Update the check constraint for 'type'
ALTER TABLE public.crm_commission_settings 
DROP CONSTRAINT IF EXISTS crm_commission_settings_type_check;

ALTER TABLE public.crm_commission_settings 
ADD CONSTRAINT crm_commission_settings_type_check 
CHECK (type IN ('fixed', 'percentage', 'tiered', 'kpi', 'kpi_tiered'));

-- 2. Ensure tiers column is JSONB (it already is, but good for safety)
-- In kpi_tiered mode, the 'tiers' column will store KpiTier[] objects.
