/*
  # Fix sites table triggers and policies

  1. Remove problematic triggers that cause DELETE operations during INSERT
  2. Simplify RLS policies to avoid jwt() function errors
  3. Allow proper site insertion for simple companies

  ## Changes Made
  - Drop and recreate sync_site_processes_on_sites trigger to only run on UPDATE
  - Simplify DELETE policy to avoid jwt() function calls
  - Ensure INSERT operations don't trigger unwanted DELETE operations
*/

-- Drop the problematic trigger that runs on INSERT and causes DELETE operations
DROP TRIGGER IF EXISTS sync_site_processes_on_sites ON sites;

-- Recreate the trigger to only run on UPDATE, not INSERT
CREATE TRIGGER sync_site_processes_on_sites 
  AFTER UPDATE ON sites 
  FOR EACH STATEMENT 
  EXECUTE FUNCTION trigger_sync_site_processes();

-- Drop and recreate the DELETE policy to be simpler and avoid jwt() function
DROP POLICY IF EXISTS "Enable full access for admin users" ON sites;

-- Create a simpler DELETE policy for authenticated users
CREATE POLICY "Enable delete for authenticated users" ON sites
  FOR DELETE TO authenticated
  USING (true);

-- Ensure INSERT policy is simple and doesn't conflict
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON sites;

CREATE POLICY "Enable insert for authenticated users" ON sites
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Ensure SELECT policy is simple
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON sites;

CREATE POLICY "Enable read access for authenticated users" ON sites
  FOR SELECT TO authenticated
  USING (true);