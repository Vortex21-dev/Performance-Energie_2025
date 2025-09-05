/*
  # Mise à jour des profils avec filières et filiales

  1. Mise à jour des profils
    - Met à jour les champs filiere_name et filiale_name dans la table profiles
    - Basé sur les sites assignés aux utilisateurs et leur hiérarchie organisationnelle
    - Assure la cohérence entre les niveaux d'organisation

  2. Logique de mise à jour
    - Si un utilisateur a un site_name, récupère la filiale et filière du site
    - Si un utilisateur a organization_level 'filiale', assigne la filiale correspondante
    - Si un utilisateur a organization_level 'filiere', assigne la filière correspondante
    - Maintient la cohérence hiérarchique
*/

-- Mise à jour des profils basée sur les sites assignés
UPDATE profiles 
SET 
  filiere_name = sites.filiere_name,
  filiale_name = sites.filiale_name
FROM sites 
WHERE profiles.site_name = sites.name 
  AND profiles.site_name IS NOT NULL
  AND sites.filiere_name IS NOT NULL;

-- Mise à jour des profils au niveau filiale
UPDATE profiles 
SET 
  filiere_name = filiales.filiere_name
FROM filiales 
WHERE profiles.organization_level = 'filiale' 
  AND profiles.filiale_name = filiales.name 
  AND profiles.filiale_name IS NOT NULL
  AND filiales.filiere_name IS NOT NULL;

-- Mise à jour pour les utilisateurs assignés directement à une filière
UPDATE profiles 
SET 
  filiere_name = (
    SELECT name 
    FROM filieres 
    WHERE filieres.name = profiles.filiere_name 
      AND filieres.organization_name = profiles.organization_name
    LIMIT 1
  )
WHERE profiles.organization_level = 'filiere' 
  AND profiles.filiere_name IS NOT NULL
  AND profiles.organization_name IS NOT NULL;

-- Mise à jour pour les utilisateurs assignés directement à une filiale
UPDATE profiles 
SET 
  filiale_name = (
    SELECT name 
    FROM filiales 
    WHERE filiales.name = profiles.filiale_name 
      AND filiales.organization_name = profiles.organization_name
    LIMIT 1
  ),
  filiere_name = (
    SELECT filiales.filiere_name 
    FROM filiales 
    WHERE filiales.name = profiles.filiale_name 
      AND filiales.organization_name = profiles.organization_name
    LIMIT 1
  )
WHERE profiles.organization_level = 'filiale' 
  AND profiles.filiale_name IS NOT NULL
  AND profiles.organization_name IS NOT NULL;

-- Nettoyage des incohérences : si organization_level ne correspond pas aux champs remplis
UPDATE profiles 
SET 
  filiere_name = NULL,
  filiale_name = NULL,
  site_name = NULL
WHERE organization_level = 'groupe';

UPDATE profiles 
SET 
  filiale_name = NULL,
  site_name = NULL
WHERE organization_level = 'filiere' 
  AND filiere_name IS NOT NULL;

UPDATE profiles 
SET 
  site_name = NULL
WHERE organization_level = 'filiale' 
  AND filiale_name IS NOT NULL;