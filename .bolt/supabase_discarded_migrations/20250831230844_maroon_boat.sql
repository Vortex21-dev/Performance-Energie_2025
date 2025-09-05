/*
  # Modifier la logique de consolidation pour site_global_indicator_values_simple

  1. Modifications
    - Ajouter la colonne site_names à site_global_indicator_values_simple
    - Supprimer la table site_consolidation
    - Modifier la logique pour stocker les consolidations dans site_global_indicator_values_simple
    - Utiliser un site_name spécial pour identifier les consolidations

  2. Logique de consolidation
    - Les consolidations utilisent un site_name au format "CONSOLIDATION_{organization}_{filiere}_{filiale}"
    - La colonne site_names contient la liste des sites consolidés
    - Trois types de consolidation selon la formule de l'indicateur

  3. Triggers
    - Mise à jour automatique lors des changements dans site_global_indicator_values_simple
    - Recalcul des consolidations en temps réel
*/

-- Ajouter la colonne site_names à site_global_indicator_values_simple si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'site_global_indicator_values_simple' 
    AND column_name = 'site_names'
  ) THEN
    ALTER TABLE site_global_indicator_values_simple 
    ADD COLUMN site_names text[];
  END IF;
END $$;

-- Supprimer la table site_consolidation si elle existe
DROP TABLE IF EXISTS site_consolidation CASCADE;

-- Supprimer les anciennes fonctions si elles existent
DROP FUNCTION IF EXISTS get_last_available_month(jsonb) CASCADE;
DROP FUNCTION IF EXISTS get_month_value(jsonb, text) CASCADE;
DROP FUNCTION IF EXISTS consolidate_indicator_values(text[], text) CASCADE;
DROP FUNCTION IF EXISTS update_site_consolidation() CASCADE;

-- Fonction pour obtenir le dernier mois disponible
CREATE OR REPLACE FUNCTION get_last_available_month_simple(
  janvier numeric, fevrier numeric, mars numeric, avril numeric,
  mai numeric, juin numeric, juillet numeric, aout numeric,
  septembre numeric, octobre numeric, novembre numeric, decembre numeric
) RETURNS text AS $$
DECLARE
  months text[] := ARRAY['decembre', 'novembre', 'octobre', 'septembre', 'aout', 'juillet', 'juin', 'mai', 'avril', 'mars', 'fevrier', 'janvier'];
  month_values numeric[] := ARRAY[decembre, novembre, octobre, septembre, aout, juillet, juin, mai, avril, mars, fevrier, janvier];
  i integer;
BEGIN
  FOR i IN 1..array_length(months, 1) LOOP
    IF month_values[i] IS NOT NULL THEN
      RETURN months[i];
    END IF;
  END LOOP;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour obtenir la valeur d'un mois spécifique
