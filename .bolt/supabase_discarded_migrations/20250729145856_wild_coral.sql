/*
  # Mise à jour automatique de site_global_indicator_values_simple

  1. Fonctions de synchronisation
    - Fonction pour synchroniser les indicateurs d'un site spécifique
    - Fonction pour synchroniser tous les sites
    - Fonction pour gérer les modifications d'indicateurs

  2. Triggers automatiques
    - Sur site_processes : quand les associations site-processus changent
    - Sur indicators : quand les indicateurs sont modifiés
    - Sur sites : quand de nouveaux sites sont créés

  3. Peuplement initial
    - Synchronise toutes les données existantes
*/

-- Fonction pour synchroniser les indicateurs d'un site spécifique
CREATE OR REPLACE FUNCTION sync_site_indicators_for_site(target_site_name TEXT)
RETURNS VOID AS $$
DECLARE
    site_org_name TEXT;
    site_filiere_name TEXT;
    site_filiale_name TEXT;
BEGIN
    -- Récupérer les informations du site
    SELECT organization_name, filiere_name, filiale_name
    INTO site_org_name, site_filiere_name, site_filiale_name
    FROM sites
    WHERE name = target_site_name;
    
    IF site_org_name IS NULL THEN
        RETURN; -- Site n'existe pas
    END IF;
    
    -- Supprimer les entrées existantes pour ce site
    DELETE FROM site_global_indicator_values_simple 
    WHERE site_name = target_site_name;
    
    -- Insérer les nouveaux indicateurs basés sur site_processes
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
        filiale_name,
        created_at,
        updated_at
    )
    SELECT DISTINCT
        target_site_name,
        year_val,
        i.code,
        i.axe_energetique,
        i.enjeux,
        i.normes,
        i.critere,
        i.name,
        i.description,
        p.name,
        i.processus_code,
        i.frequence,
        i.unit,
        i.type,
        i.formule,
        site_org_name,
        site_filiere_name,
        site_filiale_name,
        NOW(),
        NOW()
    FROM site_processes sp
    JOIN processus p ON sp.processus_code = p.code
    JOIN indicators i ON i.processus_code = p.code
    CROSS JOIN (VALUES (2023), (2024), (2025)) AS years(year_val)
    WHERE sp.site_name = target_site_name
      AND sp.organization_name = site_org_name
      AND sp.is_active = true;
      
    RAISE NOTICE 'Synchronisé les indicateurs pour le site: %', target_site_name;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour synchroniser tous les sites
CREATE OR REPLACE FUNCTION sync_all_site_indicators()
RETURNS VOID AS $$
DECLARE
    site_record RECORD;
BEGIN
    -- Parcourir tous les sites
    FOR site_record IN 
        SELECT DISTINCT name FROM sites
    LOOP
        PERFORM sync_site_indicators_for_site(site_record.name);
    END LOOP;
    
    RAISE NOTICE 'Synchronisation terminée pour tous les sites';
END;
$$ LANGUAGE plpgsql;

-- Fonction pour mettre à jour les indicateurs modifiés
CREATE OR REPLACE FUNCTION update_indicator_in_site_table()
RETURNS TRIGGER AS $$
BEGIN
    -- Mettre à jour toutes les entrées de cet indicateur dans site_global_indicator_values_simple
    UPDATE site_global_indicator_values_simple
    SET 
        axe_energetique = NEW.axe_energetique,
        enjeux = NEW.enjeux,
        normes = NEW.normes,
        critere = NEW.critere,
        indicateur = NEW.name,
        definition = NEW.description,
        frequence = NEW.frequence,
        unite = NEW.unit,
        type = NEW.type,
        formule = NEW.formule,
        updated_at = NOW()
    WHERE code = NEW.code;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour gérer les changements dans site_processes
CREATE OR REPLACE FUNCTION handle_site_processes_change()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Nouveau processus ajouté à un site
        PERFORM sync_site_indicators_for_site(NEW.site_name);
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Processus modifié (ex: is_active changé)
        PERFORM sync_site_indicators_for_site(NEW.site_name);
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Processus retiré d'un site
        PERFORM sync_site_indicators_for_site(OLD.site_name);
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour gérer la création de nouveaux sites
CREATE OR REPLACE FUNCTION handle_new_site_creation()
RETURNS TRIGGER AS $$
BEGIN
    -- Synchroniser les indicateurs pour le nouveau site
    PERFORM sync_site_indicators_for_site(NEW.name);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Supprimer les anciens triggers s'ils existent
DROP TRIGGER IF EXISTS trigger_site_processes_change ON site_processes;
DROP TRIGGER IF EXISTS trigger_indicator_update ON indicators;
DROP TRIGGER IF EXISTS trigger_new_site_creation ON sites;

-- Créer les nouveaux triggers
CREATE TRIGGER trigger_site_processes_change
    AFTER INSERT OR UPDATE OR DELETE ON site_processes
    FOR EACH ROW
    EXECUTE FUNCTION handle_site_processes_change();

CREATE TRIGGER trigger_indicator_update
    AFTER UPDATE ON indicators
    FOR EACH ROW
    EXECUTE FUNCTION update_indicator_in_site_table();

CREATE TRIGGER trigger_new_site_creation
    AFTER INSERT ON sites
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_site_creation();

-- Synchroniser toutes les données existantes
SELECT sync_all_site_indicators();