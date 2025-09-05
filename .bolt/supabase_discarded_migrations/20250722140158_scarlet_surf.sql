/*
  # Mise à jour des données dans site_global_indicator_values_simple

  1. Mise à jour des champs depuis les tables sources
    - axe_energetique depuis issues
    - enjeux, normes, critere depuis sector_standards_issues_criteria_indicators
    - unite, type, formule depuis indicators
    - Valeurs mensuelles depuis indicator_values
    - Calculs des valeurs annuelles et variations
*/

-- Fonction pour mettre à jour les données de la table site_global_indicator_values_simple
CREATE OR REPLACE FUNCTION update_site_global_indicator_values_data()
RETURNS void AS $$
DECLARE
    site_record RECORD;
    indicator_record RECORD;
    monthly_values RECORD;
    current_year_sum NUMERIC := 0;
    previous_year_sum NUMERIC := 0;
    variation_calc TEXT := '';
    org_selection RECORD;
BEGIN
    -- Pour chaque enregistrement dans la table
    FOR site_record IN 
        SELECT DISTINCT site_name, year 
        FROM site_global_indicator_values_simple
    LOOP
        -- Récupérer les sélections de l'organisation pour ce site
        SELECT os.* INTO org_selection
        FROM organization_selections os
        JOIN sites s ON s.organization_name = os.organization_name
        WHERE s.name = site_record.site_name
        ORDER BY os.created_at DESC
        LIMIT 1;

        -- Pour chaque indicateur de ce site
        FOR indicator_record IN
            SELECT * FROM site_global_indicator_values_simple 
            WHERE site_name = site_record.site_name 
            AND year = site_record.year
        LOOP
            -- 1. Mettre à jour axe_energetique depuis issues
            UPDATE site_global_indicator_values_simple 
            SET axe_energetique = (
                SELECT i.axe_energetique 
                FROM issues i
                WHERE i.name = ANY(org_selection.issue_names)
                LIMIT 1
            )
            WHERE id = indicator_record.id;

            -- 2. Mettre à jour enjeux, normes, critere depuis sector_standards_issues_criteria_indicators
            UPDATE site_global_indicator_values_simple 
            SET 
                enjeux = (
                    SELECT ssici.issue_name 
                    FROM sector_standards_issues_criteria_indicators ssici
                    WHERE indicator_record.code = ANY(ssici.indicator_codes)
                    AND ssici.sector_name = org_selection.sector_name
                    AND ssici.energy_type_name = org_selection.energy_type_name
                    LIMIT 1
                ),
                normes = (
                    SELECT ssici.standard_name 
                    FROM sector_standards_issues_criteria_indicators ssici
                    WHERE indicator_record.code = ANY(ssici.indicator_codes)
                    AND ssici.sector_name = org_selection.sector_name
                    AND ssici.energy_type_name = org_selection.energy_type_name
                    LIMIT 1
                ),
                critere = (
                    SELECT ssici.criteria_name 
                    FROM sector_standards_issues_criteria_indicators ssici
                    WHERE indicator_record.code = ANY(ssici.indicator_codes)
                    AND ssici.sector_name = org_selection.sector_name
                    AND ssici.energy_type_name = org_selection.energy_type_name
                    LIMIT 1
                )
            WHERE id = indicator_record.id;

            -- 3. Mettre à jour unite, type, formule depuis indicators
            UPDATE site_global_indicator_values_simple 
            SET 
                unite = (SELECT unit FROM indicators WHERE code = indicator_record.code),
                type = (SELECT type FROM indicators WHERE code = indicator_record.code),
                formule = (SELECT formule FROM indicators WHERE code = indicator_record.code)
            WHERE id = indicator_record.id;

            -- 4. Récupérer et mettre à jour les valeurs mensuelles depuis indicator_values
            -- Réinitialiser les variables
            current_year_sum := 0;
            previous_year_sum := 0;

            -- Mettre à jour les valeurs mensuelles pour l'année courante
            UPDATE site_global_indicator_values_simple 
            SET 
                janvier = (
                    SELECT iv.value 
                    FROM indicator_values iv
                    JOIN collection_periods cp ON iv.period_id = cp.id
                    WHERE iv.site_name = site_record.site_name
                    AND iv.indicator_code = indicator_record.code
                    AND cp.year = site_record.year
                    AND cp.period_number = 1
                    LIMIT 1
                ),
                fevrier = (
                    SELECT iv.value 
                    FROM indicator_values iv
                    JOIN collection_periods cp ON iv.period_id = cp.id
                    WHERE iv.site_name = site_record.site_name
                    AND iv.indicator_code = indicator_record.code
                    AND cp.year = site_record.year
                    AND cp.period_number = 2
                    LIMIT 1
                ),
                mars = (
                    SELECT iv.value 
                    FROM indicator_values iv
                    JOIN collection_periods cp ON iv.period_id = cp.id
                    WHERE iv.site_name = site_record.site_name
                    AND iv.indicator_code = indicator_record.code
                    AND cp.year = site_record.year
                    AND cp.period_number = 3
                    LIMIT 1
                ),
                avril = (
                    SELECT iv.value 
                    FROM indicator_values iv
                    JOIN collection_periods cp ON iv.period_id = cp.id
                    WHERE iv.site_name = site_record.site_name
                    AND iv.indicator_code = indicator_record.code
                    AND cp.year = site_record.year
                    AND cp.period_number = 4
                    LIMIT 1
                ),
                mai = (
                    SELECT iv.value 
                    FROM indicator_values iv
                    JOIN collection_periods cp ON iv.period_id = cp.id
                    WHERE iv.site_name = site_record.site_name
                    AND iv.indicator_code = indicator_record.code
                    AND cp.year = site_record.year
                    AND cp.period_number = 5
                    LIMIT 1
                ),
                juin = (
                    SELECT iv.value 
                    FROM indicator_values iv
                    JOIN collection_periods cp ON iv.period_id = cp.id
                    WHERE iv.site_name = site_record.site_name
                    AND iv.indicator_code = indicator_record.code
                    AND cp.year = site_record.year
                    AND cp.period_number = 6
                    LIMIT 1
                ),
                juillet = (
                    SELECT iv.value 
                    FROM indicator_values iv
                    JOIN collection_periods cp ON iv.period_id = cp.id
                    WHERE iv.site_name = site_record.site_name
                    AND iv.indicator_code = indicator_record.code
                    AND cp.year = site_record.year
                    AND cp.period_number = 7
                    LIMIT 1
                ),
                aout = (
                    SELECT iv.value 
                    FROM indicator_values iv
                    JOIN collection_periods cp ON iv.period_id = cp.id
                    WHERE iv.site_name = site_record.site_name
                    AND iv.indicator_code = indicator_record.code
                    AND cp.year = site_record.year
                    AND cp.period_number = 8
                    LIMIT 1
                ),
                septembre = (
                    SELECT iv.value 
                    FROM indicator_values iv
                    JOIN collection_periods cp ON iv.period_id = cp.id
                    WHERE iv.site_name = site_record.site_name
                    AND iv.indicator_code = indicator_record.code
                    AND cp.year = site_record.year
                    AND cp.period_number = 9
                    LIMIT 1
                ),
                octobre = (
                    SELECT iv.value 
                    FROM indicator_values iv
                    JOIN collection_periods cp ON iv.period_id = cp.id
                    WHERE iv.site_name = site_record.site_name
                    AND iv.indicator_code = indicator_record.code
                    AND cp.year = site_record.year
                    AND cp.period_number = 10
                    LIMIT 1
                ),
                novembre = (
                    SELECT iv.value 
                    FROM indicator_values iv
                    JOIN collection_periods cp ON iv.period_id = cp.id
                    WHERE iv.site_name = site_record.site_name
                    AND iv.indicator_code = indicator_record.code
                    AND cp.year = site_record.year
                    AND cp.period_number = 11
                    LIMIT 1
                ),
                decembre = (
                    SELECT iv.value 
                    FROM indicator_values iv
                    JOIN collection_periods cp ON iv.period_id = cp.id
                    WHERE iv.site_name = site_record.site_name
                    AND iv.indicator_code = indicator_record.code
                    AND cp.year = site_record.year
                    AND cp.period_number = 12
                    LIMIT 1
                )
            WHERE id = indicator_record.id;

            -- 5. Calculer la valeur de l'année courante (somme des mois)
            SELECT 
                COALESCE(janvier, 0) + COALESCE(fevrier, 0) + COALESCE(mars, 0) + 
                COALESCE(avril, 0) + COALESCE(mai, 0) + COALESCE(juin, 0) + 
                COALESCE(juillet, 0) + COALESCE(aout, 0) + COALESCE(septembre, 0) + 
                COALESCE(octobre, 0) + COALESCE(novembre, 0) + COALESCE(decembre, 0)
            INTO current_year_sum
            FROM site_global_indicator_values_simple 
            WHERE id = indicator_record.id;

            -- 6. Calculer la valeur de l'année précédente
            SELECT COALESCE(SUM(iv.value), 0) INTO previous_year_sum
            FROM indicator_values iv
            JOIN collection_periods cp ON iv.period_id = cp.id
            WHERE iv.site_name = site_record.site_name
            AND iv.indicator_code = indicator_record.code
            AND cp.year = site_record.year - 1;

            -- 7. Calculer la variation
            IF previous_year_sum > 0 THEN
                variation_calc := ROUND(((current_year_sum - previous_year_sum) / previous_year_sum * 100)::numeric, 2)::text || '%';
            ELSE
                variation_calc := '-';
            END IF;

            -- Mettre à jour les valeurs calculées
            UPDATE site_global_indicator_values_simple 
            SET 
                value = CASE WHEN current_year_sum > 0 THEN current_year_sum ELSE NULL END,
                valeur_precedente = CASE WHEN previous_year_sum > 0 THEN previous_year_sum ELSE NULL END,
                variation = variation_calc,
                updated_at = NOW()
            WHERE id = indicator_record.id;

        END LOOP;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Exécuter la fonction pour mettre à jour toutes les données
SELECT update_site_global_indicator_values_data();

-- Supprimer la fonction temporaire
DROP FUNCTION update_site_global_indicator_values_data();