CREATE OR REPLACE FUNCTION get_month_value_simple(
  month_name text,
  janvier numeric, fevrier numeric, mars numeric, avril numeric,
  mai numeric, juin numeric, juillet numeric, aout numeric,
  septembre numeric, octobre numeric, novembre numeric, decembre numeric
) RETURNS numeric AS $$
BEGIN
  CASE month_name
    WHEN 'janvier' THEN RETURN janvier;
    WHEN 'fevrier' THEN RETURN fevrier;
    WHEN 'mars' THEN RETURN mars;
    WHEN 'avril' THEN RETURN avril;
    WHEN 'mai' THEN RETURN mai;
    WHEN 'juin' THEN RETURN juin;
    WHEN 'juillet' THEN RETURN juillet;
    WHEN 'aout' THEN RETURN aout;
    WHEN 'septembre' THEN RETURN septembre;
    WHEN 'octobre' THEN RETURN octobre;
    WHEN 'novembre' THEN RETURN novembre;
    WHEN 'decembre' THEN RETURN decembre;
    ELSE RETURN NULL;
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- Fonction principale de consolidation des indicateurs
CREATE OR REPLACE FUNCTION consolidate_indicator_values_simple(
  p_code text,
  p_year integer,
  p_organization_name text,
  p_filiere_name text DEFAULT NULL,
  p_filiale_name text DEFAULT NULL
) RETURNS void AS $$
DECLARE
  site_records RECORD;
  indicator_formule text;
  consolidation_type text := 'somme'; -- par défaut
  
  -- Variables pour les calculs
  total_value numeric := 0;
  count_sites integer := 0;
  site_list text[] := ARRAY[]::text[];
  
  -- Variables pour les mois
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
  
  count_janvier integer := 0;
  count_fevrier integer := 0;
  count_mars integer := 0;
  count_avril integer := 0;
  count_mai integer := 0;
  count_juin integer := 0;
  count_juillet integer := 0;
  count_aout integer := 0;
  count_septembre integer := 0;
  count_octobre integer := 0;
  count_novembre integer := 0;
  count_decembre integer := 0;
  
  -- Variables pour somme du dernier mois
  last_month_total numeric := 0;
  last_month_name text;
  last_month_value numeric;
  
  -- Variables pour les autres attributs
  first_record RECORD;
  consolidation_site_name text;
