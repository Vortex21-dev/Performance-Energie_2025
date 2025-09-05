/*
  # Correction du filtrage des indicateurs par organization_selections

  1. Corrections apportées
    - Récupération correcte de l'organization_name du site
    - Filtrage précis par indicator_names de organization_selections
    - Mise à jour des triggers pour synchronisation automatique

  2. Logique
    - Site → Organization (via sites.organization_name)
    - Organization → Indicateurs sélectionnés (via organization_selections.indicator_names)
    - Seuls ces indicateurs sont ajoutés à site_global_indicator_values_simple
*/

-- Supprimer les anciennes fonctions et triggers
DROP TRIGGER IF EXISTS trigger_update_site_indicators_on_site_process_change ON site_processes;
DROP TRIGGER IF EXISTS trigger_update_site_indicators_on_indicator_change ON indicators;
DROP TRIGGER IF EXISTS trigger_update_site_indicators_on_organization_change ON organization_selections;
DROP FUNCTION IF EXISTS update_site_indicators_on_site_process_change();
DROP FUNCTION IF EXISTS update_site_indicators_on_indicator_change();
DROP FUNCTION IF EXISTS sync_site_indicators_for_site(text);
DROP FUNCTION IF EXISTS sync_all_site_indicators();
DROP FUNCTION IF EXISTS check_site_indicators_sync();

-- Fonction pour synchroniser les indicateurs d'un site spécifique
CREATE OR REPLACE FUNCTION sync_site_indicators_for_site(target_site_name text)
RETURNS void AS $$
DECLARE
    site_org_name text;
    selected_indicators text[];
BEGIN
    -- Récupérer l'organisation du site
    SELECT organization_name INTO site_org_name
    FROM sites
    WHERE name = target_site_name;
    
    IF site_org_name IS NULL THEN
        RAISE NOTICE 'Site % non trouvé ou sans organisation', target_site_name;
        RETURN;
    END IF;
    
    -- Récupérer les indicateurs sélectionnés pour cette organisation
    SELECT indicator_names INTO selected_indicators
    FROM organization_selections
    WHERE organization_name = site_org_name
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- Si aucune sélection d'indicateurs, supprimer tous les indicateurs du site
    IF selected_indicators IS NULL OR array_length(selected_indicators, 1) IS NULL THEN
        DELETE FROM site_global_indicator_values_simple
        WHERE site_name = target_site_name;
        RETURN;
    END IF;
    
    -- Supprimer les indicateurs qui ne sont plus sélectionnés
    DELETE FROM site_global_indicator_values_simple
    WHERE site_name = target_site_name
    AND indicateur NOT IN (SELECT unnest(selected_indicators));
    
    -- Ajouter les nouveaux indicateurs pour les processus actifs du site
    INSERT INTO site_global_indicator_values_simple (
        site_name,
        year,
        code,
        axe_energetique,
        enjeux,
        normes,
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
        filiale_name
    )
    SELECT DISTINCT
        target_site_name,
        EXTRACT(YEAR FROM CURRENT_DATE)::integer,
        i.code,
        i.axe_energetique,
        i.enjeux,
        i.normes,
        i.critere,
        i.name,
        i.description,
        p.name,
        sp.processus_code,
        i.frequence,
        i.unit,
        i.type,
        i.formule,
        s.organization_name,
        s.filiere_name,
        s.filiale_name
    FROM site_processes sp
    JOIN indicators i ON i.processus_code = sp.processus_code
    JOIN processus p ON p.code = sp.processus_code
    JOIN sites s ON s.name = sp.site_name
    WHERE sp.site_name = target_site_name
    AND sp.is_active = true
    AND i.name = ANY(selected_indicators)
    AND NOT EXISTS (
        SELECT 1 FROM site_global_indicator_values_simple sgiv
        WHERE sgiv.site_name = target_site_name
        AND sgiv.code = i.code
        AND sgiv.year = EXTRACT(YEAR FROM CURRENT_DATE)::integer
    );
    
    RAISE NOTICE 'Synchronisation terminée pour le site %', target_site_name;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour synchroniser tous les sites
CREATE OR REPLACE FUNCTION sync_all_site_indicators()
RETURNS void AS $$
DECLARE
    site_record RECORD;
