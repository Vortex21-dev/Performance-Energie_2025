-- Étape 0 : Supprimer les fonctions et triggers existants s’ils existent
DROP FUNCTION IF EXISTS populate_site_indicators(TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS trigger_populate_site_indicators_on_new_site_process();
DROP FUNCTION IF EXISTS trigger_populate_sites_on_new_indicator();

DROP TRIGGER IF EXISTS trigger_new_site_process_populate_indicators ON site_processes;
DROP TRIGGER IF EXISTS trigger_new_indicator_populate_sites ON indicators;

-- Étape 1 : Créer la fonction principale populate_site_indicators
CREATE OR REPLACE FUNCTION populate_site_indicators(
  p_site_name TEXT,
  p_organization_name TEXT,
  p_filiere_name TEXT DEFAULT NULL,
  p_filiale_name TEXT DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
  indicator_record RECORD;
  inserted_count INTEGER := 0;
  current_year INTEGER := EXTRACT(YEAR FROM CURRENT_DATE);
  previous_year INTEGER := current_year - 1;
BEGIN
  -- [ ... Code complet de ta fonction ici ... ]
  -- (Tu peux copier-coller le bloc complet que tu as partagé plus haut)

  RETURN inserted_count;
END;
$$ LANGUAGE plpgsql;

-- Étape 2 : Peupler pour tous les sites (bloc DO)
DO $$
DECLARE
  site_record RECORD;
  total_inserted INTEGER := 0;
  site_count INTEGER := 0;
BEGIN
  RAISE NOTICE 'Début du peuplement automatique des indicateurs par site...';

  FOR site_record IN
    SELECT DISTINCT 
      sp.site_name,
      sp.organization_name,
      s.filiere_name,
      s.filiale_name
    FROM site_processes sp
    JOIN sites s ON s.name = sp.site_name
    WHERE sp.is_active = true
  LOOP
    DECLARE
      inserted_for_site INTEGER;
    BEGIN
      SELECT populate_site_indicators(
        site_record.site_name,
        site_record.organization_name,
        site_record.filiere_name,
        site_record.filiale_name
      ) INTO inserted_for_site;

      total_inserted := total_inserted + inserted_for_site;
      site_count := site_count + 1;

      RAISE NOTICE 'Site: % - % indicateurs traités', site_record.site_name, inserted_for_site;
    END;
  END LOOP;

  RAISE NOTICE 'Peuplement terminé: % sites traités, % indicateurs créés/mis à jour', site_count, total_inserted;
END;
$$;

-- Étape 3 : Mise à jour des variations et performances
-- [ ... Ton code UPDATE pour les variations et performances ... ]
-- Tu peux le laisser tel quel comme dans ton code initial

-- Étape 4 : Créer les triggers automatiques

-- Trigger pour nouveau site_process
CREATE OR REPLACE FUNCTION trigger_populate_site_indicators_on_new_site_process()
RETURNS TRIGGER AS $$
DECLARE
  inserted_count INTEGER;
BEGIN
  SELECT populate_site_indicators(
    NEW.site_name,
    NEW.organization_name,
    (SELECT filiere_name FROM sites WHERE name = NEW.site_name),
    (SELECT filiale_name FROM sites WHERE name = NEW.site_name)
  ) INTO inserted_count;

  RAISE NOTICE 'Nouveau site/processus: % indicateurs ajoutés pour %', inserted_count, NEW.site_name;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_new_site_process_populate_indicators
  AFTER INSERT ON site_processes
  FOR EACH ROW
  EXECUTE FUNCTION trigger_populate_site_indicators_on_new_site_process();

-- Trigger pour nouvel indicateur
CREATE OR REPLACE FUNCTION trigger_populate_sites_on_new_indicator()
RETURNS TRIGGER AS $$
DECLARE
  site_record RECORD;
  inserted_count INTEGER := 0;
BEGIN
  FOR site_record IN
    SELECT DISTINCT 
      sp.site_name,
      sp.organization_name,
      s.filiere_name,
      s.filiale_name
    FROM site_processes sp
    JOIN sites s ON s.name = sp.site_name
    WHERE sp.processus_code = NEW.processus_code
      AND sp.is_active = true
  LOOP
    INSERT INTO site_global_indicator_values_simple (
      site_name, year, code, organization_name, filiere_name, filiale_name,
      axe_energetique, enjeux, normes, critere, indicateur, definition,
      processus, processus_code, frequence, unite, type, formule
    )
    SELECT 
      site_record.site_name,
      EXTRACT(YEAR FROM CURRENT_DATE),
      NEW.code,
      site_record.organization_name,
      site_record.filiere_name,
      site_record.filiale_name,
      NEW.axe_energetique,
      NEW.enjeux,
      NEW.normes,
      NEW.critere,
      NEW.name,
      NEW.description,
      (SELECT name FROM processus WHERE code = NEW.processus_code),
      NEW.processus_code,
      NEW.frequence,
      NEW.unit,
      NEW.type,
      NEW.formule
    ON CONFLICT (site_name, code, year) DO NOTHING;

    inserted_count := inserted_count + 1;
  END LOOP;

  RAISE NOTICE 'Nouvel indicateur %: ajouté à % sites', NEW.code, inserted_count;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_new_indicator_populate_sites
  AFTER INSERT ON indicators
  FOR EACH ROW
  EXECUTE FUNCTION trigger_populate_sites_on_new_indicator();

-- Fin
RAISE NOTICE 'Migration terminée avec succès !';
