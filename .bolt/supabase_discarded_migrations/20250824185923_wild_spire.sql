/*
  # Correction de la récupération des normes

  1. Fonction mise à jour
    - Récupère correctement les normes depuis sector_standards_issues_criteria_indicators.standard_name
    - Joint avec la table indicators pour faire le lien via indicator_codes
    - Met à jour toutes les lignes existantes avec les bonnes normes

  2. Triggers
    - Déclenche automatiquement la mise à jour des métadonnées lors des INSERT/UPDATE
    - Assure que toutes les nouvelles lignes ont leurs normes correctement remplies
*/

-- Fonction pour récupérer et mettre à jour les métadonnées des indicateurs
CREATE OR REPLACE FUNCTION auto_update_indicator_metadata()
RETURNS TRIGGER AS $$
BEGIN
    -- Récupérer les métadonnées depuis sector_standards_issues_criteria_indicators
    SELECT 
        ssici.standard_name,
        ssici.issue_name,
        ssici.criteria_name,
        i.axe_energetique
    INTO 
        NEW.normes,
        NEW.enjeux,
        NEW.critere,
        NEW.axe_energetique
    FROM sector_standards_issues_criteria_indicators ssici
    LEFT JOIN issues i ON i.name = ssici.issue_name
    WHERE ssici.indicator_codes @> ARRAY[NEW.code]
    LIMIT 1;
    
    -- Si aucune donnée trouvée dans sector_standards_issues_criteria_indicators,
    -- utiliser les données de fallback depuis la table indicators
    IF NEW.normes IS NULL OR NEW.enjeux IS NULL OR NEW.critere IS NULL THEN
        SELECT 
            COALESCE(NEW.normes, ind.normes),
            COALESCE(NEW.enjeux, ind.enjeux),
            COALESCE(NEW.critere, ind.critere),
            COALESCE(NEW.axe_energetique, ind.axe_energetique),
            COALESCE(NEW.indicateur, ind.name),
            COALESCE(NEW.definition, ind.description),
            COALESCE(NEW.processus, proc.name),
            COALESCE(NEW.processus_code, ind.processus_code),
            COALESCE(NEW.frequence, ind.frequence),
            COALESCE(NEW.unite, ind.unit),
            COALESCE(NEW.type, ind.type),
            COALESCE(NEW.formule, ind.formule)
        INTO 
            NEW.normes,
            NEW.enjeux,
            NEW.critere,
            NEW.axe_energetique,
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
    ELSE
        -- Compléter les autres métadonnées depuis la table indicators
        SELECT 
            COALESCE(NEW.indicateur, ind.name),
            COALESCE(NEW.definition, ind.description),
            COALESCE(NEW.processus, proc.name),
            COALESCE(NEW.processus_code, ind.processus_code),
            COALESCE(NEW.frequence, ind.frequence),
            COALESCE(NEW.unite, ind.unit),
            COALESCE(NEW.type, ind.type),
            COALESCE(NEW.formule, ind.formule)
        INTO 
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
    
    -- Assurer que la cible a une valeur par défaut
    IF NEW.cible IS NULL THEN
        NEW.cible := 100;
    END IF;
    
    -- Calculer variations_pourcent = value - cible
    IF NEW.value IS NOT NULL AND NEW.cible IS NOT NULL THEN
        NEW.variations_pourcent := NEW.value - NEW.cible;
    END IF;
    
    -- Calculer performances_pourcent = (value / cible) * 100
    IF NEW.value IS NOT NULL AND NEW.cible IS NOT NULL AND NEW.cible != 0 THEN
        NEW.performances_pourcent := (NEW.value / NEW.cible) * 100;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour calculer les performances mensuelles
CREATE OR REPLACE FUNCTION update_monthly_performances_simple()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculer les performances mensuelles = (valeur_mensuelle / cible) * 100
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

-- Supprimer les anciens triggers s'ils existent
DROP TRIGGER IF EXISTS update_indicator_metadata ON site_global_indicator_values_simple;
DROP TRIGGER IF EXISTS trigger_calculate_monthly_performances ON site_global_indicator_values_simple;

-- Créer les nouveaux triggers
CREATE TRIGGER update_indicator_metadata
    BEFORE INSERT OR UPDATE ON site_global_indicator_values_simple
    FOR EACH ROW
    EXECUTE FUNCTION auto_update_indicator_metadata();

CREATE TRIGGER trigger_calculate_monthly_performances
    BEFORE INSERT OR UPDATE OF janvier, fevrier, mars, avril, mai, juin, juillet, aout, septembre, octobre, novembre, decembre, cible
    ON site_global_indicator_values_simple
    FOR EACH ROW
    EXECUTE FUNCTION update_monthly_performances_simple();

-- Mettre à jour toutes les lignes existantes pour appliquer les nouveaux calculs
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
    -- Calculer les performances mensuelles
    perf_janvier = CASE WHEN janvier IS NOT NULL AND COALESCE(cible, 100) != 0 THEN (janvier / COALESCE(cible, 100)) * 100 ELSE perf_janvier END,
    perf_fevrier = CASE WHEN fevrier IS NOT NULL AND COALESCE(cible, 100) != 0 THEN (fevrier / COALESCE(cible, 100)) * 100 ELSE perf_fevrier END,
    perf_mars = CASE WHEN mars IS NOT NULL AND COALESCE(cible, 100) != 0 THEN (mars / COALESCE(cible, 100)) * 100 ELSE perf_mars END,
    perf_avril = CASE WHEN avril IS NOT NULL AND COALESCE(cible, 100) != 0 THEN (avril / COALESCE(cible, 100)) * 100 ELSE perf_avril END,
    perf_mai = CASE WHEN mai IS NOT NULL AND COALESCE(cible, 100) != 0 THEN (mai / COALESCE(cible, 100)) * 100 ELSE perf_mai END,
    perf_juin = CASE WHEN juin IS NOT NULL AND COALESCE(cible, 100) != 0 THEN (juin / COALESCE(cible, 100)) * 100 ELSE perf_juin END,
    perf_juillet = CASE WHEN juillet IS NOT NULL AND COALESCE(cible, 100) != 0 THEN (juillet / COALESCE(cible, 100)) * 100 ELSE perf_juillet END,
    perf_aout = CASE WHEN aout IS NOT NULL AND COALESCE(cible, 100) != 0 THEN (aout / COALESCE(cible, 100)) * 100 ELSE perf_aout END,
    perf_septembre = CASE WHEN septembre IS NOT NULL AND COALESCE(cible, 100) != 0 THEN (septembre / COALESCE(cible, 100)) * 100 ELSE perf_septembre END,
    perf_octobre = CASE WHEN octobre IS NOT NULL AND COALESCE(cible, 100) != 0 THEN (octobre / COALESCE(cible, 100)) * 100 ELSE perf_octobre END,
    perf_novembre = CASE WHEN novembre IS NOT NULL AND COALESCE(cible, 100) != 0 THEN (novembre / COALESCE(cible, 100)) * 100 ELSE perf_novembre END,
    perf_decembre = CASE WHEN decembre IS NOT NULL AND COALESCE(cible, 100) != 0 THEN (decembre / COALESCE(cible, 100)) * 100 ELSE perf_decembre END;

-- Forcer la mise à jour des métadonnées pour toutes les lignes
UPDATE site_global_indicator_values_simple 
SET updated_at = NOW()
WHERE normes IS NULL OR enjeux IS NULL OR critere IS NULL OR axe_energetique IS NULL;