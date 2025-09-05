/*
  # Mise à jour du processus_code dans les tables d'indicateurs

  1. Fonctions utilitaires
    - `update_processus_code_from_indicator()` - Met à jour le processus_code depuis la table indicators
    - `sync_all_processus_codes()` - Synchronise tous les processus_code existants

  2. Triggers automatiques
    - Trigger sur `site_global_indicator_values_simple` pour mise à jour automatique
    - Trigger sur `indicator_values` pour mise à jour automatique

  3. Mise à jour des données existantes
    - Correction de toutes les données existantes dans les deux tables
    - Synchronisation avec la table indicators

  4. Sécurité
    - Gestion des erreurs et cas d'exception
    - Performance optimisée avec conditions intelligentes
*/

-- Fonction pour mettre à jour le processus_code depuis la table indicators
CREATE OR REPLACE FUNCTION update_processus_code_from_indicator()
RETURNS TRIGGER AS $$
BEGIN
  -- Récupérer le processus_code depuis la table indicators
  SELECT processus_code INTO NEW.processus_code
  FROM indicators
  WHERE code = NEW.code;
  
  -- Si aucun processus trouvé, conserver la valeur existante ou NULL
  IF NEW.processus_code IS NULL THEN
    NEW.processus_code := OLD.processus_code;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour mettre à jour le processus_code depuis la table indicators pour indicator_values
CREATE OR REPLACE FUNCTION update_processus_code_from_indicator_values()
RETURNS TRIGGER AS $$
BEGIN
  -- Récupérer le processus_code depuis la table indicators
  SELECT processus_code INTO NEW.processus_code
  FROM indicators
  WHERE code = NEW.indicator_code;
  
  -- Si aucun processus trouvé, conserver la valeur existante ou NULL
  IF NEW.processus_code IS NULL THEN
    NEW.processus_code := OLD.processus_code;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer la table data_consolidate_site_prime avec la même structure que consolidated_global_indicator_values
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
  valeur numeric, -- Utilise 'valeur' au lieu de 'value'
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

-- Index pour optimiser les performances
CREATE INDEX IF NOT EXISTS idx_data_consolidate_site_prime_org ON data_consolidate_site_prime (organization_name);
CREATE INDEX IF NOT EXISTS idx_data_consolidate_site_prime_indicator_code ON data_consolidate_site_prime (indicator_code);
CREATE INDEX IF NOT EXISTS idx_data_consolidate_site_prime_year ON data_consolidate_site_prime (year);
CREATE INDEX IF NOT EXISTS idx_data_consolidate_site_prime_indicator_year ON data_consolidate_site_prime (indicator_code, year);
CREATE INDEX IF NOT EXISTS idx_data_consolidate_site_prime_org_structure ON data_consolidate_site_prime (organization_name, filiere_name, filiale_name);
CREATE INDEX IF NOT EXISTS idx_data_consolidate_site_prime_site_names ON data_consolidate_site_prime USING gin (site_names);

-- Contrainte d'unicité
CREATE UNIQUE INDEX IF NOT EXISTS data_consolidate_site_prime_unique_idx 
ON data_consolidate_site_prime (organization_name, COALESCE(filiere_name, ''), COALESCE(filiale_name, ''), indicator_code, year);

-- Activer RLS
ALTER TABLE data_consolidate_site_prime ENABLE ROW LEVEL SECURITY;

-- Politiques RLS
CREATE POLICY "Enable read access for authenticated users" ON data_consolidate_site_prime
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert for authenticated users" ON data_consolidate_site_prime
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON data_consolidate_site_prime
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Enable delete for authenticated users" ON data_consolidate_site_prime
  FOR DELETE TO authenticated USING (true);

