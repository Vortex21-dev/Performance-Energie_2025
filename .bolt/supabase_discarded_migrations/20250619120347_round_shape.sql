/*
  # Update enjeux_internes_externes table structure
  
  1. Changes
    - Remove id column
    - Make organization_name the primary key
    - Maintain existing relationships and constraints
    
  2. Security
    - Preserve existing RLS policies
*/

-- Create a new table with the desired structure
CREATE TABLE IF NOT EXISTS enjeux_internes_externes_new (
  organization_name text PRIMARY KEY REFERENCES organizations(name) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('interne', 'externe')),
  description text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Copy data from the old table to the new one
-- Note: This will only keep the most recent entry for each organization_name and type combination
INSERT INTO enjeux_internes_externes_new (organization_name, type, description, created_at, updated_at)
SELECT DISTINCT ON (organization_name, type) 
  organization_name, 
  type, 
  description, 
  created_at, 
  updated_at
FROM enjeux_internes_externes
ORDER BY organization_name, type, created_at DESC;

-- Drop the old table
DROP TABLE IF EXISTS enjeux_internes_externes CASCADE;

-- Rename the new table to the original name
ALTER TABLE enjeux_internes_externes_new RENAME TO enjeux_internes_externes;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_enjeux_internes_externes_type 
ON enjeux_internes_externes(type);

-- Enable Row Level Security
ALTER TABLE enjeux_internes_externes ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read access for authenticated users"
ON enjeux_internes_externes FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Enable insert for authenticated users"
ON enjeux_internes_externes
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users"
ON enjeux_internes_externes
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Enable delete for authenticated users"
ON enjeux_internes_externes
FOR DELETE
TO authenticated
USING (true);

CREATE POLICY "Enable full access for admin users"
ON enjeux_internes_externes
FOR ALL
TO authenticated
USING ((auth.jwt() ->> 'role'::text) = 'admin'::text)
WITH CHECK ((auth.jwt() ->> 'role'::text) = 'admin'::text);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_enjeux_internes_externes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enjeux_internes_externes_updated_at
  BEFORE UPDATE ON enjeux_internes_externes
  FOR EACH ROW
  EXECUTE FUNCTION update_enjeux_internes_externes_updated_at();