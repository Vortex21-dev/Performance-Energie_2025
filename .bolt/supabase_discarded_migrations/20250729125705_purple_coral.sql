/*
  # Automatisation de la création d'indicateurs de site

  1. Fonction pour créer automatiquement les lignes d'indicateurs
  2. Trigger pour automatiser la création lors de l'ajout de processus aux sites
  3. Peuplement des données existantes
*/

-- Fonction pour créer les indicateurs d'un site
CREATE OR REPLACE FUNCTION create_indicators_for_site(p_site_name TEXT, p_organization_name TEXT)
RETURNS VOID AS $$
DECLARE
    indicator_record RECORD;
    site_record RECORD;
BEGIN
    -- Récupérer les informations du site
    SELECT s.name, s.organization_name, s.filiere_name, s.filiale_name
    INTO site_record
    FROM sites s
    WHERE s.name = p_site_name AND s.organization_name = p_organization_name;
    
    IF NOT FOUND THEN
        RETURN;
    END IF;
    
    -- Pour chaque indicateur lié aux processus de ce site
    FOR indicator_record IN
        SELECT DISTINCT 
            i.code,
            i.name as indicateur,
            i.description as definition,
            i.unit as unite,
            i.type,
            i.formule,
            i.frequence,
            i.axe_energetique,
            i.enjeux,
            i.critere,
            p.name as processus,
            p.code as processus_code
        FROM indicators i
        JOIN processus p ON i.processus_code = p.code
        JOIN site_processes sp ON sp.processus_code = p.code
        WHERE sp.site_name = p_site_name 
        AND sp.organization_name = p_organization_name
        AND sp.is_active = true
    LOOP
        -- Insérer ou mettre à jour la ligne dans site_global_indicator_values_simple
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
            value,
            valeur_precedente,
            cible,
            variation,
            variations_pourcent,
            performances_pourcent,
            janvier, fevrier, mars, avril, mai, juin,
            juillet, aout, septembre, octobre, novembre, decembre,
            perf_janvier, perf_fevrier, perf_mars, perf_avril, perf_mai, perf_juin,
            perf_juillet, perf_aout, perf_septembre, perf_octobre, perf_novembre, perf_decembre
        )
        VALUES (
            site_record.name,
            EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
            indicator_record.code,
            indicator_record.axe_energetique,
            indicator_record.enjeux,
            '', -- normes - à remplir selon la logique métier
            indicator_record.critere,
            indicator_record.indicateur,
            indicator_record.definition,
            indicator_record.processus,
            indicator_record.processus_code,
            indicator_record.frequence,
            indicator_record.unite,
            indicator_record.type,
            indicator_record.formule,
            site_record.organization_name,
            site_record.filiere_name,
            site_record.filiale_name,
            NULL, -- value - sera remplie par les mesures
            NULL, -- valeur_precedente
            NULL, -- cible
            NULL, -- variation
            NULL, -- variations_pourcent
            NULL, -- performances_pourcent
            NULL, NULL, NULL, NULL, NULL, NULL, -- valeurs mensuelles
            NULL, NULL, NULL, NULL, NULL, NULL,
            NULL, NULL, NULL, NULL, NULL, NULL, -- performances mensuelles
            NULL, NULL, NULL, NULL, NULL, NULL
        )
        ON CONFLICT (site_name, code, year) 
        DO UPDATE SET
            axe_energetique = EXCLUDED.axe_energetique,
            enjeux = EXCLUDED.enjeux,
            critere = EXCLUDED.critere,
            indicateur = EXCLUDED.indicateur,
            definition = EXCLUDED.definition,
            processus = EXCLUDED.processus,
            processus_code = EXCLUDED.processus_code,
            frequence = EXCLUDED.frequence,
            unite = EXCLUDED.unite,
            type = EXCLUDED.type,
            formule = EXCLUDED.formule,
            organization_name = EXCLUDED.organization_name,
            filiere_name = EXCLUDED.filiere_name,
            filiale_name = EXCLUDED.filiale_name,
            updated_at = NOW();
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Fonction trigger pour automatiser la création
CREATE OR REPLACE FUNCTION trigger_create_site_indicators()
RETURNS TRIGGER AS $$
BEGIN
    -- Créer les indicateurs pour le site quand un processus est ajouté
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.is_active = true AND OLD.is_active = false) THEN
        PERFORM create_indicators_for_site(NEW.site_name, NEW.organization_name);
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger sur site_processes
DROP TRIGGER IF EXISTS auto_create_site_indicators ON site_processes;
CREATE TRIGGER auto_create_site_indicators
    AFTER INSERT OR UPDATE ON site_processes
    FOR EACH ROW
    EXECUTE FUNCTION trigger_create_site_indicators();

