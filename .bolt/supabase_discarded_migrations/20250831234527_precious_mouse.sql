/*
  # Création de la table site_consolidation

  1. Nouvelle table
    - `site_consolidation` avec tous les attributs de `site_global_indicator_values_simple`
    - Attribut supplémentaire `site_names` pour la liste des sites consolidés
    
  2. Logique de consolidation
    - Somme : Addition des valeurs (par défaut)
    - Moyenne : Moyenne des valeurs (si formule contient "moyenne", "ratio", "pourcentage")
    - Somme du dernier mois : Dernier mois disponible additionné (si formule contient "dernier", "last", "actuel")
    
  3. Automatisation
    - Triggers pour consolidation automatique
    - Recalcul lors des modifications de site_global_indicator_values_simple
    
  4. Sécurité
    - RLS activé
    - Politiques pour utilisateurs authentifiés
*/

-- Créer la table site_consolidation avec tous les attributs de site_global_indicator_values_simple
CREATE TABLE IF NOT EXISTS site_consolidation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_names text[] NOT NULL DEFAULT '{}', -- Liste des sites consolidés
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

-- Ajouter les contraintes et index
CREATE UNIQUE INDEX IF NOT EXISTS site_consolidation_unique_idx 
ON site_consolidation (code, year, COALESCE(organization_name, ''), COALESCE(filiere_name, ''), COALESCE(filiale_name, ''));

CREATE INDEX IF NOT EXISTS idx_site_consolidation_site_names ON site_consolidation USING gin (site_names);
CREATE INDEX IF NOT EXISTS idx_site_consolidation_code ON site_consolidation (code);
CREATE INDEX IF NOT EXISTS idx_site_consolidation_year ON site_consolidation (year);
CREATE INDEX IF NOT EXISTS idx_site_consolidation_org ON site_consolidation (organization_name);
CREATE INDEX IF NOT EXISTS idx_site_consolidation_formule ON site_consolidation (formule);

-- Activer RLS
ALTER TABLE site_consolidation ENABLE ROW LEVEL SECURITY;

-- Politiques RLS
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

-- Fonction pour obtenir le dernier mois disponible pour un site/indicateur
CREATE OR REPLACE FUNCTION get_last_available_month_for_site(
  p_site_name text,
  p_code text,
  p_year integer
) RETURNS integer AS $$
DECLARE
  last_month integer;
BEGIN
  -- Chercher le dernier mois avec une valeur non nulle
  SELECT month_num INTO last_month
  FROM (
    SELECT 12 as month_num, decembre as value FROM site_global_indicator_values_simple 
    WHERE site_name = p_site_name AND code = p_code AND year = p_year AND decembre IS NOT NULL
    UNION ALL
    SELECT 11 as month_num, novembre as value FROM site_global_indicator_values_simple 
    WHERE site_name = p_site_name AND code = p_code AND year = p_year AND novembre IS NOT NULL
    UNION ALL
    SELECT 10 as month_num, octobre as value FROM site_global_indicator_values_simple 
    WHERE site_name = p_site_name AND code = p_code AND year = p_year AND octobre IS NOT NULL
    UNION ALL
    SELECT 9 as month_num, septembre as value FROM site_global_indicator_values_simple 
    WHERE site_name = p_site_name AND code = p_code AND year = p_year AND septembre IS NOT NULL
    UNION ALL
    SELECT 8 as month_num, aout as value FROM site_global_indicator_values_simple 
    WHERE site_name = p_site_name AND code = p_code AND year = p_year AND aout IS NOT NULL
    UNION ALL
    SELECT 7 as month_num, juillet as value FROM site_global_indicator_values_simple 
    WHERE site_name = p_site_name AND code = p_code AND year = p_year AND juillet IS NOT NULL
    UNION ALL
    SELECT 6 as month_num, juin as value FROM site_global_indicator_values_simple 
    WHERE site_name = p_site_name AND code = p_code AND year = p_year AND juin IS NOT NULL
    UNION ALL
    SELECT 5 as month_num, mai as value FROM site_global_indicator_values_simple 
    WHERE site_name = p_site_name AND code = p_code AND year = p_year AND mai IS NOT NULL
    UNION ALL
    SELECT 4 as month_num, avril as value FROM site_global_indicator_values_simple 
    WHERE site_name = p_site_name AND code = p_code AND year = p_year AND avril IS NOT NULL
    UNION ALL
    SELECT 3 as month_num, mars as value FROM site_global_indicator_values_simple 
    WHERE site_name = p_site_name AND code = p_code AND year = p_year AND mars IS NOT NULL
    UNION ALL
    SELECT 2 as month_num, fevrier as value FROM site_global_indicator_values_simple 
    WHERE site_name = p_site_name AND code = p_code AND year = p_year AND fevrier IS NOT NULL
    UNION ALL
    SELECT 1 as month_num, janvier as value FROM site_global_indicator_values_simple 
    WHERE site_name = p_site_name AND code = p_code AND year = p_year AND janvier IS NOT NULL
  ) months
  WHERE value IS NOT NULL
  ORDER BY month_num DESC
  LIMIT 1;
  
  RETURN COALESCE(last_month, 12); -- Par défaut décembre si aucune donnée
