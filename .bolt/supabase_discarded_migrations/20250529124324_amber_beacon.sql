-- Add issue_codes column if it doesn't exist
ALTER TABLE sector_standards_issues 
ADD COLUMN IF NOT EXISTS issue_codes text[] DEFAULT '{}';

-- Clear existing data
TRUNCATE TABLE sector_standards_issues CASCADE;

-- Insert new data for each sector, energy type, and standard combination
INSERT INTO sector_standards_issues (
  sector_name,
  energy_type_name,
  standard_name,
  issue_codes
)
SELECT DISTINCT
  s.sector_name,
  s.energy_type_name,
  s.standard_name,
  CASE s.standard_name
    WHEN 'ISO 50001' THEN ARRAY['CTX-ISS', 'RSQ-ISS', 'PTI-ISS', 'LDP-ISS', 'RES-ISS', 'CMP-ISS', 'SME-ISS', 'OBJ-ISS', 'EQP-ISS', 'IPE-ISS', 'REV-ISS', 'NCO-ISS']
    WHEN 'ISO 50003' THEN ARRAY['RSQ-ISS', 'CMP-ISS', 'REV-ISS', 'NCO-ISS']
    WHEN 'ISO 50004' THEN ARRAY['CTX-ISS', 'RSQ-ISS', 'LDP-ISS', 'CMP-ISS', 'SME-ISS', 'OBJ-ISS', 'IPE-ISS', 'REV-ISS']
    WHEN 'ISO 50006' THEN ARRAY['IPE-ISS', 'OBJ-ISS']
    WHEN 'EN 16231' THEN ARRAY['IPE-ISS', 'REV-ISS', 'NCO-ISS']
    WHEN 'EN 16247-1' THEN ARRAY['CTX-ISS', 'EQP-ISS', 'IPE-ISS', 'REV-ISS', 'NCO-ISS']
    WHEN 'EN 16247-2' THEN ARRAY['CTX-ISS', 'EQP-ISS', 'IPE-ISS', 'REV-ISS', 'NCO-ISS']
    WHEN 'EN 16247-3' THEN ARRAY['CTX-ISS', 'EQP-ISS', 'IPE-ISS', 'REV-ISS', 'NCO-ISS']
    WHEN 'EN 16247-4' THEN ARRAY['CTX-ISS', 'EQP-ISS', 'IPE-ISS', 'REV-ISS', 'NCO-ISS']
    WHEN 'BP X-30 120' THEN ARRAY['CTX-ISS', 'OBJ-ISS', 'EQP-ISS', 'IPE-ISS', 'REV-ISS']
    ELSE ARRAY[]::text[]
  END as issue_codes
FROM sector_standards s
ON CONFLICT (sector_name, energy_type_name, standard_name) DO UPDATE
SET issue_codes = EXCLUDED.issue_codes;