/*
  # Correction de la synchronisation indicator_values vers site_global_indicator_values_simple

  1. Fonctions
    - Fonction de synchronisation améliorée `sync_indicator_values_to_simple()`
    - Fonction de nettoyage et reconstruction `rebuild_simple_indicator_values()`

  2. Triggers
    - Mise à jour du trigger existant pour une meilleure synchronisation
    - Trigger pour maintenir la cohérence lors des modifications

  3. Synchronisation
    - Reconstruction complète des données dans site_global_indicator_values_simple
    - Mise à jour de toutes les métadonnées (axe_energetique, enjeux, etc.)

  4. Index
    - Optimisation des index pour améliorer les performances de synchronisation
*/

-- Fonction pour synchroniser les données d'indicator_values vers site_global_indicator_values_simple
CREATE OR REPLACE FUNCTION sync_indicator_values_to_simple()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Insérer ou mettre à jour les données dans site_global_indicator_values_simple
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
    valeur_precedente,
    cible,
    variation,
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
    filiale_name,
    variations_pourcent,
    performances_pourcent
  )
  SELECT DISTINCT
    iv.site_name,
    cp.year,
    iv.indicator_code as code,
    i.axe_energetique,
    i.enjeux,
    i.normes,
    i.critere,
    i.name as indicateur,
    i.description as definition,
    p.name as processus,
    iv.processus_code,
    i.frequence,
    i.unit as unite,
    i.type,
    i.formule,
    iv.value,
    NULL as valeur_precedente, -- Sera calculé par les triggers existants
    NULL as cible, -- Sera défini séparément
    NULL as variation, -- Sera calculé par les triggers existants
    CASE WHEN cp.period_number = 1 THEN iv.value END as janvier,
    CASE WHEN cp.period_number = 2 THEN iv.value END as fevrier,
    CASE WHEN cp.period_number = 3 THEN iv.value END as mars,
    CASE WHEN cp.period_number = 4 THEN iv.value END as avril,
    CASE WHEN cp.period_number = 5 THEN iv.value END as mai,
    CASE WHEN cp.period_number = 6 THEN iv.value END as juin,
    CASE WHEN cp.period_number = 7 THEN iv.value END as juillet,
    CASE WHEN cp.period_number = 8 THEN iv.value END as aout,
    CASE WHEN cp.period_number = 9 THEN iv.value END as septembre,
    CASE WHEN cp.period_number = 10 THEN iv.value END as octobre,
    CASE WHEN cp.period_number = 11 THEN iv.value END as novembre,
    CASE WHEN cp.period_number = 12 THEN iv.value END as decembre,
    iv.organization_name,
    iv.filiere_name,
    iv.filiale_name,
    NULL as variations_pourcent, -- Sera calculé par les triggers existants
    NULL as performances_pourcent -- Sera calculé par les triggers existants
  FROM indicator_values iv
  LEFT JOIN collection_periods cp ON iv.period_id = cp.id
  LEFT JOIN indicators i ON iv.indicator_code = i.code
  LEFT JOIN processus p ON iv.processus_code = p.code
  WHERE iv.site_name IS NOT NULL
    AND cp.year IS NOT NULL
    AND iv.indicator_code IS NOT NULL
  ON CONFLICT (site_name, code, year) 
  DO UPDATE SET
    value = EXCLUDED.value,
    axe_energetique = EXCLUDED.axe_energetique,
    enjeux = EXCLUDED.enjeux,
    normes = EXCLUDED.normes,
    critere = EXCLUDED.critere,
    indicateur = EXCLUDED.indicateur,
    definition = EXCLUDED.definition,
    processus = EXCLUDED.processus,
    processus_code = EXCLUDED.processus_code,
    frequence = EXCLUDED.frequence,
    unite = EXCLUDED.unite,
    type = EXCLUDED.type,
    formule = EXCLUDED.formule,
    organization_name = EXCLUDED.organization_name,
    filiere_name = EXCLUDED.filiere_name,
    filiale_name = EXCLUDED.filiale_name,
    updated_at = now();

  -- Consolider les valeurs mensuelles pour chaque combinaison site/indicateur/année
  UPDATE site_global_indicator_values_simple 
  SET 
    janvier = monthly_data.janvier,
    fevrier = monthly_data.fevrier,
    mars = monthly_data.mars,
    avril = monthly_data.avril,
    mai = monthly_data.mai,
    juin = monthly_data.juin,
    juillet = monthly_data.juillet,
    aout = monthly_data.aout,
    septembre = monthly_data.septembre,
    octobre = monthly_data.octobre,
    novembre = monthly_data.novembre,
    decembre = monthly_data.decembre,
    value = monthly_data.total_value
  FROM (
    SELECT 
      iv.site_name,
      iv.indicator_code,
      cp.year,
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
      SUM(iv.value) as total_value
    FROM indicator_values iv
    LEFT JOIN collection_periods cp ON iv.period_id = cp.id
    WHERE iv.site_name IS NOT NULL 
      AND cp.year IS NOT NULL
      AND iv.value IS NOT NULL
    GROUP BY iv.site_name, iv.indicator_code, cp.year
  ) monthly_data
  WHERE site_global_indicator_values_simple.site_name = monthly_data.site_name
    AND site_global_indicator_values_simple.code = monthly_data.indicator_code
    AND site_global_indicator_values_simple.year = monthly_data.year;

  RAISE NOTICE 'Synchronisation terminée avec succès';
