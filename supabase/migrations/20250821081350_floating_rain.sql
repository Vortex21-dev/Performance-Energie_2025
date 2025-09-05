/*
  # Triggers pour calculs automatiques des indicateurs

  1. Fonctions de calcul
    - Fonction pour calculer variations_pourcent et performances_pourcent
    - Fonction pour calculer les performances mensuelles
    - Fonction pour mettre à jour les valeurs dérivées

  2. Triggers
    - Trigger BEFORE INSERT/UPDATE pour calculer automatiquement les valeurs
    - Trigger pour synchroniser les performances mensuelles
    - Trigger pour assurer la cohérence des données

  3. Calculs automatiques
    - variations_pourcent = ((value - cible) / cible) * 100 si cible > 0
    - performances_pourcent = (value / cible) * 100 si cible > 0
    - Performances mensuelles basées sur les valeurs mensuelles et cibles
*/

-- Fonction pour calculer les variations et performances
CREATE OR REPLACE FUNCTION calculate_indicator_metrics()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculer variations_pourcent = ((value - cible) / cible) * 100
  IF NEW.cible IS NOT NULL AND NEW.cible > 0 AND NEW.value IS NOT NULL THEN
    NEW.variations_pourcent = ROUND(((NEW.value - NEW.cible) / NEW.cible) * 100, 2);
  ELSE
    NEW.variations_pourcent = NULL;
  END IF;

  -- Calculer performances_pourcent = (value / cible) * 100
  IF NEW.cible IS NOT NULL AND NEW.cible > 0 AND NEW.value IS NOT NULL THEN
    NEW.performances_pourcent = ROUND((NEW.value / NEW.cible) * 100, 2);
  ELSE
    NEW.performances_pourcent = NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour calculer les performances mensuelles
CREATE OR REPLACE FUNCTION calculate_monthly_performances()
RETURNS TRIGGER AS $$
DECLARE
  monthly_columns text[] := ARRAY['janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin', 'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre'];
  perf_columns text[] := ARRAY['perf_janvier', 'perf_fevrier', 'perf_mars', 'perf_avril', 'perf_mai', 'perf_juin', 'perf_juillet', 'perf_aout', 'perf_septembre', 'perf_octobre', 'perf_novembre', 'perf_decembre'];
  monthly_value numeric;
  i integer;
BEGIN
  -- Calculer les performances mensuelles si une cible est définie
  IF NEW.cible IS NOT NULL AND NEW.cible > 0 THEN
    FOR i IN 1..12 LOOP
      -- Récupérer la valeur mensuelle
      EXECUTE format('SELECT ($1).%I', monthly_columns[i]) INTO monthly_value USING NEW;
      
      -- Calculer la performance mensuelle
      IF monthly_value IS NOT NULL THEN
        EXECUTE format('SELECT $1') INTO monthly_value USING ROUND((monthly_value / NEW.cible) * 100, 2);
        -- Assigner la valeur calculée
        EXECUTE format('SELECT ($1).%I = $2', perf_columns[i]) USING NEW, monthly_value;
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fonction simplifiée pour les performances mensuelles
CREATE OR REPLACE FUNCTION update_monthly_performances_simple()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculer perf_janvier
  IF NEW.cible IS NOT NULL AND NEW.cible > 0 AND NEW.janvier IS NOT NULL THEN
    NEW.perf_janvier = ROUND((NEW.janvier / NEW.cible) * 100, 2);
  END IF;

  -- Calculer perf_fevrier
  IF NEW.cible IS NOT NULL AND NEW.cible > 0 AND NEW.fevrier IS NOT NULL THEN
    NEW.perf_fevrier = ROUND((NEW.fevrier / NEW.cible) * 100, 2);
  END IF;

  -- Calculer perf_mars
  IF NEW.cible IS NOT NULL AND NEW.cible > 0 AND NEW.mars IS NOT NULL THEN
    NEW.perf_mars = ROUND((NEW.mars / NEW.cible) * 100, 2);
  END IF;

  -- Calculer perf_avril
  IF NEW.cible IS NOT NULL AND NEW.cible > 0 AND NEW.avril IS NOT NULL THEN
    NEW.perf_avril = ROUND((NEW.avril / NEW.cible) * 100, 2);
  END IF;

  -- Calculer perf_mai
  IF NEW.cible IS NOT NULL AND NEW.cible > 0 AND NEW.mai IS NOT NULL THEN
    NEW.perf_mai = ROUND((NEW.mai / NEW.cible) * 100, 2);
  END IF;

  -- Calculer perf_juin
  IF NEW.cible IS NOT NULL AND NEW.cible > 0 AND NEW.juin IS NOT NULL THEN
    NEW.perf_juin = ROUND((NEW.juin / NEW.cible) * 100, 2);
  END IF;

  -- Calculer perf_juillet
  IF NEW.cible IS NOT NULL AND NEW.cible > 0 AND NEW.juillet IS NOT NULL THEN
    NEW.perf_juillet = ROUND((NEW.juillet / NEW.cible) * 100, 2);
  END IF;

  -- Calculer perf_aout
  IF NEW.cible IS NOT NULL AND NEW.cible > 0 AND NEW.aout IS NOT NULL THEN
    NEW.perf_aout = ROUND((NEW.aout / NEW.cible) * 100, 2);
  END IF;

  -- Calculer perf_septembre
  IF NEW.cible IS NOT NULL AND NEW.cible > 0 AND NEW.septembre IS NOT NULL THEN
    NEW.perf_septembre = ROUND((NEW.septembre / NEW.cible) * 100, 2);
  END IF;

  -- Calculer perf_octobre
  IF NEW.cible IS NOT NULL AND NEW.cible > 0 AND NEW.octobre IS NOT NULL THEN
    NEW.perf_octobre = ROUND((NEW.octobre / NEW.cible) * 100, 2);
  END IF;

  -- Calculer perf_novembre
  IF NEW.cible IS NOT NULL AND NEW.cible > 0 AND NEW.novembre IS NOT NULL THEN
    NEW.perf_novembre = ROUND((NEW.novembre / NEW.cible) * 100, 2);
  END IF;

  -- Calculer perf_decembre
  IF NEW.cible IS NOT NULL AND NEW.cible > 0 AND NEW.decembre IS NOT NULL THEN
    NEW.perf_decembre = ROUND((NEW.decembre / NEW.cible) * 100, 2);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Supprimer les anciens triggers s'ils existent
