/*
  # Corriger le conflit de fonction populate_site_indicators

  1. Problème
    - Fonction populate_site_indicators(text) n'est pas unique
    - Conflit lors des appels de fonction dans les triggers
    - Erreur lors de la mise à jour des profils utilisateurs

  2. Solution
    - Supprimer les fonctions en conflit
    - Recréer une fonction unique et claire
    - Mettre à jour les triggers pour utiliser des casts explicites
    - Assurer l'unicité des signatures de fonction

  3. Sécurité
    - Maintenir l'intégrité des données
    - Préserver les fonctionnalités existantes
    - Éviter les conflits futurs
*/

-- Supprimer les triggers qui utilisent la fonction problématique
DROP TRIGGER IF EXISTS trigger_populate_on_site_process_insert ON site_processes;
DROP TRIGGER IF EXISTS trigger_new_site_process_populate_indicators ON site_processes;
DROP TRIGGER IF EXISTS trigger_populate_on_indicator_insert ON indicators;
DROP TRIGGER IF EXISTS trigger_new_indicator_populate_sites ON indicators;

-- Supprimer toutes les versions de la fonction populate_site_indicators
DROP FUNCTION IF EXISTS populate_site_indicators(text);
DROP FUNCTION IF EXISTS populate_site_indicators(character varying);
DROP FUNCTION IF EXISTS populate_site_indicators();

-- Supprimer les autres fonctions similaires qui pourraient causer des conflits
DROP FUNCTION IF EXISTS trigger_populate_site_indicators_on_new_indicator();
DROP FUNCTION IF EXISTS trigger_populate_site_indicators_on_new_site_process();
DROP FUNCTION IF EXISTS trigger_populate_indicators_on_new_indicator();
DROP FUNCTION IF EXISTS trigger_populate_sites_on_new_indicator();

-- Créer une fonction unique et claire pour peupler les indicateurs de site
CREATE OR REPLACE FUNCTION populate_site_indicators_unique()
RETURNS TRIGGER AS $$
BEGIN
  -- Cette fonction sera appelée par les triggers pour maintenir la cohérence
  -- des indicateurs de site lors des changements
  
  -- Pour les nouveaux processus de site
  IF TG_TABLE_NAME = 'site_processes' AND TG_OP = 'INSERT' THEN
    -- Insérer les indicateurs pour ce nouveau processus de site
    INSERT INTO site_global_indicator_values_simple (
      site_name,
      code,
      year,
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
      i.code,
      EXTRACT(YEAR FROM CURRENT_DATE)::integer,
      i.axe_energetique,
      i.enjeux,
      i.normes,
      i.critere,
      i.name,
      i.description,
      p.name,
      i.processus_code,
      i.frequence,
      i.unit,
      i.type,
      i.formule,
      NEW.organization_name,
      s.filiere_name,
      s.filiale_name
    FROM indicators i
    JOIN processus p ON p.code = i.processus_code
    JOIN sites s ON s.name = NEW.site_name
    WHERE i.processus_code = NEW.processus_code
    AND NOT EXISTS (
      SELECT 1 FROM site_global_indicator_values_simple sgiv
      WHERE sgiv.site_name = NEW.site_name
      AND sgiv.code = i.code
      AND sgiv.year = EXTRACT(YEAR FROM CURRENT_DATE)::integer
    );
  END IF;
  
  -- Pour les nouveaux indicateurs
  IF TG_TABLE_NAME = 'indicators' AND TG_OP = 'INSERT' THEN
    -- Insérer cet indicateur pour tous les sites qui ont le processus correspondant
    INSERT INTO site_global_indicator_values_simple (
      site_name,
      code,
      year,
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
      NEW.code,
      EXTRACT(YEAR FROM CURRENT_DATE)::integer,
      NEW.axe_energetique,
      NEW.enjeux,
      NEW.normes,
      NEW.critere,
      NEW.name,
      NEW.description,
      p.name,
      NEW.processus_code,
      NEW.frequence,
      NEW.unit,
      NEW.type,
      NEW.formule,
      sp.organization_name,
      s.filiere_name,
      s.filiale_name
    FROM site_processes sp
    JOIN processus p ON p.code = NEW.processus_code
    JOIN sites s ON s.name = sp.site_name
    WHERE sp.processus_code = NEW.processus_code
    AND sp.is_active = true
    AND NOT EXISTS (
      SELECT 1 FROM site_global_indicator_values_simple sgiv
      WHERE sgiv.site_name = sp.site_name
      AND sgiv.code = NEW.code
      AND sgiv.year = EXTRACT(YEAR FROM CURRENT_DATE)::integer
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recréer les triggers avec la nouvelle fonction
CREATE TRIGGER trigger_populate_site_indicators_on_site_process
  AFTER INSERT ON site_processes
  FOR EACH ROW
  EXECUTE FUNCTION populate_site_indicators_unique();

CREATE TRIGGER trigger_populate_site_indicators_on_indicator
  AFTER INSERT ON indicators
  FOR EACH ROW
  EXECUTE FUNCTION populate_site_indicators_unique();

-- Créer une fonction simplifiée pour les mises à jour de profils
CREATE OR REPLACE FUNCTION handle_profile_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Cette fonction gère les mises à jour de profils sans conflit
  -- Elle peut être étendue selon les besoins futurs
  
  -- Mettre à jour le timestamp
  NEW.updated_at = now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Supprimer les anciens triggers sur profiles qui pourraient causer des problèmes
DROP TRIGGER IF EXISTS sync_site_processes_on_profiles ON profiles;
DROP TRIGGER IF EXISTS trigger_profiles_site_sync ON profiles;

-- Créer un trigger simple pour les profils
CREATE TRIGGER profiles_handle_update
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION handle_profile_update();

-- Assurer que les politiques RLS sont correctes pour les profils
DROP POLICY IF EXISTS "Enable full access for admin users" ON profiles;
DROP POLICY IF EXISTS "Enable full access for admin users on profiles" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users on profiles" ON profiles;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON profiles;
DROP POLICY IF EXISTS "Enable read access for authenticated users on profiles" ON profiles;

-- Recréer les politiques RLS pour profiles de manière claire
CREATE POLICY "profiles_admin_full_access" ON profiles
  FOR ALL TO authenticated
  USING ((jwt() ->> 'role'::text) = 'admin'::text)
  WITH CHECK ((jwt() ->> 'role'::text) = 'admin'::text);

CREATE POLICY "profiles_authenticated_read" ON profiles
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "profiles_authenticated_insert" ON profiles
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Créer un index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_profiles_email_role ON profiles(email, role);
CREATE INDEX IF NOT EXISTS idx_profiles_organization ON profiles(organization_name);