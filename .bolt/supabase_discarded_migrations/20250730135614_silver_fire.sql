-- Mettre à jour la colonne variations_pourcent pour chaque indicateur/site/année basé sur la cible
UPDATE site_global_indicator_values_simple 
SET variations_pourcent = CASE 
    WHEN cible IS NOT NULL THEN 
        ROUND((value - cible)::numeric, 2)
    ELSE NULL 
END
WHERE variations_pourcent IS NULL 
   OR variations_pourcent != CASE 
        WHEN cible IS NOT NULL THEN 
            ROUND((value - cible)::numeric, 2)
        ELSE NULL 
    END;
