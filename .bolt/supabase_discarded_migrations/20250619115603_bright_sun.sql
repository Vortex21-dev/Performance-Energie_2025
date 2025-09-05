/*
  # Create enjeux_internes_externes table

  1. New Tables
    - `enjeux_internes_externes`
      - `id` (uuid, primary key)
      - `organization_name` (text, foreign key to organizations)
      - `type` (text, either 'interne' or 'externe')
      - `description` (text, description of the enjeu)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `enjeux_internes_externes` table
    - Add policy for admin users to have full access
    - Add policy for authenticated users to read data
    - Add policy for authenticated users to insert data
    - Add policy for users to manage their organization's data

  3. Constraints
    - Check constraint to ensure type is either 'interne' or 'externe'
    - Foreign key constraint to organizations table
*/

-- Create the enjeux_internes_externes table
CREATE TABLE IF NOT EXISTS enjeux_internes_externes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_name text NOT NULL,
  type text NOT NULL,
  description text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add check constraint for type
ALTER TABLE enjeux_internes_externes 
ADD CONSTRAINT enjeux_internes_externes_type_check 
CHECK (type IN ('interne', 'externe'));

-- Add foreign key constraint to organizations
ALTER TABLE enjeux_internes_externes 
ADD CONSTRAINT enjeux_internes_externes_organization_name_fkey 
FOREIGN KEY (organization_name) REFERENCES organizations(name) ON DELETE CASCADE;

-- Enable Row Level Security
ALTER TABLE enjeux_internes_externes ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable full access for admin users"
  ON enjeux_internes_externes
  FOR ALL
  TO authenticated
  USING ((jwt() ->> 'role'::text) = 'admin'::text)
  WITH CHECK ((jwt() ->> 'role'::text) = 'admin'::text);

CREATE POLICY "Enable read access for authenticated users"
  ON enjeux_internes_externes
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert for authenticated users"
  ON enjeux_internes_externes
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can manage their organization's enjeux"
  ON enjeux_internes_externes
  FOR ALL
  TO authenticated
  USING (
    organization_name IN (
      SELECT p.organization_name 
      FROM profiles p 
      WHERE p.email = (jwt() ->> 'email'::text)
    )
  )
  WITH CHECK (
    organization_name IN (
      SELECT p.organization_name 
      FROM profiles p 
      WHERE p.email = (jwt() ->> 'email'::text)
    )
  );

-- Create updated_at trigger
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

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_enjeux_internes_externes_organization 
ON enjeux_internes_externes(organization_name);

CREATE INDEX IF NOT EXISTS idx_enjeux_internes_externes_type 
ON enjeux_internes_externes(type);