/*
  # Actualisation automatique de site_global_indicator_values_simple

  1. Nouvelles fonctions
    - `sync_site_global_indicators()` - Synchronise les données d'indicateurs globaux pour un site
    - `handle_indicator_value_change()` - Gère les changements dans indicator_values

  2. Triggers
    - Trigger sur indicator_values pour synchroniser automatiquement les données
    - Mise à jour des performances mensuelles et annuelles

  3. Mise à jour des données existantes
    - Actualise toutes les données existantes dans site_global_indicator_values_simple
*/

-- Fonction pour synchroniser les indicateurs globaux d'un site
CREATE OR REPLACE FUNCTION sync_site_global_indicators(
  p_site_name TEXT,
  p_year INTEGER,
  p_indicator_code TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  indicator_rec RECORD;
  site_rec RECORD;
  existing_rec RECORD;
  new_data RECORD;
BEGIN
  -- Récupérer les informations du site
  SELECT s.name, s.organization_name, s.filiere_name, s.filiale_name
  INTO site_rec
  FROM sites s
  WHERE s.name = p_site_name;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Boucle sur tous les indicateurs ou un indicateur spécifique
  FOR indicator_rec IN
    SELECT DISTINCT 
      iv.indicator_code,
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
      p.name as processus,
      iv.processus_code
    FROM indicator_values iv
    JOIN indicators i ON i.code = iv.indicator_code
    LEFT JOIN processus p ON p.code = iv.processus_code
    WHERE iv.site_name = p_site_name
      AND EXTRACT(YEAR FROM iv.created_at) = p_year
      AND (p_indicator_code IS NULL OR iv.indicator_code = p_indicator_code)
  LOOP
    -- Vérifier si l'enregistrement existe déjà
    SELECT * INTO existing_rec
    FROM site_global_indicator_values_simple
    WHERE site_name = p_site_name
      AND year = p_year
      AND code = indicator_rec.indicator_code;

    -- Calculer les valeurs agrégées pour cet indicateur
    SELECT 
      AVG(CASE WHEN cp.period_type = 'year' THEN iv.value END) as value,
      AVG(CASE WHEN cp.period_type = 'year' AND cp.year = p_year - 1 THEN iv.value END) as valeur_precedente,
      MAX(CASE WHEN cp.period_type = 'month' AND cp.period_number = 1 THEN iv.value END) as janvier,
      MAX(CASE WHEN cp.period_type = 'month' AND cp.period_number = 2 THEN iv.value END) as fevrier,
      MAX(CASE WHEN cp.period_type = 'month' AND cp.period_number = 3 THEN iv.value END) as mars,
      MAX(CASE WHEN cp.period_type = 'month' AND cp.period_number = 4 THEN iv.value END) as avril,
      MAX(CASE WHEN cp.period_type = 'month' AND cp.period_number = 5 THEN iv.value END) as mai,
      MAX(CASE WHEN cp.period_type = 'month' AND cp.period_number = 6 THEN iv.value END) as juin,
      MAX(CASE WHEN cp.period_type = 'month' AND cp.period_number = 7 THEN iv.value END) as juillet,
      MAX(CASE WHEN cp.period_type = 'month' AND cp.period_number = 8 THEN iv.value END) as aout,
      MAX(CASE WHEN cp.period_type = 'month' AND cp.period_number = 9 THEN iv.value END) as septembre,
      MAX(CASE WHEN cp.period_type = 'month' AND cp.period_number = 10 THEN iv.value END) as octobre,
      MAX(CASE WHEN cp.period_type = 'month' AND cp.period_number = 11 THEN iv.value END) as novembre,
      MAX(CASE WHEN cp.period_type = 'month' AND cp.period_number = 12 THEN iv.value END) as decembre
    INTO new_data
    FROM indicator_values iv
    JOIN collection_periods cp ON cp.id = iv.period_id
    WHERE iv.site_name = p_site_name
      AND iv.indicator_code = indicator_rec.indicator_code
      AND (cp.year = p_year OR cp.year = p_year - 1);

    IF existing_rec.id IS NOT NULL THEN
      -- Mettre à jour l'enregistrement existant
      UPDATE site_global_indicator_values_simple
      SET 
        axe_energetique = indicator_rec.axe_energetique,
        enjeux = indicator_rec.enjeux,
        normes = indicator_rec.normes,
        critere = indicator_rec.critere,
        indicateur = indicator_rec.indicateur,
        definition = indicator_rec.definition,
        processus = indicator_rec.processus,
        processus_code = indicator_rec.processus_code,
        frequence = indicator_rec.frequence,
        unite = indicator_rec.unite,
        type = indicator_rec.type,
        formule = indicator_rec.formule,
        value = new_data.value,
        valeur_precedente = new_data.valeur_precedente,
        janvier = new_data.janvier,
        fevrier = new_data.fevrier,
        mars = new_data.mars,
        avril = new_data.avril,
        mai = new_data.mai,
        juin = new_data.juin,
        juillet = new_data.juillet,
        aout = new_data.aout,
        septembre = new_data.septembre,
        octobre = new_data.octobre,
        novembre = new_data.novembre,
        decembre = new_data.decembre,
        organization_name = site_rec.organization_name,
        filiere_name = site_rec.filiere_name,
        filiale_name = site_rec.filiale_name,
        updated_at = NOW()
      WHERE id = existing_rec.id;
    ELSE
      -- Insérer un nouvel enregistrement
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
        filiale_name
      ) VALUES (
        p_site_name,
        p_year,
        indicator_rec.indicator_code,
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
        new_data.value,
        new_data.valeur_precedente,
        new_data.janvier,
        new_data.fevrier,
        new_data.mars,
        new_data.avril,
        new_data.mai,
        new_data.juin,
        new_data.juillet,
        new_data.aout,
        new_data.septembre,
        new_data.octobre,
        new_data.novembre,
        new_data.decembre,
        site_rec.organization_name,
        site_rec.filiere_name,
        site_rec.filiale_name
      );
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Fonction trigger pour gérer les changements dans indicator_values
CREATE OR REPLACE FUNCTION handle_indicator_value_change()
RETURNS TRIGGER AS $$
DECLARE
  target_year INTEGER;
