/*
  # Créer la table site_indicator_global

  1. Nouvelle table
    - `site_indicator_global` avec tous les champs demandés
    - Contraintes et index optimisés
    - RLS activé avec politiques appropriées

  2. Fonctions de synchronisation
    - Enrichissement automatique des métadonnées
    - Calculs automatiques des performances
    - Vérification des liaisons site-processus
    - Validation des indicateurs autorisés

  3. Triggers automatiques
    - Synchronisation lors des changements
    - Mise à jour des calculs
*/

-- Créer la table site_indicator_global
CREATE TABLE IF NOT EXISTS public.site_indicator_global (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  site_name text NOT NULL,
  year integer NOT NULL,
  code text NOT NULL,
  axe_energetique text NULL,
  enjeux text NULL,
  normes text NULL,
  critere text NULL,
  indicateur text NULL,
  definition text NULL,
  processus text NULL,
  processus_code text NULL,
  frequence text NULL,
  unite text NULL,
  type text NULL,
  formule text NULL,
  value numeric NULL,
  valeur_precedente numeric NULL,
  cible numeric NULL DEFAULT 100,
  variation text NULL,
  janvier numeric NULL,
  fevrier numeric NULL,
  mars numeric NULL,
  avril numeric NULL,
  mai numeric NULL,
  juin numeric NULL,
  juillet numeric NULL,
  aout numeric NULL,
  septembre numeric NULL,
  octobre numeric NULL,
  novembre numeric NULL,
  decembre numeric NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  organization_name text NULL,
  filiere_name text NULL,
  filiale_name text NULL,
  variations_pourcent numeric(10, 2) NULL,
  performances_pourcent numeric(10, 2) NULL,
  perf_janvier numeric(10, 2) NULL,
  perf_fevrier numeric(10, 2) NULL,
  perf_mars numeric(10, 2) NULL,
  perf_avril numeric(10, 2) NULL,
  perf_mai numeric(10, 2) NULL,
  perf_juin numeric(10, 2) NULL,
  perf_juillet numeric(10, 2) NULL,
  perf_aout numeric(10, 2) NULL,
  perf_septembre numeric(10, 2) NULL,
  perf_octobre numeric(10, 2) NULL,
  perf_novembre numeric(10, 2) NULL,
  perf_decembre numeric(10, 2) NULL,
  
  CONSTRAINT site_indicator_global_pkey PRIMARY KEY (id),
  CONSTRAINT site_indicator_global_code_fkey FOREIGN KEY (code) REFERENCES indicators (code) ON DELETE CASCADE,
  CONSTRAINT site_indicator_global_processus_code_fkey FOREIGN KEY (processus_code) REFERENCES processus (code) ON DELETE CASCADE,
  CONSTRAINT site_indicator_global_site_name_fkey FOREIGN KEY (site_name) REFERENCES sites (name) ON DELETE CASCADE,
  CONSTRAINT site_indicator_global_year_check CHECK ((year >= 2000) AND (year <= 2100))
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_site_indicator_global_site_name ON public.site_indicator_global USING btree (site_name);
CREATE INDEX IF NOT EXISTS idx_site_indicator_global_year ON public.site_indicator_global USING btree (year);
CREATE INDEX IF NOT EXISTS idx_site_indicator_global_code ON public.site_indicator_global USING btree (code);
CREATE INDEX IF NOT EXISTS idx_site_indicator_global_processus_code ON public.site_indicator_global USING btree (processus_code);
CREATE UNIQUE INDEX IF NOT EXISTS site_indicator_global_unique_idx ON public.site_indicator_global USING btree (site_name, code, year);

-- Activer RLS
ALTER TABLE public.site_indicator_global ENABLE ROW LEVEL SECURITY;

-- Politiques RLS
CREATE POLICY "Enable read access for authenticated users on site_indicator_global"
  ON public.site_indicator_global
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert for authenticated users on site_indicator_global"
  ON public.site_indicator_global
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users on site_indicator_global"
  ON public.site_indicator_global
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Enable delete for authenticated users on site_indicator_global"
  ON public.site_indicator_global
  FOR DELETE
  TO authenticated
  USING (true);

-- Fonction pour synchroniser les indicateurs d'un site
CREATE OR REPLACE FUNCTION sync_site_indicator_global(target_site_name text)
RETURNS void AS $$
DECLARE
  site_org_name text;
  site_filiere_name text;
  site_filiale_name text;
  indicator_record RECORD;
  current_year integer := 2025;
  previous_year integer := 2024;
  current_value numeric;
  previous_value numeric;
  monthly_values numeric[];
  target_cible numeric := 100;
  calc_variations_pourcent numeric(10,2);
  calc_performances_pourcent numeric(10,2);
  monthly_perfs numeric(10,2)[];
  i integer;
BEGIN
  -- Récupérer les informations du site
  SELECT s.organization_name, s.filiere_name, s.filiale_name
  INTO site_org_name, site_filiere_name, site_filiale_name
  FROM sites s
  WHERE s.name = target_site_name;
  
  IF site_org_name IS NULL THEN
    RETURN;
  END IF;

  -- Supprimer les anciens enregistrements pour ce site
  DELETE FROM site_indicator_global 
  WHERE site_name = target_site_name;

  -- Récupérer tous les indicateurs autorisés pour ce site
  FOR indicator_record IN
    SELECT DISTINCT
      i.code,
      i.name as indicateur,
      i.description as definition,
      i.unit as unite,
      i.type,
      i.formule,
      i.frequence,
      i.processus_code,
      p.name as processus,
      -- Récupérer axe_energetique depuis issues
      iss.axe_energetique,
      -- Récupérer enjeux depuis sector_standards_issues
      (
        SELECT string_agg(DISTINCT ssi.issue_name, ', ')
        FROM sector_standards_issues ssi
        INNER JOIN organization_selections os ON os.sector_name = ssi.sector_name 
          AND os.energy_type_name = ssi.energy_type_name
        WHERE os.organization_name = site_org_name
          AND ssi.issue_codes && ARRAY[iss.code]
      ) as enjeux,
      -- Récupérer normes depuis sector_standards
      (
        SELECT string_agg(DISTINCT ss.standard_name, ', ')
        FROM sector_standards ss
        INNER JOIN organization_selections os ON os.sector_name = ss.sector_name 
          AND os.energy_type_name = ss.energy_type_name
        WHERE os.organization_name = site_org_name
          AND ss.standard_codes && os.standard_names
      ) as normes,
      -- Récupérer critère depuis sector_standards_issues_criteria
      (
        SELECT string_agg(DISTINCT ssic.criteria_name, ', ')
        FROM sector_standards_issues_criteria ssic
        INNER JOIN organization_selections os ON os.sector_name = ssic.sector_name 
          AND os.energy_type_name = ssic.energy_type_name
        WHERE os.organization_name = site_org_name
          AND ssic.indicator_codes && ARRAY[i.code]
      ) as critere
    FROM indicators i
    INNER JOIN processus p ON p.code = i.processus_code
    LEFT JOIN issues iss ON iss.code = ANY(
      SELECT unnest(issue_codes) 
      FROM sector_standards_issues ssi
      INNER JOIN organization_selections os ON os.sector_name = ssi.sector_name 
        AND os.energy_type_name = ssi.energy_type_name
      WHERE os.organization_name = site_org_name
    )
    WHERE EXISTS (
      -- Vérifier que le site a ce processus actif
      SELECT 1 FROM site_processes sp 
      WHERE sp.site_name = target_site_name 
        AND sp.processus_code = i.processus_code 
        AND sp.is_active = true
    )
    AND EXISTS (
      -- Vérifier que l'indicateur est autorisé pour l'organisation
      SELECT 1 FROM organization_selections os 
      WHERE os.organization_name = site_org_name 
        AND i.name = ANY(os.indicator_names)
    )
  LOOP
    -- Récupérer la valeur annuelle actuelle (2025)
    SELECT iv.value INTO current_value
    FROM indicator_values iv
    INNER JOIN collection_periods cp ON cp.id = iv.period_id
    WHERE iv.indicator_code = indicator_record.code
      AND iv.site_name = target_site_name
      AND cp.year = current_year
      AND cp.period_type = 'year'
    LIMIT 1;

    -- Récupérer la valeur annuelle précédente (2024)
    SELECT iv.value INTO previous_value
    FROM indicator_values iv
    INNER JOIN collection_periods cp ON cp.id = iv.period_id
    WHERE iv.indicator_code = indicator_record.code
      AND iv.site_name = target_site_name
      AND cp.year = previous_year
      AND cp.period_type = 'year'
    LIMIT 1;

    -- Récupérer les valeurs mensuelles pour 2025
    monthly_values := ARRAY[NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL];
    
    FOR i IN 1..12 LOOP
      SELECT iv.value INTO monthly_values[i]
      FROM indicator_values iv
      INNER JOIN collection_periods cp ON cp.id = iv.period_id
      WHERE iv.indicator_code = indicator_record.code
        AND iv.site_name = target_site_name
        AND cp.year = current_year
        AND cp.period_type = 'month'
        AND cp.period_number = i
      LIMIT 1;
    END LOOP;

    -- Calculer les variations et performances
    IF current_value IS NOT NULL THEN
      calc_variations_pourcent := current_value - target_cible;
      calc_performances_pourcent := (current_value / target_cible) * 100;
    END IF;

    -- Calculer les performances mensuelles
    monthly_perfs := ARRAY[NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL];
    FOR i IN 1..12 LOOP
      IF monthly_values[i] IS NOT NULL THEN
        monthly_perfs[i] := (monthly_values[i] / target_cible) * 100;
      END IF;
    END LOOP;

    -- Insérer l'enregistrement
    INSERT INTO site_indicator_global (
      site_name,
      year,
      code,
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
      formule,
      value,
      valeur_precedente,
      cible,
      variation,
      janvier,
      fevrier,
      mars,
      avril,
      mai,
      juin,
      juillet,
      aout,
      septembre,
      octobre,
      novembre,
      decembre,
      organization_name,
      filiere_name,
      filiale_name,
      variations_pourcent,
      performances_pourcent,
      perf_janvier,
      perf_fevrier,
      perf_mars,
      perf_avril,
      perf_mai,
      perf_juin,
      perf_juillet,
      perf_aout,
      perf_septembre,
      perf_octobre,
      perf_novembre,
      perf_decembre
    ) VALUES (
      target_site_name,
      current_year,
      indicator_record.code,
      indicator_record.axe_energetique,
      indicator_record.enjeux,
      indicator_record.normes,
      indicator_record.critere,
      indicator_record.indicateur,
      indicator_record.definition,
      indicator_record.processus,
      indicator_record.processus_code,
      indicator_record.frequence,
      indicator_record.unite,
      indicator_record.type,
      indicator_record.formule,
      current_value,
      previous_value,
      target_cible,
      NULL, -- variation
      monthly_values[1],  -- janvier
      monthly_values[2],  -- fevrier
      monthly_values[3],  -- mars
      monthly_values[4],  -- avril
      monthly_values[5],  -- mai
      monthly_values[6],  -- juin
      monthly_values[7],  -- juillet
      monthly_values[8],  -- aout
      monthly_values[9],  -- septembre
      monthly_values[10], -- octobre
      monthly_values[11], -- novembre
      monthly_values[12], -- decembre
      site_org_name,
      site_filiere_name,
      site_filiale_name,
      calc_variations_pourcent,
      calc_performances_pourcent,
      monthly_perfs[1],   -- perf_janvier
      monthly_perfs[2],   -- perf_fevrier
      monthly_perfs[3],   -- perf_mars
      monthly_perfs[4],   -- perf_avril
      monthly_perfs[5],   -- perf_mai
      monthly_perfs[6],   -- perf_juin
      monthly_perfs[7],   -- perf_juillet
      monthly_perfs[8],   -- perf_aout
      monthly_perfs[9],   -- perf_septembre
      monthly_perfs[10],  -- perf_octobre
      monthly_perfs[11],  -- perf_novembre
      monthly_perfs[12]   -- perf_decembre
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour synchroniser tous les sites
CREATE OR REPLACE FUNCTION sync_all_sites_indicator_global()
RETURNS void AS $$
DECLARE
  site_record RECORD;
BEGIN
  FOR site_record IN SELECT name FROM sites LOOP
    PERFORM sync_site_indicator_global(site_record.name);
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Fonction trigger pour la mise à jour automatique
CREATE OR REPLACE FUNCTION update_site_indicator_global_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour updated_at
CREATE TRIGGER update_site_indicator_global_updated_at
  BEFORE UPDATE ON public.site_indicator_global
  FOR EACH ROW
  EXECUTE FUNCTION update_site_indicator_global_updated_at();

-- Fonction trigger pour synchroniser lors des changements de site_processes
CREATE OR REPLACE FUNCTION trigger_sync_site_indicator_global_on_site_process_change()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    PERFORM sync_site_indicator_global(NEW.site_name);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM sync_site_indicator_global(OLD.site_name);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger sur site_processes
CREATE TRIGGER trigger_site_indicator_global_process_change
  AFTER INSERT OR UPDATE OR DELETE ON public.site_processes
  FOR EACH ROW
  EXECUTE FUNCTION trigger_sync_site_indicator_global_on_site_process_change();

-- Fonction trigger pour synchroniser lors des changements d'organization_selections
CREATE OR REPLACE FUNCTION trigger_sync_site_indicator_global_on_organization_change()
RETURNS trigger AS $$
DECLARE
  site_record RECORD;
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    -- Synchroniser tous les sites de cette organisation
    FOR site_record IN 
      SELECT name FROM sites WHERE organization_name = NEW.organization_name
    LOOP
      PERFORM sync_site_indicator_global(site_record.name);
    END LOOP;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Synchroniser tous les sites de cette organisation
    FOR site_record IN 
      SELECT name FROM sites WHERE organization_name = OLD.organization_name
    LOOP
      PERFORM sync_site_indicator_global(site_record.name);
    END LOOP;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger sur organization_selections
CREATE TRIGGER trigger_site_indicator_global_organization_change
  AFTER INSERT OR UPDATE OR DELETE ON public.organization_selections
  FOR EACH ROW
  EXECUTE FUNCTION trigger_sync_site_indicator_global_on_organization_change();

-- Fonction trigger pour synchroniser lors des changements d'indicators
CREATE OR REPLACE FUNCTION trigger_sync_site_indicator_global_on_indicator_change()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN
    -- Synchroniser tous les sites
    PERFORM sync_all_sites_indicator_global();
    RETURN COALESCE(NEW, OLD);
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger sur indicators
CREATE TRIGGER trigger_site_indicator_global_indicator_change
  AFTER INSERT OR UPDATE OR DELETE ON public.indicators
  FOR EACH ROW
  EXECUTE FUNCTION trigger_sync_site_indicator_global_on_indicator_change();

-- Fonction trigger pour synchroniser lors des changements d'indicator_values
CREATE OR REPLACE FUNCTION trigger_sync_site_indicator_global_on_value_change()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    IF NEW.site_name IS NOT NULL THEN
      PERFORM sync_site_indicator_global(NEW.site_name);
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.site_name IS NOT NULL THEN
      PERFORM sync_site_indicator_global(OLD.site_name);
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger sur indicator_values
CREATE TRIGGER trigger_site_indicator_global_value_change
  AFTER INSERT OR UPDATE OR DELETE ON public.indicator_values
  FOR EACH ROW
  EXECUTE FUNCTION trigger_sync_site_indicator_global_on_value_change();

-- Fonction pour vérifier la synchronisation
CREATE OR REPLACE FUNCTION check_site_indicator_global_sync()
RETURNS TABLE (
  site_name text,
  total_indicators bigint,
  indicators_with_values bigint,
  sync_status text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sig.site_name,
    COUNT(*) as total_indicators,
    COUNT(sig.value) as indicators_with_values,
    CASE 
      WHEN COUNT(sig.value) = COUNT(*) THEN 'Complet'
      WHEN COUNT(sig.value) > 0 THEN 'Partiel'
      ELSE 'Aucune donnée'
    END as sync_status
  FROM site_indicator_global sig
  GROUP BY sig.site_name
  ORDER BY sig.site_name;
END;
$$ LANGUAGE plpgsql;

-- Synchroniser tous les sites existants
SELECT sync_all_sites_indicator_global();