BEGIN
    FOR site_record IN 
        SELECT DISTINCT site_name 
        FROM site_processes 
        WHERE is_active = true
    LOOP
        PERFORM sync_site_indicators_for_site(site_record.site_name);
    END LOOP;
    
    RAISE NOTICE 'Synchronisation terminée pour tous les sites';
END;
$$ LANGUAGE plpgsql;

-- Fonction trigger pour les changements dans site_processes
CREATE OR REPLACE FUNCTION update_site_indicators_on_site_process_change()
RETURNS trigger AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        -- Synchroniser le site concerné
        PERFORM sync_site_indicators_for_site(NEW.site_name);
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Synchroniser le site concerné
        PERFORM sync_site_indicators_for_site(OLD.site_name);
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Fonction trigger pour les changements dans indicators
CREATE OR REPLACE FUNCTION update_site_indicators_on_indicator_change()
RETURNS trigger AS $$
DECLARE
    site_record RECORD;
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        -- Mettre à jour tous les sites qui ont ce processus
        FOR site_record IN 
            SELECT DISTINCT site_name 
            FROM site_processes 
            WHERE processus_code = NEW.processus_code 
            AND is_active = true
        LOOP
            PERFORM sync_site_indicators_for_site(site_record.site_name);
        END LOOP;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Supprimer l'indicateur de tous les sites
        DELETE FROM site_global_indicator_values_simple
        WHERE code = OLD.code;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Fonction trigger pour les changements dans organization_selections
CREATE OR REPLACE FUNCTION update_site_indicators_on_organization_change()
RETURNS trigger AS $$
DECLARE
    site_record RECORD;
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        -- Synchroniser tous les sites de cette organisation
        FOR site_record IN 
            SELECT DISTINCT sp.site_name 
            FROM site_processes sp
            JOIN sites s ON s.name = sp.site_name
            WHERE s.organization_name = NEW.organization_name
            AND sp.is_active = true
        LOOP
            PERFORM sync_site_indicators_for_site(site_record.site_name);
        END LOOP;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Supprimer tous les indicateurs des sites de cette organisation
        DELETE FROM site_global_indicator_values_simple
        WHERE organization_name = OLD.organization_name;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Créer les triggers
CREATE TRIGGER trigger_update_site_indicators_on_site_process_change
    AFTER INSERT OR UPDATE OR DELETE ON site_processes
    FOR EACH ROW EXECUTE FUNCTION update_site_indicators_on_site_process_change();

CREATE TRIGGER trigger_update_site_indicators_on_indicator_change
    AFTER INSERT OR UPDATE OR DELETE ON indicators
    FOR EACH ROW EXECUTE FUNCTION update_site_indicators_on_indicator_change();

CREATE TRIGGER trigger_update_site_indicators_on_organization_change
    AFTER INSERT OR UPDATE OR DELETE ON organization_selections
    FOR EACH ROW EXECUTE FUNCTION update_site_indicators_on_organization_change();

-- Fonction de vérification
CREATE OR REPLACE FUNCTION check_site_indicators_sync()
RETURNS TABLE (
    site_name text,
    organization_name text,
    processus_count bigint,
    selected_indicators_count bigint,
    generated_indicators_count bigint,
    status text
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.name as site_name,
        s.organization_name,
        COUNT(DISTINCT sp.processus_code) as processus_count,
        COALESCE(array_length(os.indicator_names, 1), 0)::bigint as selected_indicators_count,
        COUNT(DISTINCT sgiv.code) as generated_indicators_count,
        CASE 
            WHEN COUNT(DISTINCT sgiv.code) > 0 THEN 'Synchronisé'
            ELSE 'Non synchronisé'
        END as status
    FROM sites s
    LEFT JOIN site_processes sp ON sp.site_name = s.name AND sp.is_active = true
    LEFT JOIN organization_selections os ON os.organization_name = s.organization_name
    LEFT JOIN site_global_indicator_values_simple sgiv ON sgiv.site_name = s.name
    GROUP BY s.name, s.organization_name, os.indicator_names
    ORDER BY s.organization_name, s.name;
END;
$$ LANGUAGE plpgsql;

-- Synchroniser tous les sites existants
SELECT sync_all_site_indicators();

-- Vérifier la synchronisation
SELECT * FROM check_site_indicators_sync();