/*
  # Création d'une nouvelle table de consolidation des sites

  1. Nouvelle table
    - `sites_consolidated_indicators`
      - Consolidation propre des indicateurs par site
      - Structure hiérarchique claire
      - Données mensuelles et annuelles
      - Métadonnées des indicateurs

  2. Fonctions de consolidation
    - Fonction de consolidation sécurisée
    - Gestion des agrégations par type d'indicateur
    - Calculs de performances

  3. Triggers optimisés
    - Trigger simple sans récursion
    - Synchronisation efficace
    - Protection contre les boucles infinies

  4. Index de performance
    - Index pour les requêtes hiérarchiques
    - Index pour les recherches temporelles
    - Index pour les consolidations
*/

-- Supprimer l'ancienne table site_consolidation si elle existe
DROP TABLE IF EXISTS site_consolidation CASCADE;

-- Créer la nouvelle table de consolidation des sites
CREATE TABLE sites_consolidated_indicators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Hiérarchie organisationnelle
  organization_name text NOT NULL,
  filiere_name text,
  filiale_name text,
  site_name text NOT NULL,
  
  -- Informations de l'indicateur
  indicator_code text NOT NULL,
  indicator_name text,
  indicator_description text,
  
  -- Métadonnées énergétiques
  axe_energetique text,
  enjeux text,
  normes text,
  critere text,
  processus_name text,
  processus_code text,
  
  -- Caractéristiques de l'indicateur
  frequence text DEFAULT 'Mensuelle',
  unite text,
  type text,
  formule text,
  
  -- Période
  year integer NOT NULL,
  
  -- Valeurs consolidées
  value_annual numeric,
  valeur_precedente numeric,
  cible numeric DEFAULT 100,
  
  -- Valeurs mensuelles
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
  
  -- Calculs de performance
  variations_pourcent numeric(10,2),
  performances_pourcent numeric(10,2),
  
  -- Performances mensuelles
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
  
  -- Métadonnées
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Contraintes
  CONSTRAINT sites_consolidated_indicators_year_check 
    CHECK (year >= 2000 AND year <= 2100),
  
  -- Index unique pour éviter les doublons
  CONSTRAINT sites_consolidated_indicators_unique 
    UNIQUE (organization_name, site_name, indicator_code, year)
);

-- Activer RLS
ALTER TABLE sites_consolidated_indicators ENABLE ROW LEVEL SECURITY;

-- Politiques RLS
CREATE POLICY "Enable read access for authenticated users on sites_consolidated"
  ON sites_consolidated_indicators
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert for authenticated users on sites_consolidated"
  ON sites_consolidated_indicators
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users on sites_consolidated"
  ON sites_consolidated_indicators
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Enable delete for authenticated users on sites_consolidated"
  ON sites_consolidated_indicators
  FOR DELETE
  TO authenticated
  USING (true);

-- Index pour les performances
CREATE INDEX idx_sites_consolidated_organization 
  ON sites_consolidated_indicators (organization_name);

CREATE INDEX idx_sites_consolidated_site_year 
  ON sites_consolidated_indicators (site_name, year);

CREATE INDEX idx_sites_consolidated_indicator 
  ON sites_consolidated_indicators (indicator_code);

CREATE INDEX idx_sites_consolidated_hierarchy 
  ON sites_consolidated_indicators (organization_name, filiere_name, filiale_name, site_name);

CREATE INDEX idx_sites_consolidated_performance 
  ON sites_consolidated_indicators (site_name, year, performances_pourcent);

CREATE INDEX idx_sites_consolidated_axe_enjeux 
  ON sites_consolidated_indicators (site_name, axe_energetique, enjeux, year);

