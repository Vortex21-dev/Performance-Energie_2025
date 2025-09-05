/*
  # Correction de la récursion infinie dans les triggers

  1. Problème identifié
    - Les triggers se déclenchent mutuellement causant une récursion infinie
    - Le trigger sur indicator_values déclenche des mises à jour qui redéclenchent le trigger

  2. Solution
    - Désactiver temporairement les triggers problématiques
    - Recréer des triggers plus simples et sécurisés
    - Éviter les cascades de triggers
*/

-- Désactiver temporairement tous les triggers problématiques sur indicator_values
DROP TRIGGER IF EXISTS trigger_sync_indicator_values_fixed ON indicator_values;
DROP TRIGGER IF EXISTS trigger_sync_indicator_values_improved ON indicator_values;
DROP TRIGGER IF EXISTS trigger_update_valeur_precedente ON indicator_values;
DROP TRIGGER IF EXISTS trigger_update_indicator_values_hierarchy ON indicator_values;

-- Désactiver les triggers sur site_global_indicator_values_simple qui peuvent causer des boucles
DROP TRIGGER IF EXISTS trigger_auto_consolidate_sites ON site_global_indicator_values_simple;
DROP TRIGGER IF EXISTS trigger_sync_site_performance_criteres ON site_global_indicator_values_simple;
DROP TRIGGER IF EXISTS trigger_update_site_performances_on_indicator_change ON site_global_indicator_values_simple;

-- Désactiver le trigger sur site_consolidation
DROP TRIGGER IF EXISTS trigger_consolidate_sites_from_simple ON site_consolidation;

-- Créer une fonction de synchronisation simple et sécurisée
CREATE OR REPLACE FUNCTION sync_indicator_to_simple_safe()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  target_year INTEGER;
  target_site_name TEXT;
  target_indicator_code TEXT;
