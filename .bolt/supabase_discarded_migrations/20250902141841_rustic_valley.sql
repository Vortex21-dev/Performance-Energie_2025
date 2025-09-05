/*
  # Mise à jour du processus_code dans site_global_indicator_values_simple

  1. Fonction de mise à jour
    - `update_processus_code_from_indicator()` : Récupère le processus_code depuis la table indicators
    - Mise à jour automatique lors des insertions/modifications

  2. Trigger automatique
    - Se déclenche avant INSERT/UPDATE sur site_global_indicator_values_simple
    - Met à jour automatiquement le processus_code basé sur le code de l'indicateur

  3. Synchronisation des données existantes
    - Met à jour toutes les lignes existantes avec le bon processus_code
    - Préserve les données existantes valides

  4. Fonction utilitaire
    - `sync_all_processus_codes_site_simple()` : Pour synchroniser manuellement
*/

-- Fonction pour mettre à jour le processus_code depuis la table indicators
CREATE OR REPLACE FUNCTION update_processus_code_from_indicator_site_simple()
RETURNS TRIGGER AS $$
BEGIN
  -- Récupérer le processus_code depuis la table indicators
  SELECT processus_code INTO NEW.processus_code
  FROM indicators
  WHERE code = NEW.code;
  
  -- Si aucun processus trouvé, conserver la valeur existante (si elle existe)
  IF NEW.processus_code IS NULL AND OLD.processus_code IS NOT NULL THEN
    NEW.processus_code := OLD.processus_code;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger pour mettre à jour automatiquement le processus_code
DROP TRIGGER IF EXISTS trigger_update_processus_code_site_simple ON site_global_indicator_values_simple;

CREATE TRIGGER trigger_update_processus_code_site_simple
  BEFORE INSERT OR UPDATE OF code ON site_global_indicator_values_simple
  FOR EACH ROW
  EXECUTE FUNCTION update_processus_code_from_indicator_site_simple();

-- Mettre à jour toutes les lignes existantes avec le bon processus_code
UPDATE site_global_indicator_values_simple 
SET processus_code = indicators.processus_code
FROM indicators
WHERE site_global_indicator_values_simple.code = indicators.code
  AND (site_global_indicator_values_simple.processus_code IS NULL 
       OR site_global_indicator_values_simple.processus_code != indicators.processus_code);

-- Fonction utilitaire pour synchroniser manuellement tous les processus_code
CREATE OR REPLACE FUNCTION sync_all_processus_codes_site_simple()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
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

-- Afficher le nombre de lignes mises à jour
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  SELECT sync_all_processus_codes_site_simple() INTO updated_count;
  RAISE NOTICE 'Nombre de lignes mises à jour dans site_global_indicator_values_simple: %', updated_count;
END $$;