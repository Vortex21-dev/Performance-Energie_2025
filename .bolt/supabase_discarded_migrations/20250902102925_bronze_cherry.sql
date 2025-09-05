/*
  # Création de la table dataconsolidate avec logique de consolidation

  1. Nouvelle table
    - `dataconsolidate`
      - Mêmes attributs que `consolidated_global_indicator_values`
      - `valeur` au lieu de `value`
      - Logique de consolidation basée sur la formule

  2. Fonctions de consolidation
    - Détection automatique du type de consolidation
    - Trois types : Somme, Moyenne, Somme du dernier mois

  3. Automatisation
    - Triggers pour synchronisation automatique
    - Mise à jour en temps réel
*/

-- Fonction pour déterminer le type de consolidation basé sur la formule
CREATE OR REPLACE FUNCTION determine_consolidation_type_dataconsolidate(formule_text text)
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
  IF formule_text ~ '(dernier|last|actuel|current|instantané|récent|final)' THEN
    RETURN 'dernier_mois';
  END IF;
  
  -- Détecter "Moyenne"
  IF formule_text ~ '(moyenne|ratio|pourcentage|taux|efficacité|rendement|intensité|performance|indice)' THEN
    RETURN 'moyenne';
  END IF;
  
  -- Par défaut : Somme
  RETURN 'somme';
END;
$$;

-- Fonction pour obtenir le dernier mois disponible pour un site et un indicateur
CREATE OR REPLACE FUNCTION get_last_available_month_dataconsolidate(
  p_site_name text,
  p_code text,
  p_year integer
)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  last_month integer;
BEGIN
  -- Chercher le dernier mois avec une valeur non nulle
  SELECT CASE
    WHEN decembre IS NOT NULL THEN 12
    WHEN novembre IS NOT NULL THEN 11
    WHEN octobre IS NOT NULL THEN 10
    WHEN septembre IS NOT NULL THEN 9
    WHEN aout IS NOT NULL THEN 8
    WHEN juillet IS NOT NULL THEN 7
    WHEN juin IS NOT NULL THEN 6
    WHEN mai IS NOT NULL THEN 5
    WHEN avril IS NOT NULL THEN 4
    WHEN mars IS NOT NULL THEN 3
    WHEN fevrier IS NOT NULL THEN 2
    WHEN janvier IS NOT NULL THEN 1
    ELSE NULL
  END INTO last_month
  FROM site_global_indicator_values_simple
  WHERE site_name = p_site_name 
    AND code = p_code 
    AND year = p_year;
    
  RETURN COALESCE(last_month, 12); -- Par défaut décembre si aucune donnée
END;
$$;

-- Fonction pour obtenir la valeur d'un mois spécifique
CREATE OR REPLACE FUNCTION get_month_value_dataconsolidate(
  p_site_name text,
  p_code text,
  p_year integer,
  p_month integer
)
RETURNS numeric
LANGUAGE plpgsql
AS $$
DECLARE
  month_value numeric;
BEGIN
  SELECT CASE p_month
    WHEN 1 THEN janvier
    WHEN 2 THEN fevrier
    WHEN 3 THEN mars
    WHEN 4 THEN avril
    WHEN 5 THEN mai
    WHEN 6 THEN juin
    WHEN 7 THEN juillet
    WHEN 8 THEN aout
    WHEN 9 THEN septembre
    WHEN 10 THEN octobre
    WHEN 11 THEN novembre
    WHEN 12 THEN decembre
    ELSE NULL
  END INTO month_value
  FROM site_global_indicator_values_simple
  WHERE site_name = p_site_name 
    AND code = p_code 
    AND year = p_year;
    
  RETURN month_value;
END;
$$;

-- Fonction principale de consolidation pour dataconsolidate
CREATE OR REPLACE FUNCTION consolidate_indicators_dataconsolidate()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  indicator_rec record;
  site_rec record;
  consolidation_type text;
  consolidated_valeur numeric;
  consolidated_months numeric[];
  site_names_array text[];
  month_names text[] := ARRAY['janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin', 
                              'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre'];
  i integer;
  month_sum numeric;
  month_count integer;
  last_month_sum numeric;
  last_month integer;
  month_value numeric;
