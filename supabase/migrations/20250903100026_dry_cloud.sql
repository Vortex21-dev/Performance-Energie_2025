/*
  # Mise à jour de la hiérarchie dans indicator_values

  1. Modifications
    - Mise à jour des colonnes filiere_name et filiale_name dans indicator_values
    - Récupération des données depuis la hiérarchie sites → filiales → filières
    - Mise à jour basée sur les relations existantes

  2. Logique
    - Pour chaque valeur d'indicateur avec un site_name
    - Récupérer la filiale_name depuis la table sites
    - Récupérer la filiere_name depuis la table filiales
    - Mettre à jour les colonnes correspondantes
*/

-- Mettre à jour filiale_name depuis la table sites
UPDATE indicator_values 
SET filiale_name = sites.filiale_name
FROM sites 
WHERE indicator_values.site_name = sites.name 
  AND indicator_values.site_name IS NOT NULL
  AND sites.filiale_name IS NOT NULL;

-- Mettre à jour filiere_name depuis la table sites (pour les sites directement liés à une filière)
UPDATE indicator_values 
SET filiere_name = sites.filiere_name
FROM sites 
WHERE indicator_values.site_name = sites.name 
  AND indicator_values.site_name IS NOT NULL
  AND sites.filiere_name IS NOT NULL;

-- Mettre à jour filiere_name depuis la table filiales (pour les sites liés via une filiale)
UPDATE indicator_values 
SET filiere_name = filiales.filiere_name
FROM sites, filiales
WHERE indicator_values.site_name = sites.name 
  AND sites.filiale_name = filiales.name
  AND indicator_values.site_name IS NOT NULL
  AND sites.filiale_name IS NOT NULL
  AND filiales.filiere_name IS NOT NULL
  AND indicator_values.filiere_name IS NULL; -- Éviter d'écraser les valeurs déjà définies

-- Créer une fonction pour maintenir automatiquement la hiérarchie
CREATE OR REPLACE FUNCTION update_indicator_values_hierarchy()
RETURNS TRIGGER AS $$
BEGIN
  -- Si un site_name est fourni, récupérer la hiérarchie
  IF NEW.site_name IS NOT NULL THEN
    -- Récupérer les informations de hiérarchie depuis la table sites
    SELECT 
      s.filiale_name,
      COALESCE(s.filiere_name, f.filiere_name) as filiere_name
    INTO 
      NEW.filiale_name,
      NEW.filiere_name
    FROM sites s
    LEFT JOIN filiales f ON s.filiale_name = f.name
    WHERE s.name = NEW.site_name;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer un trigger pour maintenir automatiquement la hiérarchie lors des insertions/mises à jour
DROP TRIGGER IF EXISTS trigger_update_indicator_values_hierarchy ON indicator_values;
CREATE TRIGGER trigger_update_indicator_values_hierarchy
  BEFORE INSERT OR UPDATE OF site_name ON indicator_values
  FOR EACH ROW
  EXECUTE FUNCTION update_indicator_values_hierarchy();

-- Mettre à jour les index pour optimiser les requêtes hiérarchiques
DROP INDEX IF EXISTS idx_indicator_values_hierarchy_complete;
CREATE INDEX idx_indicator_values_hierarchy_complete 
ON indicator_values (organization_name, filiere_name, filiale_name, site_name);

-- Index pour les requêtes par filière
DROP INDEX IF EXISTS idx_indicator_values_filiere_complete;
CREATE INDEX idx_indicator_values_filiere_complete 
ON indicator_values (organization_name, filiere_name, indicator_code, period_id);

-- Index pour les requêtes par filiale
DROP INDEX IF EXISTS idx_indicator_values_filiale_complete;
CREATE INDEX idx_indicator_values_filiale_complete 
ON indicator_values (organization_name, filiale_name, indicator_code, period_id);

-- Vérifier les résultats de la mise à jour
DO $$
DECLARE
  total_rows INTEGER;
  updated_filiale INTEGER;
  updated_filiere INTEGER;
BEGIN
  -- Compter le total de lignes
  SELECT COUNT(*) INTO total_rows FROM indicator_values WHERE site_name IS NOT NULL;
  
  -- Compter les lignes avec filiale_name mise à jour
  SELECT COUNT(*) INTO updated_filiale FROM indicator_values WHERE filiale_name IS NOT NULL;
  
  -- Compter les lignes avec filiere_name mise à jour
  SELECT COUNT(*) INTO updated_filiere FROM indicator_values WHERE filiere_name IS NOT NULL;
  
  RAISE NOTICE 'Mise à jour terminée:';
  RAISE NOTICE '- Total de lignes avec site_name: %', total_rows;
  RAISE NOTICE '- Lignes avec filiale_name: %', updated_filiale;
  RAISE NOTICE '- Lignes avec filiere_name: %', updated_filiere;
END $$;