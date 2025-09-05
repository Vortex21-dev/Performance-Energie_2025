/*
  # Mise à jour des triggers pour calculs automatiques lors des insertions

  1. Fonctions mises à jour
    - `calculate_indicator_metrics()` : calcule variations_pourcent et performances_pourcent
    - `update_monthly_performances_simple()` : calcule les performances mensuelles
    - `auto_update_indicator_metadata()` : remplit les métadonnées automatiquement

  2. Triggers
    - Trigger pour calculs automatiques lors INSERT/UPDATE
    - Trigger pour métadonnées automatiques lors INSERT/UPDATE
    - Trigger pour performances mensuelles lors INSERT/UPDATE

  3. Mise à jour
    - Recalcul de toutes les données existantes
    - Application des nouvelles formules
*/

-- Fonction pour calculer les métriques d'indicateur (variations et performances)
CREATE OR REPLACE FUNCTION calculate_indicator_metrics()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculer variations_pourcent = value - cible
  IF NEW.value IS NOT NULL AND NEW.cible IS NOT NULL THEN
    NEW.variations_pourcent = NEW.value - NEW.cible;
  ELSE
    NEW.variations_pourcent = NULL;
  END IF;
  
  -- Calculer performances_pourcent = (value / cible) * 100
  IF NEW.value IS NOT NULL AND NEW.cible IS NOT NULL AND NEW.cible != 0 THEN
    NEW.performances_pourcent = (NEW.value / NEW.cible) * 100;
  ELSE
    NEW.performances_pourcent = NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour calculer les performances mensuelles
CREATE OR REPLACE FUNCTION update_monthly_performances_simple()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculer les performances mensuelles = (valeur_mensuelle / cible) * 100
  IF NEW.cible IS NOT NULL AND NEW.cible != 0 THEN
    NEW.perf_janvier = CASE WHEN NEW.janvier IS NOT NULL THEN (NEW.janvier / NEW.cible) * 100 ELSE NULL END;
    NEW.perf_fevrier = CASE WHEN NEW.fevrier IS NOT NULL THEN (NEW.fevrier / NEW.cible) * 100 ELSE NULL END;
    NEW.perf_mars = CASE WHEN NEW.mars IS NOT NULL THEN (NEW.mars / NEW.cible) * 100 ELSE NULL END;
    NEW.perf_avril = CASE WHEN NEW.avril IS NOT NULL THEN (NEW.avril / NEW.cible) * 100 ELSE NULL END;
    NEW.perf_mai = CASE WHEN NEW.mai IS NOT NULL THEN (NEW.mai / NEW.cible) * 100 ELSE NULL END;
    NEW.perf_juin = CASE WHEN NEW.juin IS NOT NULL THEN (NEW.juin / NEW.cible) * 100 ELSE NULL END;
    NEW.perf_juillet = CASE WHEN NEW.juillet IS NOT NULL THEN (NEW.juillet / NEW.cible) * 100 ELSE NULL END;
    NEW.perf_aout = CASE WHEN NEW.aout IS NOT NULL THEN (NEW.aout / NEW.cible) * 100 ELSE NULL END;
    NEW.perf_septembre = CASE WHEN NEW.septembre IS NOT NULL THEN (NEW.septembre / NEW.cible) * 100 ELSE NULL END;
    NEW.perf_octobre = CASE WHEN NEW.octobre IS NOT NULL THEN (NEW.octobre / NEW.cible) * 100 ELSE NULL END;
    NEW.perf_novembre = CASE WHEN NEW.novembre IS NOT NULL THEN (NEW.novembre / NEW.cible) * 100 ELSE NULL END;
    NEW.perf_decembre = CASE WHEN NEW.decembre IS NOT NULL THEN (NEW.decembre / NEW.cible) * 100 ELSE NULL END;
  ELSE
    NEW.perf_janvier = NULL;
    NEW.perf_fevrier = NULL;
    NEW.perf_mars = NULL;
    NEW.perf_avril = NULL;
    NEW.perf_mai = NULL;
    NEW.perf_juin = NULL;
    NEW.perf_juillet = NULL;
    NEW.perf_aout = NULL;
    NEW.perf_septembre = NULL;
    NEW.perf_octobre = NULL;
    NEW.perf_novembre = NULL;
    NEW.perf_decembre = NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour remplir automatiquement les métadonnées des indicateurs
CREATE OR REPLACE FUNCTION auto_update_indicator_metadata()
RETURNS TRIGGER AS $$
DECLARE
  sector_data RECORD;
  issue_data RECORD;
  indicator_data RECORD;
