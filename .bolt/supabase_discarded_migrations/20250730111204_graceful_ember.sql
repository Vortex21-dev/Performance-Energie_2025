/*
  # Peuplement automatique des indicateurs par site

  1. Fonction de peuplement
    - Récupère les sites avec processus actifs
    - Pour chaque site, récupère les indicateurs de ses processus
    - Crée les lignes dans site_global_indicator_values_simple avec les valeurs de indicator_values

  2. Triggers automatiques
    - Peuplement automatique lors d'ajout de site/processus
    - Peuplement automatique lors d'ajout d'indicateur
*/

-- Fonction pour peupler les indicateurs d'un site
CREATE OR REPLACE FUNCTION populate_site_indicators(p_site_name text, p_year integer DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::integer)
RETURNS integer AS $$
DECLARE
    rec RECORD;
    inserted_count integer := 0;
BEGIN
    -- Pour chaque indicateur associé aux processus du site
    FOR rec IN
        SELECT DISTINCT 
            i.code,
            i.name as indicateur,
            i.description as definition,
            i.unit as unite,
            i.type,
            i.processus_code,
            i.axe_energetique,
            i.enjeux,
            i.critere,
            i.frequence,
            i.formule,
            p.name as processus,
            s.organization_name,
            s.filiere_name,
            s.filiale_name
        FROM sites s
        JOIN site_processes sp ON sp.site_name = s.name AND sp.is_active = true
        JOIN processus p ON p.code = sp.processus_code
        JOIN indicators i ON i.processus_code = p.code
        WHERE s.name = p_site_name
    LOOP
        -- Insérer ou mettre à jour l'indicateur pour ce site
        INSERT INTO site_global_indicator_values_simple (
            site_name,
            year,
            code,
            axe_energetique,
            enjeux,
            critere,
            indicateur,
            definition,
            processus,
            processus_code,
            frequence,
            unite,
            type,
            formule,
            organization_name,
            filiere_name,
            filiale_name,
            value,
            valeur_precedente,
            cible,
            variation,
            janvier, fevrier, mars, avril, mai, juin,
            juillet, aout, septembre, octobre, novembre, decembre,
            variations_pourcent,
            performances_pourcent,
            perf_janvier, perf_fevrier, perf_mars, perf_avril, perf_mai, perf_juin,
            perf_juillet, perf_aout, perf_septembre, perf_octobre, perf_novembre, perf_decembre
        )
        SELECT 
            p_site_name,
            p_year,
            rec.code,
            rec.axe_energetique,
            rec.enjeux,
            rec.critere,
            rec.indicateur,
            rec.definition,
            rec.processus,
            rec.processus_code,
            rec.frequence,
            rec.unite,
            rec.type,
            rec.formule,
            rec.organization_name,
            rec.filiere_name,
            rec.filiale_name,
            
            -- Valeur annuelle (moyenne des valeurs mensuelles ou valeur directe)
            COALESCE(
                (SELECT AVG(value) FROM indicator_values iv 
                 WHERE iv.indicator_code = rec.code 
                 AND iv.site_name = p_site_name 
                 AND EXTRACT(YEAR FROM iv.created_at) = p_year
                 AND iv.status = 'validated'),
                (SELECT value FROM indicator_values iv 
                 WHERE iv.indicator_code = rec.code 
                 AND iv.site_name = p_site_name 
                 AND EXTRACT(YEAR FROM iv.created_at) = p_year
                 AND iv.status = 'validated'
                 ORDER BY iv.created_at DESC LIMIT 1)
            ),
            
            -- Valeur année précédente
            COALESCE(
                (SELECT AVG(value) FROM indicator_values iv 
                 WHERE iv.indicator_code = rec.code 
                 AND iv.site_name = p_site_name 
                 AND EXTRACT(YEAR FROM iv.created_at) = p_year - 1
                 AND iv.status = 'validated'),
                (SELECT value FROM indicator_values iv 
                 WHERE iv.indicator_code = rec.code 
                 AND iv.site_name = p_site_name 
                 AND EXTRACT(YEAR FROM iv.created_at) = p_year - 1
                 AND iv.status = 'validated'
                 ORDER BY iv.created_at DESC LIMIT 1)
            ),
            
            -- Cible (si disponible)
            (SELECT AVG(cible_annee_actuelle) FROM indicator_measurements im 
             WHERE im.indicator_code = rec.code 
             AND im.site_name = p_site_name 
             AND im.year = p_year),
            
            -- Variation (calculée plus tard)
            NULL,
            
            -- Valeurs mensuelles depuis indicator_values
            (SELECT value FROM indicator_values iv WHERE iv.indicator_code = rec.code AND iv.site_name = p_site_name AND EXTRACT(YEAR FROM iv.created_at) = p_year AND EXTRACT(MONTH FROM iv.created_at) = 1 AND iv.status = 'validated' ORDER BY iv.created_at DESC LIMIT 1),
            (SELECT value FROM indicator_values iv WHERE iv.indicator_code = rec.code AND iv.site_name = p_site_name AND EXTRACT(YEAR FROM iv.created_at) = p_year AND EXTRACT(MONTH FROM iv.created_at) = 2 AND iv.status = 'validated' ORDER BY iv.created_at DESC LIMIT 1),
            (SELECT value FROM indicator_values iv WHERE iv.indicator_code = rec.code AND iv.site_name = p_site_name AND EXTRACT(YEAR FROM iv.created_at) = p_year AND EXTRACT(MONTH FROM iv.created_at) = 3 AND iv.status = 'validated' ORDER BY iv.created_at DESC LIMIT 1),
            (SELECT value FROM indicator_values iv WHERE iv.indicator_code = rec.code AND iv.site_name = p_site_name AND EXTRACT(YEAR FROM iv.created_at) = p_year AND EXTRACT(MONTH FROM iv.created_at) = 4 AND iv.status = 'validated' ORDER BY iv.created_at DESC LIMIT 1),
            (SELECT value FROM indicator_values iv WHERE iv.indicator_code = rec.code AND iv.site_name = p_site_name AND EXTRACT(YEAR FROM iv.created_at) = p_year AND EXTRACT(MONTH FROM iv.created_at) = 5 AND iv.status = 'validated' ORDER BY iv.created_at DESC LIMIT 1),
            (SELECT value FROM indicator_values iv WHERE iv.indicator_code = rec.code AND iv.site_name = p_site_name AND EXTRACT(YEAR FROM iv.created_at) = p_year AND EXTRACT(MONTH FROM iv.created_at) = 6 AND iv.status = 'validated' ORDER BY iv.created_at DESC LIMIT 1),
            (SELECT value FROM indicator_values iv WHERE iv.indicator_code = rec.code AND iv.site_name = p_site_name AND EXTRACT(YEAR FROM iv.created_at) = p_year AND EXTRACT(MONTH FROM iv.created_at) = 7 AND iv.status = 'validated' ORDER BY iv.created_at DESC LIMIT 1),
            (SELECT value FROM indicator_values iv WHERE iv.indicator_code = rec.code AND iv.site_name = p_site_name AND EXTRACT(YEAR FROM iv.created_at) = p_year AND EXTRACT(MONTH FROM iv.created_at) = 8 AND iv.status = 'validated' ORDER BY iv.created_at DESC LIMIT 1),
            (SELECT value FROM indicator_values iv WHERE iv.indicator_code = rec.code AND iv.site_name = p_site_name AND EXTRACT(YEAR FROM iv.created_at) = p_year AND EXTRACT(MONTH FROM iv.created_at) = 9 AND iv.status = 'validated' ORDER BY iv.created_at DESC LIMIT 1),
            (SELECT value FROM indicator_values iv WHERE iv.indicator_code = rec.code AND iv.site_name = p_site_name AND EXTRACT(YEAR FROM iv.created_at) = p_year AND EXTRACT(MONTH FROM iv.created_at) = 10 AND iv.status = 'validated' ORDER BY iv.created_at DESC LIMIT 1),
            (SELECT value FROM indicator_values iv WHERE iv.indicator_code = rec.code AND iv.site_name = p_site_name AND EXTRACT(YEAR FROM iv.created_at) = p_year AND EXTRACT(MONTH FROM iv.created_at) = 11 AND iv.status = 'validated' ORDER BY iv.created_at DESC LIMIT 1),
            (SELECT value FROM indicator_values iv WHERE iv.indicator_code = rec.code AND iv.site_name = p_site_name AND EXTRACT(YEAR FROM iv.created_at) = p_year AND EXTRACT(MONTH FROM iv.created_at) = 12 AND iv.status = 'validated' ORDER BY iv.created_at DESC LIMIT 1),
            
            -- Variations et performances (calculées après)
            NULL, NULL,
            NULL, NULL, NULL, NULL, NULL, NULL,
            NULL, NULL, NULL, NULL, NULL, NULL
            
        ON CONFLICT (site_name, code, year) 
        DO UPDATE SET
            value = EXCLUDED.value,
            valeur_precedente = EXCLUDED.valeur_precedente,
            cible = EXCLUDED.cible,
            janvier = EXCLUDED.janvier,
            fevrier = EXCLUDED.fevrier,
            mars = EXCLUDED.mars,
            avril = EXCLUDED.avril,
            mai = EXCLUDED.mai,
            juin = EXCLUDED.juin,
            juillet = EXCLUDED.juillet,
            aout = EXCLUDED.aout,
            septembre = EXCLUDED.septembre,
            octobre = EXCLUDED.octobre,
            novembre = EXCLUDED.novembre,
            decembre = EXCLUDED.decembre,
            updated_at = NOW();
            
        inserted_count := inserted_count + 1;
    END LOOP;
    
    -- Calculer les variations et performances
    UPDATE site_global_indicator_values_simple 
    SET 
        variations_pourcent = CASE 
            WHEN valeur_precedente IS NOT NULL AND valeur_precedente != 0 AND value IS NOT NULL
            THEN ROUND(((value - valeur_precedente) / valeur_precedente * 100)::numeric, 2)
            ELSE NULL
        END,
        variation = CASE 
            WHEN valeur_precedente IS NOT NULL AND valeur_precedente != 0 AND value IS NOT NULL
            THEN CASE 
                WHEN value > valeur_precedente THEN 'hausse'
                WHEN value < valeur_precedente THEN 'baisse'
                ELSE 'stable'
            END
            ELSE NULL
        END,
        performances_pourcent = CASE 
            WHEN cible IS NOT NULL AND cible != 0 AND value IS NOT NULL
            THEN ROUND((value / cible * 100)::numeric, 2)
            ELSE NULL
        END
    WHERE site_name = p_site_name AND year = p_year;
    
    -- Calculer les performances mensuelles
    UPDATE site_global_indicator_values_simple 
    SET 
        perf_janvier = CASE WHEN cible IS NOT NULL AND cible != 0 AND janvier IS NOT NULL THEN ROUND((janvier / cible * 100)::numeric, 2) ELSE NULL END,
        perf_fevrier = CASE WHEN cible IS NOT NULL AND cible != 0 AND fevrier IS NOT NULL THEN ROUND((fevrier / cible * 100)::numeric, 2) ELSE NULL END,
        perf_mars = CASE WHEN cible IS NOT NULL AND cible != 0 AND mars IS NOT NULL THEN ROUND((mars / cible * 100)::numeric, 2) ELSE NULL END,
        perf_avril = CASE WHEN cible IS NOT NULL AND cible != 0 AND avril IS NOT NULL THEN ROUND((avril / cible * 100)::numeric, 2) ELSE NULL END,
        perf_mai = CASE WHEN cible IS NOT NULL AND cible != 0 AND mai IS NOT NULL THEN ROUND((mai / cible * 100)::numeric, 2) ELSE NULL END,
        perf_juin = CASE WHEN cible IS NOT NULL AND cible != 0 AND juin IS NOT NULL THEN ROUND((juin / cible * 100)::numeric, 2) ELSE NULL END,
        perf_juillet = CASE WHEN cible IS NOT NULL AND cible != 0 AND juillet IS NOT NULL THEN ROUND((juillet / cible * 100)::numeric, 2) ELSE NULL END,
        perf_aout = CASE WHEN cible IS NOT NULL AND cible != 0 AND aout IS NOT NULL THEN ROUND((aout / cible * 100)::numeric, 2) ELSE NULL END,
        perf_septembre = CASE WHEN cible IS NOT NULL AND cible != 0 AND septembre IS NOT NULL THEN ROUND((septembre / cible * 100)::numeric, 2) ELSE NULL END,
        perf_octobre = CASE WHEN cible IS NOT NULL AND cible != 0 AND octobre IS NOT NULL THEN ROUND((octobre / cible * 100)::numeric, 2) ELSE NULL END,
        perf_novembre = CASE WHEN cible IS NOT NULL AND cible != 0 AND novembre IS NOT NULL THEN ROUND((novembre / cible * 100)::numeric, 2) ELSE NULL END,
        perf_decembre = CASE WHEN cible IS NOT NULL AND cible != 0 AND decembre IS NOT NULL THEN ROUND((decembre / cible * 100)::numeric, 2) ELSE NULL END
    WHERE site_name = p_site_name AND year = p_year;
    
    RETURN inserted_count;
