/*
  # Mise à jour de la table site_global_indicator_values_simple

  1. Modifications de la table
    - Ajout des colonnes manquantes pour les informations des indicateurs
    - Mise à jour des triggers pour maintenir la cohérence des données
    - Ajout d'index pour optimiser les performances

  2. Nouvelles colonnes ajoutées
    - `processus_name` : Nom du processus
    - `processus_description` : Description du processus
    - `indicator_name` : Nom de l'indicateur
    - `indicator_description` : Description de l'indicateur
    - `indicator_type` : Type de l'indicateur
    - `indicator_frequency` : Fréquence de l'indicateur
    - `indicator_formula` : Formule de calcul de l'indicateur

  3. Index ajoutés
    - Index sur processus_code pour optimiser les requêtes
    - Index composé sur site_name, processus_code, code pour les recherches complexes
*/

-- Ajouter les nouvelles colonnes à la table site_global_indicator_values_simple
ALTER TABLE site_global_indicator_values_simple 
ADD COLUMN IF NOT EXISTS processus_name text,
ADD COLUMN IF NOT EXISTS processus_description text,
ADD COLUMN IF NOT EXISTS indicator_name text,
ADD COLUMN IF NOT EXISTS indicator_description text,
ADD COLUMN IF NOT EXISTS indicator_type text,
ADD COLUMN IF NOT EXISTS indicator_frequency text DEFAULT 'Mensuelle',
ADD COLUMN IF NOT EXISTS indicator_formula text;

-- Créer des index pour optimiser les performances
CREATE INDEX IF NOT EXISTS idx_site_global_indicator_values_simple_processus 
ON site_global_indicator_values_simple (processus_code);

CREATE INDEX IF NOT EXISTS idx_site_global_indicator_values_simple_composite 
ON site_global_indicator_values_simple (site_name, processus_code, code);

-- Fonction pour mettre à jour les informations des indicateurs et processus
CREATE OR REPLACE FUNCTION update_site_indicator_info()
RETURNS TRIGGER AS $$
BEGIN
    -- Récupérer les informations de l'indicateur
    SELECT 
        i.name,
        i.description,
        i.type,
        i.frequence,
        i.formule
    INTO 
        NEW.indicator_name,
        NEW.indicator_description,
        NEW.indicator_type,
        NEW.indicator_frequency,
        NEW.indicator_formula
    FROM indicators i
    WHERE i.code = NEW.code;

    -- Récupérer les informations du processus
    SELECT 
        p.name,
        p.description
    INTO 
        NEW.processus_name,
        NEW.processus_description
    FROM processus p
    WHERE p.code = NEW.processus_code;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger pour mettre à jour automatiquement les informations
DROP TRIGGER IF EXISTS trigger_update_site_indicator_info ON site_global_indicator_values_simple;
CREATE TRIGGER trigger_update_site_indicator_info
    BEFORE INSERT OR UPDATE ON site_global_indicator_values_simple
    FOR EACH ROW
    EXECUTE FUNCTION update_site_indicator_info();

-- Mettre à jour les enregistrements existants avec les informations des indicateurs et processus
UPDATE site_global_indicator_values_simple 
SET 
    indicator_name = i.name,
    indicator_description = i.description,
    indicator_type = i.type,
    indicator_frequency = COALESCE(i.frequence, 'Mensuelle'),
    indicator_formula = i.formule,
    processus_name = p.name,
    processus_description = p.description
FROM indicators i, processus p
WHERE site_global_indicator_values_simple.code = i.code 
AND site_global_indicator_values_simple.processus_code = p.code;

