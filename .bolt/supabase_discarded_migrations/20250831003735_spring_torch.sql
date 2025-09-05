/*
  # Correction de la synchronisation entre indicator_values et site_global_indicator_values_simple

  1. Fonctions
    - Fonction de synchronisation des données d'indicateurs
    - Fonction de mise à jour des métadonnées
    - Fonction de calcul des métriques

  2. Triggers
    - Trigger sur indicator_values pour synchroniser automatiquement
    - Trigger sur site_global_indicator_values_simple pour les calculs

  3. Corrections
    - Suppression des anciens triggers conflictuels
    - Nouvelle logique de synchronisation basée sur indicator_values
    - Calculs automatiques des performances
*/

-- Supprimer les anciens triggers problématiques
DROP TRIGGER IF EXISTS trigger_simple_calculate_metrics ON site_global_indicator_values_simple;
DROP TRIGGER IF EXISTS trigger_simple_update_metadata ON site_global_indicator_values_simple;
DROP TRIGGER IF EXISTS trigger_sync_site_performance_criteres ON site_global_indicator_values_simple;
DROP TRIGGER IF EXISTS trigger_update_consolidated_indicators ON site_global_indicator_values_simple;
DROP TRIGGER IF EXISTS trigger_update_monthly_performances ON site_global_indicator_values_simple;
DROP TRIGGER IF EXISTS trigger_update_site_performances_on_indicator_change ON site_global_indicator_values_simple;

-- Supprimer les anciennes fonctions
DROP FUNCTION IF EXISTS simple_calculate_metrics();
DROP FUNCTION IF EXISTS simple_update_indicator_metadata();
DROP FUNCTION IF EXISTS sync_site_performance_criteres();
DROP FUNCTION IF EXISTS update_consolidated_indicators();
DROP FUNCTION IF EXISTS update_monthly_performances_trigger();
DROP FUNCTION IF EXISTS update_site_performances_on_indicator_change();

-- Créer la fonction de synchronisation principale
CREATE OR REPLACE FUNCTION sync_indicator_to_simple()
RETURNS TRIGGER AS $$
DECLARE
    indicator_record RECORD;
    collection_period_record RECORD;
    monthly_columns TEXT[] := ARRAY['janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin', 'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre'];
    perf_columns TEXT[] := ARRAY['perf_janvier', 'perf_fevrier', 'perf_mars', 'perf_avril', 'perf_mai', 'perf_juin', 'perf_juillet', 'perf_aout', 'perf_septembre', 'perf_octobre', 'perf_novembre', 'perf_decembre'];
    monthly_values NUMERIC[] := ARRAY[NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL];
    perf_values NUMERIC[] := ARRAY[NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL];
    annual_value NUMERIC := 0;
    annual_count INTEGER := 0;
    i INTEGER;
