/*
  # Mise à jour de la fonction de récupération des métadonnées

  1. Modifications
    - Correction de la récupération des normes depuis sector_standards_issues_criteria_indicators.standard_name
    - Amélioration de la logique de jointure pour récupérer toutes les métadonnées
    - Mise à jour de toutes les données existantes

  2. Fonctionnalités
    - Récupération automatique des métadonnées lors des INSERT/UPDATE
    - Fallback vers la table indicators si aucune donnée sectorielle
    - Calculs automatiques des performances et variations
*/

-- Supprimer l'ancienne fonction
DROP FUNCTION IF EXISTS auto_update_indicator_metadata();

-- Créer la nouvelle fonction améliorée
CREATE OR REPLACE FUNCTION auto_update_indicator_metadata()
RETURNS TRIGGER AS $$
DECLARE
    metadata_record RECORD;
    fallback_record RECORD;
BEGIN
    -- Essayer de récupérer les métadonnées depuis sector_standards_issues_criteria_indicators
    SELECT 
        ssici.standard_name as normes,
        ssici.issue_name as enjeux,
        ssici.criteria_name as critere,
        i.axe_energetique as axe_energetique
    INTO metadata_record
    FROM sector_standards_issues_criteria_indicators ssici
    LEFT JOIN issues i ON i.name = ssici.issue_name
    WHERE ssici.indicator_codes @> ARRAY[NEW.code]
    LIMIT 1;
    
    -- Si des métadonnées sectorielles sont trouvées, les utiliser
    IF FOUND AND metadata_record IS NOT NULL THEN
        NEW.normes := COALESCE(NEW.normes, metadata_record.normes);
        NEW.enjeux := COALESCE(NEW.enjeux, metadata_record.enjeux);
        NEW.critere := COALESCE(NEW.critere, metadata_record.critere);
        NEW.axe_energetique := COALESCE(NEW.axe_energetique, metadata_record.axe_energetique);
    ELSE
        -- Fallback : récupérer depuis la table indicators
        SELECT 
            axe_energetique,
            enjeux,
            normes,
            critere
        INTO fallback_record
        FROM indicators
        WHERE code = NEW.code
        LIMIT 1;
        
        IF FOUND AND fallback_record IS NOT NULL THEN
            NEW.axe_energetique := COALESCE(NEW.axe_energetique, fallback_record.axe_energetique);
            NEW.enjeux := COALESCE(NEW.enjeux, fallback_record.enjeux);
            NEW.normes := COALESCE(NEW.normes, fallback_record.normes);
            NEW.critere := COALESCE(NEW.critere, fallback_record.critere);
        END IF;
    END IF;
    
    -- Récupérer les autres métadonnées depuis indicators
    SELECT 
        name as indicateur,
        description as definition,
        processus_code,
        frequence,
        unit as unite,
        type,
        formule
    INTO fallback_record
    FROM indicators
    WHERE code = NEW.code
    LIMIT 1;
    
    IF FOUND AND fallback_record IS NOT NULL THEN
        NEW.indicateur := COALESCE(NEW.indicateur, fallback_record.indicateur);
        NEW.definition := COALESCE(NEW.definition, fallback_record.definition);
        NEW.processus_code := COALESCE(NEW.processus_code, fallback_record.processus_code);
        NEW.frequence := COALESCE(NEW.frequence, fallback_record.frequence);
        NEW.unite := COALESCE(NEW.unite, fallback_record.unite);
        NEW.type := COALESCE(NEW.type, fallback_record.type);
        NEW.formule := COALESCE(NEW.formule, fallback_record.formule);
        
        -- Récupérer le nom du processus
        SELECT name INTO fallback_record
        FROM processus
        WHERE code = NEW.processus_code
        LIMIT 1;
        
        IF FOUND THEN
            NEW.processus := COALESCE(NEW.processus, fallback_record.name);
        END IF;
    END IF;
    
    -- S'assurer que la cible a une valeur par défaut
    NEW.cible := COALESCE(NEW.cible, 100);
    
    -- Calculer variations_pourcent et performances_pourcent
    IF NEW.value IS NOT NULL AND NEW.cible IS NOT NULL AND NEW.cible != 0 THEN
        NEW.variations_pourcent := NEW.value - NEW.cible;
        NEW.performances_pourcent := (NEW.value / NEW.cible) * 100;
    END IF;
    
    -- Calculer les performances mensuelles
    IF NEW.cible IS NOT NULL AND NEW.cible != 0 THEN
        NEW.perf_janvier := CASE WHEN NEW.janvier IS NOT NULL THEN (NEW.janvier / NEW.cible) * 100 ELSE NULL END;
        NEW.perf_fevrier := CASE WHEN NEW.fevrier IS NOT NULL THEN (NEW.fevrier / NEW.cible) * 100 ELSE NULL END;
        NEW.perf_mars := CASE WHEN NEW.mars IS NOT NULL THEN (NEW.mars / NEW.cible) * 100 ELSE NULL END;
        NEW.perf_avril := CASE WHEN NEW.avril IS NOT NULL THEN (NEW.avril / NEW.cible) * 100 ELSE NULL END;
        NEW.perf_mai := CASE WHEN NEW.mai IS NOT NULL THEN (NEW.mai / NEW.cible) * 100 ELSE NULL END;
        NEW.perf_juin := CASE WHEN NEW.juin IS NOT NULL THEN (NEW.juin / NEW.cible) * 100 ELSE NULL END;
        NEW.perf_juillet := CASE WHEN NEW.juillet IS NOT NULL THEN (NEW.juillet / NEW.cible) * 100 ELSE NULL END;
        NEW.perf_aout := CASE WHEN NEW.aout IS NOT NULL THEN (NEW.aout / NEW.cible) * 100 ELSE NULL END;
        NEW.perf_septembre := CASE WHEN NEW.septembre IS NOT NULL THEN (NEW.septembre / NEW.cible) * 100 ELSE NULL END;
        NEW.perf_octobre := CASE WHEN NEW.octobre IS NOT NULL THEN (NEW.octobre / NEW.cible) * 100 ELSE NULL END;
        NEW.perf_novembre := CASE WHEN NEW.novembre IS NOT NULL THEN (NEW.novembre / NEW.cible) * 100 ELSE NULL END;
        NEW.perf_decembre := CASE WHEN NEW.decembre IS NOT NULL THEN (NEW.decembre / NEW.cible) * 100 ELSE NULL END;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Supprimer l'ancien trigger s'il existe
