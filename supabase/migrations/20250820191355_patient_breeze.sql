/*
  # Corriger les triggers avec DELETE sans WHERE clause

  1. Identification et correction des triggers problématiques
    - Recherche des triggers sur la table profiles
    - Correction des fonctions avec DELETE sans WHERE
    - Suppression des triggers défectueux si nécessaire

  2. Sécurité
    - S'assurer que tous les DELETE ont une clause WHERE appropriée
    - Maintenir l'intégrité des données
*/

-- Supprimer les triggers problématiques sur la table profiles
DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
DROP TRIGGER IF EXISTS sync_site_processes_on_profiles ON profiles;
DROP TRIGGER IF EXISTS trigger_profiles_site_sync ON profiles;

-- Supprimer les fonctions qui pourraient contenir des DELETE sans WHERE
DROP FUNCTION IF EXISTS trigger_sync_site_processes() CASCADE;
DROP FUNCTION IF EXISTS trigger_sync_site_processes_on_profile_change() CASCADE;
DROP FUNCTION IF EXISTS update_profiles_updated_at() CASCADE;

-- Recréer la fonction update_updated_at_column de manière sécurisée
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Recréer le trigger pour updated_at de manière sécurisée
CREATE TRIGGER profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Créer une fonction sécurisée pour la synchronisation des processus de site
CREATE OR REPLACE FUNCTION trigger_sync_site_processes_on_profile_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Ne faire des opérations que si nécessaire et avec des WHERE clauses appropriées
    IF TG_OP = 'UPDATE' AND (OLD.site_name IS DISTINCT FROM NEW.site_name OR OLD.organization_name IS DISTINCT FROM NEW.organization_name) THEN
        -- Supprimer les anciennes associations pour cet utilisateur spécifique
        DELETE FROM site_processes 
        WHERE organization_name = COALESCE(OLD.organization_name, NEW.organization_name)
        AND site_name = OLD.site_name
        AND processus_code IN (
            SELECT processus_code FROM user_processus WHERE email = NEW.email
        );
        
        -- Insérer les nouvelles associations si un site est défini
        IF NEW.site_name IS NOT NULL AND NEW.organization_name IS NOT NULL THEN
            INSERT INTO site_processes (site_name, processus_code, organization_name, is_active)
            SELECT NEW.site_name, up.processus_code, NEW.organization_name, true
            FROM user_processus up
            WHERE up.email = NEW.email
            ON CONFLICT (site_name, processus_code, organization_name) 
            DO UPDATE SET is_active = true;
        END IF;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Recréer le trigger de synchronisation de manière sécurisée
CREATE TRIGGER trigger_profiles_site_sync
    AFTER INSERT OR UPDATE OR DELETE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION trigger_sync_site_processes_on_profile_change();