BEGIN
    -- Récupérer les informations de l'indicateur
    SELECT * INTO indicator_record
    FROM indicators 
    WHERE code = COALESCE(NEW.indicator_code, OLD.indicator_code);
    
    IF NOT FOUND THEN
        RETURN COALESCE(NEW, OLD);
    END IF;
    
    -- Récupérer les informations de la période de collecte
    SELECT * INTO collection_period_record
    FROM collection_periods 
    WHERE id = COALESCE(NEW.period_id, OLD.period_id);
    
    IF NOT FOUND THEN
        RETURN COALESCE(NEW, OLD);
    END IF;
    
    -- Récupérer toutes les valeurs mensuelles pour cette année et cet indicateur
    FOR i IN 1..12 LOOP
        DECLARE
            month_value NUMERIC;
        BEGIN
            SELECT value INTO month_value
            FROM indicator_values iv
            JOIN collection_periods cp ON iv.period_id = cp.id
            WHERE iv.indicator_code = indicator_record.code
              AND iv.site_name = COALESCE(NEW.site_name, OLD.site_name)
              AND cp.year = collection_period_record.year
              AND cp.period_number = i
              AND iv.status = 'validated'
            LIMIT 1;
            
            monthly_values[i] := month_value;
            
            -- Calculer la performance mensuelle (valeur / cible * 100)
            IF month_value IS NOT NULL THEN
                perf_values[i] := (month_value / GREATEST(100, month_value)) * 100;
                annual_value := annual_value + month_value;
                annual_count := annual_count + 1;
            END IF;
        END;
    END LOOP;
    
    -- Calculer la valeur annuelle moyenne
    IF annual_count > 0 THEN
        annual_value := annual_value / annual_count;
    ELSE
        annual_value := NULL;
    END IF;
    
    -- Insérer ou mettre à jour dans site_global_indicator_values_simple
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
        perf_janvier, perf_fevrier, perf_mars, perf_avril, perf_mai, perf_juin,
        perf_juillet, perf_aout, perf_septembre, perf_octobre, perf_novembre, perf_decembre,
        variations_pourcent,
        performances_pourcent,
        organization_name,
        filiere_name,
        filiale_name,
        type_de_consolidation
    ) VALUES (
        COALESCE(NEW.site_name, OLD.site_name),
        collection_period_record.year,
        indicator_record.code,
        indicator_record.axe_energetique,
        indicator_record.enjeux,
        indicator_record.normes,
        indicator_record.critere,
        indicator_record.name,
        indicator_record.description,
        indicator_record.processus_code,
        indicator_record.processus_code,
        indicator_record.frequence,
        indicator_record.unit,
        indicator_record.type,
        indicator_record.formule,
        annual_value,
        NULL, -- valeur_precedente sera calculée séparément
        100, -- cible par défaut
        NULL, -- variation sera calculée
        monthly_values[1], monthly_values[2], monthly_values[3], monthly_values[4],
        monthly_values[5], monthly_values[6], monthly_values[7], monthly_values[8],
        monthly_values[9], monthly_values[10], monthly_values[11], monthly_values[12],
        perf_values[1], perf_values[2], perf_values[3], perf_values[4],
        perf_values[5], perf_values[6], perf_values[7], perf_values[8],
        perf_values[9], perf_values[10], perf_values[11], perf_values[12],
        CASE WHEN annual_value IS NOT NULL THEN annual_value - 100 ELSE NULL END,
        CASE WHEN annual_value IS NOT NULL THEN (annual_value / 100) * 100 ELSE NULL END,
        COALESCE(NEW.organization_name, OLD.organization_name),
        COALESCE(NEW.filiere_name, OLD.filiere_name),
        COALESCE(NEW.filiale_name, OLD.filiale_name),
        'site'
    )
    ON CONFLICT (site_name, code, year) 
    DO UPDATE SET
        value = EXCLUDED.value,
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
        variations_pourcent = EXCLUDED.variations_pourcent,
        performances_pourcent = EXCLUDED.performances_pourcent,
        updated_at = now();
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Créer la fonction de calcul des métriques simplifiée
CREATE OR REPLACE FUNCTION calculate_simple_metrics()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculer les variations et performances
    NEW.variations_pourcent := CASE 
        WHEN NEW.value IS NOT NULL AND NEW.cible IS NOT NULL 
        THEN NEW.value - NEW.cible 
        ELSE NULL 
    END;
    
    NEW.performances_pourcent := CASE 
        WHEN NEW.value IS NOT NULL AND NEW.cible IS NOT NULL AND NEW.cible > 0 
        THEN (NEW.value / NEW.cible) * 100 
        ELSE NULL 
    END;
    
    -- Calculer les performances mensuelles
    IF NEW.cible IS NOT NULL AND NEW.cible > 0 THEN
        NEW.perf_janvier := CASE WHEN NEW.janvier IS NOT NULL THEN (NEW.janvier / NEW.cible) * 100 ELSE NULL END;
        NEW.perf_fevrier := CASE WHEN NEW.fevrier IS NOT NULL THEN (NEW.fevrier / NEW.cible) * 100 ELSE NULL END;
        NEW.perf_mars := CASE WHEN NEW.mars IS NOT NULL THEN (NEW.mars / NEW.cible) * 100 ELSE NULL END;
        NEW.perf_avril := CASE WHEN NEW.avril IS NOT NULL THEN (NEW.avril / NEW.cible) * 100 ELSE NULL END;
        NEW.perf_mai := CASE WHEN NEW.mai IS NOT NULL THEN (NEW.mai / NEW.cible) * 100 ELSE NULL END;
        NEW.perf_juin := CASE WHEN NEW.juin IS NOT NULL THEN (NEW.juin / NEW.cible) * 100 ELSE NULL END;
        NEW.perf_juillet := CASE WHEN NEW.juillet IS NOT NULL THEN (NEW.juillet / NEW.cible) * 100 ELSE NULL END;
        NEW.perf_aout := CASE WHEN NEW.aout IS NOT NULL THEN (NEW.aout / NEW.cible) * 100 ELSE NULL END;
        NEW.perf_septembre := CASE WHEN NEW.septembre IS NOT NULL THEN (NEW.septembre / NEW.cible) * 100 ELSE NULL END;
        NEW.perf_octobre := CASE WHEN NEW.octobre IS NOT NULL THEN (NEW.octobre / NEW.cible) * 100 ELSE NULL END;
        NEW.perf_novembre := CASE WHEN NEW.novembre IS NOT NULL THEN (NEW.novembre / NEW.cible) * 100 ELSE NULL END;
        NEW.perf_decembre := CASE WHEN NEW.decembre IS NOT NULL THEN (NEW.decembre / NEW.cible) * 100 ELSE NULL END;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer la fonction de mise à jour des métadonnées
CREATE OR REPLACE FUNCTION update_indicator_metadata_simple()
RETURNS TRIGGER AS $$
DECLARE
    indicator_record RECORD;