BEGIN
  -- Déterminer l'année à partir de la période de collecte
  IF TG_OP = 'DELETE' THEN
    SELECT cp.year INTO target_year
    FROM collection_periods cp
    WHERE cp.id = OLD.period_id;
    
    IF OLD.site_name IS NOT NULL THEN
      PERFORM sync_site_global_indicators(OLD.site_name, target_year, OLD.indicator_code);
    END IF;
    
    RETURN OLD;
  ELSE
    SELECT cp.year INTO target_year
    FROM collection_periods cp
    WHERE cp.id = NEW.period_id;
    
    IF NEW.site_name IS NOT NULL THEN
      PERFORM sync_site_global_indicators(NEW.site_name, target_year, NEW.indicator_code);
    END IF;
    
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Supprimer le trigger existant s'il existe
DROP TRIGGER IF EXISTS trigger_sync_site_global_indicators ON indicator_values;

-- Créer le nouveau trigger
CREATE TRIGGER trigger_sync_site_global_indicators
  AFTER INSERT OR UPDATE OR DELETE ON indicator_values
  FOR EACH ROW
  EXECUTE FUNCTION handle_indicator_value_change();

-- Fonction pour actualiser toutes les données existantes
CREATE OR REPLACE FUNCTION refresh_all_site_global_indicators()
RETURNS VOID AS $$
DECLARE
  site_year_rec RECORD;
BEGIN
  -- Vider la table pour la reconstruire complètement
  TRUNCATE TABLE site_global_indicator_values_simple;
  
  -- Synchroniser pour chaque combinaison site/année
  FOR site_year_rec IN
    SELECT DISTINCT 
      iv.site_name,
      cp.year
    FROM indicator_values iv
    JOIN collection_periods cp ON cp.id = iv.period_id
    WHERE iv.site_name IS NOT NULL
    ORDER BY iv.site_name, cp.year
  LOOP
    PERFORM sync_site_global_indicators(site_year_rec.site_name, site_year_rec.year);
  END LOOP;
  
  RAISE NOTICE 'Actualisation terminée pour tous les sites et années';
END;
$$ LANGUAGE plpgsql;

-- Actualiser toutes les données existantes
SELECT refresh_all_site_global_indicators();

-- Fonction pour synchroniser un site spécifique (utile pour les mises à jour manuelles)
CREATE OR REPLACE FUNCTION refresh_site_indicators(p_site_name TEXT, p_year INTEGER DEFAULT NULL)
RETURNS VOID AS $$
DECLARE
  target_year INTEGER;
BEGIN
  IF p_year IS NULL THEN
    -- Si aucune année spécifiée, synchroniser toutes les années pour ce site
    FOR target_year IN
      SELECT DISTINCT cp.year
      FROM indicator_values iv
      JOIN collection_periods cp ON cp.id = iv.period_id
      WHERE iv.site_name = p_site_name
      ORDER BY cp.year
    LOOP
      PERFORM sync_site_global_indicators(p_site_name, target_year);
    END LOOP;
  ELSE
    -- Synchroniser pour l'année spécifiée
    PERFORM sync_site_global_indicators(p_site_name, p_year);
  END IF;
  
  RAISE NOTICE 'Synchronisation terminée pour le site % (année: %)', p_site_name, COALESCE(p_year::TEXT, 'toutes');
END;
$$ LANGUAGE plpgsql;

-- Créer un index pour améliorer les performances des requêtes de synchronisation
CREATE INDEX IF NOT EXISTS idx_indicator_values_site_year 
ON indicator_values (site_name, indicator_code) 
WHERE site_name IS NOT NULL;

-- Créer un index sur collection_periods pour les jointures
CREATE INDEX IF NOT EXISTS idx_collection_periods_year_type 
ON collection_periods (year, period_type, period_number);

-- Commentaires pour la documentation
COMMENT ON FUNCTION sync_site_global_indicators(TEXT, INTEGER, TEXT) IS 
'Synchronise les données d''indicateurs globaux pour un site donné et une année donnée';

COMMENT ON FUNCTION handle_indicator_value_change() IS 
'Fonction trigger qui synchronise automatiquement site_global_indicator_values_simple lors des changements dans indicator_values';

COMMENT ON FUNCTION refresh_all_site_global_indicators() IS 
'Actualise toutes les données dans site_global_indicator_values_simple en reconstruisant complètement la table';

COMMENT ON FUNCTION refresh_site_indicators(TEXT, INTEGER) IS 
'Synchronise les indicateurs pour un site spécifique, optionnellement pour une année donnée';