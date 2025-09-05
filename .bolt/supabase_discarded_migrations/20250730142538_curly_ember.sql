/*
  # Trigger de mise à jour automatique des tables de performance

  1. Fonction de mise à jour des performances
    - Calcule les performances par axe énergétique
    - Calcule les performances par enjeu
    - Calcule les performances par critère
    - Calcule la performance globale

  2. Trigger
    - Se déclenche sur INSERT, UPDATE, DELETE de site_global_indicator_values_simple
    - Met à jour automatiquement toutes les tables de performance
*/

-- Fonction pour calculer et mettre à jour les performances
CREATE OR REPLACE FUNCTION update_site_performances()
RETURNS TRIGGER AS $$
DECLARE
    affected_site_name TEXT;
    affected_year INTEGER;
    rec RECORD;
    total_indicators INTEGER;
    total_performance NUMERIC;
    avg_performance NUMERIC;
    month_performances NUMERIC[];
    i INTEGER;
BEGIN
    -- Déterminer le site et l'année affectés
    IF TG_OP = 'DELETE' THEN
        affected_site_name := OLD.site_name;
        affected_year := OLD.year;
    ELSE
        affected_site_name := NEW.site_name;
        affected_year := NEW.year;
    END IF;

    -- 1. Mise à jour des performances par axe énergétique
    DELETE FROM site_performance_axes 
    WHERE site_name = affected_site_name AND annee = affected_year;

    FOR rec IN 
        SELECT 
            axe_energetique,
            COUNT(*) as nombre_indicateurs,
            AVG(performances_pourcent) as performance_moyenne,
            AVG(variations_pourcent) as performance_precedente_avg,
            AVG(perf_janvier) as perf_janvier,
            AVG(perf_fevrier) as perf_fevrier,
            AVG(perf_mars) as perf_mars,
            AVG(perf_avril) as perf_avril,
            AVG(perf_mai) as perf_mai,
            AVG(perf_juin) as perf_juin,
            AVG(perf_juillet) as perf_juillet,
            AVG(perf_aout) as perf_aout,
            AVG(perf_septembre) as perf_septembre,
            AVG(perf_octobre) as perf_octobre,
            AVG(perf_novembre) as perf_novembre,
            AVG(perf_decembre) as perf_decembre
        FROM site_global_indicator_values_simple 
        WHERE site_name = affected_site_name 
        AND year = affected_year 
        AND axe_energetique IS NOT NULL
        GROUP BY axe_energetique
    LOOP
        INSERT INTO site_performance_axes (
            site_name, axe_energetique, annee, performance_pourcent, performance_precedente,
            performance_janvier, performance_fevrier, performance_mars, performance_avril,
            performance_mai, performance_juin, performance_juillet, performance_aout,
            performance_septembre, performance_octobre, performance_novembre, performance_decembre,
            nombre_enjeux
        ) VALUES (
            affected_site_name, rec.axe_energetique, affected_year, 
            ROUND(rec.performance_moyenne, 2), ROUND(rec.performance_precedente_avg, 2),
            ROUND(rec.perf_janvier, 2), ROUND(rec.perf_fevrier, 2), ROUND(rec.perf_mars, 2), ROUND(rec.perf_avril, 2),
            ROUND(rec.perf_mai, 2), ROUND(rec.perf_juin, 2), ROUND(rec.perf_juillet, 2), ROUND(rec.perf_aout, 2),
            ROUND(rec.perf_septembre, 2), ROUND(rec.perf_octobre, 2), ROUND(rec.perf_novembre, 2), ROUND(rec.perf_decembre, 2),
            rec.nombre_indicateurs
        );
    END LOOP;

    -- 2. Mise à jour des performances par enjeu
    DELETE FROM site_performance_enjeux 
    WHERE site_name = affected_site_name AND annee = affected_year;

    FOR rec IN 
        SELECT 
            enjeux,
            COUNT(*) as nombre_indicateurs,
            AVG(performances_pourcent) as performance_moyenne,
            AVG(variations_pourcent) as performance_precedente_avg,
            AVG(perf_janvier) as perf_janvier,
            AVG(perf_fevrier) as perf_fevrier,
            AVG(perf_mars) as perf_mars,
            AVG(perf_avril) as perf_avril,
            AVG(perf_mai) as perf_mai,
            AVG(perf_juin) as perf_juin,
            AVG(perf_juillet) as perf_juillet,
            AVG(perf_aout) as perf_aout,
            AVG(perf_septembre) as perf_septembre,
            AVG(perf_octobre) as perf_octobre,
            AVG(perf_novembre) as perf_novembre,
            AVG(perf_decembre) as perf_decembre
        FROM site_global_indicator_values_simple 
        WHERE site_name = affected_site_name 
        AND year = affected_year 
        AND enjeux IS NOT NULL
        GROUP BY enjeux
    LOOP
        INSERT INTO site_performance_enjeux (
            site_name, enjeux, annee, performance_pourcent, performance_precedente,
            performance_janvier, performance_fevrier, performance_mars, performance_avril,
            performance_mai, performance_juin, performance_juillet, performance_aout,
            performance_septembre, performance_octobre, performance_novembre, performance_decembre,
            nombre_criteres
        ) VALUES (
            affected_site_name, rec.enjeux, affected_year, 
            ROUND(rec.performance_moyenne, 2), ROUND(rec.performance_precedente_avg, 2),
            ROUND(rec.perf_janvier, 2), ROUND(rec.perf_fevrier, 2), ROUND(rec.perf_mars, 2), ROUND(rec.perf_avril, 2),
            ROUND(rec.perf_mai, 2), ROUND(rec.perf_juin, 2), ROUND(rec.perf_juillet, 2), ROUND(rec.perf_aout, 2),
            ROUND(rec.perf_septembre, 2), ROUND(rec.perf_octobre, 2), ROUND(rec.perf_novembre, 2), ROUND(rec.perf_decembre, 2),
            rec.nombre_indicateurs
        );
    END LOOP;

    -- 3. Mise à jour des performances par critère
    DELETE FROM site_performance_criteres 
    WHERE site_name = affected_site_name AND annee = affected_year;

    FOR rec IN 
        SELECT 
            critere,
            COUNT(*) as nombre_indicateurs,
            AVG(performances_pourcent) as performance_moyenne,
            AVG(variations_pourcent) as performance_precedente_avg,
            AVG(perf_janvier) as perf_janvier,
            AVG(perf_fevrier) as perf_fevrier,
            AVG(perf_mars) as perf_mars,
            AVG(perf_avril) as perf_avril,
            AVG(perf_mai) as perf_mai,
            AVG(perf_juin) as perf_juin,
            AVG(perf_juillet) as perf_juillet,
            AVG(perf_aout) as perf_aout,
            AVG(perf_septembre) as perf_septembre,
            AVG(perf_octobre) as perf_octobre,
            AVG(perf_novembre) as perf_novembre,
            AVG(perf_decembre) as perf_decembre
        FROM site_global_indicator_values_simple 
        WHERE site_name = affected_site_name 
        AND year = affected_year 
        AND critere IS NOT NULL
        GROUP BY critere
    LOOP
        INSERT INTO site_performance_criteres (
            site_name, critere, annee, performance_pourcent, performance_precedente,
            performance_janvier, performance_fevrier, performance_mars, performance_avril,
            performance_mai, performance_juin, performance_juillet, performance_aout,
            performance_septembre, performance_octobre, performance_novembre, performance_decembre,
            nombre_indicateurs
        ) VALUES (
            affected_site_name, rec.critere, affected_year, 
            ROUND(rec.performance_moyenne, 2), ROUND(rec.performance_precedente_avg, 2),
            ROUND(rec.perf_janvier, 2), ROUND(rec.perf_fevrier, 2), ROUND(rec.perf_mars, 2), ROUND(rec.perf_avril, 2),
            ROUND(rec.perf_mai, 2), ROUND(rec.perf_juin, 2), ROUND(rec.perf_juillet, 2), ROUND(rec.perf_aout, 2),
            ROUND(rec.perf_septembre, 2), ROUND(rec.perf_octobre, 2), ROUND(rec.perf_novembre, 2), ROUND(rec.perf_decembre, 2),
            rec.nombre_indicateurs
        );
    END LOOP;

    -- 4. Mise à jour de la performance globale
    DELETE FROM site_performance_globale 
    WHERE site_name = affected_site_name AND annee = affected_year;

    -- Calculer la performance globale
    SELECT 
        COUNT(*) as total_indicators,
        AVG(performances_pourcent) as avg_performance,
        AVG(variations_pourcent) as avg_performance_precedente,
        AVG(perf_janvier) as avg_janvier,
        AVG(perf_fevrier) as avg_fevrier,
        AVG(perf_mars) as avg_mars,
        AVG(perf_avril) as avg_avril,
        AVG(perf_mai) as avg_mai,
        AVG(perf_juin) as avg_juin,
        AVG(perf_juillet) as avg_juillet,
        AVG(perf_aout) as avg_aout,
        AVG(perf_septembre) as avg_septembre,
        AVG(perf_octobre) as avg_octobre,
        AVG(perf_novembre) as avg_novembre,
        AVG(perf_decembre) as avg_decembre,
        COUNT(DISTINCT axe_energetique) as nombre_axes
    INTO rec
    FROM site_global_indicator_values_simple 
    WHERE site_name = affected_site_name 
    AND year = affected_year;

    IF rec.total_indicators > 0 THEN
        INSERT INTO site_performance_globale (
            site_name, annee, performance_pourcent, performance_precedente,
            performance_janvier, performance_fevrier, performance_mars, performance_avril,
            performance_mai, performance_juin, performance_juillet, performance_aout,
            performance_septembre, performance_octobre, performance_novembre, performance_decembre,
            nombre_axes, nombre_total_indicateurs
        ) VALUES (
            affected_site_name, affected_year, 
            ROUND(rec.avg_performance, 2), ROUND(rec.avg_performance_precedente, 2),
            ROUND(rec.avg_janvier, 2), ROUND(rec.avg_fevrier, 2), ROUND(rec.avg_mars, 2), ROUND(rec.avg_avril, 2),
            ROUND(rec.avg_mai, 2), ROUND(rec.avg_juin, 2), ROUND(rec.avg_juillet, 2), ROUND(rec.avg_aout, 2),
            ROUND(rec.avg_septembre, 2), ROUND(rec.avg_octobre, 2), ROUND(rec.avg_novembre, 2), ROUND(rec.avg_decembre, 2),
            rec.nombre_axes, rec.total_indicators
        );
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Supprimer le trigger existant s'il existe
DROP TRIGGER IF EXISTS trigger_update_site_performances ON site_global_indicator_values_simple;

-- Créer le trigger
CREATE TRIGGER trigger_update_site_performances
    AFTER INSERT OR UPDATE OR DELETE ON site_global_indicator_values_simple
    FOR EACH ROW
    EXECUTE FUNCTION update_site_performances();

-- Fonction pour recalculer toutes les performances existantes
CREATE OR REPLACE FUNCTION recalculate_all_site_performances()
RETURNS void AS $$
DECLARE
    site_year_rec RECORD;
BEGIN
    -- Recalculer pour chaque combinaison site/année existante
    FOR site_year_rec IN 
        SELECT DISTINCT site_name, year 
        FROM site_global_indicator_values_simple
    LOOP
        -- Simuler un UPDATE pour déclencher le recalcul
        UPDATE site_global_indicator_values_simple 
        SET updated_at = NOW() 
        WHERE site_name = site_year_rec.site_name 
        AND year = site_year_rec.year 
        LIMIT 1;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Exécuter le recalcul pour les données existantes
SELECT recalculate_all_site_performances();