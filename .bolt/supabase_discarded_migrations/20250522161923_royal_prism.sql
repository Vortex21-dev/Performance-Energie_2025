/*
  # Simplify database structure

  1. Changes
    - Drop existing complex tables
    - Create simplified core tables with essential relationships
    - Maintain RLS policies
    - Keep only necessary fields and relationships

  2. Security
    - Enable RLS on all tables
    - Add policies for public read access
    - Add policies for admin write access
*/

-- Drop existing tables in correct order
DROP TABLE IF EXISTS sector_standards_issues_criteria_indicator CASCADE;
DROP TABLE IF EXISTS sector_standards_issues_criteria CASCADE;
DROP TABLE IF EXISTS sector_standards_issues CASCADE;
DROP TABLE IF EXISTS sector_standards CASCADE;
DROP TABLE IF EXISTS energy_types CASCADE;
DROP TABLE IF EXISTS sectors CASCADE;
DROP TABLE IF EXISTS company_data CASCADE;

-- Create sectors table
CREATE TABLE sectors (
  name text PRIMARY KEY,
  created_at timestamptz DEFAULT now()
);

-- Create energy_types table with sector relationship
CREATE TABLE energy_types (
  name text NOT NULL,
  sector_name text REFERENCES sectors(name) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (name, sector_name)
);

-- Create standards table with relationships
CREATE TABLE standards (
  sector_name text REFERENCES sectors(name) ON DELETE CASCADE,
  energy_type_name text,
  standard_name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (sector_name, energy_type_name, standard_name),
  FOREIGN KEY (energy_type_name, sector_name) REFERENCES energy_types(name, sector_name) ON DELETE CASCADE
);

-- Create issues table with relationships
CREATE TABLE issues (
  sector_name text REFERENCES sectors(name) ON DELETE CASCADE,
  energy_type_name text,
  standard_name text,
  issue_name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (sector_name, energy_type_name, standard_name, issue_name),
  FOREIGN KEY (sector_name, energy_type_name, standard_name) 
    REFERENCES standards(sector_name, energy_type_name, standard_name) ON DELETE CASCADE
);

-- Create criteria table with relationships
CREATE TABLE criteria (
  sector_name text REFERENCES sectors(name) ON DELETE CASCADE,
  energy_type_name text,
  standard_name text,
  issue_name text,
  criteria_name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (sector_name, energy_type_name, standard_name, issue_name, criteria_name),
  FOREIGN KEY (sector_name, energy_type_name, standard_name, issue_name) 
    REFERENCES issues(sector_name, energy_type_name, standard_name, issue_name) ON DELETE CASCADE
);

-- Create indicators table with relationships
CREATE TABLE indicators (
  sector_name text REFERENCES sectors(name) ON DELETE CASCADE,
  energy_type_name text,
  standard_name text,
  issue_name text,
  criteria_name text,
  indicator_name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (sector_name, energy_type_name, standard_name, issue_name, criteria_name, indicator_name),
  FOREIGN KEY (sector_name, energy_type_name, standard_name, issue_name, criteria_name) 
    REFERENCES criteria(sector_name, energy_type_name, standard_name, issue_name, criteria_name) ON DELETE CASCADE
);

-- Create company_data table
CREATE TABLE company_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  activity text,
  address text,
  employees integer,
  phone text,
  email text,
  website text,
  description text,
  logo_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE sectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE energy_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE standards ENABLE ROW LEVEL SECURITY;
ALTER TABLE issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_data ENABLE ROW LEVEL SECURITY;

-- Create policies for all tables
DO $$ 
BEGIN
  -- Sectors policies
  EXECUTE 'CREATE POLICY "Enable read access for everyone" ON sectors FOR SELECT TO public USING (true)';
  EXECUTE 'CREATE POLICY "Enable write access for admin users" ON sectors FOR ALL TO authenticated USING ((auth.jwt() ->> ''role''::text) = ''admin''::text) WITH CHECK ((auth.jwt() ->> ''role''::text) = ''admin''::text)';

  -- Energy types policies
  EXECUTE 'CREATE POLICY "Enable read access for everyone" ON energy_types FOR SELECT TO public USING (true)';
  EXECUTE 'CREATE POLICY "Enable write access for admin users" ON energy_types FOR ALL TO authenticated USING ((auth.jwt() ->> ''role''::text) = ''admin''::text) WITH CHECK ((auth.jwt() ->> ''role''::text) = ''admin''::text)';

  -- Standards policies
  EXECUTE 'CREATE POLICY "Enable read access for everyone" ON standards FOR SELECT TO public USING (true)';
  EXECUTE 'CREATE POLICY "Enable write access for admin users" ON standards FOR ALL TO authenticated USING ((auth.jwt() ->> ''role''::text) = ''admin''::text) WITH CHECK ((auth.jwt() ->> ''role''::text) = ''admin''::text)';

  -- Issues policies
  EXECUTE 'CREATE POLICY "Enable read access for everyone" ON issues FOR SELECT TO public USING (true)';
  EXECUTE 'CREATE POLICY "Enable write access for admin users" ON issues FOR ALL TO authenticated USING ((auth.jwt() ->> ''role''::text) = ''admin''::text) WITH CHECK ((auth.jwt() ->> ''role''::text) = ''admin''::text)';

  -- Criteria policies
  EXECUTE 'CREATE POLICY "Enable read access for everyone" ON criteria FOR SELECT TO public USING (true)';
  EXECUTE 'CREATE POLICY "Enable write access for admin users" ON criteria FOR ALL TO authenticated USING ((auth.jwt() ->> ''role''::text) = ''admin''::text) WITH CHECK ((auth.jwt() ->> ''role''::text) = ''admin''::text)';

  -- Indicators policies
  EXECUTE 'CREATE POLICY "Enable read access for everyone" ON indicators FOR SELECT TO public USING (true)';
  EXECUTE 'CREATE POLICY "Enable write access for admin users" ON indicators FOR ALL TO authenticated USING ((auth.jwt() ->> ''role''::text) = ''admin''::text) WITH CHECK ((auth.jwt() ->> ''role''::text) = ''admin''::text)';

  -- Company data policies
  EXECUTE 'CREATE POLICY "Enable read access for authenticated users" ON company_data FOR SELECT TO authenticated USING (true)';
  EXECUTE 'CREATE POLICY "Enable insert for authenticated users" ON company_data FOR INSERT TO authenticated WITH CHECK (true)';
  EXECUTE 'CREATE POLICY "Enable full access for admin users" ON company_data FOR ALL TO authenticated USING ((auth.jwt() ->> ''role''::text) = ''admin''::text) WITH CHECK ((auth.jwt() ->> ''role''::text) = ''admin''::text)';
END $$;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for company_data
CREATE TRIGGER update_company_data_updated_at
    BEFORE UPDATE ON company_data
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert initial data
INSERT INTO sectors (name) VALUES
  ('Transport'),
  ('Industrie'),
  ('Tertiaire')
ON CONFLICT (name) DO NOTHING;

-- Insert energy types
INSERT INTO energy_types (name, sector_name) VALUES
  ('Énergies Fossiles', 'Transport'),
  ('Énergies Renouvelables', 'Transport'),
  ('Énergies Fossiles', 'Industrie'),
  ('Énergies Renouvelables', 'Industrie'),
  ('Énergies Fossiles', 'Tertiaire'),
  ('Énergies Renouvelables', 'Tertiaire')
ON CONFLICT (name, sector_name) DO NOTHING;