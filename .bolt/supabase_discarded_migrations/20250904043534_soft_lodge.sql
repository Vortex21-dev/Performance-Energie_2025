/*
  # Table de configuration des dépendances d'indicateurs calculés

  1. Nouvelle table
    - `indicator_dependencies`
      - `indicator_code` (text, clé primaire) - Code de l'indicateur calculé
      - `dependances` (text[]) - Array des codes d'indicateurs dont il dépend
      - `methode_calcul` (text) - Formule ou méthode de calcul
      - `description` (text) - Description de l'indicateur calculé
      - `is_active` (boolean) - Statut actif/inactif
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Sécurité
    - Enable RLS sur la table
    - Politiques pour les utilisateurs authentifiés

  3. Fonctions utilitaires
    - Fonction pour récupérer les indicateurs calculés
    - Fonction pour vérifier les dépendances circulaires
*/

-- Créer la table de configuration des dépendances
CREATE TABLE IF NOT EXISTS indicator_dependencies (
  indicator_code text PRIMARY KEY,
  dependances text[] NOT NULL DEFAULT '{}',
  methode_calcul text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Contrainte pour s'assurer que l'indicateur existe
  CONSTRAINT fk_indicator_dependencies_code 
    FOREIGN KEY (indicator_code) 
    REFERENCES indicators(code) 
    ON DELETE CASCADE
);

-- Activer RLS
ALTER TABLE indicator_dependencies ENABLE ROW LEVEL SECURITY;

-- Politiques RLS
CREATE POLICY "Enable read access for authenticated users on indicator_dependencies"
  ON indicator_dependencies
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert for authenticated users on indicator_dependencies"
  ON indicator_dependencies
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users on indicator_dependencies"
  ON indicator_dependencies
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Enable delete for authenticated users on indicator_dependencies"
  ON indicator_dependencies
  FOR DELETE
  TO authenticated
  USING (true);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_indicator_dependencies_active 
  ON indicator_dependencies(is_active);

CREATE INDEX IF NOT EXISTS idx_indicator_dependencies_dependances 
  ON indicator_dependencies USING gin(dependances);

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_indicator_dependencies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_indicator_dependencies_updated_at
  BEFORE UPDATE ON indicator_dependencies
  FOR EACH ROW
  EXECUTE FUNCTION update_indicator_dependencies_updated_at();

