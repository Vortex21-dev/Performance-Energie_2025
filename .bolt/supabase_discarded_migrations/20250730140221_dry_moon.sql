/*
  # Création de la table consolidated_filiale_indicator_values

  1. Nouvelle table
    - `consolidated_filiale_indicator_values`
      - Même structure que `consolidated_global_indicator_values`
      - Consolidation au niveau des filiales
      - Calcul de la moyenne des valeurs par indicateur entre filiales

  2. Fonctions
    - Fonction de consolidation automatique
    - Trigger pour maintenir la synchronisation

  3. Sécurité
    - Enable RLS sur la nouvelle table
    - Politiques d'accès identiques aux autres tables
*/

-- Création de la table consolidated_filiale_indicator_values
CREATE TABLE IF NOT EXISTS consolidated_filiale_indicator_values (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_name text NOT NULL,
    filiere_name text,
    filiale_name text NOT NULL,
    indicator_code text NOT NULL,
    year integer NOT NULL,
    site_names text[] DEFAULT '{}' NOT NULL,
    axe_energetique text,
    enjeux text,
    normes text,
    critere text,
    indicateur text,
    definition text,
    processus text,
    processus_code text,
    frequence text DEFAULT 'Mensuelle',
    unite text,
    type text,
    formule text,
    value numeric,
    valeur_precedente numeric,
    cible numeric,
    variation text,
    janvier numeric,
    fevrier numeric,
    mars numeric,
    avril numeric,
    mai numeric,
    juin numeric,
    juillet numeric,
    aout numeric,
    septembre numeric,
    octobre numeric,
    novembre numeric,
    decembre numeric,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    variations_pourcent numeric(10,2),
    performances_pourcent numeric(10,2)
);

-- Index pour optimiser les performances
CREATE INDEX IF NOT EXISTS idx_consolidated_filiale_indicator_values_org 
ON consolidated_filiale_indicator_values(organization_name);

CREATE INDEX IF NOT EXISTS idx_consolidated_filiale_indicator_values_filiale 
ON consolidated_filiale_indicator_values(filiale_name);

CREATE INDEX IF NOT EXISTS idx_consolidated_filiale_indicator_values_filiere 
ON consolidated_filiale_indicator_values(filiere_name);

CREATE INDEX IF NOT EXISTS idx_consolidated_filiale_indicator_values_code 
ON consolidated_filiale_indicator_values(indicator_code);

CREATE INDEX IF NOT EXISTS idx_consolidated_filiale_indicator_values_year 
ON consolidated_filiale_indicator_values(year);

CREATE INDEX IF NOT EXISTS idx_consolidated_filiale_indicator_values_indicator_year 
ON consolidated_filiale_indicator_values(indicator_code, year);

CREATE UNIQUE INDEX IF NOT EXISTS consolidated_filiale_indicator_values_unique_idx 
ON consolidated_filiale_indicator_values(organization_name, COALESCE(filiere_name, ''), filiale_name, indicator_code, year);

-- Enable RLS
ALTER TABLE consolidated_filiale_indicator_values ENABLE ROW LEVEL SECURITY;

-- Politiques d'accès
CREATE POLICY "Enable read access for authenticated users" ON consolidated_filiale_indicator_values
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert for authenticated users" ON consolidated_filiale_indicator_values
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON consolidated_filiale_indicator_values
    FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Enable delete for authenticated users" ON consolidated_filiale_indicator_values
    FOR DELETE TO authenticated USING (true);

-- Fonction pour consolider les indicateurs au niveau des filiales
CREATE OR REPLACE FUNCTION consolidate_filiale_indicators()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    rec RECORD;
    site_list text[];
    avg_value numeric;
    avg_valeur_precedente numeric;
    avg_cible numeric;
    avg_janvier numeric;
    avg_fevrier numeric;
    avg_mars numeric;
    avg_avril numeric;
    avg_mai numeric;
    avg_juin numeric;
    avg_juillet numeric;
    avg_aout numeric;
    avg_septembre numeric;
    avg_octobre numeric;
    avg_novembre numeric;
    avg_decembre numeric;
    calculated_variations_pourcent numeric;
    calculated_performances_pourcent numeric;