BEGIN
  -- Si les métadonnées sont déjà remplies, ne pas les écraser
  IF NEW.axe_energetique IS NOT NULL AND NEW.enjeux IS NOT NULL AND 
     NEW.normes IS NOT NULL AND NEW.critere IS NOT NULL THEN
    RETURN NEW;
  END IF;
  
  -- Rechercher dans sector_standards_issues_criteria_indicators
  SELECT DISTINCT
    ssici.issue_name,
    ssici.standard_name,
    ssici.criteria_name
  INTO sector_data
  FROM sector_standards_issues_criteria_indicators ssici
  WHERE NEW.code = ANY(ssici.indicator_codes)
  LIMIT 1;
  
  -- Si trouvé dans sector_standards_issues_criteria_indicators
  IF FOUND THEN
    -- Récupérer l'axe énergétique depuis la table issues
    SELECT i.axe_energetique INTO issue_data
    FROM issues i
    WHERE i.name = sector_data.issue_name;
    
    -- Remplir les métadonnées
    NEW.axe_energetique = COALESCE(NEW.axe_energetique, issue_data.axe_energetique);
    NEW.enjeux = COALESCE(NEW.enjeux, sector_data.issue_name);
    NEW.normes = COALESCE(NEW.normes, sector_data.standard_name);
    NEW.critere = COALESCE(NEW.critere, sector_data.criteria_name);
  ELSE
    -- Fallback : utiliser les données de la table indicators
    SELECT 
      i.axe_energetique,
      i.enjeux,
      i.normes,
      i.critere
    INTO indicator_data
    FROM indicators i
    WHERE i.code = NEW.code;
    
    IF FOUND THEN
      NEW.axe_energetique = COALESCE(NEW.axe_energetique, indicator_data.axe_energetique);
      NEW.enjeux = COALESCE(NEW.enjeux, indicator_data.enjeux);
      NEW.normes = COALESCE(NEW.normes, indicator_data.normes);
      NEW.critere = COALESCE(NEW.critere, indicator_data.critere);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Supprimer les anciens triggers s'ils existent
DROP TRIGGER IF EXISTS trigger_calculate_indicator_metrics ON site_global_indicator_values_simple;
DROP TRIGGER IF EXISTS trigger_calculate_monthly_performances ON site_global_indicator_values_simple;
DROP TRIGGER IF EXISTS update_indicator_metadata ON site_global_indicator_values_simple;

-- Créer les nouveaux triggers pour les calculs automatiques
CREATE TRIGGER trigger_calculate_indicator_metrics
  BEFORE INSERT OR UPDATE OF value, cible
  ON site_global_indicator_values_simple
  FOR EACH ROW
  EXECUTE FUNCTION calculate_indicator_metrics();

-- Créer le trigger pour les performances mensuelles
CREATE TRIGGER trigger_calculate_monthly_performances
  BEFORE INSERT OR UPDATE OF janvier, fevrier, mars, avril, mai, juin, juillet, aout, septembre, octobre, novembre, decembre, cible
  ON site_global_indicator_values_simple
  FOR EACH ROW
  EXECUTE FUNCTION update_monthly_performances_simple();

-- Créer le trigger pour les métadonnées
CREATE TRIGGER update_indicator_metadata
  BEFORE INSERT OR UPDATE
  ON site_global_indicator_values_simple
  FOR EACH ROW
  EXECUTE FUNCTION auto_update_indicator_metadata();

