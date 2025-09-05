/*
  # Create global site data table

  1. New Tables
    - `global_site_data`
      - `id` (uuid, primary key)
      - `organization_name` (text, not null)
      - `site_name` (text, not null)
      - `indicator_code` (text, not null)
      - `processus_code` (text, not null)
      - `year` (integer, not null)
      - `month` (integer)
      - `value` (numeric)
      - `unit` (text)
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())
  2. Security
    - Enable RLS on `global_site_data` table
    - Add policies for authenticated users
*/

CREATE TABLE IF NOT EXISTS global_site_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_name text NOT NULL,
  site_name text NOT NULL,
  indicator_code text NOT NULL,
  processus_code text NOT NULL,
  year integer NOT NULL,
  month integer,
  value numeric,
  unit text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  FOREIGN KEY (indicator_code) REFERENCES indicators(code) ON DELETE CASCADE,
  FOREIGN KEY (processus_code) REFERENCES processus(code) ON DELETE CASCADE
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS global_site_data_organization_idx ON global_site_data(organization_name);
CREATE INDEX IF NOT EXISTS global_site_data_site_idx ON global_site_data(site_name);
CREATE INDEX IF NOT EXISTS global_site_data_indicator_idx ON global_site_data(indicator_code);
CREATE INDEX IF NOT EXISTS global_site_data_year_idx ON global_site_data(year);

-- Enable Row Level Security
ALTER TABLE global_site_data ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read global site data"
  ON global_site_data
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admin users can insert global site data"
  ON global_site_data
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IN (
      SELECT auth.uid() FROM profiles 
      WHERE role IN ('admin', 'admin_client')
    )
  );

CREATE POLICY "Admin users can update global site data"
  ON global_site_data
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT auth.uid() FROM profiles 
      WHERE role IN ('admin', 'admin_client')
    )
  );

CREATE POLICY "Admin users can delete global site data"
  ON global_site_data
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT auth.uid() FROM profiles 
      WHERE role IN ('admin', 'admin_client')
    )
  );

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_global_site_data_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to call the function
CREATE TRIGGER update_global_site_data_updated_at
BEFORE UPDATE ON global_site_data
FOR EACH ROW
EXECUTE FUNCTION update_global_site_data_updated_at();