BEGIN
    RAISE NOTICE 'Début de la consolidation des indicateurs au niveau des filiales...';
    
    -- Supprimer les anciennes données consolidées
    DELETE FROM consolidated_filiale_indicator_values;
    
    -- Consolider par organisation, filière, filiale, indicateur et année
    FOR rec IN 
        SELECT DISTINCT 
            s.organization_name,
            s.filiere_name,
            s.filiale_name,
            s.code as indicator_code,
            s.year,
            s.axe_energetique,
            s.enjeux,
            s.normes,
            s.critere,
            s.indicateur,
            s.definition,
            s.processus,
            s.processus_code,
            s.frequence,
            s.unite,
            s.type,
            s.formule
        FROM site_global_indicator_values_simple s
        INNER JOIN sites st ON st.name = s.site_name
        WHERE s.site_name IS NOT NULL 
        AND st.filiale_name IS NOT NULL
        AND s.filiale_name IS NOT NULL
    LOOP
        -- Récupérer la liste des sites pour cette filiale/indicateur/année
        SELECT array_agg(DISTINCT s.site_name)
        INTO site_list
        FROM site_global_indicator_values_simple s
        INNER JOIN sites st ON st.name = s.site_name
        WHERE s.organization_name = rec.organization_name
        AND s.filiale_name = rec.filiale_name
        AND s.code = rec.indicator_code
        AND s.year = rec.year
        AND s.site_name IS NOT NULL
        AND st.filiale_name = rec.filiale_name;
        
        -- Calculer les moyennes des valeurs pour cette filiale
        SELECT 
            AVG(s.value),
            AVG(s.valeur_precedente),
            AVG(s.cible),
            AVG(s.janvier),
            AVG(s.fevrier),
            AVG(s.mars),
            AVG(s.avril),
            AVG(s.mai),
            AVG(s.juin),
            AVG(s.juillet),
            AVG(s.aout),
            AVG(s.septembre),
            AVG(s.octobre),
            AVG(s.novembre),
            AVG(s.decembre)
        INTO 
            avg_value,
            avg_valeur_precedente,
            avg_cible,
            avg_janvier,
            avg_fevrier,
            avg_mars,
            avg_avril,
            avg_mai,
            avg_juin,
            avg_juillet,
            avg_aout,
            avg_septembre,
            avg_octobre,
            avg_novembre,
            avg_decembre
        FROM site_global_indicator_values_simple s
        INNER JOIN sites st ON st.name = s.site_name
        WHERE s.organization_name = rec.organization_name
        AND s.filiale_name = rec.filiale_name
        AND s.code = rec.indicator_code
        AND s.year = rec.year
        AND s.site_name IS NOT NULL
        AND st.filiale_name = rec.filiale_name;
        
        -- Calculer variations_pourcent (value - cible)
        calculated_variations_pourcent := CASE 
            WHEN avg_cible IS NOT NULL AND avg_value IS NOT NULL 
            THEN ROUND((avg_value - avg_cible)::numeric, 2)
            ELSE NULL 
        END;
        
        -- Calculer performances_pourcent (exemple: pourcentage d'atteinte de la cible)
        calculated_performances_pourcent := CASE 
            WHEN avg_cible IS NOT NULL AND avg_cible != 0 AND avg_value IS NOT NULL 
            THEN ROUND((avg_value / avg_cible * 100)::numeric, 2)
            ELSE NULL 
        END;
        
        -- Insérer ou mettre à jour la consolidation
        INSERT INTO consolidated_filiale_indicator_values (
            organization_name,
            filiere_name,
            filiale_name,
            indicator_code,
            year,
            site_names,
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
            variations_pourcent,
            performances_pourcent
        ) VALUES (
            rec.organization_name,
            rec.filiere_name,
            rec.filiale_name,
            rec.indicator_code,
            rec.year,
            site_list,
            rec.axe_energetique,
            rec.enjeux,
            rec.normes,
            rec.critere,
            rec.indicateur,
            rec.definition,
            rec.processus,
            rec.processus_code,
            rec.frequence,
            rec.unite,
            rec.type,
            rec.formule,
            avg_value,
            avg_valeur_precedente,
            avg_cible,
            avg_janvier,
            avg_fevrier,
            avg_mars,
            avg_avril,
            avg_mai,
            avg_juin,
            avg_juillet,
            avg_aout,
            avg_septembre,
            avg_octobre,
            avg_novembre,
            avg_decembre,
            calculated_variations_pourcent,
            calculated_performances_pourcent
        )
        ON CONFLICT (organization_name, COALESCE(filiere_name, ''), filiale_name, indicator_code, year)
        DO UPDATE SET
            site_names = EXCLUDED.site_names,
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
            value = EXCLUDED.value,
            valeur_precedente = EXCLUDED.valeur_precedente,
            cible = EXCLUDED.cible,
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
            variations_pourcent = EXCLUDED.variations_pourcent,
            performances_pourcent = EXCLUDED.performances_pourcent,
            updated_at = now();
            
    END LOOP;
    
    RAISE NOTICE 'Consolidation des filiales terminée. % lignes consolidées.', 
        (SELECT COUNT(*) FROM consolidated_filiale_indicator_values);
END;
$$;

-- Fonction trigger pour maintenir la synchronisation
CREATE OR REPLACE FUNCTION update_consolidated_filiale_indicators()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    -- Re-consolider les données pour l'organisation affectée
    PERFORM consolidate_filiale_indicators();
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger sur site_global_indicator_values_simple pour maintenir la synchronisation
DROP TRIGGER IF EXISTS trigger_update_consolidated_filiale_indicators ON site_global_indicator_values_simple;
CREATE TRIGGER trigger_update_consolidated_filiale_indicators
    AFTER INSERT OR UPDATE OR DELETE ON site_global_indicator_values_simple
    FOR EACH ROW
    EXECUTE FUNCTION update_consolidated_filiale_indicators();

-- Fonction pour forcer la consolidation manuelle
CREATE OR REPLACE FUNCTION force_consolidate_filiale_indicators()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
    result_count integer;
BEGIN
    PERFORM consolidate_filiale_indicators();
    
    SELECT COUNT(*) INTO result_count 
    FROM consolidated_filiale_indicator_values;
    
    RETURN format('Consolidation terminée. %s lignes consolidées au niveau des filiales.', result_count);
END;
$$;

-- Fonction trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_consolidated_filiale_indicator_values_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Trigger pour updated_at
DROP TRIGGER IF EXISTS update_consolidated_filiale_indicator_values_updated_at ON consolidated_filiale_indicator_values;
CREATE TRIGGER update_consolidated_filiale_indicator_values_updated_at
    BEFORE UPDATE ON consolidated_filiale_indicator_values
    FOR EACH ROW
    EXECUTE FUNCTION update_consolidated_filiale_indicator_values_updated_at();

-- Exécuter la consolidation initiale
SELECT consolidate_filiale_indicators();

-- Afficher le résumé
DO $$
DECLARE
    total_count integer;
    org_count integer;
    filiere_count integer;
    filiale_count integer;
BEGIN
    SELECT COUNT(*) INTO total_count FROM consolidated_filiale_indicator_values;
    SELECT COUNT(DISTINCT organization_name) INTO org_count FROM consolidated_filiale_indicator_values;
    SELECT COUNT(DISTINCT filiere_name) INTO filiere_count FROM consolidated_filiale_indicator_values WHERE filiere_name IS NOT NULL;
    SELECT COUNT(DISTINCT filiale_name) INTO filiale_count FROM consolidated_filiale_indicator_values;
    
    RAISE NOTICE '=== RÉSUMÉ DE LA CONSOLIDATION DES FILIALES ===';
    RAISE NOTICE 'Total des lignes consolidées: %', total_count;
    RAISE NOTICE 'Organisations: %', org_count;
    RAISE NOTICE 'Filières: %', filiere_count;
    RAISE NOTICE 'Filiales: %', filiale_count;
    RAISE NOTICE '===============================================';
END;
$$;