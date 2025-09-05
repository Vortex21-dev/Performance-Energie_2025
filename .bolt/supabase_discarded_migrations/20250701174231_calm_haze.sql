/*
  # Create revue_donnees table

  1. New Tables
    - `revue_donnees`
      - `id` (uuid, primary key)
      - `organization_name` (text, foreign key)
      - `title` (text)
      - `description` (text, nullable)
      - `file_url` (text, nullable)
      - `file_name` (text, nullable)
      - `file_type` (text, nullable)
      - `created_at` (timestamp with time zone)
      - `updated_at` (timestamp with time zone)
  2. Security
    - Enable RLS on `revue_donnees` table
    - Add policies for authenticated users
*/

-- Create the revue_donnees table
CREATE TABLE IF NOT EXISTS revue_donnees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_name text REFERENCES organizations(name) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  file_url text,
  file_name text,
  file_type text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE revue_donnees ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read access for authenticated users"
  ON revue_donnees
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable delete for authenticated users"
  ON revue_donnees
  FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert for authenticated users"
  ON revue_donnees
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users"
  ON revue_donnees
  FOR UPDATE
  TO authenticated
  USING (true);

-- Create updated_at trigger
CREATE TRIGGER revue_donnees_updated_at
BEFORE UPDATE ON revue_donnees
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();