BEGIN
  -- Récupérer la formule de l'indicateur
  SELECT formule INTO indicator_formule
  FROM indicators 
  WHERE code = p_code;
  
  -- Déterminer le type de consolidation basé sur la formule
  IF indicator_formule IS NOT NULL THEN
    IF LOWER(indicator_formule) LIKE '%moyenne%' OR LOWER(indicator_formule) LIKE '%ratio%' OR LOWER(indicator_formule) LIKE '%pourcentage%' THEN
      consolidation_type := 'moyenne';
    ELSIF LOWER(indicator_formule) LIKE '%dernier%' OR LOWER(indicator_formule) LIKE '%last%' OR LOWER(indicator_formule) LIKE '%actuel%' THEN
      consolidation_type := 'somme_dernier_mois';
    ELSE
      consolidation_type := 'somme';
    END IF;
  END IF;
  
  -- Construire le nom du site de consolidation
  consolidation_site_name := 'CONSOLIDATION_' || p_organization_name;
  IF p_filiere_name IS NOT NULL THEN
    consolidation_site_name := consolidation_site_name || '_' || p_filiere_name;
  END IF;
  IF p_filiale_name IS NOT NULL THEN
    consolidation_site_name := consolidation_site_name || '_' || p_filiale_name;
  END IF;
  
  -- Récupérer tous les sites pour cet indicateur
  FOR site_records IN
    SELECT *
    FROM site_global_indicator_values_simple
    WHERE code = p_code 
      AND year = p_year
      AND organization_name = p_organization_name
      AND (p_filiere_name IS NULL OR filiere_name = p_filiere_name)
      AND (p_filiale_name IS NULL OR filiale_name = p_filiale_name)
      AND site_name NOT LIKE 'CONSOLIDATION_%'
      AND site_name IS NOT NULL
  LOOP
    -- Ajouter le site à la liste
    site_list := array_append(site_list, site_records.site_name);
    count_sites := count_sites + 1;
    
    -- Stocker le premier enregistrement pour les métadonnées
    IF count_sites = 1 THEN
      first_record := site_records;
    END IF;
    
    -- Consolidation selon le type
    IF consolidation_type = 'somme_dernier_mois' THEN
      -- Trouver le dernier mois disponible pour ce site
      last_month_name := get_last_available_month_simple(
        site_records.janvier, site_records.fevrier, site_records.mars, site_records.avril,
        site_records.mai, site_records.juin, site_records.juillet, site_records.aout,
        site_records.septembre, site_records.octobre, site_records.novembre, site_records.decembre
      );
      
      IF last_month_name IS NOT NULL THEN
        last_month_value := get_month_value_simple(
          last_month_name,
          site_records.janvier, site_records.fevrier, site_records.mars, site_records.avril,
          site_records.mai, site_records.juin, site_records.juillet, site_records.aout,
          site_records.septembre, site_records.octobre, site_records.novembre, site_records.decembre
        );
        
        IF last_month_value IS NOT NULL THEN
          last_month_total := last_month_total + last_month_value;
        END IF;
      END IF;
      
    ELSE
      -- Consolidation normale (somme ou moyenne)
      IF site_records.value IS NOT NULL THEN
        total_value := total_value + site_records.value;
      END IF;
      
      -- Consolidation des mois
      IF site_records.janvier IS NOT NULL THEN
        total_janvier := total_janvier + site_records.janvier;
        count_janvier := count_janvier + 1;
      END IF;
      IF site_records.fevrier IS NOT NULL THEN
        total_fevrier := total_fevrier + site_records.fevrier;
        count_fevrier := count_fevrier + 1;
      END IF;
      IF site_records.mars IS NOT NULL THEN
        total_mars := total_mars + site_records.mars;
        count_mars := count_mars + 1;
      END IF;
      IF site_records.avril IS NOT NULL THEN
        total_avril := total_avril + site_records.avril;
        count_avril := count_avril + 1;
      END IF;
      IF site_records.mai IS NOT NULL THEN
        total_mai := total_mai + site_records.mai;
        count_mai := count_mai + 1;
      END IF;
      IF site_records.juin IS NOT NULL THEN
        total_juin := total_juin + site_records.juin;
        count_juin := count_juin + 1;
      END IF;
      IF site_records.juillet IS NOT NULL THEN
        total_juillet := total_juillet + site_records.juillet;
        count_juillet := count_juillet + 1;
      END IF;
      IF site_records.aout IS NOT NULL THEN
        total_aout := total_aout + site_records.aout;
        count_aout := count_aout + 1;
      END IF;
      IF site_records.septembre IS NOT NULL THEN
        total_septembre := total_septembre + site_records.septembre;
        count_septembre := count_septembre + 1;
      END IF;
      IF site_records.octobre IS NOT NULL THEN
        total_octobre := total_octobre + site_records.octobre;
        count_octobre := count_octobre + 1;
      END IF;
      IF site_records.novembre IS NOT NULL THEN
        total_novembre := total_novembre + site_records.novembre;
        count_novembre := count_novembre + 1;
      END IF;
      IF site_records.decembre IS NOT NULL THEN
        total_decembre := total_decembre + site_records.decembre;
        count_decembre := count_decembre + 1;
      END IF;
    END IF;
  END LOOP;
  
  -- Ne consolider que s'il y a au moins 2 sites
  IF count_sites >= 2 THEN
    -- Supprimer l'ancienne consolidation
    DELETE FROM site_global_indicator_values_simple
    WHERE site_name = consolidation_site_name
      AND code = p_code
      AND year = p_year
      AND organization_name = p_organization_name
      AND (p_filiere_name IS NULL OR filiere_name = p_filiere_name)
      AND (p_filiale_name IS NULL OR filiale_name = p_filiale_name);
    
    -- Insérer la nouvelle consolidation
    IF consolidation_type = 'somme_dernier_mois' THEN
      -- Pour somme du dernier mois, on met la valeur dans le champ value
      INSERT INTO site_global_indicator_values_simple (
        site_name, year, code, axe_energetique, enjeux, normes, critere, indicateur,
        definition, processus, processus_code, frequence, unite, type, formule,
        value, valeur_precedente, cible, variation, organization_name, filiere_name, filiale_name,
        site_names, created_at, updated_at
      ) VALUES (
        consolidation_site_name,
        p_year,
        p_code,
        first_record.axe_energetique,
        first_record.enjeux,
        first_record.normes,
        first_record.critere,
        first_record.indicateur,
        first_record.definition,
        first_record.processus,
        first_record.processus_code,
        first_record.frequence,
        first_record.unite,
        first_record.type,
        first_record.formule,
        last_month_total,
        NULL, -- valeur_precedente
        first_record.cible,
        NULL, -- variation
        p_organization_name,
        p_filiere_name,
        p_filiale_name,
        site_list,
        NOW(),
        NOW()
      );
    ELSE
      -- Pour somme et moyenne
      INSERT INTO site_global_indicator_values_simple (
        site_name, year, code, axe_energetique, enjeux, normes, critere, indicateur,
        definition, processus, processus_code, frequence, unite, type, formule,
        value, valeur_precedente, cible, variation,
        janvier, fevrier, mars, avril, mai, juin,
        juillet, aout, septembre, octobre, novembre, decembre,
        organization_name, filiere_name, filiale_name, site_names,
        created_at, updated_at
      ) VALUES (
        consolidation_site_name,
        p_year,
        p_code,
        first_record.axe_energetique,
        first_record.enjeux,
        first_record.normes,
        first_record.critere,
        first_record.indicateur,
        first_record.definition,
        first_record.processus,
        first_record.processus_code,
        first_record.frequence,
        first_record.unite,
        first_record.type,
        first_record.formule,
        CASE 
          WHEN consolidation_type = 'moyenne' AND count_sites > 0 THEN total_value / count_sites
          ELSE total_value
        END,
        NULL, -- valeur_precedente
        first_record.cible,
        NULL, -- variation
        -- Mois consolidés
        CASE 
          WHEN consolidation_type = 'moyenne' AND count_janvier > 0 THEN total_janvier / count_janvier
          WHEN count_janvier > 0 THEN total_janvier
          ELSE NULL
        END,
        CASE 
          WHEN consolidation_type = 'moyenne' AND count_fevrier > 0 THEN total_fevrier / count_fevrier
          WHEN count_fevrier > 0 THEN total_fevrier
          ELSE NULL
        END,
        CASE 
          WHEN consolidation_type = 'moyenne' AND count_mars > 0 THEN total_mars / count_mars
          WHEN count_mars > 0 THEN total_mars
          ELSE NULL
        END,
        CASE 
          WHEN consolidation_type = 'moyenne' AND count_avril > 0 THEN total_avril / count_avril
          WHEN count_avril > 0 THEN total_avril
          ELSE NULL
        END,
        CASE 
          WHEN consolidation_type = 'moyenne' AND count_mai > 0 THEN total_mai / count_mai
          WHEN count_mai > 0 THEN total_mai
          ELSE NULL
        END,
        CASE 
          WHEN consolidation_type = 'moyenne' AND count_juin > 0 THEN total_juin / count_juin
          WHEN count_juin > 0 THEN total_juin
          ELSE NULL
        END,
        CASE 
          WHEN consolidation_type = 'moyenne' AND count_juillet > 0 THEN total_juillet / count_juillet
          WHEN count_juillet > 0 THEN total_juillet
          ELSE NULL
        END,
        CASE 
          WHEN consolidation_type = 'moyenne' AND count_aout > 0 THEN total_aout / count_aout
          WHEN count_aout > 0 THEN total_aout
          ELSE NULL
        END,
        CASE 
          WHEN consolidation_type = 'moyenne' AND count_septembre > 0 THEN total_septembre / count_septembre
          WHEN count_septembre > 0 THEN total_septembre
          ELSE NULL
        END,
        CASE 
          WHEN consolidation_type = 'moyenne' AND count_octobre > 0 THEN total_octobre / count_octobre
          WHEN count_octobre > 0 THEN total_octobre
          ELSE NULL
        END,
        CASE 
          WHEN consolidation_type = 'moyenne' AND count_novembre > 0 THEN total_novembre / count_novembre
          WHEN count_novembre > 0 THEN total_novembre
          ELSE NULL
        END,
        CASE 
          WHEN consolidation_type = 'moyenne' AND count_decembre > 0 THEN total_decembre / count_decembre
          WHEN count_decembre > 0 THEN total_decembre
          ELSE NULL
        END,
        p_organization_name,
        p_filiere_name,
        p_filiale_name,
        site_list,
        NOW(),
        NOW()
      );
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Fonction trigger pour mettre à jour les consolidations
CREATE OR REPLACE FUNCTION update_site_consolidations_simple() RETURNS trigger AS $$
DECLARE
  affected_code text;
  affected_year integer;
  affected_organization text;
  affected_filiere text;
  affected_filiale text;
