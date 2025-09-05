/*
  # Create site_consolidation table with automatic consolidation logic

  1. New Tables
    - `site_consolidation`
      - Same attributes as `site_global_indicator_values_simple`
      - Additional `site_names` array to store consolidated sites list
      - Automatic consolidation based on indicator formulas

  2. Consolidation Logic
    - Three consolidation types based on formula keywords:
      - Sum (default): Addition of monthly and annual values
      - Average: Average of monthly and annual values (formulas containing "moyenne", "ratio", "pourcentage")
      - Last month sum: Sum of last available month only (formulas containing "dernier", "last", "actuel")

  3. Automation
    - Triggers to automatically calculate consolidations
    - Functions to handle different consolidation types
    - Automatic updates when source data changes

  4. Security
    - Enable RLS on `site_consolidation` table
    - Add policies for authenticated users
*/

-- Create site_consolidation table with same structure as site_global_indicator_values_simple
CREATE TABLE IF NOT EXISTS site_consolidation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year integer NOT NULL,
  code text NOT NULL,
  axe_energetique text,
  enjeux text,
  normes text,
  critere text,
  indicateur text,
  definition text,
  processus text,
  processus_code text,
  frequence text DEFAULT 'Mensuelle',
  unite text,
  type text,
  formule text,
  value numeric,
  valeur_precedente numeric,
  cible numeric DEFAULT 100,
  variation text,
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
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  organization_name text,
  filiere_name text,
  filiale_name text,
  variations_pourcent numeric(10,2),
  performances_pourcent numeric(10,2),
  perf_janvier numeric(10,2),
  perf_fevrier numeric(10,2),
  perf_mars numeric(10,2),
  perf_avril numeric(10,2),
  perf_mai numeric(10,2),
  perf_juin numeric(10,2),
  perf_juillet numeric(10,2),
  perf_aout numeric(10,2),
  perf_septembre numeric(10,2),
  perf_octobre numeric(10,2),
  perf_novembre numeric(10,2),
  perf_decembre numeric(10,2),
  -- Additional attribute for consolidated sites
  site_names text[] NOT NULL DEFAULT '{}'
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_site_consolidation_code ON site_consolidation USING btree (code);
CREATE INDEX IF NOT EXISTS idx_site_consolidation_year ON site_consolidation USING btree (year);
CREATE INDEX IF NOT EXISTS idx_site_consolidation_org ON site_consolidation USING btree (organization_name);
CREATE INDEX IF NOT EXISTS idx_site_consolidation_filiere ON site_consolidation USING btree (filiere_name);
CREATE INDEX IF NOT EXISTS idx_site_consolidation_filiale ON site_consolidation USING btree (filiale_name);
CREATE INDEX IF NOT EXISTS idx_site_consolidation_site_names ON site_consolidation USING gin (site_names);
CREATE INDEX IF NOT EXISTS idx_site_consolidation_formule ON site_consolidation USING btree (formule);

-- Create unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS site_consolidation_unique_idx 
ON site_consolidation USING btree (code, year, organization_name, COALESCE(filiere_name, ''), COALESCE(filiale_name, ''));

-- Enable RLS
ALTER TABLE site_consolidation ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read access for authenticated users on site_consolidation"
  ON site_consolidation
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert for authenticated users on site_consolidation"
  ON site_consolidation
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users on site_consolidation"
  ON site_consolidation
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable delete for authenticated users on site_consolidation"
  ON site_consolidation
  FOR DELETE
  TO authenticated
  USING (true);

-- Function to get the last available month value for a site/indicator
CREATE OR REPLACE FUNCTION get_last_available_month_value(
  p_site_name text,
  p_code text,
  p_year integer,
  p_organization_name text,
  p_filiere_name text DEFAULT NULL,
  p_filiale_name text DEFAULT NULL
) RETURNS numeric AS $$
DECLARE
  month_columns text[] := ARRAY['decembre', 'novembre', 'octobre', 'septembre', 'aout', 'juillet', 'juin', 'mai', 'avril', 'mars', 'fevrier', 'janvier'];
  month_col text;
  month_value numeric;