END;
$$ LANGUAGE plpgsql;

-- Fonction pour obtenir la valeur d'un mois spécifique
CREATE OR REPLACE FUNCTION get_month_value_for_site(
  p_site_name text,
  p_code text,
  p_year integer,
  p_month integer
) RETURNS numeric AS $$
DECLARE
  month_value numeric;
BEGIN
  SELECT 
    CASE p_month
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
  WHERE site_name = p_site_name AND code = p_code AND year = p_year;
  
  RETURN month_value;
END;
$$ LANGUAGE plpgsql;

-- Fonction principale de consolidation des indicateurs
CREATE OR REPLACE FUNCTION consolidate_site_indicators(
  p_code text,
  p_year integer,
  p_organization_name text DEFAULT NULL,
  p_filiere_name text DEFAULT NULL,
  p_filiale_name text DEFAULT NULL
) RETURNS void AS $$
DECLARE
  site_record RECORD;
  consolidation_record RECORD;
  formule_type text;
  sites_list text[];
  
  -- Variables pour les calculs
  total_value numeric := 0;
  total_valeur_precedente numeric := 0;
  total_cible numeric := 0;
  count_sites integer := 0;
  
  -- Variables mensuelles
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
  
  -- Variables pour somme du dernier mois
  last_month_total numeric := 0;
  site_last_month integer;
  site_last_value numeric;
  
  -- Métadonnées de l'indicateur
  indicator_metadata RECORD;
