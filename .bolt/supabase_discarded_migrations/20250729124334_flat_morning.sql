/*
  # Automatisation complète du peuplement de site_global_indicator_values_simple

  1. Fonctions
    - `create_complete_site_indicator_entry()` - Crée une ligne complète avec toutes les informations
    - `sync_all_site_indicators()` - Synchronise toutes les données existantes
    - `update_site_indicator_values()` - Met à jour les valeurs depuis indicator_measurements

  2. Triggers
    - Auto-création lors de l'ajout d'un processus à un site
    - Synchronisation des valeurs depuis indicator_measurements

  3. Peuplement initial
    - Création de toutes les lignes pour les combinaisons existantes
    - Synchronisation des valeurs et calculs de performance
*/

-- Fonction pour créer une entrée complète dans site_global_indicator_values_simple
CREATE OR REPLACE FUNCTION create_complete_site_indicator_entry(
  p_site_name TEXT,
  p_indicator_code TEXT,
  p_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER
)
RETURNS VOID AS $$
DECLARE
  indicator_info RECORD;
  site_info RECORD;
  processus_info RECORD;
BEGIN
  -- Récupérer les informations de l'indicateur
  SELECT 
    i.code,
    i.name,
    i.description,
    i.unit,
    i.type,
    i.formule,
    i.frequence,
    i.axe_energetique,
    i.enjeux,
    i.normes,
    i.critere,
    i.processus_code,
    p.name as processus_name
  INTO indicator_info
  FROM indicators i
  LEFT JOIN processus p ON i.processus_code = p.code
  WHERE i.code = p_indicator_code;

  IF NOT FOUND THEN
    RAISE NOTICE 'Indicateur % non trouvé', p_indicator_code;
    RETURN;
  END IF;

  -- Récupérer les informations du site
  SELECT 
    s.name,
    s.organization_name,
    s.filiere_name,
    s.filiale_name
  INTO site_info
  FROM sites s
  WHERE s.name = p_site_name;

  IF NOT FOUND THEN
    RAISE NOTICE 'Site % non trouvé', p_site_name;
    RETURN;
  END IF;

  -- Vérifier que le processus est bien lié au site
  IF NOT EXISTS (
    SELECT 1 FROM site_processes sp 
    WHERE sp.site_name = p_site_name 
    AND sp.processus_code = indicator_info.processus_code
    AND sp.is_active = true
  ) THEN
    RAISE NOTICE 'Processus % non lié au site %', indicator_info.processus_code, p_site_name;
    RETURN;
  END IF;

  -- Insérer ou mettre à jour l'entrée complète
  INSERT INTO site_global_indicator_values_simple (
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
    organization_name,
    filiere_name,
    filiale_name,
    value,
    valeur_precedente,
    cible,
    variation,
    janvier, fevrier, mars, avril, mai, juin,
    juillet, aout, septembre, octobre, novembre, decembre,
    variations_pourcent,
    performances_pourcent,
    perf_janvier, perf_fevrier, perf_mars, perf_avril, perf_mai, perf_juin,
    perf_juillet, perf_aout, perf_septembre, perf_octobre, perf_novembre, perf_decembre,
    created_at,
    updated_at
  )
  VALUES (
    p_site_name,
    p_year,
    indicator_info.code,
    indicator_info.axe_energetique,
    indicator_info.enjeux,
    indicator_info.normes,
    indicator_info.critere,
    indicator_info.name,
    indicator_info.description,
    indicator_info.processus_name,
    indicator_info.processus_code,
    indicator_info.frequence,
    indicator_info.unit,
    indicator_info.type,
    indicator_info.formule,
    site_info.organization_name,
    site_info.filiere_name,
    site_info.filiale_name,
    NULL, -- value - sera mis à jour par sync
    NULL, -- valeur_precedente
    NULL, -- cible
    NULL, -- variation
    NULL, NULL, NULL, NULL, NULL, NULL, -- mois
    NULL, NULL, NULL, NULL, NULL, NULL,
    NULL, -- variations_pourcent
    NULL, -- performances_pourcent
    NULL, NULL, NULL, NULL, NULL, NULL, -- perf mois
    NULL, NULL, NULL, NULL, NULL, NULL,
    NOW(),
    NOW()
  )
  ON CONFLICT (site_name, code, year) 
  DO UPDATE SET
    axe_energetique = EXCLUDED.axe_energetique,
    enjeux = EXCLUDED.enjeux,
    normes = EXCLUDED.normes,
    critere = EXCLUDED.critere,
    indicateur = EXCLUDED.indicateur,
    definition = EXCLUDED.definition,
    processus = EXCLUDED.processus,
    processus_code = EXCLUDED.processus_code,
    frequence = EXCLUDED.frequence,
    unite = EXCLUDED.unite,
    type = EXCLUDED.type,
    formule = EXCLUDED.formule,
    organization_name = EXCLUDED.organization_name,
    filiere_name = EXCLUDED.filiere_name,
    filiale_name = EXCLUDED.filiale_name,
    updated_at = NOW();

  RAISE NOTICE 'Entrée créée/mise à jour pour indicateur % sur site %', p_indicator_code, p_site_name;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour synchroniser les valeurs depuis indicator_measurements