BEGIN
  -- Loop through months from December to January to find the last available value
  FOREACH month_col IN ARRAY month_columns LOOP
    EXECUTE format('SELECT %I FROM site_global_indicator_values_simple 
                   WHERE site_name = $1 AND code = $2 AND year = $3 
                   AND organization_name = $4 
                   AND COALESCE(filiere_name, '''') = COALESCE($5, '''')
                   AND COALESCE(filiale_name, '''') = COALESCE($6, '''')
                   AND %I IS NOT NULL', month_col, month_col)
    INTO month_value
    USING p_site_name, p_code, p_year, p_organization_name, p_filiere_name, p_filiale_name;
    
    IF month_value IS NOT NULL THEN
      RETURN month_value;
    END IF;
  END LOOP;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to determine consolidation type based on formula
CREATE OR REPLACE FUNCTION get_consolidation_type(p_formule text) RETURNS text AS $$
BEGIN
  IF p_formule IS NULL THEN
    RETURN 'sum';
  END IF;
  
  -- Convert to lowercase for case-insensitive matching
  p_formule := lower(p_formule);
  
  -- Check for average/ratio keywords
  IF p_formule ~ '(moyenne|ratio|pourcentage|taux|efficacité|efficacite|rendement|performance)' THEN
    RETURN 'average';
  END IF;
  
  -- Check for last month keywords
  IF p_formule ~ '(dernier|last|actuel|current|instantané|instantane)' THEN
    RETURN 'last_month';
  END IF;
  
  -- Default to sum
  RETURN 'sum';
END;
$$ LANGUAGE plpgsql;

-- Function to consolidate indicators from multiple sites
CREATE OR REPLACE FUNCTION consolidate_sites_indicators() RETURNS void AS $$
DECLARE
  consolidation_record RECORD;
  site_record RECORD;
  consolidation_type text;
  total_value numeric := 0;
  total_valeur_precedente numeric := 0;
  total_cible numeric := 0;
  month_totals numeric[] := ARRAY[0,0,0,0,0,0,0,0,0,0,0,0];
  perf_totals numeric[] := ARRAY[0,0,0,0,0,0,0,0,0,0,0,0];
  site_count integer := 0;
  site_names_array text[] := '{}';
  last_month_value numeric;
  month_columns text[] := ARRAY['janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin', 'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre'];
  perf_columns text[] := ARRAY['perf_janvier', 'perf_fevrier', 'perf_mars', 'perf_avril', 'perf_mai', 'perf_juin', 'perf_juillet', 'perf_aout', 'perf_septembre', 'perf_octobre', 'perf_novembre', 'perf_decembre'];
  i integer;
  month_value numeric;
  perf_value numeric;
BEGIN
  -- Clear existing consolidations
  DELETE FROM site_consolidation;
  
  -- Loop through each unique combination of indicator/year/organization/filiere/filiale
  FOR consolidation_record IN
    SELECT 
      code,
      year,
      organization_name,
      filiere_name,
      filiale_name,
      formule,
      axe_energetique,
      enjeux,
      normes,
      critere,
      indicateur,
      definition,
      processus,
      processus_code,
      frequence,
      unite,
      type,
      AVG(cible) as avg_cible
    FROM site_global_indicator_values_simple
    WHERE site_name IS NOT NULL 
      AND site_name != ''
      AND NOT (site_name ~ '^CONSOLIDATION_')
    GROUP BY code, year, organization_name, filiere_name, filiale_name, formule,
             axe_energetique, enjeux, normes, critere, indicateur, definition,
             processus, processus_code, frequence, unite, type
    HAVING COUNT(DISTINCT site_name) >= 2
  LOOP
    -- Reset counters
    total_value := 0;
    total_valeur_precedente := 0;
    total_cible := 0;
    month_totals := ARRAY[0,0,0,0,0,0,0,0,0,0,0,0];
    perf_totals := ARRAY[0,0,0,0,0,0,0,0,0,0,0,0];
    site_count := 0;
    site_names_array := '{}';
    
    -- Determine consolidation type
    consolidation_type := get_consolidation_type(consolidation_record.formule);
    
    -- Process each site for this indicator/year combination
    FOR site_record IN
      SELECT *
      FROM site_global_indicator_values_simple
      WHERE code = consolidation_record.code
        AND year = consolidation_record.year
        AND organization_name = consolidation_record.organization_name
        AND COALESCE(filiere_name, '') = COALESCE(consolidation_record.filiere_name, '')
        AND COALESCE(filiale_name, '') = COALESCE(consolidation_record.filiale_name, '')
        AND site_name IS NOT NULL 
        AND site_name != ''
        AND NOT (site_name ~ '^CONSOLIDATION_')
    LOOP
      site_count := site_count + 1;
      site_names_array := array_append(site_names_array, site_record.site_name);
      
      IF consolidation_type = 'last_month' THEN
        -- For last month sum, get the last available month value
        last_month_value := get_last_available_month_value(
          site_record.site_name,
          site_record.code,
          site_record.year,
          site_record.organization_name,
          site_record.filiere_name,
          site_record.filiale_name
        );
        
        IF last_month_value IS NOT NULL THEN
          total_value := total_value + last_month_value;
        END IF;
      ELSE
        -- For sum and average, process all values
        IF site_record.value IS NOT NULL THEN
          total_value := total_value + site_record.value;
        END IF;
        
        IF site_record.valeur_precedente IS NOT NULL THEN
          total_valeur_precedente := total_valeur_precedente + site_record.valeur_precedente;
        END IF;
        
        IF site_record.cible IS NOT NULL THEN
          total_cible := total_cible + site_record.cible;
        END IF;
        
        -- Process monthly values
        FOR i IN 1..12 LOOP
          EXECUTE format('SELECT COALESCE($1.%I, 0)', month_columns[i]) INTO month_value USING site_record;
          month_totals[i] := month_totals[i] + COALESCE(month_value, 0);
          
          EXECUTE format('SELECT COALESCE($1.%I, 0)', perf_columns[i]) INTO perf_value USING site_record;
          perf_totals[i] := perf_totals[i] + COALESCE(perf_value, 0);
        END LOOP;
      END IF;
    END LOOP;
    
    -- Skip if no sites found
    IF site_count = 0 THEN
      CONTINUE;
    END IF;
    
    -- Calculate final values based on consolidation type
    IF consolidation_type = 'average' THEN
      total_value := total_value / site_count;
      total_valeur_precedente := total_valeur_precedente / site_count;
      total_cible := total_cible / site_count;
      
      FOR i IN 1..12 LOOP
        month_totals[i] := month_totals[i] / site_count;
        perf_totals[i] := perf_totals[i] / site_count;
      END LOOP;
    ELSIF consolidation_type = 'last_month' THEN
      -- For last month, we only have total_value, set others to NULL
      total_valeur_precedente := NULL;
      total_cible := consolidation_record.avg_cible;
      month_totals := ARRAY[NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL];
      perf_totals := ARRAY[NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL];
    END IF;
    
    -- Insert consolidation record
    INSERT INTO site_consolidation (
      year, code, axe_energetique, enjeux, normes, critere, indicateur, definition,
      processus, processus_code, frequence, unite, type, formule,
      value, valeur_precedente, cible, variation,
      janvier, fevrier, mars, avril, mai, juin, juillet, aout, septembre, octobre, novembre, decembre,
      organization_name, filiere_name, filiale_name,
      variations_pourcent, performances_pourcent,
      perf_janvier, perf_fevrier, perf_mars, perf_avril, perf_mai, perf_juin,
      perf_juillet, perf_aout, perf_septembre, perf_octobre, perf_novembre, perf_decembre,
      site_names
    ) VALUES (
      consolidation_record.year,
      consolidation_record.code,
      consolidation_record.axe_energetique,
      consolidation_record.enjeux,
      consolidation_record.normes,
      consolidation_record.critere,
      consolidation_record.indicateur,
      consolidation_record.definition,
      consolidation_record.processus,
      consolidation_record.processus_code,
      consolidation_record.frequence,
      consolidation_record.unite,
      consolidation_record.type,
      consolidation_record.formule,
      total_value,
      total_valeur_precedente,
      total_cible,
      CASE 
        WHEN total_valeur_precedente IS NOT NULL AND total_valeur_precedente != 0 THEN
          CASE 
            WHEN total_value > total_valeur_precedente THEN 'Hausse'
            WHEN total_value < total_valeur_precedente THEN 'Baisse'
            ELSE 'Stable'
          END
        ELSE NULL
      END,
      month_totals[1], month_totals[2], month_totals[3], month_totals[4],
      month_totals[5], month_totals[6], month_totals[7], month_totals[8],
      month_totals[9], month_totals[10], month_totals[11], month_totals[12],
      consolidation_record.organization_name,
      consolidation_record.filiere_name,
      consolidation_record.filiale_name,
      CASE 
        WHEN total_valeur_precedente IS NOT NULL AND total_valeur_precedente != 0 THEN
          ROUND(((total_value - total_valeur_precedente) / total_valeur_precedente * 100)::numeric, 2)
        ELSE NULL
      END,
      CASE 
        WHEN total_cible IS NOT NULL AND total_cible != 0 THEN
          ROUND((total_value / total_cible * 100)::numeric, 2)
        ELSE NULL
      END,
      perf_totals[1], perf_totals[2], perf_totals[3], perf_totals[4],
      perf_totals[5], perf_totals[6], perf_totals[7], perf_totals[8],
      perf_totals[9], perf_totals[10], perf_totals[11], perf_totals[12],
      site_names_array
    )
    ON CONFLICT (code, year, organization_name, COALESCE(filiere_name, ''), COALESCE(filiale_name, ''))
    DO UPDATE SET
      value = EXCLUDED.value,
      valeur_precedente = EXCLUDED.valeur_precedente,
      cible = EXCLUDED.cible,
      variation = EXCLUDED.variation,
      janvier = EXCLUDED.janvier,
      fevrier = EXCLUDED.fevrier,
      mars = EXCLUDED.mars,
      avril = EXCLUDED.avril,
      mai = EXCLUDED.mai,
      juin = EXCLUDED.juin,
      juillet = EXCLUDED.juillet,
      aout = EXCLUDED.aout,
      septembre = EXCLUDED.septembre,
      octobre = EXCLUDED.octobre,
      novembre = EXCLUDED.novembre,
      decembre = EXCLUDED.decembre,
      variations_pourcent = EXCLUDED.variations_pourcent,
      performances_pourcent = EXCLUDED.performances_pourcent,
      perf_janvier = EXCLUDED.perf_janvier,
      perf_fevrier = EXCLUDED.perf_fevrier,
      perf_mars = EXCLUDED.perf_mars,
      perf_avril = EXCLUDED.perf_avril,
      perf_mai = EXCLUDED.perf_mai,
      perf_juin = EXCLUDED.perf_juin,
      perf_juillet = EXCLUDED.perf_juillet,
      perf_aout = EXCLUDED.perf_aout,
      perf_septembre = EXCLUDED.perf_septembre,
      perf_octobre = EXCLUDED.perf_octobre,
      perf_novembre = EXCLUDED.perf_novembre,
      perf_decembre = EXCLUDED.perf_decembre,
      site_names = EXCLUDED.site_names,
      updated_at = now();
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to sync validated indicator values to site_global_indicator_values_simple
CREATE OR REPLACE FUNCTION sync_validated_to_site_indicators() RETURNS void AS $$
DECLARE
  indicator_record RECORD;
  site_indicator_record RECORD;
  month_columns text[] := ARRAY['janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin', 'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre'];
  month_values numeric[] := ARRAY[NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL];
  annual_value numeric := 0;
  previous_year_value numeric;
  variation_text text;
  variation_percent numeric;
  performance_percent numeric;
  i integer;
BEGIN
  -- Process validated indicator values grouped by site/indicator/year
  FOR indicator_record IN
    SELECT 
      iv.site_name,
      iv.indicator_code,
      cp.year,
      iv.organization_name,
      s.filiere_name,
      s.filiale_name,
      i.name as indicator_name,
      i.description as indicator_description,
      i.unit,
      i.type as indicator_type,
      i.formule,
      i.axe_energetique,
      i.enjeux,
      i.normes,
      i.critere,
      i.frequence,
      p.name as processus_name,
      p.code as processus_code,
      AVG(CASE WHEN cp.period_number IS NULL THEN iv.value END) as annual_value,
      AVG(iv.value) FILTER (WHERE cp.period_number = 1) as jan_value,
      AVG(iv.value) FILTER (WHERE cp.period_number = 2) as feb_value,
      AVG(iv.value) FILTER (WHERE cp.period_number = 3) as mar_value,
      AVG(iv.value) FILTER (WHERE cp.period_number = 4) as apr_value,
      AVG(iv.value) FILTER (WHERE cp.period_number = 5) as may_value,
      AVG(iv.value) FILTER (WHERE cp.period_number = 6) as jun_value,
      AVG(iv.value) FILTER (WHERE cp.period_number = 7) as jul_value,
      AVG(iv.value) FILTER (WHERE cp.period_number = 8) as aug_value,
      AVG(iv.value) FILTER (WHERE cp.period_number = 9) as sep_value,
      AVG(iv.value) FILTER (WHERE cp.period_number = 10) as oct_value,
      AVG(iv.value) FILTER (WHERE cp.period_number = 11) as nov_value,
      AVG(iv.value) FILTER (WHERE cp.period_number = 12) as dec_value
    FROM indicator_values iv
    JOIN collection_periods cp ON iv.period_id = cp.id
    JOIN indicators i ON iv.indicator_code = i.code
    LEFT JOIN processus p ON i.processus_code = p.code
    LEFT JOIN sites s ON iv.site_name = s.name
    WHERE iv.status = 'validated'
      AND iv.site_name IS NOT NULL
    GROUP BY 
      iv.site_name, iv.indicator_code, cp.year, iv.organization_name,
      s.filiere_name, s.filiale_name, i.name, i.description, i.unit, i.type, i.formule,
      i.axe_energetique, i.enjeux, i.normes, i.critere, i.frequence,
      p.name, p.code
  LOOP
    -- Calculate annual value from monthly values if not provided
    annual_value := COALESCE(indicator_record.annual_value, 0);
    IF annual_value = 0 THEN
      annual_value := COALESCE(indicator_record.jan_value, 0) + 
                     COALESCE(indicator_record.feb_value, 0) + 
                     COALESCE(indicator_record.mar_value, 0) + 
                     COALESCE(indicator_record.apr_value, 0) + 
                     COALESCE(indicator_record.may_value, 0) + 
                     COALESCE(indicator_record.jun_value, 0) + 
                     COALESCE(indicator_record.jul_value, 0) + 
                     COALESCE(indicator_record.aug_value, 0) + 
                     COALESCE(indicator_record.sep_value, 0) + 
                     COALESCE(indicator_record.oct_value, 0) + 
                     COALESCE(indicator_record.nov_value, 0) + 
                     COALESCE(indicator_record.dec_value, 0);
    END IF;
    
    -- Get previous year value
    SELECT value INTO previous_year_value
    FROM site_global_indicator_values_simple
    WHERE site_name = indicator_record.site_name
      AND code = indicator_record.indicator_code
      AND year = indicator_record.year - 1
      AND organization_name = indicator_record.organization_name
      AND COALESCE(filiere_name, '') = COALESCE(indicator_record.filiere_name, '')
      AND COALESCE(filiale_name, '') = COALESCE(indicator_record.filiale_name, '')
    LIMIT 1;
    
    -- Calculate variation
    IF previous_year_value IS NOT NULL AND previous_year_value != 0 THEN
      variation_percent := ROUND(((annual_value - previous_year_value) / previous_year_value * 100)::numeric, 2);
      variation_text := CASE 
        WHEN annual_value > previous_year_value THEN 'Hausse'
        WHEN annual_value < previous_year_value THEN 'Baisse'
        ELSE 'Stable'
      END;
    END IF;
    
    -- Calculate performance percentage (assuming target of 100 if not specified)
    performance_percent := CASE 
      WHEN annual_value != 0 THEN ROUND((annual_value / 100 * 100)::numeric, 2)
      ELSE NULL
    END;
    
    -- Insert or update in site_global_indicator_values_simple
    INSERT INTO site_global_indicator_values_simple (
      site_name, year, code, axe_energetique, enjeux, normes, critere, indicateur, definition,
      processus, processus_code, frequence, unite, type, formule,
      value, valeur_precedente, cible, variation,
      janvier, fevrier, mars, avril, mai, juin, juillet, aout, septembre, octobre, novembre, decembre,
      organization_name, filiere_name, filiale_name,
      variations_pourcent, performances_pourcent,
      perf_janvier, perf_fevrier, perf_mars, perf_avril, perf_mai, perf_juin,
      perf_juillet, perf_aout, perf_septembre, perf_octobre, perf_novembre, perf_decembre
    ) VALUES (
      indicator_record.site_name,
      indicator_record.year,
      indicator_record.indicator_code,
      indicator_record.axe_energetique,
      indicator_record.enjeux,
      indicator_record.normes,
      indicator_record.critere,
      indicator_record.indicator_name,
      indicator_record.indicator_description,
      indicator_record.processus_name,
      indicator_record.processus_code,
      indicator_record.frequence,
      indicator_record.unit,
      indicator_record.indicator_type,
      indicator_record.formule,
      annual_value,
      previous_year_value,
      100, -- Default target
      variation_text,
      indicator_record.jan_value, indicator_record.feb_value, indicator_record.mar_value, indicator_record.apr_value,
      indicator_record.may_value, indicator_record.jun_value, indicator_record.jul_value, indicator_record.aug_value,
      indicator_record.sep_value, indicator_record.oct_value, indicator_record.nov_value, indicator_record.dec_value,
      indicator_record.organization_name,
      indicator_record.filiere_name,
      indicator_record.filiale_name,
      variation_percent,
      performance_percent,
      NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL -- Performance values will be calculated by existing triggers
    )
    ON CONFLICT (site_name, code, year)
    DO UPDATE SET
      value = EXCLUDED.value,
      valeur_precedente = EXCLUDED.valeur_precedente,
      variation = EXCLUDED.variation,
      janvier = EXCLUDED.janvier,
      fevrier = EXCLUDED.fevrier,
      mars = EXCLUDED.mars,
      avril = EXCLUDED.avril,
      mai = EXCLUDED.mai,
      juin = EXCLUDED.juin,
      juillet = EXCLUDED.juillet,
      aout = EXCLUDED.aout,
      septembre = EXCLUDED.septembre,
      octobre = EXCLUDED.octobre,
      novembre = EXCLUDED.novembre,
      decembre = EXCLUDED.decembre,
      variations_pourcent = EXCLUDED.variations_pourcent,
      performances_pourcent = EXCLUDED.performances_pourcent,
      updated_at = now();
  END LOOP;
  
  -- Now run the consolidation
  PERFORM consolidate_sites_indicators();
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically sync when indicator_values are validated
CREATE OR REPLACE FUNCTION trigger_sync_validated_indicators() RETURNS trigger AS $$
BEGIN
  -- Only sync when status changes to 'validated'
  IF (TG_OP = 'UPDATE' AND OLD.status != 'validated' AND NEW.status = 'validated') OR
     (TG_OP = 'INSERT' AND NEW.status = 'validated') THEN
    PERFORM sync_validated_to_site_indicators();
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger on indicator_values
DROP TRIGGER IF EXISTS trigger_sync_validated_indicators ON indicator_values;
CREATE TRIGGER trigger_sync_validated_indicators
  AFTER INSERT OR UPDATE ON indicator_values
  FOR EACH ROW
  EXECUTE FUNCTION trigger_sync_validated_indicators();

-- Create trigger to recalculate consolidations when site data changes
CREATE OR REPLACE FUNCTION trigger_recalculate_consolidations() RETURNS trigger AS $$
BEGIN
  PERFORM consolidate_sites_indicators();
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger on site_global_indicator_values_simple
DROP TRIGGER IF EXISTS trigger_recalculate_consolidations ON site_global_indicator_values_simple;
CREATE TRIGGER trigger_recalculate_consolidations
  AFTER INSERT OR UPDATE OR DELETE ON site_global_indicator_values_simple
  FOR EACH STATEMENT
  EXECUTE FUNCTION trigger_recalculate_consolidations();

-- Create view to easily identify consolidations
CREATE OR REPLACE VIEW site_consolidations_view AS
SELECT 
  sc.*,
  array_length(sc.site_names, 1) as nombre_sites_consolides
FROM site_consolidation sc
ORDER BY sc.organization_name, sc.filiere_name, sc.filiale_name, sc.code, sc.year;

-- Initial sync of existing validated data
SELECT sync_validated_to_site_indicators();

-- Create updated_at trigger for site_consolidation
CREATE OR REPLACE FUNCTION update_site_consolidation_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_site_consolidation_updated_at
  BEFORE UPDATE ON site_consolidation
  FOR EACH ROW
  EXECUTE FUNCTION update_site_consolidation_updated_at();