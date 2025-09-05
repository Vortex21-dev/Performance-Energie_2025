/*
  # Remplacement des tables par site_indicator_values_global

  1. Suppression des anciennes tables
    - `site_global_indicator_values_simple`
    - `consolidated_global_indicator_values`
  
  2. Création de la nouvelle table
    - `site_indicator_values_global` avec structure complète
    - Contraintes et index optimisés
    - Triggers pour synchronisation automatique
  
  3. Fonctionnalités
    - Enrichissement automatique des métadonnées
    - Calculs automatiques des performances
    - Vérification des liaisons site-processus
    - Filtrage par organization_selections
*/

-- Supprimer les triggers et fonctions liés aux anciennes tables
DROP TRIGGER IF EXISTS trg_auto_consolidate ON site_global_indicator_values_simple;
DROP TRIGGER IF EXISTS trigger_update_consolidated_indicators ON site_global_indicator_values_simple;
DROP TRIGGER IF EXISTS trigger_update_monthly_performances ON site_global_indicator_values_simple;
DROP TRIGGER IF EXISTS trigger_update_percentages ON site_global_indicator_values_simple;
DROP TRIGGER IF EXISTS update_site_global_indicator_values_simple_updated_at ON site_global_indicator_values_simple;

DROP TRIGGER IF EXISTS update_consolidated_global_indicator_values_updated_at ON consolidated_global_indicator_values;

-- Supprimer les fonctions liées
DROP FUNCTION IF EXISTS update_consolidated_indicators();
DROP FUNCTION IF EXISTS update_monthly_performances_trigger();
DROP FUNCTION IF EXISTS update_percentages_trigger();
DROP FUNCTION IF EXISTS update_site_global_indicator_values_simple_updated_at();
DROP FUNCTION IF EXISTS update_consolidated_global_indicator_values_updated_at();

-- Supprimer les anciennes tables
DROP TABLE IF EXISTS site_global_indicator_values_simple CASCADE;
DROP TABLE IF EXISTS consolidated_global_indicator_values CASCADE;

-- Créer la nouvelle table site_indicator_values_global
CREATE TABLE IF NOT EXISTS public.site_indicator_values_global (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  site_name text NOT NULL,
  year integer NOT NULL,
  code text NOT NULL,
  axe_energetique text NULL,
  enjeux text NULL,
  normes text NULL,
  critere text NULL,
  indicateur text NULL,
  definition text NULL,
  processus text NULL,
  processus_code text NULL,
  frequence text NULL,
  unite text NULL,
  type text NULL,
  formule text NULL,
  value numeric NULL,
  valeur_precedente numeric NULL,
  cible numeric NULL DEFAULT 100,
  variation text NULL,
  janvier numeric NULL,
  fevrier numeric NULL,
  mars numeric NULL,
  avril numeric NULL,
  mai numeric NULL,
  juin numeric NULL,
  juillet numeric NULL,
  aout numeric NULL,
  septembre numeric NULL,
  octobre numeric NULL,
  novembre numeric NULL,
  decembre numeric NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  organization_name text NULL,
  filiere_name text NULL,
  filiale_name text NULL,
  variations_pourcent numeric(10, 2) NULL,
  performances_pourcent numeric(10, 2) NULL,
  perf_janvier numeric(10, 2) NULL,
  perf_fevrier numeric(10, 2) NULL,
  perf_mars numeric(10, 2) NULL,
  perf_avril numeric(10, 2) NULL,
  perf_mai numeric(10, 2) NULL,
  perf_juin numeric(10, 2) NULL,
  perf_juillet numeric(10, 2) NULL,
  perf_aout numeric(10, 2) NULL,
  perf_septembre numeric(10, 2) NULL,
  perf_octobre numeric(10, 2) NULL,
  perf_novembre numeric(10, 2) NULL,
  perf_decembre numeric(10, 2) NULL,
  CONSTRAINT site_indicator_values_global_pkey PRIMARY KEY (id, site_name, code),
  CONSTRAINT site_indicator_values_global_code_fkey FOREIGN KEY (code) REFERENCES indicators (code) ON DELETE CASCADE,
  CONSTRAINT site_indicator_values_global_processus_code_fkey FOREIGN KEY (processus_code) REFERENCES processus (code) ON DELETE CASCADE,
  CONSTRAINT site_indicator_values_global_site_name_fkey FOREIGN KEY (site_name) REFERENCES sites (name) ON DELETE CASCADE
);

