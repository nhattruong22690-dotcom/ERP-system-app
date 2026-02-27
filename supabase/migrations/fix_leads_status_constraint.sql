-- Nâng cấp ràng buộc trạng thái cho bảng crm_leads (V21.8)
-- Cho phép các trạng thái mới: spam_data, low_quality_mess, no_reach_mess, in_care

ALTER TABLE crm_leads 
DROP CONSTRAINT IF EXISTS crm_leads_status_check;

ALTER TABLE crm_leads 
ADD CONSTRAINT crm_leads_status_check 
CHECK (status IN ('new', 'new_created', 'contacted', 'booked', 'failed', 'spam_data', 'low_quality_mess', 'no_reach_mess', 'in_care', 'recare'));
