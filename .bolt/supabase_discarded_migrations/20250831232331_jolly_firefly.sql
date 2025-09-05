/*
  # Ajouter l'attribut formule à site_global_indicator_values_simple

  1. Modifications de table
    - Ajouter la colonne `formule` à `site_global_indicator_values_simple`
    - Synchroniser avec les données existantes de la table `indicators`

  2. Triggers de synchronisation
    - Trigger pour maintenir la synchronisation lors des insertions/modifications
    - Trigger pour propager les changements de formule depuis la table `indicators`

  3. Fonctions utilitaires
    - Fonction pour mettre à jour la formule automatiquement
    - Fonction pour synchroniser les formules existantes
*/

-- Ajouter la colonne formule si elle n'existe pas déjà
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'site_global_indicator_values_simple' AND column_name = 'formule'
  ) THEN
    ALTER TABLE site_global_indicator_values_simple ADD COLUMN formule text;
  END IF;
END $$;

-- Fonction pour mettre à jour la formule depuis la table indicators
CREATE OR REPLACE FUNCTION update_formule_from_indicators()
RETURNS TRIGGER AS $$
BEGIN
  -- Mettre à jour la formule depuis la table indicators
  UPDATE site_global_indicator_values_simple 
  SET formule = indicators.formule
  FROM indicators 
  WHERE site_global_indicator_values_simple.code = indicators.code
    AND (site_global_indicator_values_simple.id = NEW.id OR site_global_indicator_values_simple.id = OLD.id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Fonction pour propager les changements de formule depuis la table indicators
CREATE OR REPLACE FUNCTION propagate_formule_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Mettre à jour toutes les lignes de site_global_indicator_values_simple qui utilisent cet indicateur
  UPDATE site_global_indicator_values_simple 
  SET formule = NEW.formule
  WHERE code = NEW.code;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Synchroniser les formules existantes
UPDATE site_global_indicator_values_simple 
SET formule = indicators.formule
FROM indicators 
WHERE site_global_indicator_values_simple.code = indicators.code;

-- Créer le trigger pour maintenir la synchronisation lors des insertions/modifications sur site_global_indicator_values_simple
DROP TRIGGER IF EXISTS trigger_update_formule_on_site_indicators ON site_global_indicator_values_simple;
CREATE TRIGGER trigger_update_formule_on_site_indicators
  BEFORE INSERT OR UPDATE ON site_global_indicator_values_simple
  FOR EACH ROW
  EXECUTE FUNCTION update_formule_from_indicators();

-- Créer le trigger pour propager les changements de formule depuis la table indicators
DROP TRIGGER IF EXISTS trigger_propagate_formule_changes ON indicators;
CREATE TRIGGER trigger_propagate_formule_changes
  AFTER UPDATE OF formule ON indicators
  FOR EACH ROW
  EXECUTE FUNCTION propagate_formule_changes();

-- Fonction pour synchroniser manuellement toutes les formules (utilitaire)
CREATE OR REPLACE FUNCTION sync_all_formules()
RETURNS void AS $$
BEGIN
  UPDATE site_global_indicator_values_simple 
  SET formule = indicators.formule
  FROM indicators 
  WHERE site_global_indicator_values_simple.code = indicators.code;
  
  RAISE NOTICE 'Synchronisation des formules terminée';
END;
$$ LANGUAGE plpgsql;

-- Ajouter un index sur la colonne formule pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_site_global_indicator_values_simple_formule 
ON site_global_indicator_values_simple (formule);

-- Ajouter un commentaire sur la colonne
COMMENT ON COLUMN site_global_indicator_values_simple.formule IS 'Formule de calcul de l''indicateur, synchronisée depuis la table indicators';