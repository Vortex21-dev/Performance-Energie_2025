/*
  # Trigger de mise à jour automatique des tables de performance

  1. Fonction de mise à jour des performances
    - Calcule les performances par axe énergétique
    - Calcule les performances par enjeu
    - Calcule les performances par critère
    - Calcule la performance globale

  2. Trigger sur site_global_indicator_values_simple
    - Se déclenche sur INSERT, UPDATE, DELETE
    - Met à jour automatiquement toutes les tables de performance
*/

-- Fonction pour mettre à jour les performances par axe énergétique
CREATE OR REPLACE FUNCTION update_site_performance_axes()
RETURNS TRIGGER AS $$
DECLARE
    site_name_val TEXT;
    annee_val INTEGER;
    axe_val TEXT;
    performance_data RECORD;
    monthly_performances NUMERIC[];
    avg_performance NUMERIC;
    prev_performance NUMERIC;
    nombre_enjeux_count INTEGER;
BEGIN
    -- Déterminer les valeurs selon l'opération
    IF TG_OP = 'DELETE' THEN
        site_name_val := OLD.site_name;
        annee_val := OLD.year;
        axe_val := OLD.axe_energetique;
    ELSE
        site_name_val := NEW.site_name;
        annee_val := NEW.year;
        axe_val := NEW.axe_energetique;
    END IF;

    -- Calculer les performances pour cet axe
    SELECT 
        AVG(performances_pourcent) as avg_perf,
        ARRAY[
            AVG(perf_janvier), AVG(perf_fevrier), AVG(perf_mars), AVG(perf_avril),
            AVG(perf_mai), AVG(perf_juin), AVG(perf_juillet), AVG(perf_aout),
            AVG(perf_septembre), AVG(perf_octobre), AVG(perf_novembre), AVG(perf_decembre)
        ] as monthly_perfs,
        COUNT(DISTINCT enjeux) as nb_enjeux
    INTO performance_data
    FROM site_global_indicator_values_simple
    WHERE site_name = site_name_val 
      AND year = annee_val 
      AND axe_energetique = axe_val
      AND performances_pourcent IS NOT NULL;

    -- Récupérer la performance de l'année précédente
    SELECT AVG(performance_pourcent)
    INTO prev_performance
    FROM site_performance_axes
    WHERE site_name = site_name_val 
      AND annee = annee_val - 1 
      AND axe_energetique = axe_val;

    -- Mettre à jour ou insérer dans site_performance_axes
    INSERT INTO site_performance_axes (
        site_name, axe_energetique, annee,
        performance_pourcent, performance_precedente,
        performance_janvier, performance_fevrier, performance_mars, performance_avril,
        performance_mai, performance_juin, performance_juillet, performance_aout,
        performance_septembre, performance_octobre, performance_novembre, performance_decembre,
        nombre_enjeux, created_at, updated_at
    )
    VALUES (
        site_name_val, axe_val, annee_val,
        performance_data.avg_perf, prev_performance,
        performance_data.monthly_perfs[1], performance_data.monthly_perfs[2], performance_data.monthly_perfs[3], performance_data.monthly_perfs[4],
        performance_data.monthly_perfs[5], performance_data.monthly_perfs[6], performance_data.monthly_perfs[7], performance_data.monthly_perfs[8],
        performance_data.monthly_perfs[9], performance_data.monthly_perfs[10], performance_data.monthly_perfs[11], performance_data.monthly_perfs[12],
        performance_data.nb_enjeux, NOW(), NOW()
    )
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

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Fonction pour mettre à jour les performances par enjeu
CREATE OR REPLACE FUNCTION update_site_performance_enjeux()
RETURNS TRIGGER AS $$
DECLARE
    site_name_val TEXT;
    annee_val INTEGER;
    enjeu_val TEXT;
    performance_data RECORD;
    prev_performance NUMERIC;