END;
$$ LANGUAGE plpgsql;

-- Peupler pour tous les sites existants
DO $$
DECLARE
    site_rec RECORD;
    current_year integer := EXTRACT(YEAR FROM CURRENT_DATE)::integer;
    prev_year integer := current_year - 1;
    total_count integer := 0;
    site_count integer := 0;
BEGIN
    RAISE NOTICE 'Début du peuplement automatique des indicateurs par site...';
    
    -- Pour chaque site qui a des processus actifs
    FOR site_rec IN
        SELECT DISTINCT s.name as site_name
        FROM sites s
        JOIN site_processes sp ON sp.site_name = s.name AND sp.is_active = true
        ORDER BY s.name
    LOOP
        RAISE NOTICE 'Traitement du site: %', site_rec.site_name;
        
        -- Peupler pour l'année courante
        total_count := total_count + populate_site_indicators(site_rec.site_name, current_year);
        
        -- Peupler pour l'année précédente
        total_count := total_count + populate_site_indicators(site_rec.site_name, prev_year);
        
        site_count := site_count + 1;
    END LOOP;
    
    RAISE NOTICE 'Peuplement terminé: % sites traités, % indicateurs créés/mis à jour', site_count, total_count;
END $$;

-- Trigger pour peupler automatiquement lors d'ajout de site/processus
CREATE OR REPLACE FUNCTION trigger_populate_site_indicators_on_site_process()
RETURNS TRIGGER AS $$
BEGIN
    -- Peupler pour l'année courante et précédente
    PERFORM populate_site_indicators(NEW.site_name, EXTRACT(YEAR FROM CURRENT_DATE)::integer);
    PERFORM populate_site_indicators(NEW.site_name, EXTRACT(YEAR FROM CURRENT_DATE)::integer - 1);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour peupler automatiquement lors d'ajout d'indicateur
