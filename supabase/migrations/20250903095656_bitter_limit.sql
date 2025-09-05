/*
  # Ajouter filiere_name et filiale_name à indicator_values

  1. Modifications de table
    - Ajouter la colonne `filiere_name` à la table `indicator_values`
    - Ajouter la colonne `filiale_name` à la table `indicator_values`
    - Ajouter les contraintes de clé étrangère appropriées

  2. Sécurité
    - Les politiques RLS existantes restent inchangées
    - Les nouvelles colonnes suivent les mêmes règles d'accès

  3. Notes importantes
    - Ces colonnes permettront une meilleure organisation hiérarchique des données
    - Elles complètent les champs existants organization_name et site_name
    - Les contraintes maintiennent l'intégrité référentielle
*/

-- Ajouter la colonne filiere_name
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'indicator_values' AND column_name = 'filiere_name'
  ) THEN
    ALTER TABLE indicator_values ADD COLUMN filiere_name text;
  END IF;
END $$;

-- Ajouter la colonne filiale_name
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'indicator_values' AND column_name = 'filiale_name'
  ) THEN
    ALTER TABLE indicator_values ADD COLUMN filiale_name text;
  END IF;
END $$;

-- Ajouter la contrainte de clé étrangère pour filiere_name
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'indicator_values_filiere_name_fkey'
  ) THEN
    ALTER TABLE indicator_values 
    ADD CONSTRAINT indicator_values_filiere_name_fkey 
    FOREIGN KEY (filiere_name) REFERENCES filieres(name) ON DELETE SET NULL;
  END IF;
END $$;

-- Ajouter la contrainte de clé étrangère pour filiale_name
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'indicator_values_filiale_name_fkey'
  ) THEN
    ALTER TABLE indicator_values 
    ADD CONSTRAINT indicator_values_filiale_name_fkey 
    FOREIGN KEY (filiale_name) REFERENCES filiales(name) ON DELETE SET NULL;
  END IF;
END $$;

-- Ajouter des index pour améliorer les performances des requêtes
CREATE INDEX IF NOT EXISTS idx_indicator_values_filiere_name 
ON indicator_values(filiere_name);

CREATE INDEX IF NOT EXISTS idx_indicator_values_filiale_name 
ON indicator_values(filiale_name);

-- Index composite pour les requêtes hiérarchiques
CREATE INDEX IF NOT EXISTS idx_indicator_values_hierarchy 
ON indicator_values(organization_name, filiere_name, filiale_name, site_name);