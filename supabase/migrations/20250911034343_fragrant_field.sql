/*
  # Optimiser le trigger pour éviter les timeouts

  1. Modifications
    - Optimiser la fonction trigger pour éviter les requêtes inutiles
    - Ajouter des conditions pour ne faire les lookups que si nécessaire
    - Améliorer les performances avec des index appropriés

  2. Sécurité
    - Maintenir SECURITY DEFINER pour les permissions appropriées
    - Conserver l'intégrité des données
*/

-- Supprimer l'ancien trigger et fonction
DROP TRIGGER IF EXISTS trigger_update_indicator_values_hierarchy ON indicator_values;
DROP FUNCTION IF EXISTS update_indicator_values_hierarchy();

-- Créer la fonction optimisée
CREATE OR REPLACE FUNCTION update_indicator_values_hierarchy()
RETURNS TRIGGER AS $$
BEGIN
  -- Ne faire les lookups que si les données organisationnelles ne sont pas déjà fournies
  IF NEW.organization_name IS NULL OR NEW.filiere_name IS NULL OR NEW.filiale_name IS NULL OR NEW.site_name IS NULL THEN
    
    -- Essayer de récupérer depuis le profil utilisateur seulement si nécessaire
    IF NEW.organization_name IS NULL OR NEW.site_name IS NULL THEN
      SELECT 
        COALESCE(NEW.organization_name, p.organization_name),
        COALESCE(NEW.filiere_name, p.filiere_name),
        COALESCE(NEW.filiale_name, p.filiale_name),
        COALESCE(NEW.site_name, p.site_name)
      INTO 
        NEW.organization_name,
        NEW.filiere_name,
        NEW.filiale_name,
        NEW.site_name
      FROM profiles p
      WHERE p.email = (jwt() ->> 'email')
      LIMIT 1;
    END IF;
    
    -- Si on a un site_name mais pas les autres infos, récupérer depuis la table sites
    IF NEW.site_name IS NOT NULL AND (NEW.organization_name IS NULL OR NEW.filiere_name IS NULL OR NEW.filiale_name IS NULL) THEN
      SELECT 
        COALESCE(NEW.organization_name, s.organization_name),
        COALESCE(NEW.filiere_name, s.filiere_name),
        COALESCE(NEW.filiale_name, s.filiale_name)
      INTO 
        NEW.organization_name,
        NEW.filiere_name,
        NEW.filiale_name
      FROM sites s
      WHERE s.name = NEW.site_name
      LIMIT 1;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Créer le trigger optimisé (seulement sur INSERT et UPDATE de site_name)
CREATE TRIGGER trigger_update_indicator_values_hierarchy
  BEFORE INSERT OR UPDATE OF site_name ON indicator_values
  FOR EACH ROW 
  WHEN (NEW.organization_name IS NULL OR NEW.filiere_name IS NULL OR NEW.filiale_name IS NULL OR NEW.site_name IS NULL)
  EXECUTE FUNCTION update_indicator_values_hierarchy();

-- Créer des index pour optimiser les performances des lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email_org_data ON profiles(email) 
  INCLUDE (organization_name, filiere_name, filiale_name, site_name);

CREATE INDEX IF NOT EXISTS idx_sites_name_org_data ON sites(name) 
  INCLUDE (organization_name, filiere_name, filiale_name);

-- Optimiser la table indicator_values avec des index composites
CREATE INDEX IF NOT EXISTS idx_indicator_values_lookup_fast ON indicator_values(organization_name, site_name, period_id, indicator_code);

-- Analyser les tables pour mettre à jour les statistiques
ANALYZE profiles;
ANALYZE sites;
ANALYZE indicator_values;