END;
$$;

-- Fonction pour reconstruire complètement la table site_global_indicator_values_simple
CREATE OR REPLACE FUNCTION rebuild_simple_indicator_values()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  affected_rows INTEGER;
BEGIN
  -- Vider la table site_global_indicator_values_simple
  DELETE FROM site_global_indicator_values_simple;
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  RAISE NOTICE 'Supprimé % lignes de site_global_indicator_values_simple', affected_rows;

  -- Reconstruire les données
  PERFORM sync_indicator_values_to_simple();
  
  -- Compter les nouvelles lignes
  SELECT COUNT(*) INTO affected_rows FROM site_global_indicator_values_simple;
  RAISE NOTICE 'Inséré % nouvelles lignes dans site_global_indicator_values_simple', affected_rows;
END;
$$;

-- Améliorer le trigger existant pour une meilleure synchronisation
DROP TRIGGER IF EXISTS trigger_sync_indicator_values_fixed ON indicator_values;

CREATE OR REPLACE FUNCTION trigger_sync_indicator_values()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  target_year INTEGER;
  target_site_name TEXT;
  target_indicator_code TEXT;
BEGIN
  -- Déterminer les valeurs à utiliser selon l'opération
  IF TG_OP = 'DELETE' THEN
    -- Pour les suppressions, utiliser OLD
    SELECT cp.year INTO target_year
    FROM collection_periods cp 
    WHERE cp.id = OLD.period_id;
    
    target_site_name := OLD.site_name;
    target_indicator_code := OLD.indicator_code;
  ELSE
    -- Pour les insertions et mises à jour, utiliser NEW
    SELECT cp.year INTO target_year
    FROM collection_periods cp 
    WHERE cp.id = NEW.period_id;
    
    target_site_name := NEW.site_name;
    target_indicator_code := NEW.indicator_code;
  END IF;

  -- Ne traiter que si nous avons les informations nécessaires
  IF target_site_name IS NOT NULL AND target_indicator_code IS NOT NULL AND target_year IS NOT NULL THEN
    
    -- Supprimer l'enregistrement existant s'il y en a un
    DELETE FROM site_global_indicator_values_simple 
    WHERE site_name = target_site_name 
      AND code = target_indicator_code 
      AND year = target_year;

    -- Recréer l'enregistrement avec les données consolidées
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

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Recréer le trigger avec la fonction améliorée
CREATE TRIGGER trigger_sync_indicator_values_improved
  AFTER INSERT OR UPDATE OR DELETE ON indicator_values
  FOR EACH ROW
  EXECUTE FUNCTION trigger_sync_indicator_values();

-- Fonction pour mettre à jour la hiérarchie dans indicator_values
CREATE OR REPLACE FUNCTION update_indicator_values_hierarchy_from_sites()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  affected_rows INTEGER;
BEGIN
  -- Mettre à jour filiale_name et filiere_name depuis la table sites
  UPDATE indicator_values 
  SET 
    filiale_name = s.filiale_name,
    filiere_name = s.filiere_name
  FROM sites s
  WHERE indicator_values.site_name = s.name
    AND indicator_values.organization_name = s.organization_name
    AND (
      indicator_values.filiale_name IS DISTINCT FROM s.filiale_name OR
      indicator_values.filiere_name IS DISTINCT FROM s.filiere_name
    );
  
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  RAISE NOTICE 'Mis à jour % lignes dans indicator_values avec la hiérarchie depuis sites', affected_rows;
END;
$$;