BEGIN
    -- Déterminer les valeurs selon l'opération
    IF TG_OP = 'DELETE' THEN
        site_name_val := OLD.site_name;
        annee_val := OLD.year;
        enjeu_val := OLD.enjeux;
    ELSE
        site_name_val := NEW.site_name;
        annee_val := NEW.year;
        enjeu_val := NEW.enjeux;
    END IF;

    -- Calculer les performances pour cet enjeu
    SELECT 
        AVG(performances_pourcent) as avg_perf,
        ARRAY[
            AVG(perf_janvier), AVG(perf_fevrier), AVG(perf_mars), AVG(perf_avril),
            AVG(perf_mai), AVG(perf_juin), AVG(perf_juillet), AVG(perf_aout),
            AVG(perf_septembre), AVG(perf_octobre), AVG(perf_novembre), AVG(perf_decembre)
        ] as monthly_perfs,
        COUNT(DISTINCT critere) as nb_criteres
    INTO performance_data
    FROM site_global_indicator_values_simple
    WHERE site_name = site_name_val 
      AND year = annee_val 
      AND enjeux = enjeu_val
      AND performances_pourcent IS NOT NULL;

    -- Récupérer la performance de l'année précédente
    SELECT AVG(performance_pourcent)
    INTO prev_performance
    FROM site_performance_enjeux
    WHERE site_name = site_name_val 
      AND annee = annee_val - 1 
      AND enjeux = enjeu_val;

    -- Mettre à jour ou insérer dans site_performance_enjeux
    INSERT INTO site_performance_enjeux (
        site_name, enjeux, annee,
        performance_pourcent, performance_precedente,
        performance_janvier, performance_fevrier, performance_mars, performance_avril,
        performance_mai, performance_juin, performance_juillet, performance_aout,
        performance_septembre, performance_octobre, performance_novembre, performance_decembre,
        nombre_criteres, created_at, updated_at
    )
    VALUES (
        site_name_val, enjeu_val, annee_val,
        performance_data.avg_perf, prev_performance,
        performance_data.monthly_perfs[1], performance_data.monthly_perfs[2], performance_data.monthly_perfs[3], performance_data.monthly_perfs[4],
        performance_data.monthly_perfs[5], performance_data.monthly_perfs[6], performance_data.monthly_perfs[7], performance_data.monthly_perfs[8],
        performance_data.monthly_perfs[9], performance_data.monthly_perfs[10], performance_data.monthly_perfs[11], performance_data.monthly_perfs[12],
        performance_data.nb_criteres, NOW(), NOW()
    )
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

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Fonction pour mettre à jour les performances par critère
CREATE OR REPLACE FUNCTION update_site_performance_criteres()
RETURNS TRIGGER AS $$
DECLARE
    site_name_val TEXT;
    annee_val INTEGER;
    critere_val TEXT;
    performance_data RECORD;
    prev_performance NUMERIC;
BEGIN
    -- Déterminer les valeurs selon l'opération
    IF TG_OP = 'DELETE' THEN
        site_name_val := OLD.site_name;
        annee_val := OLD.year;
        critere_val := OLD.critere;
    ELSE
        site_name_val := NEW.site_name;
        annee_val := NEW.year;
        critere_val := NEW.critere;
    END IF;

    -- Calculer les performances pour ce critère
    SELECT 
        AVG(performances_pourcent) as avg_perf,
        ARRAY[
            AVG(perf_janvier), AVG(perf_fevrier), AVG(perf_mars), AVG(perf_avril),
            AVG(perf_mai), AVG(perf_juin), AVG(perf_juillet), AVG(perf_aout),
            AVG(perf_septembre), AVG(perf_octobre), AVG(perf_novembre), AVG(perf_decembre)
        ] as monthly_perfs,
        COUNT(*) as nb_indicateurs
    INTO performance_data
    FROM site_global_indicator_values_simple
    WHERE site_name = site_name_val 
      AND year = annee_val 
      AND critere = critere_val
      AND performances_pourcent IS NOT NULL;

    -- Récupérer la performance de l'année précédente
    SELECT AVG(performance_pourcent)
    INTO prev_performance
    FROM site_performance_criteres
    WHERE site_name = site_name_val 
      AND annee = annee_val - 1 
      AND critere = critere_val;

    -- Mettre à jour ou insérer dans site_performance_criteres
    INSERT INTO site_performance_criteres (
        site_name, critere, annee,
        performance_pourcent, performance_precedente,
        performance_janvier, performance_fevrier, performance_mars, performance_avril,
        performance_mai, performance_juin, performance_juillet, performance_aout,
        performance_septembre, performance_octobre, performance_novembre, performance_decembre,
        nombre_indicateurs, created_at, updated_at
    )
    VALUES (
        site_name_val, critere_val, annee_val,
        performance_data.avg_perf, prev_performance,
        performance_data.monthly_perfs[1], performance_data.monthly_perfs[2], performance_data.monthly_perfs[3], performance_data.monthly_perfs[4],
        performance_data.monthly_perfs[5], performance_data.monthly_perfs[6], performance_data.monthly_perfs[7], performance_data.monthly_perfs[8],
        performance_data.monthly_perfs[9], performance_data.monthly_perfs[10], performance_data.monthly_perfs[11], performance_data.monthly_perfs[12],
        performance_data.nb_indicateurs, NOW(), NOW()
    )
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

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Fonction pour mettre à jour la performance globale
CREATE OR REPLACE FUNCTION update_site_performance_globale()
RETURNS TRIGGER AS $$
DECLARE
    site_name_val TEXT;
    annee_val INTEGER;
    performance_data RECORD;
    prev_performance NUMERIC;
