/*
  # Population de la table calculated_indicators

  1. Objectif
     - Remplir automatiquement la table calculated_indicators
     - Créer 12 enregistrements mensuels par indicateur calculé par site
     - Utiliser les données de site_processes et organization_selections

  2. Processus
     - Analyser site_processes pour chaque site
     - Identifier les indicateurs calculés des processus
     - Vérifier dans organization_selections
     - Récupérer les dépendances depuis indicator_dependencies
     - Créer les enregistrements mensuels

  3. Résultat
     - Table calculated_indicators peuplée avec tous les indicateurs calculés
     - Structure mensuelle complète pour chaque site
     - Dépendances et méthodes de calcul configurées
*/

-- Fonction principale pour peupler calculated_indicators
CREATE OR REPLACE FUNCTION populate_calculated_indicators_from_site_processes()
RETURNS TABLE(
  site_name text,
  organization_name text,
  indicator_code text,
  records_created integer,
  status text,
  message text
) 
LANGUAGE plpgsql
AS $$
DECLARE
  site_process_record RECORD;
  indicator_record RECORD;
  dependency_record RECORD;
  org_indicators text[];
  current_year integer := EXTRACT(YEAR FROM CURRENT_DATE);
  month_num integer;
  records_count integer := 0;
BEGIN
  -- Pour chaque association site-processus active
  FOR site_process_record IN 
    SELECT DISTINCT 
      sp.site_name,
      sp.organization_name,
      sp.processus_code
    FROM site_processes sp
    WHERE sp.is_active = true
      AND sp.site_name IS NOT NULL
      AND sp.organization_name IS NOT NULL
      AND sp.processus_code IS NOT NULL
  LOOP
    -- Récupérer les indicateurs sélectionnés par l'organisation
    SELECT COALESCE(os.indicator_names, ARRAY[]::text[]) INTO org_indicators
    FROM organization_selections os
    WHERE os.organization_name = site_process_record.organization_name
    ORDER BY os.created_at DESC 
    LIMIT 1;
    
    -- Si aucun indicateur sélectionné, passer au suivant
    IF array_length(org_indicators, 1) IS NULL THEN
      CONTINUE;
    END IF;
    
    -- Pour chaque indicateur calculé du processus
    FOR indicator_record IN
      SELECT i.code, i.name, i.formule
      FROM indicators i
      WHERE i.processus_code = site_process_record.processus_code
        AND i.formule IS NOT NULL 
        AND i.formule != ''
        AND i.name = ANY(org_indicators) -- Vérifier que l'indicateur fait partie des sélections
    LOOP
      records_count := 0;
      
      -- Vérifier si une configuration existe dans indicator_dependencies
      SELECT * INTO dependency_record
      FROM indicator_dependencies
      WHERE indicator_code = indicator_record.code;
      
      -- Si pas de configuration, en créer une par défaut
      IF NOT FOUND THEN
        INSERT INTO indicator_dependencies (
          indicator_code,
          dependances,
          methode_calcul,
          description,
          is_active
        )
        VALUES (
          indicator_record.code,
          ARRAY[]::text[], -- Dépendances vides par défaut
          indicator_record.formule,
          'Configuration automatique depuis indicators',
          true -- Actif par défaut
        )
        ON CONFLICT (indicator_code) DO UPDATE SET
          methode_calcul = EXCLUDED.methode_calcul,
          updated_at = CURRENT_TIMESTAMP;
        
        -- Récupérer la configuration créée
        SELECT * INTO dependency_record
        FROM indicator_dependencies
        WHERE indicator_code = indicator_record.code;
      END IF;
      
      -- Créer 12 enregistrements mensuels pour l'année courante
      FOR month_num IN 1..12 LOOP
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
        )
        VALUES (
          site_process_record.site_name,
          site_process_record.organization_name,
          indicator_record.code,
          dependency_record.dependances,
          dependency_record.methode_calcul,
          NULL, -- Valeur à calculer plus tard
          'mensuel',
          current_year,
          month_num
        )
        ON CONFLICT (site_name, organization_name, indicator_code, periode, year, month) 
        DO UPDATE SET
          dependances = EXCLUDED.dependances,
          methode_calcul = EXCLUDED.methode_calcul,
          updated_at = CURRENT_TIMESTAMP;
        
        records_count := records_count + 1;
      END LOOP;
      
      -- Retourner le résultat pour cet indicateur
      site_name := site_process_record.site_name;
      organization_name := site_process_record.organization_name;
      indicator_code := indicator_record.code;
      records_created := records_count;
      status := 'SUCCESS';
      message := format('Créé %s enregistrements mensuels pour %s', records_count, indicator_record.name);
      RETURN NEXT;
    END LOOP;
  END LOOP;
  
  RETURN;
END;
$$;