DROP TRIGGER IF EXISTS update_indicator_metadata ON site_global_indicator_values_simple;

-- Créer le nouveau trigger
CREATE TRIGGER update_indicator_metadata
    BEFORE INSERT OR UPDATE ON site_global_indicator_values_simple
    FOR EACH ROW
    EXECUTE FUNCTION auto_update_indicator_metadata();

-- Mettre à jour toutes les données existantes
UPDATE site_global_indicator_values_simple 
SET 
    cible = COALESCE(cible, 100),
    variations_pourcent = CASE 
        WHEN value IS NOT NULL AND COALESCE(cible, 100) IS NOT NULL 
        THEN value - COALESCE(cible, 100)
        ELSE variations_pourcent 
    END,
    performances_pourcent = CASE 
        WHEN value IS NOT NULL AND COALESCE(cible, 100) IS NOT NULL AND COALESCE(cible, 100) != 0 
        THEN (value / COALESCE(cible, 100)) * 100
        ELSE performances_pourcent 
    END,
    perf_janvier = CASE 
        WHEN janvier IS NOT NULL AND COALESCE(cible, 100) IS NOT NULL AND COALESCE(cible, 100) != 0 
        THEN (janvier / COALESCE(cible, 100)) * 100 
        ELSE perf_janvier 
    END,
    perf_fevrier = CASE 
        WHEN fevrier IS NOT NULL AND COALESCE(cible, 100) IS NOT NULL AND COALESCE(cible, 100) != 0 
        THEN (fevrier / COALESCE(cible, 100)) * 100 
        ELSE perf_fevrier 
    END,
    perf_mars = CASE 
        WHEN mars IS NOT NULL AND COALESCE(cible, 100) IS NOT NULL AND COALESCE(cible, 100) != 0 
        THEN (mars / COALESCE(cible, 100)) * 100 
        ELSE perf_mars 
    END,
    perf_avril = CASE 
        WHEN avril IS NOT NULL AND COALESCE(cible, 100) IS NOT NULL AND COALESCE(cible, 100) != 0 
        THEN (avril / COALESCE(cible, 100)) * 100 
        ELSE perf_avril 
    END,
    perf_mai = CASE 
        WHEN mai IS NOT NULL AND COALESCE(cible, 100) IS NOT NULL AND COALESCE(cible, 100) != 0 
        THEN (mai / COALESCE(cible, 100)) * 100 
        ELSE perf_mai 
    END,
    perf_juin = CASE 
        WHEN juin IS NOT NULL AND COALESCE(cible, 100) IS NOT NULL AND COALESCE(cible, 100) != 0 
        THEN (juin / COALESCE(cible, 100)) * 100 
        ELSE perf_juin 
    END,
    perf_juillet = CASE 
        WHEN juillet IS NOT NULL AND COALESCE(cible, 100) IS NOT NULL AND COALESCE(cible, 100) != 0 
        THEN (juillet / COALESCE(cible, 100)) * 100 
        ELSE perf_juillet 
    END,
    perf_aout = CASE 
        WHEN aout IS NOT NULL AND COALESCE(cible, 100) IS NOT NULL AND COALESCE(cible, 100) != 0 
        THEN (aout / COALESCE(cible, 100)) * 100 
        ELSE perf_aout 
    END,
    perf_septembre = CASE 
        WHEN septembre IS NOT NULL AND COALESCE(cible, 100) IS NOT NULL AND COALESCE(cible, 100) != 0 
        THEN (septembre / COALESCE(cible, 100)) * 100 
        ELSE perf_septembre 
    END,
    perf_octobre = CASE 
        WHEN octobre IS NOT NULL AND COALESCE(cible, 100) IS NOT NULL AND COALESCE(cible, 100) != 0 
        THEN (octobre / COALESCE(cible, 100)) * 100 
        ELSE perf_octobre 
    END,
    perf_novembre = CASE 
        WHEN novembre IS NOT NULL AND COALESCE(cible, 100) IS NOT NULL AND COALESCE(cible, 100) != 0 
        THEN (novembre / COALESCE(cible, 100)) * 100 
        ELSE perf_novembre 
    END,
    perf_decembre = CASE 
        WHEN decembre IS NOT NULL AND COALESCE(cible, 100) IS NOT NULL AND COALESCE(cible, 100) != 0 
        THEN (decembre / COALESCE(cible, 100)) * 100 
        ELSE perf_decembre 
    END;

-- Mettre à jour les métadonnées pour toutes les lignes existantes
UPDATE site_global_indicator_values_simple 
SET updated_at = updated_at
WHERE 
    axe_energetique IS NULL OR 
    enjeux IS NULL OR 
    normes IS NULL OR 
    critere IS NULL OR
    indicateur IS NULL OR
    definition IS NULL OR
    processus IS NULL OR
    processus_code IS NULL OR
    frequence IS NULL OR
    unite IS NULL OR
    type IS NULL OR
    formule IS NULL;