BEGIN
  -- Vider la table de consolidation
  DELETE FROM dataconsolidate;
  
  -- Pour chaque combinaison unique d'organisation, filière, filiale, indicateur et année
  FOR indicator_rec IN
    SELECT DISTINCT 
      organization_name,
      filiere_name,
      filiale_name,
      code,
      year,
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
      cible,
      valeur_precedente
    FROM site_global_indicator_values_simple
    WHERE organization_name IS NOT NULL
      AND filiere_name IS NOT NULL
      AND filiale_name IS NOT NULL
      AND code IS NOT NULL
      AND year IS NOT NULL
      AND formule IS NOT NULL
  LOOP
    -- Déterminer le type de consolidation basé sur la formule
    consolidation_type := determine_consolidation_type_dataconsolidate(indicator_rec.formule);
    
    -- Récupérer tous les sites pour cette combinaison
    site_names_array := ARRAY[]::text[];
    consolidated_valeur := 0;
    consolidated_months := ARRAY[NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL]::numeric[];
    
    -- Traitement selon le type de consolidation
    IF consolidation_type = 'dernier_mois' THEN
      -- Somme du dernier mois disponible
      last_month_sum := 0;
      
      FOR site_rec IN
        SELECT DISTINCT site_name, valeur
        FROM site_global_indicator_values_simple
        WHERE organization_name = indicator_rec.organization_name
          AND COALESCE(filiere_name, '') = COALESCE(indicator_rec.filiere_name, '')
          AND COALESCE(filiale_name, '') = COALESCE(indicator_rec.filiale_name, '')
          AND code = indicator_rec.code
          AND year = indicator_rec.year
          AND valeur IS NOT NULL
      LOOP
        site_names_array := array_append(site_names_array, site_rec.site_name);
        
        -- Obtenir le dernier mois disponible pour ce site
        last_month := get_last_available_month_dataconsolidate(
          site_rec.site_name, 
          indicator_rec.code, 
          indicator_rec.year
        );
        
        -- Obtenir la valeur de ce mois
        month_value := get_month_value_dataconsolidate(
          site_rec.site_name,
          indicator_rec.code,
          indicator_rec.year,
          last_month
        );
        
        IF month_value IS NOT NULL THEN
          last_month_sum := last_month_sum + month_value;
        END IF;
      END LOOP;
      
      consolidated_valeur := last_month_sum;
      
    ELSIF consolidation_type = 'moyenne' THEN
      -- Moyenne des valeurs
      FOR site_rec IN
        SELECT DISTINCT site_name, valeur, janvier, fevrier, mars, avril, mai, juin,
               juillet, aout, septembre, octobre, novembre, decembre
        FROM site_global_indicator_values_simple
        WHERE organization_name = indicator_rec.organization_name
          AND COALESCE(filiere_name, '') = COALESCE(indicator_rec.filiere_name, '')
          AND COALESCE(filiale_name, '') = COALESCE(indicator_rec.filiale_name, '')
          AND code = indicator_rec.code
          AND year = indicator_rec.year
          AND valeur IS NOT NULL
      LOOP
        site_names_array := array_append(site_names_array, site_rec.site_name);
        
        -- Additionner pour calculer la moyenne ensuite
        IF site_rec.valeur IS NOT NULL THEN
          consolidated_valeur := consolidated_valeur + site_rec.valeur;
        END IF;
        
        -- Additionner les valeurs mensuelles
        consolidated_months[1] := COALESCE(consolidated_months[1], 0) + COALESCE(site_rec.janvier, 0);
        consolidated_months[2] := COALESCE(consolidated_months[2], 0) + COALESCE(site_rec.fevrier, 0);
        consolidated_months[3] := COALESCE(consolidated_months[3], 0) + COALESCE(site_rec.mars, 0);
        consolidated_months[4] := COALESCE(consolidated_months[4], 0) + COALESCE(site_rec.avril, 0);
        consolidated_months[5] := COALESCE(consolidated_months[5], 0) + COALESCE(site_rec.mai, 0);
        consolidated_months[6] := COALESCE(consolidated_months[6], 0) + COALESCE(site_rec.juin, 0);
        consolidated_months[7] := COALESCE(consolidated_months[7], 0) + COALESCE(site_rec.juillet, 0);
        consolidated_months[8] := COALESCE(consolidated_months[8], 0) + COALESCE(site_rec.aout, 0);
        consolidated_months[9] := COALESCE(consolidated_months[9], 0) + COALESCE(site_rec.septembre, 0);
        consolidated_months[10] := COALESCE(consolidated_months[10], 0) + COALESCE(site_rec.octobre, 0);
        consolidated_months[11] := COALESCE(consolidated_months[11], 0) + COALESCE(site_rec.novembre, 0);
        consolidated_months[12] := COALESCE(consolidated_months[12], 0) + COALESCE(site_rec.decembre, 0);
      END LOOP;
      
      -- Calculer la moyenne
      IF array_length(site_names_array, 1) > 0 THEN
        consolidated_valeur := consolidated_valeur / array_length(site_names_array, 1);
        
        -- Moyenne des valeurs mensuelles
        FOR i IN 1..12 LOOP
          IF consolidated_months[i] IS NOT NULL AND consolidated_months[i] > 0 THEN
            consolidated_months[i] := consolidated_months[i] / array_length(site_names_array, 1);
          ELSE
            consolidated_months[i] := NULL;
          END IF;
        END LOOP;
      END IF;
      
    ELSE
      -- Somme (par défaut)
      FOR site_rec IN
        SELECT DISTINCT site_name, valeur, janvier, fevrier, mars, avril, mai, juin,
               juillet, aout, septembre, octobre, novembre, decembre
        FROM site_global_indicator_values_simple
        WHERE organization_name = indicator_rec.organization_name
          AND COALESCE(filiere_name, '') = COALESCE(indicator_rec.filiere_name, '')
          AND COALESCE(filiale_name, '') = COALESCE(indicator_rec.filiale_name, '')
          AND code = indicator_rec.code
          AND year = indicator_rec.year
          AND valeur IS NOT NULL
      LOOP
        site_names_array := array_append(site_names_array, site_rec.site_name);
        
        -- Additionner les valeurs annuelles
        IF site_rec.valeur IS NOT NULL THEN
          consolidated_valeur := consolidated_valeur + site_rec.valeur;
        END IF;
        
        -- Additionner les valeurs mensuelles
        consolidated_months[1] := COALESCE(consolidated_months[1], 0) + COALESCE(site_rec.janvier, 0);
        consolidated_months[2] := COALESCE(consolidated_months[2], 0) + COALESCE(site_rec.fevrier, 0);
        consolidated_months[3] := COALESCE(consolidated_months[3], 0) + COALESCE(site_rec.mars, 0);
        consolidated_months[4] := COALESCE(consolidated_months[4], 0) + COALESCE(site_rec.avril, 0);
        consolidated_months[5] := COALESCE(consolidated_months[5], 0) + COALESCE(site_rec.mai, 0);
        consolidated_months[6] := COALESCE(consolidated_months[6], 0) + COALESCE(site_rec.juin, 0);
        consolidated_months[7] := COALESCE(consolidated_months[7], 0) + COALESCE(site_rec.juillet, 0);
        consolidated_months[8] := COALESCE(consolidated_months[8], 0) + COALESCE(site_rec.aout, 0);
        consolidated_months[9] := COALESCE(consolidated_months[9], 0) + COALESCE(site_rec.septembre, 0);
        consolidated_months[10] := COALESCE(consolidated_months[10], 0) + COALESCE(site_rec.octobre, 0);
        consolidated_months[11] := COALESCE(consolidated_months[11], 0) + COALESCE(site_rec.novembre, 0);
        consolidated_months[12] := COALESCE(consolidated_months[12], 0) + COALESCE(site_rec.decembre, 0);
      END LOOP;
    END IF;
    
    -- Insérer le résultat consolidé seulement s'il y a des sites
    IF array_length(site_names_array, 1) > 0 THEN
      INSERT INTO dataconsolidate (
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
        indicator_rec.organization_name,
        indicator_rec.filiere_name,
        indicator_rec.filiale_name,
        indicator_rec.code,
        indicator_rec.year,
        site_names_array,
        indicator_rec.axe_energetique,
        indicator_rec.enjeux,
        indicator_rec.normes,
        indicator_rec.critere,
        indicator_rec.indicateur,
        indicator_rec.definition,
        indicator_rec.processus,
        indicator_rec.processus_code,
        indicator_rec.frequence,
        indicator_rec.unite,
        indicator_rec.type,
        indicator_rec.formule,
        CASE WHEN consolidated_valeur = 0 THEN NULL ELSE consolidated_valeur END,
        indicator_rec.valeur_precedente,
        indicator_rec.cible,
        NULL, -- variation sera calculée par trigger
        CASE WHEN consolidated_months[1] = 0 THEN NULL ELSE consolidated_months[1] END,
        CASE WHEN consolidated_months[2] = 0 THEN NULL ELSE consolidated_months[2] END,
        CASE WHEN consolidated_months[3] = 0 THEN NULL ELSE consolidated_months[3] END,
        CASE WHEN consolidated_months[4] = 0 THEN NULL ELSE consolidated_months[4] END,
        CASE WHEN consolidated_months[5] = 0 THEN NULL ELSE consolidated_months[5] END,
        CASE WHEN consolidated_months[6] = 0 THEN NULL ELSE consolidated_months[6] END,
        CASE WHEN consolidated_months[7] = 0 THEN NULL ELSE consolidated_months[7] END,
        CASE WHEN consolidated_months[8] = 0 THEN NULL ELSE consolidated_months[8] END,
        CASE WHEN consolidated_months[9] = 0 THEN NULL ELSE consolidated_months[9] END,
        CASE WHEN consolidated_months[10] = 0 THEN NULL ELSE consolidated_months[10] END,
        CASE WHEN consolidated_months[11] = 0 THEN NULL ELSE consolidated_months[11] END,
        CASE WHEN consolidated_months[12] = 0 THEN NULL ELSE consolidated_months[12] END,
        NULL, -- variations_pourcent sera calculé par trigger
        NULL  -- performances_pourcent sera calculé par trigger
      );
    END IF;
  END LOOP;
