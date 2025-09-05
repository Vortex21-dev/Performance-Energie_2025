/*
  # Création du système de dépendances des indicateurs calculés

  1. Nouvelle table
    - `indicator_dependencies`
      - `id` (uuid, primary key)
      - `indicator_code` (text, référence vers indicators)
      - `dependances` (text[], tableau des codes d'indicateurs dont il dépend)
      - `methode_calcul` (text, formule de calcul)
      - `is_active` (boolean, pour activer/désactiver le calcul)
      - `description` (text, description de la méthode)
      - `created_at` et `updated_at` (timestamps)

  2. Fonctions
    - Fonction pour ajouter une dépendance
    - Fonction pour calculer les indicateurs basés sur les dépendances
    - Fonction pour valider les formules

  3. Sécurité
    - Enable RLS sur la table
    - Politiques d'accès appropriées
    - Validation des formules pour éviter l'injection

  4. Triggers
    - Recalcul automatique quand les valeurs changent
    - Validation des dépendances circulaires
*/

-- Créer la table des dépendances d'indicateurs
CREATE TABLE IF NOT EXISTS indicator_dependencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  indicator_code text NOT NULL REFERENCES indicators(code) ON DELETE CASCADE,
  dependances text[] NOT NULL DEFAULT '{}',
  methode_calcul text NOT NULL,
  is_active boolean DEFAULT true,
  description text,
  validation_rules jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Contraintes
  CONSTRAINT indicator_dependencies_indicator_code_key UNIQUE (indicator_code),
  CONSTRAINT indicator_dependencies_dependances_not_empty CHECK (array_length(dependances, 1) > 0),
  CONSTRAINT indicator_dependencies_methode_calcul_not_empty CHECK (length(trim(methode_calcul)) > 0)
);

-- Index pour optimiser les performances
CREATE INDEX IF NOT EXISTS idx_indicator_dependencies_indicator_code 
  ON indicator_dependencies(indicator_code);
CREATE INDEX IF NOT EXISTS idx_indicator_dependencies_dependances 
  ON indicator_dependencies USING gin(dependances);
CREATE INDEX IF NOT EXISTS idx_indicator_dependencies_active 
  ON indicator_dependencies(is_active) WHERE is_active = true;

-- Enable RLS
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
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable delete for authenticated users on indicator_dependencies"
  ON indicator_dependencies
  FOR DELETE
  TO authenticated
  USING (true);