-- Fonction pour calculer les performances mensuelles
CREATE OR REPLACE FUNCTION calculate_monthly_performances_consolidated()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Calculer les performances mensuelles si une cible est définie
  IF NEW.cible IS NOT NULL AND NEW.cible > 0 THEN
    NEW.perf_janvier := CASE WHEN NEW.janvier IS NOT NULL THEN (NEW.janvier / NEW.cible) * 100 END;
    NEW.perf_fevrier := CASE WHEN NEW.fevrier IS NOT NULL THEN (NEW.fevrier / NEW.cible) * 100 END;
    NEW.perf_mars := CASE WHEN NEW.mars IS NOT NULL THEN (NEW.mars / NEW.cible) * 100 END;
    NEW.perf_avril := CASE WHEN NEW.avril IS NOT NULL THEN (NEW.avril / NEW.cible) * 100 END;
    NEW.perf_mai := CASE WHEN NEW.mai IS NOT NULL THEN (NEW.mai / NEW.cible) * 100 END;
    NEW.perf_juin := CASE WHEN NEW.juin IS NOT NULL THEN (NEW.juin / NEW.cible) * 100 END;
    NEW.perf_juillet := CASE WHEN NEW.juillet IS NOT NULL THEN (NEW.juillet / NEW.cible) * 100 END;
    NEW.perf_aout := CASE WHEN NEW.aout IS NOT NULL THEN (NEW.aout / NEW.cible) * 100 END;
    NEW.perf_septembre := CASE WHEN NEW.septembre IS NOT NULL THEN (NEW.septembre / NEW.cible) * 100 END;
    NEW.perf_octobre := CASE WHEN NEW.octobre IS NOT NULL THEN (NEW.octobre / NEW.cible) * 100 END;
    NEW.perf_novembre := CASE WHEN NEW.novembre IS NOT NULL THEN (NEW.novembre / NEW.cible) * 100 END;
    NEW.perf_decembre := CASE WHEN NEW.decembre IS NOT NULL THEN (NEW.decembre / NEW.cible) * 100 END;
  END IF;

  -- Calculer la performance annuelle
  IF NEW.value_annual IS NOT NULL AND NEW.cible IS NOT NULL AND NEW.cible > 0 THEN
    NEW.performances_pourcent := (NEW.value_annual / NEW.cible) * 100;
  END IF;

  -- Calculer la variation par rapport à l'année précédente
  IF NEW.value_annual IS NOT NULL AND NEW.valeur_precedente IS NOT NULL AND NEW.valeur_precedente > 0 THEN
    NEW.variations_pourcent := ((NEW.value_annual - NEW.valeur_precedente) / NEW.valeur_precedente) * 100;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- Trigger pour les calculs automatiques
CREATE TRIGGER trigger_calculate_consolidated_performances
  BEFORE INSERT OR UPDATE ON sites_consolidated_indicators
  FOR EACH ROW
  EXECUTE FUNCTION calculate_monthly_performances_consolidated();

-- Fonction pour consolider les données depuis site_global_indicator_values_simple
CREATE OR REPLACE FUNCTION consolidate_sites_data()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  affected_rows INTEGER;
BEGIN
  -- Vider la table de consolidation
  DELETE FROM sites_consolidated_indicators;
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  RAISE NOTICE 'Supprimé % lignes de sites_consolidated_indicators', affected_rows;

  -- Insérer les données consolidées
  INSERT INTO sites_consolidated_indicators (
    organization_name,
    filiere_name,
    filiale_name,
    site_name,
    indicator_code,
    indicator_name,
    indicator_description,
    axe_energetique,
    enjeux,
    normes,
    critere,
    processus_name,
    processus_code,
    frequence,
    unite,
    type,
    formule,
    year,
    value_annual,
    valeur_precedente,
    cible,
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
    decembre
  )
  SELECT 
    sgiv.organization_name,
    sgiv.filiere_name,
    sgiv.filiale_name,
    sgiv.site_name,
    sgiv.code as indicator_code,
    sgiv.indicateur as indicator_name,
    sgiv.definition as indicator_description,
    sgiv.axe_energetique,
    sgiv.enjeux,
    sgiv.normes,
    sgiv.critere,
    sgiv.processus as processus_name,
    sgiv.processus_code,
    sgiv.frequence,
    sgiv.unite,
    sgiv.type,
    sgiv.formule,
    sgiv.year,
    sgiv.value as value_annual,
    sgiv.valeur_precedente,
    sgiv.cible,
    sgiv.janvier,
    sgiv.fevrier,
    sgiv.mars,
    sgiv.avril,
    sgiv.mai,
    sgiv.juin,
    sgiv.juillet,
    sgiv.aout,
    sgiv.septembre,
    sgiv.octobre,
    sgiv.novembre,
    sgiv.decembre
  FROM site_global_indicator_values_simple sgiv
  WHERE sgiv.site_name IS NOT NULL
    AND sgiv.code IS NOT NULL
    AND sgiv.year IS NOT NULL
  ORDER BY 
    sgiv.organization_name,
    sgiv.filiere_name NULLS LAST,
    sgiv.filiale_name NULLS LAST,
    sgiv.site_name,
    sgiv.year DESC,
    sgiv.code;

  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  RAISE NOTICE 'Inséré % lignes dans sites_consolidated_indicators', affected_rows;

  -- Mettre à jour les valeurs précédentes
  UPDATE sites_consolidated_indicators sci
  SET valeur_precedente = prev_data.value_annual
  FROM (
    SELECT 
      organization_name,
      site_name,
      indicator_code,
      year,
      LAG(value_annual) OVER (
        PARTITION BY organization_name, site_name, indicator_code 
        ORDER BY year
      ) as prev_value
    FROM sites_consolidated_indicators
    WHERE value_annual IS NOT NULL
  ) prev_data
  WHERE sci.organization_name = prev_data.organization_name
    AND sci.site_name = prev_data.site_name
    AND sci.indicator_code = prev_data.indicator_code
    AND sci.year = prev_data.year
    AND prev_data.prev_value IS NOT NULL;

  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  RAISE NOTICE 'Mis à jour % valeurs précédentes', affected_rows;