-- Fonction pour obtenir le nombre d'enregistrements créés par site
CREATE OR REPLACE FUNCTION get_calculated_indicators_summary_by_site()
RETURNS TABLE(
  site_name text,
  organization_name text,
  total_indicators bigint,
  total_monthly_records bigint,
  configured_indicators bigint,
  year integer
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ci.site_name,
    ci.organization_name,
    COUNT(DISTINCT ci.indicator_code) as total_indicators,
    COUNT(*) as total_monthly_records,
    COUNT(DISTINCT CASE WHEN id.is_active = true THEN ci.indicator_code END) as configured_indicators,
    ci.year
  FROM calculated_indicators ci
  LEFT JOIN indicator_dependencies id ON id.indicator_code = ci.indicator_code
  GROUP BY ci.site_name, ci.organization_name, ci.year
  ORDER BY ci.organization_name, ci.site_name;
END;
$$;

-- Fonction pour voir les détails mensuels d'un site
CREATE OR REPLACE FUNCTION get_site_monthly_indicators(
  p_site_name text,
  p_organization_name text,
  p_year integer DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::integer
)
RETURNS TABLE(
  indicator_code text,
  indicator_name text,
  month_number integer,
  month_name text,
  dependances text[],
  methode_calcul text,
  valeur numeric,
  is_configured boolean
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ci.indicator_code,
    i.name as indicator_name,
    ci.month as month_number,
    CASE ci.month
      WHEN 1 THEN 'Janvier'
      WHEN 2 THEN 'Février'
      WHEN 3 THEN 'Mars'
      WHEN 4 THEN 'Avril'
      WHEN 5 THEN 'Mai'
      WHEN 6 THEN 'Juin'
      WHEN 7 THEN 'Juillet'
      WHEN 8 THEN 'Août'
      WHEN 9 THEN 'Septembre'
      WHEN 10 THEN 'Octobre'
      WHEN 11 THEN 'Novembre'
      WHEN 12 THEN 'Décembre'
    END as month_name,
    ci.dependances,
    ci.methode_calcul,
    ci.valeur,
    COALESCE(id.is_active, false) as is_configured
  FROM calculated_indicators ci
  LEFT JOIN indicators i ON i.code = ci.indicator_code
  LEFT JOIN indicator_dependencies id ON id.indicator_code = ci.indicator_code
  WHERE ci.site_name = p_site_name
    AND ci.organization_name = p_organization_name
    AND ci.year = p_year
  ORDER BY ci.indicator_code, ci.month;
END;
$$;

-- Fonction pour nettoyer et repeupler la table
CREATE OR REPLACE FUNCTION refresh_calculated_indicators()
RETURNS TABLE(
  action text,
  count bigint,
  message text
) 
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count bigint;
  created_count bigint;
BEGIN
  -- Supprimer tous les enregistrements existants
  DELETE FROM calculated_indicators;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  action := 'DELETE';
  count := deleted_count;
  message := format('Supprimé %s enregistrements existants', deleted_count);
  RETURN NEXT;
  
  -- Repeupler la table
  PERFORM populate_calculated_indicators_from_site_processes();
  
  -- Compter les nouveaux enregistrements
  SELECT COUNT(*) INTO created_count FROM calculated_indicators;
  
  action := 'INSERT';
  count := created_count;
  message := format('Créé %s nouveaux enregistrements', created_count);
  RETURN NEXT;
  
  RETURN;
END;
$$;

-- EXÉCUTION : Peupler la table calculated_indicators
SELECT 'DÉBUT DE LA POPULATION DE calculated_indicators' as info;

-- Étape 1: S'assurer que les dépendances sont configurées
SELECT 'Étape 1: Configuration des dépendances d''indicateurs' as info;
SELECT * FROM populate_calculated_indicators_from_indicators();

-- Étape 2: Peupler calculated_indicators avec les 12 mois
SELECT 'Étape 2: Population de calculated_indicators (12 mois par indicateur)' as info;
SELECT * FROM populate_calculated_indicators_from_site_processes();

-- Étape 3: Afficher le résumé par site
SELECT 'Étape 3: Résumé par site' as info;
SELECT * FROM get_calculated_indicators_summary_by_site();

-- Étape 4: Afficher les statistiques globales
SELECT 'Étape 4: Statistiques globales' as info;
SELECT 
  COUNT(*) as total_records,
  COUNT(DISTINCT site_name) as total_sites,
  COUNT(DISTINCT organization_name) as total_organizations,
  COUNT(DISTINCT indicator_code) as total_indicators,
  COUNT(DISTINCT (site_name, indicator_code)) as total_site_indicator_combinations
FROM calculated_indicators;

-- Étape 5: Afficher un exemple de données créées
SELECT 'Étape 5: Exemple de données créées (premiers 20 enregistrements)' as info;
SELECT 
  site_name,
  organization_name,
  indicator_code,
  month,
  CASE month
    WHEN 1 THEN 'Janvier'
    WHEN 2 THEN 'Février'
    WHEN 3 THEN 'Mars'
    WHEN 4 THEN 'Avril'
    WHEN 5 THEN 'Mai'
    WHEN 6 THEN 'Juin'
    WHEN 7 THEN 'Juillet'
    WHEN 8 THEN 'Août'
    WHEN 9 THEN 'Septembre'
    WHEN 10 THEN 'Octobre'
    WHEN 11 THEN 'Novembre'
    WHEN 12 THEN 'Décembre'
  END as mois_nom,
  periode,
  year
FROM calculated_indicators
ORDER BY site_name, indicator_code, month
LIMIT 20;

SELECT 'POPULATION TERMINÉE' as info;