/*
  # Mise à jour du processus_code dans site_global_indicator_values_simple

  1. Fonction de mise à jour
    - `update_processus_code_from_indicator()` : Récupère le processus_code depuis indicators
    - Mise à jour automatique lors des insertions/modifications

  2. Synchronisation des données existantes
    - Correction de tous les processus_code existants
    - Mise à jour en masse des données

  3. Trigger automatique
    - Se déclenche avant INSERT/UPDATE
    - Garantit la cohérence des données
*/

-- Fonction pour mettre à jour le processus_code depuis la table indicators
CREATE OR REPLACE FUNCTION update_processus_code_from_indicator()
RETURNS TRIGGER AS $$
BEGIN
  -- Récupérer le processus_code depuis la table indicators
  SELECT processus_code INTO NEW.processus_code
  FROM indicators
  WHERE code = NEW.code;
  
  -- Si aucun processus trouvé, garder la valeur existante ou NULL
  IF NEW.processus_code IS NULL THEN
    NEW.processus_code := OLD.processus_code;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger pour mettre à jour automatiquement le processus_code
DROP TRIGGER IF EXISTS trigger_update_processus_code ON site_global_indicator_values_simple;

CREATE TRIGGER trigger_update_processus_code
  BEFORE INSERT OR UPDATE OF code ON site_global_indicator_values_simple
  FOR EACH ROW
  EXECUTE FUNCTION update_processus_code_from_indicator();

-- Mettre à jour toutes les lignes existantes avec le bon processus_code
UPDATE site_global_indicator_values_simple 
SET processus_code = indicators.processus_code
FROM indicators
WHERE site_global_indicator_values_simple.code = indicators.code
  AND (site_global_indicator_values_simple.processus_code IS NULL 
       OR site_global_indicator_values_simple.processus_code != indicators.processus_code);

-- Fonction utilitaire pour synchroniser tous les processus_code
CREATE OR REPLACE FUNCTION sync_all_processus_codes()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  -- Mettre à jour tous les processus_code
  UPDATE site_global_indicator_values_simple 
  SET processus_code = indicators.processus_code
  FROM indicators
  WHERE site_global_indicator_values_simple.code = indicators.code
    AND (site_global_indicator_values_simple.processus_code IS NULL 
         OR site_global_indicator_values_simple.processus_code != indicators.processus_code);
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;