END;
$$;

-- Fonction de trigger sécurisée pour la consolidation
CREATE OR REPLACE FUNCTION trigger_safe_consolidate_sites()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  consolidation_in_progress boolean;
BEGIN
  -- Vérifier si une consolidation est déjà en cours
  SELECT current_setting('app.consolidation_in_progress', true) = 'true' INTO consolidation_in_progress;
  
  IF consolidation_in_progress THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Marquer qu'une consolidation est en cours
  PERFORM set_config('app.consolidation_in_progress', 'true', true);

  -- Déterminer les paramètres selon l'opération
  DECLARE
    target_site_name text;
    target_indicator_code text;
    target_year integer;
    target_org_name text;
  BEGIN
    IF TG_OP = 'DELETE' THEN
      target_site_name := OLD.site_name;
      target_indicator_code := OLD.code;
      target_year := OLD.year;
      target_org_name := OLD.organization_name;
    ELSE
      target_site_name := NEW.site_name;
      target_indicator_code := NEW.code;
      target_year := NEW.year;
      target_org_name := NEW.organization_name;
    END IF;

    -- Supprimer l'enregistrement existant dans la consolidation
    DELETE FROM sites_consolidated_indicators 
    WHERE site_name = target_site_name 
      AND indicator_code = target_indicator_code 
      AND year = target_year
      AND organization_name = target_org_name;

    -- Recréer l'enregistrement si ce n'est pas une suppression
    IF TG_OP != 'DELETE' THEN
      INSERT INTO sites_consolidated_indicators (
        organization_name,
        filiere_name,
        filiale_name,
        site_name,
        indicator_code,
        indicator_name,
        indicator_description,
        axe_energetique,
        enjeux,
        normes,
        critere,
        processus_name,
        processus_code,
        frequence,
        unite,
        type,
        formule,
        year,
        value_annual,
        valeur_precedente,
        cible,
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
        decembre
      )
      SELECT 
        target_org_name,
        NEW.filiere_name,
        NEW.filiale_name,
        target_site_name,
        target_indicator_code,
        NEW.indicateur,
        NEW.definition,
        NEW.axe_energetique,
        NEW.enjeux,
        NEW.normes,
        NEW.critere,
        NEW.processus,
        NEW.processus_code,
        NEW.frequence,
        NEW.unite,
        NEW.type,
        NEW.formule,
        target_year,
        NEW.value,
        NEW.valeur_precedente,
        NEW.cible,
        NEW.janvier,
        NEW.fevrier,
        NEW.mars,
        NEW.avril,
        NEW.mai,
        NEW.juin,
        NEW.juillet,
        NEW.aout,
        NEW.septembre,
        NEW.octobre,
        NEW.novembre,
        NEW.decembre;
    END IF;

  EXCEPTION
    WHEN OTHERS THEN
      -- En cas d'erreur, nettoyer le flag et re-lever l'exception
      PERFORM set_config('app.consolidation_in_progress', 'false', true);
      RAISE;
  END;

  -- Nettoyer le flag de consolidation
  PERFORM set_config('app.consolidation_in_progress', 'false', true);

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Créer le trigger sur site_global_indicator_values_simple
CREATE TRIGGER trigger_consolidate_to_new_table
  AFTER INSERT OR UPDATE OR DELETE ON site_global_indicator_values_simple
  FOR EACH ROW
  EXECUTE FUNCTION trigger_safe_consolidate_sites();