-- Créer les index pour optimiser les performances
CREATE UNIQUE INDEX IF NOT EXISTS site_indicator_values_global_unique_idx 
ON site_indicator_values_global (site_name, code, year);

CREATE INDEX IF NOT EXISTS idx_site_indicator_values_global_site_name 
ON site_indicator_values_global (site_name);

CREATE INDEX IF NOT EXISTS idx_site_indicator_values_global_code 
ON site_indicator_values_global (code);

CREATE INDEX IF NOT EXISTS idx_site_indicator_values_global_year 
ON site_indicator_values_global (year);

CREATE INDEX IF NOT EXISTS idx_site_indicator_values_global_organization 
ON site_indicator_values_global (organization_name);

-- Activer RLS
ALTER TABLE site_indicator_values_global ENABLE ROW LEVEL SECURITY;

-- Créer les politiques RLS
CREATE POLICY "Enable read access for authenticated users on site_indicator_values_global"
ON site_indicator_values_global FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Enable insert for authenticated users on site_indicator_values_global"
ON site_indicator_values_global FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users on site_indicator_values_global"
ON site_indicator_values_global FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Enable delete for authenticated users on site_indicator_values_global"
ON site_indicator_values_global FOR DELETE
TO authenticated
USING (true);

-- Fonction pour synchroniser les indicateurs d'un site
CREATE OR REPLACE FUNCTION sync_site_indicator_values_global(target_site_name text)
RETURNS void AS $$
DECLARE
    site_org_name text;
    selected_indicators text[];
    indicator_record record;
    current_year_value numeric;
    previous_year_value numeric;
    monthly_values record;
    metadata_record record;
