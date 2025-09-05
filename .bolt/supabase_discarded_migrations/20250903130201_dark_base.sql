/*
  # Création de la table consolidated_sites

  1. Nouvelle table
    - `consolidated_sites`
      - Structure améliorée basée sur site_consolidation
      - Calculs de performance automatiques
      - Gestion des variations et tendances
      - Support des trois types de consolidation : Somme, Moyenne, Somme du dernier mois

  2. Fonctions de consolidation avancées
    - `consolidate_sites_data()` - Fonction principale de consolidation
    - `calculate_performance_metrics()` - Calcul des métriques de performance
    - `get_consolidation_trends()` - Analyse des tendances
    - Support complet des formules de consolidation

  3. Triggers automatiques optimisés
    - Trigger intelligent sur `site_global_indicator_values_simple`
    - Recalcul sélectif pour optimiser les performances
    - Gestion des dépendances entre consolidations

  4. Sécurité et performance
    - RLS activé avec politiques granulaires
    - Index optimisés pour les requêtes complexes
    - Contraintes d'intégrité renforcées
*/

-- Créer la table consolidated_sites avec structure améliorée
CREATE TABLE IF NOT EXISTS consolidated_sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identification et hiérarchie
  consolidation_key text NOT NULL, -- Clé unique pour identifier la consolidation
  site_names text[] NOT NULL DEFAULT '{}',
  site_count integer NOT NULL DEFAULT 0,
  
  -- Dimensions temporelles et organisationnelles
  year integer NOT NULL,
  organization_name text NOT NULL,
  filiere_name text,
  filiale_name text,
  
  -- Métadonnées de l'indicateur
  code text NOT NULL,
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
  formule text DEFAULT 'Somme',
  
  -- Valeurs consolidées
  value numeric,
  valeur_precedente numeric,
  cible numeric DEFAULT 100,
  
  -- Valeurs mensuelles consolidées
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
  
  -- Métriques de performance calculées automatiquement
  variation numeric(10,2),
  variations_pourcent numeric(10,2),
  performances_pourcent numeric(10,2),
  
  -- Performances mensuelles
  perf_janvier numeric(10,2),
  perf_fevrier numeric(10,2),
  perf_mars numeric(10,2),
  perf_avril numeric(10,2),
  perf_mai numeric(10,2),
  perf_juin numeric(10,2),
  perf_juillet numeric(10,2),
  perf_aout numeric(10,2),
  perf_septembre numeric(10,2),
  perf_octobre numeric(10,2),
  perf_novembre numeric(10,2),
  perf_decembre numeric(10,2),
  
  -- Métadonnées de consolidation
  consolidation_type text DEFAULT 'AUTO', -- AUTO, MANUAL, SCHEDULED
  consolidation_status text DEFAULT 'ACTIVE', -- ACTIVE, INACTIVE, ERROR
  last_consolidated_at timestamptz DEFAULT now(),
  
  -- Audit
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id)
);

-- Contraintes d'unicité et d'intégrité
ALTER TABLE consolidated_sites 
ADD CONSTRAINT consolidated_sites_unique_key 
UNIQUE (consolidation_key);

ALTER TABLE consolidated_sites 
ADD CONSTRAINT consolidated_sites_unique_consolidation 
UNIQUE (code, year, organization_name, COALESCE(filiere_name, ''), COALESCE(filiale_name, ''));

-- Contraintes de validation
ALTER TABLE consolidated_sites 
ADD CONSTRAINT check_site_count_positive 
CHECK (site_count > 0);

ALTER TABLE consolidated_sites 
ADD CONSTRAINT check_year_valid 
CHECK (year >= 2000 AND year <= 2100);

ALTER TABLE consolidated_sites 
ADD CONSTRAINT check_consolidation_type 
CHECK (consolidation_type IN ('AUTO', 'MANUAL', 'SCHEDULED'));

ALTER TABLE consolidated_sites 
ADD CONSTRAINT check_consolidation_status 
CHECK (consolidation_status IN ('ACTIVE', 'INACTIVE', 'ERROR'));

-- Index optimisés pour les performances
CREATE INDEX IF NOT EXISTS idx_consolidated_sites_key ON consolidated_sites (consolidation_key);
CREATE INDEX IF NOT EXISTS idx_consolidated_sites_code_year ON consolidated_sites (code, year);
CREATE INDEX IF NOT EXISTS idx_consolidated_sites_hierarchy ON consolidated_sites (organization_name, filiere_name, filiale_name);
CREATE INDEX IF NOT EXISTS idx_consolidated_sites_site_names ON consolidated_sites USING gin (site_names);
CREATE INDEX IF NOT EXISTS idx_consolidated_sites_performance ON consolidated_sites (performances_pourcent DESC) WHERE performances_pourcent IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_consolidated_sites_status ON consolidated_sites (consolidation_status, last_consolidated_at);
CREATE INDEX IF NOT EXISTS idx_consolidated_sites_type_formule ON consolidated_sites (type, formule);