CREATE OR REPLACE FUNCTION trigger_populate_indicators_on_new_indicator()
RETURNS TRIGGER AS $$
DECLARE
    site_rec RECORD;
    current_year integer := EXTRACT(YEAR FROM CURRENT_DATE)::integer;
    prev_year integer := current_year - 1;
BEGIN
    -- Pour chaque site qui a ce processus
    FOR site_rec IN
        SELECT DISTINCT sp.site_name
        FROM site_processes sp
        WHERE sp.processus_code = NEW.processus_code AND sp.is_active = true
    LOOP
        -- Peupler pour ce site
        PERFORM populate_site_indicators(site_rec.site_name, current_year);
        PERFORM populate_site_indicators(site_rec.site_name, prev_year);
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer les triggers s'ils n'existent pas déjà
DROP TRIGGER IF EXISTS trigger_populate_on_site_process_insert ON site_processes;
CREATE TRIGGER trigger_populate_on_site_process_insert
    AFTER INSERT ON site_processes
    FOR EACH ROW
    EXECUTE FUNCTION trigger_populate_site_indicators_on_site_process();

DROP TRIGGER IF EXISTS trigger_populate_on_indicator_insert ON indicators;
CREATE TRIGGER trigger_populate_on_indicator_insert
    AFTER INSERT ON indicators
    FOR EACH ROW
    EXECUTE FUNCTION trigger_populate_indicators_on_new_indicator();