BEGIN
    -- Récupérer l'organisation du site
    SELECT organization_name INTO site_org_name
    FROM sites 
    WHERE name = target_site_name;
    
    IF site_org_name IS NULL THEN
        RETURN;
    END IF;
    
    -- Récupérer les indicateurs sélectionnés pour cette organisation
    SELECT indicator_names INTO selected_indicators
    FROM organization_selections 
    WHERE organization_name = site_org_name
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF selected_indicators IS NULL OR array_length(selected_indicators, 1) = 0 THEN
        -- Supprimer tous les indicateurs pour ce site si aucun n'est sélectionné
        DELETE FROM site_indicator_values_global WHERE site_name = target_site_name;
        RETURN;
    END IF;
    
    -- Supprimer les indicateurs non autorisés
    DELETE FROM site_indicator_values_global 
    WHERE site_name = target_site_name 
    AND indicateur NOT IN (SELECT unnest(selected_indicators));
    
    -- Pour chaque indicateur sélectionné
    FOR indicator_record IN 
        SELECT DISTINCT i.code, i.name, i.description, i.unit, i.type, i.formule, i.frequence, i.processus_code, p.name as processus_name
        FROM indicators i
        LEFT JOIN processus p ON i.processus_code = p.code
        WHERE i.name = ANY(selected_indicators)
        AND EXISTS (
            SELECT 1 FROM site_processes sp 
            WHERE sp.site_name = target_site_name 
            AND sp.processus_code = i.processus_code 
            AND sp.is_active = true
        )
    LOOP
        -- Récupérer les métadonnées enrichies
        SELECT 
            iss.axe_energetique,
            ssi.issue_name as enjeux,
            ss.standard_name as normes,
            ssic.criteria_name as critere
        INTO metadata_record
        FROM indicators i
        LEFT JOIN issues iss ON i.enjeux = iss.name
        LEFT JOIN sector_standards_issues ssi ON ssi.issue_codes @> ARRAY[iss.code]
        LEFT JOIN sector_standards ss ON ss.sector_name = ssi.sector_name AND ss.energy_type_name = ssi.energy_type_name
        LEFT JOIN sector_standards_issues_criteria ssic ON ssic.sector_name = ssi.sector_name 
            AND ssic.energy_type_name = ssi.energy_type_name 
            AND ssic.standard_name = ssi.standard_name
            AND ssic.issue_name = ssi.issue_name
        WHERE i.code = indicator_record.code
        LIMIT 1;
        
        -- Récupérer la valeur annuelle actuelle (2025)
        SELECT COALESCE(SUM(value), 0) INTO current_year_value
        FROM indicator_values iv
        JOIN collection_periods cp ON iv.period_id = cp.id
        WHERE iv.indicator_code = indicator_record.code
        AND iv.site_name = target_site_name
        AND cp.year = 2025;
        
        -- Récupérer la valeur annuelle précédente (2024)
        SELECT COALESCE(SUM(value), 0) INTO previous_year_value
        FROM indicator_values iv
        JOIN collection_periods cp ON iv.period_id = cp.id
        WHERE iv.indicator_code = indicator_record.code
        AND iv.site_name = target_site_name
        AND cp.year = 2024;
        
        -- Récupérer les valeurs mensuelles pour 2025
        SELECT 
            COALESCE(SUM(CASE WHEN cp.period_number = 1 THEN iv.value END), 0) as janvier,
            COALESCE(SUM(CASE WHEN cp.period_number = 2 THEN iv.value END), 0) as fevrier,
            COALESCE(SUM(CASE WHEN cp.period_number = 3 THEN iv.value END), 0) as mars,
            COALESCE(SUM(CASE WHEN cp.period_number = 4 THEN iv.value END), 0) as avril,
            COALESCE(SUM(CASE WHEN cp.period_number = 5 THEN iv.value END), 0) as mai,
            COALESCE(SUM(CASE WHEN cp.period_number = 6 THEN iv.value END), 0) as juin,
            COALESCE(SUM(CASE WHEN cp.period_number = 7 THEN iv.value END), 0) as juillet,
            COALESCE(SUM(CASE WHEN cp.period_number = 8 THEN iv.value END), 0) as aout,
            COALESCE(SUM(CASE WHEN cp.period_number = 9 THEN iv.value END), 0) as septembre,
            COALESCE(SUM(CASE WHEN cp.period_number = 10 THEN iv.value END), 0) as octobre,
            COALESCE(SUM(CASE WHEN cp.period_number = 11 THEN iv.value END), 0) as novembre,
            COALESCE(SUM(CASE WHEN cp.period_number = 12 THEN iv.value END), 0) as decembre
        INTO monthly_values
        FROM indicator_values iv
        JOIN collection_periods cp ON iv.period_id = cp.id
        WHERE iv.indicator_code = indicator_record.code
        AND iv.site_name = target_site_name
        AND cp.year = 2025
        AND cp.period_type = 'month';
        
        -- Insérer ou mettre à jour l'enregistrement
        INSERT INTO site_indicator_values_global (
            site_name, year, code, axe_energetique, enjeux, normes, critere,
            indicateur, definition, processus, processus_code, frequence, unite, type, formule,
            value, valeur_precedente, cible,
            janvier, fevrier, mars, avril, mai, juin,
            juillet, aout, septembre, octobre, novembre, decembre,
            organization_name, filiere_name, filiale_name,
            variations_pourcent, performances_pourcent,
            perf_janvier, perf_fevrier, perf_mars, perf_avril, perf_mai, perf_juin,
            perf_juillet, perf_aout, perf_septembre, perf_octobre, perf_novembre, perf_decembre
        )
        SELECT 
            target_site_name,
            2025,
            indicator_record.code,
            metadata_record.axe_energetique,
            metadata_record.enjeux,
            metadata_record.normes,
            metadata_record.critere,
            indicator_record.name,
            indicator_record.description,
            indicator_record.processus_name,
            indicator_record.processus_code,
            indicator_record.frequence,
            indicator_record.unit,
            indicator_record.type,
            indicator_record.formule,
            current_year_value,
            previous_year_value,
            100, -- cible par défaut
            monthly_values.janvier,
            monthly_values.fevrier,
            monthly_values.mars,
            monthly_values.avril,
            monthly_values.mai,
            monthly_values.juin,
            monthly_values.juillet,
            monthly_values.aout,
            monthly_values.septembre,
            monthly_values.octobre,
            monthly_values.novembre,
            monthly_values.decembre,
            s.organization_name,
            s.filiere_name,
            s.filiale_name,
            -- Calculs automatiques
            current_year_value - 100, -- variations_pourcent
            CASE WHEN 100 > 0 THEN (current_year_value / 100) * 100 ELSE NULL END, -- performances_pourcent
            -- Performances mensuelles
            CASE WHEN 100 > 0 THEN (monthly_values.janvier / 100) * 100 ELSE NULL END,
            CASE WHEN 100 > 0 THEN (monthly_values.fevrier / 100) * 100 ELSE NULL END,
            CASE WHEN 100 > 0 THEN (monthly_values.mars / 100) * 100 ELSE NULL END,
            CASE WHEN 100 > 0 THEN (monthly_values.avril / 100) * 100 ELSE NULL END,
            CASE WHEN 100 > 0 THEN (monthly_values.mai / 100) * 100 ELSE NULL END,
            CASE WHEN 100 > 0 THEN (monthly_values.juin / 100) * 100 ELSE NULL END,
            CASE WHEN 100 > 0 THEN (monthly_values.juillet / 100) * 100 ELSE NULL END,
            CASE WHEN 100 > 0 THEN (monthly_values.aout / 100) * 100 ELSE NULL END,
            CASE WHEN 100 > 0 THEN (monthly_values.septembre / 100) * 100 ELSE NULL END,
            CASE WHEN 100 > 0 THEN (monthly_values.octobre / 100) * 100 ELSE NULL END,
            CASE WHEN 100 > 0 THEN (monthly_values.novembre / 100) * 100 ELSE NULL END,
            CASE WHEN 100 > 0 THEN (monthly_values.decembre / 100) * 100 ELSE NULL END
        FROM sites s
        WHERE s.name = target_site_name
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
            organization_name = EXCLUDED.organization_name,
            filiere_name = EXCLUDED.filiere_name,
            filiale_name = EXCLUDED.filiale_name,
            variations_pourcent = EXCLUDED.variations_pourcent,
            performances_pourcent = EXCLUDED.performances_pourcent,
            perf_janvier = EXCLUDED.perf_janvier,
            perf_fevrier = EXCLUDED.perf_fevrier,
            perf_mars = EXCLUDED.perf_mars,
            perf_avril = EXCLUDED.perf_avril,
            perf_mai = EXCLUDED.perf_mai,
            perf_juin = EXCLUDED.perf_juin,
            perf_juillet = EXCLUDED.perf_juillet,
            perf_aout = EXCLUDED.perf_aout,
            perf_septembre = EXCLUDED.perf_septembre,
            perf_octobre = EXCLUDED.perf_octobre,
            perf_novembre = EXCLUDED.perf_novembre,
            perf_decembre = EXCLUDED.perf_decembre,
            updated_at = now();
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour synchroniser tous les sites
CREATE OR REPLACE FUNCTION sync_all_sites_indicator_values_global()
RETURNS void AS $$
DECLARE
    site_record record;
