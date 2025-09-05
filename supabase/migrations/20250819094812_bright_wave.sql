/*
  # Ajouter les colonnes critères et indicateurs à la table processus

  1. Nouvelles colonnes
    - `criteres` (text[]) - Tableau des codes de critères associés
    - `indicateurs` (text[]) - Tableau des codes d'indicateurs associés

  2. Sécurité
    - Activer RLS sur la table processus
    - Ajouter des politiques pour permettre les opérations CRUD aux utilisateurs authentifiés
*/

-- Ajouter les nouvelles colonnes si elles n'existent pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'processus' AND column_name = 'criteres'
  ) THEN
    ALTER TABLE processus ADD COLUMN criteres text[] DEFAULT '{}';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'processus' AND column_name = 'indicateurs'
  ) THEN
    ALTER TABLE processus ADD COLUMN indicateurs text[] DEFAULT '{}';
  END IF;
END $$;

-- Activer RLS sur la table processus si ce n'est pas déjà fait
ALTER TABLE processus ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes politiques si elles existent
DROP POLICY IF EXISTS "Enable read access for authenticated users on processus" ON processus;
DROP POLICY IF EXISTS "Enable write access for admin users on processus" ON processus;
DROP POLICY IF EXISTS "Enable insert for authenticated users on processus" ON processus;
DROP POLICY IF EXISTS "Enable update for authenticated users on processus" ON processus;
DROP POLICY IF EXISTS "Enable delete for authenticated users on processus" ON processus;

-- Créer de nouvelles politiques pour permettre toutes les opérations aux utilisateurs authentifiés
CREATE POLICY "Enable read access for authenticated users on processus"
  ON processus
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert for authenticated users on processus"
  ON processus
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users on processus"
  ON processus
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable delete for authenticated users on processus"
  ON processus
  FOR DELETE
  TO authenticated
  USING (true);

-- Ajouter des index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_processus_criteres ON processus USING gin (criteres);
CREATE INDEX IF NOT EXISTS idx_processus_indicateurs ON processus USING gin (indicateurs);