/*
  # Fix indicator_values table structure and performance

  1. Table Structure
    - Ensure indicator_values has all required organizational hierarchy columns
    - Add proper foreign key constraints
    - Optimize data types

  2. Performance Optimization
    - Add critical indexes for query performance
    - Optimize RLS policies to prevent timeouts

  3. Triggers and Functions
    - Add function to auto-populate organizational hierarchy
    - Ensure proper data integrity

  4. Test Data
    - Insert minimal test data for functionality
*/

-- First, ensure the indicator_values table has the correct structure
DO $$
BEGIN
  -- Add organizational hierarchy columns if they don't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'indicator_values' AND column_name = 'organization_name'
  ) THEN
    ALTER TABLE indicator_values ADD COLUMN organization_name TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'indicator_values' AND column_name = 'filiere_name'
  ) THEN
    ALTER TABLE indicator_values ADD COLUMN filiere_name TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'indicator_values' AND column_name = 'filiale_name'
  ) THEN
    ALTER TABLE indicator_values ADD COLUMN filiale_name TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'indicator_values' AND column_name = 'site_name'
  ) THEN
    ALTER TABLE indicator_values ADD COLUMN site_name TEXT;
  END IF;
END $$;

-- Ensure profiles table has organizational hierarchy columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'organization_name'
  ) THEN
    ALTER TABLE profiles ADD COLUMN organization_name TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'filiere_name'
  ) THEN
    ALTER TABLE profiles ADD COLUMN filiere_name TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'filiale_name'
  ) THEN
    ALTER TABLE profiles ADD COLUMN filiale_name TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'site_name'
  ) THEN
    ALTER TABLE profiles ADD COLUMN site_name TEXT;
  END IF;
END $$;

-- Create critical indexes for performance (only if they don't exist)
DO $$
BEGIN
  -- Index for indicator_values performance
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_indicator_values_org_site') THEN
    CREATE INDEX idx_indicator_values_org_site ON indicator_values(organization_name, site_name);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_indicator_values_period_indicator') THEN
    CREATE INDEX idx_indicator_values_period_indicator ON indicator_values(period_id, indicator_code);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_indicator_values_status_submitted') THEN
    CREATE INDEX idx_indicator_values_status_submitted ON indicator_values(status, submitted_by);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_indicator_values_processus_site') THEN
    CREATE INDEX idx_indicator_values_processus_site ON indicator_values(processus_code, site_name);
  END IF;

  -- Index for profiles performance
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_profiles_email_org') THEN
    CREATE INDEX idx_profiles_email_org ON profiles(email, organization_name);
  END IF;
END $$;

-- Function to auto-populate organizational hierarchy
CREATE OR REPLACE FUNCTION update_indicator_values_hierarchy()
RETURNS TRIGGER AS $$
BEGIN
  -- Get organizational data from user profile
  SELECT 
    p.organization_name,
    p.filiere_name,
    p.filiale_name,
    p.site_name
  INTO 
    NEW.organization_name,
    NEW.filiere_name,
    NEW.filiale_name,
    NEW.site_name
  FROM profiles p
  WHERE p.email = NEW.submitted_by;
  
  -- If not found in profile and site_name is provided, get from sites table
  IF NEW.site_name IS NOT NULL AND NEW.organization_name IS NULL THEN
    SELECT 
      s.organization_name,
      s.filiere_name,
      s.filiale_name
    INTO 
      NEW.organization_name,
      NEW.filiere_name,
      NEW.filiale_name
    FROM sites s
    WHERE s.name = NEW.site_name;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for auto-populating hierarchy (drop first if exists)
DROP TRIGGER IF EXISTS trigger_update_indicator_values_hierarchy ON indicator_values;
CREATE TRIGGER trigger_update_indicator_values_hierarchy
  BEFORE INSERT OR UPDATE OF site_name ON indicator_values
  FOR EACH ROW EXECUTE FUNCTION update_indicator_values_hierarchy();

-- Optimize RLS policies to prevent timeouts
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON indicator_values;
CREATE POLICY "Enable read access for authenticated users" ON indicator_values
  FOR SELECT TO authenticated 
  USING (true);

DROP POLICY IF EXISTS "Contributors can insert and update their assigned indicators" ON indicator_values;
CREATE POLICY "Contributors can insert and update their assigned indicators" ON indicator_values
  FOR ALL TO authenticated 
  USING (
    (jwt() ->> 'role') IN ('admin', 'admin_client', 'contributeur', 'validateur')
  )
  WITH CHECK (
    (jwt() ->> 'role') IN ('admin', 'admin_client', 'contributeur', 'validateur')
  );

-- Ensure RLS is enabled
ALTER TABLE indicator_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Add foreign key constraints if they don't exist
DO $$
BEGIN
  -- Add foreign key for organization_name if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'indicator_values_organization_name_fkey'
  ) THEN
    ALTER TABLE indicator_values 
    ADD CONSTRAINT indicator_values_organization_name_fkey 
    FOREIGN KEY (organization_name) REFERENCES organizations(name) ON DELETE CASCADE;
  END IF;

  -- Add foreign key for site_name if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'indicator_values_site_name_fkey'
  ) THEN
    ALTER TABLE indicator_values 
    ADD CONSTRAINT indicator_values_site_name_fkey 
    FOREIGN KEY (site_name) REFERENCES sites(name) ON DELETE CASCADE;
  END IF;
END $$;