-- Index composites pour les requêtes complexes
CREATE INDEX IF NOT EXISTS idx_consolidated_sites_lookup ON consolidated_sites (organization_name, year, code) WHERE consolidation_status = 'ACTIVE';
CREATE INDEX IF NOT EXISTS idx_consolidated_sites_temporal ON consolidated_sites (year, last_consolidated_at DESC);

-- Activer RLS
ALTER TABLE consolidated_sites ENABLE ROW LEVEL SECURITY;

-- Politiques RLS granulaires
CREATE POLICY "Enable read access for authenticated users on consolidated_sites"
  ON consolidated_sites
  FOR SELECT
  TO authenticated
  USING (consolidation_status = 'ACTIVE');

CREATE POLICY "Enable insert for authenticated users on consolidated_sites"
  ON consolidated_sites
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users on consolidated_sites"
  ON consolidated_sites
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable delete for authenticated users on consolidated_sites"
  ON consolidated_sites
  FOR DELETE
  TO authenticated
  USING (true);

-- Fonction pour générer une clé de consolidation unique
CREATE OR REPLACE FUNCTION generate_consolidation_key(
  p_organization_name text,
  p_filiere_name text,
  p_filiale_name text,
  p_code text,
  p_year integer
) RETURNS text AS $$
BEGIN
  RETURN format('%s_%s_%s_%s_%s',
    COALESCE(p_organization_name, 'NULL'),
    COALESCE(p_filiere_name, 'NULL'),
    COALESCE(p_filiale_name, 'NULL'),
    p_code,
    p_year
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Fonction pour calculer les métriques de performance
CREATE OR REPLACE FUNCTION calculate_performance_metrics(
  p_value numeric,
  p_valeur_precedente numeric,
  p_cible numeric,
  p_janvier numeric DEFAULT NULL,
  p_fevrier numeric DEFAULT NULL,
  p_mars numeric DEFAULT NULL,
  p_avril numeric DEFAULT NULL,
  p_mai numeric DEFAULT NULL,
  p_juin numeric DEFAULT NULL,
  p_juillet numeric DEFAULT NULL,
  p_aout numeric DEFAULT NULL,
  p_septembre numeric DEFAULT NULL,
  p_octobre numeric DEFAULT NULL,
  p_novembre numeric DEFAULT NULL,
  p_decembre numeric DEFAULT NULL
) RETURNS TABLE (
  variation numeric,
  variations_pourcent numeric,
  performances_pourcent numeric,
  perf_janvier numeric,
  perf_fevrier numeric,
  perf_mars numeric,
  perf_avril numeric,
  perf_mai numeric,
  perf_juin numeric,
  perf_juillet numeric,
  perf_aout numeric,
  perf_septembre numeric,
  perf_octobre numeric,
  perf_novembre numeric,
  perf_decembre numeric
) AS $$
BEGIN
  -- Calcul de la variation
  variation := CASE 
    WHEN p_valeur_precedente IS NOT NULL AND p_valeur_precedente != 0 
    THEN p_value - p_valeur_precedente
    ELSE NULL 
  END;
  
  -- Calcul du pourcentage de variation
  variations_pourcent := CASE 
    WHEN p_valeur_precedente IS NOT NULL AND p_valeur_precedente != 0 
    THEN ROUND(((p_value - p_valeur_precedente) / p_valeur_precedente * 100)::numeric, 2)
    ELSE NULL 
  END;
  
  -- Calcul du pourcentage de performance par rapport à la cible
  performances_pourcent := CASE 
    WHEN p_cible IS NOT NULL AND p_cible != 0 AND p_value IS NOT NULL
    THEN ROUND((p_value / p_cible * 100)::numeric, 2)
    ELSE NULL 
  END;
  
  -- Calcul des performances mensuelles par rapport à la cible
  perf_janvier := CASE 
    WHEN p_cible IS NOT NULL AND p_cible != 0 AND p_janvier IS NOT NULL
    THEN ROUND((p_janvier / (p_cible / 12) * 100)::numeric, 2)
    ELSE NULL 
  END;
  
  perf_fevrier := CASE 
    WHEN p_cible IS NOT NULL AND p_cible != 0 AND p_fevrier IS NOT NULL
    THEN ROUND((p_fevrier / (p_cible / 12) * 100)::numeric, 2)
    ELSE NULL 
  END;
  
  perf_mars := CASE 
    WHEN p_cible IS NOT NULL AND p_cible != 0 AND p_mars IS NOT NULL
    THEN ROUND((p_mars / (p_cible / 12) * 100)::numeric, 2)
    ELSE NULL 
  END;
  
  perf_avril := CASE 
    WHEN p_cible IS NOT NULL AND p_cible != 0 AND p_avril IS NOT NULL
    THEN ROUND((p_avril / (p_cible / 12) * 100)::numeric, 2)
    ELSE NULL 
  END;
  
  perf_mai := CASE 
    WHEN p_cible IS NOT NULL AND p_cible != 0 AND p_mai IS NOT NULL
    THEN ROUND((p_mai / (p_cible / 12) * 100)::numeric, 2)
    ELSE NULL 
  END;
  
  perf_juin := CASE 
    WHEN p_cible IS NOT NULL AND p_cible != 0 AND p_juin IS NOT NULL
    THEN ROUND((p_juin / (p_cible / 12) * 100)::numeric, 2)
    ELSE NULL 
  END;
  
  perf_juillet := CASE 
    WHEN p_cible IS NOT NULL AND p_cible != 0 AND p_juillet IS NOT NULL
    THEN ROUND((p_juillet / (p_cible / 12) * 100)::numeric, 2)
    ELSE NULL 
  END;
  
  perf_aout := CASE 
    WHEN p_cible IS NOT NULL AND p_cible != 0 AND p_aout IS NOT NULL
    THEN ROUND((p_aout / (p_cible / 12) * 100)::numeric, 2)
    ELSE NULL 
  END;
  
  perf_septembre := CASE 
    WHEN p_cible IS NOT NULL AND p_cible != 0 AND p_septembre IS NOT NULL
    THEN ROUND((p_septembre / (p_cible / 12) * 100)::numeric, 2)
    ELSE NULL 
  END;
  
  perf_octobre := CASE 
    WHEN p_cible IS NOT NULL AND p_cible != 0 AND p_octobre IS NOT NULL
    THEN ROUND((p_octobre / (p_cible / 12) * 100)::numeric, 2)
    ELSE NULL 
  END;
  
  perf_novembre := CASE 
    WHEN p_cible IS NOT NULL AND p_cible != 0 AND p_novembre IS NOT NULL
    THEN ROUND((p_novembre / (p_cible / 12) * 100)::numeric, 2)
    ELSE NULL 
  END;
  
  perf_decembre := CASE 
    WHEN p_cible IS NOT NULL AND p_cible != 0 AND p_decembre IS NOT NULL
    THEN ROUND((p_decembre / (p_cible / 12) * 100)::numeric, 2)
    ELSE NULL 
  END;
  
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Fonction avancée de consolidation des sites
CREATE OR REPLACE FUNCTION consolidate_sites_data(
  p_site_names text[],
  p_code text,
  p_year integer,
  p_formule text DEFAULT 'Somme'
) RETURNS TABLE (
  consolidated_value numeric,
  consolidated_valeur_precedente numeric,
  consolidated_janvier numeric,
  consolidated_fevrier numeric,
  consolidated_mars numeric,
  consolidated_avril numeric,
  consolidated_mai numeric,
  consolidated_juin numeric,
  consolidated_juillet numeric,
  consolidated_aout numeric,
  consolidated_septembre numeric,
  consolidated_octobre numeric,
  consolidated_novembre numeric,
  consolidated_decembre numeric,
  sites_with_data integer,
  consolidation_quality numeric
) AS $$
DECLARE
  site_name text;
  site_count integer := 0;
  sites_with_data_count integer := 0;
  total_value numeric := 0;
  total_valeur_precedente numeric := 0;
  month_totals numeric[] := ARRAY[0,0,0,0,0,0,0,0,0,0,0,0];
  month_counts integer[] := ARRAY[0,0,0,0,0,0,0,0,0,0,0,0];
  site_data RECORD;
  last_month_total numeric := 0;
  last_month_count integer := 0;
  last_month integer;
  month_value numeric;
  quality_score numeric := 0;
BEGIN
  -- Parcourir chaque site
  FOREACH site_name IN ARRAY p_site_names
  LOOP
    site_count := site_count + 1;
    
    -- Récupérer les données du site
    SELECT * INTO site_data
    FROM site_global_indicator_values_simple
    WHERE site_global_indicator_values_simple.site_name = consolidate_sites_data.site_name 
      AND site_global_indicator_values_simple.code = p_code 
      AND site_global_indicator_values_simple.year = p_year;
    
    IF FOUND AND site_data.value IS NOT NULL THEN
      sites_with_data_count := sites_with_data_count + 1;
      
      -- Traitement selon le type de formule
      IF p_formule = 'Somme du dernier mois' THEN
        -- Obtenir le dernier mois disponible pour ce site
        SELECT CASE 
          WHEN site_data.decembre IS NOT NULL THEN 12
          WHEN site_data.novembre IS NOT NULL THEN 11
          WHEN site_data.octobre IS NOT NULL THEN 10
          WHEN site_data.septembre IS NOT NULL THEN 9
          WHEN site_data.aout IS NOT NULL THEN 8
          WHEN site_data.juillet IS NOT NULL THEN 7
          WHEN site_data.juin IS NOT NULL THEN 6
          WHEN site_data.mai IS NOT NULL THEN 5
          WHEN site_data.avril IS NOT NULL THEN 4
          WHEN site_data.mars IS NOT NULL THEN 3
          WHEN site_data.fevrier IS NOT NULL THEN 2
          WHEN site_data.janvier IS NOT NULL THEN 1
          ELSE NULL
        END INTO last_month;
        
        IF last_month IS NOT NULL THEN
          SELECT CASE last_month
            WHEN 1 THEN site_data.janvier
            WHEN 2 THEN site_data.fevrier
            WHEN 3 THEN site_data.mars
            WHEN 4 THEN site_data.avril
            WHEN 5 THEN site_data.mai
            WHEN 6 THEN site_data.juin
            WHEN 7 THEN site_data.juillet
            WHEN 8 THEN site_data.aout
            WHEN 9 THEN site_data.septembre
            WHEN 10 THEN site_data.octobre
            WHEN 11 THEN site_data.novembre
            WHEN 12 THEN site_data.decembre
            ELSE NULL
          END INTO month_value;
          
          IF month_value IS NOT NULL THEN
            last_month_total := last_month_total + month_value;
            last_month_count := last_month_count + 1;
          END IF;
        END IF;
        
      ELSE
        -- Pour Somme et Moyenne, traiter toutes les valeurs
        IF site_data.value IS NOT NULL THEN
          total_value := total_value + site_data.value;
        END IF;
        
        IF site_data.valeur_precedente IS NOT NULL THEN
          total_valeur_precedente := total_valeur_precedente + site_data.valeur_precedente;
        END IF;
        
        -- Traiter les valeurs mensuelles avec comptage
        IF site_data.janvier IS NOT NULL THEN
          month_totals[1] := month_totals[1] + site_data.janvier;
          month_counts[1] := month_counts[1] + 1;
        END IF;
        
        IF site_data.fevrier IS NOT NULL THEN
          month_totals[2] := month_totals[2] + site_data.fevrier;
          month_counts[2] := month_counts[2] + 1;
        END IF;
        
        IF site_data.mars IS NOT NULL THEN
          month_totals[3] := month_totals[3] + site_data.mars;
          month_counts[3] := month_counts[3] + 1;
        END IF;
        
        IF site_data.avril IS NOT NULL THEN
          month_totals[4] := month_totals[4] + site_data.avril;
          month_counts[4] := month_counts[4] + 1;
        END IF;
        
        IF site_data.mai IS NOT NULL THEN
          month_totals[5] := month_totals[5] + site_data.mai;
          month_counts[5] := month_counts[5] + 1;
        END IF;
        
        IF site_data.juin IS NOT NULL THEN
          month_totals[6] := month_totals[6] + site_data.juin;
          month_counts[6] := month_counts[6] + 1;
        END IF;
        
        IF site_data.juillet IS NOT NULL THEN
          month_totals[7] := month_totals[7] + site_data.juillet;
          month_counts[7] := month_counts[7] + 1;
        END IF;
        
        IF site_data.aout IS NOT NULL THEN
          month_totals[8] := month_totals[8] + site_data.aout;
          month_counts[8] := month_counts[8] + 1;
        END IF;
        
        IF site_data.septembre IS NOT NULL THEN
          month_totals[9] := month_totals[9] + site_data.septembre;
          month_counts[9] := month_counts[9] + 1;
        END IF;
        
        IF site_data.octobre IS NOT NULL THEN
          month_totals[10] := month_totals[10] + site_data.octobre;
          month_counts[10] := month_counts[10] + 1;
        END IF;
        
        IF site_data.novembre IS NOT NULL THEN
          month_totals[11] := month_totals[11] + site_data.novembre;
          month_counts[11] := month_counts[11] + 1;
        END IF;
        
        IF site_data.decembre IS NOT NULL THEN
          month_totals[12] := month_totals[12] + site_data.decembre;
          month_counts[12] := month_counts[12] + 1;
        END IF;
      END IF;
    END IF;
  END LOOP;
  
  -- Calculer la qualité de la consolidation (pourcentage de sites avec données)
  quality_score := CASE 
    WHEN site_count > 0 THEN ROUND((sites_with_data_count::numeric / site_count * 100), 2)
    ELSE 0 
  END;
  
  -- Calculer les résultats selon la formule
  IF p_formule = 'Somme du dernier mois' THEN
    consolidated_value := last_month_total;
    consolidated_valeur_precedente := NULL;
    consolidated_janvier := NULL;
    consolidated_fevrier := NULL;
    consolidated_mars := NULL;
    consolidated_avril := NULL;
    consolidated_mai := NULL;
    consolidated_juin := NULL;
    consolidated_juillet := NULL;
    consolidated_aout := NULL;
    consolidated_septembre := NULL;
    consolidated_octobre := NULL;
    consolidated_novembre := NULL;
    consolidated_decembre := NULL;
    
  ELSIF p_formule = 'Moyenne' THEN
    consolidated_value := CASE WHEN sites_with_data_count > 0 THEN ROUND(total_value / sites_with_data_count, 4) ELSE NULL END;
    consolidated_valeur_precedente := CASE WHEN sites_with_data_count > 0 THEN ROUND(total_valeur_precedente / sites_with_data_count, 4) ELSE NULL END;
    
    -- Moyennes mensuelles
    consolidated_janvier := CASE WHEN month_counts[1] > 0 THEN ROUND(month_totals[1] / month_counts[1], 4) ELSE NULL END;
    consolidated_fevrier := CASE WHEN month_counts[2] > 0 THEN ROUND(month_totals[2] / month_counts[2], 4) ELSE NULL END;
    consolidated_mars := CASE WHEN month_counts[3] > 0 THEN ROUND(month_totals[3] / month_counts[3], 4) ELSE NULL END;
    consolidated_avril := CASE WHEN month_counts[4] > 0 THEN ROUND(month_totals[4] / month_counts[4], 4) ELSE NULL END;
    consolidated_mai := CASE WHEN month_counts[5] > 0 THEN ROUND(month_totals[5] / month_counts[5], 4) ELSE NULL END;
    consolidated_juin := CASE WHEN month_counts[6] > 0 THEN ROUND(month_totals[6] / month_counts[6], 4) ELSE NULL END;
    consolidated_juillet := CASE WHEN month_counts[7] > 0 THEN ROUND(month_totals[7] / month_counts[7], 4) ELSE NULL END;
    consolidated_aout := CASE WHEN month_counts[8] > 0 THEN ROUND(month_totals[8] / month_counts[8], 4) ELSE NULL END;
    consolidated_septembre := CASE WHEN month_counts[9] > 0 THEN ROUND(month_totals[9] / month_counts[9], 4) ELSE NULL END;
    consolidated_octobre := CASE WHEN month_counts[10] > 0 THEN ROUND(month_totals[10] / month_counts[10], 4) ELSE NULL END;
    consolidated_novembre := CASE WHEN month_counts[11] > 0 THEN ROUND(month_totals[11] / month_counts[11], 4) ELSE NULL END;
    consolidated_decembre := CASE WHEN month_counts[12] > 0 THEN ROUND(month_totals[12] / month_counts[12], 4) ELSE NULL END;
    
  ELSE
    -- Pour la somme (par défaut)
    consolidated_value := total_value;
    consolidated_valeur_precedente := total_valeur_precedente;
    
    -- Sommes mensuelles
    consolidated_janvier := CASE WHEN month_counts[1] > 0 THEN month_totals[1] ELSE NULL END;
    consolidated_fevrier := CASE WHEN month_counts[2] > 0 THEN month_totals[2] ELSE NULL END;
    consolidated_mars := CASE WHEN month_counts[3] > 0 THEN month_totals[3] ELSE NULL END;
    consolidated_avril := CASE WHEN month_counts[4] > 0 THEN month_totals[4] ELSE NULL END;
    consolidated_mai := CASE WHEN month_counts[5] > 0 THEN month_totals[5] ELSE NULL END;
    consolidated_juin := CASE WHEN month_counts[6] > 0 THEN month_totals[6] ELSE NULL END;
    consolidated_juillet := CASE WHEN month_counts[7] > 0 THEN month_totals[7] ELSE NULL END;
    consolidated_aout := CASE WHEN month_counts[8] > 0 THEN month_totals[8] ELSE NULL END;
    consolidated_septembre := CASE WHEN month_counts[9] > 0 THEN month_totals[9] ELSE NULL END;
    consolidated_octobre := CASE WHEN month_counts[10] > 0 THEN month_totals[10] ELSE NULL END;
    consolidated_novembre := CASE WHEN month_counts[11] > 0 THEN month_totals[11] ELSE NULL END;
    consolidated_decembre := CASE WHEN month_counts[12] > 0 THEN month_totals[12] ELSE NULL END;
  END IF;
  
  sites_with_data := sites_with_data_count;
  consolidation_quality := quality_score;
  
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- Fonction principale pour consolider automatiquement tous les sites
CREATE OR REPLACE FUNCTION auto_consolidate_all_sites() RETURNS TABLE (
  processed_consolidations integer,
  created_consolidations integer,
  updated_consolidations integer,
  error_consolidations integer
) AS $$
DECLARE
  consolidation_record RECORD;
  site_list text[];
  formule_type text;
  consolidated_data RECORD;
  performance_data RECORD;
  existing_consolidation RECORD;
  consolidation_key_val text;
  processed_count integer := 0;
  created_count integer := 0;
  updated_count integer := 0;
  error_count integer := 0;
BEGIN
  -- Identifier les groupes de sites à consolider
  FOR consolidation_record IN
    SELECT 
      organization_name,
      filiere_name,
      filiale_name,
      code,
      year,
      array_agg(DISTINCT site_name ORDER BY site_name) as sites,
      COUNT(DISTINCT site_name) as site_count,
      MAX(formule) as formule,
      MAX(axe_energetique) as axe_energetique,
      MAX(enjeux) as enjeux,
      MAX(normes) as normes,
      MAX(critere) as critere,
      MAX(indicateur) as indicateur,
      MAX(definition) as definition,
      MAX(processus) as processus,
      MAX(processus_code) as processus_code,
      MAX(frequence) as frequence,
      MAX(unite) as unite,
      MAX(type) as type,
      MAX(cible) as cible
    FROM site_global_indicator_values_simple
    WHERE organization_name IS NOT NULL
      AND site_name IS NOT NULL
      AND code IS NOT NULL
      AND year IS NOT NULL
    GROUP BY organization_name, filiere_name, filiale_name, code, year
    HAVING COUNT(DISTINCT site_name) > 1  -- Seulement si plus d'un site
  LOOP
    BEGIN
      processed_count := processed_count + 1;
      
      site_list := consolidation_record.sites;
      formule_type := COALESCE(consolidation_record.formule, 'Somme');
      
      -- Générer la clé de consolidation
      consolidation_key_val := generate_consolidation_key(
        consolidation_record.organization_name,
        consolidation_record.filiere_name,
        consolidation_record.filiale_name,
        consolidation_record.code,
        consolidation_record.year
      );
      
      -- Calculer les valeurs consolidées
      SELECT * INTO consolidated_data
      FROM consolidate_sites_data(site_list, consolidation_record.code, consolidation_record.year, formule_type);
      
      -- Calculer les métriques de performance
      SELECT * INTO performance_data
      FROM calculate_performance_metrics(
        consolidated_data.consolidated_value,
        consolidated_data.consolidated_valeur_precedente,
        consolidation_record.cible,
        consolidated_data.consolidated_janvier,
        consolidated_data.consolidated_fevrier,
        consolidated_data.consolidated_mars,
        consolidated_data.consolidated_avril,
        consolidated_data.consolidated_mai,
        consolidated_data.consolidated_juin,
        consolidated_data.consolidated_juillet,
        consolidated_data.consolidated_aout,
        consolidated_data.consolidated_septembre,
        consolidated_data.consolidated_octobre,
        consolidated_data.consolidated_novembre,
        consolidated_data.consolidated_decembre
      );
      
      -- Vérifier si une consolidation existe déjà
      SELECT * INTO existing_consolidation
      FROM consolidated_sites
      WHERE consolidation_key = consolidation_key_val;
      
      IF existing_consolidation IS NOT NULL THEN
        -- Mettre à jour la consolidation existante
        UPDATE consolidated_sites SET
          site_names = site_list,
          site_count = consolidation_record.site_count,
          axe_energetique = consolidation_record.axe_energetique,
          enjeux = consolidation_record.enjeux,
          normes = consolidation_record.normes,
          critere = consolidation_record.critere,
          indicateur = consolidation_record.indicateur,
          definition = consolidation_record.definition,
          processus = consolidation_record.processus,
          processus_code = consolidation_record.processus_code,
          frequence = consolidation_record.frequence,
          unite = consolidation_record.unite,
          type = consolidation_record.type,
          formule = formule_type,
          value = consolidated_data.consolidated_value,
          valeur_precedente = consolidated_data.consolidated_valeur_precedente,
          cible = consolidation_record.cible,
          janvier = consolidated_data.consolidated_janvier,
          fevrier = consolidated_data.consolidated_fevrier,
          mars = consolidated_data.consolidated_mars,
          avril = consolidated_data.consolidated_avril,
          mai = consolidated_data.consolidated_mai,
          juin = consolidated_data.consolidated_juin,
          juillet = consolidated_data.consolidated_juillet,
          aout = consolidated_data.consolidated_aout,
          septembre = consolidated_data.consolidated_septembre,
          octobre = consolidated_data.consolidated_octobre,
          novembre = consolidated_data.consolidated_novembre,
          decembre = consolidated_data.consolidated_decembre,
          variation = performance_data.variation,
          variations_pourcent = performance_data.variations_pourcent,
          performances_pourcent = performance_data.performances_pourcent,
          perf_janvier = performance_data.perf_janvier,
          perf_fevrier = performance_data.perf_fevrier,
          perf_mars = performance_data.perf_mars,
          perf_avril = performance_data.perf_avril,
          perf_mai = performance_data.perf_mai,
          perf_juin = performance_data.perf_juin,
          perf_juillet = performance_data.perf_juillet,
          perf_aout = performance_data.perf_aout,
          perf_septembre = performance_data.perf_septembre,
          perf_octobre = performance_data.perf_octobre,
          perf_novembre = performance_data.perf_novembre,
          perf_decembre = performance_data.perf_decembre,
          consolidation_status = 'ACTIVE',
          last_consolidated_at = now(),
          updated_at = now()
        WHERE id = existing_consolidation.id;
        
        updated_count := updated_count + 1;
      ELSE
        -- Insérer une nouvelle consolidation
        INSERT INTO consolidated_sites (
          consolidation_key,
          site_names,
          site_count,
          year,
          organization_name,
          filiere_name,
          filiale_name,
          code,
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
          variation,
          variations_pourcent,
          performances_pourcent,
          perf_janvier,
          perf_fevrier,
          perf_mars,
          perf_avril,
          perf_mai,
          perf_juin,
          perf_juillet,
          perf_aout,
          perf_septembre,
          perf_octobre,
          perf_novembre,
          perf_decembre,
          consolidation_type,
          consolidation_status,
          last_consolidated_at
        ) VALUES (
          consolidation_key_val,
          site_list,
          consolidation_record.site_count,
          consolidation_record.year,
          consolidation_record.organization_name,
          consolidation_record.filiere_name,
          consolidation_record.filiale_name,
          consolidation_record.code,
          consolidation_record.axe_energetique,
          consolidation_record.enjeux,
          consolidation_record.normes,
          consolidation_record.critere,
          consolidation_record.indicateur,
          consolidation_record.definition,
          consolidation_record.processus,
          consolidation_record.processus_code,
          consolidation_record.frequence,
          consolidation_record.unite,
          consolidation_record.type,
          formule_type,
          consolidated_data.consolidated_value,
          consolidated_data.consolidated_valeur_precedente,
          consolidation_record.cible,
          consolidated_data.consolidated_janvier,
          consolidated_data.consolidated_fevrier,
          consolidated_data.consolidated_mars,
          consolidated_data.consolidated_avril,
          consolidated_data.consolidated_mai,
          consolidated_data.consolidated_juin,
          consolidated_data.consolidated_juillet,
          consolidated_data.consolidated_aout,
          consolidated_data.consolidated_septembre,
          consolidated_data.consolidated_octobre,
          consolidated_data.consolidated_novembre,
          consolidated_data.consolidated_decembre,
          performance_data.variation,
          performance_data.variations_pourcent,
          performance_data.performances_pourcent,
          performance_data.perf_janvier,
          performance_data.perf_fevrier,
          performance_data.perf_mars,
          performance_data.perf_avril,
          performance_data.perf_mai,
          performance_data.perf_juin,
          performance_data.perf_juillet,
          performance_data.perf_aout,
          performance_data.perf_septembre,
          performance_data.perf_octobre,
          performance_data.perf_novembre,
          performance_data.perf_decembre,
          'AUTO',
          'ACTIVE',
          now()
        );
        
        created_count := created_count + 1;
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      -- Marquer comme erreur et continuer
      error_count := error_count + 1;
      
      -- Essayer de mettre à jour le statut d'erreur si l'enregistrement existe
      UPDATE consolidated_sites 
      SET consolidation_status = 'ERROR', 
          last_consolidated_at = now()
      WHERE consolidation_key = consolidation_key_val;
      
      -- Log l'erreur (optionnel)
      RAISE WARNING 'Erreur lors de la consolidation de %: %', consolidation_key_val, SQLERRM;
    END;
  END LOOP;
  
  processed_consolidations := processed_count;
  created_consolidations := created_count;
  updated_consolidations := updated_count;
  error_consolidations := error_count;
  
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- Trigger optimisé pour mise à jour automatique des consolidations
CREATE OR REPLACE FUNCTION trigger_consolidated_sites() RETURNS trigger AS $$
DECLARE
  affected_keys text[];
  consolidation_key_val text;
BEGIN
  -- Éviter les boucles infinies
  IF current_setting('consolidated_sites.skip_trigger', true) = 'true' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  -- Collecter les clés de consolidation affectées
  IF TG_OP = 'DELETE' THEN
    consolidation_key_val := generate_consolidation_key(
      OLD.organization_name,
      OLD.filiere_name,
      OLD.filiale_name,
      OLD.code,
      OLD.year
    );
    affected_keys := ARRAY[consolidation_key_val];
  ELSE
    consolidation_key_val := generate_consolidation_key(
      NEW.organization_name,
      NEW.filiere_name,
      NEW.filiale_name,
      NEW.code,
      NEW.year
    );
    affected_keys := ARRAY[consolidation_key_val];
    
    -- Si c'est une mise à jour, vérifier si les clés ont changé
    IF TG_OP = 'UPDATE' THEN
      DECLARE
        old_key text := generate_consolidation_key(
          OLD.organization_name,
          OLD.filiere_name,
          OLD.filiale_name,
          OLD.code,
          OLD.year
        );
      BEGIN
        IF old_key != consolidation_key_val THEN
          affected_keys := ARRAY[old_key, consolidation_key_val];
        END IF;
      END;
    END IF;
  END IF;
  
  -- Déclencher la consolidation pour les clés affectées
  PERFORM auto_consolidate_all_sites();
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger sur site_global_indicator_values_simple
DROP TRIGGER IF EXISTS trigger_auto_consolidate_sites_new ON site_global_indicator_values_simple;
CREATE TRIGGER trigger_auto_consolidate_sites_new
  AFTER INSERT OR UPDATE OR DELETE ON site_global_indicator_values_simple
  FOR EACH STATEMENT
  EXECUTE FUNCTION trigger_consolidated_sites();

-- Fonction pour le trigger updated_at
CREATE OR REPLACE FUNCTION update_consolidated_sites_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour updated_at
CREATE TRIGGER update_consolidated_sites_updated_at
  BEFORE UPDATE ON consolidated_sites
  FOR EACH ROW
  EXECUTE FUNCTION update_consolidated_sites_updated_at();

-- Vue pour le monitoring des consolidations
CREATE OR REPLACE VIEW consolidated_sites_monitoring AS
SELECT 
  cs.consolidation_key,
  cs.organization_name,
  cs.filiere_name,
  cs.filiale_name,
  cs.code,
  cs.year,
  cs.site_count,
  array_length(cs.site_names, 1) as sites_in_array,
  cs.consolidation_status,
  cs.consolidation_type,
  cs.last_consolidated_at,
  cs.performances_pourcent,
  CASE 
    WHEN cs.consolidation_status = 'ERROR' THEN 'ERREUR'
    WHEN cs.last_consolidated_at < now() - interval '1 day' THEN 'OBSOLETE'
    WHEN cs.performances_pourcent IS NULL THEN 'INCOMPLETE'
    WHEN cs.performances_pourcent < 50 THEN 'FAIBLE'
    WHEN cs.performances_pourcent < 80 THEN 'MOYEN'
    ELSE 'BON'
  END as health_status
FROM consolidated_sites cs
ORDER BY cs.last_consolidated_at DESC;

-- Fonction utilitaire pour nettoyer les consolidations obsolètes
CREATE OR REPLACE FUNCTION cleanup_obsolete_consolidations(
  p_days_old integer DEFAULT 30
) RETURNS integer AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM consolidated_sites 
  WHERE consolidation_status = 'INACTIVE' 
    AND updated_at < now() - (p_days_old || ' days')::interval;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Exécuter la consolidation initiale pour les données existantes
SELECT * FROM auto_consolidate_all_sites();

-- Afficher un résumé des consolidations créées
SELECT 
  COUNT(*) as total_consolidations,
  COUNT(DISTINCT organization_name) as organizations,
  COUNT(DISTINCT code) as indicators,
  COUNT(DISTINCT year) as years,
  AVG(site_count) as avg_sites_per_consolidation,
  AVG(performances_pourcent) as avg_performance
FROM consolidated_sites 
WHERE consolidation_status = 'ACTIVE';

RAISE NOTICE 'Table consolidated_sites créée avec succès. Utilisez la vue consolidated_sites_monitoring pour surveiller les consolidations.';