BEGIN
  -- Éviter la récursion en vérifiant si nous sommes déjà dans un trigger
  IF current_setting('app.in_trigger', true) = 'true' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Marquer que nous sommes dans un trigger
  PERFORM set_config('app.in_trigger', 'true', true);

  -- Déterminer les valeurs selon l'opération
  IF TG_OP = 'DELETE' THEN
    SELECT cp.year INTO target_year
    FROM collection_periods cp 
    WHERE cp.id = OLD.period_id;
    target_site_name := OLD.site_name;
    target_indicator_code := OLD.indicator_code;
  ELSE
    SELECT cp.year INTO target_year
    FROM collection_periods cp 
    WHERE cp.id = NEW.period_id;
    target_site_name := NEW.site_name;
    target_indicator_code := NEW.indicator_code;
  END IF;

  -- Ne traiter que si nous avons les informations nécessaires
  IF target_site_name IS NOT NULL AND target_indicator_code IS NOT NULL AND target_year IS NOT NULL THEN
    
    -- Supprimer l'enregistrement existant
    DELETE FROM site_global_indicator_values_simple 
    WHERE site_name = target_site_name 
      AND code = target_indicator_code 
      AND year = target_year;

    -- Recréer l'enregistrement si ce n'est pas une suppression
    IF TG_OP != 'DELETE' THEN
      INSERT INTO site_global_indicator_values_simple (
        site_name,
        year,
        code,
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
        formule,
        value,
        janvier,
        fevrier,
        mars,
        avril,
        mai,
        juin,
        juillet,
        aout,
        septembre,
        octobre,
        novembre,
        decembre,
        organization_name,
        filiere_name,
        filiale_name
      )
      SELECT 
        target_site_name,
        target_year,
        target_indicator_code,
        i.axe_energetique,
        i.enjeux,
        i.normes,
        i.critere,
        i.name as indicateur,
        i.description as definition,
        p.name as processus,
        i.processus_code,
        i.frequence,
        i.unit as unite,
        i.type,
        i.formule,
        SUM(iv.value) as value,
        SUM(CASE WHEN cp.period_number = 1 THEN iv.value END) as janvier,
        SUM(CASE WHEN cp.period_number = 2 THEN iv.value END) as fevrier,
        SUM(CASE WHEN cp.period_number = 3 THEN iv.value END) as mars,
        SUM(CASE WHEN cp.period_number = 4 THEN iv.value END) as avril,
        SUM(CASE WHEN cp.period_number = 5 THEN iv.value END) as mai,
        SUM(CASE WHEN cp.period_number = 6 THEN iv.value END) as juin,
        SUM(CASE WHEN cp.period_number = 7 THEN iv.value END) as juillet,
        SUM(CASE WHEN cp.period_number = 8 THEN iv.value END) as aout,
        SUM(CASE WHEN cp.period_number = 9 THEN iv.value END) as septembre,
        SUM(CASE WHEN cp.period_number = 10 THEN iv.value END) as octobre,
        SUM(CASE WHEN cp.period_number = 11 THEN iv.value END) as novembre,
        SUM(CASE WHEN cp.period_number = 12 THEN iv.value END) as decembre,
        iv.organization_name,
        iv.filiere_name,
        iv.filiale_name
      FROM indicator_values iv
      LEFT JOIN collection_periods cp ON iv.period_id = cp.id
      LEFT JOIN indicators i ON iv.indicator_code = i.code
      LEFT JOIN processus p ON iv.processus_code = p.code
      WHERE iv.site_name = target_site_name
        AND iv.indicator_code = target_indicator_code
        AND cp.year = target_year
        AND iv.value IS NOT NULL
      GROUP BY 
        iv.site_name, 
        iv.indicator_code, 
        cp.year,
        i.axe_energetique,
        i.enjeux,
        i.normes,
        i.critere,
        i.name,
        i.description,
        p.name,
        i.processus_code,
        i.frequence,
        i.unit,
        i.type,
        i.formule,
        iv.organization_name,
        iv.filiere_name,
        iv.filiale_name
      HAVING SUM(iv.value) IS NOT NULL;
    END IF;

  END IF;

  -- Réinitialiser le flag
  PERFORM set_config('app.in_trigger', 'false', true);

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Créer un trigger simple et sécurisé
CREATE TRIGGER trigger_sync_indicator_values_safe
  AFTER INSERT OR UPDATE OR DELETE ON indicator_values
  FOR EACH ROW
  EXECUTE FUNCTION sync_indicator_to_simple_safe();

-- Fonction pour mettre à jour la hiérarchie sans récursion
CREATE OR REPLACE FUNCTION update_hierarchy_safe()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Éviter la récursion
  IF current_setting('app.in_hierarchy_trigger', true) = 'true' THEN
    RETURN NEW;
  END IF;

  -- Marquer que nous sommes dans ce trigger
  PERFORM set_config('app.in_hierarchy_trigger', 'true', true);

  -- Mettre à jour la hiérarchie depuis sites si site_name est fourni
  IF NEW.site_name IS NOT NULL THEN
    SELECT s.filiale_name, s.filiere_name, s.organization_name
    INTO NEW.filiale_name, NEW.filiere_name, NEW.organization_name
    FROM sites s
    WHERE s.name = NEW.site_name;
  END IF;

  -- Réinitialiser le flag
  PERFORM set_config('app.in_hierarchy_trigger', 'false', true);

  RETURN NEW;
END;
$$;

-- Créer le trigger de hiérarchie sécurisé
CREATE TRIGGER trigger_update_indicator_values_hierarchy_safe
  BEFORE INSERT OR UPDATE OF site_name ON indicator_values
  FOR EACH ROW
  EXECUTE FUNCTION update_hierarchy_safe();

-- Fonction pour nettoyer les configurations de session
CREATE OR REPLACE FUNCTION cleanup_trigger_flags()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM set_config('app.in_trigger', 'false', true);
  PERFORM set_config('app.in_hierarchy_trigger', 'false', true);
END;
$$;

-- Nettoyer les flags au cas où ils seraient restés actifs
SELECT cleanup_trigger_flags();