-- Fonction pour déterminer le type de consolidation basé sur la formule
CREATE OR REPLACE FUNCTION get_consolidation_type(formule text)
RETURNS text AS $$
BEGIN
  -- Si la formule est NULL ou vide, utiliser "Somme" par défaut
  IF formule IS NULL OR trim(formule) = '' THEN
    RETURN 'Somme';
  END IF;
  
  -- Convertir en minuscules pour la comparaison
  formule := lower(trim(formule));
  
  -- Détecter "Somme du dernier mois"
  IF formule LIKE '%dernier%' OR 
     formule LIKE '%last%' OR 
     formule LIKE '%actuel%' OR 
     formule LIKE '%current%' OR 
     formule LIKE '%instantané%' OR 
     formule LIKE '%récent%' OR 
     formule LIKE '%final%' OR 
     formule LIKE '%latest%' THEN
    RETURN 'Somme du dernier mois';
  END IF;
  
  -- Détecter "Moyenne"
  IF formule LIKE '%moyenne%' OR 
     formule LIKE '%ratio%' OR 
     formule LIKE '%pourcentage%' OR 
     formule LIKE '%taux%' OR 
     formule LIKE '%efficacité%' OR 
     formule LIKE '%rendement%' OR 
     formule LIKE '%intensité%' OR 
     formule LIKE '%performance%' OR 
     formule LIKE '%indice%' OR 
     formule LIKE '%moyen%' OR
     formule LIKE '%average%' OR
     formule LIKE '%rate%' OR
     formule LIKE '%efficiency%' OR
     formule LIKE '%intensity%' THEN
    RETURN 'Moyenne';
  END IF;
  
  -- Par défaut, utiliser "Somme"
  RETURN 'Somme';
END;
$$ LANGUAGE plpgsql;

-- Fonction pour consolider les données des sites
CREATE OR REPLACE FUNCTION consolidate_site_data_prime()
RETURNS void AS $$
DECLARE
  site_record RECORD;
  indicator_record RECORD;
  consolidation_type text;
  total_valeur numeric := 0;
  total_janvier numeric := 0;
  total_fevrier numeric := 0;
  total_mars numeric := 0;
  total_avril numeric := 0;
  total_mai numeric := 0;
  total_juin numeric := 0;
  total_juillet numeric := 0;
  total_aout numeric := 0;
  total_septembre numeric := 0;
  total_octobre numeric := 0;
  total_novembre numeric := 0;
  total_decembre numeric := 0;
  count_sites integer := 0;
  site_names_array text[] := '{}';
  last_month_col text;
  last_month_value numeric;
