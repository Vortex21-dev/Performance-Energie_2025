/*
  # Mise à jour processus_code depuis indicator_values

  1. Fonctions
    - `update_processus_code_from_indicator_values()` : Met à jour le processus_code depuis indicator_values
    - `sync_processus_codes_from_indicator_values()` : Synchronise tous les processus_code existants

  2. Triggers
    - Trigger automatique pour mettre à jour le processus_code lors des insertions/modifications

  3. Synchronisation
    - Met à jour toutes les données existantes avec le bon processus_code depuis indicator_values
*/

-- Supprimer l'ancien trigger s'il existe
DROP TRIGGER IF EXISTS trigger_update_processus_code ON site_global_indicator_values_simple;
DROP TRIGGER IF EXISTS trigger_update_processus_code_site_simple ON site_global_indicator_values_simple;
DROP TRIGGER IF EXISTS trigger_update_processus_code_from_indicator_values ON site_global_indicator_values_simple;

-- Supprimer les anciennes fonctions s'elles existent
DROP FUNCTION IF EXISTS update_processus_code_from_indicator();
DROP FUNCTION IF EXISTS update_processus_code_from_indicator_site_simple();
DROP FUNCTION IF EXISTS update_processus_code_from_indicator_values();
DROP FUNCTION IF EXISTS sync_processus_codes_from_indicator_values();

-- Fonction pour mettre à jour le processus_code depuis indicator_values
CREATE OR REPLACE FUNCTION update_processus_code_from_indicator_values()
RETURNS TRIGGER AS $$
DECLARE
    found_processus_code TEXT;
BEGIN
    -- Récupérer le processus_code depuis indicator_values
    -- en cherchant une valeur validée pour le même indicateur et site
    SELECT DISTINCT iv.processus_code
    INTO found_processus_code
    FROM indicator_values iv
    INNER JOIN indicators i ON i.code = iv.indicator_code
    WHERE i.name = NEW.indicateur
      AND iv.site_name = NEW.site_name
      AND iv.processus_code IS NOT NULL
    ORDER BY iv.created_at DESC
    LIMIT 1;
    
    -- Mettre à jour le processus_code si trouvé
    IF found_processus_code IS NOT NULL THEN
        NEW.processus_code := found_processus_code;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour synchroniser tous les processus_code depuis indicator_values
CREATE OR REPLACE FUNCTION sync_processus_codes_from_indicator_values()
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER := 0;
    rec RECORD;
    found_processus_code TEXT;
BEGIN
    -- Parcourir toutes les lignes de site_global_indicator_values_simple
    FOR rec IN 
        SELECT id, indicateur, site_name, processus_code
        FROM site_global_indicator_values_simple
    LOOP
        -- Récupérer le processus_code depuis indicator_values
        SELECT DISTINCT iv.processus_code
        INTO found_processus_code
        FROM indicator_values iv
        INNER JOIN indicators i ON i.code = iv.indicator_code
        WHERE i.name = rec.indicateur
          AND iv.site_name = rec.site_name
          AND iv.processus_code IS NOT NULL
        ORDER BY iv.created_at DESC
        LIMIT 1;
        
        -- Mettre à jour si un processus_code est trouvé et différent
        IF found_processus_code IS NOT NULL AND 
           (rec.processus_code IS NULL OR rec.processus_code != found_processus_code) THEN
            
            UPDATE site_global_indicator_values_simple
            SET processus_code = found_processus_code
            WHERE id = rec.id;
            
            updated_count := updated_count + 1;
        END IF;
    END LOOP;
    
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Créer le nouveau trigger
CREATE TRIGGER trigger_update_processus_code_from_indicator_values
    BEFORE INSERT OR UPDATE OF code, indicateur, site_name
    ON site_global_indicator_values_simple
    FOR EACH ROW
    EXECUTE FUNCTION update_processus_code_from_indicator_values();

-- Synchroniser toutes les données existantes
DO $$
DECLARE
    sync_result INTEGER;
BEGIN
    SELECT sync_processus_codes_from_indicator_values() INTO sync_result;
    RAISE NOTICE 'Synchronisation terminée: % lignes mises à jour dans site_global_indicator_values_simple', sync_result;
END $$;