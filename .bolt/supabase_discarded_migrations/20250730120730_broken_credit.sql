
        -- Pour chaque indicateur associé aux processus du site
     FOR indicator_record IN
    SELECT DISTINCT 
        i.code,
        i.name as indicateur,
        i.description as definition,
        i.unit as unite,
        i.type,
        i.processus_code,
        COALESCE(iss.axe_energetique, i.axe_energetique) as axe_energetique,
        COALESCE(ssici.issue_name, i.enjeux) as enjeux,
        COALESCE(ssici.standard_name, i.normes) as normes,
        COALESCE(ssici.criteria_name, i.critere) as critere,
        i.frequence,
        i.formule,
        p.name as processus
    FROM site_processes sp
    JOIN indicators i ON i.processus_code = sp.processus_code
    JOIN processus p ON p.code = sp.processus_code
    LEFT JOIN organization_selections os ON os.organization_name = site_record.organization_name
    LEFT JOIN sector_standards_issues_criteria_indicators ssici ON (
        ssici.sector_name = os.sector_name 
        AND ssici.energy_type_name = os.energy_type_name
        AND i.code = ANY(ssici.indicator_codes)
    )
    LEFT JOIN issues iss ON iss.name = ssici.issue_name
    WHERE sp.site_name = site_record.site_name
    AND sp.is_active = true
    AND EXISTS (
        SELECT 1 
        FROM organization_selections os2
        WHERE os2.organization_name = site_record.organization_name
        AND i.name = ANY(os2.indicator_names)
    )
LOOP
    -- ton code ici
END LOOP;
