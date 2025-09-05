/*
  # Auto-populate indicator metadata from sector standards

  1. New Function
    - `auto_update_indicator_metadata()` : Remplit automatiquement axe_energetique, enjeux, normes, critere depuis sector_standards_issues_criteria_indicators

  2. Trigger
    - Se déclenche avant INSERT/UPDATE sur site_global_indicator_values_simple
    - Recherche les métadonnées dans sector_standards_issues_criteria_indicators basé sur le code de l'indicateur
    - Met à jour automatiquement les colonnes axe_energetique, enjeux, normes, critere

  3. Update existing data
    - Met à jour toutes les lignes existantes avec les métadonnées correctes
*/

-- Fonction pour mettre à jour automatiquement les métadonnées des indicateurs
CREATE OR REPLACE FUNCTION auto_update_indicator_metadata()
RETURNS TRIGGER AS $$
BEGIN
  -- Rechercher les métadonnées de l'indicateur dans sector_standards_issues_criteria_indicators
  SELECT 
    i.axe_energetique,
    ssici.issue_name,
    ssici.standard_name,
    ssici.criteria_name
  INTO 
    NEW.axe_energetique,
    NEW.enjeux,
    NEW.normes,
    NEW.critere
  FROM indicators i
  LEFT JOIN sector_standards_issues_criteria_indicators ssici 
    ON i.code = ANY(ssici.indicator_codes)
  WHERE i.code = NEW.code
  LIMIT 1;

  -- Si aucune donnée trouvée dans sector_standards_issues_criteria_indicators,
  -- utiliser les données de base de la table indicators
  IF NEW.axe_energetique IS NULL THEN
    SELECT 
      i.axe_energetique,
      i.enjeux,
      i.normes,
      i.critere
    INTO 
      NEW.axe_energetique,
      NEW.enjeux,
      NEW.normes,
      NEW.critere
    FROM indicators i
    WHERE i.code = NEW.code;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger
DROP TRIGGER IF EXISTS trigger_auto_update_indicator_metadata ON site_global_indicator_values_simple;
CREATE TRIGGER trigger_auto_update_indicator_metadata
  BEFORE INSERT OR UPDATE ON site_global_indicator_values_simple
  FOR EACH ROW
  EXECUTE FUNCTION auto_update_indicator_metadata();

-- Mettre à jour toutes les lignes existantes
UPDATE site_global_indicator_values_simple 
SET 
  axe_energetique = COALESCE(
    (SELECT i.axe_energetique 
     FROM indicators i 
     LEFT JOIN sector_standards_issues_criteria_indicators ssici 
       ON i.code = ANY(ssici.indicator_codes)
     WHERE i.code = site_global_indicator_values_simple.code 
     LIMIT 1),
    (SELECT i.axe_energetique FROM indicators i WHERE i.code = site_global_indicator_values_simple.code)
  ),
  enjeux = COALESCE(
    (SELECT ssici.issue_name 
     FROM indicators i 
     LEFT JOIN sector_standards_issues_criteria_indicators ssici 
       ON i.code = ANY(ssici.indicator_codes)
     WHERE i.code = site_global_indicator_values_simple.code 
     LIMIT 1),
    (SELECT i.enjeux FROM indicators i WHERE i.code = site_global_indicator_values_simple.code)
  ),
  normes = COALESCE(
    (SELECT ssici.standard_name 
     FROM indicators i 
     LEFT JOIN sector_standards_issues_criteria_indicators ssici 
       ON i.code = ANY(ssici.indicator_codes)
     WHERE i.code = site_global_indicator_values_simple.code 
     LIMIT 1),
    (SELECT i.normes FROM indicators i WHERE i.code = site_global_indicator_values_simple.code)
  ),
  critere = COALESCE(
    (SELECT ssici.criteria_name 
     FROM indicators i 
     LEFT JOIN sector_standards_issues_criteria_indicators ssici 
       ON i.code = ANY(ssici.indicator_codes)
     WHERE i.code = site_global_indicator_values_simple.code 
     LIMIT 1),
    (SELECT i.critere FROM indicators i WHERE i.code = site_global_indicator_values_simple.code)
  )
WHERE 
  axe_energetique IS NULL 
  OR enjeux IS NULL 
  OR normes IS NULL 
  OR critere IS NULL;