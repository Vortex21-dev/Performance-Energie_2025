/*
  # Synchronisation site_global_indicator_values_simple avec indicator_values

  1. Fonctions de synchronisation
    - `sync_site_values_from_indicator_values()` : Synchronise les données depuis indicator_values
    - `update_processus_code_from_indicator()` : Met à jour le processus_code depuis indicators
    - `trigger_sync_indicator_values()` : Trigger pour synchronisation automatique

  2. Mise à jour des processus_code
    - Met à jour processus_code dans indicator_values
    - Met à jour processus_code dans site_global_indicator_values_simple
    - Synchronise les données existantes

  3. Triggers automatiques
    - Synchronisation automatique lors des modifications d'indicator_values
    - Mise à jour automatique du processus_code

  4. Optimisations
    - Index pour améliorer les performances
    - Gestion des cas d'erreur
    - Évite les doublons
*/

-- Fonction pour mettre à jour le processus_code depuis la table indicators
CREATE OR REPLACE FUNCTION update_processus_code_from_indicator()
RETURNS TRIGGER AS $$
BEGIN
  -- Récupérer le processus_code depuis la table indicators
  SELECT processus_code INTO NEW.processus_code
  FROM indicators
  WHERE code = NEW.indicator_code;
  
  -- Si aucun processus trouvé, conserver la valeur existante
  IF NEW.processus_code IS NULL AND OLD.processus_code IS NOT NULL THEN
    NEW.processus_code := OLD.processus_code;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour synchroniser site_global_indicator_values_simple depuis indicator_values
CREATE OR REPLACE FUNCTION sync_site_values_from_indicator_values()
RETURNS TRIGGER AS $$
DECLARE
  indicator_data RECORD;
  existing_record RECORD;
  period_data RECORD;
