/*
  # Mise à jour de la table site_global_indicator_values_simple

  1. Modifications de structure
    - Ajout de la colonne `indicator` comme clé primaire
    - Suppression de l'ancienne clé primaire composite
    - Mise à jour des contraintes

  2. Fonction de peuplement automatique
    - Création d'une ligne pour chaque indicateur lié à un processus de site
    - Synchronisation avec les données existantes

  3. Triggers automatiques
    - Maintien automatique des données lors des changements
*/

-- Supprimer les contraintes existantes
ALTER TABLE site_global_indicator_values_simple 
DROP CONSTRAINT IF EXISTS site_global_indicator_values_simple_pkey;

ALTER TABLE site_global_indicator_values_simple 
DROP CONSTRAINT IF EXISTS site_global_indicator_values_simple_unique_idx;

-- Ajouter la colonne indicator si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'site_global_indicator_values_simple' 
    AND column_name = 'indicator'
  ) THEN
    ALTER TABLE site_global_indicator_values_simple 
    ADD COLUMN indicator text;
  END IF;
END $$;

-- Vider la table pour la repeupler avec la nouvelle structure
TRUNCATE TABLE site_global_indicator_values_simple;

-- Créer la nouvelle clé primaire sur la colonne indicator
ALTER TABLE site_global_indicator_values_simple 
ADD CONSTRAINT site_global_indicator_values_simple_pkey PRIMARY KEY (indicator);

-- Fonction pour peupler automatiquement la table
CREATE OR REPLACE FUNCTION populate_site_global_indicators()
RETURNS void AS $$
BEGIN
  -- Insérer une ligne pour chaque indicateur lié à un processus de site
  INSERT INTO site_global_indicator_values_simple (
    indicator,
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
    created_at,
    updated_at
  )
  SELECT DISTINCT
    i.code as indicator,
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
    sp.organization_name,
    s.filiere_name,
    s.filiale_name,
    NOW() as created_at,
    NOW() as updated_at
  FROM indicators i
  JOIN site_processes sp ON sp.processus_code = i.processus_code
  JOIN sites s ON s.name = sp.site_name
  JOIN processus p ON p.code = i.processus_code
  WHERE sp.is_active = true
  ON CONFLICT (indicator) DO UPDATE SET
    site_name = EXCLUDED.site_name,
    year = EXCLUDED.year,
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
END;
$$ LANGUAGE plpgsql;

-- Fonction trigger pour maintenir la table à jour
CREATE OR REPLACE FUNCTION sync_site_global_indicators_trigger()
RETURNS trigger AS $$
BEGIN
  -- Repeupler la table après tout changement
  PERFORM populate_site_global_indicators();
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Supprimer les anciens triggers s'ils existent
DROP TRIGGER IF EXISTS trigger_sync_site_global_indicators_on_site_processes ON site_processes;
DROP TRIGGER IF EXISTS trigger_sync_site_global_indicators_on_indicators ON indicators;

-- Créer les triggers pour maintenir la synchronisation
CREATE TRIGGER trigger_sync_site_global_indicators_on_site_processes
  AFTER INSERT OR UPDATE OR DELETE ON site_processes
  FOR EACH ROW
  EXECUTE FUNCTION sync_site_global_indicators_trigger();

CREATE TRIGGER trigger_sync_site_global_indicators_on_indicators
  AFTER INSERT OR UPDATE OR DELETE ON indicators
  FOR EACH ROW
  EXECUTE FUNCTION sync_site_global_indicators_trigger();

-- Fonction pour synchroniser les valeurs depuis indicator_measurements
CREATE OR REPLACE FUNCTION sync_indicator_values_to_global()
RETURNS void AS $$
BEGIN
  -- Mettre à jour les valeurs annuelles depuis indicator_measurements
  UPDATE site_global_indicator_values_simple sgiv
  SET 
    value = im.valeur_annee_actuelle,
    valeur_precedente = im.valeur_annee_precedente,
    cible = im.cible_annee_actuelle,
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
  WHERE sgiv.indicator = im.indicator_code
    AND sgiv.site_name = im.site_name
    AND sgiv.year = im.year;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour synchroniser les valeurs depuis indicator_measurements
CREATE OR REPLACE FUNCTION sync_values_trigger()
RETURNS trigger AS $$
BEGIN
  -- Synchroniser les valeurs après modification d'indicator_measurements
  PERFORM sync_indicator_values_to_global();
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Supprimer l'ancien trigger s'il existe
DROP TRIGGER IF EXISTS trigger_sync_values_from_measurements ON indicator_measurements;

-- Créer le trigger pour synchroniser les valeurs
CREATE TRIGGER trigger_sync_values_from_measurements
  AFTER INSERT OR UPDATE OR DELETE ON indicator_measurements
  FOR EACH ROW
  EXECUTE FUNCTION sync_values_trigger();

-- Peupler la table avec les données actuelles
SELECT populate_site_global_indicators();

-- Synchroniser les valeurs existantes
SELECT sync_indicator_values_to_global();

-- Mettre à jour la fonction updated_at existante si elle existe
CREATE OR REPLACE FUNCTION update_site_global_indicator_values_simple_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Supprimer l'ancien trigger updated_at s'il existe
DROP TRIGGER IF EXISTS update_site_global_indicator_values_simple_updated_at ON site_global_indicator_values_simple;

-- Créer le trigger updated_at
CREATE TRIGGER update_site_global_indicator_values_simple_updated_at
  BEFORE UPDATE ON site_global_indicator_values_simple
  FOR EACH ROW
  EXECUTE FUNCTION update_site_global_indicator_values_simple_updated_at();