BEGIN
    -- Déterminer les valeurs selon l'opération
    IF TG_OP = 'DELETE' THEN
        site_name_val := OLD.site_name;
        annee_val := OLD.year;
    ELSE
        site_name_val := NEW.site_name;
        annee_val := NEW.year;
    END IF;

    -- Calculer la performance globale
    SELECT 
        AVG(performances_pourcent) as avg_perf,
        ARRAY[
            AVG(perf_janvier), AVG(perf_fevrier), AVG(perf_mars), AVG(perf_avril),
            AVG(perf_mai), AVG(perf_juin), AVG(perf_juillet), AVG(perf_aout),
            AVG(perf_septembre), AVG(perf_octobre), AVG(perf_novembre), AVG(perf_decembre)
        ] as monthly_perfs,
        COUNT(DISTINCT axe_energetique) as nb_axes,
        COUNT(*) as nb_total_indicateurs
    INTO performance_data
    FROM site_global_indicator_values_simple
    WHERE site_name = site_name_val 
      AND year = annee_val
      AND performances_pourcent IS NOT NULL;

    -- Récupérer la performance de l'année précédente
    SELECT performance_pourcent
    INTO prev_performance
    FROM site_performance_globale
    WHERE site_name = site_name_val 
      AND annee = annee_val - 1;

    -- Mettre à jour ou insérer dans site_performance_globale
    INSERT INTO site_performance_globale (
        site_name, annee,
        performance_pourcent, performance_precedente,
        performance_janvier, performance_fevrier, performance_mars, performance_avril,
        performance_mai, performance_juin, performance_juillet, performance_aout,
        performance_septembre, performance_octobre, performance_novembre, performance_decembre,
        nombre_axes, nombre_total_indicateurs, created_at, updated_at
    )
    VALUES (
        site_name_val, annee_val,
        performance_data.avg_perf, prev_performance,
        performance_data.monthly_perfs[1], performance_data.monthly_perfs[2], performance_data.monthly_perfs[3], performance_data.monthly_perfs[4],
        performance_data.monthly_perfs[5], performance_data.monthly_perfs[6], performance_data.monthly_perfs[7], performance_data.monthly_perfs[8],
        performance_data.monthly_perfs[9], performance_data.monthly_perfs[10], performance_data.monthly_perfs[11], performance_data.monthly_perfs[12],
        performance_data.nb_axes, performance_data.nb_total_indicateurs, NOW(), NOW()
    )
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

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Fonction principale qui orchestre toutes les mises à jour
CREATE OR REPLACE FUNCTION update_all_performance_tables()
RETURNS TRIGGER AS $$
BEGIN
    -- Mettre à jour les performances par axe
    PERFORM update_site_performance_axes();
    
    -- Mettre à jour les performances par enjeu
    PERFORM update_site_performance_enjeux();
    
    -- Mettre à jour les performances par critère
    PERFORM update_site_performance_criteres();
    
    -- Mettre à jour la performance globale
    PERFORM update_site_performance_globale();
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Supprimer les anciens triggers s'ils existent
DROP TRIGGER IF EXISTS trigger_update_performance_tables ON site_global_indicator_values_simple;

-- Créer le trigger principal
CREATE TRIGGER trigger_update_performance_tables
    AFTER INSERT OR UPDATE OR DELETE ON site_global_indicator_values_simple
    FOR EACH ROW
    EXECUTE FUNCTION update_all_performance_tables();

-- Créer un index pour optimiser les performances des requêtes
CREATE INDEX IF NOT EXISTS idx_site_global_indicator_values_simple_performance 
ON site_global_indicator_values_simple (site_name, year, axe_energetique, enjeux, critere, performances_pourcent);

-- Commentaire sur le trigger
COMMENT ON TRIGGER trigger_update_performance_tables ON site_global_indicator_values_simple IS 
'Trigger qui met à jour automatiquement toutes les tables de performance lorsque site_global_indicator_values_simple est modifiée';