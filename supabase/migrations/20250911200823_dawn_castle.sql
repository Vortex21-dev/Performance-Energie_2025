/*
  # Corriger les politiques RLS pour collection_periods

  1. Problème identifié
    - Erreur 42501: violation de politique RLS lors de l'insertion
    - Les politiques actuelles sont trop restrictives

  2. Solution
    - Supprimer les politiques existantes trop restrictives
    - Créer des politiques simplifiées basées sur les rôles JWT
    - Permettre l'accès aux admins et admin_client

  3. Sécurité
    - Maintenir le contrôle d'accès par rôle
    - Simplifier les vérifications pour éviter les erreurs
*/

-- Supprimer toutes les politiques existantes sur collection_periods
DROP POLICY IF EXISTS "Enable full access for admin users" ON collection_periods;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON collection_periods;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON collection_periods;

-- Créer des politiques RLS simplifiées et fonctionnelles
CREATE POLICY "Allow read access for authenticated users" ON collection_periods
  FOR SELECT TO authenticated 
  USING (true);

CREATE POLICY "Allow insert for admin users" ON collection_periods
  FOR INSERT TO authenticated 
  WITH CHECK (
    (jwt() ->> 'role') IN ('admin', 'admin_client')
  );

CREATE POLICY "Allow update for admin users" ON collection_periods
  FOR UPDATE TO authenticated 
  USING (
    (jwt() ->> 'role') IN ('admin', 'admin_client')
  )
  WITH CHECK (
    (jwt() ->> 'role') IN ('admin', 'admin_client')
  );

CREATE POLICY "Allow delete for admin users" ON collection_periods
  FOR DELETE TO authenticated 
  USING (
    (jwt() ->> 'role') = 'admin'
  );

-- Vérifier que RLS est activé
ALTER TABLE collection_periods ENABLE ROW LEVEL SECURITY;

-- Créer des index pour optimiser les performances
CREATE INDEX IF NOT EXISTS idx_collection_periods_org_year 
  ON collection_periods(organization_name, year);

CREATE INDEX IF NOT EXISTS idx_collection_periods_status_type 
  ON collection_periods(status, period_type);

-- Analyser la table pour mettre à jour les statistiques
ANALYZE collection_periods;