END;
$$;

-- Créer la table dataconsolidate
CREATE TABLE IF NOT EXISTS dataconsolidate (
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

-- Commentaire sur la table
COMMENT ON TABLE dataconsolidate IS 'Table de consolidation des indicateurs avec logique basée sur la formule';
COMMENT ON COLUMN dataconsolidate.valeur IS 'Valeur consolidée selon la formule (somme, moyenne, ou dernier mois)';
COMMENT ON COLUMN dataconsolidate.site_names IS 'Liste des sites consolidés';
COMMENT ON COLUMN dataconsolidate.formule IS 'Formule de consolidation récupérée depuis indicators';

-- Activer RLS
ALTER TABLE dataconsolidate ENABLE ROW LEVEL SECURITY;

-- Politiques RLS
CREATE POLICY "Enable read access for authenticated users on dataconsolidate"
  ON dataconsolidate
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert for authenticated users on dataconsolidate"
  ON dataconsolidate
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users on dataconsolidate"
  ON dataconsolidate
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Enable delete for authenticated users on dataconsolidate"
  ON dataconsolidate
  FOR DELETE
  TO authenticated
  USING (true);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_dataconsolidate_org ON dataconsolidate USING btree (organization_name);
CREATE INDEX IF NOT EXISTS idx_dataconsolidate_filiere ON dataconsolidate USING btree (filiere_name);
CREATE INDEX IF NOT EXISTS idx_dataconsolidate_filiale ON dataconsolidate USING btree (filiale_name);
CREATE INDEX IF NOT EXISTS idx_dataconsolidate_indicator_code ON dataconsolidate USING btree (indicator_code);
CREATE INDEX IF NOT EXISTS idx_dataconsolidate_year ON dataconsolidate USING btree (year);
CREATE INDEX IF NOT EXISTS idx_dataconsolidate_indicator_year ON dataconsolidate USING btree (indicator_code, year);
CREATE INDEX IF NOT EXISTS idx_dataconsolidate_org_structure ON dataconsolidate USING btree (organization_name, filiere_name, filiale_name);
CREATE INDEX IF NOT EXISTS idx_dataconsolidate_site_names ON dataconsolidate USING gin (site_names);
CREATE INDEX IF NOT EXISTS idx_dataconsolidate_formule ON dataconsolidate USING btree (formule);

-- Index unique pour éviter les doublons
CREATE UNIQUE INDEX IF NOT EXISTS dataconsolidate_unique_idx 
ON dataconsolidate USING btree (
  organization_name, 
  COALESCE(filiere_name, ''), 
  COALESCE(filiale_name, ''), 
  indicator_code, 
  year
);

-- Fonction pour calculer les variations et performances
CREATE OR REPLACE FUNCTION calculate_dataconsolidate_metrics()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Calculer la variation en pourcentage
  IF NEW.valeur IS NOT NULL AND NEW.valeur_precedente IS NOT NULL AND NEW.valeur_precedente != 0 THEN
    NEW.variations_pourcent := ROUND(((NEW.valeur - NEW.valeur_precedente) / NEW.valeur_precedente * 100)::numeric, 2);
  ELSE
    NEW.variations_pourcent := NULL;
  END IF;
  
  -- Calculer la performance en pourcentage
  IF NEW.valeur IS NOT NULL AND NEW.cible IS NOT NULL AND NEW.cible != 0 THEN
    NEW.performances_pourcent := ROUND((NEW.valeur / NEW.cible * 100)::numeric, 2);
  ELSE
    NEW.performances_pourcent := NULL;
  END IF;
  
  -- Calculer la variation textuelle
  IF NEW.variations_pourcent IS NOT NULL THEN
    IF NEW.variations_pourcent > 0 THEN
      NEW.variation := '+' || NEW.variations_pourcent::text || '%';
    ELSE
      NEW.variation := NEW.variations_pourcent::text || '%';
    END IF;
  ELSE
    NEW.variation := NULL;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger pour calculer automatiquement les métriques
CREATE TRIGGER trigger_calculate_dataconsolidate_metrics
  BEFORE INSERT OR UPDATE OF valeur, cible ON dataconsolidate
  FOR EACH ROW EXECUTE FUNCTION calculate_dataconsolidate_metrics();

-- Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_dataconsolidate_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Trigger pour updated_at
CREATE TRIGGER update_dataconsolidate_updated_at
  BEFORE UPDATE ON dataconsolidate
  FOR EACH ROW EXECUTE FUNCTION update_dataconsolidate_updated_at();

-- Trigger pour synchroniser automatiquement depuis site_global_indicator_values_simple
CREATE OR REPLACE FUNCTION trigger_consolidate_dataconsolidate()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Recalculer les consolidations pour cet indicateur et cette année
  PERFORM consolidate_indicators_dataconsolidate();
  RETURN NULL;
END;
$$;

-- Trigger sur site_global_indicator_values_simple
CREATE TRIGGER trigger_update_dataconsolidate
  AFTER INSERT OR UPDATE OR DELETE ON site_global_indicator_values_simple
  FOR EACH STATEMENT EXECUTE FUNCTION trigger_consolidate_dataconsolidate();

-- Vue pour faciliter les requêtes avec type de consolidation
CREATE OR REPLACE VIEW dataconsolidate_with_type AS
SELECT 
  *,
  determine_consolidation_type_dataconsolidate(formule) as consolidation_type
FROM dataconsolidate;

-- Commentaire sur la vue
COMMENT ON VIEW dataconsolidate_with_type IS 'Vue de dataconsolidate avec le type de consolidation calculé';

-- Fonction utilitaire pour forcer la recalculation
CREATE OR REPLACE FUNCTION refresh_dataconsolidate()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM consolidate_indicators_dataconsolidate();
END;
$$;

-- Exécuter la consolidation initiale
SELECT consolidate_indicators_dataconsolidate();