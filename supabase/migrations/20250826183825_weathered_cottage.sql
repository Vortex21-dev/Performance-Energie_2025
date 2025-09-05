/*
  # Création de la table site_consolidation

  1. Nouvelle table
    - `site_consolidation`
      - Tous les attributs de `site_global_indicator_values_simple`
      - `site_names` (text[]) - Liste des sites consolidés
      - Contraintes et index appropriés

  2. Fonctions de consolidation
    - `consolidate_indicator_values()` - Fonction principale de consolidation
    - `get_last_available_month()` - Fonction pour obtenir le dernier mois disponible
    - Support des trois types de consolidation : Somme, Moyenne, Somme du dernier mois

  3. Triggers automatiques
    - Trigger sur `site_global_indicator_values_simple` pour mise à jour automatique
    - Recalcul automatique lors des changements de données

  4. Sécurité
    - RLS activé sur la nouvelle table
    - Politiques d'accès pour les utilisateurs authentifiés
*/

-- Créer la table site_consolidation
CREATE TABLE IF NOT EXISTS site_consolidation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_names text[] NOT NULL DEFAULT '{}',
  year integer NOT NULL,
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
  formule text,
  value numeric,
  valeur_precedente numeric,
  cible numeric DEFAULT 100,
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
  organization_name text,
  filiere_name text,
  filiale_name text,
  variations_pourcent numeric(10,2),
  performances_pourcent numeric(10,2),
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
  perf_decembre numeric(10,2)
);

-- Ajouter les contraintes
ALTER TABLE site_consolidation 
ADD CONSTRAINT site_consolidation_unique_idx 
UNIQUE (code, year, organization_name, filiere_name, filiale_name);

-- Créer les index pour optimiser les performances
CREATE INDEX IF NOT EXISTS idx_site_consolidation_code ON site_consolidation USING btree (code);
CREATE INDEX IF NOT EXISTS idx_site_consolidation_year ON site_consolidation USING btree (year);
CREATE INDEX IF NOT EXISTS idx_site_consolidation_site_names ON site_consolidation USING gin (site_names);
CREATE INDEX IF NOT EXISTS idx_site_consolidation_org ON site_consolidation USING btree (organization_name);
CREATE INDEX IF NOT EXISTS idx_site_consolidation_filiere ON site_consolidation USING btree (filiere_name);
CREATE INDEX IF NOT EXISTS idx_site_consolidation_filiale ON site_consolidation USING btree (filiale_name);
CREATE INDEX IF NOT EXISTS idx_site_consolidation_performance ON site_consolidation USING btree (performances_pourcent);

-- Activer RLS
ALTER TABLE site_consolidation ENABLE ROW LEVEL SECURITY;

-- Créer les politiques RLS
CREATE POLICY "Enable read access for authenticated users on site_consolidation"
  ON site_consolidation
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert for authenticated users on site_consolidation"
  ON site_consolidation
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users on site_consolidation"
  ON site_consolidation
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable delete for authenticated users on site_consolidation"
  ON site_consolidation
  FOR DELETE
  TO authenticated
  USING (true);

-- Fonction pour obtenir le dernier mois disponible pour un site et un indicateur
CREATE OR REPLACE FUNCTION get_last_available_month(
  p_site_name text,
  p_code text,
  p_year integer
) RETURNS integer AS $$
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
    
  RETURN last_month;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour obtenir la valeur d'un mois spécifique
CREATE OR REPLACE FUNCTION get_month_value(
  p_site_name text,
  p_code text,
  p_year integer,
  p_month integer
) RETURNS numeric AS $$
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
$$ LANGUAGE plpgsql;

-- Fonction principale de consolidation des indicateurs
CREATE OR REPLACE FUNCTION consolidate_indicator_values(
  p_site_names text[],
  p_code text,
  p_year integer,
  p_formule text DEFAULT 'Somme'
) RETURNS TABLE (
  consolidated_value numeric,
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
  consolidated_valeur_precedente numeric
) AS $$
DECLARE
  site_name text;
  site_count integer := 0;
  total_value numeric := 0;
  total_valeur_precedente numeric := 0;
  month_totals numeric[] := ARRAY[0,0,0,0,0,0,0,0,0,0,0,0];
  month_counts integer[] := ARRAY[0,0,0,0,0,0,0,0,0,0,0,0];
  site_data RECORD;
  last_month_total numeric := 0;
  last_month_count integer := 0;
  last_month integer;
  month_value numeric;
