/*
  # Automatisation du peuplement de site_global_indicator_values_simple

  1. Fonctions
    - Fonction pour peupler automatiquement la table quand un indicateur est lié à un processus de site
    - Fonction pour synchroniser les valeurs depuis indicator_measurements

  2. Triggers
    - Trigger sur site_processes pour créer automatiquement les lignes
    - Trigger sur indicators pour gérer les nouveaux indicateurs
    - Trigger sur indicator_measurements pour synchroniser les valeurs

  3. Peuplement initial
    - Peuple la table avec tous les indicateurs existants liés aux sites
*/

-- Fonction pour créer automatiquement les lignes dans site_global_indicator_values_simple
CREATE OR REPLACE FUNCTION auto_create_site_global_indicators()
RETURNS TRIGGER AS $$
BEGIN
  -- Insérer une ligne pour chaque indicateur lié au processus du site
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
    filiale_name
  )
  SELECT DISTINCT
    NEW.site_name,
    EXTRACT(YEAR FROM CURRENT_DATE)::integer as year,
    i.code,
    i.axe_energetique,
    i.enjeux,
    i.normes,
    i.critere,
    i.name as indicateur,
    i.description as definition,
    p.name as processus,
    i.processus_code,
    i.frequence,
    i.unit as unite,
    i.type,
    i.formule,
    s.organization_name,
    s.filiere_name,
    s.filiale_name
  FROM indicators i
  JOIN processus p ON p.code = i.processus_code
  JOIN sites s ON s.name = NEW.site_name
  WHERE i.processus_code = NEW.processus_code
  ON CONFLICT (site_name, code, year) DO UPDATE SET
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

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour synchroniser les valeurs depuis indicator_measurements
CREATE OR REPLACE FUNCTION sync_indicator_values_to_site_global()
RETURNS TRIGGER AS $$
DECLARE
  target_year integer;
BEGIN
  -- Déterminer l'année cible
  target_year := COALESCE(NEW.year, OLD.year);
  
  IF TG_OP = 'DELETE' THEN
    -- Supprimer les valeurs pour cet indicateur/site/année
    UPDATE site_global_indicator_values_simple 
    SET 
      value = NULL,
      valeur_precedente = NULL,
      janvier = NULL, fevrier = NULL, mars = NULL, avril = NULL,
      mai = NULL, juin = NULL, juillet = NULL, aout = NULL,
      septembre = NULL, octobre = NULL, novembre = NULL, decembre = NULL,
      updated_at = NOW()
    WHERE site_name = OLD.site_name 
      AND code = OLD.indicator_code 
      AND year = target_year;
    
    RETURN OLD;
  END IF;

  -- Synchroniser les valeurs (INSERT ou UPDATE)
  INSERT INTO site_global_indicator_values_simple (
    site_name,
    year,
    code,
    value,
    valeur_precedente,
    janvier, fevrier, mars, avril, mai, juin,
    juillet, aout, septembre, octobre, novembre, decembre,
    organization_name,
    filiere_name,
    filiale_name,
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
    formule
  )
  SELECT 
    NEW.site_name,
    NEW.year,
    NEW.indicator_code,
    NEW.valeur_annee_actuelle,
    NEW.valeur_annee_precedente,
    NEW.janvier, NEW.fevrier, NEW.mars, NEW.avril, NEW.mai, NEW.juin,
    NEW.juillet, NEW.aout, NEW.septembre, NEW.octobre, NEW.novembre, NEW.decembre,
    s.organization_name,
    s.filiere_name,
    s.filiale_name,
    i.axe_energetique,
    i.enjeux,
    i.normes,
    i.critere,
    i.name as indicateur,
    i.description as definition,
    p.name as processus,
    i.processus_code,
    i.frequence,
    i.unit as unite,
    i.type,
    i.formule
  FROM sites s
  JOIN indicators i ON i.code = NEW.indicator_code
  LEFT JOIN processus p ON p.code = i.processus_code
  WHERE s.name = NEW.site_name
  ON CONFLICT (site_name, code, year) DO UPDATE SET
    value = EXCLUDED.value,
    valeur_precedente = EXCLUDED.valeur_precedente,
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
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour peupler initialement la table
CREATE OR REPLACE FUNCTION populate_all_site_global_indicators()
RETURNS void AS $$
BEGIN
  -- Insérer toutes les combinaisons site/indicateur basées sur les processus de sites
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
    filiale_name
  )
  SELECT DISTINCT
    sp.site_name,
    EXTRACT(YEAR FROM CURRENT_DATE)::integer as year,
    i.code,
    i.axe_energetique,
    i.enjeux,
    i.normes,
    i.critere,
    i.name as indicateur,
    i.description as definition,
    p.name as processus,
    i.processus_code,
    i.frequence,
    i.unit as unite,
    i.type,
    i.formule,
    s.organization_name,
    s.filiere_name,
    s.filiale_name
  FROM site_processes sp
  JOIN indicators i ON i.processus_code = sp.processus_code
  JOIN processus p ON p.code = sp.processus_code
  JOIN sites s ON s.name = sp.site_name
  WHERE sp.is_active = true
  ON CONFLICT (site_name, code, year) DO UPDATE SET
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

  -- Synchroniser les valeurs depuis indicator_measurements
  UPDATE site_global_indicator_values_simple sgiv
  SET 
    value = im.valeur_annee_actuelle,
    valeur_precedente = im.valeur_annee_precedente,
    janvier = im.janvier,
    fevrier = im.fevrier,
    mars = im.mars,
    avril = im.avril,
    mai = im.mai,
    juin = im.juin,
    juillet = im.juillet,
    aout = im.aout,
    septembre = im.septembre,
    octobre = im.octobre,
    novembre = im.novembre,
    decembre = im.decembre,
    updated_at = NOW()
  FROM indicator_measurements im
  WHERE sgiv.site_name = im.site_name
    AND sgiv.code = im.indicator_code
    AND sgiv.year = im.year;

  RAISE NOTICE 'Table site_global_indicator_values_simple peuplée avec succès';
