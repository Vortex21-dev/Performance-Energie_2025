/*
  # Correction des triggers pour calculs automatiques

  1. Modifications
    - Correction de la valeur par défaut pour la colonne cible (100)
    - Mise à jour des fonctions de calcul pour les nouvelles insertions
    - Triggers optimisés pour BEFORE INSERT et UPDATE
    - Calculs automatiques pour variations_pourcent et performances_pourcent
    - Calculs des performances mensuelles

  2. Formules appliquées
    - variations_pourcent = value - cible
    - performances_pourcent = (value / cible) * 100
    - Performances mensuelles = (valeur_mensuelle / cible) * 100
*/

-- Modifier la colonne cible pour avoir une valeur par défaut de 100
ALTER TABLE site_global_indicator_values_simple 
ALTER COLUMN cible SET DEFAULT 100;

-- Fonction pour calculer les métriques principales
CREATE OR REPLACE FUNCTION calculate_indicator_metrics()
RETURNS TRIGGER AS $$
BEGIN
  -- S'assurer que cible a une valeur (utiliser la valeur par défaut si NULL)
  IF NEW.cible IS NULL THEN
    NEW.cible := 100;
  END IF;
  
  -- Calculer variations_pourcent = value - cible
  IF NEW.value IS NOT NULL AND NEW.cible IS NOT NULL THEN
    NEW.variations_pourcent := NEW.value - NEW.cible;
  END IF;
  
  -- Calculer performances_pourcent = (value / cible) * 100
  IF NEW.value IS NOT NULL AND NEW.cible IS NOT NULL AND NEW.cible != 0 THEN
    NEW.performances_pourcent := (NEW.value / NEW.cible) * 100;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour calculer les performances mensuelles
CREATE OR REPLACE FUNCTION update_monthly_performances_simple()
RETURNS TRIGGER AS $$
BEGIN
  -- S'assurer que cible a une valeur
  IF NEW.cible IS NULL THEN
    NEW.cible := 100;
  END IF;
  
  -- Calculer les performances mensuelles si cible != 0
  IF NEW.cible IS NOT NULL AND NEW.cible != 0 THEN
    -- Janvier
    IF NEW.janvier IS NOT NULL THEN
      NEW.perf_janvier := (NEW.janvier / NEW.cible) * 100;
    END IF;
    
    -- Février
    IF NEW.fevrier IS NOT NULL THEN
      NEW.perf_fevrier := (NEW.fevrier / NEW.cible) * 100;
    END IF;
    
    -- Mars
    IF NEW.mars IS NOT NULL THEN
      NEW.perf_mars := (NEW.mars / NEW.cible) * 100;
    END IF;
    
    -- Avril
    IF NEW.avril IS NOT NULL THEN
      NEW.perf_avril := (NEW.avril / NEW.cible) * 100;
    END IF;
    
    -- Mai
    IF NEW.mai IS NOT NULL THEN
      NEW.perf_mai := (NEW.mai / NEW.cible) * 100;
    END IF;
    
    -- Juin
    IF NEW.juin IS NOT NULL THEN
      NEW.perf_juin := (NEW.juin / NEW.cible) * 100;
    END IF;
    
    -- Juillet
    IF NEW.juillet IS NOT NULL THEN
      NEW.perf_juillet := (NEW.juillet / NEW.cible) * 100;
    END IF;
    
    -- Août
    IF NEW.aout IS NOT NULL THEN
      NEW.perf_aout := (NEW.aout / NEW.cible) * 100;
    END IF;
    
    -- Septembre
    IF NEW.septembre IS NOT NULL THEN
      NEW.perf_septembre := (NEW.septembre / NEW.cible) * 100;
    END IF;
    
    -- Octobre
    IF NEW.octobre IS NOT NULL THEN
      NEW.perf_octobre := (NEW.octobre / NEW.cible) * 100;
    END IF;
    
    -- Novembre
    IF NEW.novembre IS NOT NULL THEN
      NEW.perf_novembre := (NEW.novembre / NEW.cible) * 100;
    END IF;
    
    -- Décembre
    IF NEW.decembre IS NOT NULL THEN
      NEW.perf_decembre := (NEW.decembre / NEW.cible) * 100;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Supprimer les anciens triggers s'ils existent
DROP TRIGGER IF EXISTS trigger_calculate_indicator_metrics ON site_global_indicator_values_simple;
DROP TRIGGER IF EXISTS trigger_calculate_monthly_performances ON site_global_indicator_values_simple;