BEGIN
  -- Parcourir chaque site
  FOREACH site_name IN ARRAY p_site_names
  LOOP
    -- Récupérer les données du site
    SELECT * INTO site_data
    FROM site_global_indicator_values_simple
    WHERE site_global_indicator_values_simple.site_name = consolidate_indicator_values.site_name 
      AND site_global_indicator_values_simple.code = p_code 
      AND site_global_indicator_values_simple.year = p_year;
    
    IF FOUND THEN
      site_count := site_count + 1;
      
      -- Traitement selon le type de formule
      IF p_formule = 'Somme du dernier mois' THEN
        -- Obtenir le dernier mois disponible pour ce site
        last_month := get_last_available_month(site_name, p_code, p_year);
        
        IF last_month IS NOT NULL THEN
          month_value := get_month_value(site_name, p_code, p_year, last_month);
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
        
        -- Traiter les valeurs mensuelles
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
  
  -- Calculer les résultats selon la formule
  IF p_formule = 'Somme du dernier mois' THEN
    -- Pour "Somme du dernier mois", on retourne la somme des derniers mois
    consolidated_value := last_month_total;
    -- Les autres valeurs mensuelles restent NULL pour ce type de consolidation
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
    consolidated_valeur_precedente := NULL;
    
  ELSIF p_formule = 'Moyenne' THEN
    -- Pour la moyenne
    consolidated_value := CASE WHEN site_count > 0 THEN total_value / site_count ELSE NULL END;
    consolidated_valeur_precedente := CASE WHEN site_count > 0 THEN total_valeur_precedente / site_count ELSE NULL END;
    
    -- Moyennes mensuelles
    consolidated_janvier := CASE WHEN month_counts[1] > 0 THEN month_totals[1] / month_counts[1] ELSE NULL END;
    consolidated_fevrier := CASE WHEN month_counts[2] > 0 THEN month_totals[2] / month_counts[2] ELSE NULL END;
    consolidated_mars := CASE WHEN month_counts[3] > 0 THEN month_totals[3] / month_counts[3] ELSE NULL END;
    consolidated_avril := CASE WHEN month_counts[4] > 0 THEN month_totals[4] / month_counts[4] ELSE NULL END;
    consolidated_mai := CASE WHEN month_counts[5] > 0 THEN month_totals[5] / month_counts[5] ELSE NULL END;
    consolidated_juin := CASE WHEN month_counts[6] > 0 THEN month_totals[6] / month_counts[6] ELSE NULL END;
    consolidated_juillet := CASE WHEN month_counts[7] > 0 THEN month_totals[7] / month_counts[7] ELSE NULL END;
    consolidated_aout := CASE WHEN month_counts[8] > 0 THEN month_totals[8] / month_counts[8] ELSE NULL END;
    consolidated_septembre := CASE WHEN month_counts[9] > 0 THEN month_totals[9] / month_counts[9] ELSE NULL END;
    consolidated_octobre := CASE WHEN month_counts[10] > 0 THEN month_totals[10] / month_counts[10] ELSE NULL END;
    consolidated_novembre := CASE WHEN month_counts[11] > 0 THEN month_totals[11] / month_counts[11] ELSE NULL END;
    consolidated_decembre := CASE WHEN month_counts[12] > 0 THEN month_totals[12] / month_counts[12] ELSE NULL END;
    
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
  
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour consolider automatiquement les indicateurs
CREATE OR REPLACE FUNCTION auto_consolidate_sites() RETURNS void AS $$
DECLARE
  consolidation_record RECORD;
  site_list text[];
  formule_type text;
  consolidated_data RECORD;
  existing_consolidation RECORD;
BEGIN
  -- Identifier les groupes de sites à consolider par organisation, filière, filiale, code et année
  FOR consolidation_record IN
    SELECT 
      organization_name,
      filiere_name,
      filiale_name,
      code,
      year,
      array_agg(DISTINCT site_name) as sites,
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
    GROUP BY organization_name, filiere_name, filiale_name, code, year
    HAVING COUNT(DISTINCT site_name) > 1  -- Seulement si plus d'un site
  LOOP
    site_list := consolidation_record.sites;
    formule_type := COALESCE(consolidation_record.formule, 'Somme');
    
    -- Calculer les valeurs consolidées
    SELECT * INTO consolidated_data
    FROM consolidate_indicator_values(site_list, consolidation_record.code, consolidation_record.year, formule_type);
    
    -- Vérifier si une consolidation existe déjà
    SELECT * INTO existing_consolidation
    FROM site_consolidation
    WHERE code = consolidation_record.code
      AND year = consolidation_record.year
      AND organization_name = consolidation_record.organization_name
      AND COALESCE(filiere_name, '') = COALESCE(consolidation_record.filiere_name, '')
      AND COALESCE(filiale_name, '') = COALESCE(consolidation_record.filiale_name, '');
    
    IF existing_consolidation IS NOT NULL THEN
      -- Mettre à jour la consolidation existante
      UPDATE site_consolidation SET
        site_names = site_list,
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
        updated_at = now()
      WHERE id = existing_consolidation.id;
    ELSE
      -- Insérer une nouvelle consolidation
      INSERT INTO site_consolidation (
        site_names,
        year,
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
        organization_name,
        filiere_name,
        filiale_name
      ) VALUES (
        site_list,
        consolidation_record.year,
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
        consolidation_record.organization_name,
        consolidation_record.filiere_name,
        consolidation_record.filiale_name
      );
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mise à jour automatique des consolidations
CREATE OR REPLACE FUNCTION trigger_site_consolidation() RETURNS trigger AS $$
BEGIN
  -- Déclencher la consolidation automatique
  PERFORM auto_consolidate_sites();
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger sur site_global_indicator_values_simple
DROP TRIGGER IF EXISTS trigger_auto_consolidate_sites ON site_global_indicator_values_simple;
CREATE TRIGGER trigger_auto_consolidate_sites
  AFTER INSERT OR UPDATE OR DELETE ON site_global_indicator_values_simple
  FOR EACH STATEMENT
  EXECUTE FUNCTION trigger_site_consolidation();

-- Fonction pour le trigger updated_at
CREATE OR REPLACE FUNCTION update_site_consolidation_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour updated_at
CREATE TRIGGER update_site_consolidation_updated_at
  BEFORE UPDATE ON site_consolidation
  FOR EACH ROW
  EXECUTE FUNCTION update_site_consolidation_updated_at();

-- Exécuter la consolidation initiale pour les données existantes
SELECT auto_consolidate_sites();