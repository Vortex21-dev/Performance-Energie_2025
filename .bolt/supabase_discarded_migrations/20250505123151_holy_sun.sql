/*
  # Create sectors and related tables

  1. New Tables
    - `sectors`
      - `id` (uuid, primary key)
      - `name` (text, unique)
      - `description` (text)
      - `icon` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
  2. Security
    - Enable RLS on all tables
    - Add policies for public read access
    - Add policies for admin write access
    
  3. Initial Data
    - Insert default sectors
*/

-- Create sectors table with updated_at column
CREATE TABLE IF NOT EXISTS sectors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  icon text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create trigger for updating updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_sectors_updated_at
  BEFORE UPDATE ON sectors
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE sectors ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read access for all users"
  ON sectors FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Enable insert for authenticated users"
  ON sectors FOR INSERT
  TO authenticated
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Enable update for authenticated users"
  ON sectors FOR UPDATE
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Enable delete for authenticated users"
  ON sectors FOR DELETE
  TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

-- Insert initial data
INSERT INTO sectors (name, description, icon) VALUES
  ('Transport', 'Logistique, flottes de véhicules, transport de personnes ou de marchandises', '🚚'),
  ('Tertiaire', 'Bureaux, commerces, services, administrations, établissements scolaires', '🏢'),
  ('Industrie', 'Production, fabrication, transformation de matières et de produits', '🏭'),
  ('Agriculture', 'Production agricole et agroalimentaire', '🌾'),
  ('Énergie', 'Production et distribution d''énergie', '⚡'),
  ('Construction', 'Bâtiment et travaux publics', '🏗️')
ON CONFLICT (name) 
DO UPDATE SET 
  description = EXCLUDED.description,
  icon = EXCLUDED.icon;