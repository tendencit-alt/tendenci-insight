-- Remove duplicate CRM deals (keep most recent for each lead_id where from_ai = true)
DELETE FROM crm_deals a
USING crm_deals b
WHERE a.from_ai = true
  AND b.from_ai = true
  AND a.lead_id = b.lead_id
  AND a.lead_id IS NOT NULL
  AND a.created_at < b.created_at;

-- Add unique partial index to prevent future duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_deals_unique_ai_lead 
ON crm_deals(lead_id) 
WHERE from_ai = true AND lead_id IS NOT NULL;