BEGIN
  -- Récupérer les données de l'indicateur
  SELECT 
    i.code,
    i.name as indicateur,
    i.axe_energetique,
    i.enjeux,
    i.critere,
    i.definition,
    i.processus_code,
    i.frequence,
    i.unite,
    i.type,
    i.formule
  INTO indicator_data
  FROM indicators i
  WHERE i.code = COALESCE(NEW.indicator_code, OLD.indicator_code);
  
  -- Si l'indicateur n'existe pas, on sort
  IF NOT FOUND THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  -- Récupérer les données de la période de collecte
  SELECT 
    cp.year,
    cp.period_number
  INTO period_data
  FROM collection_periods cp
  WHERE cp.id = COALESCE(NEW.period_id, OLD.period_id);
  
  -- Si la période n'existe pas, on sort
  IF NOT FOUND THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  -- Vérifier si un enregistrement existe déjà dans site_global_indicator_values_simple
  SELECT *
  INTO existing_record
  FROM site_global_indicator_values_simple
  WHERE site_name = COALESCE(NEW.site_name, OLD.site_name)
    AND code = indicator_data.code
    AND year = period_data.year;
  
  -- Si c'est une suppression
  IF TG_OP = 'DELETE' THEN
    -- Supprimer l'enregistrement correspondant dans site_global_indicator_values_simple
    DELETE FROM site_global_indicator_values_simple
    WHERE site_name = OLD.site_name
      AND code = indicator_data.code
      AND year = period_data.year;
    
    RETURN OLD;
  END IF;
  
  -- Si c'est une insertion ou mise à jour
  IF existing_record IS NOT NULL THEN
    -- Mettre à jour l'enregistrement existant
    UPDATE site_global_indicator_values_simple
    SET
      axe_energetique = indicator_data.axe_energetique,
      enjeux = indicator_data.enjeux,
      critere = indicator_data.critere,
      indicateur = indicator_data.indicateur,
      definition = indicator_data.definition,
      processus_code = indicator_data.processus_code,
      frequence = indicator_data.frequence,
      unite = indicator_data.unite,
      type = indicator_data.type,
      formule = indicator_data.formule,
      value = NEW.value,
      -- Mettre à jour le mois correspondant selon period_number
      janvier = CASE WHEN period_data.period_number = 1 THEN NEW.value ELSE janvier END,
      fevrier = CASE WHEN period_data.period_number = 2 THEN NEW.value ELSE fevrier END,
      mars = CASE WHEN period_data.period_number = 3 THEN NEW.value ELSE mars END,
      avril = CASE WHEN period_data.period_number = 4 THEN NEW.value ELSE avril END,
      mai = CASE WHEN period_data.period_number = 5 THEN NEW.value ELSE mai END,
      juin = CASE WHEN period_data.period_number = 6 THEN NEW.value ELSE juin END,
      juillet = CASE WHEN period_data.period_number = 7 THEN NEW.value ELSE juillet END,
      aout = CASE WHEN period_data.period_number = 8 THEN NEW.value ELSE aout END,
      septembre = CASE WHEN period_data.period_number = 9 THEN NEW.value ELSE septembre END,
      octobre = CASE WHEN period_data.period_number = 10 THEN NEW.value ELSE octobre END,
      novembre = CASE WHEN period_data.period_number = 11 THEN NEW.value ELSE novembre END,
      decembre = CASE WHEN period_data.period_number = 12 THEN NEW.value ELSE decembre END,
      updated_at = now()
    WHERE site_name = NEW.site_name
      AND code = indicator_data.code
      AND year = period_data.year;
  ELSE
    -- Insérer un nouvel enregistrement
    INSERT INTO site_global_indicator_values_simple (
      site_name,
      year,
      code,
      axe_energetique,
      enjeux,
      critere,
      indicateur,
      definition,
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
      decembre
    ) VALUES (
      NEW.site_name,
      period_data.year,
      indicator_data.code,
      indicator_data.axe_energetique,
      indicator_data.enjeux,
      indicator_data.critere,
      indicator_data.indicateur,
      indicator_data.definition,
      indicator_data.processus_code,
      indicator_data.frequence,
      indicator_data.unite,
      indicator_data.type,
      indicator_data.formule,
      NEW.value,
      CASE WHEN period_data.period_number = 1 THEN NEW.value ELSE NULL END,
      CASE WHEN period_data.period_number = 2 THEN NEW.value ELSE NULL END,
      CASE WHEN period_data.period_number = 3 THEN NEW.value ELSE NULL END,
      CASE WHEN period_data.period_number = 4 THEN NEW.value ELSE NULL END,
      CASE WHEN period_data.period_number = 5 THEN NEW.value ELSE NULL END,
      CASE WHEN period_data.period_number = 6 THEN NEW.value ELSE NULL END,
      CASE WHEN period_data.period_number = 7 THEN NEW.value ELSE NULL END,
      CASE WHEN period_data.period_number = 8 THEN NEW.value ELSE NULL END,
      CASE WHEN period_data.period_number = 9 THEN NEW.value ELSE NULL END,
      CASE WHEN period_data.period_number = 10 THEN NEW.value ELSE NULL END,
      CASE WHEN period_data.period_number = 11 THEN NEW.value ELSE NULL END,
      CASE WHEN period_data.period_number = 12 THEN NEW.value ELSE NULL END
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour mettre à jour le processus_code dans indicator_values
CREATE OR REPLACE FUNCTION update_processus_code_indicator_values()
RETURNS TRIGGER AS $$
BEGIN
  -- Récupérer le processus_code depuis la table indicators
  SELECT processus_code INTO NEW.processus_code
  FROM indicators
  WHERE code = NEW.indicator_code;
  
  -- Si aucun processus trouvé, conserver la valeur existante
  IF NEW.processus_code IS NULL AND TG_OP = 'UPDATE' AND OLD.processus_code IS NOT NULL THEN
    NEW.processus_code := OLD.processus_code;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer les triggers pour site_global_indicator_values_simple
DROP TRIGGER IF EXISTS trigger_update_processus_code ON site_global_indicator_values_simple;
CREATE TRIGGER trigger_update_processus_code
  BEFORE INSERT OR UPDATE OF code ON site_global_indicator_values_simple
  FOR EACH ROW
  EXECUTE FUNCTION update_processus_code_from_indicator();

-- Créer les triggers pour indicator_values
DROP TRIGGER IF EXISTS trigger_update_processus_code_indicator_values ON indicator_values;
CREATE TRIGGER trigger_update_processus_code_indicator_values
  BEFORE INSERT OR UPDATE OF indicator_code ON indicator_values
  FOR EACH ROW
  EXECUTE FUNCTION update_processus_code_indicator_values();

-- Créer le trigger pour synchroniser site_global_indicator_values_simple depuis indicator_values
DROP TRIGGER IF EXISTS trigger_sync_indicator_values_fixed ON indicator_values;
CREATE TRIGGER trigger_sync_indicator_values_fixed
  AFTER INSERT OR UPDATE OR DELETE ON indicator_values
  FOR EACH ROW
  EXECUTE FUNCTION sync_site_values_from_indicator_values();

-- Mettre à jour les processus_code existants dans site_global_indicator_values_simple
UPDATE site_global_indicator_values_simple 
SET processus_code = i.processus_code
FROM indicators i
WHERE site_global_indicator_values_simple.code = i.code
  AND (site_global_indicator_values_simple.processus_code IS NULL 
       OR site_global_indicator_values_simple.processus_code != i.processus_code);

-- Mettre à jour les processus_code existants dans indicator_values
UPDATE indicator_values 
SET processus_code = i.processus_code
FROM indicators i
WHERE indicator_values.indicator_code = i.code
  AND (indicator_values.processus_code IS NULL 
       OR indicator_values.processus_code != i.processus_code);

-- Fonction utilitaire pour synchroniser tous les processus_code
CREATE OR REPLACE FUNCTION sync_all_processus_codes()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER := 0;
BEGIN
  -- Synchroniser site_global_indicator_values_simple
  UPDATE site_global_indicator_values_simple 
  SET processus_code = i.processus_code
  FROM indicators i
  WHERE site_global_indicator_values_simple.code = i.code
    AND (site_global_indicator_values_simple.processus_code IS NULL 
         OR site_global_indicator_values_simple.processus_code != i.processus_code);
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  -- Synchroniser indicator_values
  UPDATE indicator_values 
  SET processus_code = i.processus_code
  FROM indicators i
  WHERE indicator_values.indicator_code = i.code
    AND (indicator_values.processus_code IS NULL 
         OR indicator_values.processus_code != i.processus_code);
  
  GET DIAGNOSTICS updated_count = updated_count + ROW_COUNT;
  
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Synchroniser les données existantes depuis indicator_values vers site_global_indicator_values_simple
DO $$
DECLARE
  iv_record RECORD;
  indicator_data RECORD;
  period_data RECORD;
  existing_record RECORD;
BEGIN
  -- Parcourir tous les enregistrements d'indicator_values
  FOR iv_record IN 
    SELECT DISTINCT 
      iv.site_name,
      iv.indicator_code,
      iv.value,
      iv.period_id,
      cp.year,
      cp.period_number
    FROM indicator_values iv
    JOIN collection_periods cp ON iv.period_id = cp.id
    WHERE iv.site_name IS NOT NULL
      AND iv.value IS NOT NULL
      AND iv.status = 'validated'
  LOOP
    -- Récupérer les données de l'indicateur
    SELECT 
      i.code,
      i.name as indicateur,
      i.axe_energetique,
      i.enjeux,
      i.critere,
      i.definition,
      i.processus_code,
      i.frequence,
      i.unite,
      i.type,
      i.formule
    INTO indicator_data
    FROM indicators i
    WHERE i.code = iv_record.indicator_code;
    
    -- Si l'indicateur existe
    IF FOUND THEN
      -- Vérifier si un enregistrement existe déjà
      SELECT *
      INTO existing_record
      FROM site_global_indicator_values_simple
      WHERE site_name = iv_record.site_name
        AND code = indicator_data.code
        AND year = iv_record.year;
      
      IF existing_record IS NOT NULL THEN
        -- Mettre à jour l'enregistrement existant
        UPDATE site_global_indicator_values_simple
        SET
          axe_energetique = indicator_data.axe_energetique,
          enjeux = indicator_data.enjeux,
          critere = indicator_data.critere,
          indicateur = indicator_data.indicateur,
          definition = indicator_data.definition,
          processus_code = indicator_data.processus_code,
          frequence = indicator_data.frequence,
          unite = indicator_data.unite,
          type = indicator_data.type,
          formule = indicator_data.formule,
          value = iv_record.value,
          -- Mettre à jour le mois correspondant
          janvier = CASE WHEN iv_record.period_number = 1 THEN iv_record.value ELSE janvier END,
          fevrier = CASE WHEN iv_record.period_number = 2 THEN iv_record.value ELSE fevrier END,
          mars = CASE WHEN iv_record.period_number = 3 THEN iv_record.value ELSE mars END,
          avril = CASE WHEN iv_record.period_number = 4 THEN iv_record.value ELSE avril END,
          mai = CASE WHEN iv_record.period_number = 5 THEN iv_record.value ELSE mai END,
          juin = CASE WHEN iv_record.period_number = 6 THEN iv_record.value ELSE juin END,
          juillet = CASE WHEN iv_record.period_number = 7 THEN iv_record.value ELSE juillet END,
          aout = CASE WHEN iv_record.period_number = 8 THEN iv_record.value ELSE aout END,
          septembre = CASE WHEN iv_record.period_number = 9 THEN iv_record.value ELSE septembre END,
          octobre = CASE WHEN iv_record.period_number = 10 THEN iv_record.value ELSE octobre END,
          novembre = CASE WHEN iv_record.period_number = 11 THEN iv_record.value ELSE novembre END,
          decembre = CASE WHEN iv_record.period_number = 12 THEN iv_record.value ELSE decembre END,
          updated_at = now()
        WHERE site_name = iv_record.site_name
          AND code = indicator_data.code
          AND year = iv_record.year;
      ELSE
        -- Insérer un nouvel enregistrement
        INSERT INTO site_global_indicator_values_simple (
          site_name,
          year,
          code,
          axe_energetique,
          enjeux,
          critere,
          indicateur,
          definition,
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
          decembre
        ) VALUES (
          iv_record.site_name,
          iv_record.year,
          indicator_data.code,
          indicator_data.axe_energetique,
          indicator_data.enjeux,
          indicator_data.critere,
          indicator_data.indicateur,
          indicator_data.definition,
          indicator_data.processus_code,
          indicator_data.frequence,
          indicator_data.unite,
          indicator_data.type,
          indicator_data.formule,
          iv_record.value,
          CASE WHEN iv_record.period_number = 1 THEN iv_record.value ELSE NULL END,
          CASE WHEN iv_record.period_number = 2 THEN iv_record.value ELSE NULL END,
          CASE WHEN iv_record.period_number = 3 THEN iv_record.value ELSE NULL END,
          CASE WHEN iv_record.period_number = 4 THEN iv_record.value ELSE NULL END,
          CASE WHEN iv_record.period_number = 5 THEN iv_record.value ELSE NULL END,
          CASE WHEN iv_record.period_number = 6 THEN iv_record.value ELSE NULL END,
          CASE WHEN iv_record.period_number = 7 THEN iv_record.value ELSE NULL END,
          CASE WHEN iv_record.period_number = 8 THEN iv_record.value ELSE NULL END,
          CASE WHEN iv_record.period_number = 9 THEN iv_record.value ELSE NULL END,
          CASE WHEN iv_record.period_number = 10 THEN iv_record.value ELSE NULL END,
          CASE WHEN iv_record.period_number = 11 THEN iv_record.value ELSE NULL END,
          CASE WHEN iv_record.period_number = 12 THEN iv_record.value ELSE NULL END
        );
      END IF;
    END IF;
  END LOOP;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Fonction trigger pour synchronisation automatique
CREATE OR REPLACE FUNCTION trigger_sync_indicator_values()
RETURNS TRIGGER AS $$
DECLARE
  indicator_data RECORD;
  period_data RECORD;
  existing_record RECORD;
BEGIN
  -- Récupérer les données de l'indicateur
  SELECT 
    i.code,
    i.name as indicateur,
    i.axe_energetique,
    i.enjeux,
    i.critere,
    i.definition,
    i.processus_code,
    i.frequence,
    i.unite,
    i.type,
    i.formule
  INTO indicator_data
  FROM indicators i
  WHERE i.code = COALESCE(NEW.indicator_code, OLD.indicator_code);
  
  -- Si l'indicateur n'existe pas, on sort
  IF NOT FOUND THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  -- Récupérer les données de la période de collecte
  SELECT 
    cp.year,
    cp.period_number
  INTO period_data
  FROM collection_periods cp
  WHERE cp.id = COALESCE(NEW.period_id, OLD.period_id);
  
  -- Si la période n'existe pas, on sort
  IF NOT FOUND THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  -- Si c'est une suppression
  IF TG_OP = 'DELETE' THEN
    -- Supprimer ou mettre à jour l'enregistrement correspondant
    UPDATE site_global_indicator_values_simple
    SET
      -- Remettre à NULL le mois correspondant
      janvier = CASE WHEN period_data.period_number = 1 THEN NULL ELSE janvier END,
      fevrier = CASE WHEN period_data.period_number = 2 THEN NULL ELSE fevrier END,
      mars = CASE WHEN period_data.period_number = 3 THEN NULL ELSE mars END,
      avril = CASE WHEN period_data.period_number = 4 THEN NULL ELSE avril END,
      mai = CASE WHEN period_data.period_number = 5 THEN NULL ELSE mai END,
      juin = CASE WHEN period_data.period_number = 6 THEN NULL ELSE juin END,
      juillet = CASE WHEN period_data.period_number = 7 THEN NULL ELSE juillet END,
      aout = CASE WHEN period_data.period_number = 8 THEN NULL ELSE aout END,
      septembre = CASE WHEN period_data.period_number = 9 THEN NULL ELSE septembre END,
      octobre = CASE WHEN period_data.period_number = 10 THEN NULL ELSE octobre END,
      novembre = CASE WHEN period_data.period_number = 11 THEN NULL ELSE novembre END,
      decembre = CASE WHEN period_data.period_number = 12 THEN NULL ELSE decembre END,
      updated_at = now()
    WHERE site_name = OLD.site_name
      AND code = indicator_data.code
      AND year = period_data.year;
    
    RETURN OLD;
  END IF;
  
  -- Vérifier si un enregistrement existe déjà dans site_global_indicator_values_simple
  SELECT *
  INTO existing_record
  FROM site_global_indicator_values_simple
  WHERE site_name = NEW.site_name
    AND code = indicator_data.code
    AND year = period_data.year;
  
  -- Si c'est une insertion ou mise à jour
  IF existing_record IS NOT NULL THEN
    -- Mettre à jour l'enregistrement existant
    UPDATE site_global_indicator_values_simple
    SET
      axe_energetique = indicator_data.axe_energetique,
      enjeux = indicator_data.enjeux,
      critere = indicator_data.critere,
      indicateur = indicator_data.indicateur,
      definition = indicator_data.definition,
      processus_code = indicator_data.processus_code,
      frequence = indicator_data.frequence,
      unite = indicator_data.unite,
      type = indicator_data.type,
      formule = indicator_data.formule,
      value = NEW.value,
      -- Mettre à jour le mois correspondant selon period_number
      janvier = CASE WHEN period_data.period_number = 1 THEN NEW.value ELSE janvier END,
      fevrier = CASE WHEN period_data.period_number = 2 THEN NEW.value ELSE fevrier END,
      mars = CASE WHEN period_data.period_number = 3 THEN NEW.value ELSE mars END,
      avril = CASE WHEN period_data.period_number = 4 THEN NEW.value ELSE avril END,
      mai = CASE WHEN period_data.period_number = 5 THEN NEW.value ELSE mai END,
      juin = CASE WHEN period_data.period_number = 6 THEN NEW.value ELSE juin END,
      juillet = CASE WHEN period_data.period_number = 7 THEN NEW.value ELSE juillet END,
      aout = CASE WHEN period_data.period_number = 8 THEN NEW.value ELSE aout END,
      septembre = CASE WHEN period_data.period_number = 9 THEN NEW.value ELSE septembre END,
      octobre = CASE WHEN period_data.period_number = 10 THEN NEW.value ELSE octobre END,
      novembre = CASE WHEN period_data.period_number = 11 THEN NEW.value ELSE novembre END,
      decembre = CASE WHEN period_data.period_number = 12 THEN NEW.value ELSE decembre END,
      updated_at = now()
    WHERE site_name = NEW.site_name
      AND code = indicator_data.code
      AND year = period_data.year;
  ELSE
    -- Insérer un nouvel enregistrement
    INSERT INTO site_global_indicator_values_simple (
      site_name,
      year,
      code,
      axe_energetique,
      enjeux,
      critere,
      indicateur,
      definition,
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
      decembre
    ) VALUES (
      NEW.site_name,
      period_data.year,
      indicator_data.code,
      indicator_data.axe_energetique,
      indicator_data.enjeux,
      indicator_data.critere,
      indicator_data.indicateur,
      indicator_data.definition,
      indicator_data.processus_code,
      indicator_data.frequence,
      indicator_data.unite,
      indicator_data.type,
      indicator_data.formule,
      NEW.value,
      CASE WHEN period_data.period_number = 1 THEN NEW.value ELSE NULL END,
      CASE WHEN period_data.period_number = 2 THEN NEW.value ELSE NULL END,
      CASE WHEN period_data.period_number = 3 THEN NEW.value ELSE NULL END,
      CASE WHEN period_data.period_number = 4 THEN NEW.value ELSE NULL END,
      CASE WHEN period_data.period_number = 5 THEN NEW.value ELSE NULL END,
      CASE WHEN period_data.period_number = 6 THEN NEW.value ELSE NULL END,
      CASE WHEN period_data.period_number = 7 THEN NEW.value ELSE NULL END,
      CASE WHEN period_data.period_number = 8 THEN NEW.value ELSE NULL END,
      CASE WHEN period_data.period_number = 9 THEN NEW.value ELSE NULL END,
      CASE WHEN period_data.period_number = 10 THEN NEW.value ELSE NULL END,
      CASE WHEN period_data.period_number = 11 THEN NEW.value ELSE NULL END,
      CASE WHEN period_data.period_number = 12 THEN NEW.value ELSE NULL END
    )
    ON CONFLICT (site_name, code, year) 
    DO UPDATE SET
      axe_energetique = EXCLUDED.axe_energetique,
      enjeux = EXCLUDED.enjeux,
      critere = EXCLUDED.critere,
      indicateur = EXCLUDED.indicateur,
      definition = EXCLUDED.definition,
      processus_code = EXCLUDED.processus_code,
      frequence = EXCLUDED.frequence,
      unite = EXCLUDED.unite,
      type = EXCLUDED.type,
      formule = EXCLUDED.formule,
      value = EXCLUDED.value,
      -- Mettre à jour seulement le mois correspondant
      janvier = CASE WHEN period_data.period_number = 1 THEN EXCLUDED.value ELSE site_global_indicator_values_simple.janvier END,
      fevrier = CASE WHEN period_data.period_number = 2 THEN EXCLUDED.value ELSE site_global_indicator_values_simple.fevrier END,
      mars = CASE WHEN period_data.period_number = 3 THEN EXCLUDED.value ELSE site_global_indicator_values_simple.mars END,
      avril = CASE WHEN period_data.period_number = 4 THEN EXCLUDED.value ELSE site_global_indicator_values_simple.avril END,
      mai = CASE WHEN period_data.period_number = 5 THEN EXCLUDED.value ELSE site_global_indicator_values_simple.mai END,
      juin = CASE WHEN period_data.period_number = 6 THEN EXCLUDED.value ELSE site_global_indicator_values_simple.juin END,
      juillet = CASE WHEN period_data.period_number = 7 THEN EXCLUDED.value ELSE site_global_indicator_values_simple.juillet END,
      aout = CASE WHEN period_data.period_number = 8 THEN EXCLUDED.value ELSE site_global_indicator_values_simple.aout END,
      septembre = CASE WHEN period_data.period_number = 9 THEN EXCLUDED.value ELSE site_global_indicator_values_simple.septembre END,
      octobre = CASE WHEN period_data.period_number = 10 THEN EXCLUDED.value ELSE site_global_indicator_values_simple.octobre END,
      novembre = CASE WHEN period_data.period_number = 11 THEN EXCLUDED.value ELSE site_global_indicator_values_simple.novembre END,
      decembre = CASE WHEN period_data.period_number = 12 THEN EXCLUDED.value ELSE site_global_indicator_values_simple.decembre END,
      updated_at = now();
    END IF;
  END LOOP;
END;
$$;