/*
  # Mise à jour de la structure et des données de site_global_indicator_values_simple

  1. Modifications de structure
    - Suppression de l'ancienne contrainte unique
    - Modification de la clé primaire pour utiliser uniquement 'code'
    - Ajout de nouvelles colonnes si nécessaire

  2. Fonction de peuplement automatique
    - Création d'une fonction pour peupler la table à partir des indicateurs liés aux processus des sites
    - Mise à jour automatique des données existantes

  3. Triggers
    - Trigger pour maintenir les données à jour lors des modifications
*/

-- Supprimer l'ancienne contrainte unique et la clé primaire
ALTER TABLE site_global_indicator_values_simple 
DROP CONSTRAINT IF EXISTS site_global_indicator_values_simple_unique_idx;

ALTER TABLE site_global_indicator_values_simple 
DROP CONSTRAINT IF EXISTS site_global_indicator_values_simple_pkey;

-- Supprimer la colonne id si elle existe
ALTER TABLE site_global_indicator_values_simple 
DROP COLUMN IF EXISTS id;

-- Ajouter la nouvelle clé primaire sur 'code'
ALTER TABLE site_global_indicator_values_simple 
ADD CONSTRAINT site_global_indicator_values_simple_pkey PRIMARY KEY (code);

-- Fonction pour peupler automatiquement la table
CREATE OR REPLACE FUNCTION populate_site_global_indicator_values()
RETURNS void AS $$
DECLARE
    site_rec RECORD;
    indicator_rec RECORD;
    processus_rec RECORD;
BEGIN
    -- Vider la table existante
    DELETE FROM site_global_indicator_values_simple;
    
    -- Pour chaque site
    FOR site_rec IN 
        SELECT DISTINCT s.name as site_name, s.organization_name, s.filiere_name, s.filiale_name
        FROM sites s
    LOOP
        -- Pour chaque processus lié à ce site
        FOR processus_rec IN
            SELECT DISTINCT sp.processus_code
            FROM site_processes sp
            WHERE sp.site_name = site_rec.site_name 
            AND sp.is_active = true
        LOOP
            -- Pour chaque indicateur lié à ce processus
            FOR indicator_rec IN
                SELECT i.*
                FROM indicators i
                WHERE i.processus_code = processus_rec.processus_code
            LOOP
                -- Insérer une ligne pour cet indicateur
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
                    value,
                    valeur_precedente,
                    cible,
                    variation,
                    janvier, fevrier, mars, avril, mai, juin,
                    juillet, aout, septembre, octobre, novembre, decembre,
                    organization_name,
                    filiere_name,
                    filiale_name,
                    variations_pourcent,
                    performances_pourcent,
                    perf_janvier, perf_fevrier, perf_mars, perf_avril, perf_mai, perf_juin,
                    perf_juillet, perf_aout, perf_septembre, perf_octobre, perf_novembre, perf_decembre,
                    created_at,
                    updated_at
                ) VALUES (
                    site_rec.site_name,
                    EXTRACT(YEAR FROM CURRENT_DATE)::integer,
                    indicator_rec.code,
                    indicator_rec.axe_energetique,
                    indicator_rec.enjeux,
                    indicator_rec.normes,
                    indicator_rec.critere,
                    indicator_rec.name,
                    indicator_rec.description,
                    (SELECT name FROM processus WHERE code = indicator_rec.processus_code),
                    indicator_rec.processus_code,
                    indicator_rec.frequence,
                    indicator_rec.unit,
                    indicator_rec.type,
                    indicator_rec.formule,
                    NULL, -- value
                    NULL, -- valeur_precedente
                    NULL, -- cible
                    NULL, -- variation
                    NULL, NULL, NULL, NULL, NULL, NULL, -- mois
                    NULL, NULL, NULL, NULL, NULL, NULL, -- mois suite
                    site_rec.organization_name,
                    site_rec.filiere_name,
                    site_rec.filiale_name,
                    NULL, -- variations_pourcent
                    NULL, -- performances_pourcent
                    NULL, NULL, NULL, NULL, NULL, NULL, -- perf mois
                    NULL, NULL, NULL, NULL, NULL, NULL, -- perf mois suite
                    NOW(),
                    NOW()
                ) ON CONFLICT (code) DO UPDATE SET
                    site_name = EXCLUDED.site_name,
                    organization_name = EXCLUDED.organization_name,
                    filiere_name = EXCLUDED.filiere_name,
                    filiale_name = EXCLUDED.filiale_name,
                    processus = EXCLUDED.processus,
                    processus_code = EXCLUDED.processus_code,
                    indicateur = EXCLUDED.indicateur,
                    definition = EXCLUDED.definition,
                    axe_energetique = EXCLUDED.axe_energetique,
                    enjeux = EXCLUDED.enjeux,
                    normes = EXCLUDED.normes,
                    critere = EXCLUDED.critere,
                    frequence = EXCLUDED.frequence,
                    unite = EXCLUDED.unite,
                    type = EXCLUDED.type,
                    formule = EXCLUDED.formule,
                    updated_at = NOW();
            END LOOP;
        END LOOP;
    END LOOP;
    
    RAISE NOTICE 'Table site_global_indicator_values_simple mise à jour avec succès';