BEGIN
    FOR site_record IN SELECT name FROM sites LOOP
        PERFORM sync_site_indicator_values_global(site_record.name);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour synchroniser une organisation
CREATE OR REPLACE FUNCTION sync_organization_indicator_values_global(org_name text)
RETURNS void AS $$
DECLARE
    site_record record;
BEGIN
    FOR site_record IN 
        SELECT name FROM sites WHERE organization_name = org_name 
    LOOP
        PERFORM sync_site_indicator_values_global(site_record.name);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Fonction de mise à jour de updated_at
CREATE OR REPLACE FUNCTION update_site_indicator_values_global_updated_at()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour updated_at
CREATE TRIGGER update_site_indicator_values_global_updated_at
    BEFORE UPDATE ON site_indicator_values_global
    FOR EACH ROW
    EXECUTE FUNCTION update_site_indicator_values_global_updated_at();

-- Trigger pour synchroniser quand site_processes change
CREATE OR REPLACE FUNCTION trigger_sync_site_indicator_values_global()
RETURNS trigger AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        PERFORM sync_site_indicator_values_global(NEW.site_name);
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM sync_site_indicator_values_global(OLD.site_name);
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_site_processes_sync_indicator_values_global
    AFTER INSERT OR UPDATE OR DELETE ON site_processes
    FOR EACH ROW
    EXECUTE FUNCTION trigger_sync_site_indicator_values_global();

