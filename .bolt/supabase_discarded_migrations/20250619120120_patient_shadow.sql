/*
  # Create enjeux_internes_externes table

  1. New Tables
    - `enjeux_internes_externes`
      - `id` (uuid, primary key)
      - `organization_name` (text, foreign key to organizations)
      - `type` (text, either 'interne' or 'externe')
      - `description` (text)
      - `created_at` (timestamp with time zone)
      - `updated_at` (timestamp with time zone)

  2. Security
    - Enable RLS
    - Add policies for authenticated users
    - Add policies for admin users
*/

-- Create enjeux_internes_externes table
CREATE TABLE IF NOT EXISTS enjeux_internes_externes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_name text NOT NULL REFERENCES organizations(name) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('interne', 'externe')),
  description text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_enjeux_internes_externes_organization 
ON enjeux_internes_externes(organization_name);

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