/*
  # Calcul automatique des variations et performances

  1. Fonctions de calcul
    - Fonction pour calculer variations_pourcent et performances_pourcent
    - Logique: variations_pourcent = value - cible, performances_pourcent = (value / cible) * 100

  2. Triggers
    - Trigger sur filiere_consolide pour calcul automatique
    - Trigger sur consolide_site pour calcul automatique  
    - Trigger sur filaire_consolide pour calcul automatique

  3. Mise à jour des données existantes
    - Recalcul de toutes les données existantes avec les nouvelles formules
*/

-- Fonction pour calculer les variations et performances
CREATE OR REPLACE FUNCTION calculate_variations_and_performances()
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

-- Trigger pour filiere_consolide
DROP TRIGGER IF EXISTS trigger_calculate_filiere_consolide_metrics ON filiere_consolide;
CREATE TRIGGER trigger_calculate_filiere_consolide_metrics
  BEFORE INSERT OR UPDATE OF value, cible
  ON filiere_consolide
  FOR EACH ROW
  EXECUTE FUNCTION calculate_variations_and_performances();

-- Trigger pour consolide_site
DROP TRIGGER IF EXISTS trigger_calculate_consolide_site_metrics ON consolide_site;
CREATE TRIGGER trigger_calculate_consolide_site_metrics
  BEFORE INSERT OR UPDATE OF value, cible
  ON consolide_site
  FOR EACH ROW
  EXECUTE FUNCTION calculate_variations_and_performances();

-- Trigger pour filaires_consolide
DROP TRIGGER IF EXISTS trigger_calculate_filaires_consolide_metrics ON filaires_consolide;
CREATE TRIGGER trigger_calculate_filaires_consolide_metrics
  BEFORE INSERT OR UPDATE OF value, cible
  ON filaires_consolide
  FOR EACH ROW
  EXECUTE FUNCTION calculate_variations_and_performances();

-- Mise à jour des données existantes dans filiere_consolide
UPDATE filiere_consolide 
SET 
  variations_pourcent = CASE 
    WHEN value IS NOT NULL AND cible IS NOT NULL THEN value - cible
    ELSE NULL
  END,
  performances_pourcent = CASE 
    WHEN value IS NOT NULL AND cible IS NOT NULL AND cible != 0 THEN (value / cible) * 100
    ELSE NULL
  END
WHERE value IS NOT NULL OR cible IS NOT NULL;

-- Mise à jour des données existantes dans consolide_site
UPDATE consolide_site 
SET 
  variations_pourcent = CASE 
    WHEN value IS NOT NULL AND cible IS NOT NULL THEN value - cible
    ELSE NULL
  END,
  performances_pourcent = CASE 
    WHEN value IS NOT NULL AND cible IS NOT NULL AND cible != 0 THEN (value / cible) * 100
    ELSE NULL
  END
WHERE value IS NOT NULL OR cible IS NOT NULL;

-- Mise à jour des données existantes dans filaires_consolide
UPDATE filaires_consolide 
SET 
  variations_pourcent = CASE 
    WHEN value IS NOT NULL AND cible IS NOT NULL THEN value - cible
    ELSE NULL
  END,
  performances_pourcent = CASE 
    WHEN value IS NOT NULL AND cible IS NOT NULL AND cible != 0 THEN (value / cible) * 100
    ELSE NULL
  END
WHERE value IS NOT NULL OR cible IS NOT NULL;