BEGIN
  -- Récupérer les métadonnées de l'indicateur
  SELECT axe_energetique, enjeux, normes, critere, indicateur, definition, 
         processus, processus_code, frequence, unite, type, formule
  INTO indicator_metadata
  FROM site_global_indicator_values_simple
  WHERE code = p_code
  LIMIT 1;
  
  -- Déterminer le type de consolidation basé sur la formule
  formule_type := 'somme'; -- Par défaut
  
  IF indicator_metadata.formule IS NOT NULL THEN
    IF indicator_metadata.formule ILIKE '%moyenne%' OR 
       indicator_metadata.formule ILIKE '%ratio%' OR 
       indicator_metadata.formule ILIKE '%pourcentage%' OR
       indicator_metadata.formule ILIKE '%taux%' OR
       indicator_metadata.formule ILIKE '%efficacité%' OR
       indicator_metadata.formule ILIKE '%rendement%' THEN
      formule_type := 'moyenne';
    ELSIF indicator_metadata.formule ILIKE '%dernier%' OR 
          indicator_metadata.formule ILIKE '%last%' OR 
          indicator_metadata.formule ILIKE '%actuel%' OR
          indicator_metadata.formule ILIKE '%current%' OR
          indicator_metadata.formule ILIKE '%instantané%' THEN
      formule_type := 'dernier_mois';
    END IF;
  END IF;
  
  -- Construire la requête pour récupérer les sites à consolider
  FOR site_record IN
    SELECT DISTINCT site_name, value, valeur_precedente, cible,
           janvier, fevrier, mars, avril, mai, juin,
           juillet, aout, septembre, octobre, novembre, decembre
    FROM site_global_indicator_values_simple
    WHERE code = p_code 
      AND year = p_year
      AND site_name IS NOT NULL
      AND site_name NOT LIKE 'CONSOLIDATION_%'
      AND (p_organization_name IS NULL OR organization_name = p_organization_name)
      AND (p_filiere_name IS NULL OR filiere_name = p_filiere_name)
      AND (p_filiale_name IS NULL OR filiale_name = p_filiale_name)
  LOOP
    sites_list := array_append(sites_list, site_record.site_name);
    count_sites := count_sites + 1;
    
    IF formule_type = 'dernier_mois' THEN
      -- Pour somme du dernier mois, récupérer le dernier mois disponible pour ce site
      site_last_month := get_last_available_month_for_site(site_record.site_name, p_code, p_year);
      site_last_value := get_month_value_for_site(site_record.site_name, p_code, p_year, site_last_month);
      
      IF site_last_value IS NOT NULL THEN
        last_month_total := last_month_total + site_last_value;
      END IF;
    ELSE
      -- Pour somme et moyenne, traiter toutes les valeurs
      IF site_record.value IS NOT NULL THEN
        total_value := total_value + site_record.value;
      END IF;
      
      IF site_record.valeur_precedente IS NOT NULL THEN
        total_valeur_precedente := total_valeur_precedente + site_record.valeur_precedente;
      END IF;
      
      IF site_record.cible IS NOT NULL THEN
        total_cible := total_cible + site_record.cible;
      END IF;
      
      -- Additionner les valeurs mensuelles
      IF site_record.janvier IS NOT NULL THEN total_janvier := total_janvier + site_record.janvier; END IF;
      IF site_record.fevrier IS NOT NULL THEN total_fevrier := total_fevrier + site_record.fevrier; END IF;
      IF site_record.mars IS NOT NULL THEN total_mars := total_mars + site_record.mars; END IF;
      IF site_record.avril IS NOT NULL THEN total_avril := total_avril + site_record.avril; END IF;
      IF site_record.mai IS NOT NULL THEN total_mai := total_mai + site_record.mai; END IF;
      IF site_record.juin IS NOT NULL THEN total_juin := total_juin + site_record.juin; END IF;
      IF site_record.juillet IS NOT NULL THEN total_juillet := total_juillet + site_record.juillet; END IF;
      IF site_record.aout IS NOT NULL THEN total_aout := total_aout + site_record.aout; END IF;
      IF site_record.septembre IS NOT NULL THEN total_septembre := total_septembre + site_record.septembre; END IF;
      IF site_record.octobre IS NOT NULL THEN total_octobre := total_octobre + site_record.octobre; END IF;
      IF site_record.novembre IS NOT NULL THEN total_novembre := total_novembre + site_record.novembre; END IF;
      IF site_record.decembre IS NOT NULL THEN total_decembre := total_decembre + site_record.decembre; END IF;
    END IF;
  END LOOP;
  
  -- Ne créer une consolidation que s'il y a au moins 2 sites
  IF count_sites >= 2 THEN
    -- Calculer les valeurs finales selon le type de consolidation
    IF formule_type = 'moyenne' THEN
      -- Calculer les moyennes
      total_value := CASE WHEN count_sites > 0 THEN total_value / count_sites ELSE 0 END;
      total_valeur_precedente := CASE WHEN count_sites > 0 THEN total_valeur_precedente / count_sites ELSE 0 END;
      total_cible := CASE WHEN count_sites > 0 THEN total_cible / count_sites ELSE 0 END;
      
      total_janvier := CASE WHEN count_sites > 0 THEN total_janvier / count_sites ELSE 0 END;
      total_fevrier := CASE WHEN count_sites > 0 THEN total_fevrier / count_sites ELSE 0 END;
      total_mars := CASE WHEN count_sites > 0 THEN total_mars / count_sites ELSE 0 END;
      total_avril := CASE WHEN count_sites > 0 THEN total_avril / count_sites ELSE 0 END;
      total_mai := CASE WHEN count_sites > 0 THEN total_mai / count_sites ELSE 0 END;
      total_juin := CASE WHEN count_sites > 0 THEN total_juin / count_sites ELSE 0 END;
      total_juillet := CASE WHEN count_sites > 0 THEN total_juillet / count_sites ELSE 0 END;
      total_aout := CASE WHEN count_sites > 0 THEN total_aout / count_sites ELSE 0 END;
      total_septembre := CASE WHEN count_sites > 0 THEN total_septembre / count_sites ELSE 0 END;
      total_octobre := CASE WHEN count_sites > 0 THEN total_octobre / count_sites ELSE 0 END;
      total_novembre := CASE WHEN count_sites > 0 THEN total_novembre / count_sites ELSE 0 END;
      total_decembre := CASE WHEN count_sites > 0 THEN total_decembre / count_sites ELSE 0 END;
    ELSIF formule_type = 'dernier_mois' THEN
      -- Pour dernier mois, utiliser la somme des derniers mois
      total_value := last_month_total;
      -- Réinitialiser les autres valeurs
      total_valeur_precedente := 0;
      total_cible := 0;
      total_janvier := 0; total_fevrier := 0; total_mars := 0; total_avril := 0;
      total_mai := 0; total_juin := 0; total_juillet := 0; total_aout := 0;
      total_septembre := 0; total_octobre := 0; total_novembre := 0; total_decembre := 0;
    END IF;
    -- Pour 'somme', les valeurs restent telles quelles (déjà additionnées)
    
    -- Insérer ou mettre à jour la consolidation
    INSERT INTO site_consolidation (
      site_names, year, code, axe_energetique, enjeux, normes, critere, indicateur,
      definition, processus, processus_code, frequence, unite, type, formule,
      value, valeur_precedente, cible, variation,
      janvier, fevrier, mars, avril, mai, juin,
      juillet, aout, septembre, octobre, novembre, decembre,
      organization_name, filiere_name, filiale_name
    ) VALUES (
      sites_list, p_year, p_code, 
      indicator_metadata.axe_energetique, indicator_metadata.enjeux, indicator_metadata.normes,
      indicator_metadata.critere, indicator_metadata.indicateur, indicator_metadata.definition,
      indicator_metadata.processus, indicator_metadata.processus_code, indicator_metadata.frequence,
      indicator_metadata.unite, indicator_metadata.type, indicator_metadata.formule,
      NULLIF(total_value, 0), NULLIF(total_valeur_precedente, 0), NULLIF(total_cible, 0),
      CASE 
        WHEN total_valeur_precedente > 0 AND total_value IS NOT NULL THEN
          ROUND(((total_value - total_valeur_precedente) / total_valeur_precedente * 100)::numeric, 2)::text || '%'
        ELSE NULL
      END,
      NULLIF(total_janvier, 0), NULLIF(total_fevrier, 0), NULLIF(total_mars, 0), NULLIF(total_avril, 0),
      NULLIF(total_mai, 0), NULLIF(total_juin, 0), NULLIF(total_juillet, 0), NULLIF(total_aout, 0),
      NULLIF(total_septembre, 0), NULLIF(total_octobre, 0), NULLIF(total_novembre, 0), NULLIF(total_decembre, 0),
      p_organization_name, p_filiere_name, p_filiale_name
    )
    ON CONFLICT (code, year, COALESCE(organization_name, ''), COALESCE(filiere_name, ''), COALESCE(filiale_name, ''))
    DO UPDATE SET
      site_names = EXCLUDED.site_names,
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
      updated_at = now();
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour créer toutes les consolidations automatiques
CREATE OR REPLACE FUNCTION create_all_site_consolidations() RETURNS void AS $$
DECLARE
  indicator_record RECORD;
  org_record RECORD;
  filiere_record RECORD;
  filiale_record RECORD;