-- Mettre à jour toutes les données existantes
UPDATE site_global_indicator_values_simple 
SET 
  variations_pourcent = CASE 
    WHEN value IS NOT NULL AND cible IS NOT NULL THEN value - cible 
    ELSE NULL 
  END,
  performances_pourcent = CASE 
    WHEN value IS NOT NULL AND cible IS NOT NULL AND cible != 0 THEN (value / cible) * 100 
    ELSE NULL 
  END,
  perf_janvier = CASE 
    WHEN janvier IS NOT NULL AND cible IS NOT NULL AND cible != 0 THEN (janvier / cible) * 100 
    ELSE NULL 
  END,
  perf_fevrier = CASE 
    WHEN fevrier IS NOT NULL AND cible IS NOT NULL AND cible != 0 THEN (fevrier / cible) * 100 
    ELSE NULL 
  END,
  perf_mars = CASE 
    WHEN mars IS NOT NULL AND cible IS NOT NULL AND cible != 0 THEN (mars / cible) * 100 
    ELSE NULL 
  END,
  perf_avril = CASE 
    WHEN avril IS NOT NULL AND cible IS NOT NULL AND cible != 0 THEN (avril / cible) * 100 
    ELSE NULL 
  END,
  perf_mai = CASE 
    WHEN mai IS NOT NULL AND cible IS NOT NULL AND cible != 0 THEN (mai / cible) * 100 
    ELSE NULL 
  END,
  perf_juin = CASE 
    WHEN juin IS NOT NULL AND cible IS NOT NULL AND cible != 0 THEN (juin / cible) * 100 
    ELSE NULL 
  END,
  perf_juillet = CASE 
    WHEN juillet IS NOT NULL AND cible IS NOT NULL AND cible != 0 THEN (juillet / cible) * 100 
    ELSE NULL 
  END,
  perf_aout = CASE 
    WHEN aout IS NOT NULL AND cible IS NOT NULL AND cible != 0 THEN (aout / cible) * 100 
    ELSE NULL 
  END,
  perf_septembre = CASE 
    WHEN septembre IS NOT NULL AND cible IS NOT NULL AND cible != 0 THEN (septembre / cible) * 100 
    ELSE NULL 
  END,
  perf_octobre = CASE 
    WHEN octobre IS NOT NULL AND cible IS NOT NULL AND cible != 0 THEN (octobre / cible) * 100 
    ELSE NULL 
  END,
  perf_novembre = CASE 
    WHEN novembre IS NOT NULL AND cible IS NOT NULL AND cible != 0 THEN (novembre / cible) * 100 
    ELSE NULL 
  END,
  perf_decembre = CASE 
    WHEN decembre IS NOT NULL AND cible IS NOT NULL AND cible != 0 THEN (decembre / cible) * 100 
    ELSE NULL 
  END
WHERE variations_pourcent IS NULL OR performances_pourcent IS NULL 
   OR perf_janvier IS NULL OR perf_fevrier IS NULL OR perf_mars IS NULL 
   OR perf_avril IS NULL OR perf_mai IS NULL OR perf_juin IS NULL 
   OR perf_juillet IS NULL OR perf_aout IS NULL OR perf_septembre IS NULL 
   OR perf_octobre IS NULL OR perf_novembre IS NULL OR perf_decembre IS NULL;

-- Mettre à jour les métadonnées pour les lignes existantes
DO $$
DECLARE
  rec RECORD;
  sector_data RECORD;
  issue_data RECORD;
  indicator_data RECORD;
BEGIN
  FOR rec IN 
    SELECT * FROM site_global_indicator_values_simple 
    WHERE axe_energetique IS NULL OR enjeux IS NULL OR normes IS NULL OR critere IS NULL
  LOOP
    -- Rechercher dans sector_standards_issues_criteria_indicators
    SELECT DISTINCT
      ssici.issue_name,
      ssici.standard_name,
      ssici.criteria_name
    INTO sector_data
    FROM sector_standards_issues_criteria_indicators ssici
    WHERE rec.code = ANY(ssici.indicator_codes)
    LIMIT 1;
    
    -- Si trouvé dans sector_standards_issues_criteria_indicators
    IF FOUND THEN
      -- Récupérer l'axe énergétique depuis la table issues
      SELECT i.axe_energetique INTO issue_data
      FROM issues i
      WHERE i.name = sector_data.issue_name;
      
      -- Mettre à jour les métadonnées
      UPDATE site_global_indicator_values_simple 
      SET 
        axe_energetique = COALESCE(axe_energetique, issue_data.axe_energetique),
        enjeux = COALESCE(enjeux, sector_data.issue_name),
        normes = COALESCE(normes, sector_data.standard_name),
        critere = COALESCE(critere, sector_data.criteria_name)
      WHERE id = rec.id;
    ELSE
      -- Fallback : utiliser les données de la table indicators
      SELECT 
        i.axe_energetique,
        i.enjeux,
        i.normes,
        i.critere
      INTO indicator_data
      FROM indicators i
      WHERE i.code = rec.code;
      
      IF FOUND THEN
        UPDATE site_global_indicator_values_simple 
        SET 
          axe_energetique = COALESCE(axe_energetique, indicator_data.axe_energetique),
          enjeux = COALESCE(enjeux, indicator_data.enjeux),
          normes = COALESCE(normes, indicator_data.normes),
          critere = COALESCE(critere, indicator_data.critere)
        WHERE id = rec.id;
      END IF;
    END IF;
  END LOOP;
END $$;