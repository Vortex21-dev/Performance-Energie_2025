-- 1. Supprimer les triggers problématiques et en double
DROP TRIGGER IF EXISTS trigger_sync_indicator_values_fixed ON indicator_values;
DROP TRIGGER IF EXISTS trigger_sync_indicator_values_improved ON indicator_values;
DROP TRIGGER IF EXISTS trigger_update_indicator_values_hierarchy ON indicator_values;
DROP TRIGGER IF EXISTS trigger_update_valeur_precedente ON indicator_values;

-- Garder seulement le trigger essentiel
DROP TRIGGER IF EXISTS trigger_recalculate_on_indicator_change ON indicator_values;

-- 2. Simplifier les index - supprimer les index redondants
DROP INDEX IF EXISTS idx_indicator_values_filiale_complete;
DROP INDEX IF EXISTS idx_indicator_values_filiere_complete;
DROP INDEX IF EXISTS idx_indicator_values_hierarchy;
DROP INDEX IF EXISTS idx_indicator_values_hierarchy_complete;
DROP INDEX IF EXISTS idx_indicator_values_sync_lookup;

-- Garder seulement les index essentiels
CREATE INDEX IF NOT EXISTS idx_indicator_values_main_search ON indicator_values 
  (organization_name, indicator_code, period_id);

CREATE INDEX IF NOT EXISTS idx_indicator_values_status_filter ON indicator_values 
  (status) WHERE status IN ('draft', 'submitted');

CREATE INDEX IF NOT EXISTS idx_indicator_values_period_org ON indicator_values 
  (period_id, organization_name);

-- 3. Ajouter des index manquants pour les clés étrangères
CREATE INDEX IF NOT EXISTS idx_indicator_values_filiere_name ON indicator_values (filiere_name);
CREATE INDEX IF NOT EXISTS idx_indicator_values_filiale_name ON indicator_values (filiale_name);
CREATE INDEX IF NOT EXISTS idx_indicator_values_site_name ON indicator_values (site_name);
CREATE INDEX IF NOT EXISTS idx_indicator_values_processus_code ON indicator_values (processus_code);

-- 4. Recréer un seul trigger optimisé pour les recalculs
CREATE OR REPLACE TRIGGER trigger_recalculate_optimized
AFTER INSERT OR UPDATE OF value OR DELETE ON indicator_values
FOR EACH ROW
EXECUTE FUNCTION trigger_recalculate_derived_indicators();

-- 5. Optimiser les politiques RLS comme précédemment
ALTER TABLE indicator_values DISABLE ROW LEVEL SECURITY;

-- Supprimer les politiques existantes
DROP POLICY IF EXISTS "Contributors can insert and update their assigned indicators" ON indicator_values;
DROP POLICY IF EXISTS "Enable full access for admin users" ON indicator_values;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON indicator_values;

-- Recréer des politiques simplifiées
ALTER TABLE indicator_values ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read for authenticated users" ON indicator_values
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow write for contributors and admins" ON indicator_values
  FOR ALL TO authenticated
  USING (
    (auth.jwt() ->> 'role'::text) IN ('contributeur', 'validateur', 'admin', 'admin_client')
  )
  WITH CHECK (
    (auth.jwt() ->> 'role'::text) IN ('contributeur', 'validateur', 'admin', 'admin_client')
  );

-- 6. Optimiser la table
VACUUM ANALYZE indicator_values;

-- 7. Ajuster les paramètres de performance
ALTER TABLE indicator_values SET (autovacuum_vacuum_scale_factor = 0.1);
ALTER TABLE indicator_values SET (autovacuum_analyze_scale_factor = 0.05);