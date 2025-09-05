/*
  # Fix Collection Periods RLS Policy

  1. Security Updates
    - Update RLS policy for collection_periods table to allow INSERT operations for admin users
    - Ensure proper permissions for collection period management

  2. Changes
    - Add INSERT policy for admin users on collection_periods table
    - Update existing policies if needed
*/

-- Drop existing policies if they exist to recreate them properly
DROP POLICY IF EXISTS "Enable full access for admin users" ON collection_periods;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON collection_periods;

-- Create comprehensive policy for admin users (full access)
CREATE POLICY "Enable full access for admin users"
  ON collection_periods
  FOR ALL
  TO authenticated
  USING (((jwt() ->> 'role'::text) = 'admin'::text))
  WITH CHECK (((jwt() ->> 'role'::text) = 'admin'::text));

-- Create read-only policy for authenticated users
CREATE POLICY "Enable read access for authenticated users"
  ON collection_periods
  FOR SELECT
  TO authenticated
  USING (true);

-- Ensure RLS is enabled
ALTER TABLE collection_periods ENABLE ROW LEVEL SECURITY;