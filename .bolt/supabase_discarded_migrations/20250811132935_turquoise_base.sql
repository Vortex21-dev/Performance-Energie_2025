/*
  # Fix sites table triggers causing DELETE WHERE clause error

  1. Problem
    - The sites table has triggers that are causing DELETE operations without WHERE clauses
    - This prevents site insertion from working properly

  2. Solution
    - Drop problematic triggers that cause DELETE operations during INSERT
    - Keep only essential triggers for the sites table
    - Ensure RLS policies don't conflict with INSERT operations

  3. Changes
    - Drop sync_site_processes_on_sites trigger temporarily
    - This trigger was causing cascading DELETE operations during INSERT
*/

-- Drop the problematic trigger that causes DELETE operations during INSERT
DROP TRIGGER IF EXISTS sync_site_processes_on_sites ON sites;

-- Recreate a safer version of the trigger that only runs on UPDATE, not INSERT
-- This prevents the DELETE operations that were causing the WHERE clause error
CREATE OR REPLACE TRIGGER sync_site_processes_on_sites_update
  AFTER UPDATE ON sites
  FOR EACH STATEMENT
  EXECUTE FUNCTION trigger_sync_site_processes();

-- Ensure the sites table has proper RLS policies without DELETE conflicts
-- Update the DELETE policy to be more specific
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON sites;

CREATE POLICY "Enable delete for admin users on sites"
  ON sites
  FOR DELETE
  TO authenticated
  USING (
    (jwt() ->> 'role'::text) = 'admin'::text
  );