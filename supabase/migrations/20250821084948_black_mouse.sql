/*
  # Auto-populate all columns in site_global_indicator_values_simple

  1. Functions
    - `auto_update_indicator_metadata()` - Remplit automatiquement toutes les colonnes métadonnées
    - `calculate_indicator_metrics()` - Calcule les métriques de performance
    - `update_monthly_performances_simple()` - Calcule les performances mensuelles

  2. Triggers
    - Déclenchement automatique sur INSERT/UPDATE
    - Remplissage de toutes les colonnes manquantes

  3. Data Update
    - Mise à jour de toutes les lignes existantes
    - Application des calculs sur l'ensemble de la table
*/

-- Function to auto-populate indicator metadata
CREATE OR REPLACE FUNCTION auto_update_indicator_metadata()
RETURNS TRIGGER AS $$
BEGIN
  -- Get indicator metadata from indicators table
  SELECT 
    i.axe_energetique,
    i.enjeux,
    i.normes,
    i.critere,
    i.name as indicateur,
    i.description as definition,
    p.name as processus,
    i.processus_code,
    i.frequence,
    i.unit as unite,
    i.type,
    i.formule
  INTO 
    NEW.axe_energetique,
    NEW.enjeux,
    NEW.normes,
    NEW.critere,
    NEW.indicateur,
    NEW.definition,
    NEW.processus,
    NEW.processus_code,
    NEW.frequence,
    NEW.unite,
    NEW.type,
    NEW.formule
  FROM indicators i
  LEFT JOIN processus p ON i.processus_code = p.code
  WHERE i.code = NEW.code;

  -- If no metadata found, set default values
  IF NEW.axe_energetique IS NULL THEN
    NEW.axe_energetique := 'Non défini';
  END IF;
  
  IF NEW.enjeux IS NULL THEN
    NEW.enjeux := 'Non défini';
  END IF;
  
  IF NEW.normes IS NULL THEN
    NEW.normes := 'Non défini';
  END IF;
  
  IF NEW.critere IS NULL THEN
    NEW.critere := 'Non défini';
  END IF;
  
  IF NEW.indicateur IS NULL THEN
    NEW.indicateur := 'Indicateur ' || NEW.code;
  END IF;
  
  IF NEW.definition IS NULL THEN
    NEW.definition := 'Définition non disponible';
  END IF;
  
  IF NEW.processus IS NULL THEN
    NEW.processus := 'Processus non défini';
  END IF;
  
  IF NEW.processus_code IS NULL THEN
    NEW.processus_code := 'PROC-000';
  END IF;
  
  IF NEW.frequence IS NULL THEN
    NEW.frequence := 'Mensuelle';
  END IF;
  
  IF NEW.unite IS NULL THEN
    NEW.unite := 'Unité';
  END IF;
  
  IF NEW.type IS NULL THEN
    NEW.type := 'Performance';
  END IF;
  
  IF NEW.formule IS NULL THEN
    NEW.formule := 'Formule non définie';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate indicator metrics
CREATE OR REPLACE FUNCTION calculate_indicator_metrics()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate variations_pourcent = ((value - cible) / cible) * 100
  IF NEW.value IS NOT NULL AND NEW.cible IS NOT NULL AND NEW.cible != 0 THEN
    NEW.variations_pourcent := ROUND(((NEW.value - NEW.cible) / NEW.cible) * 100, 2);
  ELSE
    NEW.variations_pourcent := NULL;
  END IF;

  -- Calculate performances_pourcent = (value / cible) * 100
  IF NEW.value IS NOT NULL AND NEW.cible IS NOT NULL AND NEW.cible != 0 THEN
    NEW.performances_pourcent := ROUND((NEW.value / NEW.cible) * 100, 2);
  ELSE
    NEW.performances_pourcent := NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate monthly performances
