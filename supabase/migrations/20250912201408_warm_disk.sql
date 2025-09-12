/*
  # Synchronisation des données validées vers site_global_indicator_values_simple

  1. Fonction de synchronisation
    - Synchronise les données validées de indicator_values vers site_global_indicator_values_simple
    - Calcule les valeurs mensuelles et annuelles
    - Met à jour les métadonnées des indicateurs

  2. Trigger automatique
    - Se déclenche lors de la validation des données (status = 'validated')
    - Synchronise immédiatement les nouvelles données validées

  3. Fonction de synchronisation manuelle
    - Permet de synchroniser toutes les données existantes
    - Utile pour la migration initiale
*/

-- Fonction pour synchroniser les données validées
CREATE OR REPLACE FUNCTION sync_validated_indicator_values()
RETURNS TRIGGER AS $$
DECLARE
  indicator_metadata RECORD;
  site_record RECORD;
  period_info RECORD;
  existing_record RECORD;
BEGIN
  -- Ne traiter que les données validées
  IF NEW.status != 'validated' THEN
    RETURN NEW;
  END IF;

  -- Récupérer les métadonnées de l'indicateur
  SELECT 
    i.name as indicateur,
    i.description as definition,
    i.unit as unite,
    i.type,
    i.axe_energetique,
    i.enjeux,
    i.normes,
    i.critere,
    i.frequence,
    i.formule,
    i.processus_code
  INTO indicator_metadata
  FROM indicators i
  WHERE i.code = NEW.indicator_code;

  -- Récupérer les informations du site
  SELECT 
    s.organization_name,
    s.filiere_name,
    s.filiale_name
  INTO site_record
  FROM sites s
  WHERE s.name = NEW.site_name;

  -- Récupérer les informations de la période
  SELECT 
    cp.year,
    cp.period_number,
    cp.period_type
  INTO period_info
  FROM collection_periods cp
  WHERE cp.id = NEW.period_id;

  -- Vérifier si un enregistrement existe déjà
  SELECT *
  INTO existing_record
  FROM site_global_indicator_values_simple
  WHERE site_name = NEW.site_name
    AND code = NEW.indicator_code
    AND year = period_info.year;

  IF existing_record.id IS NOT NULL THEN
    -- Mettre à jour l'enregistrement existant
    UPDATE site_global_indicator_values_simple
    SET
      value = NEW.value,
      unite = NEW.unit,
      -- Mettre à jour le mois correspondant si c'est une période mensuelle
      janvier = CASE WHEN period_info.period_number = 1 AND period_info.period_type = 'month' THEN NEW.value ELSE janvier END,
      fevrier = CASE WHEN period_info.period_number = 2 AND period_info.period_type = 'month' THEN NEW.value ELSE fevrier END,
      mars = CASE WHEN period_info.period_number = 3 AND period_info.period_type = 'month' THEN NEW.value ELSE mars END,
      avril = CASE WHEN period_info.period_number = 4 AND period_info.period_type = 'month' THEN NEW.value ELSE avril END,
      mai = CASE WHEN period_info.period_number = 5 AND period_info.period_type = 'month' THEN NEW.value ELSE mai END,
      juin = CASE WHEN period_info.period_number = 6 AND period_info.period_type = 'month' THEN NEW.value ELSE juin END,
      juillet = CASE WHEN period_info.period_number = 7 AND period_info.period_type = 'month' THEN NEW.value ELSE juillet END,
      aout = CASE WHEN period_info.period_number = 8 AND period_info.period_type = 'month' THEN NEW.value ELSE aout END,
      septembre = CASE WHEN period_info.period_number = 9 AND period_info.period_type = 'month' THEN NEW.value ELSE septembre END,
      octobre = CASE WHEN period_info.period_number = 10 AND period_info.period_type = 'month' THEN NEW.value ELSE octobre END,
      novembre = CASE WHEN period_info.period_number = 11 AND period_info.period_type = 'month' THEN NEW.value ELSE novembre END,
      decembre = CASE WHEN period_info.period_number = 12 AND period_info.period_type = 'month' THEN NEW.value ELSE decembre END,
      updated_at = NOW()
    WHERE id = existing_record.id;
  ELSE
    -- Créer un nouvel enregistrement
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
      filiale_name
    ) VALUES (
      NEW.site_name,
      period_info.year,
      NEW.indicator_code,
      indicator_metadata.axe_energetique,
      indicator_metadata.enjeux,
      indicator_metadata.normes,
      indicator_metadata.critere,
      indicator_metadata.indicateur,
      indicator_metadata.definition,
      (SELECT name FROM processus WHERE code = indicator_metadata.processus_code),
      indicator_metadata.processus_code,
      indicator_metadata.frequence,
      NEW.unit,
      indicator_metadata.type,
      indicator_metadata.formule,
      NEW.value,
      NULL, -- valeur_precedente à calculer séparément
      100, -- cible par défaut
      NULL, -- variation à calculer séparément
      -- Valeurs mensuelles
      CASE WHEN period_info.period_number = 1 AND period_info.period_type = 'month' THEN NEW.value ELSE NULL END,
      CASE WHEN period_info.period_number = 2 AND period_info.period_type = 'month' THEN NEW.value ELSE NULL END,
      CASE WHEN period_info.period_number = 3 AND period_info.period_type = 'month' THEN NEW.value ELSE NULL END,
      CASE WHEN period_info.period_number = 4 AND period_info.period_type = 'month' THEN NEW.value ELSE NULL END,
      CASE WHEN period_info.period_number = 5 AND period_info.period_type = 'month' THEN NEW.value ELSE NULL END,
      CASE WHEN period_info.period_number = 6 AND period_info.period_type = 'month' THEN NEW.value ELSE NULL END,
      CASE WHEN period_info.period_number = 7 AND period_info.period_type = 'month' THEN NEW.value ELSE NULL END,
      CASE WHEN period_info.period_number = 8 AND period_info.period_type = 'month' THEN NEW.value ELSE NULL END,
      CASE WHEN period_info.period_number = 9 AND period_info.period_type = 'month' THEN NEW.value ELSE NULL END,
      CASE WHEN period_info.period_number = 10 AND period_info.period_type = 'month' THEN NEW.value ELSE NULL END,
      CASE WHEN period_info.period_number = 11 AND period_info.period_type = 'month' THEN NEW.value ELSE NULL END,
      CASE WHEN period_info.period_number = 12 AND period_info.period_type = 'month' THEN NEW.value ELSE NULL END,
      site_record.organization_name,
      site_record.filiere_name,
      site_record.filiale_name
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Créer le trigger pour synchroniser automatiquement
DROP TRIGGER IF EXISTS trigger_sync_validated_indicator_values ON indicator_values;
CREATE TRIGGER trigger_sync_validated_indicator_values
  AFTER UPDATE OF status ON indicator_values
  FOR EACH ROW
  WHEN (NEW.status = 'validated')
  EXECUTE FUNCTION sync_validated_indicator_values();

-- Fonction pour synchroniser toutes les données validées existantes
CREATE OR REPLACE FUNCTION sync_all_validated_indicator_values()
RETURNS INTEGER AS $$
DECLARE
  validated_record RECORD;
  synced_count INTEGER := 0;
BEGIN
  -- Parcourir toutes les données validées
  FOR validated_record IN
    SELECT DISTINCT
      iv.*,
      cp.year,
      cp.period_number,
      cp.period_type
    FROM indicator_values iv
    JOIN collection_periods cp ON cp.id = iv.period_id
    WHERE iv.status = 'validated'
      AND iv.site_name IS NOT NULL
      AND iv.indicator_code IS NOT NULL
  LOOP
    -- Appeler la fonction de synchronisation pour chaque enregistrement
    PERFORM sync_validated_indicator_values_manual(
      validated_record.site_name,
      validated_record.indicator_code,
      validated_record.value,
      validated_record.unit,
      validated_record.year,
      validated_record.period_number,
      validated_record.period_type,
      validated_record.organization_name,
      validated_record.filiere_name,
      validated_record.filiale_name
    );
    
    synced_count := synced_count + 1;
  END LOOP;

  RETURN synced_count;
END;
$$ LANGUAGE plpgsql;

-- Fonction helper pour la synchronisation manuelle
CREATE OR REPLACE FUNCTION sync_validated_indicator_values_manual(
  p_site_name TEXT,
  p_indicator_code TEXT,
  p_value NUMERIC,
  p_unit TEXT,
  p_year INTEGER,
  p_period_number INTEGER,
  p_period_type TEXT,
  p_organization_name TEXT,
  p_filiere_name TEXT,
  p_filiale_name TEXT
)
RETURNS VOID AS $$
DECLARE
  indicator_metadata RECORD;
  existing_record RECORD;
BEGIN
  -- Récupérer les métadonnées de l'indicateur
  SELECT 
    i.name as indicateur,
    i.description as definition,
    i.unit as unite,
    i.type,
    i.axe_energetique,
    i.enjeux,
    i.normes,
    i.critere,
    i.frequence,
    i.formule,
    i.processus_code
  INTO indicator_metadata
  FROM indicators i
  WHERE i.code = p_indicator_code;

  -- Vérifier si un enregistrement existe déjà
  SELECT *
  INTO existing_record
  FROM site_global_indicator_values_simple
  WHERE site_name = p_site_name
    AND code = p_indicator_code
    AND year = p_year;

  IF existing_record.id IS NOT NULL THEN
    -- Mettre à jour l'enregistrement existant
    UPDATE site_global_indicator_values_simple
    SET
      value = p_value,
      unite = p_unit,
      -- Mettre à jour le mois correspondant si c'est une période mensuelle
      janvier = CASE WHEN p_period_number = 1 AND p_period_type = 'month' THEN p_value ELSE janvier END,
      fevrier = CASE WHEN p_period_number = 2 AND p_period_type = 'month' THEN p_value ELSE fevrier END,
      mars = CASE WHEN p_period_number = 3 AND p_period_type = 'month' THEN p_value ELSE mars END,
      avril = CASE WHEN p_period_number = 4 AND p_period_type = 'month' THEN p_value ELSE avril END,
      mai = CASE WHEN p_period_number = 5 AND p_period_type = 'month' THEN p_value ELSE mai END,
      juin = CASE WHEN p_period_number = 6 AND p_period_type = 'month' THEN p_value ELSE juin END,
      juillet = CASE WHEN p_period_number = 7 AND p_period_type = 'month' THEN p_value ELSE juillet END,
      aout = CASE WHEN p_period_number = 8 AND p_period_type = 'month' THEN p_value ELSE aout END,
      septembre = CASE WHEN p_period_number = 9 AND p_period_type = 'month' THEN p_value ELSE septembre END,
      octobre = CASE WHEN p_period_number = 10 AND p_period_type = 'month' THEN p_value ELSE octobre END,
      novembre = CASE WHEN p_period_number = 11 AND p_period_type = 'month' THEN p_value ELSE novembre END,
      decembre = CASE WHEN p_period_number = 12 AND p_period_type = 'month' THEN p_value ELSE decembre END,
      updated_at = NOW()
    WHERE id = existing_record.id;
  ELSE
    -- Créer un nouvel enregistrement
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
      filiale_name
    ) VALUES (
      p_site_name,
      p_year,
      p_indicator_code,
      indicator_metadata.axe_energetique,
      indicator_metadata.enjeux,
      indicator_metadata.normes,
      indicator_metadata.critere,
      indicator_metadata.indicateur,
      indicator_metadata.definition,
      (SELECT name FROM processus WHERE code = indicator_metadata.processus_code),
      indicator_metadata.processus_code,
      indicator_metadata.frequence,
      p_unit,
      indicator_metadata.type,
      indicator_metadata.formule,
      p_value,
      NULL, -- valeur_precedente à calculer séparément
      100, -- cible par défaut
      NULL, -- variation à calculer séparément
      -- Valeurs mensuelles
      CASE WHEN p_period_number = 1 AND p_period_type = 'month' THEN p_value ELSE NULL END,
      CASE WHEN p_period_number = 2 AND p_period_type = 'month' THEN p_value ELSE NULL END,
      CASE WHEN p_period_number = 3 AND p_period_type = 'month' THEN p_value ELSE NULL END,
      CASE WHEN p_period_number = 4 AND p_period_type = 'month' THEN p_value ELSE NULL END,
      CASE WHEN p_period_number = 5 AND p_period_type = 'month' THEN p_value ELSE NULL END,
      CASE WHEN p_period_number = 6 AND p_period_type = 'month' THEN p_value ELSE NULL END,
      CASE WHEN p_period_number = 7 AND p_period_type = 'month' THEN p_value ELSE NULL END,
      CASE WHEN p_period_number = 8 AND p_period_type = 'month' THEN p_value ELSE NULL END,
      CASE WHEN p_period_number = 9 AND p_period_type = 'month' THEN p_value ELSE NULL END,
      CASE WHEN p_period_number = 10 AND p_period_type = 'month' THEN p_value ELSE NULL END,
      CASE WHEN p_period_number = 11 AND p_period_type = 'month' THEN p_value ELSE NULL END,
      CASE WHEN p_period_number = 12 AND p_period_type = 'month' THEN p_value ELSE NULL END,
      p_organization_name,
      p_filiere_name,
      p_filiale_name
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Créer le trigger pour synchroniser automatiquement les données validées
DROP TRIGGER IF EXISTS trigger_sync_validated_to_simple ON indicator_values;
CREATE TRIGGER trigger_sync_validated_to_simple
  AFTER UPDATE OF status ON indicator_values
  FOR EACH ROW
  WHEN (NEW.status = 'validated' AND OLD.status != 'validated')
  EXECUTE FUNCTION sync_validated_indicator_values();

-- Fonction pour synchroniser toutes les données validées existantes (migration)
CREATE OR REPLACE FUNCTION migrate_all_validated_data()
RETURNS TABLE(synced_count INTEGER, error_count INTEGER) AS $$
DECLARE
  validated_record RECORD;
  sync_count INTEGER := 0;
  err_count INTEGER := 0;
  indicator_metadata RECORD;
  site_record RECORD;
  period_info RECORD;
  existing_record RECORD;
BEGIN
  -- Parcourir toutes les données validées
  FOR validated_record IN
    SELECT DISTINCT
      iv.*,
      cp.year,
      cp.period_number,
      cp.period_type
    FROM indicator_values iv
    JOIN collection_periods cp ON cp.id = iv.period_id
    WHERE iv.status = 'validated'
      AND iv.site_name IS NOT NULL
      AND iv.indicator_code IS NOT NULL
    ORDER BY iv.created_at
  LOOP
    BEGIN
      -- Récupérer les métadonnées de l'indicateur
      SELECT 
        i.name as indicateur,
        i.description as definition,
        i.unit as unite,
        i.type,
        i.axe_energetique,
        i.enjeux,
        i.normes,
        i.critere,
        i.frequence,
        i.formule,
        i.processus_code
      INTO indicator_metadata
      FROM indicators i
      WHERE i.code = validated_record.indicator_code;

      -- Récupérer les informations du site
      SELECT 
        s.organization_name,
        s.filiere_name,
        s.filiale_name
      INTO site_record
      FROM sites s
      WHERE s.name = validated_record.site_name;

      -- Vérifier si un enregistrement existe déjà
      SELECT *
      INTO existing_record
      FROM site_global_indicator_values_simple
      WHERE site_name = validated_record.site_name
        AND code = validated_record.indicator_code
        AND year = validated_record.year;

      IF existing_record.id IS NOT NULL THEN
        -- Mettre à jour l'enregistrement existant
        UPDATE site_global_indicator_values_simple
        SET
          value = validated_record.value,
          unite = validated_record.unit,
          -- Mettre à jour le mois correspondant si c'est une période mensuelle
          janvier = CASE WHEN validated_record.period_number = 1 AND validated_record.period_type = 'month' THEN validated_record.value ELSE janvier END,
          fevrier = CASE WHEN validated_record.period_number = 2 AND validated_record.period_type = 'month' THEN validated_record.value ELSE fevrier END,
          mars = CASE WHEN validated_record.period_number = 3 AND validated_record.period_type = 'month' THEN validated_record.value ELSE mars END,
          avril = CASE WHEN validated_record.period_number = 4 AND validated_record.period_type = 'month' THEN validated_record.value ELSE avril END,
          mai = CASE WHEN validated_record.period_number = 5 AND validated_record.period_type = 'month' THEN validated_record.value ELSE mai END,
          juin = CASE WHEN validated_record.period_number = 6 AND validated_record.period_type = 'month' THEN validated_record.value ELSE juin END,
          juillet = CASE WHEN validated_record.period_number = 7 AND validated_record.period_type = 'month' THEN validated_record.value ELSE juillet END,
          aout = CASE WHEN validated_record.period_number = 8 AND validated_record.period_type = 'month' THEN validated_record.value ELSE aout END,
          septembre = CASE WHEN validated_record.period_number = 9 AND validated_record.period_type = 'month' THEN validated_record.value ELSE septembre END,
          octobre = CASE WHEN validated_record.period_number = 10 AND validated_record.period_type = 'month' THEN validated_record.value ELSE octobre END,
          novembre = CASE WHEN validated_record.period_number = 11 AND validated_record.period_type = 'month' THEN validated_record.value ELSE novembre END,
          decembre = CASE WHEN validated_record.period_number = 12 AND validated_record.period_type = 'month' THEN validated_record.value ELSE decembre END,
          updated_at = NOW()
        WHERE id = existing_record.id;
      ELSE
        -- Créer un nouvel enregistrement
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
          filiale_name
        ) VALUES (
          validated_record.site_name,
          validated_record.year,
          validated_record.indicator_code,
          indicator_metadata.axe_energetique,
          indicator_metadata.enjeux,
          indicator_metadata.normes,
          indicator_metadata.critere,
          indicator_metadata.indicateur,
          indicator_metadata.definition,
          (SELECT name FROM processus WHERE code = indicator_metadata.processus_code),
          indicator_metadata.processus_code,
          indicator_metadata.frequence,
          validated_record.unit,
          indicator_metadata.type,
          indicator_metadata.formule,
          validated_record.value,
          NULL, -- valeur_precedente à calculer séparément
          100, -- cible par défaut
          NULL, -- variation à calculer séparément
          -- Valeurs mensuelles
          CASE WHEN validated_record.period_number = 1 AND validated_record.period_type = 'month' THEN validated_record.value ELSE NULL END,
          CASE WHEN validated_record.period_number = 2 AND validated_record.period_type = 'month' THEN validated_record.value ELSE NULL END,
          CASE WHEN validated_record.period_number = 3 AND validated_record.period_type = 'month' THEN validated_record.value ELSE NULL END,
          CASE WHEN validated_record.period_number = 4 AND validated_record.period_type = 'month' THEN validated_record.value ELSE NULL END,
          CASE WHEN validated_record.period_number = 5 AND validated_record.period_type = 'month' THEN validated_record.value ELSE NULL END,
          CASE WHEN validated_record.period_number = 6 AND validated_record.period_type = 'month' THEN validated_record.value ELSE NULL END,
          CASE WHEN validated_record.period_number = 7 AND validated_record.period_type = 'month' THEN validated_record.value ELSE NULL END,
          CASE WHEN validated_record.period_number = 8 AND validated_record.period_type = 'month' THEN validated_record.value ELSE NULL END,
          CASE WHEN validated_record.period_number = 9 AND validated_record.period_type = 'month' THEN validated_record.value ELSE NULL END,
          CASE WHEN validated_record.period_number = 10 AND validated_record.period_type = 'month' THEN validated_record.value ELSE NULL END,
          CASE WHEN validated_record.period_number = 11 AND validated_record.period_type = 'month' THEN validated_record.value ELSE NULL END,
          CASE WHEN validated_record.period_number = 12 AND validated_record.period_type = 'month' THEN validated_record.value ELSE NULL END,
          p_organization_name,
          p_filiere_name,
          p_filiale_name
        );
      END IF;

      sync_count := sync_count + 1;
    EXCEPTION
      WHEN OTHERS THEN
        err_count := err_count + 1;
        -- Log l'erreur mais continuer
        RAISE NOTICE 'Erreur lors de la synchronisation de %: %', validated_record.indicator_code, SQLERRM;
    END;
  END LOOP;

  RETURN QUERY SELECT sync_count, err_count;
END;
$$ LANGUAGE plpgsql;

-- Exécuter la migration pour synchroniser les données existantes
SELECT migrate_all_validated_data();

-- Créer un index pour optimiser les performances du trigger
CREATE INDEX IF NOT EXISTS idx_indicator_values_validation_sync 
ON indicator_values(status, site_name, indicator_code) 
WHERE status = 'validated';

-- Analyser les tables pour optimiser les performances
ANALYZE indicator_values;
ANALYZE site_global_indicator_values_simple;
ANALYZE collection_periods;
ANALYZE indicators;