BEGIN
  -- Nettoyer les anciennes consolidations
  DELETE FROM site_consolidation;
  
  -- Consolider par filiale (sites d'une même filiale)
  FOR filiale_record IN
    SELECT DISTINCT organization_name, filiere_name, filiale_name, code, year
    FROM site_global_indicator_values_simple
    WHERE site_name IS NOT NULL 
      AND site_name NOT LIKE 'CONSOLIDATION_%'
      AND filiale_name IS NOT NULL
    GROUP BY organization_name, filiere_name, filiale_name, code, year
    HAVING COUNT(DISTINCT site_name) >= 2
  LOOP
    PERFORM consolidate_site_indicators(
      filiale_record.code,
      filiale_record.year,
      filiale_record.organization_name,
      filiale_record.filiere_name,
      filiale_record.filiale_name
    );
  END LOOP;
  
  -- Consolider par filière (filiales d'une même filière)
  FOR filiere_record IN
    SELECT DISTINCT organization_name, filiere_name, code, year
    FROM site_global_indicator_values_simple
    WHERE site_name IS NOT NULL 
      AND site_name NOT LIKE 'CONSOLIDATION_%'
      AND filiere_name IS NOT NULL
    GROUP BY organization_name, filiere_name, code, year
    HAVING COUNT(DISTINCT COALESCE(filiale_name, site_name)) >= 2
  LOOP
    PERFORM consolidate_site_indicators(
      filiere_record.code,
      filiere_record.year,
      filiere_record.organization_name,
      filiere_record.filiere_name,
      NULL
    );
  END LOOP;
  
  -- Consolider par organisation (filières d'une même organisation)
  FOR org_record IN
    SELECT DISTINCT organization_name, code, year
    FROM site_global_indicator_values_simple
    WHERE site_name IS NOT NULL 
      AND site_name NOT LIKE 'CONSOLIDATION_%'
      AND organization_name IS NOT NULL
    GROUP BY organization_name, code, year
    HAVING COUNT(DISTINCT COALESCE(filiere_name, filiale_name, site_name)) >= 2
  LOOP
    PERFORM consolidate_site_indicators(
      org_record.code,
      org_record.year,
      org_record.organization_name,
      NULL,
      NULL
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour synchroniser les données validées depuis indicator_values
CREATE OR REPLACE FUNCTION sync_validated_indicator_values() RETURNS void AS $$
DECLARE
  validated_record RECORD;
  site_data RECORD;
  indicator_data RECORD;
  processus_data RECORD;
  period_data RECORD;
BEGIN
  -- Parcourir toutes les données validées groupées par site/indicateur/année
  FOR validated_record IN
    SELECT 
      iv.site_name,
      iv.indicator_code,
      cp.year,
      iv.organization_name,
      s.filiere_name,
      s.filiale_name
    FROM indicator_values iv
    JOIN collection_periods cp ON iv.period_id = cp.id
    LEFT JOIN sites s ON iv.site_name = s.name
    WHERE iv.status = 'validated'
      AND iv.site_name IS NOT NULL
    GROUP BY iv.site_name, iv.indicator_code, cp.year, iv.organization_name, s.filiere_name, s.filiale_name
  LOOP
    -- Récupérer les métadonnées de l'indicateur
    SELECT * INTO indicator_data
    FROM indicators
    WHERE code = validated_record.indicator_code;
    
    -- Récupérer les métadonnées du processus
    SELECT * INTO processus_data
    FROM processus
    WHERE code = indicator_data.processus_code;
    
    -- Calculer les valeurs mensuelles et annuelles pour ce site/indicateur/année
    SELECT 
      SUM(CASE WHEN cp.period_number = 1 THEN iv.value END) as janvier,
      SUM(CASE WHEN cp.period_number = 2 THEN iv.value END) as fevrier,
      SUM(CASE WHEN cp.period_number = 3 THEN iv.value END) as mars,
      SUM(CASE WHEN cp.period_number = 4 THEN iv.value END) as avril,
      SUM(CASE WHEN cp.period_number = 5 THEN iv.value END) as mai,
      SUM(CASE WHEN cp.period_number = 6 THEN iv.value END) as juin,
      SUM(CASE WHEN cp.period_number = 7 THEN iv.value END) as juillet,
      SUM(CASE WHEN cp.period_number = 8 THEN iv.value END) as aout,
      SUM(CASE WHEN cp.period_number = 9 THEN iv.value END) as septembre,
      SUM(CASE WHEN cp.period_number = 10 THEN iv.value END) as octobre,
      SUM(CASE WHEN cp.period_number = 11 THEN iv.value END) as novembre,
      SUM(CASE WHEN cp.period_number = 12 THEN iv.value END) as decembre,
      SUM(iv.value) as total_annual
    INTO site_data
    FROM indicator_values iv
    JOIN collection_periods cp ON iv.period_id = cp.id
    WHERE iv.status = 'validated'
      AND iv.site_name = validated_record.site_name
      AND iv.indicator_code = validated_record.indicator_code
      AND cp.year = validated_record.year;
    
    -- Récupérer la valeur de l'année précédente
    SELECT SUM(iv.value) INTO site_data.valeur_precedente
    FROM indicator_values iv
    JOIN collection_periods cp ON iv.period_id = cp.id
    WHERE iv.status = 'validated'
      AND iv.site_name = validated_record.site_name
      AND iv.indicator_code = validated_record.indicator_code
      AND cp.year = validated_record.year - 1;
    
    -- Insérer ou mettre à jour dans site_global_indicator_values_simple
    INSERT INTO site_global_indicator_values_simple (
      site_name, year, code, axe_energetique, enjeux, normes, critere, indicateur,
      definition, processus, processus_code, frequence, unite, type, formule,
      value, valeur_precedente, cible,
      janvier, fevrier, mars, avril, mai, juin,
      juillet, aout, septembre, octobre, novembre, decembre,
      organization_name, filiere_name, filiale_name
    ) VALUES (
      validated_record.site_name,
      validated_record.year,
      validated_record.indicator_code,
      indicator_data.axe_energetique,
      indicator_data.enjeux,
      indicator_data.normes,
      indicator_data.critere,
      indicator_data.name,
      indicator_data.description,
      processus_data.name,
      indicator_data.processus_code,
      indicator_data.frequence,
      indicator_data.unit,
      indicator_data.type,
      indicator_data.formule,
      site_data.total_annual,
      site_data.valeur_precedente,
      100, -- Cible par défaut
      site_data.janvier, site_data.fevrier, site_data.mars, site_data.avril,
      site_data.mai, site_data.juin, site_data.juillet, site_data.aout,
      site_data.septembre, site_data.octobre, site_data.novembre, site_data.decembre,
      validated_record.organization_name,
      validated_record.filiere_name,
      validated_record.filiale_name
    )
    ON CONFLICT (site_name, code, year)
    DO UPDATE SET
      value = EXCLUDED.value,
      valeur_precedente = EXCLUDED.valeur_precedente,
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
  
  -- Créer les consolidations automatiques
  PERFORM create_all_site_consolidations();
END;
$$ LANGUAGE plpgsql;

-- Trigger pour synchroniser automatiquement les données validées
CREATE OR REPLACE FUNCTION trigger_sync_validated_values() RETURNS trigger AS $$
BEGIN
  -- Synchroniser uniquement si le statut devient 'validated'
  IF (TG_OP = 'UPDATE' AND NEW.status = 'validated' AND OLD.status != 'validated') OR
     (TG_OP = 'INSERT' AND NEW.status = 'validated') THEN
    PERFORM sync_validated_indicator_values();
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger pour recalculer les consolidations lors des modifications
CREATE OR REPLACE FUNCTION trigger_recalculate_consolidations() RETURNS trigger AS $$
BEGIN
  -- Recalculer les consolidations pour cet indicateur/année
  IF TG_OP = 'DELETE' THEN
    PERFORM create_all_site_consolidations();
    RETURN OLD;
  ELSE
    PERFORM create_all_site_consolidations();
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Créer les triggers
DROP TRIGGER IF EXISTS trigger_sync_validated_indicator_values ON indicator_values;
CREATE TRIGGER trigger_sync_validated_indicator_values
  AFTER INSERT OR UPDATE ON indicator_values
  FOR EACH ROW
  EXECUTE FUNCTION trigger_sync_validated_values();

DROP TRIGGER IF EXISTS trigger_recalculate_site_consolidations ON site_global_indicator_values_simple;
CREATE TRIGGER trigger_recalculate_site_consolidations
  AFTER INSERT OR UPDATE OR DELETE ON site_global_indicator_values_simple
  FOR EACH ROW
  EXECUTE FUNCTION trigger_recalculate_consolidations();

-- Trigger pour la mise à jour automatique de updated_at
CREATE OR REPLACE FUNCTION update_site_consolidation_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_site_consolidation_updated_at ON site_consolidation;
CREATE TRIGGER update_site_consolidation_updated_at
  BEFORE UPDATE ON site_consolidation
  FOR EACH ROW
  EXECUTE FUNCTION update_site_consolidation_updated_at();

-- Vue pour faciliter les requêtes sur les consolidations
CREATE OR REPLACE VIEW site_consolidations_view AS
SELECT 
  *,
  array_length(site_names, 1) as nombre_sites_consolides,
  CASE 
    WHEN formule ILIKE '%moyenne%' OR formule ILIKE '%ratio%' OR formule ILIKE '%pourcentage%' THEN 'moyenne'
    WHEN formule ILIKE '%dernier%' OR formule ILIKE '%last%' OR formule ILIKE '%actuel%' THEN 'dernier_mois'
    ELSE 'somme'
  END as type_consolidation
FROM site_consolidation;

-- Fonction utilitaire pour identifier si un enregistrement est une consolidation
CREATE OR REPLACE FUNCTION is_site_consolidation(p_site_names text[]) RETURNS boolean AS $$
BEGIN
  RETURN array_length(p_site_names, 1) > 1;
END;
$$ LANGUAGE plpgsql;

-- Synchroniser les données existantes
SELECT sync_validated_indicator_values();