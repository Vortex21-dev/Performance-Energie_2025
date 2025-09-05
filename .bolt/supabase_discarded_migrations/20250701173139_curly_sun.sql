/*
  # Create Revue Management Table

  1. New Tables
    - `revue_management` - Stores energy management review documents
      - `id` (uuid, primary key)
      - `organization_name` (text, foreign key)
      - `date_revue` (date)
      - `donnees_entree` (text)
      - `donnees_entree_image` (text)
      - `analyse_data` (text)
      - `decision` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. Security
    - Enable RLS on `revue_management` table
    - Add policies for authenticated users
*/

-- Create revue_management table
CREATE TABLE IF NOT EXISTS revue_management (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_name text NOT NULL REFERENCES organizations(name) ON DELETE CASCADE,
  date_revue date NOT NULL,
  donnees_entree text,
  donnees_entree_image text,
  analyse_data text,
  decision text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE revue_management ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their organization's revue_management"
  ON revue_management
  FOR SELECT
  TO authenticated
  USING (
    organization_name IN (
      SELECT organization_name FROM profiles
      WHERE email = auth.email()
    )
  );

CREATE POLICY "Users can insert their organization's revue_management"
  ON revue_management
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_name IN (
      SELECT organization_name FROM profiles
      WHERE email = auth.email()
    )
  );

CREATE POLICY "Users can update their organization's revue_management"
  ON revue_management
  FOR UPDATE
  TO authenticated
  USING (
    organization_name IN (
      SELECT organization_name FROM profiles
      WHERE email = auth.email()
    )
  )
  WITH CHECK (
    organization_name IN (
      SELECT organization_name FROM profiles
      WHERE email = auth.email()
    )
  );

CREATE POLICY "Users can delete their organization's revue_management"
  ON revue_management
  FOR DELETE
  TO authenticated
  USING (
    organization_name IN (
      SELECT organization_name FROM profiles
      WHERE email = auth.email()
    )
  );

-- Create trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_revue_management_updated_at
BEFORE UPDATE ON revue_management
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();