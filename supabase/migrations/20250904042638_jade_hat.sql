/*
  # Système d'indicateurs calculés

  1. Nouvelle table
    - `calculated_indicators`
      - `id` (uuid, primary key)
      - `site_name` (text, référence au site)
      - `organization_name` (text, référence à l'organisation)
      - `indicator_code` (text, code de l'indicateur calculé)
      - `dependances` (text[], codes des indicateurs dépendants)
      - `methode_calcul` (text, formule de calcul)
      - `valeur` (numeric, résultat calculé)
      - `periode` (text, type de période)
      - `year` (integer, année)
      - `month` (integer, mois pour période mensuelle)
      - `created_at` et `updated_at` (timestamps)

  2. Fonctions
    - Fonction d'évaluation de formules mathématiques
    - Fonction de calcul des indicateurs dérivés
    - Fonction de mise à jour automatique
    - Triggers pour recalcul automatique

  3. Sécurité
    - RLS activé
    - Politiques pour utilisateurs authentifiés
*/

-- Création de la table calculated_indicators
CREATE TABLE IF NOT EXISTS calculated_indicators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_name text NOT NULL,
  organization_name text NOT NULL,
  indicator_code text NOT NULL,
  dependances text[] NOT NULL DEFAULT '{}',
  methode_calcul text NOT NULL,
  valeur numeric,
  periode text NOT NULL DEFAULT 'mensuel',
  year integer NOT NULL,
  month integer, -- NULL pour période annuelle
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Contraintes
  CONSTRAINT calculated_indicators_periode_check 
    CHECK (periode IN ('mensuel', 'trimestriel', 'annuel')),
  CONSTRAINT calculated_indicators_month_check 
    CHECK ((periode = 'mensuel' AND month BETWEEN 1 AND 12) OR 
           (periode = 'trimestriel' AND month BETWEEN 1 AND 4) OR 
           (periode = 'annuel' AND month IS NULL)),
  CONSTRAINT calculated_indicators_year_check 
    CHECK (year BETWEEN 2000 AND 2100),
    
  -- Index unique pour éviter les doublons
  UNIQUE(site_name, organization_name, indicator_code, periode, year, month)
);

-- Contraintes de clés étrangères
ALTER TABLE calculated_indicators 
  ADD CONSTRAINT calculated_indicators_site_name_fkey 
  FOREIGN KEY (site_name) REFERENCES sites(name) ON DELETE CASCADE;

ALTER TABLE calculated_indicators 
  ADD CONSTRAINT calculated_indicators_organization_name_fkey 
  FOREIGN KEY (organization_name) REFERENCES organizations(name) ON DELETE CASCADE;

ALTER TABLE calculated_indicators 
  ADD CONSTRAINT calculated_indicators_indicator_code_fkey 
  FOREIGN KEY (indicator_code) REFERENCES indicators(code) ON DELETE CASCADE;

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_calculated_indicators_site_org 
  ON calculated_indicators(site_name, organization_name);
CREATE INDEX IF NOT EXISTS idx_calculated_indicators_period 
  ON calculated_indicators(periode, year, month);
CREATE INDEX IF NOT EXISTS idx_calculated_indicators_code 
  ON calculated_indicators(indicator_code);

-- Fonction pour évaluer une formule mathématique simple
CREATE OR REPLACE FUNCTION evaluate_formula(
  formula text,
  variables jsonb
) RETURNS numeric AS $$
DECLARE
  result_formula text;
  var_key text;
  var_value numeric;
  final_result numeric;
BEGIN
  result_formula := formula;
  
  -- Remplacer chaque variable par sa valeur
  FOR var_key IN SELECT jsonb_object_keys(variables)
  LOOP
    var_value := (variables ->> var_key)::numeric;
    -- Remplacer toutes les occurrences de la variable
    result_formula := regexp_replace(result_formula, '\m' || var_key || '\M', var_value::text, 'g');
  END LOOP;
  
  -- Évaluer l'expression mathématique (sécurisé pour les opérations de base)
  BEGIN
    -- Vérifier que la formule ne contient que des caractères autorisés
    IF result_formula !~ '^[0-9\.\+\-\*/\(\)\s]+$' THEN
      RAISE EXCEPTION 'Formule non autorisée: %', result_formula;
    END IF;
    
    -- Utiliser une requête pour évaluer l'expression
    EXECUTE 'SELECT ' || result_formula INTO final_result;
    
    RETURN final_result;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE EXCEPTION 'Erreur lors de l''évaluation de la formule: % -> %', formula, result_formula;
  END;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour calculer un indicateur dérivé