-- Fonction utilitaire pour récupérer tous les indicateurs calculés actifs
CREATE OR REPLACE FUNCTION get_calculated_indicators_config()
RETURNS TABLE (
  indicator_code text,
  indicator_name text,
  dependances text[],
  methode_calcul text,
  description text,
  is_active boolean,
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    id.indicator_code,
    i.name as indicator_name,
    id.dependances,
    id.methode_calcul,
    id.description,
    id.is_active,
    id.created_at
  FROM indicator_dependencies id
  JOIN indicators i ON i.code = id.indicator_code
  WHERE id.is_active = true
  ORDER BY id.created_at;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour vérifier les dépendances circulaires
CREATE OR REPLACE FUNCTION check_circular_dependencies(
  p_indicator_code text,
  p_dependances text[]
) RETURNS boolean AS $$
DECLARE
  dep_code text;
  sub_deps text[];
BEGIN
  -- Vérifier chaque dépendance
  FOREACH dep_code IN ARRAY p_dependances
  LOOP
    -- Si une dépendance est l'indicateur lui-même, c'est circulaire
    IF dep_code = p_indicator_code THEN
      RETURN false;
    END IF;
    
    -- Vérifier les sous-dépendances
    SELECT dependances INTO sub_deps
    FROM indicator_dependencies
    WHERE indicator_code = dep_code;
    
    IF sub_deps IS NOT NULL AND array_length(sub_deps, 1) > 0 THEN
      -- Récursion pour vérifier les sous-dépendances
      IF p_indicator_code = ANY(sub_deps) THEN
        RETURN false;
      END IF;
    END IF;
  END LOOP;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour ajouter une configuration d'indicateur calculé avec validation
CREATE OR REPLACE FUNCTION add_indicator_dependency_config(
  p_indicator_code text,
  p_dependances text[],
  p_methode_calcul text,
  p_description text DEFAULT NULL
) RETURNS text AS $$
DECLARE
  result_message text;
BEGIN
  -- Vérifier que l'indicateur existe
  IF NOT EXISTS (SELECT 1 FROM indicators WHERE code = p_indicator_code) THEN
    RETURN 'ERREUR: L''indicateur ' || p_indicator_code || ' n''existe pas dans la table indicators';
  END IF;
  
  -- Vérifier que toutes les dépendances existent
  IF NOT (SELECT bool_and(EXISTS(SELECT 1 FROM indicators WHERE code = dep)) 
          FROM unnest(p_dependances) AS dep) THEN
    RETURN 'ERREUR: Une ou plusieurs dépendances n''existent pas dans la table indicators';
  END IF;
  
  -- Vérifier les dépendances circulaires
  IF NOT check_circular_dependencies(p_indicator_code, p_dependances) THEN
    RETURN 'ERREUR: Dépendance circulaire détectée pour l''indicateur ' || p_indicator_code;
  END IF;
  
  -- Insérer ou mettre à jour la configuration
  INSERT INTO indicator_dependencies (
    indicator_code,
    dependances,
    methode_calcul,
    description
  ) VALUES (
    p_indicator_code,
    p_dependances,
    p_methode_calcul,
    p_description
  )
  ON CONFLICT (indicator_code) 
  DO UPDATE SET
    dependances = EXCLUDED.dependances,
    methode_calcul = EXCLUDED.methode_calcul,
    description = EXCLUDED.description,
    updated_at = now();
  
  result_message := 'Configuration ajoutée avec succès pour l''indicateur ' || p_indicator_code;
  RETURN result_message;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour récupérer les indicateurs calculés d'un site
CREATE OR REPLACE FUNCTION get_site_calculated_indicators(
  p_site_name text,
  p_organization_name text
) RETURNS TABLE (
  indicator_code text,
  indicator_name text,
  dependances text[],
  methode_calcul text,
  description text,
  has_config boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.code as indicator_code,
    i.name as indicator_name,
    COALESCE(id.dependances, '{}') as dependances,
    COALESCE(id.methode_calcul, '') as methode_calcul,
    COALESCE(id.description, i.description) as description,
    (id.indicator_code IS NOT NULL) as has_config
  FROM indicators i
  LEFT JOIN indicator_dependencies id ON i.code = id.indicator_code
  WHERE EXISTS (
    SELECT 1 FROM calculated_indicators ci
    WHERE ci.indicator_code = i.code
    AND ci.site_name = p_site_name
    AND ci.organization_name = p_organization_name
  )
  ORDER BY i.name;
END;
$$ LANGUAGE plpgsql;

-- Exemples de données pour tester
-- (Décommentez pour insérer des exemples)

/*
-- Exemple 1: Indicateur de consommation totale
SELECT add_indicator_dependency_config(
  'CONSO_TOTALE',
  ARRAY['CONSO_ELEC', 'CONSO_GAZ'],
  'CONSO_ELEC + CONSO_GAZ',
  'Consommation énergétique totale (électricité + gaz)'
);

-- Exemple 2: Indicateur d'efficacité énergétique
SELECT add_indicator_dependency_config(
  'EFFICACITE_ENERGETIQUE',
  ARRAY['PRODUCTION', 'CONSO_TOTALE'],
  'PRODUCTION / CONSO_TOTALE * 100',
  'Efficacité énergétique en pourcentage (Production / Consommation * 100)'
);

-- Exemple 3: Indicateur de performance moyenne
SELECT add_indicator_dependency_config(
  'PERF_MOYENNE',
  ARRAY['PERF_A', 'PERF_B', 'PERF_C'],
  '(PERF_A + PERF_B + PERF_C) / 3',
  'Performance moyenne de trois indicateurs'
);
*/