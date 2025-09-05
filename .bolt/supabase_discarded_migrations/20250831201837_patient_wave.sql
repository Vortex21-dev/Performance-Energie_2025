/*
  # Ajouter la colonne formule à site_global_indicator_values_simple

  1. Modifications de table
    - Ajouter la colonne `formule` à `site_global_indicator_values_simple`
    - Remplir la colonne avec les données de la table `indicators`
  
  2. Trigger de synchronisation
    - Créer un trigger pour maintenir la synchronisation automatique
    - Mettre à jour la formule quand les données d'indicateurs changent
  
  3. Fonction de mise à jour
    - Fonction pour synchroniser les formules existantes
    - Mise à jour automatique lors des insertions/modifications
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

-- Mettre à jour les formules existantes avec les données de la table indicators
UPDATE site_global_indicator_values_simple 
SET formule = indicators.formule
FROM indicators 
WHERE site_global_indicator_values_simple.code = indicators.code;

-- Créer ou remplacer la fonction de mise à jour automatique des formules
CREATE OR REPLACE FUNCTION update_indicator_formule_on_site_values()
RETURNS TRIGGER AS $$
BEGIN
  -- Mettre à jour la formule depuis la table indicators
  UPDATE site_global_indicator_values_simple 
  SET formule = indicators.formule
  FROM indicators 
  WHERE site_global_indicator_values_simple.code = indicators.code
    AND site_global_indicator_values_simple.code = NEW.code;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger pour maintenir la synchronisation automatique
DROP TRIGGER IF EXISTS trigger_update_formule_on_site_values ON site_global_indicator_values_simple;
CREATE TRIGGER trigger_update_formule_on_site_values
  BEFORE INSERT OR UPDATE ON site_global_indicator_values_simple
  FOR EACH ROW
  EXECUTE FUNCTION update_indicator_formule_on_site_values();

-- Créer un trigger sur la table indicators pour propager les changements de formule
CREATE OR REPLACE FUNCTION propagate_formule_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Mettre à jour toutes les lignes correspondantes dans site_global_indicator_values_simple
  UPDATE site_global_indicator_values_simple 
  SET formule = NEW.formule
  WHERE code = NEW.code;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger sur la table indicators
DROP TRIGGER IF EXISTS trigger_propagate_formule_changes ON indicators;
CREATE TRIGGER trigger_propagate_formule_changes
  AFTER UPDATE OF formule ON indicators
  FOR EACH ROW
  EXECUTE FUNCTION propagate_formule_changes();