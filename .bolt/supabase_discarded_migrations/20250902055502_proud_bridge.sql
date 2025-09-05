/*
  # Ajouter l'attribut formule à site_global_indicator_values_simple

  1. Modifications de table
    - Ajouter la colonne `formule` à `site_global_indicator_values_simple`
    - Synchroniser avec les formules de la table `indicators`

  2. Fonctions
    - Fonction pour synchroniser les formules automatiquement
    - Trigger pour maintenir la synchronisation

  3. Index
    - Index sur la colonne formule pour optimiser les requêtes
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

-- Fonction pour maintenir la synchronisation des formules
CREATE OR REPLACE FUNCTION sync_formule_from_indicators()
RETURNS TRIGGER AS $$
BEGIN
  -- Si c'est une insertion ou mise à jour, récupérer la formule depuis indicators
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    SELECT formule INTO NEW.formule
    FROM indicators 
    WHERE code = NEW.code;
    
    -- Si aucune formule trouvée, garder la valeur existante ou NULL
    IF NEW.formule IS NULL THEN
      NEW.formule = COALESCE(OLD.formule, NULL);
    END IF;
    
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour synchroniser automatiquement les formules lors des insertions/mises à jour
DROP TRIGGER IF EXISTS trigger_sync_formule_on_site_indicators ON site_global_indicator_values_simple;
CREATE TRIGGER trigger_sync_formule_on_site_indicators
  BEFORE INSERT OR UPDATE ON site_global_indicator_values_simple
  FOR EACH ROW
  EXECUTE FUNCTION sync_formule_from_indicators();

-- Fonction pour propager les changements de formule depuis la table indicators
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

-- Trigger pour propager les changements de formule depuis indicators
DROP TRIGGER IF EXISTS trigger_propagate_formule_changes ON indicators;
CREATE TRIGGER trigger_propagate_formule_changes
  AFTER UPDATE OF formule ON indicators
  FOR EACH ROW
  WHEN (OLD.formule IS DISTINCT FROM NEW.formule)
  EXECUTE FUNCTION propagate_formule_changes();

-- Créer un index sur la colonne formule pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_site_global_indicator_values_simple_formule 
ON site_global_indicator_values_simple (formule);

-- Fonction utilitaire pour resynchroniser toutes les formules manuellement
CREATE OR REPLACE FUNCTION resync_all_formules()
RETURNS void AS $$
BEGIN
  UPDATE site_global_indicator_values_simple 
  SET formule = indicators.formule
  FROM indicators 
  WHERE site_global_indicator_values_simple.code = indicators.code;
  
  RAISE NOTICE 'Toutes les formules ont été resynchronisées depuis la table indicators';
END;
$$ LANGUAGE plpgsql;

-- Mettre à jour le trigger existant auto_update_indicator_metadata pour inclure la formule
CREATE OR REPLACE FUNCTION auto_update_indicator_metadata()
RETURNS TRIGGER AS $$
BEGIN
  -- Récupérer toutes les métadonnées de l'indicateur depuis la table indicators
  SELECT 
    axe_energetique,
    enjeux,
    normes,
    critere,
    indicateur,
    definition,
    processus,
    processus_code,
    frequence,
    unite,
    type,
    formule
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
  FROM indicators 
  WHERE code = NEW.code;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;