/*
  # Create sites table for simple companies

  1. Changes
    - Create sites table with organization relationship
    - Add RLS policies
    - Add updated_at trigger
*/

-- Create sites table
CREATE TABLE IF NOT EXISTS sites (
  name text PRIMARY KEY,
  organization_name text REFERENCES organizations(name) ON DELETE CASCADE,
  description text,
  address text NOT NULL,
  city text NOT NULL,
  country text NOT NULL,
  phone text NOT NULL,
  email text NOT NULL,
  website text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read access for authenticated users"
ON sites FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Enable insert for authenticated users"
ON sites
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Enable full access for admin users"
ON sites
FOR ALL
TO authenticated
USING ((auth.jwt() ->> 'role'::text) = 'admin'::text)
WITH CHECK ((auth.jwt() ->> 'role'::text) = 'admin'::text);

-- Create trigger for updated_at
CREATE TRIGGER sites_updated_at
    BEFORE UPDATE ON sites
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();