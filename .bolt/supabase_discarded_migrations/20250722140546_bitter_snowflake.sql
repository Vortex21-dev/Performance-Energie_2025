/*
  # Mise à jour des données dans site_global_indicator_values_simple

  1. Mise à jour des champs manquants
    - axe_energetique depuis issues
    - enjeux, normes, critere depuis sector_standards_issues_criteria_indicators  
    - unite, type, formule depuis indicators
    - Valeurs mensuelles depuis indicator_values
    - Calculs de value, valeur_precedente, variation

  2. Utilisation des vraies données de la base
    - Récupération via les bonnes relations
    - Calculs basés sur les données existantes
*/

-- Fonction pour mettre à jour les données
CREATE OR REPLACE FUNCTION update_site_global_indicator_values()
RETURNS void AS $$
DECLARE
    rec RECORD;
    monthly_values NUMERIC[];
    current_year_sum NUMERIC;
    previous_year_sum NUMERIC;
    variation_calc TEXT;
    org_name TEXT;
    sector_name TEXT;
    energy_type_name TEXT;
BEGIN
    -- Pour chaque enregistrement dans la table
    FOR rec IN 
        SELECT DISTINCT site_name, code, year, processus_code 
        FROM site_global_indicator_values_simple 
    LOOP
        -- Récupérer l'organisation du site
        SELECT organization_name INTO org_name
        FROM sites 
        WHERE name = rec.site_name
        LIMIT 1;
        
        IF org_name IS NULL THEN
            CONTINUE;
        END IF;
        
        -- Récupérer le secteur et type d'énergie de l'organisation
        SELECT os.sector_name, os.energy_type_name 
        INTO sector_name, energy_type_name
        FROM organization_selections os
        WHERE os.organization_name = org_name
        LIMIT 1;
        
        -- Mise à jour des champs depuis indicators
        UPDATE site_global_indicator_values_simple 
        SET 
            unite = i.unit,
            type = i.type,
            formule = i.formule
        FROM indicators i
        WHERE site_global_indicator_values_simple.code = i.code
        AND site_global_indicator_values_simple.site_name = rec.site_name
        AND site_global_indicator_values_simple.year = rec.year;
        
        -- Mise à jour axe_energetique depuis issues
        UPDATE site_global_indicator_values_simple 
        SET axe_energetique = iss.axe_energetique
        FROM sector_standards_issues_criteria_indicators ssici
        JOIN issues iss ON iss.name = ssici.issue_name
        WHERE site_global_indicator_values_simple.code = ANY(ssici.indicator_codes)
        AND site_global_indicator_values_simple.site_name = rec.site_name
        AND site_global_indicator_values_simple.year = rec.year
        AND ssici.sector_name = sector_name
        AND ssici.energy_type_name = energy_type_name;
        
        -- Mise à jour enjeux, normes, critere
        UPDATE site_global_indicator_values_simple 
        SET 
            enjeux = ssici.issue_name,
            normes = ssici.standard_name,
            critere = ssici.criteria_name
        FROM sector_standards_issues_criteria_indicators ssici
        WHERE site_global_indicator_values_simple.code = ANY(ssici.indicator_codes)
        AND site_global_indicator_values_simple.site_name = rec.site_name
        AND site_global_indicator_values_simple.year = rec.year
        AND ssici.sector_name = sector_name
        AND ssici.energy_type_name = energy_type_name;
        
        -- Récupérer les valeurs mensuelles pour l'année courante
        monthly_values := ARRAY[NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL];
        current_year_sum := 0;
        
        -- Remplir les valeurs mensuelles
        FOR i IN 1..12 LOOP
            SELECT COALESCE(SUM(iv.value), 0) INTO monthly_values[i]
            FROM indicator_values iv
            JOIN collection_periods cp ON iv.period_id = cp.id
            WHERE iv.indicator_code = rec.code
            AND iv.site_name = rec.site_name
            AND cp.year = rec.year
            AND cp.period_number = i;
            
            current_year_sum := current_year_sum + COALESCE(monthly_values[i], 0);
        END LOOP;
        
        -- Récupérer la valeur de l'année précédente
        SELECT COALESCE(SUM(iv.value), 0) INTO previous_year_sum
        FROM indicator_values iv
        JOIN collection_periods cp ON iv.period_id = cp.id
        WHERE iv.indicator_code = rec.code
        AND iv.site_name = rec.site_name
        AND cp.year = rec.year - 1;
        
        -- Calculer la variation
        IF previous_year_sum > 0 THEN
            variation_calc := ROUND(((current_year_sum - previous_year_sum) / previous_year_sum * 100)::NUMERIC, 2)::TEXT || '%';
        ELSE
            variation_calc := '-';
        END IF;
        
        -- Mettre à jour l'enregistrement avec toutes les valeurs
        UPDATE site_global_indicator_values_simple 
        SET 
            janvier = monthly_values[1],
            fevrier = monthly_values[2],
            mars = monthly_values[3],
            avril = monthly_values[4],
            mai = monthly_values[5],
            juin = monthly_values[6],
            juillet = monthly_values[7],
            aout = monthly_values[8],
            septembre = monthly_values[9],
            octobre = monthly_values[10],
            novembre = monthly_values[11],
            decembre = monthly_values[12],
            value = current_year_sum,
            valeur_precedente = previous_year_sum,
            variation = variation_calc,
            updated_at = NOW()
        WHERE site_name = rec.site_name
        AND code = rec.code
        AND year = rec.year;
        
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Exécuter la fonction de mise à jour
SELECT update_site_global_indicator_values();

-- Supprimer la fonction temporaire
DROP FUNCTION update_site_global_indicator_values();