/*
  # Ajouter valeur par défaut pour cible et corriger les calculs

  1. Modifications de la table
    - Ajouter une valeur par défaut de 100 pour la colonne `cible`
  
  2. Fonctions mises à jour
    - Corriger le calcul de `variations_pourcent` : value - cible
    - Corriger le calcul de `performances_pourcent` : (value / cible) * 100
    - Mettre à jour les performances mensuelles avec la même logique
  
  3. Mise à jour des données existantes
    - Appliquer les nouveaux calculs aux données existantes
*/

-- Ajouter une valeur par défaut pour la colonne cible
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'site_global_indicator_values_simple' 
    AND column_name = 'cible' 
    AND column_default IS NOT NULL
  ) THEN
    ALTER TABLE site_global_indicator_values_simple 
    ALTER COLUMN cible SET DEFAULT 100;
  END IF;
END $$;

-- Fonction corrigée pour calculer les métriques des indicateurs
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

-- Fonction corrigée pour calculer les performances mensuelles
CREATE OR REPLACE FUNCTION update_monthly_performances_simple()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculer les performances mensuelles : (valeur_mensuelle / cible) * 100
  IF NEW.cible IS NOT NULL AND NEW.cible != 0 THEN
    -- Janvier
    IF NEW.janvier IS NOT NULL THEN
      NEW.perf_janvier = (NEW.janvier / NEW.cible) * 100;
    END IF;
    
    -- Février
    IF NEW.fevrier IS NOT NULL THEN
      NEW.perf_fevrier = (NEW.fevrier / NEW.cible) * 100;
    END IF;
    
    -- Mars
    IF NEW.mars IS NOT NULL THEN
      NEW.perf_mars = (NEW.mars / NEW.cible) * 100;
    END IF;
    
    -- Avril
    IF NEW.avril IS NOT NULL THEN
      NEW.perf_avril = (NEW.avril / NEW.cible) * 100;
    END IF;
    
    -- Mai
    IF NEW.mai IS NOT NULL THEN
      NEW.perf_mai = (NEW.mai / NEW.cible) * 100;
    END IF;
    
    -- Juin
    IF NEW.juin IS NOT NULL THEN
      NEW.perf_juin = (NEW.juin / NEW.cible) * 100;
    END IF;
    
    -- Juillet
    IF NEW.juillet IS NOT NULL THEN
      NEW.perf_juillet = (NEW.juillet / NEW.cible) * 100;
    END IF;
    
    -- Août
    IF NEW.aout IS NOT NULL THEN
      NEW.perf_aout = (NEW.aout / NEW.cible) * 100;
    END IF;
    
    -- Septembre
    IF NEW.septembre IS NOT NULL THEN
      NEW.perf_septembre = (NEW.septembre / NEW.cible) * 100;
    END IF;
    
    -- Octobre
    IF NEW.octobre IS NOT NULL THEN
      NEW.perf_octobre = (NEW.octobre / NEW.cible) * 100;
    END IF;
    
    -- Novembre
    IF NEW.novembre IS NOT NULL THEN
      NEW.perf_novembre = (NEW.novembre / NEW.cible) * 100;
    END IF;
    
    -- Décembre
    IF NEW.decembre IS NOT NULL THEN
      NEW.perf_decembre = (NEW.decembre / NEW.cible) * 100;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Mettre à jour les données existantes avec une valeur par défaut pour cible
UPDATE site_global_indicator_values_simple 
SET cible = 100 
WHERE cible IS NULL;

-- Recalculer toutes les métriques pour les données existantes
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
  END;