-- Créer une fonction de synchronisation manuelle pour les cas où les triggers ne suffisent pas
CREATE OR REPLACE FUNCTION manual_sync_indicator_values(
  p_site_name TEXT DEFAULT NULL,
  p_indicator_code TEXT DEFAULT NULL,
  p_year INTEGER DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  sync_count INTEGER := 0;
BEGIN
  -- Supprimer les enregistrements existants selon les filtres
  DELETE FROM site_global_indicator_values_simple 
  WHERE (p_site_name IS NULL OR site_name = p_site_name)
    AND (p_indicator_code IS NULL OR code = p_indicator_code)
    AND (p_year IS NULL OR year = p_year);

  -- Insérer les nouvelles données consolidées
  INSERT INTO site_global_indicator_values_simple (
    site_name,
    year,
    code,
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
    formule,
    value,
    janvier,
    fevrier,
    mars,
    avril,
    mai,
    juin,
    juillet,
    aout,
    septembre,
    octobre,
    novembre,
    decembre,
    organization_name,
    filiere_name,
    filiale_name
  )
  SELECT 
    iv.site_name,
    cp.year,
    iv.indicator_code,
    i.axe_energetique,
    i.enjeux,
    i.normes,
    i.critere,
    i.name as indicateur,
    i.description as definition,
    p.name as processus,
    i.processus_code,
    i.frequence,
    i.unit as unite,
    i.type,
    i.formule,
    SUM(iv.value) as value,
    SUM(CASE WHEN cp.period_number = 1 THEN iv.value END) as janvier,
    SUM(CASE WHEN cp.period_number = 2 THEN iv.value END) as fevrier,
    SUM(CASE WHEN cp.period_number = 3 THEN iv.value END) as mars,
    SUM(CASE WHEN cp.period_number = 4 THEN iv.value END) as avril,
    SUM(CASE WHEN cp.period_number = 5 THEN iv.value END) as mai,
    SUM(CASE WHEN cp.period_number = 6 THEN iv.value END) as juin,
    SUM(CASE WHEN cp.period_number = 7 THEN iv.value END) as juillet,
    SUM(CASE WHEN cp.period_number = 8 THEN iv.value END) as aout,
    SUM(CASE WHEN cp.period_number = 9 THEN iv.value END) as septembre,
    SUM(CASE WHEN cp.period_number = 10 THEN iv.value END) as octobre,
    SUM(CASE WHEN cp.period_number = 11 THEN iv.value END) as novembre,
    SUM(CASE WHEN cp.period_number = 12 THEN iv.value END) as decembre,
    iv.organization_name,
    iv.filiere_name,
    iv.filiale_name
  FROM indicator_values iv
  LEFT JOIN collection_periods cp ON iv.period_id = cp.id
  LEFT JOIN indicators i ON iv.indicator_code = i.code
  LEFT JOIN processus p ON iv.processus_code = p.code
  WHERE iv.site_name IS NOT NULL 
    AND cp.year IS NOT NULL
    AND iv.value IS NOT NULL
    AND (p_site_name IS NULL OR iv.site_name = p_site_name)
    AND (p_indicator_code IS NULL OR iv.indicator_code = p_indicator_code)
    AND (p_year IS NULL OR cp.year = p_year)
  GROUP BY 
    iv.site_name, 
    iv.indicator_code, 
    cp.year,
    i.axe_energetique,
    i.enjeux,
    i.normes,
    i.critere,
    i.name,
    i.description,
    p.name,
    i.processus_code,
    i.frequence,
    i.unit,
    i.type,
    i.formule,
    iv.organization_name,
    iv.filiere_name,
    iv.filiale_name
  HAVING SUM(iv.value) IS NOT NULL;

  GET DIAGNOSTICS sync_count = ROW_COUNT;
  RAISE NOTICE 'Synchronisation manuelle terminée: % enregistrements traités', sync_count;
END;
$$;

-- Nettoyer les flags une dernière fois
SELECT cleanup_trigger_flags();

RAISE NOTICE 'Correction des triggers terminée. Les triggers récursifs ont été remplacés par des versions sécurisées.';
RAISE NOTICE 'Utilisez manual_sync_indicator_values() si une synchronisation manuelle est nécessaire.';