-- Fonction pour synchroniser les valeurs depuis indicator_measurements
CREATE OR REPLACE FUNCTION sync_indicator_values_to_site_global()
RETURNS VOID AS $$
DECLARE
    measurement_record RECORD;
BEGIN
    -- Synchroniser les valeurs depuis indicator_measurements
    FOR measurement_record IN
        SELECT 
            im.site_name,
            im.indicator_code,
            im.year,
            im.valeur_annee_actuelle as value,
            im.valeur_annee_precedente as valeur_precedente,
            im.cible_annee_actuelle as cible,
            im.variation_pourcentage,
            im.janvier, im.fevrier, im.mars, im.avril, im.mai, im.juin,
            im.juillet, im.aout, im.septembre, im.octobre, im.novembre, im.decembre
        FROM indicator_measurements im
        WHERE im.site_name IS NOT NULL
    LOOP
        -- Mettre à jour la ligne correspondante
        UPDATE site_global_indicator_values_simple
        SET 
            value = measurement_record.value,
            valeur_precedente = measurement_record.valeur_precedente,
            cible = measurement_record.cible,
            variations_pourcent = measurement_record.variation_pourcentage,
            janvier = measurement_record.janvier,
            fevrier = measurement_record.fevrier,
            mars = measurement_record.mars,
            avril = measurement_record.avril,
            mai = measurement_record.mai,
            juin = measurement_record.juin,
            juillet = measurement_record.juillet,
            aout = measurement_record.aout,
            septembre = measurement_record.septembre,
            octobre = measurement_record.octobre,
            novembre = measurement_record.novembre,
            decembre = measurement_record.decembre,
            updated_at = NOW()
        WHERE site_name = measurement_record.site_name
        AND code = measurement_record.indicator_code
        AND year = measurement_record.year;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour peupler tous les sites existants
CREATE OR REPLACE FUNCTION populate_all_existing_sites()
RETURNS VOID AS $$
DECLARE
    site_record RECORD;
BEGIN
    -- Pour chaque site existant
    FOR site_record IN
        SELECT DISTINCT name, organization_name
        FROM sites
        ORDER BY organization_name, name
    LOOP
        PERFORM create_indicators_for_site(site_record.name, site_record.organization_name);
    END LOOP;
    
    -- Synchroniser les valeurs
    PERFORM sync_indicator_values_to_site_global();
END;
$$ LANGUAGE plpgsql;

-- Exécuter le peuplement initial
SELECT populate_all_existing_sites();

-- Trigger pour synchroniser les valeurs depuis indicator_measurements
CREATE OR REPLACE FUNCTION trigger_sync_indicator_values()
RETURNS TRIGGER AS $$
BEGIN
    -- Synchroniser quand des valeurs sont ajoutées/modifiées
    IF NEW.site_name IS NOT NULL THEN
        UPDATE site_global_indicator_values_simple
        SET 
            value = NEW.valeur_annee_actuelle,
            valeur_precedente = NEW.valeur_annee_precedente,
            cible = NEW.cible_annee_actuelle,
            variations_pourcent = NEW.variation_pourcentage,
            janvier = NEW.janvier,
            fevrier = NEW.fevrier,
            mars = NEW.mars,
            avril = NEW.avril,
            mai = NEW.mai,
            juin = NEW.juin,
            juillet = NEW.juillet,
            aout = NEW.aout,
            septembre = NEW.septembre,
            octobre = NEW.octobre,
            novembre = NEW.novembre,
            decembre = NEW.decembre,
            updated_at = NOW()
        WHERE site_name = NEW.site_name
        AND code = NEW.indicator_code
        AND year = NEW.year;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger sur indicator_measurements
DROP TRIGGER IF EXISTS sync_to_site_global ON indicator_measurements;
CREATE TRIGGER sync_to_site_global
    AFTER INSERT OR UPDATE ON indicator_measurements
    FOR EACH ROW
    EXECUTE FUNCTION trigger_sync_indicator_values();