DROP TRIGGER IF EXISTS trigger_calculate_indicator_metrics ON site_global_indicator_values_simple;
DROP TRIGGER IF EXISTS trigger_calculate_monthly_performances ON site_global_indicator_values_simple;

-- Créer les nouveaux triggers
CREATE TRIGGER trigger_calculate_indicator_metrics
  BEFORE INSERT OR UPDATE OF value, cible ON site_global_indicator_values_simple
  FOR EACH ROW
  EXECUTE FUNCTION calculate_indicator_metrics();

CREATE TRIGGER trigger_calculate_monthly_performances
  BEFORE INSERT OR UPDATE OF janvier, fevrier, mars, avril, mai, juin, juillet, aout, septembre, octobre, novembre, decembre, cible ON site_global_indicator_values_simple
  FOR EACH ROW
  EXECUTE FUNCTION update_monthly_performances_simple();

-- Mettre à jour les enregistrements existants
UPDATE site_global_indicator_values_simple 
SET 
  variations_pourcent = CASE 
    WHEN cible IS NOT NULL AND cible > 0 AND value IS NOT NULL 
    THEN ROUND(((value - cible) / cible) * 100, 2)
    ELSE NULL 
  END,
  performances_pourcent = CASE 
    WHEN cible IS NOT NULL AND cible > 0 AND value IS NOT NULL 
    THEN ROUND((value / cible) * 100, 2)
    ELSE NULL 
  END,
  perf_janvier = CASE 
    WHEN cible IS NOT NULL AND cible > 0 AND janvier IS NOT NULL 
    THEN ROUND((janvier / cible) * 100, 2)
    ELSE NULL 
  END,
  perf_fevrier = CASE 
    WHEN cible IS NOT NULL AND cible > 0 AND fevrier IS NOT NULL 
    THEN ROUND((fevrier / cible) * 100, 2)
    ELSE NULL 
  END,
  perf_mars = CASE 
    WHEN cible IS NOT NULL AND cible > 0 AND mars IS NOT NULL 
    THEN ROUND((mars / cible) * 100, 2)
    ELSE NULL 
  END,
  perf_avril = CASE 
    WHEN cible IS NOT NULL AND cible > 0 AND avril IS NOT NULL 
    THEN ROUND((avril / cible) * 100, 2)
    ELSE NULL 
  END,
  perf_mai = CASE 
    WHEN cible IS NOT NULL AND cible > 0 AND mai IS NOT NULL 
    THEN ROUND((mai / cible) * 100, 2)
    ELSE NULL 
  END,
  perf_juin = CASE 
    WHEN cible IS NOT NULL AND cible > 0 AND juin IS NOT NULL 
    THEN ROUND((juin / cible) * 100, 2)
    ELSE NULL 
  END,
  perf_juillet = CASE 
    WHEN cible IS NOT NULL AND cible > 0 AND juillet IS NOT NULL 
    THEN ROUND((juillet / cible) * 100, 2)
    ELSE NULL 
  END,
  perf_aout = CASE 
    WHEN cible IS NOT NULL AND cible > 0 AND aout IS NOT NULL 
    THEN ROUND((aout / cible) * 100, 2)
    ELSE NULL 
  END,
  perf_septembre = CASE 
    WHEN cible IS NOT NULL AND cible > 0 AND septembre IS NOT NULL 
    THEN ROUND((septembre / cible) * 100, 2)
    ELSE NULL 
  END,
  perf_octobre = CASE 
    WHEN cible IS NOT NULL AND cible > 0 AND octobre IS NOT NULL 
    THEN ROUND((octobre / cible) * 100, 2)
    ELSE NULL 
  END,
  perf_novembre = CASE 
    WHEN cible IS NOT NULL AND cible > 0 AND novembre IS NOT NULL 
    THEN ROUND((novembre / cible) * 100, 2)
    ELSE NULL 
  END,
  perf_decembre = CASE 
    WHEN cible IS NOT NULL AND cible > 0 AND decembre IS NOT NULL 
    THEN ROUND((decembre / cible) * 100, 2)
    ELSE NULL 
  END
WHERE variations_pourcent IS NULL OR performances_pourcent IS NULL 
   OR perf_janvier IS NULL OR perf_fevrier IS NULL OR perf_mars IS NULL 
   OR perf_avril IS NULL OR perf_mai IS NULL OR perf_juin IS NULL 
   OR perf_juillet IS NULL OR perf_aout IS NULL OR perf_septembre IS NULL 
   OR perf_octobre IS NULL OR perf_novembre IS NULL OR perf_decembre IS NULL;