BEGIN
    -- Récupérer les métadonnées de l'indicateur
    SELECT * INTO indicator_record
    FROM indicators 
    WHERE code = NEW.code;
    
    IF FOUND THEN
        NEW.axe_energetique := indicator_record.axe_energetique;
        NEW.enjeux := indicator_record.enjeux;
        NEW.normes := indicator_record.normes;
        NEW.critere := indicator_record.critere;
        NEW.indicateur := indicator_record.name;
        NEW.definition := indicator_record.description;
        NEW.processus := indicator_record.processus_code;
        NEW.processus_code := indicator_record.processus_code;
        NEW.frequence := indicator_record.frequence;
        NEW.unite := indicator_record.unit;
        NEW.type := indicator_record.type;
        NEW.formule := indicator_record.formule;
        NEW.type_de_consolidation := indicator_record.type_de_consolidation;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer les nouveaux triggers
CREATE TRIGGER trigger_calculate_simple_metrics
    BEFORE INSERT OR UPDATE ON site_global_indicator_values_simple
    FOR EACH ROW EXECUTE FUNCTION calculate_simple_metrics();

CREATE TRIGGER trigger_update_metadata_simple
    BEFORE INSERT OR UPDATE ON site_global_indicator_values_simple
    FOR EACH ROW EXECUTE FUNCTION update_indicator_metadata_simple();

-- Créer le trigger principal sur indicator_values pour synchroniser
CREATE OR REPLACE TRIGGER trigger_sync_to_simple_table
    AFTER INSERT OR UPDATE OR DELETE ON indicator_values
    FOR EACH ROW EXECUTE FUNCTION sync_indicator_to_simple();

-- Fonction pour synchroniser les données existantes
CREATE OR REPLACE FUNCTION sync_existing_indicator_data()
RETURNS void AS $$
DECLARE
    indicator_value_record RECORD;
    site_record RECORD;
    year_record RECORD;
BEGIN
    -- Vider la table simple pour recommencer
    TRUNCATE site_global_indicator_values_simple;
    
    -- Pour chaque site et année, synchroniser les données
    FOR site_record IN 
        SELECT DISTINCT site_name, organization_name, filiere_name, filiale_name
        FROM indicator_values 
        WHERE site_name IS NOT NULL
    LOOP
        FOR year_record IN
            SELECT DISTINCT cp.year
            FROM indicator_values iv
            JOIN collection_periods cp ON iv.period_id = cp.id
            WHERE iv.site_name = site_record.site_name
        LOOP
            -- Pour chaque indicateur de ce site et cette année
            FOR indicator_value_record IN
                SELECT DISTINCT iv.indicator_code
                FROM indicator_values iv
                JOIN collection_periods cp ON iv.period_id = cp.id
                WHERE iv.site_name = site_record.site_name
                  AND cp.year = year_record.year
                  AND iv.status = 'validated'
            LOOP
                -- Déclencher la synchronisation en insérant un enregistrement temporaire
                INSERT INTO indicator_values (
                    indicator_code,
                    site_name,
                    organization_name,
                    filiere_name,
                    filiale_name,
                    period_id,
                    value,
                    status
                ) 
                SELECT 
                    indicator_value_record.indicator_code,
                    site_record.site_name,
                    site_record.organization_name,
                    site_record.filiere_name,
                    site_record.filiale_name,
                    cp.id,
                    0, -- valeur temporaire
                    'draft'
                FROM collection_periods cp
                WHERE cp.year = year_record.year
                  AND cp.period_number IS NULL
                LIMIT 1
                ON CONFLICT DO NOTHING;
                
                -- Supprimer l'enregistrement temporaire
                DELETE FROM indicator_values 
                WHERE indicator_code = indicator_value_record.indicator_code
                  AND site_name = site_record.site_name
                  AND value = 0
                  AND status = 'draft';
            END LOOP;
        END LOOP;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Exécuter la synchronisation des données existantes
SELECT sync_existing_indicator_data();

-- Supprimer la fonction temporaire
DROP FUNCTION sync_existing_indicator_data();

-- Mettre à jour les politiques RLS pour permettre les opérations
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON site_global_indicator_values_simple;

CREATE POLICY "Enable all operations for authenticated users"
    ON site_global_indicator_values_simple
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Créer un index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_site_global_indicator_values_simple_sync 
    ON site_global_indicator_values_simple (site_name, code, year, updated_at);

-- Fonction utilitaire pour forcer la synchronisation d'un indicateur spécifique
CREATE OR REPLACE FUNCTION force_sync_indicator(
    p_site_name TEXT,
    p_indicator_code TEXT,
    p_year INTEGER
)
RETURNS void AS $$
BEGIN
    -- Supprimer l'enregistrement existant s'il y en a un
    DELETE FROM site_global_indicator_values_simple
    WHERE site_name = p_site_name
      AND code = p_indicator_code
      AND year = p_year;
    
    -- Déclencher la re-synchronisation
    PERFORM sync_indicator_to_simple()
    FROM indicator_values iv
    JOIN collection_periods cp ON iv.period_id = cp.id
    WHERE iv.site_name = p_site_name
      AND iv.indicator_code = p_indicator_code
      AND cp.year = p_year
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;