CREATE OR REPLACE FUNCTION update_site_indicator_values(
  p_site_name TEXT,
  p_indicator_code TEXT,
  p_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER
)
RETURNS VOID AS $$
DECLARE
  current_value NUMERIC;
  previous_value NUMERIC;
  monthly_values RECORD;
BEGIN
  -- Récupérer la valeur annuelle actuelle
  SELECT COALESCE(SUM(im.value), 0) INTO current_value
  FROM indicator_measurements im
  JOIN collection_periods cp ON im.period_id = cp.id
  WHERE im.indicator_code = p_indicator_code
    AND im.site_name = p_site_name
    AND cp.year = p_year
    AND cp.period_type = 'year';

  -- Récupérer la valeur de l'année précédente
  SELECT COALESCE(SUM(im.value), 0) INTO previous_value
  FROM indicator_measurements im
  JOIN collection_periods cp ON im.period_id = cp.id
  WHERE im.indicator_code = p_indicator_code
    AND im.site_name = p_site_name
    AND cp.year = p_year - 1
    AND cp.period_type = 'year';

  -- Récupérer les valeurs mensuelles
  SELECT 
    COALESCE(SUM(CASE WHEN cp.period_number = 1 THEN im.value END), 0) as jan_val,
    COALESCE(SUM(CASE WHEN cp.period_number = 2 THEN im.value END), 0) as feb_val,
    COALESCE(SUM(CASE WHEN cp.period_number = 3 THEN im.value END), 0) as mar_val,
    COALESCE(SUM(CASE WHEN cp.period_number = 4 THEN im.value END), 0) as apr_val,
    COALESCE(SUM(CASE WHEN cp.period_number = 5 THEN im.value END), 0) as may_val,
    COALESCE(SUM(CASE WHEN cp.period_number = 6 THEN im.value END), 0) as jun_val,
    COALESCE(SUM(CASE WHEN cp.period_number = 7 THEN im.value END), 0) as jul_val,
    COALESCE(SUM(CASE WHEN cp.period_number = 8 THEN im.value END), 0) as aug_val,
    COALESCE(SUM(CASE WHEN cp.period_number = 9 THEN im.value END), 0) as sep_val,
    COALESCE(SUM(CASE WHEN cp.period_number = 10 THEN im.value END), 0) as oct_val,
    COALESCE(SUM(CASE WHEN cp.period_number = 11 THEN im.value END), 0) as nov_val,
    COALESCE(SUM(CASE WHEN cp.period_number = 12 THEN im.value END), 0) as dec_val
  INTO monthly_values
  FROM indicator_measurements im
  JOIN collection_periods cp ON im.period_id = cp.id
  WHERE im.indicator_code = p_indicator_code
    AND im.site_name = p_site_name
    AND cp.year = p_year
    AND cp.period_type = 'month';

  -- Mettre à jour la table site_global_indicator_values_simple
  UPDATE site_global_indicator_values_simple
  SET 
    value = NULLIF(current_value, 0),
    valeur_precedente = NULLIF(previous_value, 0),
    variation = CASE 
      WHEN previous_value > 0 AND current_value > 0 
      THEN ROUND(((current_value - previous_value) / previous_value * 100)::NUMERIC, 2)::TEXT || '%'
      ELSE NULL 
    END,
    janvier = NULLIF(monthly_values.jan_val, 0),
    fevrier = NULLIF(monthly_values.feb_val, 0),
    mars = NULLIF(monthly_values.mar_val, 0),
    avril = NULLIF(monthly_values.apr_val, 0),
    mai = NULLIF(monthly_values.may_val, 0),
    juin = NULLIF(monthly_values.jun_val, 0),
    juillet = NULLIF(monthly_values.jul_val, 0),
    aout = NULLIF(monthly_values.aug_val, 0),
    septembre = NULLIF(monthly_values.sep_val, 0),
    octobre = NULLIF(monthly_values.oct_val, 0),
    novembre = NULLIF(monthly_values.nov_val, 0),
    decembre = NULLIF(monthly_values.dec_val, 0),
    variations_pourcent = CASE 
      WHEN previous_value > 0 AND current_value > 0 
      THEN ROUND(((current_value - previous_value) / previous_value * 100)::NUMERIC, 2)
      ELSE NULL 
    END,
    updated_at = NOW()
  WHERE site_name = p_site_name 
    AND code = p_indicator_code 
    AND year = p_year;

END;
$$ LANGUAGE plpgsql;

