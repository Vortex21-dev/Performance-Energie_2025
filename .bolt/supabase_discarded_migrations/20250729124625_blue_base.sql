/*
  # Automatisation du peuplement de site_global_indicator_values_simple

  1. Fonction pour créer automatiquement les lignes d'indicateurs pour les sites
  2. Trigger pour automatiser la création lors de l'ajout de processus aux sites
  3. Peuplement des données existantes
*/

-- Fonction pour créer les lignes d'indicateurs pour un site donné
CREATE OR REPLACE FUNCTION create_site_indicators_for_site(p_site_name text, p_organization_name text)
RETURNS void AS $$
DECLARE
    indicator_rec RECORD;
    site_rec RECORD;
BEGIN
    -- Récupérer les informations du site
    SELECT s.*, f.name as filiere_name, fl.name as filiale_name
    INTO site_rec
    FROM sites s
    LEFT JOIN filieres f ON s.filiere_name = f.name
    LEFT JOIN filiales fl ON s.filiale_name = fl.name
    WHERE s.name = p_site_name AND s.organization_name = p_organization_name;

    -- Pour chaque indicateur lié aux processus du site
    FOR indicator_rec IN
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
            i.normes,
            i.critere,
            i.processus_code,
            p.name as processus
        FROM indicators i
        JOIN site_processes sp ON i.processus_code = sp.processus_code
        JOIN processus p ON i.processus_code = p.code
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
            janvier, fevrier, mars, avril, mai, juin,
            juillet, aout, septembre, octobre, novembre, decembre,
            variations_pourcent,
            performances_pourcent,
            perf_janvier, perf_fevrier, perf_mars, perf_avril, perf_mai, perf_juin,
            perf_juillet, perf_aout, perf_septembre, perf_octobre, perf_novembre, perf_decembre
        )
        VALUES (
            p_site_name,
            EXTRACT(YEAR FROM CURRENT_DATE)::integer,
            indicator_rec.code,
            indicator_rec.axe_energetique,
            indicator_rec.enjeux,
            indicator_rec.normes,
            indicator_rec.critere,
            indicator_rec.indicateur,
            indicator_rec.definition,
            indicator_rec.processus,
            indicator_rec.processus_code,
            indicator_rec.frequence,
            indicator_rec.unite,
            indicator_rec.type,
            indicator_rec.formule,
            p_organization_name,
            site_rec.filiere_name,
            site_rec.filiale_name,
            NULL, NULL, NULL, NULL,
            NULL, NULL, NULL, NULL, NULL, NULL,
            NULL, NULL, NULL, NULL, NULL, NULL,
            NULL, NULL,
            NULL, NULL, NULL, NULL, NULL, NULL,
            NULL, NULL, NULL, NULL, NULL, NULL
        )
        ON CONFLICT (site_name, code, year) 
        DO UPDATE SET
            axe_energetique = EXCLUDED.axe_energetique,
            enjeux = EXCLUDED.enjeux,
            normes = EXCLUDED.normes,
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

-- Fonction trigger pour automatiser la création lors de l'ajout de processus aux sites
CREATE OR REPLACE FUNCTION trigger_create_site_indicators()
RETURNS trigger AS $$
BEGIN
    -- Quand un processus est ajouté à un site
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.is_active = true AND OLD.is_active = false) THEN
        PERFORM create_site_indicators_for_site(NEW.site_name, NEW.organization_name);
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

-- Fonction pour peupler toutes les données existantes
CREATE OR REPLACE FUNCTION populate_all_existing_site_indicators()
RETURNS void AS $$
DECLARE
    site_rec RECORD;
BEGIN
    -- Pour chaque site actif
    FOR site_rec IN
        SELECT DISTINCT site_name, organization_name
        FROM site_processes
        WHERE is_active = true
    LOOP
        PERFORM create_site_indicators_for_site(site_rec.site_name, site_rec.organization_name);
    END LOOP;
    
    RAISE NOTICE 'Peuplement terminé pour tous les sites existants';
END;
$$ LANGUAGE plpgsql;

-- Exécuter le peuplement des données existantes
SELECT populate_all_existing_site_indicators();

-- Fonction pour synchroniser les valeurs depuis indicator_measurements (optionnel)
CREATE OR REPLACE FUNCTION sync_indicator_measurements_to_site_global()
RETURNS void AS $$
BEGIN
    -- Mettre à jour les valeurs depuis indicator_measurements
    UPDATE site_global_indicator_values_simple sgiv
    SET 
        value = im.value,
        updated_at = NOW()
    FROM indicator_measurements im
    JOIN collection_periods cp ON im.period_id = cp.id
    WHERE sgiv.code = im.indicator_code
    AND sgiv.site_name = im.site_name
    AND sgiv.year = cp.year
    AND cp.period_type = 'year';
    
    RAISE NOTICE 'Synchronisation des valeurs terminée';
END;
$$ LANGUAGE plpgsql;

-- Exécuter la synchronisation des valeurs
SELECT sync_indicator_measurements_to_site_global();