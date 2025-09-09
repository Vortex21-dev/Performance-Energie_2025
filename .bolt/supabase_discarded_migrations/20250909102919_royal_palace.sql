/*
  # Fix RLS policies for collection_periods table

  1. Security Updates
    - Update INSERT policy to allow admin users to create collection periods
    - Update UPDATE policy to allow admin users to modify collection periods
    - Update DELETE policy to allow admin users to delete collection periods
    - Keep SELECT policy for authenticated users

  2. Changes
    - Modified INSERT policy to check for admin role
    - Modified UPDATE policy to check for admin role  
    - Modified DELETE policy to check for admin role
    - Policies now check jwt() -> 'role' = 'admin'
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Enable full access for admin users" ON collection_periods;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON collection_periods;

-- Create new policies for collection_periods
CREATE POLICY "Enable read access for authenticated users" 
ON collection_periods FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Enable insert for admin users" 
ON collection_periods FOR INSERT 
TO authenticated 
WITH CHECK ((jwt() ->> 'role'::text) = 'admin'::text);

CREATE POLICY "Enable update for admin users" 
ON collection_periods FOR UPDATE 
TO authenticated 
USING ((jwt() ->> 'role'::text) = 'admin'::text)
WITH CHECK ((jwt() ->> 'role'::text) = 'admin'::text);

CREATE POLICY "Enable delete for admin users" 
ON collection_periods FOR DELETE 
TO authenticated 
USING ((jwt() ->> 'role'::text) = 'admin'::text);