-- Fonction pour synchroniser les données depuis indicator_measurements
CREATE OR REPLACE FUNCTION sync_site_global_indicators()
RETURNS void AS $$
BEGIN
    -- Insérer ou mettre à jour les données depuis indicator_measurements
    INSERT INTO site_global_indicator_values_simple (
        site_name,
        year,
        code,
        processus_code,
        axe_energetique,
        enjeux,
        normes,
        critere,
        indicateur,
        definition,
        processus,
        frequence,
        unite,
        type,
        formule,
        value,
        valeur_precedente,
        cible,
        variation,
        janvier,
        fevrier,
        mars,
        avril,
        mai,
        juin,
        juillet,
        aout,
        septembre,
        octobre,
        novembre,
        decembre,
        organization_name,
        filiere_name,
        filiale_name,
        indicator_name,
        indicator_description,
        indicator_type,
        indicator_frequency,
        indicator_formula,
        processus_name,
        processus_description
    )
    SELECT DISTINCT
        im.site_name,
        EXTRACT(YEAR FROM cp.start_date)::integer as year,
        im.indicator_code as code,
        im.processus_code,
        i.axe_energetique,
        i.enjeux,
        i.normes,
        i.critere,
        i.name as indicateur,
        i.description as definition,
        p.name as processus,
        COALESCE(i.frequence, 'Mensuelle') as frequence,
        i.unit as unite,
        i.type,
        i.formule as formule,
        im.valeur_annee_actuelle as value,
        im.valeur_annee_precedente as valeur_precedente,
        im.cible_annee_actuelle as cible,
        CASE 
            WHEN im.valeur_annee_precedente IS NOT NULL AND im.valeur_annee_precedente != 0 
            THEN ROUND(((im.valeur_annee_actuelle - im.valeur_annee_precedente) / im.valeur_annee_precedente * 100)::numeric, 2)::text || '%'
            ELSE NULL
        END as variation,
        im.janvier,
        im.fevrier,
        im.mars,
        im.avril,
        im.mai,
        im.juin,
        im.juillet,
        im.aout,
        im.septembre,
        im.octobre,
        im.novembre,
        im.decembre,
        s.organization_name,
        s.filiere_name,
        s.filiale_name,
        i.name as indicator_name,
        i.description as indicator_description,
        i.type as indicator_type,
        COALESCE(i.frequence, 'Mensuelle') as indicator_frequency,
        i.formule as indicator_formula,
        p.name as processus_name,
        p.description as processus_description
    FROM indicator_measurements im
    JOIN indicators i ON im.indicator_code = i.code
    JOIN processus p ON im.processus_code = p.code
    JOIN sites s ON im.site_name = s.name
    LEFT JOIN collection_periods cp ON EXTRACT(YEAR FROM cp.start_date) = im.year
    ON CONFLICT (site_name, code, year) 
    DO UPDATE SET
        processus_code = EXCLUDED.processus_code,
        axe_energetique = EXCLUDED.axe_energetique,
        enjeux = EXCLUDED.enjeux,
        normes = EXCLUDED.normes,
        critere = EXCLUDED.critere,
        indicateur = EXCLUDED.indicateur,
        definition = EXCLUDED.definition,
        processus = EXCLUDED.processus,
        frequence = EXCLUDED.frequence,
        unite = EXCLUDED.unite,
        type = EXCLUDED.type,
        formule = EXCLUDED.formule,
        value = EXCLUDED.value,
        valeur_precedente = EXCLUDED.valeur_precedente,
        cible = EXCLUDED.cible,
        variation = EXCLUDED.variation,
        janvier = EXCLUDED.janvier,
        fevrier = EXCLUDED.fevrier,
        mars = EXCLUDED.mars,
        avril = EXCLUDED.avril,
        mai = EXCLUDED.mai,
        juin = EXCLUDED.juin,
        juillet = EXCLUDED.juillet,
        aout = EXCLUDED.aout,
        septembre = EXCLUDED.septembre,
        octobre = EXCLUDED.octobre,
        novembre = EXCLUDED.novembre,
        decembre = EXCLUDED.decembre,
        organization_name = EXCLUDED.organization_name,
        filiere_name = EXCLUDED.filiere_name,
        filiale_name = EXCLUDED.filiale_name,
        indicator_name = EXCLUDED.indicator_name,
        indicator_description = EXCLUDED.indicator_description,
        indicator_type = EXCLUDED.indicator_type,
        indicator_frequency = EXCLUDED.indicator_frequency,
        indicator_formula = EXCLUDED.indicator_formula,
        processus_name = EXCLUDED.processus_name,
        processus_description = EXCLUDED.processus_description,
        updated_at = now();
END;
$$ LANGUAGE plpgsql;

-- Exécuter la synchronisation pour les données existantes
SELECT sync_site_global_indicators();

-- Créer une vue pour faciliter les requêtes avec toutes les informations
CREATE OR REPLACE VIEW v_site_indicators_complete AS
SELECT 
    sgiv.*,
    CASE 
        WHEN sgiv.value IS NOT NULL AND sgiv.cible IS NOT NULL AND sgiv.cible != 0
        THEN ROUND((sgiv.value / sgiv.cible * 100)::numeric, 2)
        ELSE NULL
    END as performance_vs_target,
    CASE 
        WHEN sgiv.valeur_precedente IS NOT NULL AND sgiv.valeur_precedente != 0
        THEN ROUND(((sgiv.value - sgiv.valeur_precedente) / sgiv.valeur_precedente * 100)::numeric, 2)
        ELSE NULL
    END as evolution_percentage
FROM site_global_indicator_values_simple sgiv
ORDER BY sgiv.site_name, sgiv.processus_name, sgiv.indicator_name;

-- Ajouter des commentaires sur les nouvelles colonnes
COMMENT ON COLUMN site_global_indicator_values_simple.processus_name IS 'Nom du processus associé à l''indicateur';
COMMENT ON COLUMN site_global_indicator_values_simple.processus_description IS 'Description du processus';
COMMENT ON COLUMN site_global_indicator_values_simple.indicator_name IS 'Nom de l''indicateur';
COMMENT ON COLUMN site_global_indicator_values_simple.indicator_description IS 'Description de l''indicateur';
COMMENT ON COLUMN site_global_indicator_values_simple.indicator_type IS 'Type de l''indicateur';
COMMENT ON COLUMN site_global_indicator_values_simple.indicator_frequency IS 'Fréquence de mesure de l''indicateur';
COMMENT ON COLUMN site_global_indicator_values_simple.indicator_formula IS 'Formule de calcul de l''indicateur';

-- Mettre à jour la fonction de trigger existante pour inclure les nouvelles colonnes
CREATE OR REPLACE FUNCTION update_site_global_indicator_values_simple_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    
    -- Mettre à jour les informations de l'indicateur et du processus si nécessaire
    IF NEW.code IS DISTINCT FROM OLD.code OR NEW.processus_code IS DISTINCT FROM OLD.processus_code THEN
        -- Récupérer les informations de l'indicateur
        SELECT 
            i.name,
            i.description,
            i.type,
            i.frequence,
            i.formule
        INTO 
            NEW.indicator_name,
            NEW.indicator_description,
            NEW.indicator_type,
            NEW.indicator_frequency,
            NEW.indicator_formula
        FROM indicators i
        WHERE i.code = NEW.code;

        -- Récupérer les informations du processus
        SELECT 
            p.name,
            p.description
        INTO 
            NEW.processus_name,
            NEW.processus_description
        FROM processus p
        WHERE p.code = NEW.processus_code;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;