-- Fonction pour la consolidation par filière
CREATE OR REPLACE FUNCTION consolidate_by_filiere()
RETURNS TABLE (
  organization_name text,
  filiere_name text,
  indicator_code text,
  indicator_name text,
  year integer,
  total_sites bigint,
  value_sum numeric,
  value_avg numeric,
  performance_avg numeric
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sci.organization_name,
    sci.filiere_name,
    sci.indicator_code,
    sci.indicator_name,
    sci.year,
    COUNT(DISTINCT sci.site_name) as total_sites,
    SUM(sci.value_annual) as value_sum,
    AVG(sci.value_annual) as value_avg,
    AVG(sci.performances_pourcent) as performance_avg
  FROM sites_consolidated_indicators sci
  WHERE sci.filiere_name IS NOT NULL
    AND sci.value_annual IS NOT NULL
  GROUP BY 
    sci.organization_name,
    sci.filiere_name,
    sci.indicator_code,
    sci.indicator_name,
    sci.year
  ORDER BY 
    sci.organization_name,
    sci.filiere_name,
    sci.year DESC,
    sci.indicator_code;
END;
$$;

-- Fonction pour la consolidation par filiale
CREATE OR REPLACE FUNCTION consolidate_by_filiale()
RETURNS TABLE (
  organization_name text,
  filiere_name text,
  filiale_name text,
  indicator_code text,
  indicator_name text,
  year integer,
  total_sites bigint,
  value_sum numeric,
  value_avg numeric,
  performance_avg numeric
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sci.organization_name,
    sci.filiere_name,
    sci.filiale_name,
    sci.indicator_code,
    sci.indicator_name,
    sci.year,
    COUNT(DISTINCT sci.site_name) as total_sites,
    SUM(sci.value_annual) as value_sum,
    AVG(sci.value_annual) as value_avg,
    AVG(sci.performances_pourcent) as performance_avg
  FROM sites_consolidated_indicators sci
  WHERE sci.filiale_name IS NOT NULL
    AND sci.value_annual IS NOT NULL
  GROUP BY 
    sci.organization_name,
    sci.filiere_name,
    sci.filiale_name,
    sci.indicator_code,
    sci.indicator_name,
    sci.year
  ORDER BY 
    sci.organization_name,
    sci.filiere_name,
    sci.filiale_name,
    sci.year DESC,
    sci.indicator_code;
END;
$$;

-- Fonction pour obtenir la performance globale d'un site
CREATE OR REPLACE FUNCTION get_site_global_performance(
  p_site_name text,
  p_year integer
)
RETURNS TABLE (
  site_name text,
  year integer,
  total_indicators bigint,
  avg_performance numeric,
  indicators_with_targets bigint,
  performance_status text
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p_site_name,
    p_year,
    COUNT(*) as total_indicators,
    AVG(sci.performances_pourcent) as avg_performance,
    COUNT(*) FILTER (WHERE sci.cible IS NOT NULL AND sci.cible > 0) as indicators_with_targets,
    CASE 
      WHEN AVG(sci.performances_pourcent) >= 80 THEN 'EXCELLENT'
      WHEN AVG(sci.performances_pourcent) >= 60 THEN 'BON'
      WHEN AVG(sci.performances_pourcent) >= 40 THEN 'MOYEN'
      ELSE 'FAIBLE'
    END as performance_status
  FROM sites_consolidated_indicators sci
  WHERE sci.site_name = p_site_name
    AND sci.year = p_year
    AND sci.performances_pourcent IS NOT NULL;
END;
$$;

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_sites_consolidated_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_sites_consolidated_updated_at
  BEFORE UPDATE ON sites_consolidated_indicators
  FOR EACH ROW
  EXECUTE FUNCTION update_sites_consolidated_updated_at();

-- Consolider toutes les données existantes
SELECT consolidate_sites_data();

-- Fonction pour vérifier l'intégrité des données consolidées
CREATE OR REPLACE FUNCTION check_consolidation_integrity()
RETURNS TABLE (
  check_name text,
  source_count bigint,
  consolidated_count bigint,
  status text
)
LANGUAGE plpgsql
AS $$
BEGIN
  -- Vérifier le nombre total d'enregistrements
  RETURN QUERY
  SELECT 
    'Total records' as check_name,
    (SELECT COUNT(*) FROM site_global_indicator_values_simple WHERE site_name IS NOT NULL) as source_count,
    (SELECT COUNT(*) FROM sites_consolidated_indicators) as consolidated_count,
    CASE 
      WHEN (SELECT COUNT(*) FROM site_global_indicator_values_simple WHERE site_name IS NOT NULL) = 
           (SELECT COUNT(*) FROM sites_consolidated_indicators) 
      THEN 'OK' 
      ELSE 'MISMATCH' 
    END as status;

  -- Vérifier les sites uniques
  RETURN QUERY
  SELECT 
    'Unique sites' as check_name,
    (SELECT COUNT(DISTINCT site_name) FROM site_global_indicator_values_simple WHERE site_name IS NOT NULL) as source_count,
    (SELECT COUNT(DISTINCT site_name) FROM sites_consolidated_indicators) as consolidated_count,
    CASE 
      WHEN (SELECT COUNT(DISTINCT site_name) FROM site_global_indicator_values_simple WHERE site_name IS NOT NULL) = 
           (SELECT COUNT(DISTINCT site_name) FROM sites_consolidated_indicators) 
      THEN 'OK' 
      ELSE 'MISMATCH' 
    END as status;

  -- Vérifier les indicateurs uniques
  RETURN QUERY
  SELECT 
    'Unique indicators' as check_name,
    (SELECT COUNT(DISTINCT code) FROM site_global_indicator_values_simple WHERE site_name IS NOT NULL) as source_count,
    (SELECT COUNT(DISTINCT indicator_code) FROM sites_consolidated_indicators) as consolidated_count,
    CASE 
      WHEN (SELECT COUNT(DISTINCT code) FROM site_global_indicator_values_simple WHERE site_name IS NOT NULL) = 
           (SELECT COUNT(DISTINCT indicator_code) FROM sites_consolidated_indicators) 
      THEN 'OK' 
      ELSE 'MISMATCH' 
    END as status;
END;
$$;

-- Vue pour faciliter les requêtes de consolidation hiérarchique
CREATE OR REPLACE VIEW sites_hierarchy_performance AS
SELECT 
  sci.organization_name,
  sci.filiere_name,
  sci.filiale_name,
  sci.site_name,
  sci.year,
  COUNT(DISTINCT sci.indicator_code) as total_indicators,
  AVG(sci.performances_pourcent) as avg_performance,
  SUM(sci.value_annual) as total_value,
  COUNT(*) FILTER (WHERE sci.performances_pourcent >= 80) as excellent_indicators,
  COUNT(*) FILTER (WHERE sci.performances_pourcent >= 60 AND sci.performances_pourcent < 80) as good_indicators,
  COUNT(*) FILTER (WHERE sci.performances_pourcent >= 40 AND sci.performances_pourcent < 60) as medium_indicators,
  COUNT(*) FILTER (WHERE sci.performances_pourcent < 40) as poor_indicators
FROM sites_consolidated_indicators sci
WHERE sci.performances_pourcent IS NOT NULL
GROUP BY 
  sci.organization_name,
  sci.filiere_name,
  sci.filiale_name,
  sci.site_name,
  sci.year
ORDER BY 
  sci.organization_name,
  sci.filiere_name NULLS LAST,
  sci.filiale_name NULLS LAST,
  sci.site_name,
  sci.year DESC;

-- Vérifier l'intégrité après consolidation
SELECT * FROM check_consolidation_integrity();

RAISE NOTICE 'Table sites_consolidated_indicators créée et peuplée avec succès';
RAISE NOTICE 'Utilisez "SELECT * FROM check_consolidation_integrity();" pour vérifier l''intégrité';
RAISE NOTICE 'Utilisez "SELECT * FROM sites_hierarchy_performance;" pour voir les performances hiérarchiques';