-- Exécuter la mise à jour de la hiérarchie
SELECT update_indicator_values_hierarchy_from_sites();

-- Reconstruire complètement site_global_indicator_values_simple
SELECT rebuild_simple_indicator_values();

-- Créer un index pour optimiser les requêtes de synchronisation
CREATE INDEX IF NOT EXISTS idx_indicator_values_sync_lookup 
ON indicator_values (site_name, indicator_code, organization_name) 
WHERE site_name IS NOT NULL AND indicator_code IS NOT NULL;

-- Index pour les périodes de collecte
CREATE INDEX IF NOT EXISTS idx_collection_periods_lookup 
ON collection_periods (id, year, period_number);

-- Fonction pour vérifier la cohérence des données
CREATE OR REPLACE FUNCTION check_indicator_sync_status()
RETURNS TABLE (
  indicator_values_count BIGINT,
  simple_values_count BIGINT,
  missing_in_simple BIGINT,
  status TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
  iv_count BIGINT;
  simple_count BIGINT;
  missing_count BIGINT;
BEGIN
  -- Compter les enregistrements dans indicator_values avec site_name
  SELECT COUNT(DISTINCT (site_name, indicator_code, cp.year))
  INTO iv_count
  FROM indicator_values iv
  LEFT JOIN collection_periods cp ON iv.period_id = cp.id
  WHERE iv.site_name IS NOT NULL 
    AND iv.indicator_code IS NOT NULL 
    AND cp.year IS NOT NULL;

  -- Compter les enregistrements dans site_global_indicator_values_simple
  SELECT COUNT(*)
  INTO simple_count
  FROM site_global_indicator_values_simple;

  -- Compter les enregistrements manquants
  SELECT COUNT(DISTINCT (iv.site_name, iv.indicator_code, cp.year))
  INTO missing_count
  FROM indicator_values iv
  LEFT JOIN collection_periods cp ON iv.period_id = cp.id
  LEFT JOIN site_global_indicator_values_simple sgiv 
    ON iv.site_name = sgiv.site_name 
    AND iv.indicator_code = sgiv.code 
    AND cp.year = sgiv.year
  WHERE iv.site_name IS NOT NULL 
    AND iv.indicator_code IS NOT NULL 
    AND cp.year IS NOT NULL
    AND sgiv.id IS NULL;

  RETURN QUERY SELECT 
    iv_count,
    simple_count,
    missing_count,
    CASE 
      WHEN missing_count = 0 THEN 'SYNC_OK'
      WHEN missing_count > 0 THEN 'SYNC_NEEDED'
      ELSE 'UNKNOWN'
    END;
END;
$$;

-- Vérifier le statut de synchronisation
SELECT * FROM check_indicator_sync_status();

-- Créer une vue pour faciliter le monitoring
CREATE OR REPLACE VIEW indicator_sync_monitoring AS
SELECT 
  iv.site_name,
  iv.indicator_code,
  cp.year,
  cp.period_number,
  iv.value as indicator_value,
  sgiv.value as simple_value,
  CASE 
    WHEN sgiv.id IS NULL THEN 'MISSING_IN_SIMPLE'
    WHEN iv.value IS DISTINCT FROM sgiv.value THEN 'VALUE_MISMATCH'
    ELSE 'SYNC_OK'
  END as sync_status
FROM indicator_values iv
LEFT JOIN collection_periods cp ON iv.period_id = cp.id
LEFT JOIN site_global_indicator_values_simple sgiv 
  ON iv.site_name = sgiv.site_name 
  AND iv.indicator_code = sgiv.code 
  AND cp.year = sgiv.year
WHERE iv.site_name IS NOT NULL 
  AND iv.indicator_code IS NOT NULL 
  AND cp.year IS NOT NULL
ORDER BY iv.site_name, iv.indicator_code, cp.year, cp.period_number;

RAISE NOTICE 'Migration terminée. Utilisez "SELECT * FROM check_indicator_sync_status();" pour vérifier le statut de synchronisation.';