/*
  # Création de la table consolidated_filiale_indicator_values

  1. Nouvelle table
    - `consolidated_filiale_indicator_values`
      - Mêmes attributs que `consolidated_global_indicator_values`
      - Attribut supplémentaire `filiale_names` (array) pour les filiales consolidées
      - Consolidation au niveau des filiales (moyenne des valeurs des sites)

  2. Fonctions
    - Fonction de consolidation des indicateurs au niveau filiale
    - Triggers pour maintenir la consolidation à jour

  3. Index
    - Index pour optimiser les requêtes de consolidation
*/
-- Supprimer cette partie


-- Créer la table consolidated_filiale_indicator_values
CREATE TABLE IF NOT EXISTS consolidated_filiale_indicator_values (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_name text NOT NULL,
    filiere_name text,
    filiale_names text[] NOT NULL DEFAULT '{}',
    indicator_code text NOT NULL,
    year integer NOT NULL,
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
    variations_pourcent numeric(10,2),
    performances_pourcent numeric(10,2),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Ajouter les contraintes
ALTER TABLE consolidated_filiale_indicator_values 
ADD CONSTRAINT consolidated_filiale_indicator_values_pkey 
PRIMARY KEY (id);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_consolidated_filiale_org 
ON consolidated_filiale_indicator_values (organization_name);

CREATE INDEX IF NOT EXISTS idx_consolidated_filiale_filiere 
ON consolidated_filiale_indicator_values (filiere_name);

CREATE INDEX IF NOT EXISTS idx_consolidated_filiale_indicator_year 
ON consolidated_filiale_indicator_values (indicator_code, year);

CREATE INDEX IF NOT EXISTS idx_consolidated_filiale_filiale_names 
ON consolidated_filiale_indicator_values USING gin (filiale_names);

-- Index unique pour éviter les doublons
CREATE UNIQUE INDEX IF NOT EXISTS consolidated_filiale_indicator_values_unique_idx 
ON consolidated_filiale_indicator_values (organization_name, COALESCE(filiere_name, ''), indicator_code, year);

-- Activer RLS
ALTER TABLE consolidated_filiale_indicator_values ENABLE ROW LEVEL SECURITY;

-- Politiques RLS
CREATE POLICY "Enable read access for authenticated users" ON consolidated_filiale_indicator_values
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert for authenticated users" ON consolidated_filiale_indicator_values
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON consolidated_filiale_indicator_values
    FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Enable delete for authenticated users" ON consolidated_filiale_indicator_values
    FOR DELETE TO authenticated USING (true);

-- Fonction pour calculer la moyenne en ignorant les valeurs nulles
-- Fonction pour calculer la moyenne en ignorant les valeurs nulles
CREATE OR REPLACE FUNCTION calculate_average_ignore_nulls(input_values numeric[])
RETURNS numeric AS $$
DECLARE
    non_null_values numeric[];
    sum_value numeric := 0;
    count_value integer := 0;
BEGIN
    -- Filtrer les valeurs non nulles
    SELECT array_agg(val) INTO non_null_values
    FROM unnest(input_values) AS val
    WHERE val IS NOT NULL;
    
    -- Si aucune valeur non nulle, retourner NULL
    IF non_null_values IS NULL OR array_length(non_null_values, 1) = 0 THEN
        RETURN NULL;
    END IF;
    
    -- Calculer la moyenne
    SELECT 
        SUM(val), 
        COUNT(val) 
    INTO sum_value, count_value
    FROM unnest(non_null_values) AS val;
    
    IF count_value > 0 THEN
        RETURN sum_value / count_value;
    ELSE
        RETURN NULL;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour consolider les indicateurs au niveau des filiales
CREATE OR REPLACE FUNCTION consolidate_filiale_indicators()
RETURNS void AS $$
DECLARE
    rec RECORD;
    filiale_data RECORD;
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
    filiale_names_array text[];
    variation_text text;
    variations_pourcent_calc numeric;
    performances_pourcent_calc numeric;
BEGIN
    -- Vider la table de consolidation
    DELETE FROM consolidated_filiale_indicator_values;
    
    -- Parcourir chaque combinaison organisation/filière/indicateur/année
    FOR rec IN 
        SELECT DISTINCT 
            s.organization_name,
            s.filiere_name,
            sgiv.code as indicator_code,
            sgiv.year,
            sgiv.axe_energetique,
            sgiv.enjeux,
            sgiv.normes,
            sgiv.critere,
            sgiv.indicateur,
            sgiv.definition,
            sgiv.processus,
            sgiv.processus_code,
            sgiv.frequence,
            sgiv.unite,
            sgiv.type,
            sgiv.formule
        FROM site_global_indicator_values_simple sgiv
        JOIN sites s ON s.name = sgiv.site_name
        WHERE s.filiere_name IS NOT NULL
        AND s.organization_name IS NOT NULL
        ORDER BY s.organization_name, s.filiere_name, sgiv.code, sgiv.year
    LOOP
        -- Réinitialiser les variables
        filiale_names_array := '{}';
        
        -- Calculer les moyennes pour chaque filiale ayant cet indicateur
        SELECT 
            array_agg(DISTINCT fil.name) as filiale_names,
            calculate_average_ignore_nulls(array_agg(sgiv.value)) as avg_val,
            calculate_average_ignore_nulls(array_agg(sgiv.valeur_precedente)) as avg_val_prec,
            calculate_average_ignore_nulls(array_agg(sgiv.cible)) as avg_cible_val,
            calculate_average_ignore_nulls(array_agg(sgiv.janvier)) as avg_jan,
            calculate_average_ignore_nulls(array_agg(sgiv.fevrier)) as avg_fev,
            calculate_average_ignore_nulls(array_agg(sgiv.mars)) as avg_mar,
            calculate_average_ignore_nulls(array_agg(sgiv.avril)) as avg_avr,
            calculate_average_ignore_nulls(array_agg(sgiv.mai)) as avg_mai_val,
            calculate_average_ignore_nulls(array_agg(sgiv.juin)) as avg_jun,
            calculate_average_ignore_nulls(array_agg(sgiv.juillet)) as avg_jul,
            calculate_average_ignore_nulls(array_agg(sgiv.aout)) as avg_aou,
            calculate_average_ignore_nulls(array_agg(sgiv.septembre)) as avg_sep,
            calculate_average_ignore_nulls(array_agg(sgiv.octobre)) as avg_oct,
            calculate_average_ignore_nulls(array_agg(sgiv.novembre)) as avg_nov,
            calculate_average_ignore_nulls(array_agg(sgiv.decembre)) as avg_dec
        INTO 
            filiale_names_array,
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
        FROM site_global_indicator_values_simple sgiv
        JOIN sites s ON s.name = sgiv.site_name
        JOIN filiales fil ON fil.name = s.filiale_name
        WHERE s.organization_name = rec.organization_name
        AND s.filiere_name = rec.filiere_name
        AND sgiv.code = rec.indicator_code
        AND sgiv.year = rec.year
        AND s.filiale_name IS NOT NULL;
        
        -- Calculer la variation
        IF avg_value IS NOT NULL AND avg_valeur_precedente IS NOT NULL AND avg_valeur_precedente != 0 THEN
            variations_pourcent_calc := ((avg_value - avg_valeur_precedente) / avg_valeur_precedente) * 100;
            IF variations_pourcent_calc > 0 THEN
                variation_text := 'Augmentation';
            ELSIF variations_pourcent_calc < 0 THEN
                variation_text := 'Diminution';
            ELSE
                variation_text := 'Stable';
            END IF;
        ELSE
            variations_pourcent_calc := NULL;
            variation_text := NULL;
        END IF;
        
        -- Calculer le pourcentage de performance (par rapport à la cible)
        IF avg_value IS NOT NULL AND avg_cible IS NOT NULL AND avg_cible != 0 THEN
            performances_pourcent_calc := (avg_value / avg_cible) * 100;
        ELSE
            performances_pourcent_calc := NULL;
        END IF;
        
        -- Insérer seulement si on a au moins une filiale
        IF filiale_names_array IS NOT NULL AND array_length(filiale_names_array, 1) > 0 THEN
            INSERT INTO consolidated_filiale_indicator_values (
                organization_name,
                filiere_name,
                filiale_names,
                indicator_code,
                year,
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
                filiale_names_array,
                rec.indicator_code,
                rec.year,
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
                variation_text,
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
                variations_pourcent_calc,
                performances_pourcent_calc
            );
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Fonction de trigger pour mettre à jour automatiquement
CREATE OR REPLACE FUNCTION trigger_update_consolidated_filiale_indicators()
RETURNS trigger AS $$
BEGIN
    -- Exécuter la consolidation de manière asynchrone
    PERFORM consolidate_filiale_indicators();
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger sur site_global_indicator_values_simple
CREATE OR REPLACE TRIGGER trigger_update_consolidated_filiale_on_site_change
    AFTER INSERT OR UPDATE OR DELETE ON site_global_indicator_values_simple
    FOR EACH STATEMENT
    EXECUTE FUNCTION trigger_update_consolidated_filiale_indicators();

-- Trigger sur sites (en cas de changement de filiale)
CREATE OR REPLACE TRIGGER trigger_update_consolidated_filiale_on_site_structure_change
    AFTER UPDATE OF filiale_name, filiere_name ON sites
    FOR EACH STATEMENT
    EXECUTE FUNCTION trigger_update_consolidated_filiale_indicators();

-- Fonction pour mettre à jour le timestamp updated_at
CREATE OR REPLACE FUNCTION update_consolidated_filiale_indicator_values_updated_at()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour updated_at
CREATE OR REPLACE TRIGGER update_consolidated_filiale_indicator_values_updated_at
    BEFORE UPDATE ON consolidated_filiale_indicator_values
    FOR EACH ROW
    EXECUTE FUNCTION update_consolidated_filiale_indicator_values_updated_at();

-- Exécuter la consolidation initiale
SELECT consolidate_filiale_indicators();
ALTER TABLE consolidated_filiale_indicator_values 
ADD CONSTRAINT consolidated_filiale_indicator_values_pkey 
PRIMARY KEY (id);