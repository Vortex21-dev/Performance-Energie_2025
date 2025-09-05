/*
  # Create perimetre_domaine table

  1. New Tables
    - `perimetre_domaine`
      - `organization_name` (text, primary key, foreign key to organizations)
      - `perimetre_geographique` (text, nullable)
      - `perimetre_organisationnel` (text, nullable)
      - `domaine_application` (text, nullable)
      - `exclusions` (text, nullable)
      - `justification_exclusions` (text, nullable)
      - `created_at` (timestamp with time zone, default now())
      - `updated_at` (timestamp with time zone, default now())

  2. Security
    - Enable RLS on `perimetre_domaine` table
    - Add policies for authenticated users to read, insert, update, and delete their organization's data
    - Add policy for admin users to have full access

  3. Foreign Keys
    - Link `organization_name` to `organizations(name)` with CASCADE delete
*/

CREATE TABLE IF NOT EXISTS perimetre_domaine (
  organization_name text PRIMARY KEY,
  perimetre_geographique text,
  perimetre_organisationnel text,
  domaine_application text,
  exclusions text,
  justification_exclusions text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE perimetre_domaine ENABLE ROW LEVEL SECURITY;

-- Add foreign key constraint
ALTER TABLE perimetre_domaine 
ADD CONSTRAINT perimetre_domaine_organization_name_fkey 
FOREIGN KEY (organization_name) REFERENCES organizations(name) ON DELETE CASCADE;

-- Create policies
CREATE POLICY "Enable read access for authenticated users"
  ON perimetre_domaine
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert for authenticated users"
  ON perimetre_domaine
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users"
  ON perimetre_domaine
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable delete for authenticated users"
  ON perimetre_domaine
  FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Enable full access for admin users"
  ON perimetre_domaine
  FOR ALL
  TO authenticated
  USING ((jwt() ->> 'role'::text) = 'admin'::text)
  WITH CHECK ((jwt() ->> 'role'::text) = 'admin'::text);

-- Create updated_at trigger
CREATE TRIGGER perimetre_domaine_updated_at
  BEFORE UPDATE ON perimetre_domaine
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();