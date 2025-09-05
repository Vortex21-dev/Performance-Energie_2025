/*
  # Mise à jour automatique de la table site_processes

  1. Fonctions
    - `populate_site_processes_for_site(site_name, org_name)` : Peuple les processus pour un site spécifique
    - `populate_all_site_processes()` : Peuple tous les sites avec tous les processus
    - `sync_site_processes_on_site_change()` : Fonction trigger pour les changements de sites

  2. Triggers
    - Trigger sur la table `sites` pour auto-peupler lors de l'ajout/modification de sites
    - Trigger sur la table `processus` pour mettre à jour tous les sites quand un processus change

  3. Peuplement initial
    - Vide et repeuple la table site_processes avec tous les processus pour tous les sites
*/

-- Fonction pour peupler les processus d'un site spécifique
CREATE OR REPLACE FUNCTION populate_site_processes_for_site(
  p_site_name TEXT,
  p_organization_name TEXT
)
RETURNS VOID AS $$
BEGIN
  -- Supprimer les associations existantes pour ce site
  DELETE FROM site_processes 
  WHERE site_name = p_site_name AND organization_name = p_organization_name;
  
  -- Ajouter tous les processus disponibles pour ce site
  INSERT INTO site_processes (site_name, processus_code, organization_name, is_active)
  SELECT 
    p_site_name,
    p.code,
    p_organization_name,
    true
  FROM processus p
  WHERE NOT EXISTS (
    SELECT 1 FROM site_processes sp 
    WHERE sp.site_name = p_site_name 
    AND sp.processus_code = p.code 
    AND sp.organization_name = p_organization_name
  );
  
  RAISE NOTICE 'Processus peuplés pour le site: %', p_site_name;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour peupler tous les sites avec tous les processus
CREATE OR REPLACE FUNCTION populate_all_site_processes()
RETURNS VOID AS $$
DECLARE
  site_record RECORD;
BEGIN
  -- Pour chaque site existant
  FOR site_record IN 
    SELECT DISTINCT name, organization_name 
    FROM sites 
    WHERE organization_name IS NOT NULL
  LOOP
    -- Peupler les processus pour ce site
    PERFORM populate_site_processes_for_site(
      site_record.name, 
      site_record.organization_name
    );
  END LOOP;
  
  RAISE NOTICE 'Tous les sites ont été peuplés avec les processus';
END;
$$ LANGUAGE plpgsql;

-- Fonction trigger pour les changements de sites
CREATE OR REPLACE FUNCTION sync_site_processes_on_site_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Nouveau site : ajouter tous les processus
    IF NEW.organization_name IS NOT NULL THEN
      PERFORM populate_site_processes_for_site(NEW.name, NEW.organization_name);
    END IF;
    RETURN NEW;
    
  ELSIF TG_OP = 'UPDATE' THEN
    -- Site modifié : re-synchroniser si l'organisation a changé
    IF OLD.organization_name IS DISTINCT FROM NEW.organization_name THEN
      -- Supprimer les anciennes associations
      IF OLD.organization_name IS NOT NULL THEN
        DELETE FROM site_processes 
        WHERE site_name = OLD.name AND organization_name = OLD.organization_name;
      END IF;
      
      -- Ajouter les nouvelles associations
      IF NEW.organization_name IS NOT NULL THEN
        PERFORM populate_site_processes_for_site(NEW.name, NEW.organization_name);
      END IF;
    END IF;
    RETURN NEW;
    
  ELSIF TG_OP = 'DELETE' THEN
    -- Site supprimé : supprimer toutes les associations
    DELETE FROM site_processes 
    WHERE site_name = OLD.name AND organization_name = OLD.organization_name;
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Fonction trigger pour les changements de processus
CREATE OR REPLACE FUNCTION sync_site_processes_on_processus_change()
RETURNS TRIGGER AS $$
DECLARE
  site_record RECORD;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Nouveau processus : l'ajouter à tous les sites existants
    FOR site_record IN 
      SELECT DISTINCT name, organization_name 
      FROM sites 
      WHERE organization_name IS NOT NULL
    LOOP
      INSERT INTO site_processes (site_name, processus_code, organization_name, is_active)
      VALUES (site_record.name, NEW.code, site_record.organization_name, true)
      ON CONFLICT (site_name, processus_code, organization_name) DO NOTHING;
    END LOOP;
    RETURN NEW;
    
  ELSIF TG_OP = 'DELETE' THEN
    -- Processus supprimé : supprimer de tous les sites
    DELETE FROM site_processes WHERE processus_code = OLD.code;
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Supprimer les triggers existants s'ils existent
DROP TRIGGER IF EXISTS trigger_sync_site_processes_on_site_change ON sites;
DROP TRIGGER IF EXISTS trigger_sync_site_processes_on_processus_change ON processus;

-- Créer les triggers
CREATE TRIGGER trigger_sync_site_processes_on_site_change
  AFTER INSERT OR UPDATE OR DELETE ON sites
  FOR EACH ROW
  EXECUTE FUNCTION sync_site_processes_on_site_change();

CREATE TRIGGER trigger_sync_site_processes_on_processus_change
  AFTER INSERT OR DELETE ON processus
  FOR EACH ROW
  EXECUTE FUNCTION sync_site_processes_on_processus_change();

-- Peupler immédiatement tous les sites avec tous les processus
SELECT populate_all_site_processes();

-- Vérifier le résultat
DO $$
DECLARE
  total_associations INTEGER;
  total_sites INTEGER;
  total_processus INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_associations FROM site_processes;
  SELECT COUNT(DISTINCT name) INTO total_sites FROM sites WHERE organization_name IS NOT NULL;
  SELECT COUNT(*) INTO total_processus FROM processus;
  
  RAISE NOTICE 'Résultat de la synchronisation:';
  RAISE NOTICE '- Total des sites: %', total_sites;
  RAISE NOTICE '- Total des processus: %', total_processus;
  RAISE NOTICE '- Total des associations site-processus: %', total_associations;
  RAISE NOTICE '- Associations attendues: %', total_sites * total_processus;
END;
$$;