END;
$$ LANGUAGE plpgsql;

-- Supprimer les anciens triggers s'ils existent
DROP TRIGGER IF EXISTS trigger_auto_create_site_global_indicators ON site_processes;
DROP TRIGGER IF EXISTS trigger_sync_indicator_values ON indicator_measurements;

-- Créer le trigger pour auto-créer les lignes quand un processus est ajouté à un site
CREATE TRIGGER trigger_auto_create_site_global_indicators
  AFTER INSERT OR UPDATE ON site_processes
  FOR EACH ROW
  WHEN (NEW.is_active = true)
  EXECUTE FUNCTION auto_create_site_global_indicators();

-- Créer le trigger pour synchroniser les valeurs depuis indicator_measurements
CREATE TRIGGER trigger_sync_indicator_values
  AFTER INSERT OR UPDATE OR DELETE ON indicator_measurements
  FOR EACH ROW
  EXECUTE FUNCTION sync_indicator_values_to_site_global();

-- Peupler la table avec les données existantes
SELECT populate_all_site_global_indicators();

-- Mettre à jour les performances mensuelles
UPDATE site_global_indicator_values_simple
SET 
  perf_janvier = CASE WHEN cible > 0 AND janvier IS NOT NULL THEN LEAST(100, (janvier / cible) * 100) ELSE NULL END,
  perf_fevrier = CASE WHEN cible > 0 AND fevrier IS NOT NULL THEN LEAST(100, (fevrier / cible) * 100) ELSE NULL END,
  perf_mars = CASE WHEN cible > 0 AND mars IS NOT NULL THEN LEAST(100, (mars / cible) * 100) ELSE NULL END,
  perf_avril = CASE WHEN cible > 0 AND avril IS NOT NULL THEN LEAST(100, (avril / cible) * 100) ELSE NULL END,
  perf_mai = CASE WHEN cible > 0 AND mai IS NOT NULL THEN LEAST(100, (mai / cible) * 100) ELSE NULL END,
  perf_juin = CASE WHEN cible > 0 AND juin IS NOT NULL THEN LEAST(100, (juin / cible) * 100) ELSE NULL END,
  perf_juillet = CASE WHEN cible > 0 AND juillet IS NOT NULL THEN LEAST(100, (juillet / cible) * 100) ELSE NULL END,
  perf_aout = CASE WHEN cible > 0 AND aout IS NOT NULL THEN LEAST(100, (aout / cible) * 100) ELSE NULL END,
  perf_septembre = CASE WHEN cible > 0 AND septembre IS NOT NULL THEN LEAST(100, (septembre / cible) * 100) ELSE NULL END,
  perf_octobre = CASE WHEN cible > 0 AND octobre IS NOT NULL THEN LEAST(100, (octobre / cible) * 100) ELSE NULL END,
  perf_novembre = CASE WHEN cible > 0 AND novembre IS NOT NULL THEN LEAST(100, (novembre / cible) * 100) ELSE NULL END,
  perf_decembre = CASE WHEN cible > 0 AND decembre IS NOT NULL THEN LEAST(100, (decembre / cible) * 100) ELSE NULL END,
  variations_pourcent = CASE 
    WHEN valeur_precedente > 0 AND value IS NOT NULL 
    THEN ((value - valeur_precedente) / valeur_precedente) * 100 
    ELSE NULL 
  END,
  performances_pourcent = CASE 
    WHEN cible > 0 AND value IS NOT NULL 
    THEN LEAST(100, (value / cible) * 100) 
    ELSE NULL 
  END
WHERE cible IS NOT NULL OR value IS NOT NULL OR valeur_precedente IS NOT NULL;