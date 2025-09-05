/*
  # Mise à jour processus_code depuis indicator_values

  1. Fonction de mise à jour
    - Récupère le processus_code directement depuis indicator_values
    - Utilise le code de l'indicateur et le site_name pour la correspondance
    - Met à jour automatiquement lors des insertions/modifications

  2. Trigger automatique
    - Se déclenche sur INSERT/UPDATE de site_global_indicator_values_simple
    - Condition: quand code ou site_name changent
    - Met à jour le processus_code automatiquement

  3. Synchronisation des données existantes
    - Met à jour toutes les lignes existantes
    - Récupère le processus_code depuis indicator_values
    - Affiche le nombre de lignes mises à jour
*/

-- Fonction pour mettre à jour le processus_code depuis indicator_values
CREATE OR REPLACE FUNCTION update_processus_code_from_indicator_values_direct()
RETURNS TRIGGER AS $$
DECLARE
    found_processus_code TEXT;
BEGIN
    -- Récupérer le processus_code depuis indicator_values
    SELECT DISTINCT iv.processus_code
    INTO found_processus_code
    FROM indicator_values iv
    WHERE iv.indicator_code = NEW.code
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

-- Supprimer l'ancien trigger s'il existe
DROP TRIGGER IF EXISTS trigger_update_processus_code ON site_global_indicator_values_simple;

-- Créer le nouveau trigger
CREATE TRIGGER trigger_update_processus_code_from_indicator_values
    BEFORE INSERT OR UPDATE OF code, site_name ON site_global_indicator_values_simple
    FOR EACH ROW
    EXECUTE FUNCTION update_processus_code_from_indicator_values_direct();

-- Fonction pour synchroniser tous les processus_code existants
CREATE OR REPLACE FUNCTION sync_all_processus_codes_from_indicator_values_direct()
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER := 0;
    rec RECORD;
    found_processus_code TEXT;
BEGIN
    -- Parcourir toutes les lignes de site_global_indicator_values_simple
    FOR rec IN 
        SELECT id, code, site_name, processus_code
        FROM site_global_indicator_values_simple
    LOOP
        -- Récupérer le processus_code depuis indicator_values
        SELECT DISTINCT iv.processus_code
        INTO found_processus_code
        FROM indicator_values iv
        WHERE iv.indicator_code = rec.code
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

-- Exécuter la synchronisation des données existantes
DO $$
DECLARE
    updated_rows INTEGER;
BEGIN
    SELECT sync_all_processus_codes_from_indicator_values_direct() INTO updated_rows;
    RAISE NOTICE 'Synchronisation terminée: % lignes mises à jour dans site_global_indicator_values_simple', updated_rows;
END $$;