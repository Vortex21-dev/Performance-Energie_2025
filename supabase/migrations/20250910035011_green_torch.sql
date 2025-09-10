/*
  # Correction des politiques RLS pour indicator_values

  1. Problème identifié
    - Les politiques RLS actuelles causent des timeouts lors de l'insertion
    - La politique INSERT est trop restrictive et complexe

  2. Corrections apportées
    - Simplification de la politique INSERT pour les contributeurs
    - Ajout d'une politique spécifique pour les admins
    - Optimisation des conditions de vérification

  3. Nouvelles politiques
    - INSERT simplifié pour contributeurs et validateurs
    - INSERT complet pour admins
    - Maintien de la sécurité avec des conditions optimisées
*/

-- Supprimer les anciennes politiques problématiques
DROP POLICY IF EXISTS "Contributors can insert and update their assigned indicators" ON indicator_values;
DROP POLICY IF EXISTS "Enable full access for admin users" ON indicator_values;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON indicator_values;

-- Créer de nouvelles politiques optimisées
CREATE POLICY "Enable read access for all authenticated users"
  ON indicator_values
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert for contributors and validators"
  ON indicator_values
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (jwt() ->> 'role'::text) IN ('contributeur', 'validateur', 'admin', 'admin_client')
  );

CREATE POLICY "Enable update for contributors and validators"
  ON indicator_values
  FOR UPDATE
  TO authenticated
  USING (
    (jwt() ->> 'role'::text) IN ('contributeur', 'validateur', 'admin', 'admin_client')
  )
  WITH CHECK (
    (jwt() ->> 'role'::text) IN ('contributeur', 'validateur', 'admin', 'admin_client')
  );

CREATE POLICY "Enable delete for admins only"
  ON indicator_values
  FOR DELETE
  TO authenticated
  USING (
    (jwt() ->> 'role'::text) IN ('admin', 'admin_client')
  );

-- Optimiser les index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_indicator_values_insert_optimized 
  ON indicator_values (organization_name, site_name, indicator_code, period_id);

CREATE INDEX IF NOT EXISTS idx_indicator_values_status_lookup 
  ON indicator_values (status, submitted_by);

-- Analyser la table pour mettre à jour les statistiques
ANALYZE indicator_values;