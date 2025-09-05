/*
  # Trigger de mise à jour automatique des tables de performance

  1. Nouvelle fonction
    - `update_site_performances_on_indicator_change()` - Met à jour toutes les tables de performance
    
  2. Nouveau trigger
    - Se déclenche sur INSERT, UPDATE, DELETE de `site_global_indicator_values_simple`
    - Recalcule automatiquement les performances par axe, enjeu, critère et globale
    
  3. Logique de calcul
    - Calcule les moyennes des performances par mois et année
    - Met à jour les compteurs d'indicateurs
    - Gère les suppressions d'indicateurs
*/

-- Fonction pour mettre à jour les tables de performance
CREATE OR REPLACE FUNCTION update_site_performances_on_indicator_change()
RETURNS TRIGGER AS $$
DECLARE
    target_site_name TEXT;
    target_year INTEGER;
    axe_record RECORD;
    enjeu_record RECORD;
    critere_record RECORD;
BEGIN
    -- Déterminer le site et l'année à traiter
    IF TG_OP = 'DELETE' THEN
        target_site_name := OLD.site_name;
        target_year := OLD.year;
    ELSE
        target_site_name := NEW.site_name;
        target_year := NEW.year;
    END IF;

    -- Mise à jour de site_performance_axes
    FOR axe_record IN 
        SELECT DISTINCT axe_energetique 
        FROM site_global_indicator_values_simple 
        WHERE site_name = target_site_name 
        AND year = target_year 
        AND axe_energetique IS NOT NULL
    LOOP
        INSERT INTO site_performance_axes (
            site_name, 
            axe_energetique, 
            annee,
            performance_pourcent,
            performance_precedente,
            performance_janvier,
            performance_fevrier,
            performance_mars,
            performance_avril,
            performance_mai,
            performance_juin,
            performance_juillet,
            performance_aout,
            performance_septembre,
            performance_octobre,
            performance_novembre,
            performance_decembre,
            nombre_enjeux
        )
        SELECT 
            target_site_name,
            axe_record.axe_energetique,
            target_year,
            COALESCE(AVG(performances_pourcent), 0) as performance_pourcent,
            COALESCE(AVG(
                (SELECT AVG(prev.performances_pourcent) 
                 FROM site_global_indicator_values_simple prev 
                 WHERE prev.site_name = target_site_name 
                 AND prev.year = target_year - 1 
                 AND prev.axe_energetique = axe_record.axe_energetique)
            ), 0) as performance_precedente,
            COALESCE(AVG(perf_janvier), 0) as performance_janvier,
            COALESCE(AVG(perf_fevrier), 0) as performance_fevrier,
            COALESCE(AVG(perf_mars), 0) as performance_mars,
            COALESCE(AVG(perf_avril), 0) as performance_avril,
            COALESCE(AVG(perf_mai), 0) as performance_mai,
            COALESCE(AVG(perf_juin), 0) as performance_juin,
            COALESCE(AVG(perf_juillet), 0) as performance_juillet,
            COALESCE(AVG(perf_aout), 0) as performance_aout,
            COALESCE(AVG(perf_septembre), 0) as performance_septembre,
            COALESCE(AVG(perf_octobre), 0) as performance_octobre,
            COALESCE(AVG(perf_novembre), 0) as performance_novembre,
            COALESCE(AVG(perf_decembre), 0) as performance_decembre,
            COUNT(DISTINCT enjeux) as nombre_enjeux
        FROM site_global_indicator_values_simple
        WHERE site_name = target_site_name 
        AND year = target_year 
        AND axe_energetique = axe_record.axe_energetique
        ON CONFLICT (site_name, axe_energetique, annee) 
        DO UPDATE SET
            performance_pourcent = EXCLUDED.performance_pourcent,
            performance_precedente = EXCLUDED.performance_precedente,
            performance_janvier = EXCLUDED.performance_janvier,
            performance_fevrier = EXCLUDED.performance_fevrier,
            performance_mars = EXCLUDED.performance_mars,
            performance_avril = EXCLUDED.performance_avril,
            performance_mai = EXCLUDED.performance_mai,
            performance_juin = EXCLUDED.performance_juin,
            performance_juillet = EXCLUDED.performance_juillet,
            performance_aout = EXCLUDED.performance_aout,
            performance_septembre = EXCLUDED.performance_septembre,
            performance_octobre = EXCLUDED.performance_octobre,
            performance_novembre = EXCLUDED.performance_novembre,
            performance_decembre = EXCLUDED.performance_decembre,
            nombre_enjeux = EXCLUDED.nombre_enjeux,
            updated_at = NOW();
    END LOOP;

    -- Mise à jour de site_performance_enjeux
    FOR enjeu_record IN 
        SELECT DISTINCT enjeux 
        FROM site_global_indicator_values_simple 
        WHERE site_name = target_site_name 
        AND year = target_year 
        AND enjeux IS NOT NULL
    LOOP
        INSERT INTO site_performance_enjeux (
            site_name, 
            enjeux, 
            annee,
            performance_pourcent,
            performance_precedente,
            performance_janvier,
            performance_fevrier,
            performance_mars,
            performance_avril,
            performance_mai,
            performance_juin,
            performance_juillet,
            performance_aout,
            performance_septembre,
            performance_octobre,
            performance_novembre,
            performance_decembre,
            nombre_criteres
        )
        SELECT 
            target_site_name,
            enjeu_record.enjeux,
            target_year,
            COALESCE(AVG(performances_pourcent), 0) as performance_pourcent,
            COALESCE(AVG(
                (SELECT AVG(prev.performances_pourcent) 
                 FROM site_global_indicator_values_simple prev 
                 WHERE prev.site_name = target_site_name 
                 AND prev.year = target_year - 1 
                 AND prev.enjeux = enjeu_record.enjeux)
            ), 0) as performance_precedente,
            COALESCE(AVG(perf_janvier), 0) as performance_janvier,
            COALESCE(AVG(perf_fevrier), 0) as performance_fevrier,
            COALESCE(AVG(perf_mars), 0) as performance_mars,
            COALESCE(AVG(perf_avril), 0) as performance_avril,
            COALESCE(AVG(perf_mai), 0) as performance_mai,
            COALESCE(AVG(perf_juin), 0) as performance_juin,
            COALESCE(AVG(perf_juillet), 0) as performance_juillet,
            COALESCE(AVG(perf_aout), 0) as performance_aout,
            COALESCE(AVG(perf_septembre), 0) as performance_septembre,
            COALESCE(AVG(perf_octobre), 0) as performance_octobre,
            COALESCE(AVG(perf_novembre), 0) as performance_novembre,
            COALESCE(AVG(perf_decembre), 0) as performance_decembre,
            COUNT(DISTINCT critere) as nombre_criteres
        FROM site_global_indicator_values_simple
        WHERE site_name = target_site_name 
        AND year = target_year 
        AND enjeux = enjeu_record.enjeux
        ON CONFLICT (site_name, enjeux, annee) 
        DO UPDATE SET
            performance_pourcent = EXCLUDED.performance_pourcent,
            performance_precedente = EXCLUDED.performance_precedente,
            performance_janvier = EXCLUDED.performance_janvier,
            performance_fevrier = EXCLUDED.performance_fevrier,
            performance_mars = EXCLUDED.performance_mars,
            performance_avril = EXCLUDED.performance_avril,
            performance_mai = EXCLUDED.performance_mai,
            performance_juin = EXCLUDED.performance_juin,
            performance_juillet = EXCLUDED.performance_juillet,
            performance_aout = EXCLUDED.performance_aout,
            performance_septembre = EXCLUDED.performance_septembre,
            performance_octobre = EXCLUDED.performance_octobre,
            performance_novembre = EXCLUDED.performance_novembre,
            performance_decembre = EXCLUDED.performance_decembre,
            nombre_criteres = EXCLUDED.nombre_criteres,
            updated_at = NOW();
    END LOOP;

    -- Mise à jour de site_performance_criteres
    FOR critere_record IN 
        SELECT DISTINCT critere 
        FROM site_global_indicator_values_simple 
        WHERE site_name = target_site_name 
        AND year = target_year 
        AND critere IS NOT NULL
    LOOP
        INSERT INTO site_performance_criteres (
            site_name, 
            critere, 
            annee,
            performance_pourcent,
            performance_precedente,
            performance_janvier,
            performance_fevrier,
            performance_mars,
            performance_avril,
            performance_mai,
            performance_juin,
            performance_juillet,
            performance_aout,
            performance_septembre,
            performance_octobre,
            performance_novembre,
            performance_decembre,
            nombre_indicateurs
        )
        SELECT 
            target_site_name,
            critere_record.critere,
            target_year,
            COALESCE(AVG(performances_pourcent), 0) as performance_pourcent,
            COALESCE(AVG(
                (SELECT AVG(prev.performances_pourcent) 
                 FROM site_global_indicator_values_simple prev 
                 WHERE prev.site_name = target_site_name 
                 AND prev.year = target_year - 1 
                 AND prev.critere = critere_record.critere)
            ), 0) as performance_precedente,
            COALESCE(AVG(perf_janvier), 0) as performance_janvier,
            COALESCE(AVG(perf_fevrier), 0) as performance_fevrier,
            COALESCE(AVG(perf_mars), 0) as performance_mars,
            COALESCE(AVG(perf_avril), 0) as performance_avril,
            COALESCE(AVG(perf_mai), 0) as performance_mai,
            COALESCE(AVG(perf_juin), 0) as performance_juin,
            COALESCE(AVG(perf_juillet), 0) as performance_juillet,
            COALESCE(AVG(perf_aout), 0) as performance_aout,
            COALESCE(AVG(perf_septembre), 0) as performance_septembre,
            COALESCE(AVG(perf_octobre), 0) as performance_octobre,
            COALESCE(AVG(perf_novembre), 0) as performance_novembre,
            COALESCE(AVG(perf_decembre), 0) as performance_decembre,
            COUNT(*) as nombre_indicateurs
        FROM site_global_indicator_values_simple
        WHERE site_name = target_site_name 
        AND year = target_year 
        AND critere = critere_record.critere
        ON CONFLICT (site_name, critere, annee) 
        DO UPDATE SET
            performance_pourcent = EXCLUDED.performance_pourcent,
            performance_precedente = EXCLUDED.performance_precedente,
            performance_janvier = EXCLUDED.performance_janvier,
            performance_fevrier = EXCLUDED.performance_fevrier,
            performance_mars = EXCLUDED.performance_mars,
            performance_avril = EXCLUDED.performance_avril,
            performance_mai = EXCLUDED.performance_mai,
            performance_juin = EXCLUDED.performance_juin,
            performance_juillet = EXCLUDED.performance_juillet,
            performance_aout = EXCLUDED.performance_aout,
            performance_septembre = EXCLUDED.performance_septembre,
            performance_octobre = EXCLUDED.performance_octobre,
            performance_novembre = EXCLUDED.performance_novembre,
            performance_decembre = EXCLUDED.performance_decembre,
            nombre_indicateurs = EXCLUDED.nombre_indicateurs,
            updated_at = NOW();
    END LOOP;

    -- Mise à jour de site_performance_globale
    INSERT INTO site_performance_globale (
        site_name, 
        annee,
        performance_pourcent,
        performance_precedente,
        performance_janvier,
        performance_fevrier,
        performance_mars,
        performance_avril,
        performance_mai,
        performance_juin,
        performance_juillet,
        performance_aout,
        performance_septembre,
        performance_octobre,
        performance_novembre,
        performance_decembre,
        nombre_axes,
        nombre_total_indicateurs
    )
    SELECT 
        target_site_name,
        target_year,
        COALESCE(AVG(performances_pourcent), 0) as performance_pourcent,
        COALESCE(AVG(
            (SELECT AVG(prev.performances_pourcent) 
             FROM site_global_indicator_values_simple prev 
             WHERE prev.site_name = target_site_name 
             AND prev.year = target_year - 1)
        ), 0) as performance_precedente,
        COALESCE(AVG(perf_janvier), 0) as performance_janvier,
        COALESCE(AVG(perf_fevrier), 0) as performance_fevrier,
        COALESCE(AVG(perf_mars), 0) as performance_mars,
        COALESCE(AVG(perf_avril), 0) as performance_avril,
        COALESCE(AVG(perf_mai), 0) as performance_mai,
        COALESCE(AVG(perf_juin), 0) as performance_juin,
        COALESCE(AVG(perf_juillet), 0) as performance_juillet,
        COALESCE(AVG(perf_aout), 0) as performance_aout,
        COALESCE(AVG(perf_septembre), 0) as performance_septembre,
        COALESCE(AVG(perf_octobre), 0) as performance_octobre,
        COALESCE(AVG(perf_novembre), 0) as performance_novembre,
        COALESCE(AVG(perf_decembre), 0) as performance_decembre,
        COUNT(DISTINCT axe_energetique) as nombre_axes,
        COUNT(*) as nombre_total_indicateurs
    FROM site_global_indicator_values_simple
    WHERE site_name = target_site_name 
    AND year = target_year
    ON CONFLICT (site_name, annee) 
    DO UPDATE SET
        performance_pourcent = EXCLUDED.performance_pourcent,
        performance_precedente = EXCLUDED.performance_precedente,
        performance_janvier = EXCLUDED.performance_janvier,
        performance_fevrier = EXCLUDED.performance_fevrier,
        performance_mars = EXCLUDED.performance_mars,
        performance_avril = EXCLUDED.performance_avril,
        performance_mai = EXCLUDED.performance_mai,
        performance_juin = EXCLUDED.performance_juin,
        performance_juillet = EXCLUDED.performance_juillet,
        performance_aout = EXCLUDED.performance_aout,
        performance_septembre = EXCLUDED.performance_septembre,
        performance_octobre = EXCLUDED.performance_octobre,
        performance_novembre = EXCLUDED.performance_novembre,
        performance_decembre = EXCLUDED.performance_decembre,
        nombre_axes = EXCLUDED.nombre_axes,
        nombre_total_indicateurs = EXCLUDED.nombre_total_indicateurs,
        updated_at = NOW();

    -- Nettoyer les enregistrements orphelins en cas de suppression
    IF TG_OP = 'DELETE' THEN
        -- Supprimer les performances d'axes qui n'ont plus d'indicateurs
        DELETE FROM site_performance_axes 
        WHERE site_name = target_site_name 
        AND annee = target_year 
        AND axe_energetique NOT IN (
            SELECT DISTINCT axe_energetique 
            FROM site_global_indicator_values_simple 
            WHERE site_name = target_site_name 
            AND year = target_year 
            AND axe_energetique IS NOT NULL
        );

        -- Supprimer les performances d'enjeux qui n'ont plus d'indicateurs
        DELETE FROM site_performance_enjeux 
        WHERE site_name = target_site_name 
        AND annee = target_year 
        AND enjeux NOT IN (
            SELECT DISTINCT enjeux 
            FROM site_global_indicator_values_simple 
            WHERE site_name = target_site_name 
            AND year = target_year 
            AND enjeux IS NOT NULL
        );

        -- Supprimer les performances de critères qui n'ont plus d'indicateurs
        DELETE FROM site_performance_criteres 
        WHERE site_name = target_site_name 
        AND annee = target_year 
        AND critere NOT IN (
            SELECT DISTINCT critere 
            FROM site_global_indicator_values_simple 
            WHERE site_name = target_site_name 
            AND year = target_year 
            AND critere IS NOT NULL
        );

        -- Supprimer la performance globale si plus d'indicateurs
        IF NOT EXISTS (
            SELECT 1 FROM site_global_indicator_values_simple 
            WHERE site_name = target_site_name 
            AND year = target_year
        ) THEN
            DELETE FROM site_performance_globale 
            WHERE site_name = target_site_name 
            AND annee = target_year;
        END IF;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Supprimer le trigger existant s'il existe
DROP TRIGGER IF EXISTS trigger_update_site_performances_on_indicator_change ON site_global_indicator_values_simple;

-- Créer le trigger
CREATE TRIGGER trigger_update_site_performances_on_indicator_change
    AFTER INSERT OR UPDATE OR DELETE ON site_global_indicator_values_simple
    FOR EACH ROW
    EXECUTE FUNCTION update_site_performances_on_indicator_change();

-- Fonction pour recalculer toutes les performances existantes (utile pour la migration)
CREATE OR REPLACE FUNCTION recalculate_all_site_performances()
RETURNS void AS $$
DECLARE
    site_year_record RECORD;
BEGIN
    -- Recalculer pour chaque combinaison site/année existante
    FOR site_year_record IN 
        SELECT DISTINCT site_name, year 
        FROM site_global_indicator_values_simple
    LOOP
        -- Déclencher le recalcul en simulant une mise à jour
        UPDATE site_global_indicator_values_simple 
        SET updated_at = NOW() 
        WHERE site_name = site_year_record.site_name 
        AND year = site_year_record.year 
        LIMIT 1;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Exécuter le recalcul initial pour les données existantes
SELECT recalculate_all_site_performances();