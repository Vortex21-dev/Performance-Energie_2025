/*
  # Create global indicators table

  1. New Tables
    - `global_indicators`
      - `id` (uuid, primary key)
      - `site_name` (text, not null)
      - `indicator_code` (text, not null)
      - `axe_energetique` (text, nullable)
      - `enjeux_energetiques` (text, nullable)
      - `normes` (text, nullable)
      - `criteres_energetiques` (text, nullable)
      - `indicateur_name` (text, nullable)
      - `definition` (text, nullable)
      - `processus` (text, nullable)
      - `frequence` (text, nullable)
      - `unite` (text, nullable)
      - `type` (text, nullable)
      - `formule` (text, nullable)
      - `valeur_annee_precedente` (numeric, nullable)
      - `valeur_annee_actuelle` (numeric, nullable)
      - `cible_annee_actuelle` (numeric, nullable)
      - `variation_pourcentage` (text, nullable)
      - `janvier` (numeric, nullable)
      - `fevrier` (numeric, nullable)
      - `mars` (numeric, nullable)
      - `avril` (numeric, nullable)
      - `mai` (numeric, nullable)
      - `juin` (numeric, nullable)
      - `juillet` (numeric, nullable)
      - `aout` (numeric, nullable)
      - `septembre` (numeric, nullable)
      - `octobre` (numeric, nullable)
      - `novembre` (numeric, nullable)
      - `decembre` (numeric, nullable)
      - `year` (integer, not null, default current year)
      - `created_at` (timestamp with time zone, default now())
      - `updated_at` (timestamp with time zone, default now())

  2. Security
    - Enable RLS on `global_indicators` table
    - Add policies for authenticated users to read and write their data

  3. Indexes
    - Unique constraint on (site_name, indicator_code, year) to prevent duplicates
    - Index on site_name for faster queries
    - Index on year for filtering
*/

CREATE TABLE IF NOT EXISTS global_indicators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_name text NOT NULL,
  indicator_code text NOT NULL,
  axe_energetique text,
  enjeux_energetiques text,
  normes text,
  criteres_energetiques text,
  indicateur_name text,
  definition text,
  processus text,
  frequence text,
  unite text,
  type text,
  formule text,
  valeur_annee_precedente numeric,
  valeur_annee_actuelle numeric,
  cible_annee_actuelle numeric,
  variation_pourcentage text,
  janvier numeric,
  fevrier numeric,
  mars numeric,
  avril numeric,
  mai numeric,
  juin numeric,
  juillet numeric,
  aout numeric,
  septembre numeric,
  octobre numeric,
  novembre numeric,
  decembre numeric,
  year integer NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE global_indicators ENABLE ROW LEVEL SECURITY;

-- Create unique constraint to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS global_indicators_unique_idx 
ON global_indicators (site_name, indicator_code, year);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_global_indicators_site_name 
ON global_indicators (site_name);

CREATE INDEX IF NOT EXISTS idx_global_indicators_year 
ON global_indicators (year);

CREATE INDEX IF NOT EXISTS idx_global_indicators_code 
ON global_indicators (indicator_code);

-- RLS Policies
CREATE POLICY "Enable read access for authenticated users"
  ON global_indicators
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert for authenticated users"
  ON global_indicators
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users"
  ON global_indicators
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable delete for authenticated users"
  ON global_indicators
  FOR DELETE
  TO authenticated
  USING (true);

-- Update trigger for updated_at column
CREATE OR REPLACE FUNCTION update_global_indicators_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_global_indicators_updated_at
  BEFORE UPDATE ON global_indicators
  FOR EACH ROW
  EXECUTE FUNCTION update_global_indicators_updated_at();