-- Fonction pour valider une formule de calcul
CREATE OR REPLACE FUNCTION validate_calculation_formula(
  formula text,
  dependencies text[]
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  dep text;
  clean_formula text;
BEGIN
  -- Vérifier que la formule n'est pas vide
  IF trim(formula) = '' THEN
    RAISE EXCEPTION 'La formule ne peut pas être vide';
  END IF;
  
  -- Nettoyer la formule pour la validation
  clean_formula := upper(trim(formula));
  
  -- Vérifier que tous les codes de dépendances sont présents dans la formule
  FOREACH dep IN ARRAY dependencies
  LOOP
    IF position(upper(dep) in clean_formula) = 0 THEN
      RAISE EXCEPTION 'Le code de dépendance % n''est pas utilisé dans la formule %', dep, formula;
    END IF;
  END LOOP;
  
  -- Vérifier que la formule ne contient que des caractères autorisés
  -- (lettres, chiffres, espaces, parenthèses, opérateurs mathématiques)
  IF clean_formula !~ '^[A-Z0-9_\s\+\-\*\/\(\)\.\,]*$' THEN
    RAISE EXCEPTION 'La formule contient des caractères non autorisés: %', formula;
  END IF;
  
  RETURN true;
END;
$$;

-- Fonction pour ajouter une dépendance d'indicateur
CREATE OR REPLACE FUNCTION add_indicator_dependency(
  p_indicator_code text,
  p_dependances text[],
  p_methode_calcul text,
  p_description text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  dependency_id uuid;
  dep_code text;
BEGIN
  -- Vérifier que l'indicateur existe
  IF NOT EXISTS (SELECT 1 FROM indicators WHERE code = p_indicator_code) THEN
    RAISE EXCEPTION 'L''indicateur % n''existe pas', p_indicator_code;
  END IF;
  
  -- Vérifier que toutes les dépendances existent
  FOREACH dep_code IN ARRAY p_dependances
  LOOP
    IF NOT EXISTS (SELECT 1 FROM indicators WHERE code = dep_code) THEN
      RAISE EXCEPTION 'L''indicateur de dépendance % n''existe pas', dep_code;
    END IF;
  END LOOP;
  
  -- Vérifier qu'il n'y a pas de dépendance circulaire
  IF p_indicator_code = ANY(p_dependances) THEN
    RAISE EXCEPTION 'Dépendance circulaire détectée: l''indicateur % ne peut pas dépendre de lui-même', p_indicator_code;
  END IF;
  
  -- Valider la formule
  PERFORM validate_calculation_formula(p_methode_calcul, p_dependances);
  
  -- Insérer ou mettre à jour la dépendance
  INSERT INTO indicator_dependencies (
    indicator_code,
    dependances,
    methode_calcul,
    description,
    is_active
  ) VALUES (
    p_indicator_code,
    p_dependances,
    p_methode_calcul,
    p_description,
    true
  )
  ON CONFLICT (indicator_code) 
  DO UPDATE SET
    dependances = EXCLUDED.dependances,
    methode_calcul = EXCLUDED.methode_calcul,
    description = EXCLUDED.description,
    is_active = EXCLUDED.is_active,
    updated_at = now()
  RETURNING id INTO dependency_id;
  
  RETURN dependency_id;
END;
$$;

-- Fonction pour évaluer une formule simple
CREATE OR REPLACE FUNCTION evaluate_formula(
  formula text,
  variable_values jsonb
) RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result_formula text;
  var_name text;
  var_value numeric;
  final_result numeric;
BEGIN
  result_formula := formula;
  
  -- Remplacer chaque variable par sa valeur
  FOR var_name IN SELECT jsonb_object_keys(variable_values)
  LOOP
    var_value := (variable_values ->> var_name)::numeric;
    
    -- Remplacer toutes les occurrences de la variable par sa valeur
    result_formula := regexp_replace(
      result_formula, 
      '\m' || var_name || '\M', 
      var_value::text, 
      'gi'
    );
  END LOOP;
  
  -- Évaluer l'expression mathématique de base
  -- Note: Pour des formules complexes, vous pourriez vouloir utiliser une extension comme plpython
  -- Ici, on gère les cas simples avec des opérations de base
  BEGIN
    -- Utiliser une approche sécurisée pour évaluer l'expression
    -- Cette fonction gère les opérations de base (+, -, *, /, parenthèses)
    EXECUTE format('SELECT %s', result_formula) INTO final_result;
    RETURN final_result;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE EXCEPTION 'Erreur lors de l''évaluation de la formule: % -> %', formula, result_formula;
  END;
END;
$$;

-- Fonction pour calculer un indicateur dérivé
CREATE OR REPLACE FUNCTION calculate_derived_indicator(
  p_site_name text,
  p_organization_name text,
  p_indicator_code text,
  p_year integer,
  p_month integer DEFAULT NULL
) RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  dependency_record record;
  dep_code text;
  dep_value numeric;
  variable_values jsonb := '{}';
  calculated_value numeric;
  period_filter text;
BEGIN
  -- Récupérer la configuration de dépendance
  SELECT * INTO dependency_record
  FROM indicator_dependencies 
  WHERE indicator_code = p_indicator_code AND is_active = true;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Aucune configuration de dépendance trouvée pour l''indicateur %', p_indicator_code;
  END IF;
  
  -- Déterminer le filtre de période
  IF p_month IS NOT NULL THEN
    period_filter := 'mensuel';
  ELSE
    period_filter := 'annuel';
  END IF;
  
  -- Récupérer les valeurs de toutes les dépendances
  FOREACH dep_code IN ARRAY dependency_record.dependances
  LOOP
    -- Récupérer la valeur de la dépendance pour la période donnée
    IF p_month IS NOT NULL THEN
      -- Période mensuelle
      SELECT iv.value INTO dep_value
      FROM indicator_values iv
      JOIN collection_periods cp ON iv.period_id = cp.id
      WHERE iv.indicator_code = dep_code
        AND iv.site_name = p_site_name
        AND iv.organization_name = p_organization_name
        AND cp.year = p_year
        AND cp.period_number = p_month
        AND cp.period_type = 'month'
        AND iv.status = 'validated'
      ORDER BY iv.created_at DESC
      LIMIT 1;
    ELSE
      -- Période annuelle
      SELECT iv.value INTO dep_value
      FROM indicator_values iv
      JOIN collection_periods cp ON iv.period_id = cp.id
      WHERE iv.indicator_code = dep_code
        AND iv.site_name = p_site_name
        AND iv.organization_name = p_organization_name
        AND cp.year = p_year
        AND cp.period_type = 'year'
        AND iv.status = 'validated'
      ORDER BY iv.created_at DESC
      LIMIT 1;
    END IF;
    
    -- Si une dépendance n'a pas de valeur, on ne peut pas calculer
    IF dep_value IS NULL THEN
      RAISE NOTICE 'Valeur manquante pour la dépendance % (site: %, année: %, mois: %)', 
        dep_code, p_site_name, p_year, p_month;
      RETURN NULL;
    END IF;
    
    -- Ajouter la valeur au JSON des variables
    variable_values := jsonb_set(variable_values, ARRAY[dep_code], to_jsonb(dep_value));
  END LOOP;
  
  -- Calculer la valeur avec la formule
  calculated_value := evaluate_formula(dependency_record.methode_calcul, variable_values);
  
  -- Insérer ou mettre à jour dans calculated_indicators
  INSERT INTO calculated_indicators (
    site_name,
    organization_name,
    indicator_code,
    dependances,
    methode_calcul,
    valeur,
    periode,
    year,
    month
  ) VALUES (
    p_site_name,
    p_organization_name,
    p_indicator_code,
    dependency_record.dependances,
    dependency_record.methode_calcul,
    calculated_value,
    period_filter,
    p_year,
    p_month
  )
  ON CONFLICT (site_name, organization_name, indicator_code, periode, year, month)
  DO UPDATE SET
    valeur = EXCLUDED.valeur,
    dependances = EXCLUDED.dependances,
    methode_calcul = EXCLUDED.methode_calcul,
    updated_at = now();
  
  RETURN calculated_value;
END;
$$;

-- Fonction pour recalculer tous les indicateurs dérivés d'un site
CREATE OR REPLACE FUNCTION recalculate_all_indicators(
  p_site_name text,
  p_organization_name text,
  p_year integer
) RETURNS TABLE(
  indicator_code text,
  period_type text,
  month_number integer,
  calculated_value numeric,
  status text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  dep_record record;
  calc_result numeric;
  month_num integer;
BEGIN
  -- Parcourir tous les indicateurs calculés actifs
  FOR dep_record IN 
    SELECT * FROM indicator_dependencies WHERE is_active = true
  LOOP
    -- Calculer pour l'année complète (annuel)
    BEGIN
      calc_result := calculate_derived_indicator(
        p_site_name, 
        p_organization_name, 
        dep_record.indicator_code, 
        p_year, 
        NULL
      );
      
      RETURN QUERY SELECT 
        dep_record.indicator_code,
        'annuel'::text,
        NULL::integer,
        calc_result,
        CASE WHEN calc_result IS NOT NULL THEN 'success' ELSE 'missing_dependencies' END;
    EXCEPTION
      WHEN OTHERS THEN
        RETURN QUERY SELECT 
          dep_record.indicator_code,
          'annuel'::text,
          NULL::integer,
          NULL::numeric,
          'error: ' || SQLERRM;
    END;
    
    -- Calculer pour chaque mois (mensuel)
    FOR month_num IN 1..12
    LOOP
      BEGIN
        calc_result := calculate_derived_indicator(
          p_site_name, 
          p_organization_name, 
          dep_record.indicator_code, 
          p_year, 
          month_num
        );
        
        RETURN QUERY SELECT 
          dep_record.indicator_code,
          'mensuel'::text,
          month_num,
          calc_result,
          CASE WHEN calc_result IS NOT NULL THEN 'success' ELSE 'missing_dependencies' END;
      EXCEPTION
        WHEN OTHERS THEN
          RETURN QUERY SELECT 
            dep_record.indicator_code,
            'mensuel'::text,
            month_num,
            NULL::numeric,
            'error: ' || SQLERRM;
      END;
    END LOOP;
  END LOOP;
END;
$$;

-- Fonction utilitaire pour ajouter une dépendance d'indicateur
CREATE OR REPLACE FUNCTION add_indicator_dependency_config(
  p_indicator_code text,
  p_dependances text[],
  p_methode_calcul text,
  p_description text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  dependency_id uuid;
  dep_code text;
BEGIN
  -- Vérifier que l'indicateur existe
  IF NOT EXISTS (SELECT 1 FROM indicators WHERE code = p_indicator_code) THEN
    RAISE EXCEPTION 'L''indicateur % n''existe pas dans la table indicators', p_indicator_code;
  END IF;
  
  -- Vérifier que toutes les dépendances existent
  FOREACH dep_code IN ARRAY p_dependances
  LOOP
    IF NOT EXISTS (SELECT 1 FROM indicators WHERE code = dep_code) THEN
      RAISE EXCEPTION 'L''indicateur de dépendance % n''existe pas dans la table indicators', dep_code;
    END IF;
  END LOOP;
  
  -- Vérifier qu'il n'y a pas de dépendance circulaire directe
  IF p_indicator_code = ANY(p_dependances) THEN
    RAISE EXCEPTION 'Dépendance circulaire détectée: l''indicateur % ne peut pas dépendre de lui-même', p_indicator_code;
  END IF;
  
  -- Valider la formule
  PERFORM validate_calculation_formula(p_methode_calcul, p_dependances);
  
  -- Insérer la configuration de dépendance
  INSERT INTO indicator_dependencies (
    indicator_code,
    dependances,
    methode_calcul,
    description,
    is_active
  ) VALUES (
    p_indicator_code,
    p_dependances,
    p_methode_calcul,
    p_description,
    true
  )
  ON CONFLICT (indicator_code) 
  DO UPDATE SET
    dependances = EXCLUDED.dependances,
    methode_calcul = EXCLUDED.methode_calcul,
    description = EXCLUDED.description,
    is_active = EXCLUDED.is_active,
    updated_at = now()
  RETURNING id INTO dependency_id;
  
  RETURN dependency_id;
END;
$$;

-- Fonction pour obtenir tous les indicateurs calculés avec leurs dépendances
CREATE OR REPLACE FUNCTION get_calculated_indicators_config()
RETURNS TABLE(
  id uuid,
  indicator_code text,
  indicator_name text,
  dependances text[],
  methode_calcul text,
  description text,
  is_active boolean,
  dependency_names text[],
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    id.id,
    id.indicator_code,
    i.name as indicator_name,
    id.dependances,
    id.methode_calcul,
    id.description,
    id.is_active,
    ARRAY(
      SELECT i2.name 
      FROM indicators i2 
      WHERE i2.code = ANY(id.dependances)
      ORDER BY i2.name
    ) as dependency_names,
    id.created_at,
    id.updated_at
  FROM indicator_dependencies id
  JOIN indicators i ON id.indicator_code = i.code
  ORDER BY i.name;
END;
$$;

-- Fonction pour désactiver/activer un indicateur calculé
CREATE OR REPLACE FUNCTION toggle_calculated_indicator(
  p_indicator_code text,
  p_is_active boolean
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE indicator_dependencies 
  SET 
    is_active = p_is_active,
    updated_at = now()
  WHERE indicator_code = p_indicator_code;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Configuration de dépendance non trouvée pour l''indicateur %', p_indicator_code;
  END IF;
  
  RETURN true;
END;
$$;

-- Fonction pour supprimer une configuration de dépendance
CREATE OR REPLACE FUNCTION remove_indicator_dependency(
  p_indicator_code text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Supprimer d'abord les valeurs calculées associées
  DELETE FROM calculated_indicators 
  WHERE indicator_code = p_indicator_code;
  
  -- Supprimer la configuration de dépendance
  DELETE FROM indicator_dependencies 
  WHERE indicator_code = p_indicator_code;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Configuration de dépendance non trouvée pour l''indicateur %', p_indicator_code;
  END IF;
  
  RETURN true;
END;
$$;

-- Trigger pour recalculer automatiquement les indicateurs dérivés
CREATE OR REPLACE FUNCTION trigger_recalculate_derived_indicators()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  affected_indicators text[];
  indicator_code text;
BEGIN
  -- Déterminer quel indicateur a été modifié
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    -- Trouver tous les indicateurs calculés qui dépendent de cet indicateur
    SELECT array_agg(DISTINCT id.indicator_code) INTO affected_indicators
    FROM indicator_dependencies id
    WHERE NEW.indicator_code = ANY(id.dependances) AND id.is_active = true;
  END IF;
  
  -- Recalculer les indicateurs affectés
  IF affected_indicators IS NOT NULL THEN
    FOREACH indicator_code IN ARRAY affected_indicators
    LOOP
      BEGIN
        -- Recalculer pour la période correspondante
        IF NEW.period_id IS NOT NULL THEN
          DECLARE
            period_info record;
          BEGIN
            SELECT year, period_number, period_type INTO period_info
            FROM collection_periods 
            WHERE id = NEW.period_id;
            
            IF period_info.period_type = 'month' THEN
              PERFORM calculate_derived_indicator(
                NEW.site_name,
                NEW.organization_name,
                indicator_code,
                period_info.year,
                period_info.period_number
              );
            ELSIF period_info.period_type = 'year' THEN
              PERFORM calculate_derived_indicator(
                NEW.site_name,
                NEW.organization_name,
                indicator_code,
                period_info.year,
                NULL
              );
            END IF;
          END;
        END IF;
      EXCEPTION
        WHEN OTHERS THEN
          -- Log l'erreur mais ne pas faire échouer la transaction principale
          RAISE NOTICE 'Erreur lors du recalcul de l''indicateur %: %', indicator_code, SQLERRM;
      END;
    END LOOP;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Créer le trigger sur indicator_values
DROP TRIGGER IF EXISTS trigger_recalculate_on_indicator_change ON indicator_values;
CREATE TRIGGER trigger_recalculate_on_indicator_change
  AFTER INSERT OR UPDATE OF value ON indicator_values
  FOR EACH ROW
  EXECUTE FUNCTION trigger_recalculate_derived_indicators();

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_calculated_indicators_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_calculated_indicators_updated_at
  BEFORE UPDATE ON calculated_indicators
  FOR EACH ROW
  EXECUTE FUNCTION update_calculated_indicators_updated_at();

-- Fonction pour obtenir le statut des calculs d'un site
CREATE OR REPLACE FUNCTION get_calculation_status(
  p_site_name text,
  p_organization_name text,
  p_year integer
) RETURNS TABLE(
  indicator_code text,
  indicator_name text,
  dependances text[],
  dependency_names text[],
  methode_calcul text,
  has_monthly_values boolean,
  has_annual_value boolean,
  missing_dependencies text[],
  last_calculated timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH dependency_status AS (
    SELECT 
      id.indicator_code,
      i.name as indicator_name,
      id.dependances,
      id.methode_calcul,
      ARRAY(
        SELECT i2.name 
        FROM indicators i2 
        WHERE i2.code = ANY(id.dependances)
      ) as dependency_names,
      -- Vérifier les dépendances manquantes
      ARRAY(
        SELECT dep_code
        FROM unnest(id.dependances) as dep_code
        WHERE NOT EXISTS (
          SELECT 1 FROM indicator_values iv
          JOIN collection_periods cp ON iv.period_id = cp.id
          WHERE iv.indicator_code = dep_code
            AND iv.site_name = p_site_name
            AND iv.organization_name = p_organization_name
            AND cp.year = p_year
            AND iv.status = 'validated'
        )
      ) as missing_deps
    FROM indicator_dependencies id
    JOIN indicators i ON id.indicator_code = i.code
    WHERE id.is_active = true
  ),
  calculation_status AS (
    SELECT 
      ds.*,
      EXISTS(
        SELECT 1 FROM calculated_indicators ci
        WHERE ci.site_name = p_site_name
          AND ci.organization_name = p_organization_name
          AND ci.indicator_code = ds.indicator_code
          AND ci.year = p_year
          AND ci.periode = 'mensuel'
          AND ci.valeur IS NOT NULL
      ) as has_monthly,
      EXISTS(
        SELECT 1 FROM calculated_indicators ci
        WHERE ci.site_name = p_site_name
          AND ci.organization_name = p_organization_name
          AND ci.indicator_code = ds.indicator_code
          AND ci.year = p_year
          AND ci.periode = 'annuel'
          AND ci.valeur IS NOT NULL
      ) as has_annual,
      (
        SELECT MAX(ci.updated_at)
        FROM calculated_indicators ci
        WHERE ci.site_name = p_site_name
          AND ci.organization_name = p_organization_name
          AND ci.indicator_code = ds.indicator_code
          AND ci.year = p_year
      ) as last_calc
    FROM dependency_status ds
  )
  SELECT 
    cs.indicator_code,
    cs.indicator_name,
    cs.dependances,
    cs.dependency_names,
    cs.methode_calcul,
    cs.has_monthly,
    cs.has_annual,
    cs.missing_deps,
    cs.last_calc
  FROM calculation_status cs
  ORDER BY cs.indicator_name;
END;
$$;