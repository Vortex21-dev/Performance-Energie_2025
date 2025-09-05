/*
  # Peuplement automatique de la table site_processes

  1. Fonctions
    - `populate_site_processes_for_organization()` : Peuple les associations site-processus pour une organisation
    - `populate_site_processes_for_site()` : Peuple les processus pour un site spécifique

  2. Triggers
    - Sur insertion de sites : associe automatiquement tous les processus
    - Sur insertion de processus : associe automatiquement à tous les sites existants

  3. Peuplement initial
    - Peuple la table pour toutes les organisations existantes
*/

-- Fonction pour peupler les processus d'un site spécifique
CREATE OR REPLACE FUNCTION populate_site_processes_for_site(site_name_param TEXT, org_name_param TEXT)
RETURNS VOID AS $$
BEGIN
  -- Insérer tous les processus pour ce site
  INSERT INTO site_processes (site_name, processus_code, organization_name, is_active)
  SELECT 
    site_name_param,
    p.code,
    org_name_param,
    true
  FROM processus p
  WHERE NOT EXISTS (
    SELECT 1 FROM site_processes sp 
    WHERE sp.site_name = site_name_param 
    AND sp.processus_code = p.code 
    AND sp.organization_name = org_name_param
  );
END;
$$ LANGUAGE plpgsql;

-- Fonction pour peupler tous les sites d'une organisation
CREATE OR REPLACE FUNCTION populate_site_processes_for_organization(org_name_param TEXT)
RETURNS VOID AS $$
DECLARE
  site_record RECORD;
BEGIN
  -- Pour chaque site de l'organisation
  FOR site_record IN 
    SELECT name FROM sites WHERE organization_name = org_name_param
  LOOP
    -- Peupler les processus pour ce site
    PERFORM populate_site_processes_for_site(site_record.name, org_name_param);
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour peupler tous les sites existants avec un nouveau processus
CREATE OR REPLACE FUNCTION populate_sites_with_new_processus(processus_code_param TEXT)
RETURNS VOID AS $$
BEGIN
  INSERT INTO site_processes (site_name, processus_code, organization_name, is_active)
  SELECT 
    s.name,
    processus_code_param,
    s.organization_name,
    true
  FROM sites s
  WHERE NOT EXISTS (
    SELECT 1 FROM site_processes sp 
    WHERE sp.site_name = s.name 
    AND sp.processus_code = processus_code_param 
    AND sp.organization_name = s.organization_name
  );
END;
$$ LANGUAGE plpgsql;

-- Trigger pour peupler automatiquement les processus quand un site est créé
CREATE OR REPLACE FUNCTION trigger_populate_site_processes()
RETURNS TRIGGER AS $$
BEGIN
  -- Peupler les processus pour le nouveau site
  PERFORM populate_site_processes_for_site(NEW.name, NEW.organization_name);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour peupler automatiquement les sites quand un processus est créé
CREATE OR REPLACE FUNCTION trigger_populate_sites_with_processus()
RETURNS TRIGGER AS $$
BEGIN
  -- Peupler tous les sites existants avec le nouveau processus
  PERFORM populate_sites_with_new_processus(NEW.code);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Supprimer les triggers existants s'ils existent
DROP TRIGGER IF EXISTS trigger_site_created ON sites;
DROP TRIGGER IF EXISTS trigger_processus_created ON processus;

-- Créer les triggers
CREATE TRIGGER trigger_site_created
  AFTER INSERT ON sites
  FOR EACH ROW
  EXECUTE FUNCTION trigger_populate_site_processes();

CREATE TRIGGER trigger_processus_created
  AFTER INSERT ON processus
  FOR EACH ROW
  EXECUTE FUNCTION trigger_populate_sites_with_processus();

-- Peupler la table pour toutes les organisations existantes
DO $$
DECLARE
  org_record RECORD;
BEGIN
  -- Vider la table site_processes pour recommencer proprement
  DELETE FROM site_processes;
  
  -- Pour chaque organisation existante
  FOR org_record IN 
    SELECT DISTINCT name FROM organizations
  LOOP
    -- Peupler les associations site-processus
    PERFORM populate_site_processes_for_organization(org_record.name);
  END LOOP;
  
  RAISE NOTICE 'Table site_processes peuplée pour toutes les organisations existantes';
END;
$$;

-- Créer un index pour optimiser les performances
CREATE INDEX IF NOT EXISTS idx_site_processes_lookup_optimized 
ON site_processes (organization_name, site_name, is_active);

-- Fonction utilitaire pour vérifier le peuplement
CREATE OR REPLACE FUNCTION check_site_processes_population()
RETURNS TABLE (
  organization_name TEXT,
  site_count BIGINT,
  processus_count BIGINT,
  associations_count BIGINT,
  expected_associations BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.name as organization_name,
    COUNT(DISTINCT s.name) as site_count,
    COUNT(DISTINCT p.code) as processus_count,
    COUNT(sp.site_name) as associations_count,
    COUNT(DISTINCT s.name) * COUNT(DISTINCT p.code) as expected_associations
  FROM organizations o
  LEFT JOIN sites s ON s.organization_name = o.name
  LEFT JOIN processus p ON true
  LEFT JOIN site_processes sp ON sp.site_name = s.name 
    AND sp.processus_code = p.code 
    AND sp.organization_name = o.name
  GROUP BY o.name;
END;
$$ LANGUAGE plpgsql;