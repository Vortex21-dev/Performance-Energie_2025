/*
  # Add foreign key constraint to indicators.processus_code

  1. Foreign Key Constraint
    - Add foreign key constraint between indicators.processus_code and processus.code
    - This will allow Supabase to recognize the relationship for join operations

  2. Security
    - No changes to existing RLS policies
    - Maintains existing table structure
*/

-- Add foreign key constraint to indicators table
DO $$
BEGIN
  -- Check if the foreign key constraint doesn't already exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'indicators_processus_code_fkey' 
    AND table_name = 'indicators'
  ) THEN
    ALTER TABLE indicators 
    ADD CONSTRAINT indicators_processus_code_fkey 
    FOREIGN KEY (processus_code) REFERENCES processus(code) ON DELETE CASCADE;
  END IF;
END $$;