/*
  # Création de la table data_consolidate_site_prime avec logique de consolidation

  1. Nouvelle table
    - `data_consolidate_site_prime` : Table de consolidation avec logique basée sur la formule
    - Mêmes attributs que `consolidated_global_indicator_values` mais avec `valeur` au lieu de `value`
    - Logique de consolidation intelligente selon la formule de l'indicateur

  2. Types de consolidation
    - Somme : Addition des valeurs (par défaut)
    - Moyenne : Moyenne des valeurs (ratios, pourcentages, efficacités)
    - Somme du dernier mois : Addition du dernier mois disponible de chaque site

  3. Automatisation
    - Triggers automatiques pour la consolidation
    - Synchronisation en temps réel
    - Calculs de variations et performances

  4. Sécurité
    - RLS activé
    - Politiques pour utilisateurs authentifiés
    - Index optimisés
*/

-- Créer la table data_consolidate_site_prime
CREATE TABLE IF NOT EXISTS data_consolidate_site_prime (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_name text,
  filiere_name text,
  filiale_name text,
  indicator_code text NOT NULL,
  year integer NOT NULL,
  site_names text[] DEFAULT '{}' NOT NULL,
  axe_energetique text,
  enjeux text,
  normes text,
  critere text,
  indicateur text,
  definition text,
  processus text,
  processus_code text,
  frequence text DEFAULT 'Mensuelle',
  unite text,
  type text,
  formule text,
  valeur numeric,
  valeur_precedente numeric,
  cible numeric,
  variation text,
  janvier numeric,
  fevrier numeric,
  mars numeric,
  avril numeric,
  mai numeric,
  juin numeric,
  juillet numeric,
  aout numeric,
  septembre numeric,
  octobre numeric,
  novembre numeric,
  decembre numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  variations_pourcent numeric(10,2),
  performances_pourcent numeric(10,2)
);

-- Activer RLS
ALTER TABLE data_consolidate_site_prime ENABLE ROW LEVEL SECURITY;

-- Créer les politiques RLS
CREATE POLICY "Enable read access for authenticated users on data_consolidate_site_prime"
  ON data_consolidate_site_prime
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert for authenticated users on data_consolidate_site_prime"
  ON data_consolidate_site_prime
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users on data_consolidate_site_prime"
  ON data_consolidate_site_prime
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable delete for authenticated users on data_consolidate_site_prime"
  ON data_consolidate_site_prime
  FOR DELETE
  TO authenticated
  USING (true);

-- Créer les index pour optimiser les performances
CREATE INDEX IF NOT EXISTS idx_data_consolidate_site_prime_org 
  ON data_consolidate_site_prime (organization_name);

CREATE INDEX IF NOT EXISTS idx_data_consolidate_site_prime_indicator_code 
  ON data_consolidate_site_prime (indicator_code);

CREATE INDEX IF NOT EXISTS idx_data_consolidate_site_prime_year 
  ON data_consolidate_site_prime (year);

CREATE INDEX IF NOT EXISTS idx_data_consolidate_site_prime_indicator_year 
  ON data_consolidate_site_prime (indicator_code, year);

CREATE INDEX IF NOT EXISTS idx_data_consolidate_site_prime_org_structure 
  ON data_consolidate_site_prime (organization_name, filiere_name, filiale_name);

CREATE INDEX IF NOT EXISTS idx_data_consolidate_site_prime_site_names 
  ON data_consolidate_site_prime USING gin (site_names);

CREATE INDEX IF NOT EXISTS idx_data_consolidate_site_prime_formule 
  ON data_consolidate_site_prime (formule);

-- Créer un index unique pour éviter les doublons
CREATE UNIQUE INDEX IF NOT EXISTS data_consolidate_site_prime_unique_idx 
  ON data_consolidate_site_prime (
    organization_name, 
    COALESCE(filiere_name, ''), 
    COALESCE(filiale_name, ''), 
    indicator_code, 
    year
  );

-- Fonction pour déterminer le type de consolidation basé sur la formule
CREATE OR REPLACE FUNCTION determine_consolidation_type_prime(formule_text text)
RETURNS text
LANGUAGE plpgsql
AS $$
BEGIN
  -- Si pas de formule, utiliser la somme par défaut
  IF formule_text IS NULL OR formule_text = '' THEN
    RETURN 'somme';
  END IF;
  
  -- Convertir en minuscules pour la comparaison
  formule_text := LOWER(formule_text);
  
  -- Détecter "Somme du dernier mois"
  IF formule_text ~ '(dernier|last|actuel|current|instantané|récent|final|latest)' THEN
    RETURN 'dernier_mois';
  END IF;
  
  -- Détecter "Moyenne"
  IF formule_text ~ '(moyenne|ratio|pourcentage|taux|efficacité|rendement|intensité|performance|indice|average|rate|efficiency|intensity|index)' THEN
    RETURN 'moyenne';
  END IF;
  
  -- Par défaut : Somme
  RETURN 'somme';