-- Créer les nouveaux triggers pour BEFORE INSERT et UPDATE
CREATE TRIGGER trigger_calculate_indicator_metrics
  BEFORE INSERT OR UPDATE OF value, cible
  ON site_global_indicator_values_simple
  FOR EACH ROW
  EXECUTE FUNCTION calculate_indicator_metrics();

CREATE TRIGGER trigger_calculate_monthly_performances
  BEFORE INSERT OR UPDATE OF janvier, fevrier, mars, avril, mai, juin, juillet, aout, septembre, octobre, novembre, decembre, cible
  ON site_global_indicator_values_simple
  FOR EACH ROW
  EXECUTE FUNCTION update_monthly_performances_simple();

-- Mettre à jour toutes les lignes existantes pour appliquer les calculs
UPDATE site_global_indicator_values_simple 
SET 
  cible = COALESCE(cible, 100),
  variations_pourcent = CASE 
    WHEN value IS NOT NULL AND COALESCE(cible, 100) IS NOT NULL 
    THEN value - COALESCE(cible, 100)
    ELSE variations_pourcent 
  END,
  performances_pourcent = CASE 
    WHEN value IS NOT NULL AND COALESCE(cible, 100) IS NOT NULL AND COALESCE(cible, 100) != 0 
    THEN (value / COALESCE(cible, 100)) * 100
    ELSE performances_pourcent 
  END,
  perf_janvier = CASE 
    WHEN janvier IS NOT NULL AND COALESCE(cible, 100) IS NOT NULL AND COALESCE(cible, 100) != 0 
    THEN (janvier / COALESCE(cible, 100)) * 100
    ELSE perf_janvier 
  END,
  perf_fevrier = CASE 
    WHEN fevrier IS NOT NULL AND COALESCE(cible, 100) IS NOT NULL AND COALESCE(cible, 100) != 0 
    THEN (fevrier / COALESCE(cible, 100)) * 100
    ELSE perf_fevrier 
  END,
  perf_mars = CASE 
    WHEN mars IS NOT NULL AND COALESCE(cible, 100) IS NOT NULL AND COALESCE(cible, 100) != 0 
    THEN (mars / COALESCE(cible, 100)) * 100
    ELSE perf_mars 
  END,
  perf_avril = CASE 
    WHEN avril IS NOT NULL AND COALESCE(cible, 100) IS NOT NULL AND COALESCE(cible, 100) != 0 
    THEN (avril / COALESCE(cible, 100)) * 100
    ELSE perf_avril 
  END,
  perf_mai = CASE 
    WHEN mai IS NOT NULL AND COALESCE(cible, 100) IS NOT NULL AND COALESCE(cible, 100) != 0 
    THEN (mai / COALESCE(cible, 100)) * 100
    ELSE perf_mai 
  END,
  perf_juin = CASE 
    WHEN juin IS NOT NULL AND COALESCE(cible, 100) IS NOT NULL AND COALESCE(cible, 100) != 0 
    THEN (juin / COALESCE(cible, 100)) * 100
    ELSE perf_juin 
  END,
  perf_juillet = CASE 
    WHEN juillet IS NOT NULL AND COALESCE(cible, 100) IS NOT NULL AND COALESCE(cible, 100) != 0 
    THEN (juillet / COALESCE(cible, 100)) * 100
    ELSE perf_juillet 
  END,
  perf_aout = CASE 
    WHEN aout IS NOT NULL AND COALESCE(cible, 100) IS NOT NULL AND COALESCE(cible, 100) != 0 
    THEN (aout / COALESCE(cible, 100)) * 100
    ELSE perf_aout 
  END,
  perf_septembre = CASE 
    WHEN septembre IS NOT NULL AND COALESCE(cible, 100) IS NOT NULL AND COALESCE(cible, 100) != 0 
    THEN (septembre / COALESCE(cible, 100)) * 100
    ELSE perf_septembre 
  END,
  perf_octobre = CASE 
    WHEN octobre IS NOT NULL AND COALESCE(cible, 100) IS NOT NULL AND COALESCE(cible, 100) != 0 
    THEN (octobre / COALESCE(cible, 100)) * 100
    ELSE perf_octobre 
  END,
  perf_novembre = CASE 
    WHEN novembre IS NOT NULL AND COALESCE(cible, 100) IS NOT NULL AND COALESCE(cible, 100) != 0 
    THEN (novembre / COALESCE(cible, 100)) * 100
    ELSE perf_novembre 
  END,
  perf_decembre = CASE 
    WHEN decembre IS NOT NULL AND COALESCE(cible, 100) IS NOT NULL AND COALESCE(cible, 100) != 0 
    THEN (decembre / COALESCE(cible, 100)) * 100
    ELSE perf_decembre 
  END;