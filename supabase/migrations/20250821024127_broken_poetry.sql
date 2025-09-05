/*
  # Ajouter la colonne original_role à la table profiles

  1. Modifications
    - Ajouter la colonne `original_role` à la table `profiles`
    - Type: text, nullable
    - Permet de stocker le rôle original avant passage en admin_client

  2. Sécurité
    - Aucune modification des politiques RLS nécessaire
    - La colonne hérite des politiques existantes de la table profiles
*/

-- Ajouter la colonne original_role à la table profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'original_role'
  ) THEN
    ALTER TABLE profiles ADD COLUMN original_role text;
  END IF;
END $$;