END;
$$;

-- Fonction pour effectuer la consolidation selon le type
CREATE OR REPLACE FUNCTION consolidate_indicator_by_formula_prime(
  p_organization_name text,
  p_filiere_name text,
  p_filiale_name text,
  p_indicator_code text,
  p_year integer
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_formule text;
  v_consolidation_type text;
  v_site_data record;
  v_total_valeur numeric := 0;
  v_count_sites integer := 0;
  v_site_names text[] := '{}';
  v_indicator_metadata record;
  v_monthly_totals numeric[] := ARRAY[0,0,0,0,0,0,0,0,0,0,0,0];
  v_monthly_counts integer[] := ARRAY[0,0,0,0,0,0,0,0,0,0,0,0];
  v_monthly_averages numeric[] := ARRAY[NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL];
  v_last_month_total numeric := 0;
  v_last_month_found integer;
  v_valeur_precedente numeric;
  v_cible_moyenne numeric := 0;
  v_cible_count integer := 0;
BEGIN
  -- Récupérer la formule de l'indicateur
  SELECT formule INTO v_formule
  FROM indicators
  WHERE code = p_indicator_code;
  
  -- Déterminer le type de consolidation
  v_consolidation_type := determine_consolidation_type_prime(v_formule);
  
  -- Récupérer les métadonnées de l'indicateur
  SELECT 
    axe_energetique, enjeux, normes, critere, indicateur, 
    definition, processus, processus_code, frequence, unite, type
  INTO v_indicator_metadata
  FROM site_global_indicator_values_simple
  WHERE code = p_indicator_code
    AND year = p_year
    AND organization_name = p_organization_name
    AND (p_filiere_name IS NULL OR filiere_name = p_filiere_name)
    AND (p_filiale_name IS NULL OR filiale_name = p_filiale_name)
  LIMIT 1;
  
  -- Si pas de métadonnées trouvées, essayer depuis la table indicators
  IF v_indicator_metadata IS NULL THEN
    SELECT 
      axe_energetique, enjeux, normes, critere, name as indicateur,
      description as definition, processus, processus_code, frequence, unit as unite, type
    INTO v_indicator_metadata
    FROM indicators
    WHERE code = p_indicator_code
    LIMIT 1;
  END IF;
  
  -- Récupérer la valeur de l'année précédente pour le calcul de variation
  SELECT valeur INTO v_valeur_precedente
  FROM data_consolidate_site_prime
  WHERE organization_name = p_organization_name
    AND COALESCE(filiere_name, '') = COALESCE(p_filiere_name, '')
    AND COALESCE(filiale_name, '') = COALESCE(p_filiale_name, '')
    AND indicator_code = p_indicator_code
    AND year = p_year - 1;
  
  -- Logique de consolidation selon le type
  IF v_consolidation_type = 'dernier_mois' THEN
    -- Somme du dernier mois : prendre le dernier mois disponible de chaque site
    FOR v_site_data IN
      SELECT DISTINCT site_name
      FROM site_global_indicator_values_simple
      WHERE code = p_indicator_code
        AND year = p_year
        AND organization_name = p_organization_name
        AND (p_filiere_name IS NULL OR filiere_name = p_filiere_name)
        AND (p_filiale_name IS NULL OR filiale_name = p_filiale_name)
        AND site_name IS NOT NULL
    LOOP
      -- Trouver le dernier mois avec une valeur pour ce site
      SELECT 
        CASE 
          WHEN decembre IS NOT NULL THEN decembre
          WHEN novembre IS NOT NULL THEN novembre
          WHEN octobre IS NOT NULL THEN octobre
          WHEN septembre IS NOT NULL THEN septembre
          WHEN aout IS NOT NULL THEN aout
          WHEN juillet IS NOT NULL THEN juillet
          WHEN juin IS NOT NULL THEN juin
          WHEN mai IS NOT NULL THEN mai
          WHEN avril IS NOT NULL THEN avril
          WHEN mars IS NOT NULL THEN mars
          WHEN fevrier IS NOT NULL THEN fevrier
          WHEN janvier IS NOT NULL THEN janvier
          ELSE NULL
        END INTO v_last_month_found
      FROM site_global_indicator_values_simple
      WHERE code = p_indicator_code
        AND year = p_year
        AND site_name = v_site_data.site_name
        AND organization_name = p_organization_name
        AND (p_filiere_name IS NULL OR filiere_name = p_filiere_name)
        AND (p_filiale_name IS NULL OR filiale_name = p_filiale_name);
      
      IF v_last_month_found IS NOT NULL THEN
        v_last_month_total := v_last_month_total + v_last_month_found;
        v_site_names := array_append(v_site_names, v_site_data.site_name);
        v_count_sites := v_count_sites + 1;
      END IF;
    END LOOP;
    
    v_total_valeur := v_last_month_total;
    
  ELSIF v_consolidation_type = 'moyenne' THEN
    -- Moyenne : calculer la moyenne des valeurs annuelles et mensuelles
    FOR v_site_data IN
      SELECT 
        site_name, valeur as value, cible,
        janvier, fevrier, mars, avril, mai, juin,
        juillet, aout, septembre, octobre, novembre, decembre
      FROM site_global_indicator_values_simple
      WHERE code = p_indicator_code
        AND year = p_year
        AND organization_name = p_organization_name
        AND (p_filiere_name IS NULL OR filiere_name = p_filiere_name)
        AND (p_filiale_name IS NULL OR filiale_name = p_filiale_name)
        AND site_name IS NOT NULL
        AND valeur IS NOT NULL
    LOOP
      v_total_valeur := v_total_valeur + v_site_data.value;
      v_count_sites := v_count_sites + 1;
      v_site_names := array_append(v_site_names, v_site_data.site_name);
      
      -- Accumuler les valeurs mensuelles pour la moyenne
      IF v_site_data.janvier IS NOT NULL THEN
        v_monthly_totals[1] := v_monthly_totals[1] + v_site_data.janvier;
        v_monthly_counts[1] := v_monthly_counts[1] + 1;
      END IF;
      IF v_site_data.fevrier IS NOT NULL THEN
        v_monthly_totals[2] := v_monthly_totals[2] + v_site_data.fevrier;
        v_monthly_counts[2] := v_monthly_counts[2] + 1;
      END IF;
      IF v_site_data.mars IS NOT NULL THEN
        v_monthly_totals[3] := v_monthly_totals[3] + v_site_data.mars;
        v_monthly_counts[3] := v_monthly_counts[3] + 1;
      END IF;
      IF v_site_data.avril IS NOT NULL THEN
        v_monthly_totals[4] := v_monthly_totals[4] + v_site_data.avril;
        v_monthly_counts[4] := v_monthly_counts[4] + 1;
      END IF;
      IF v_site_data.mai IS NOT NULL THEN
        v_monthly_totals[5] := v_monthly_totals[5] + v_site_data.mai;
        v_monthly_counts[5] := v_monthly_counts[5] + 1;
      END IF;
      IF v_site_data.juin IS NOT NULL THEN
        v_monthly_totals[6] := v_monthly_totals[6] + v_site_data.juin;
        v_monthly_counts[6] := v_monthly_counts[6] + 1;
      END IF;
      IF v_site_data.juillet IS NOT NULL THEN
        v_monthly_totals[7] := v_monthly_totals[7] + v_site_data.juillet;
        v_monthly_counts[7] := v_monthly_counts[7] + 1;
      END IF;
      IF v_site_data.aout IS NOT NULL THEN
        v_monthly_totals[8] := v_monthly_totals[8] + v_site_data.aout;
        v_monthly_counts[8] := v_monthly_counts[8] + 1;
      END IF;
      IF v_site_data.septembre IS NOT NULL THEN
        v_monthly_totals[9] := v_monthly_totals[9] + v_site_data.septembre;
        v_monthly_counts[9] := v_monthly_counts[9] + 1;
      END IF;
      IF v_site_data.octobre IS NOT NULL THEN
        v_monthly_totals[10] := v_monthly_totals[10] + v_site_data.octobre;
        v_monthly_counts[10] := v_monthly_counts[10] + 1;
      END IF;
      IF v_site_data.novembre IS NOT NULL THEN
        v_monthly_totals[11] := v_monthly_totals[11] + v_site_data.novembre;
        v_monthly_counts[11] := v_monthly_counts[11] + 1;
      END IF;
      IF v_site_data.decembre IS NOT NULL THEN
        v_monthly_totals[12] := v_monthly_totals[12] + v_site_data.decembre;
        v_monthly_counts[12] := v_monthly_counts[12] + 1;
      END IF;
      
      -- Accumuler les cibles pour la moyenne
      IF v_site_data.cible IS NOT NULL THEN
        v_cible_moyenne := v_cible_moyenne + v_site_data.cible;
        v_cible_count := v_cible_count + 1;
      END IF;
    END LOOP;
    
    -- Calculer la moyenne
    IF v_count_sites > 0 THEN
      v_total_valeur := v_total_valeur / v_count_sites;
      
      -- Calculer les moyennes mensuelles
      FOR i IN 1..12 LOOP
        IF v_monthly_counts[i] > 0 THEN
          v_monthly_averages[i] := v_monthly_totals[i] / v_monthly_counts[i];
        END IF;
      END LOOP;
      
      -- Calculer la moyenne des cibles
      IF v_cible_count > 0 THEN
        v_cible_moyenne := v_cible_moyenne / v_cible_count;
      ELSE
        v_cible_moyenne := NULL;
      END IF;
    END IF;
    
  ELSE
    -- Somme (par défaut) : additionner les valeurs annuelles et mensuelles
    FOR v_site_data IN
      SELECT 
        site_name, valeur as value, cible,
        janvier, fevrier, mars, avril, mai, juin,
        juillet, aout, septembre, octobre, novembre, decembre
      FROM site_global_indicator_values_simple
      WHERE code = p_indicator_code
        AND year = p_year
        AND organization_name = p_organization_name
        AND (p_filiere_name IS NULL OR filiere_name = p_filiere_name)
        AND (p_filiale_name IS NULL OR filiale_name = p_filiale_name)
        AND site_name IS NOT NULL
    LOOP
      IF v_site_data.value IS NOT NULL THEN
        v_total_valeur := v_total_valeur + v_site_data.value;
      END IF;
      
      v_count_sites := v_count_sites + 1;
      v_site_names := array_append(v_site_names, v_site_data.site_name);
      
      -- Additionner les valeurs mensuelles
      IF v_site_data.janvier IS NOT NULL THEN
        v_monthly_totals[1] := v_monthly_totals[1] + v_site_data.janvier;
      END IF;
      IF v_site_data.fevrier IS NOT NULL THEN
        v_monthly_totals[2] := v_monthly_totals[2] + v_site_data.fevrier;
      END IF;
      IF v_site_data.mars IS NOT NULL THEN
        v_monthly_totals[3] := v_monthly_totals[3] + v_site_data.mars;
      END IF;
      IF v_site_data.avril IS NOT NULL THEN
        v_monthly_totals[4] := v_monthly_totals[4] + v_site_data.avril;
      END IF;
      IF v_site_data.mai IS NOT NULL THEN
        v_monthly_totals[5] := v_monthly_totals[5] + v_site_data.mai;
      END IF;
      IF v_site_data.juin IS NOT NULL THEN
        v_monthly_totals[6] := v_monthly_totals[6] + v_site_data.juin;
      END IF;
      IF v_site_data.juillet IS NOT NULL THEN
        v_monthly_totals[7] := v_monthly_totals[7] + v_site_data.juillet;
      END IF;
      IF v_site_data.aout IS NOT NULL THEN
        v_monthly_totals[8] := v_monthly_totals[8] + v_site_data.aout;
      END IF;
      IF v_site_data.septembre IS NOT NULL THEN
        v_monthly_totals[9] := v_monthly_totals[9] + v_site_data.septembre;
      END IF;
      IF v_site_data.octobre IS NOT NULL THEN
        v_monthly_totals[10] := v_monthly_totals[10] + v_site_data.octobre;
      END IF;
      IF v_site_data.novembre IS NOT NULL THEN
        v_monthly_totals[11] := v_monthly_totals[11] + v_site_data.novembre;
      END IF;
      IF v_site_data.decembre IS NOT NULL THEN
        v_monthly_totals[12] := v_monthly_totals[12] + v_site_data.decembre;
      END IF;
      
      -- Additionner les cibles
      IF v_site_data.cible IS NOT NULL THEN
        v_cible_moyenne := v_cible_moyenne + v_site_data.cible;
        v_cible_count := v_cible_count + 1;
      END IF;
    END LOOP;
    
    -- Pour la somme, garder les totaux
    FOR i IN 1..12 LOOP
      v_monthly_averages[i] := v_monthly_totals[i];
    END LOOP;
  END IF;
  
  -- Si aucune donnée trouvée, sortir
  IF v_count_sites = 0 THEN
    RETURN;
  END IF;
  
  -- Calculer la variation par rapport à l'année précédente
  DECLARE
    v_variation_text text := NULL;
    v_variations_pourcent numeric := NULL;
    v_performances_pourcent numeric := NULL;
  BEGIN
    IF v_valeur_precedente IS NOT NULL AND v_valeur_precedente != 0 AND v_total_valeur IS NOT NULL THEN
      v_variations_pourcent := ((v_total_valeur - v_valeur_precedente) / v_valeur_precedente) * 100;
      v_variation_text := ROUND(v_variations_pourcent, 2)::text || '%';
    END IF;
    
    -- Calculer la performance par rapport à la cible
    IF v_cible_moyenne IS NOT NULL AND v_cible_moyenne != 0 AND v_total_valeur IS NOT NULL THEN
      v_performances_pourcent := (v_total_valeur / v_cible_moyenne) * 100;
    END IF;
  END;
  
  -- Insérer ou mettre à jour le résultat consolidé
  INSERT INTO data_consolidate_site_prime (
    organization_name,
    filiere_name,
    filiale_name,
    indicator_code,
    year,
    site_names,
    axe_energetique,
    enjeux,
    normes,
    critere,
    indicateur,
    definition,
    processus,
    processus_code,
    frequence,
    unite,
    type,
    formule,
    valeur,
    valeur_precedente,
    cible,
    variation,
    janvier,
    fevrier,
    mars,
    avril,
    mai,
    juin,
    juillet,
    aout,
    septembre,
    octobre,
    novembre,
    decembre,
    variations_pourcent,
    performances_pourcent
  ) VALUES (
    p_organization_name,
    p_filiere_name,
    p_filiale_name,
    p_indicator_code,
    p_year,
    v_site_names,
    v_indicator_metadata.axe_energetique,
    v_indicator_metadata.enjeux,
    v_indicator_metadata.normes,
    v_indicator_metadata.critere,
    v_indicator_metadata.indicateur,
    v_indicator_metadata.definition,
    v_indicator_metadata.processus,
    v_indicator_metadata.processus_code,
    v_indicator_metadata.frequence,
    v_indicator_metadata.unite,
    v_indicator_metadata.type,
    v_formule,
    v_total_valeur,
    v_valeur_precedente,
    CASE WHEN v_cible_count > 0 THEN v_cible_moyenne ELSE NULL END,
    v_variation_text,
    v_monthly_averages[1],
    v_monthly_averages[2],
    v_monthly_averages[3],
    v_monthly_averages[4],
    v_monthly_averages[5],
    v_monthly_averages[6],
    v_monthly_averages[7],
    v_monthly_averages[8],
    v_monthly_averages[9],
    v_monthly_averages[10],
    v_monthly_averages[11],
    v_monthly_averages[12],
    v_variations_pourcent,
    v_performances_pourcent
  )
  ON CONFLICT (organization_name, COALESCE(filiere_name, ''), COALESCE(filiale_name, ''), indicator_code, year)
  DO UPDATE SET
    site_names = EXCLUDED.site_names,
    axe_energetique = EXCLUDED.axe_energetique,
    enjeux = EXCLUDED.enjeux,
    normes = EXCLUDED.normes,
    critere = EXCLUDED.critere,
    indicateur = EXCLUDED.indicateur,
    definition = EXCLUDED.definition,
    processus = EXCLUDED.processus,
    processus_code = EXCLUDED.processus_code,
    frequence = EXCLUDED.frequence,
    unite = EXCLUDED.unite,
    type = EXCLUDED.type,
    formule = EXCLUDED.formule,
    valeur = EXCLUDED.valeur,
    valeur_precedente = EXCLUDED.valeur_precedente,
    cible = EXCLUDED.cible,
    variation = EXCLUDED.variation,
    janvier = EXCLUDED.janvier,
    fevrier = EXCLUDED.fevrier,
    mars = EXCLUDED.mars,
    avril = EXCLUDED.avril,
    mai = EXCLUDED.mai,
    juin = EXCLUDED.juin,
    juillet = EXCLUDED.juillet,
    aout = EXCLUDED.aout,
    septembre = EXCLUDED.septembre,
    octobre = EXCLUDED.octobre,
    novembre = EXCLUDED.novembre,
    decembre = EXCLUDED.decembre,
    variations_pourcent = EXCLUDED.variations_pourcent,
    performances_pourcent = EXCLUDED.performances_pourcent,
    updated_at = now();
    
END;
$$;

-- Fonction pour recalculer toutes les consolidations
CREATE OR REPLACE FUNCTION refresh_data_consolidate_site_prime()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_combination record;
BEGIN
  -- Vider la table
  DELETE FROM data_consolidate_site_prime;
  
  -- Recalculer pour toutes les combinaisons organisation/filière/filiale/indicateur/année
  FOR v_combination IN
    SELECT DISTINCT 
      organization_name,
      filiere_name,
      filiale_name,
      code as indicator_code,
      year
    FROM site_global_indicator_values_simple
    WHERE organization_name IS NOT NULL
      AND code IS NOT NULL
      AND year IS NOT NULL
    ORDER BY organization_name, filiere_name, filiale_name, indicator_code, year
  LOOP
    PERFORM consolidate_indicator_by_formula_prime(
      v_combination.organization_name,
      v_combination.filiere_name,
      v_combination.filiale_name,
      v_combination.indicator_code,
      v_combination.year
    );
  END LOOP;
END;
$$;

-- Fonction trigger pour la consolidation automatique
CREATE OR REPLACE FUNCTION trigger_consolidate_data_site_prime()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Consolider pour la ligne modifiée/ajoutée
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    PERFORM consolidate_indicator_by_formula_prime(
      NEW.organization_name,
      NEW.filiere_name,
      NEW.filiale_name,
      NEW.code,
      NEW.year
    );
    RETURN NEW;
  END IF;
  
  -- Consolider pour la ligne supprimée
  IF TG_OP = 'DELETE' THEN
    PERFORM consolidate_indicator_by_formula_prime(
      OLD.organization_name,
      OLD.filiere_name,
      OLD.filiale_name,
      OLD.code,
      OLD.year
    );
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Créer le trigger sur site_global_indicator_values_simple
DROP TRIGGER IF EXISTS trigger_consolidate_data_site_prime ON site_global_indicator_values_simple;
CREATE TRIGGER trigger_consolidate_data_site_prime
  AFTER INSERT OR UPDATE OR DELETE ON site_global_indicator_values_simple
  FOR EACH ROW EXECUTE FUNCTION trigger_consolidate_data_site_prime();

-- Fonction trigger pour propager les changements de formule
CREATE OR REPLACE FUNCTION trigger_propagate_formule_to_data_consolidate_prime()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Mettre à jour la formule dans data_consolidate_site_prime
  UPDATE data_consolidate_site_prime
  SET formule = NEW.formule,
      updated_at = now()
  WHERE indicator_code = NEW.code;
  
  -- Recalculer les consolidations pour cet indicateur si la formule a changé
  IF OLD.formule IS DISTINCT FROM NEW.formule THEN
    -- Recalculer pour toutes les combinaisons de cet indicateur
    PERFORM consolidate_indicator_by_formula_prime(
      organization_name,
      filiere_name,
      filiale_name,
      indicator_code,
      year
    )
    FROM (
      SELECT DISTINCT 
        organization_name,
        filiere_name,
        filiale_name,
        indicator_code,
        year
      FROM data_consolidate_site_prime
      WHERE indicator_code = NEW.code
    ) AS combinations;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Créer le trigger sur la table indicators
DROP TRIGGER IF EXISTS trigger_propagate_formule_to_data_consolidate_prime ON indicators;
CREATE TRIGGER trigger_propagate_formule_to_data_consolidate_prime
  AFTER UPDATE OF formule ON indicators
  FOR EACH ROW EXECUTE FUNCTION trigger_propagate_formule_to_data_consolidate_prime();

-- Fonction pour le trigger updated_at
CREATE OR REPLACE FUNCTION update_data_consolidate_site_prime_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Créer le trigger updated_at
DROP TRIGGER IF EXISTS update_data_consolidate_site_prime_updated_at ON data_consolidate_site_prime;
CREATE TRIGGER update_data_consolidate_site_prime_updated_at
  BEFORE UPDATE ON data_consolidate_site_prime
  FOR EACH ROW EXECUTE FUNCTION update_data_consolidate_site_prime_updated_at();

-- Vue pour afficher le type de consolidation utilisé
CREATE OR REPLACE VIEW data_consolidate_site_prime_with_type AS
SELECT 
  *,
  determine_consolidation_type_prime(formule) as consolidation_type
FROM data_consolidate_site_prime;

-- Effectuer la consolidation initiale pour les données existantes
SELECT refresh_data_consolidate_site_prime();