-- Fonction pour synchroniser tous les indicateurs d'un site
CREATE OR REPLACE FUNCTION sync_all_site_indicators()
RETURNS VOID AS $$
DECLARE
  site_process_rec RECORD;
  indicator_rec RECORD;
  current_year INTEGER := EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;
BEGIN
  -- Pour chaque combinaison site-processus active
  FOR site_process_rec IN 
    SELECT DISTINCT sp.site_name, sp.processus_code, sp.organization_name
    FROM site_processes sp
    WHERE sp.is_active = true
  LOOP
    -- Pour chaque indicateur de ce processus
    FOR indicator_rec IN
      SELECT i.code
      FROM indicators i
      WHERE i.processus_code = site_process_rec.processus_code
    LOOP
      -- Créer l'entrée complète
      PERFORM create_complete_site_indicator_entry(
        site_process_rec.site_name,
        indicator_rec.code,
        current_year
      );
      
      -- Synchroniser les valeurs
      PERFORM update_site_indicator_values(
        site_process_rec.site_name,
        indicator_rec.code,
        current_year
      );
      
      -- Créer aussi pour l'année précédente si des données existent
      IF EXISTS (
        SELECT 1 FROM indicator_measurements im
        JOIN collection_periods cp ON im.period_id = cp.id
        WHERE im.indicator_code = indicator_rec.code
          AND im.site_name = site_process_rec.site_name
          AND cp.year = current_year - 1
      ) THEN
        PERFORM create_complete_site_indicator_entry(
          site_process_rec.site_name,
          indicator_rec.code,
          current_year - 1
        );
        
        PERFORM update_site_indicator_values(
          site_process_rec.site_name,
          indicator_rec.code,
          current_year - 1
        );
      END IF;
    END LOOP;
  END LOOP;
  
  RAISE NOTICE 'Synchronisation complète terminée';
END;
$$ LANGUAGE plpgsql;

-- Trigger pour auto-création lors de l'ajout d'un processus à un site
CREATE OR REPLACE FUNCTION trigger_create_site_indicators()
RETURNS TRIGGER AS $$
DECLARE
  indicator_rec RECORD;
  current_year INTEGER := EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;
BEGIN
  -- Si un processus est ajouté à un site (INSERT ou UPDATE vers is_active = true)
  IF (TG_OP = 'INSERT' AND NEW.is_active = true) OR 
     (TG_OP = 'UPDATE' AND OLD.is_active = false AND NEW.is_active = true) THEN
    
    -- Créer une entrée pour chaque indicateur de ce processus
    FOR indicator_rec IN
      SELECT i.code
      FROM indicators i
      WHERE i.processus_code = NEW.processus_code
    LOOP
      -- Créer l'entrée complète
      PERFORM create_complete_site_indicator_entry(
        NEW.site_name,
        indicator_rec.code,
        current_year
      );
      
      -- Synchroniser les valeurs
      PERFORM update_site_indicator_values(
        NEW.site_name,
        indicator_rec.code,
        current_year
      );
    END LOOP;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger pour synchronisation des valeurs depuis indicator_measurements
CREATE OR REPLACE FUNCTION trigger_sync_indicator_values()
RETURNS TRIGGER AS $$
DECLARE
  period_info RECORD;
BEGIN
  -- Récupérer les informations de la période
  SELECT cp.year, cp.period_type
  INTO period_info
  FROM collection_periods cp
  WHERE cp.id = COALESCE(NEW.period_id, OLD.period_id);
  
  IF FOUND THEN
    -- Synchroniser les valeurs pour cet indicateur et ce site
    PERFORM update_site_indicator_values(
      COALESCE(NEW.site_name, OLD.site_name),
      COALESCE(NEW.indicator_code, OLD.indicator_code),
      period_info.year
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Supprimer les anciens triggers s'ils existent
DROP TRIGGER IF EXISTS trigger_site_processes_indicators ON site_processes;
DROP TRIGGER IF EXISTS trigger_indicator_measurements_sync ON indicator_measurements;

-- Créer les nouveaux triggers
CREATE TRIGGER trigger_site_processes_indicators
  AFTER INSERT OR UPDATE ON site_processes
  FOR EACH ROW
  EXECUTE FUNCTION trigger_create_site_indicators();

CREATE TRIGGER trigger_indicator_measurements_sync
  AFTER INSERT OR UPDATE OR DELETE ON indicator_measurements
  FOR EACH ROW
  EXECUTE FUNCTION trigger_sync_indicator_values();

-- Peupler toutes les données existantes
SELECT sync_all_site_indicators();

-- Mettre à jour les triggers de performance si ils existent
DO $$
BEGIN
  -- Recalculer les performances pour toutes les entrées
  UPDATE site_global_indicator_values_simple
  SET updated_at = NOW()
  WHERE id IS NOT NULL;
  
  RAISE NOTICE 'Données actualisées avec succès';
END $$;