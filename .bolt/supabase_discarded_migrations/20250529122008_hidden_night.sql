/*
  # Create sector_standards_issues table with relationships
  
  1. Changes
    - Create sector_standards_issues table with composite primary key
    - Add foreign key constraints to sectors and energy_types
    - Link to standards codes from sector_standards
    - Add issues_codes array column
    - Enable RLS
    - Add policies for read/write access
*/

-- Create sector_standards_issues table
CREATE TABLE IF NOT EXISTS sector_standards_issues (
  sector_name text NOT NULL REFERENCES sectors(name) ON DELETE CASCADE,
  energy_type_name text NOT NULL,
  standard_name text NOT NULL,
  issues_codes text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (sector_name, energy_type_name, standard_name),
  FOREIGN KEY (energy_type_name, sector_name) 
    REFERENCES energy_types(name, sector_name) 
    ON DELETE CASCADE,
  FOREIGN KEY (sector_name, energy_type_name) 
    REFERENCES sector_standards_codes(sector_name, energy_type_name)
    ON DELETE CASCADE
);

-- Enable Row Level Security
ALTER TABLE sector_standards_issues ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read access for everyone" 
  ON sector_standards_issues
  FOR SELECT 
  TO public 
  USING (true);

CREATE POLICY "Enable write access for admin users" 
  ON sector_standards_issues
  FOR ALL 
  TO authenticated 
  USING ((auth.jwt() ->> 'role'::text) = 'admin'::text)
  WITH CHECK ((auth.jwt() ->> 'role'::text) = 'admin'::text);

-- Insert initial data by joining sector_standards_codes with issues
INSERT INTO sector_standards_issues (
  sector_name,
  energy_type_name,
  standard_name,
  issues_codes
)
SELECT DISTINCT
  ssc.sector_name,
  ssc.energy_type_name,
  unnest(ssc.standard_codes) as standard_name,
  ARRAY(
    SELECT code 
    FROM issues
  ) as issues_codes
FROM sector_standards_codes ssc
ON CONFLICT (sector_name, energy_type_name, standard_name) DO NOTHING;