BEGIN
  -- Déterminer les valeurs affectées
  IF TG_OP = 'DELETE' THEN
    affected_code := OLD.code;
    affected_year := OLD.year;
    affected_organization := OLD.organization_name;
    affected_filiere := OLD.filiere_name;
    affected_filiale := OLD.filiale_name;
  ELSE
    affected_code := NEW.code;
    affected_year := NEW.year;
    affected_organization := NEW.organization_name;
    affected_filiere := NEW.filiere_name;
    affected_filiale := NEW.filiale_name;
  END IF;
  
  -- Ne pas traiter les consolidations elles-mêmes
  IF (TG_OP = 'DELETE' AND OLD.site_name LIKE 'CONSOLIDATION_%') OR 
     (TG_OP != 'DELETE' AND NEW.site_name LIKE 'CONSOLIDATION_%') THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  -- Recalculer les consolidations pour cet indicateur
  -- Niveau filiale (si applicable)
  IF affected_filiale IS NOT NULL THEN
    PERFORM consolidate_indicator_values_simple(
      affected_code, 
      affected_year, 
      affected_organization, 
      affected_filiere, 
      affected_filiale
    );
  END IF;
  
  -- Niveau filière (si applicable)
  IF affected_filiere IS NOT NULL THEN
    PERFORM consolidate_indicator_values_simple(
      affected_code, 
      affected_year, 
      affected_organization, 
      affected_filiere, 
      NULL
    );
  END IF;
  
  -- Niveau organisation
  PERFORM consolidate_indicator_values_simple(
    affected_code, 
    affected_year, 
    affected_organization, 
    NULL, 
    NULL
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger pour la consolidation automatique
DROP TRIGGER IF EXISTS trigger_update_site_consolidations_simple ON site_global_indicator_values_simple;
CREATE TRIGGER trigger_update_site_consolidations_simple
  AFTER INSERT OR UPDATE OR DELETE ON site_global_indicator_values_simple
  FOR EACH ROW EXECUTE FUNCTION update_site_consolidations_simple();

-- Ajouter un index pour les consolidations
CREATE INDEX IF NOT EXISTS idx_site_global_indicator_values_simple_consolidation 
ON site_global_indicator_values_simple (site_name) 
WHERE site_name LIKE 'CONSOLIDATION_%';

-- Ajouter un index pour site_names
CREATE INDEX IF NOT EXISTS idx_site_global_indicator_values_simple_site_names 
ON site_global_indicator_values_simple USING gin (site_names);

-- Fonction pour identifier les consolidations
CREATE OR REPLACE FUNCTION is_consolidation_site(site_name text) RETURNS boolean AS $$
BEGIN
  RETURN site_name LIKE 'CONSOLIDATION_%';
END;
$$ LANGUAGE plpgsql;

-- Vue pour faciliter les requêtes de consolidation
CREATE OR REPLACE VIEW site_consolidations_view AS
SELECT 
  *,
  array_length(site_names, 1) as nombre_sites_consolides,
  CASE 
    WHEN site_name LIKE 'CONSOLIDATION_%' THEN true
    ELSE false
  END as is_consolidation
FROM site_global_indicator_values_simple
WHERE site_name LIKE 'CONSOLIDATION_%';

-- Commentaires sur la table
COMMENT ON COLUMN site_global_indicator_values_simple.site_names IS 'Liste des sites consolidés (uniquement pour les enregistrements de consolidation)';