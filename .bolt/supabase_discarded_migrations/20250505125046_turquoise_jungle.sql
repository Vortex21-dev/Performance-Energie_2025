/*
  # Create sector_standards table with sector name as foreign key

  1. New Tables
    - `standards`: Stores standard information
    - `sector_standards`: Links sectors and standards using sector name as foreign key

  2. Security
    - Enable RLS on both tables
    - Add policies for public read access
    - Add policies for admin write access
*/

-- Create standards table
CREATE TABLE IF NOT EXISTS standards (
  name text PRIMARY KEY,
  created_at timestamptz DEFAULT now()
);

-- Create sector_standards junction table
CREATE TABLE IF NOT EXISTS sector_standards (
  sector_name text REFERENCES sectors(name) ON DELETE CASCADE,
  standard_name text REFERENCES standards(name) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (sector_name, standard_name)
);

-- Enable Row Level Security
ALTER TABLE standards ENABLE ROW LEVEL SECURITY;
ALTER TABLE sector_standards ENABLE ROW LEVEL SECURITY;

-- Create policies for standards
CREATE POLICY "Enable read access for all users on standards"
  ON standards FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Enable insert/update for admin users on standards"
  ON standards FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- Create policies for sector_standards
CREATE POLICY "Enable read access for all users on sector_standards"
  ON sector_standards FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Enable insert/update for admin users on sector_standards"
  ON sector_standards FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- Insert initial standards
INSERT INTO standards (name) VALUES
  ('ISO 50001'),
  ('RT 2020'),
  ('NF EN 16247'),
  ('ISO 14001'),
  ('GRI Standards'),
  ('TCFD')
ON CONFLICT (name) DO NOTHING;

-- Create relationships between sectors and standards
INSERT INTO sector_standards (sector_name, standard_name) VALUES
  -- Transport sector standards
  ('Transport', 'ISO 50001'),
  ('Transport', 'NF EN 16247'),
  
  -- Tertiaire sector standards
  ('Tertiaire', 'ISO 50001'),
  ('Tertiaire', 'RT 2020'),
  
  -- Industrie sector standards
  ('Industrie', 'ISO 50001'),
  ('Industrie', 'NF EN 16247'),
  ('Industrie', 'ISO 14001'),
  
  -- Agriculture sector standards
  ('Agriculture', 'ISO 14001'),
  ('Agriculture', 'NF EN 16247'),
  
  -- Banque sector standards
  ('Banque', 'GRI Standards'),
  ('Banque', 'TCFD')
ON CONFLICT (sector_name, standard_name) DO NOTHING;