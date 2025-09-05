/*
  # Fix profiles table RLS policies

  1. Security Updates
    - Drop existing restrictive UPDATE policy on profiles table
    - Create new UPDATE policy that allows users to update their own profile
    - Ensure users can update their organization association

  2. Changes
    - Remove overly restrictive UPDATE policy
    - Add proper UPDATE policy using email-based authentication
*/

-- Drop existing UPDATE policy if it exists
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Enable update for users based on email" ON profiles;
DROP POLICY IF EXISTS "Users can update their own data" ON profiles;

-- Create new UPDATE policy that allows users to update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.email() = email)
  WITH CHECK (auth.email() = email);

-- Ensure INSERT policy exists for new users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname = 'Users can insert own profile'
  ) THEN
    CREATE POLICY "Users can insert own profile"
      ON profiles
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.email() = email);
  END IF;
END $$;

-- Ensure SELECT policy exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname = 'Users can read own profile'
  ) THEN
    CREATE POLICY "Users can read own profile"
      ON profiles
      FOR SELECT
      TO authenticated
      USING (auth.email() = email);
  END IF;
END $$;