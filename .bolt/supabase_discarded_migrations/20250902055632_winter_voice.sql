/*
  # Ajouter l'attribut formule à site_global_indicator_values_simple

  1. Modifications de table
    - Ajouter la colonne `formule` à `site_global_indicator_values_simple`
    - Synchroniser avec les formules de la table `indicators`

  2. Fonctions de synchronisation
    - Fonction pour mettre à jour la formule automatiquement
    - Trigger pour maintenir la synchronisation

  3. Index et optimisations
    - Index sur la colonne formule pour les performances
*/

-- Ajouter la colonne formule si elle n'existe pas déjà
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'site_global_indicator_values_simple' 
    AND column_name = 'formule'
  ) THEN
    ALTER TABLE site_global_indicator_values_simple 
    ADD COLUMN formule text;
    
    -- Ajouter un commentaire pour documenter la colonne
    COMMENT ON COLUMN site_global_indicator_values_simple.formule IS 'Formule de calcul de l''indicateur, synchronisée depuis la table indicators';
  END IF;
END $$;

-- Synchroniser les formules existantes depuis la table indicators
UPDATE site_global_indicator_values_simple 
SET formule = indicators.formule
FROM indicators 
WHERE site_global_indicator_values_simple.code = indicators.code
AND site_global_indicator_values_simple.formule IS NULL;

-- Fonction pour synchroniser automatiquement la formule
CREATE OR REPLACE FUNCTION sync_formule_on_site_indicators()
RETURNS TRIGGER AS $$
BEGIN
  -- Récupérer la formule depuis la table indicators
  SELECT formule INTO NEW.formule
  FROM indicators 
  WHERE code = NEW.code;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour synchroniser la formule lors des insertions/mises à jour
DROP TRIGGER IF EXISTS trigger_sync_formule_on_site_indicators ON site_global_indicator_values_simple;
CREATE TRIGGER trigger_sync_formule_on_site_indicators
  BEFORE INSERT OR UPDATE ON site_global_indicator_values_simple
  FOR EACH ROW
  EXECUTE FUNCTION sync_formule_on_site_indicators();

-- Fonction pour propager les changements de formule depuis la table indicators
CREATE OR REPLACE FUNCTION propagate_formule_to_site_indicators()
RETURNS TRIGGER AS $$
BEGIN
  -- Mettre à jour toutes les lignes correspondantes dans site_global_indicator_values_simple
  UPDATE site_global_indicator_values_simple 
  SET formule = NEW.formule
  WHERE code = NEW.code;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour propager les changements de formule
DROP TRIGGER IF EXISTS trigger_propagate_formule_changes ON indicators;
CREATE TRIGGER trigger_propagate_formule_changes
  AFTER UPDATE OF formule ON indicators
  FOR EACH ROW
  WHEN (OLD.formule IS DISTINCT FROM NEW.formule)
  EXECUTE FUNCTION propagate_formule_to_site_indicators();

-- Créer un index sur la colonne formule pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_site_global_indicator_values_simple_formule 
ON site_global_indicator_values_simple(formule);

-- Fonction utilitaire pour resynchroniser toutes les formules manuellement
CREATE OR REPLACE FUNCTION resync_all_formules()
RETURNS void AS $$
BEGIN
  UPDATE site_global_indicator_values_simple 
  SET formule = indicators.formule
  FROM indicators 
  WHERE site_global_indicator_values_simple.code = indicators.code;
  
  RAISE NOTICE 'Toutes les formules ont été resynchronisées';
END;
$$ LANGUAGE plpgsql;