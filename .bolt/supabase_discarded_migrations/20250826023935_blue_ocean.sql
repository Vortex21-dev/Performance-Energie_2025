/*
  # Add foreign key relationship between indicators and processus tables

  1. Database Changes
    - Add foreign key constraint on indicators.processus_code referencing processus.code
    - This enables Supabase to recognize the relationship for join operations

  2. Security
    - No changes to existing RLS policies
    - Maintains current access controls
*/

-- Add foreign key constraint to enable proper joins between indicators and processus
DO $$
BEGIN
  -- Check if the foreign key constraint doesn't already exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'indicators_processus_code_fkey' 
    AND table_name = 'indicators'
  ) THEN
    -- Add the foreign key constraint
    ALTER TABLE indicators 
    ADD CONSTRAINT indicators_processus_code_fkey 
    FOREIGN KEY (processus_code) REFERENCES processus(code) ON DELETE CASCADE;
  END IF;
END $$;