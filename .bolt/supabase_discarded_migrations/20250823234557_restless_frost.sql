/*
  # Mise à jour de la fonction de récupération des métadonnées d'indicateurs

  1. Modifications
    - Met à jour la fonction auto_update_indicator_metadata() pour récupérer les données depuis les bonnes tables
    - axe_energetique depuis la table issues
    - enjeux depuis sector_standards_issues_criteria_indicators
    - normes depuis sector_standards_issues_criteria_indicators
    - critere depuis sector_standards_issues_criteria_indicators

  2. Logique
    - Recherche d'abord dans sector_standards_issues_criteria_indicators
    - Récupère axe_energetique depuis issues en utilisant issue_name
    - Utilise les données directement disponibles dans sector_standards_issues_criteria_indicators
*/

-- Supprimer l'ancienne fonction
DROP FUNCTION IF EXISTS auto_update_indicator_metadata();

-- Créer la nouvelle fonction mise à jour
CREATE OR REPLACE FUNCTION auto_update_indicator_metadata()
RETURNS TRIGGER AS $$
BEGIN
  -- Récupérer les métadonnées depuis sector_standards_issues_criteria_indicators
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
  FROM sector_standards_issues_criteria_indicators ssici
  LEFT JOIN issues i ON i.name = ssici.issue_name
  WHERE NEW.code = ANY(ssici.indicator_codes)
  LIMIT 1;

  -- Si aucune donnée trouvée dans sector_standards_issues_criteria_indicators,
  -- utiliser les données de base depuis indicators
  IF NEW.axe_energetique IS NULL OR NEW.enjeux IS NULL OR NEW.normes IS NULL OR NEW.critere IS NULL THEN
    SELECT 
      COALESCE(NEW.axe_energetique, ind.axe_energetique),
      COALESCE(NEW.enjeux, ind.enjeux),
      COALESCE(NEW.normes, ind.normes),
      COALESCE(NEW.critere, ind.critere),
      COALESCE(NEW.indicateur, ind.name),
      COALESCE(NEW.definition, ind.description),
      COALESCE(NEW.processus, proc.name),
      COALESCE(NEW.processus_code, ind.processus_code),
      COALESCE(NEW.frequence, ind.frequence),
      COALESCE(NEW.unite, ind.unit),
      COALESCE(NEW.type, ind.type),
      COALESCE(NEW.formule, ind.formule)
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
    FROM indicators ind
    LEFT JOIN processus proc ON proc.code = ind.processus_code
    WHERE ind.code = NEW.code;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Mettre à jour les données existantes avec la nouvelle logique
UPDATE site_global_indicator_values_simple 
SET 
  axe_energetique = subquery.axe_energetique,
  enjeux = subquery.enjeux,
  normes = subquery.normes,
  critere = subquery.critere
FROM (
  SELECT 
    sgiv.id,
    COALESCE(i.axe_energetique, ind.axe_energetique) as axe_energetique,
    COALESCE(ssici.issue_name, ind.enjeux) as enjeux,
    COALESCE(ssici.standard_name, ind.normes) as normes,
    COALESCE(ssici.criteria_name, ind.critere) as critere
  FROM site_global_indicator_values_simple sgiv
  LEFT JOIN indicators ind ON ind.code = sgiv.code
  LEFT JOIN sector_standards_issues_criteria_indicators ssici ON sgiv.code = ANY(ssici.indicator_codes)
  LEFT JOIN issues i ON i.name = ssici.issue_name
  WHERE sgiv.axe_energetique IS NULL 
     OR sgiv.enjeux IS NULL 
     OR sgiv.normes IS NULL 
     OR sgiv.critere IS NULL
) subquery
WHERE site_global_indicator_values_simple.id = subquery.id;