CREATE OR REPLACE FUNCTION calculate_derived_indicator(
  p_site_name text,
  p_organization_name text,
  p_indicator_code text,
  p_year integer,
  p_month integer DEFAULT NULL
) RETURNS numeric AS $$
DECLARE
  calc_record calculated_indicators%ROWTYPE;
  dependency_code text;
  dependency_value numeric;
  variables jsonb := '{}';
  calculated_value numeric;
  period_filter text;
BEGIN
  -- Récupérer la configuration de l'indicateur calculé
  SELECT * INTO calc_record
  FROM calculated_indicators
  WHERE site_name = p_site_name
    AND organization_name = p_organization_name
    AND indicator_code = p_indicator_code
    AND year = p_year
    AND (
      (periode = 'mensuel' AND month = p_month) OR
      (periode = 'annuel' AND month IS NULL)
    );
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Indicateur calculé non trouvé: %', p_indicator_code;
  END IF;
  
  -- Construire le filtre de période pour la requête
  IF calc_record.periode = 'mensuel' THEN
    period_filter := 'period_number = ' || p_month;
  ELSE
    period_filter := 'period_number IS NULL';
  END IF;
  
  -- Récupérer les valeurs des dépendances
  FOREACH dependency_code IN ARRAY calc_record.dependances
  LOOP
    -- Chercher la valeur de la dépendance dans indicator_values
    EXECUTE format('
      SELECT iv.value 
      FROM indicator_values iv
      JOIN collection_periods cp ON iv.period_id = cp.id
      WHERE iv.site_name = $1
        AND iv.organization_name = $2
        AND iv.indicator_code = $3
        AND cp.year = $4
        AND %s
        AND iv.status = ''validated''
      ORDER BY iv.created_at DESC
      LIMIT 1
    ', period_filter)
    INTO dependency_value
    USING p_site_name, p_organization_name, dependency_code, p_year;
    
    -- Si une dépendance n'a pas de valeur, on ne peut pas calculer
    IF dependency_value IS NULL THEN
      RAISE NOTICE 'Dépendance manquante pour %: %', p_indicator_code, dependency_code;
      RETURN NULL;
    END IF;
    
    -- Ajouter la variable au JSON
    variables := jsonb_set(variables, ARRAY[dependency_code], to_jsonb(dependency_value));
  END LOOP;
  
  -- Calculer la valeur avec la formule
  calculated_value := evaluate_formula(calc_record.methode_calcul, variables);
  
  -- Mettre à jour la valeur dans la table
  UPDATE calculated_indicators
  SET valeur = calculated_value,
      updated_at = now()
  WHERE id = calc_record.id;
  
  RETURN calculated_value;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour mettre à jour tous les indicateurs calculés
CREATE OR REPLACE FUNCTION update_all_calculated_indicators(
  p_site_name text DEFAULT NULL,
  p_organization_name text DEFAULT NULL,
  p_year integer DEFAULT NULL
) RETURNS TABLE(
  indicator_code text,
  calculated_value numeric,
  status text
) AS $$
DECLARE
  calc_record calculated_indicators%ROWTYPE;
  result_value numeric;
BEGIN
  -- Parcourir tous les indicateurs calculés (avec filtres optionnels)
  FOR calc_record IN
    SELECT * FROM calculated_indicators
    WHERE (p_site_name IS NULL OR site_name = p_site_name)
      AND (p_organization_name IS NULL OR organization_name = p_organization_name)
      AND (p_year IS NULL OR year = p_year)
    ORDER BY site_name, organization_name, indicator_code
  LOOP
    BEGIN
      -- Calculer l'indicateur
      result_value := calculate_derived_indicator(
        calc_record.site_name,
        calc_record.organization_name,
        calc_record.indicator_code,
        calc_record.year,
        calc_record.month
      );
      
      -- Retourner le résultat
      indicator_code := calc_record.indicator_code;
      calculated_value := result_value;
      status := CASE 
        WHEN result_value IS NOT NULL THEN 'calculé'
        ELSE 'dépendances manquantes'
      END;
      
      RETURN NEXT;
      
    EXCEPTION
      WHEN OTHERS THEN
        -- En cas d'erreur, retourner l'erreur
        indicator_code := calc_record.indicator_code;
        calculated_value := NULL;
        status := 'erreur: ' || SQLERRM;
        RETURN NEXT;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour ajouter un nouvel indicateur calculé
CREATE OR REPLACE FUNCTION add_calculated_indicator(
  p_site_name text,
  p_organization_name text,
  p_indicator_code text,
  p_dependances text[],
  p_methode_calcul text,
  p_periode text DEFAULT 'mensuel',
  p_year integer DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::integer
) RETURNS uuid AS $$
DECLARE
  new_id uuid;
  month_val integer;
BEGIN
  -- Valider les paramètres
  IF p_periode NOT IN ('mensuel', 'trimestriel', 'annuel') THEN
    RAISE EXCEPTION 'Période non valide: %', p_periode;
  END IF;
  
  -- Vérifier que l'indicateur existe
  IF NOT EXISTS (SELECT 1 FROM indicators WHERE code = p_indicator_code) THEN
    RAISE EXCEPTION 'Indicateur non trouvé: %', p_indicator_code;
  END IF;
  
  -- Vérifier que toutes les dépendances existent
  IF EXISTS (
    SELECT 1 FROM unnest(p_dependances) AS dep(code)
    WHERE NOT EXISTS (SELECT 1 FROM indicators WHERE code = dep.code)
  ) THEN
    RAISE EXCEPTION 'Une ou plusieurs dépendances n''existent pas';
  END IF;
  
  -- Pour les indicateurs mensuels, créer 12 enregistrements
  IF p_periode = 'mensuel' THEN
    FOR month_val IN 1..12 LOOP
      INSERT INTO calculated_indicators (
        site_name,
        organization_name,
        indicator_code,
        dependances,
        methode_calcul,
        periode,
        year,
        month
      ) VALUES (
        p_site_name,
        p_organization_name,
        p_indicator_code,
        p_dependances,
        p_methode_calcul,
        p_periode,
        p_year,
        month_val
      )
      ON CONFLICT (site_name, organization_name, indicator_code, periode, year, month) 
      DO UPDATE SET
        dependances = EXCLUDED.dependances,
        methode_calcul = EXCLUDED.methode_calcul,
        updated_at = now()
      RETURNING id INTO new_id;
    END LOOP;
  ELSE
    -- Pour les autres périodes, créer un seul enregistrement
    INSERT INTO calculated_indicators (
      site_name,
      organization_name,
      indicator_code,
      dependances,
      methode_calcul,
      periode,
      year,
      month
    ) VALUES (
      p_site_name,
      p_organization_name,
      p_indicator_code,
      p_dependances,
      p_methode_calcul,
      p_periode,
      p_year,
      CASE WHEN p_periode = 'annuel' THEN NULL ELSE 1 END
    )
    ON CONFLICT (site_name, organization_name, indicator_code, periode, year, month) 
    DO UPDATE SET
      dependances = EXCLUDED.dependances,
      methode_calcul = EXCLUDED.methode_calcul,
      updated_at = now()
    RETURNING id INTO new_id;
  END IF;
  
  RETURN new_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour recalculer automatiquement quand les valeurs changent
CREATE OR REPLACE FUNCTION trigger_recalculate_derived_indicators()
RETURNS trigger AS $$
DECLARE
  affected_indicators calculated_indicators%ROWTYPE;
BEGIN
  -- Trouver tous les indicateurs calculés qui dépendent de l'indicateur modifié
  FOR affected_indicators IN
    SELECT DISTINCT ci.*
    FROM calculated_indicators ci
    WHERE NEW.indicator_code = ANY(ci.dependances)
      AND ci.site_name = NEW.site_name
      AND ci.organization_name = NEW.organization_name
  LOOP
    -- Recalculer chaque indicateur affecté
    PERFORM calculate_derived_indicator(
      affected_indicators.site_name,
      affected_indicators.organization_name,
      affected_indicators.indicator_code,
      affected_indicators.year,
      affected_indicators.month
    );
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger sur indicator_values
CREATE TRIGGER trigger_recalculate_on_indicator_change
  AFTER INSERT OR UPDATE OF value ON indicator_values
  FOR EACH ROW
  EXECUTE FUNCTION trigger_recalculate_derived_indicators();

-- Fonction utilitaire pour obtenir la valeur d'un indicateur pour une période donnée
CREATE OR REPLACE FUNCTION get_indicator_value_for_period(
  p_site_name text,
  p_organization_name text,
  p_indicator_code text,
  p_year integer,
  p_month integer DEFAULT NULL
) RETURNS numeric AS $$
DECLARE
  indicator_value numeric;
BEGIN
  -- Construire la requête selon le type de période
  IF p_month IS NOT NULL THEN
    -- Période mensuelle
    SELECT iv.value INTO indicator_value
    FROM indicator_values iv
    JOIN collection_periods cp ON iv.period_id = cp.id
    WHERE iv.site_name = p_site_name
      AND iv.organization_name = p_organization_name
      AND iv.indicator_code = p_indicator_code
      AND cp.year = p_year
      AND cp.period_number = p_month
      AND cp.period_type = 'month'
      AND iv.status = 'validated'
    ORDER BY iv.created_at DESC
    LIMIT 1;
  ELSE
    -- Période annuelle
    SELECT iv.value INTO indicator_value
    FROM indicator_values iv
    JOIN collection_periods cp ON iv.period_id = cp.id
    WHERE iv.site_name = p_site_name
      AND iv.organization_name = p_organization_name
      AND iv.indicator_code = p_indicator_code
      AND cp.year = p_year
      AND cp.period_type = 'year'
      AND iv.status = 'validated'
    ORDER BY iv.created_at DESC
    LIMIT 1;
  END IF;
  
  RETURN indicator_value;
END;
$$ LANGUAGE plpgsql;

-- Fonction améliorée pour calculer un indicateur dérivé
CREATE OR REPLACE FUNCTION calculate_derived_indicator(
  p_site_name text,
  p_organization_name text,
  p_indicator_code text,
  p_year integer,
  p_month integer DEFAULT NULL
) RETURNS numeric AS $$
DECLARE
  calc_record calculated_indicators%ROWTYPE;
  dependency_code text;
  dependency_value numeric;
  variables jsonb := '{}';
  calculated_value numeric;
  formula_to_evaluate text;
BEGIN
  -- Récupérer la configuration de l'indicateur calculé
  SELECT * INTO calc_record
  FROM calculated_indicators
  WHERE site_name = p_site_name
    AND organization_name = p_organization_name
    AND indicator_code = p_indicator_code
    AND year = p_year
    AND (
      (periode = 'mensuel' AND month = p_month) OR
      (periode = 'annuel' AND month IS NULL)
    );
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Configuration d''indicateur calculé non trouvée: %', p_indicator_code;
  END IF;
  
  -- Récupérer les valeurs des dépendances
  FOREACH dependency_code IN ARRAY calc_record.dependances
  LOOP
    dependency_value := get_indicator_value_for_period(
      p_site_name,
      p_organization_name,
      dependency_code,
      p_year,
      p_month
    );
    
    -- Si une dépendance n'a pas de valeur, on ne peut pas calculer
    IF dependency_value IS NULL THEN
      RAISE NOTICE 'Dépendance manquante pour % (période %/%): %', 
        p_indicator_code, p_year, COALESCE(p_month::text, 'annuel'), dependency_code;
      RETURN NULL;
    END IF;
    
    -- Ajouter la variable au JSON pour l'évaluation
    variables := jsonb_set(variables, ARRAY[dependency_code], to_jsonb(dependency_value));
  END LOOP;
  
  -- Préparer la formule pour l'évaluation
  formula_to_evaluate := calc_record.methode_calcul;
  
  -- Remplacer les codes d'indicateurs par leurs valeurs dans la formule
  FOREACH dependency_code IN ARRAY calc_record.dependances
  LOOP
    dependency_value := (variables ->> dependency_code)::numeric;
    formula_to_evaluate := regexp_replace(
      formula_to_evaluate, 
      '\m' || dependency_code || '\M', 
      dependency_value::text, 
      'g'
    );
  END LOOP;
  
  -- Évaluer la formule
  BEGIN
    -- Vérifier que la formule ne contient que des caractères autorisés
    IF formula_to_evaluate !~ '^[0-9\.\+\-\*/\(\)\s]+$' THEN
      RAISE EXCEPTION 'Formule non sécurisée après substitution: %', formula_to_evaluate;
    END IF;
    
    -- Évaluer l'expression
    EXECUTE 'SELECT ' || formula_to_evaluate INTO calculated_value;
    
  EXCEPTION
    WHEN OTHERS THEN
      RAISE EXCEPTION 'Erreur lors du calcul de %: formule=%, erreur=%', 
        p_indicator_code, formula_to_evaluate, SQLERRM;
  END;
  
  -- Mettre à jour la valeur calculée
  UPDATE calculated_indicators
  SET valeur = calculated_value,
      updated_at = now()
  WHERE id = calc_record.id;
  
  RETURN calculated_value;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour recalculer tous les indicateurs d'un site/organisation
CREATE OR REPLACE FUNCTION recalculate_all_indicators(
  p_site_name text,
  p_organization_name text,
  p_year integer
) RETURNS TABLE(
  indicator_code text,
  periode text,
  month_period integer,
  calculated_value numeric,
  status text
) AS $$
DECLARE
  calc_record calculated_indicators%ROWTYPE;
  result_value numeric;
BEGIN
  -- Parcourir tous les indicateurs calculés pour ce site/organisation/année
  FOR calc_record IN
    SELECT * FROM calculated_indicators
    WHERE site_name = p_site_name
      AND organization_name = p_organization_name
      AND year = p_year
    ORDER BY indicator_code, periode, month
  LOOP
    BEGIN
      -- Calculer l'indicateur
      result_value := calculate_derived_indicator(
        calc_record.site_name,
        calc_record.organization_name,
        calc_record.indicator_code,
        calc_record.year,
        calc_record.month
      );
      
      -- Retourner le résultat
      indicator_code := calc_record.indicator_code;
      periode := calc_record.periode;
      month_period := calc_record.month;
      calculated_value := result_value;
      status := CASE 
        WHEN result_value IS NOT NULL THEN 'calculé'
        ELSE 'dépendances manquantes'
      END;
      
      RETURN NEXT;
      
    EXCEPTION
      WHEN OTHERS THEN
        -- En cas d'erreur, retourner l'erreur
        indicator_code := calc_record.indicator_code;
        periode := calc_record.periode;
        month_period := calc_record.month;
        calculated_value := NULL;
        status := 'erreur: ' || SQLERRM;
        RETURN NEXT;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_calculated_indicators_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_calculated_indicators_updated_at
  BEFORE UPDATE ON calculated_indicators
  FOR EACH ROW
  EXECUTE FUNCTION update_calculated_indicators_updated_at();

-- Activer RLS
ALTER TABLE calculated_indicators ENABLE ROW LEVEL SECURITY;

-- Politiques RLS
CREATE POLICY "Enable read access for authenticated users on calculated_indicators"
  ON calculated_indicators
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert for authenticated users on calculated_indicators"
  ON calculated_indicators
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users on calculated_indicators"
  ON calculated_indicators
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable delete for authenticated users on calculated_indicators"
  ON calculated_indicators
  FOR DELETE
  TO authenticated
  USING (true);

-- Fonction d'exemple pour créer un indicateur calculé
-- Exemple: Indicateur C = (A + B) / 2
/*
SELECT add_calculated_indicator(
  'Site Principal',                    -- site_name
  'Mon Organisation',                  -- organization_name
  'INDIC_C',                          -- indicator_code
  ARRAY['INDIC_A', 'INDIC_B'],        -- dependances
  '(INDIC_A + INDIC_B) / 2',          -- methode_calcul
  'mensuel',                          -- periode
  2025                                -- year
);

-- Pour recalculer tous les indicateurs d'un site
SELECT * FROM recalculate_all_indicators('Site Principal', 'Mon Organisation', 2025);

-- Pour calculer un indicateur spécifique pour janvier 2025
SELECT calculate_derived_indicator('Site Principal', 'Mon Organisation', 'INDIC_C', 2025, 1);
*/