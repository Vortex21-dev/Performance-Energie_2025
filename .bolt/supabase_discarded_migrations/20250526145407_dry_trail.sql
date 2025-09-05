/*
  # Create sectors and energy types tables
  
  1. Changes
    - Create sectors table with name as primary key
    - Create sector_energy_types table with JSONB support
    - Add RLS policies
    - Insert initial data
*/

-- Drop existing tables if they exist
DROP TABLE IF EXISTS sector_energy_types CASCADE;
DROP TABLE IF EXISTS sectors CASCADE;

-- Create sectors table
CREATE TABLE sectors (
  name text PRIMARY KEY,
  created_at timestamptz DEFAULT now()
);

-- Create sector_energy_types table with JSONB support
CREATE TABLE sector_energy_types (
  sector_name text REFERENCES sectors(name) ON DELETE CASCADE,
  energy_types jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (sector_name)
);

-- Enable RLS
ALTER TABLE sectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE sector_energy_types ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Enable read access for all users" ON sectors;
DROP POLICY IF EXISTS "Enable write access for admin users" ON sectors;
DROP POLICY IF EXISTS "Enable read access for all users" ON sector_energy_types;
DROP POLICY IF EXISTS "Enable write access for admin users" ON sector_energy_types;

-- Create policies for sectors
CREATE POLICY "Enable read access for all users"
ON sectors FOR SELECT
TO public
USING (true);

CREATE POLICY "Enable write access for admin users"
ON sectors
FOR ALL
TO authenticated
USING ((auth.jwt() ->> 'role'::text) = 'admin'::text)
WITH CHECK ((auth.jwt() ->> 'role'::text) = 'admin'::text);

-- Create policies for sector_energy_types
CREATE POLICY "Enable read access for all users"
ON sector_energy_types FOR SELECT
TO public
USING (true);

CREATE POLICY "Enable write access for admin users"
ON sector_energy_types
FOR ALL
TO authenticated
USING ((auth.jwt() ->> 'role'::text) = 'admin'::text)
WITH CHECK ((auth.jwt() ->> 'role'::text) = 'admin'::text);

-- Insert initial sectors
INSERT INTO sectors (name) VALUES
  ('Administration publique'),
  ('Agriculture'),
  ('Bâtiment et Travaux Publics'),
  ('Commerce distribution'),
  ('Communication, Informatiques et services'),
  ('Education'),
  ('Elevage'),
  ('Extraction'),
  ('Foresterie'),
  ('Hôtellerie et restauration'),
  ('Immobilier'),
  ('Industrie'),
  ('Pêche et aquaculture'),
  ('Santé et action sociale'),
  ('Services financiers et assurances'),
  ('Transports et logistique')
ON CONFLICT (name) DO NOTHING;

-- Insert initial energy types for each sector
INSERT INTO sector_energy_types (sector_name, energy_types)
SELECT 
  name,
  '["Énergie électrique", "Énergies renouvelables", "Énergies fossiles"]'::jsonb
FROM sectors
ON CONFLICT (sector_name) DO NOTHING;