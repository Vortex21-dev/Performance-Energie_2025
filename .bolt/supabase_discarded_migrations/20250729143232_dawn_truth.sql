/*
  # Peupler site_processes basé sur les assignations utilisateurs

  1. Fonctions
    - `sync_site_processes_from_users()` : Synchronise les processus des sites basé sur les assignations utilisateurs
    - `sync_site_processes_for_site(site_name)` : Synchronise pour un site spécifique

  2. Triggers
    - Sur `user_processus` : Met à jour automatiquement quand les assignations changent
    - Sur `profiles` : Met à jour quand les utilisateurs changent de site

  3. Logique
    - Un processus est associé à un site si au moins un utilisateur de ce site y est assigné
    - Basé sur la table `user_processus` et les profils utilisateurs
*/

-- Fonction pour synchroniser les processus d'un site spécifique
CREATE OR REPLACE FUNCTION sync_site_processes_for_site(target_site_name TEXT)
RETURNS VOID AS $$
BEGIN
  -- Supprimer les associations existantes pour ce site
  DELETE FROM site_processes 
  WHERE site_name = target_site_name;
  
  -- Insérer les nouveaux processus basés sur les assignations utilisateurs
  INSERT INTO site_processes (site_name, processus_code, organization_name, is_active)
  SELECT DISTINCT
    target_site_name,
    up.processus_code,
    p.organization_name,
    true
  FROM user_processus up
  INNER JOIN profiles p ON p.email = up.email
  INNER JOIN sites s ON s.name = target_site_name
  WHERE p.site_name = target_site_name
    AND p.organization_name = s.organization_name
    AND up.processus_code IS NOT NULL
  ON CONFLICT (site_name, processus_code, organization_name) 
  DO UPDATE SET 
    is_active = true,
    updated_at = now();
    
  RAISE NOTICE 'Synchronisation terminée pour le site: %', target_site_name;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour synchroniser tous les sites
CREATE OR REPLACE FUNCTION sync_site_processes_from_users()
RETURNS VOID AS $$
DECLARE
  site_record RECORD;
BEGIN
  -- Vider la table site_processes
  DELETE FROM site_processes;
  
  -- Pour chaque site, ajouter les processus des utilisateurs assignés
  FOR site_record IN 
    SELECT DISTINCT s.name as site_name, s.organization_name
    FROM sites s
  LOOP
    -- Insérer les processus pour ce site
    INSERT INTO site_processes (site_name, processus_code, organization_name, is_active)
    SELECT DISTINCT
      site_record.site_name,
      up.processus_code,
      site_record.organization_name,
      true
    FROM user_processus up
    INNER JOIN profiles p ON p.email = up.email
    WHERE p.site_name = site_record.site_name
      AND p.organization_name = site_record.organization_name
      AND up.processus_code IS NOT NULL
    ON CONFLICT (site_name, processus_code, organization_name) 
    DO UPDATE SET 
      is_active = true,
      updated_at = now();
  END LOOP;
  
  RAISE NOTICE 'Synchronisation terminée pour tous les sites';
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour automatiquement quand les assignations utilisateurs changent
CREATE OR REPLACE FUNCTION trigger_sync_site_processes_on_user_change()
RETURNS TRIGGER AS $$
DECLARE
  affected_site_name TEXT;
BEGIN
  -- Déterminer le site affecté
  IF TG_OP = 'DELETE' then
    -- Pour une suppression, utiliser l'ancien enregistrement
    SELECT site_name INTO affected_site_name 
    FROM profiles 
    WHERE email = OLD.email;
  ELSE
    -- Pour insertion/mise à jour, utiliser le nouvel enregistrement
    SELECT site_name INTO affected_site_name 
    FROM profiles 
    WHERE email = NEW.email;
  END IF;
  
  -- Synchroniser le site si on a trouvé un site
  IF affected_site_name IS NOT NULL THEN
    PERFORM sync_site_processes_for_site(affected_site_name);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour quand un utilisateur change de site
CREATE OR REPLACE FUNCTION trigger_sync_site_processes_on_profile_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Si le site a changé, synchroniser les deux sites (ancien et nouveau)
  IF TG_OP = 'UPDATE' AND OLD.site_name IS DISTINCT FROM NEW.site_name THEN
    -- Synchroniser l'ancien site
    IF OLD.site_name IS NOT NULL THEN
      PERFORM sync_site_processes_for_site(OLD.site_name);
    END IF;
    
    -- Synchroniser le nouveau site
    IF NEW.site_name IS NOT NULL THEN
      PERFORM sync_site_processes_for_site(NEW.site_name);
    END IF;
  ELSIF TG_OP = 'INSERT' AND NEW.site_name IS NOT NULL THEN
    -- Nouveau profil avec un site
    PERFORM sync_site_processes_for_site(NEW.site_name);
  ELSIF TG_OP = 'DELETE' AND OLD.site_name IS NOT NULL THEN
    -- Profil supprimé
    PERFORM sync_site_processes_for_site(OLD.site_name);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Supprimer les anciens triggers s'ils existent
DROP TRIGGER IF EXISTS trigger_user_processus_site_sync ON user_processus;
DROP TRIGGER IF EXISTS trigger_profiles_site_sync ON profiles;

-- Créer les nouveaux triggers
CREATE TRIGGER trigger_user_processus_site_sync
  AFTER INSERT OR UPDATE OR DELETE ON user_processus
  FOR EACH ROW
  EXECUTE FUNCTION trigger_sync_site_processes_on_user_change();

CREATE TRIGGER trigger_profiles_site_sync
  AFTER INSERT OR UPDATE OR DELETE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION trigger_sync_site_processes_on_profile_change();

-- Peupler immédiatement la table avec les données existantes
SELECT sync_site_processes_from_users();

-- Fonction utilitaire pour vérifier les associations
CREATE OR REPLACE FUNCTION check_site_processes_by_users()
RETURNS TABLE(
  site_name TEXT,
  organization_name TEXT,
  processus_count BIGINT,
  user_count BIGINT,
  processus_list TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.name as site_name,
    s.organization_name,
    COUNT(DISTINCT sp.processus_code) as processus_count,
    COUNT(DISTINCT p.email) as user_count,
    ARRAY_AGG(DISTINCT sp.processus_code) FILTER (WHERE sp.processus_code IS NOT NULL) as processus_list
  FROM sites s
  LEFT JOIN profiles p ON p.site_name = s.name AND p.organization_name = s.organization_name
  LEFT JOIN site_processes sp ON sp.site_name = s.name AND sp.organization_name = s.organization_name
  GROUP BY s.name, s.organization_name
  ORDER BY s.organization_name, s.name;
END;
$$ LANGUAGE plpgsql;