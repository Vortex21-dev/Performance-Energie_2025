/*
  # Créer la table data_consolidate_site_prime avec logique de consolidation

  1. Nouvelle table
    - `data_consolidate_site_prime`
      - Même structure que `consolidated_global_indicator_values`
      - Logique de consolidation basée sur la formule de l'indicateur
      - Types de consolidation : Somme, Moyenne, Somme du dernier mois

  2. Fonctions de consolidation
    - `determine_consolidation_type_prime()` : Détermine le type selon la formule
    - `consolidate_indicator_by_formula_prime()` : Effectue la consolidation
    - `consolidate_data_site_prime()` : Fonction principale de consolidation

  3. Triggers automatiques
    - Se déclenche lors des modifications de `site_global_indicator_values_simple`
    - Met à jour automatiquement les consolidations

  4. Sécurité
    - RLS activé
    - Politiques pour utilisateurs authentifiés
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
  value numeric,
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

-- Créer les index pour optimiser les performances
CREATE INDEX IF NOT EXISTS idx_data_consolidate_site_prime_org ON data_consolidate_site_prime USING btree (organization_name);
CREATE INDEX IF NOT EXISTS idx_data_consolidate_site_prime_filiere ON data_consolidate_site_prime USING btree (filiere_name);
CREATE INDEX IF NOT EXISTS idx_data_consolidate_site_prime_filiale ON data_consolidate_site_prime USING btree (filiale_name);
CREATE INDEX IF NOT EXISTS idx_data_consolidate_site_prime_code ON data_consolidate_site_prime USING btree (indicator_code);
CREATE INDEX IF NOT EXISTS idx_data_consolidate_site_prime_year ON data_consolidate_site_prime USING btree (year);
CREATE INDEX IF NOT EXISTS idx_data_consolidate_site_prime_indicator_year ON data_consolidate_site_prime USING btree (indicator_code, year);
CREATE INDEX IF NOT EXISTS idx_data_consolidate_site_prime_org_structure ON data_consolidate_site_prime USING btree (organization_name, filiere_name, filiale_name);
CREATE INDEX IF NOT EXISTS idx_data_consolidate_site_prime_site_names ON data_consolidate_site_prime USING gin (site_names);

-- Créer l'index unique pour éviter les doublons
CREATE UNIQUE INDEX IF NOT EXISTS data_consolidate_site_prime_unique_idx 
ON data_consolidate_site_prime USING btree (organization_name, COALESCE(filiere_name, ''), COALESCE(filiale_name, ''), indicator_code, year);

-- Activer RLS
ALTER TABLE data_consolidate_site_prime ENABLE ROW LEVEL SECURITY;

-- Créer les politiques RLS
CREATE POLICY "Enable read access for authenticated users" ON data_consolidate_site_prime
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert for authenticated users" ON data_consolidate_site_prime
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON data_consolidate_site_prime
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Enable delete for authenticated users" ON data_consolidate_site_prime
  FOR DELETE TO authenticated USING (true);

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
    RETURN 'somme_dernier_mois';
  END IF;
  
  -- Détecter "Moyenne"
  IF formule_text ~ '(moyenne|ratio|pourcentage|taux|efficacité|rendement|intensité|performance|indice|moyen)' THEN
    RETURN 'moyenne';
  END IF;
  
  -- Par défaut, utiliser la somme
  RETURN 'somme';
END;
$$;

-- Fonction pour effectuer la consolidation selon la formule
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
  v_site_data RECORD;
  v_total_value numeric := 0;
  v_count integer := 0;
  v_site_names text[] := '{}';
  v_month_totals numeric[] := ARRAY[0,0,0,0,0,0,0,0,0,0,0,0];
  v_month_counts integer[] := ARRAY[0,0,0,0,0,0,0,0,0,0,0,0];
  v_month_values numeric[] := ARRAY[NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL];
  v_valeur_precedente numeric;
  v_cible numeric;
  v_variations_pourcent numeric;
  v_performances_pourcent numeric;
  v_indicator_info RECORD;
  v_last_month_total numeric := 0;
  v_last_month_found boolean := FALSE;
  v_month_index integer;
BEGIN
  -- Récupérer les informations de l'indicateur
  SELECT i.formule, i.name, i.definition, i.unit, i.type, i.frequence, i.axe_energetique, i.enjeux, i.normes, i.critere, i.processus_code
  INTO v_indicator_info
  FROM indicators i
  WHERE i.code = p_indicator_code;
  
  -- Si l'indicateur n'existe pas, sortir
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  v_formule := v_indicator_info.formule;
  
  -- Déterminer le type de consolidation
  v_consolidation_type := determine_consolidation_type_prime(v_formule);
  
  -- Récupérer les données des sites selon les critères de filtrage
  FOR v_site_data IN
    SELECT 
      s.site_name,
      s.value,
      s.valeur_precedente,
      s.cible,
      s.janvier, s.fevrier, s.mars, s.avril, s.mai, s.juin,
      s.juillet, s.aout, s.septembre, s.octobre, s.novembre, s.decembre,
      s.processus
    FROM site_global_indicator_values_simple s
    WHERE s.code = p_indicator_code
      AND s.year = p_year
      AND s.organization_name = p_organization_name
      AND (p_filiere_name IS NULL OR s.filiere_name = p_filiere_name)
      AND (p_filiale_name IS NULL OR s.filiale_name = p_filiale_name)
  LOOP
    v_site_names := array_append(v_site_names, v_site_data.site_name);
    
    -- Traitement selon le type de consolidation
    IF v_consolidation_type = 'somme_dernier_mois' THEN
      -- Trouver le dernier mois avec une valeur pour ce site
      FOR v_month_index IN REVERSE 12..1 LOOP
        DECLARE
          v_month_value numeric;
        BEGIN
          CASE v_month_index
            WHEN 1 THEN v_month_value := v_site_data.janvier;
            WHEN 2 THEN v_month_value := v_site_data.fevrier;
            WHEN 3 THEN v_month_value := v_site_data.mars;
            WHEN 4 THEN v_month_value := v_site_data.avril;
            WHEN 5 THEN v_month_value := v_site_data.mai;
            WHEN 6 THEN v_month_value := v_site_data.juin;
            WHEN 7 THEN v_month_value := v_site_data.juillet;
            WHEN 8 THEN v_month_value := v_site_data.aout;
            WHEN 9 THEN v_month_value := v_site_data.septembre;
            WHEN 10 THEN v_month_value := v_site_data.octobre;
            WHEN 11 THEN v_month_value := v_site_data.novembre;
            WHEN 12 THEN v_month_value := v_site_data.decembre;
          END CASE;
          
          IF v_month_value IS NOT NULL THEN
            v_last_month_total := v_last_month_total + v_month_value;
            v_last_month_found := TRUE;
            EXIT; -- Sortir de la boucle une fois le dernier mois trouvé
          END IF;
        END;
      END LOOP;
      
    ELSE
      -- Pour somme et moyenne, traiter normalement
      IF v_site_data.value IS NOT NULL THEN
        v_total_value := v_total_value + v_site_data.value;
        v_count := v_count + 1;
      END IF;
      
      -- Traitement des valeurs mensuelles
      IF v_site_data.janvier IS NOT NULL THEN
        v_month_totals[1] := v_month_totals[1] + v_site_data.janvier;
        v_month_counts[1] := v_month_counts[1] + 1;
      END IF;
      IF v_site_data.fevrier IS NOT NULL THEN
        v_month_totals[2] := v_month_totals[2] + v_site_data.fevrier;
        v_month_counts[2] := v_month_counts[2] + 1;
      END IF;
      IF v_site_data.mars IS NOT NULL THEN
        v_month_totals[3] := v_month_totals[3] + v_site_data.mars;
        v_month_counts[3] := v_month_counts[3] + 1;
      END IF;
      IF v_site_data.avril IS NOT NULL THEN
        v_month_totals[4] := v_month_totals[4] + v_site_data.avril;
        v_month_counts[4] := v_month_counts[4] + 1;
      END IF;
      IF v_site_data.mai IS NOT NULL THEN
        v_month_totals[5] := v_month_totals[5] + v_site_data.mai;
        v_month_counts[5] := v_month_counts[5] + 1;
      END IF;
      IF v_site_data.juin IS NOT NULL THEN
        v_month_totals[6] := v_month_totals[6] + v_site_data.juin;
        v_month_counts[6] := v_month_counts[6] + 1;
      END IF;
      IF v_site_data.juillet IS NOT NULL THEN
        v_month_totals[7] := v_month_totals[7] + v_site_data.juillet;
        v_month_counts[7] := v_month_counts[7] + 1;
      END IF;
      IF v_site_data.aout IS NOT NULL THEN
        v_month_totals[8] := v_month_totals[8] + v_site_data.aout;
        v_month_counts[8] := v_month_counts[8] + 1;
      END IF;
      IF v_site_data.septembre IS NOT NULL THEN
        v_month_totals[9] := v_month_totals[9] + v_site_data.septembre;
        v_month_counts[9] := v_month_counts[9] + 1;
      END IF;
      IF v_site_data.octobre IS NOT NULL THEN
        v_month_totals[10] := v_month_totals[10] + v_site_data.octobre;
        v_month_counts[10] := v_month_counts[10] + 1;
      END IF;
      IF v_site_data.novembre IS NOT NULL THEN
        v_month_totals[11] := v_month_totals[11] + v_site_data.novembre;
        v_month_counts[11] := v_month_counts[11] + 1;
      END IF;
      IF v_site_data.decembre IS NOT NULL THEN
        v_month_totals[12] := v_month_totals[12] + v_site_data.decembre;
        v_month_counts[12] := v_month_counts[12] + 1;
      END IF;
      
      -- Récupérer la valeur précédente et la cible (prendre la première trouvée)
      IF v_valeur_precedente IS NULL AND v_site_data.valeur_precedente IS NOT NULL THEN
        v_valeur_precedente := v_site_data.valeur_precedente;
      END IF;
      IF v_cible IS NULL AND v_site_data.cible IS NOT NULL THEN
        v_cible := v_site_data.cible;
      END IF;
    END IF;
  END LOOP;
  
  -- Calculer les valeurs finales selon le type de consolidation
  DECLARE
    v_final_value numeric;
    v_final_months numeric[] := ARRAY[NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL];
  BEGIN
    IF v_consolidation_type = 'somme_dernier_mois' THEN
      -- Pour "Somme du dernier mois", utiliser le total du dernier mois
      v_final_value := CASE WHEN v_last_month_found THEN v_last_month_total ELSE NULL END;
      -- Les valeurs mensuelles restent NULL pour ce type
      
    ELSIF v_consolidation_type = 'moyenne' THEN
      -- Pour "Moyenne", calculer la moyenne
      v_final_value := CASE WHEN v_count > 0 THEN v_total_value / v_count ELSE NULL END;
      
      -- Calculer les moyennes mensuelles
      FOR i IN 1..12 LOOP
        IF v_month_counts[i] > 0 THEN
          v_final_months[i] := v_month_totals[i] / v_month_counts[i];
        END IF;
      END LOOP;
      
    ELSE -- 'somme' par défaut
      -- Pour "Somme", utiliser le total
      v_final_value := CASE WHEN v_count > 0 THEN v_total_value ELSE NULL END;
      
      -- Utiliser les totaux mensuels
      FOR i IN 1..12 LOOP
        IF v_month_counts[i] > 0 THEN
          v_final_months[i] := v_month_totals[i];
        END IF;
      END LOOP;
    END IF;
    
    -- Calculer les variations et performances
    IF v_final_value IS NOT NULL AND v_valeur_precedente IS NOT NULL AND v_valeur_precedente != 0 THEN
      v_variations_pourcent := ((v_final_value - v_valeur_precedente) / v_valeur_precedente) * 100;
    END IF;
    
    IF v_final_value IS NOT NULL AND v_cible IS NOT NULL AND v_cible != 0 THEN
      v_performances_pourcent := (v_final_value / v_cible) * 100;
    END IF;
    
    -- Insérer ou mettre à jour les données consolidées
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
      value,
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
      v_indicator_info.axe_energetique,
      v_indicator_info.enjeux,
      v_indicator_info.normes,
      v_indicator_info.critere,
      v_indicator_info.name,
      v_indicator_info.definition,
      v_indicator_info.processus,
      v_indicator_info.processus_code,
      v_indicator_info.frequence,
      v_indicator_info.unit,
      v_indicator_info.type,
      v_formule,
      v_final_value,
      v_valeur_precedente,
      v_cible,
      CASE 
        WHEN v_variations_pourcent IS NOT NULL THEN 
          CASE 
            WHEN v_variations_pourcent > 0 THEN '+' || v_variations_pourcent::text || '%'
            ELSE v_variations_pourcent::text || '%'
          END
        ELSE NULL 
      END,
      v_final_months[1],
      v_final_months[2],
      v_final_months[3],
      v_final_months[4],
      v_final_months[5],
      v_final_months[6],
      v_final_months[7],
      v_final_months[8],
      v_final_months[9],
      v_final_months[10],
      v_final_months[11],
      v_final_months[12],
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
      value = EXCLUDED.value,
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
END;
$$;

-- Fonction principale de consolidation
CREATE OR REPLACE FUNCTION consolidate_data_site_prime()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_organization_name text;
  v_filiere_name text;
  v_filiale_name text;
  v_indicator_code text;
  v_year integer;
  v_combination RECORD;
BEGIN
  -- Déterminer les valeurs à partir du NEW ou OLD record
  IF TG_OP = 'DELETE' THEN
    v_organization_name := OLD.organization_name;
    v_filiere_name := OLD.filiere_name;
    v_filiale_name := OLD.filiale_name;
    v_indicator_code := OLD.code;
    v_year := OLD.year;
  ELSE
    v_organization_name := NEW.organization_name;
    v_filiere_name := NEW.filiere_name;
    v_filiale_name := NEW.filiale_name;
    v_indicator_code := NEW.code;
    v_year := NEW.year;
  END IF;
  
  -- Recalculer la consolidation pour cet indicateur spécifique
  PERFORM consolidate_indicator_by_formula_prime(
    v_organization_name,
    v_filiere_name,
    v_filiale_name,
    v_indicator_code,
    v_year
  );
  
  -- Si c'est une suppression et qu'il n'y a plus de sites pour cet indicateur, supprimer la consolidation
  IF TG_OP = 'DELETE' THEN
    IF NOT EXISTS (
      SELECT 1 FROM site_global_indicator_values_simple s
      WHERE s.code = v_indicator_code
        AND s.year = v_year
        AND s.organization_name = v_organization_name
        AND (v_filiere_name IS NULL OR s.filiere_name = v_filiere_name)
        AND (v_filiale_name IS NULL OR s.filiale_name = v_filiale_name)
    ) THEN
      DELETE FROM data_consolidate_site_prime
      WHERE organization_name = v_organization_name
        AND (filiere_name = v_filiere_name OR (filiere_name IS NULL AND v_filiere_name IS NULL))
        AND (filiale_name = v_filiale_name OR (filiale_name IS NULL AND v_filiale_name IS NULL))
        AND indicator_code = v_indicator_code
        AND year = v_year;
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Créer le trigger pour la consolidation automatique
CREATE OR REPLACE TRIGGER trigger_consolidate_data_site_prime
  AFTER INSERT OR UPDATE OR DELETE ON site_global_indicator_values_simple
  FOR EACH ROW
  EXECUTE FUNCTION consolidate_data_site_prime();

-- Fonction pour recalculer toutes les consolidations
CREATE OR REPLACE FUNCTION refresh_data_consolidate_site_prime()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_combination RECORD;
BEGIN
  -- Vider la table
  DELETE FROM data_consolidate_site_prime;
  
  -- Recalculer toutes les combinaisons
  FOR v_combination IN
    SELECT DISTINCT 
      organization_name,
      filiere_name,
      filiale_name,
      code as indicator_code,
      year
    FROM site_global_indicator_values_simple
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

-- Créer une vue pour afficher le type de consolidation utilisé
CREATE OR REPLACE VIEW data_consolidate_site_prime_with_type AS
SELECT 
  d.*,
  determine_consolidation_type_prime(d.formule) as type_consolidation
FROM data_consolidate_site_prime d;

-- Fonction de mise à jour du timestamp
CREATE OR REPLACE FUNCTION update_data_consolidate_site_prime_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Créer le trigger pour la mise à jour du timestamp
CREATE OR REPLACE TRIGGER update_data_consolidate_site_prime_updated_at
  BEFORE UPDATE ON data_consolidate_site_prime
  FOR EACH ROW
  EXECUTE FUNCTION update_data_consolidate_site_prime_updated_at();

-- Effectuer une consolidation initiale
SELECT refresh_data_consolidate_site_prime();