CREATE OR REPLACE FUNCTION update_monthly_performances_simple()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate monthly performances as (monthly_value / cible) * 100
  IF NEW.cible IS NOT NULL AND NEW.cible != 0 THEN
    -- Calculate performance for each month
    NEW.perf_janvier := CASE 
      WHEN NEW.janvier IS NOT NULL THEN ROUND((NEW.janvier / NEW.cible) * 100, 2)
      ELSE NULL 
    END;
    
    NEW.perf_fevrier := CASE 
      WHEN NEW.fevrier IS NOT NULL THEN ROUND((NEW.fevrier / NEW.cible) * 100, 2)
      ELSE NULL 
    END;
    
    NEW.perf_mars := CASE 
      WHEN NEW.mars IS NOT NULL THEN ROUND((NEW.mars / NEW.cible) * 100, 2)
      ELSE NULL 
    END;
    
    NEW.perf_avril := CASE 
      WHEN NEW.avril IS NOT NULL THEN ROUND((NEW.avril / NEW.cible) * 100, 2)
      ELSE NULL 
    END;
    
    NEW.perf_mai := CASE 
      WHEN NEW.mai IS NOT NULL THEN ROUND((NEW.mai / NEW.cible) * 100, 2)
      ELSE NULL 
    END;
    
    NEW.perf_juin := CASE 
      WHEN NEW.juin IS NOT NULL THEN ROUND((NEW.juin / NEW.cible) * 100, 2)
      ELSE NULL 
    END;
    
    NEW.perf_juillet := CASE 
      WHEN NEW.juillet IS NOT NULL THEN ROUND((NEW.juillet / NEW.cible) * 100, 2)
      ELSE NULL 
    END;
    
    NEW.perf_aout := CASE 
      WHEN NEW.aout IS NOT NULL THEN ROUND((NEW.aout / NEW.cible) * 100, 2)
      ELSE NULL 
    END;
    
    NEW.perf_septembre := CASE 
      WHEN NEW.septembre IS NOT NULL THEN ROUND((NEW.septembre / NEW.cible) * 100, 2)
      ELSE NULL 
    END;
    
    NEW.perf_octobre := CASE 
      WHEN NEW.octobre IS NOT NULL THEN ROUND((NEW.octobre / NEW.cible) * 100, 2)
      ELSE NULL 
    END;
    
    NEW.perf_novembre := CASE 
      WHEN NEW.novembre IS NOT NULL THEN ROUND((NEW.novembre / NEW.cible) * 100, 2)
      ELSE NULL 
    END;
    
    NEW.perf_decembre := CASE 
      WHEN NEW.decembre IS NOT NULL THEN ROUND((NEW.decembre / NEW.cible) * 100, 2)
      ELSE NULL 
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_auto_update_indicator_metadata ON site_global_indicator_values_simple;
CREATE TRIGGER trigger_auto_update_indicator_metadata
  BEFORE INSERT OR UPDATE ON site_global_indicator_values_simple
  FOR EACH ROW
  EXECUTE FUNCTION auto_update_indicator_metadata();

DROP TRIGGER IF EXISTS trigger_calculate_indicator_metrics ON site_global_indicator_values_simple;
CREATE TRIGGER trigger_calculate_indicator_metrics
  BEFORE INSERT OR UPDATE OF value, cible ON site_global_indicator_values_simple
  FOR EACH ROW
  EXECUTE FUNCTION calculate_indicator_metrics();

DROP TRIGGER IF EXISTS trigger_calculate_monthly_performances ON site_global_indicator_values_simple;
CREATE TRIGGER trigger_calculate_monthly_performances
  BEFORE INSERT OR UPDATE OF janvier, fevrier, mars, avril, mai, juin, juillet, aout, septembre, octobre, novembre, decembre, cible ON site_global_indicator_values_simple
  FOR EACH ROW
  EXECUTE FUNCTION update_monthly_performances_simple();

-- Update all existing rows to populate missing data
UPDATE site_global_indicator_values_simple 
SET 
  -- Force trigger execution by updating a timestamp field
  updated_at = NOW()
WHERE 
  axe_energetique IS NULL 
  OR enjeux IS NULL 
  OR normes IS NULL 
  OR critere IS NULL 
  OR indicateur IS NULL 
  OR definition IS NULL 
  OR processus IS NULL 
  OR processus_code IS NULL 
  OR frequence IS NULL 
  OR unite IS NULL 
  OR type IS NULL 
  OR formule IS NULL
  OR variations_pourcent IS NULL 
  OR performances_pourcent IS NULL;

-- Update monthly performances for existing rows
UPDATE site_global_indicator_values_simple 
SET updated_at = NOW()
WHERE 
  cible IS NOT NULL 
  AND cible != 0 
  AND (
    (janvier IS NOT NULL AND perf_janvier IS NULL) OR
    (fevrier IS NOT NULL AND perf_fevrier IS NULL) OR
    (mars IS NOT NULL AND perf_mars IS NULL) OR
    (avril IS NOT NULL AND perf_avril IS NULL) OR
    (mai IS NOT NULL AND perf_mai IS NULL) OR
    (juin IS NOT NULL AND perf_juin IS NULL) OR
    (juillet IS NOT NULL AND perf_juillet IS NULL) OR
    (aout IS NOT NULL AND perf_aout IS NULL) OR
    (septembre IS NOT NULL AND perf_septembre IS NULL) OR
    (octobre IS NOT NULL AND perf_octobre IS NULL) OR
    (novembre IS NOT NULL AND perf_novembre IS NULL) OR
    (decembre IS NOT NULL AND perf_decembre IS NULL)
  );