END;
$$ LANGUAGE plpgsql;

-- Fonction trigger pour maintenir la table à jour
CREATE OR REPLACE FUNCTION sync_site_global_indicator_values()
RETURNS trigger AS $$
BEGIN
    -- Appeler la fonction de peuplement
    PERFORM populate_site_global_indicator_values();
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Supprimer les anciens triggers s'ils existent
DROP TRIGGER IF EXISTS trigger_sync_site_indicators_on_site_processes ON site_processes;
DROP TRIGGER IF EXISTS trigger_sync_site_indicators_on_indicators ON indicators;

-- Créer les nouveaux triggers
CREATE TRIGGER trigger_sync_site_indicators_on_site_processes
    AFTER INSERT OR UPDATE OR DELETE ON site_processes
    FOR EACH STATEMENT
    EXECUTE FUNCTION sync_site_global_indicator_values();

CREATE TRIGGER trigger_sync_site_indicators_on_indicators
    AFTER INSERT OR UPDATE OR DELETE ON indicators
    FOR EACH STATEMENT
    EXECUTE FUNCTION sync_site_global_indicator_values();

-- Peupler la table avec les données actuelles
SELECT populate_site_global_indicator_values();

-- Créer un index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_site_global_indicator_values_simple_site_processus 
ON site_global_indicator_values_simple(site_name, processus_code);

CREATE INDEX IF NOT EXISTS idx_site_global_indicator_values_simple_organization 
ON site_global_indicator_values_simple(organization_name);

-- Fonction pour mettre à jour les valeurs d'indicateurs depuis indicator_measurements
CREATE OR REPLACE FUNCTION update_site_global_values_from_measurements()
RETURNS void AS $$
DECLARE
    measurement_rec RECORD;
BEGIN
    -- Mettre à jour les valeurs depuis indicator_measurements
    FOR measurement_rec IN
        SELECT 
            im.indicator_code,
            im.site_name,
            im.year,
            im.valeur_annee_actuelle,
            im.valeur_annee_precedente,
            im.cible_annee_actuelle,
            im.variation_pourcentage,
            im.janvier, im.fevrier, im.mars, im.avril, im.mai, im.juin,
            im.juillet, im.aout, im.septembre, im.octobre, im.novembre, im.decembre
        FROM indicator_measurements im
        WHERE EXISTS (
            SELECT 1 FROM site_global_indicator_values_simple sgiv 
            WHERE sgiv.code = im.indicator_code 
            AND sgiv.site_name = im.site_name
        )
    LOOP
        UPDATE site_global_indicator_values_simple
        SET 
            value = measurement_rec.valeur_annee_actuelle,
            valeur_precedente = measurement_rec.valeur_annee_precedente,
            cible = measurement_rec.cible_annee_actuelle,
            variations_pourcent = measurement_rec.variation_pourcentage,
            janvier = measurement_rec.janvier,
            fevrier = measurement_rec.fevrier,
            mars = measurement_rec.mars,
            avril = measurement_rec.avril,
            mai = measurement_rec.mai,
            juin = measurement_rec.juin,
            juillet = measurement_rec.juillet,
            aout = measurement_rec.aout,
            septembre = measurement_rec.septembre,
            octobre = measurement_rec.octobre,
            novembre = measurement_rec.novembre,
            decembre = measurement_rec.decembre,
            year = measurement_rec.year,
            updated_at = NOW()
        WHERE code = measurement_rec.indicator_code
        AND site_name = measurement_rec.site_name;
    END LOOP;
    
    RAISE NOTICE 'Valeurs mises à jour depuis indicator_measurements';
END;
$$ LANGUAGE plpgsql;

-- Trigger pour synchroniser avec indicator_measurements
CREATE OR REPLACE FUNCTION sync_from_indicator_measurements()
RETURNS trigger AS $$
BEGIN
    -- Mettre à jour la ligne correspondante dans site_global_indicator_values_simple
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
        year = NEW.year,
        updated_at = NOW()
    WHERE code = NEW.indicator_code
    AND site_name = NEW.site_name;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Supprimer l'ancien trigger s'il existe
DROP TRIGGER IF EXISTS trigger_sync_from_measurements ON indicator_measurements;

-- Créer le trigger sur indicator_measurements
CREATE TRIGGER trigger_sync_from_measurements
    AFTER INSERT OR UPDATE ON indicator_measurements
    FOR EACH ROW
    EXECUTE FUNCTION sync_from_indicator_measurements();

-- Mettre à jour les valeurs existantes depuis indicator_measurements
SELECT update_site_global_values_from_measurements();

-- Ajouter des commentaires sur la table
COMMENT ON TABLE site_global_indicator_values_simple IS 'Table simplifiée des valeurs d''indicateurs globaux par site. Chaque indicateur lié à un processus d''un site a une ligne unique identifiée par son code.';
COMMENT ON COLUMN site_global_indicator_values_simple.code IS 'Code unique de l''indicateur (clé primaire)';
COMMENT ON COLUMN site_global_indicator_values_simple.site_name IS 'Nom du site associé à cet indicateur';
COMMENT ON COLUMN site_global_indicator_values_simple.processus_code IS 'Code du processus auquel appartient cet indicateur';