-- Trigger pour synchroniser quand organization_selections change
CREATE OR REPLACE FUNCTION trigger_sync_org_indicator_values_global()
RETURNS trigger AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        PERFORM sync_organization_indicator_values_global(NEW.organization_name);
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM sync_organization_indicator_values_global(OLD.organization_name);
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_organization_selections_sync_indicator_values_global
    AFTER INSERT OR UPDATE OR DELETE ON organization_selections
    FOR EACH ROW
    EXECUTE FUNCTION trigger_sync_org_indicator_values_global();

-- Trigger pour synchroniser quand indicators change
CREATE OR REPLACE FUNCTION trigger_sync_indicators_global()
RETURNS trigger AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        -- Synchroniser tous les sites qui utilisent cet indicateur
        PERFORM sync_all_sites_indicator_values_global();
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Supprimer les enregistrements pour cet indicateur
        DELETE FROM site_indicator_values_global WHERE code = OLD.code;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_indicators_sync_global
    AFTER INSERT OR UPDATE OR DELETE ON indicators
    FOR EACH ROW
    EXECUTE FUNCTION trigger_sync_indicators_global();

-- Trigger pour synchroniser quand indicator_values change
CREATE OR REPLACE FUNCTION trigger_sync_indicator_values_global()
RETURNS trigger AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        IF NEW.site_name IS NOT NULL THEN
            PERFORM sync_site_indicator_values_global(NEW.site_name);
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.site_name IS NOT NULL THEN
            PERFORM sync_site_indicator_values_global(OLD.site_name);
        END IF;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_indicator_values_sync_global
    AFTER INSERT OR UPDATE OR DELETE ON indicator_values
    FOR EACH ROW
    EXECUTE FUNCTION trigger_sync_indicator_values_global();

-- Fonction de vérification
CREATE OR REPLACE FUNCTION check_site_indicator_values_global_sync()
RETURNS TABLE (
    site_name text,
    organization_name text,
    selected_indicators_count bigint,
    generated_indicators_count bigint,
    sync_status text
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.name as site_name,
        s.organization_name,
        COALESCE(array_length(os.indicator_names, 1), 0)::bigint as selected_indicators_count,
        COUNT(siv.id)::bigint as generated_indicators_count,
        CASE 
            WHEN COALESCE(array_length(os.indicator_names, 1), 0) = COUNT(siv.id) THEN 'Synchronisé'
            ELSE 'Désynchronisé'
        END as sync_status
    FROM sites s
    LEFT JOIN organization_selections os ON s.organization_name = os.organization_name
    LEFT JOIN site_indicator_values_global siv ON s.name = siv.site_name AND siv.year = 2025
    GROUP BY s.name, s.organization_name, os.indicator_names
    ORDER BY s.name;
END;
$$ LANGUAGE plpgsql;

-- Synchroniser tous les sites existants
SELECT sync_all_sites_indicator_values_global();