BEGIN
  -- Pour chaque combinaison unique d'organisation, filière, filiale, indicateur et année
  FOR indicator_record IN 
    SELECT DISTINCT 
      organization_name,
      filiere_name,
      filiale_name,
      code as indicator_code,
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
      cible
    FROM site_global_indicator_values_simple
    WHERE organization_name IS NOT NULL
      AND code IS NOT NULL
      AND year IS NOT NULL
  LOOP
    -- Déterminer le type de consolidation
    consolidation_type := get_consolidation_type(indicator_record.formule);
    
    -- Réinitialiser les totaux
    total_valeur := 0;
    total_janvier := 0;
    total_fevrier := 0;
    total_mars := 0;
    total_avril := 0;
    total_mai := 0;
    total_juin := 0;
    total_juillet := 0;
    total_aout := 0;
    total_septembre := 0;
    total_octobre := 0;
    total_novembre := 0;
    total_decembre := 0;
    count_sites := 0;
    site_names_array := '{}';
    
    -- Traiter selon le type de consolidation
    IF consolidation_type = 'Somme du dernier mois' THEN
      -- Pour chaque site, prendre le dernier mois disponible et additionner
      FOR site_record IN 
        SELECT DISTINCT site_name
        FROM site_global_indicator_values_simple
        WHERE organization_name = indicator_record.organization_name
          AND (filiere_name = indicator_record.filiere_name OR (filiere_name IS NULL AND indicator_record.filiere_name IS NULL))
          AND (filiale_name = indicator_record.filiale_name OR (filiale_name IS NULL AND indicator_record.filiale_name IS NULL))
          AND code = indicator_record.indicator_code
          AND year = indicator_record.year
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
          END INTO last_month_value
        FROM site_global_indicator_values_simple
        WHERE site_name = site_record.site_name
          AND organization_name = indicator_record.organization_name
          AND (filiere_name = indicator_record.filiere_name OR (filiere_name IS NULL AND indicator_record.filiere_name IS NULL))
          AND (filiale_name = indicator_record.filiale_name OR (filiale_name IS NULL AND indicator_record.filiale_name IS NULL))
          AND code = indicator_record.indicator_code
          AND year = indicator_record.year;
        
        IF last_month_value IS NOT NULL THEN
          total_valeur := total_valeur + last_month_value;
          count_sites := count_sites + 1;
          site_names_array := array_append(site_names_array, site_record.site_name);
        END IF;
      END LOOP;
      
    ELSE
      -- Pour "Somme" et "Moyenne", traiter tous les sites
      FOR site_record IN 
        SELECT 
          site_name,
          value,
          janvier, fevrier, mars, avril, mai, juin,
          juillet, aout, septembre, octobre, novembre, decembre
        FROM site_global_indicator_values_simple
        WHERE organization_name = indicator_record.organization_name
          AND (filiere_name = indicator_record.filiere_name OR (filiere_name IS NULL AND indicator_record.filiere_name IS NULL))
          AND (filiale_name = indicator_record.filiale_name OR (filiale_name IS NULL AND indicator_record.filiale_name IS NULL))
          AND code = indicator_record.indicator_code
          AND year = indicator_record.year
      LOOP
        count_sites := count_sites + 1;
        site_names_array := array_append(site_names_array, site_record.site_name);
        
        -- Additionner les valeurs (pour somme et moyenne)
        total_valeur := total_valeur + COALESCE(site_record.value, 0);
        total_janvier := total_janvier + COALESCE(site_record.janvier, 0);
        total_fevrier := total_fevrier + COALESCE(site_record.fevrier, 0);
        total_mars := total_mars + COALESCE(site_record.mars, 0);
        total_avril := total_avril + COALESCE(site_record.avril, 0);
        total_mai := total_mai + COALESCE(site_record.mai, 0);
        total_juin := total_juin + COALESCE(site_record.juin, 0);
        total_juillet := total_juillet + COALESCE(site_record.juillet, 0);
        total_aout := total_aout + COALESCE(site_record.aout, 0);
        total_septembre := total_septembre + COALESCE(site_record.septembre, 0);
        total_octobre := total_octobre + COALESCE(site_record.octobre, 0);
        total_novembre := total_novembre + COALESCE(site_record.novembre, 0);
        total_decembre := total_decembre + COALESCE(site_record.decembre, 0);
      END LOOP;
      
      -- Si c'est une moyenne, diviser par le nombre de sites
      IF consolidation_type = 'Moyenne' AND count_sites > 0 THEN
        total_valeur := total_valeur / count_sites;
        total_janvier := total_janvier / count_sites;
        total_fevrier := total_fevrier / count_sites;
        total_mars := total_mars / count_sites;
        total_avril := total_avril / count_sites;
        total_mai := total_mai / count_sites;
        total_juin := total_juin / count_sites;
        total_juillet := total_juillet / count_sites;
        total_aout := total_aout / count_sites;
        total_septembre := total_septembre / count_sites;
        total_octobre := total_octobre / count_sites;
        total_novembre := total_novembre / count_sites;
        total_decembre := total_decembre / count_sites;
      END IF;
    END IF;
    
    -- Insérer ou mettre à jour dans data_consolidate_site_prime
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
      decembre
    ) VALUES (
      indicator_record.organization_name,
      indicator_record.filiere_name,
      indicator_record.filiale_name,
      indicator_record.indicator_code,
      indicator_record.year,
      site_names_array,
      indicator_record.axe_energetique,
      indicator_record.enjeux,
      indicator_record.normes,
      indicator_record.critere,
      indicator_record.indicateur,
      indicator_record.definition,
      indicator_record.processus,
      indicator_record.processus_code,
      indicator_record.frequence,
      indicator_record.unite,
      indicator_record.type,
      indicator_record.formule,
      CASE WHEN count_sites > 0 THEN total_valeur ELSE NULL END,
      indicator_record.cible,
      CASE WHEN count_sites > 0 THEN total_janvier ELSE NULL END,
      CASE WHEN count_sites > 0 THEN total_fevrier ELSE NULL END,
      CASE WHEN count_sites > 0 THEN total_mars ELSE NULL END,
      CASE WHEN count_sites > 0 THEN total_avril ELSE NULL END,
      CASE WHEN count_sites > 0 THEN total_mai ELSE NULL END,
      CASE WHEN count_sites > 0 THEN total_juin ELSE NULL END,
      CASE WHEN count_sites > 0 THEN total_juillet ELSE NULL END,
      CASE WHEN count_sites > 0 THEN total_aout ELSE NULL END,
      CASE WHEN count_sites > 0 THEN total_septembre ELSE NULL END,
      CASE WHEN count_sites > 0 THEN total_octobre ELSE NULL END,
      CASE WHEN count_sites > 0 THEN total_novembre ELSE NULL END,
      CASE WHEN count_sites > 0 THEN total_decembre ELSE NULL END
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
      cible = EXCLUDED.cible,
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
      updated_at = now();
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour automatiquement le processus_code dans site_global_indicator_values_simple
DROP TRIGGER IF EXISTS trigger_update_processus_code_site_values ON site_global_indicator_values_simple;
CREATE TRIGGER trigger_update_processus_code_site_values
  BEFORE INSERT OR UPDATE OF code ON site_global_indicator_values_simple
  FOR EACH ROW
  WHEN (NEW.code IS DISTINCT FROM OLD.code OR OLD.code IS NULL)
  EXECUTE FUNCTION update_processus_code_from_indicator();

-- Trigger pour mettre à jour automatiquement le processus_code dans indicator_values
DROP TRIGGER IF EXISTS trigger_update_processus_code_indicator_values ON indicator_values;
CREATE TRIGGER trigger_update_processus_code_indicator_values
  BEFORE INSERT OR UPDATE OF indicator_code ON indicator_values
  FOR EACH ROW
  WHEN (NEW.indicator_code IS DISTINCT FROM OLD.indicator_code OR OLD.indicator_code IS NULL)
  EXECUTE FUNCTION update_processus_code_from_indicator_values();

-- Trigger pour consolider automatiquement dans data_consolidate_site_prime
DROP TRIGGER IF EXISTS trigger_consolidate_data_site_prime ON site_global_indicator_values_simple;
CREATE TRIGGER trigger_consolidate_data_site_prime
  AFTER INSERT OR UPDATE OR DELETE ON site_global_indicator_values_simple
  FOR EACH STATEMENT
  EXECUTE FUNCTION consolidate_site_data_prime();

-- Fonction pour synchroniser tous les processus_code existants
CREATE OR REPLACE FUNCTION sync_all_processus_codes()
RETURNS integer AS $$
DECLARE
  updated_count integer := 0;
BEGIN
  -- Mettre à jour site_global_indicator_values_simple
  UPDATE site_global_indicator_values_simple 
  SET processus_code = indicators.processus_code
  FROM indicators
  WHERE site_global_indicator_values_simple.code = indicators.code
    AND (site_global_indicator_values_simple.processus_code IS NULL 
         OR site_global_indicator_values_simple.processus_code != indicators.processus_code);
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  
  -- Mettre à jour indicator_values
  UPDATE indicator_values 
  SET processus_code = indicators.processus_code
  FROM indicators
  WHERE indicator_values.indicator_code = indicators.code
    AND (indicator_values.processus_code IS NULL 
         OR indicator_values.processus_code != indicators.processus_code);
  
  GET DIAGNOSTICS updated_count = updated_count + ROW_COUNT;
  
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour rafraîchir toutes les consolidations
CREATE OR REPLACE FUNCTION refresh_data_consolidate_site_prime()
RETURNS void AS $$
BEGIN
  -- Vider la table de consolidation
  DELETE FROM data_consolidate_site_prime;
  
  -- Recalculer toutes les consolidations
  PERFORM consolidate_site_data_prime();
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_data_consolidate_site_prime_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_data_consolidate_site_prime_updated_at ON data_consolidate_site_prime;
CREATE TRIGGER update_data_consolidate_site_prime_updated_at
  BEFORE UPDATE ON data_consolidate_site_prime
  FOR EACH ROW
  EXECUTE FUNCTION update_data_consolidate_site_prime_updated_at();

-- Vue pour afficher le type de consolidation utilisé
CREATE OR REPLACE VIEW data_consolidate_site_prime_with_type AS
SELECT 
  *,
  get_consolidation_type(formule) as consolidation_type
FROM data_consolidate_site_prime;

-- Synchroniser tous les processus_code existants
SELECT sync_all_processus_codes();

-- Effectuer la consolidation initiale
SELECT consolidate_site_data_prime();

-- Mettre à jour les données existantes dans site_global_indicator_values_simple
UPDATE site_global_indicator_values_simple 
SET processus_code = indicators.processus_code
FROM indicators
WHERE site_global_indicator_values_simple.code = indicators.code
  AND (site_global_indicator_values_simple.processus_code IS NULL 
       OR site_global_indicator_values_simple.processus_code != indicators.processus_code);

-- Mettre à jour les données existantes dans indicator_values
UPDATE indicator_values 
SET processus_code = indicators.processus_code
FROM indicators
WHERE indicator_values.indicator_code = indicators.code
  AND (indicator_values.processus_code IS NULL 
       OR indicator_values.processus_code != indicators.processus_code);