-- Drop existing filiales table
DROP TABLE IF EXISTS filiales CASCADE;

-- Recreate filiales table with all required fields
CREATE TABLE IF NOT EXISTS filiales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES company_data(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  address text NOT NULL,
  city text NOT NULL,
  country text NOT NULL,
  phone text NOT NULL,
  email text NOT NULL,
  website text,
  type_activite text NOT NULL,
  location text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create trigger for updated_at
CREATE TRIGGER filiales_updated_at
    BEFORE UPDATE ON filiales
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE filiales ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read access for authenticated users"
ON filiales FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Enable insert for authenticated users"
ON filiales
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Enable full access for admin users"
ON filiales
FOR ALL
TO authenticated
USING ((auth.jwt() ->> 'role'::text) = 'admin'::text)
WITH CHECK ((auth.jwt() ->> 'role'::text) = 'admin'::text);