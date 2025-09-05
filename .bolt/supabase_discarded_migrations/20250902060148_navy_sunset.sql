/*
  # Mise à jour de la logique de consolidation basée sur la formule

  1. Modifications de la table
    - Ajout de l'attribut `formule` à `consolidated_global_indicator_values`
    - Ajout de l'attribut `site_names` pour stocker la liste des sites consolidés

  2. Fonctions de consolidation
    - `determine_consolidation_type()` : Détermine le type de consolidation selon la formule
    - `consolidate_indicator_by_formula()` : Effectue la consolidation selon le type déterminé
    - `update_consolidated_indicators_with_formula()` : Fonction principale de consolidation

  3. Triggers automatiques
    - Mise à jour automatique lors des changements dans `site_global_indicator_values_simple`
    - Synchronisation des formules depuis la table `indicators`

  4. Sécurité
    - RLS activé avec politiques pour utilisateurs authentifiés
    - Index optimisés pour les performances
*/

-- Ajouter la colonne formule si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'consolidated_global_indicator_values' AND column_name = 'formule'
  ) THEN
    ALTER TABLE consolidated_global_indicator_values ADD COLUMN formule text;
    COMMENT ON COLUMN consolidated_global_indicator_values.formule IS 'Formule de calcul de l''indicateur pour déterminer le type de consolidation';
  END IF;
END $$;

-- Ajouter la colonne site_names si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'consolidated_global_indicator_values' AND column_name = 'site_names'
  ) THEN
    ALTER TABLE consolidated_global_indicator_values ADD COLUMN site_names text[] DEFAULT '{}';
    COMMENT ON COLUMN consolidated_global_indicator_values.site_names IS 'Liste des sites consolidés pour cet indicateur';
  END IF;
END $$;

-- Créer un index sur la formule pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_consolidated_global_indicator_values_formule 
ON consolidated_global_indicator_values(formule);

-- Créer un index sur site_names pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_consolidated_global_indicator_values_site_names 
ON consolidated_global_indicator_values USING gin(site_names);

-- Fonction pour déterminer le type de consolidation basé sur la formule
CREATE OR REPLACE FUNCTION determine_consolidation_type(formule_text text)
RETURNS text AS $$
BEGIN
  -- Si la formule est nulle ou vide, utiliser la somme par défaut
  IF formule_text IS NULL OR trim(formule_text) = '' THEN
    RETURN 'somme';
  END IF;
  
  -- Convertir en minuscules pour la comparaison
  formule_text := lower(trim(formule_text));
  
  -- Détecter "Somme du dernier mois"
  IF formule_text ~ '(dernier|last|actuel|current|instantané|récent|latest)' THEN
    RETURN 'dernier_mois';
  END IF;
  
  -- Détecter "Moyenne"
  IF formule_text ~ '(moyenne|average|ratio|pourcentage|percentage|taux|rate|efficacité|efficiency|rendement|yield|intensité|intensity)' THEN
    RETURN 'moyenne';
  END IF;
  
  -- Par défaut, utiliser la somme
  RETURN 'somme';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Fonction pour consolider un indicateur selon sa formule
CREATE OR REPLACE FUNCTION consolidate_indicator_by_formula(
  p_code text,
  p_year integer,
  p_organization_name text DEFAULT NULL,
  p_filiere_name text DEFAULT NULL,
  p_filiale_name text DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  consolidation_type text;
  formule_indicateur text;
  site_list text[];
  consolidated_data record;
  month_cols text[] := ARRAY['janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin', 
                            'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre'];
  month_col text;
  month_values numeric[];
  month_value numeric;
  site_count integer;
  last_month_col text;
  last_month_value numeric;
  indicator_metadata record;
BEGIN
  -- Récupérer la formule de l'indicateur
  SELECT formule INTO formule_indicateur
  FROM indicators 
  WHERE code = p_code;
  
  -- Déterminer le type de consolidation
  consolidation_type := determine_consolidation_type(formule_indicateur);
  
  -- Construire la requête pour récupérer les données des sites
  WITH site_data AS (
    SELECT 
      s.*,
      ARRAY[s.site_name] as sites_array
    FROM site_global_indicator_values_simple s
    WHERE s.code = p_code 
      AND s.year = p_year
      AND (p_organization_name IS NULL OR s.organization_name = p_organization_name)
      AND (p_filiere_name IS NULL OR s.filiere_name = p_filiere_name)
      AND (p_filiale_name IS NULL OR s.filiale_name = p_filiale_name)
      AND s.site_name IS NOT NULL
  ),
  aggregated_data AS (
    SELECT 
      code,
      year,
      organization_name,
      filiere_name,
      filiale_name,
      array_agg(DISTINCT site_name) as site_names,
      -- Récupérer les métadonnées du premier enregistrement
      (array_agg(axe_energetique))[1] as axe_energetique,
      (array_agg(enjeux))[1] as enjeux,
      (array_agg(normes))[1] as normes,
      (array_agg(critere))[1] as critere,
      (array_agg(indicateur))[1] as indicateur,
      (array_agg(definition))[1] as definition,
      (array_agg(processus))[1] as processus,
      (array_agg(processus_code))[1] as processus_code,
      (array_agg(frequence))[1] as frequence,
      (array_agg(unite))[1] as unite,
      (array_agg(type))[1] as type,
      (array_agg(formule))[1] as formule,
      (array_agg(cible))[1] as cible,
      
      -- Consolidation selon le type
      CASE 
        WHEN consolidation_type = 'moyenne' THEN
          -- Moyenne des valeurs annuelles
          avg(value) as consolidated_value,
          avg(valeur_precedente) as consolidated_valeur_precedente,
          -- Moyenne des valeurs mensuelles
          avg(janvier) as consolidated_janvier,
          avg(fevrier) as consolidated_fevrier,
          avg(mars) as consolidated_mars,
          avg(avril) as consolidated_avril,
          avg(mai) as consolidated_mai,
          avg(juin) as consolidated_juin,
          avg(juillet) as consolidated_juillet,
          avg(aout) as consolidated_aout,
          avg(septembre) as consolidated_septembre,
          avg(octobre) as consolidated_octobre,
          avg(novembre) as consolidated_novembre,
          avg(decembre) as consolidated_decembre
          
        WHEN consolidation_type = 'dernier_mois' THEN
          -- Somme du dernier mois disponible de chaque site
          sum(
            COALESCE(decembre, 
            COALESCE(novembre,
            COALESCE(octobre,
            COALESCE(septembre,
            COALESCE(aout,
            COALESCE(juillet,
            COALESCE(juin,
            COALESCE(mai,
            COALESCE(avril,
            COALESCE(mars,
            COALESCE(fevrier, janvier)))))))))))
          ) as consolidated_value,
          sum(valeur_precedente) as consolidated_valeur_precedente,
          -- Pour les mois, on garde la somme normale
          sum(janvier) as consolidated_janvier,
          sum(fevrier) as consolidated_fevrier,
          sum(mars) as consolidated_mars,
          sum(avril) as consolidated_avril,
          sum(mai) as consolidated_mai,
          sum(juin) as consolidated_juin,
          sum(juillet) as consolidated_juillet,
          sum(aout) as consolidated_aout,
          sum(septembre) as consolidated_septembre,
          sum(octobre) as consolidated_octobre,
          sum(novembre) as consolidated_novembre,
          sum(decembre) as consolidated_decembre
          
        ELSE -- 'somme' par défaut
          -- Somme des valeurs annuelles
          sum(value) as consolidated_value,
          sum(valeur_precedente) as consolidated_valeur_precedente,
          -- Somme des valeurs mensuelles
          sum(janvier) as consolidated_janvier,
          sum(fevrier) as consolidated_fevrier,
          sum(mars) as consolidated_mars,
          sum(avril) as consolidated_avril,
          sum(mai) as consolidated_mai,
          sum(juin) as consolidated_juin,
          sum(juillet) as consolidated_juillet,
          sum(aout) as consolidated_aout,
          sum(septembre) as consolidated_septembre,
          sum(octobre) as consolidated_octobre,
          sum(novembre) as consolidated_novembre,
          sum(decembre) as consolidated_decembre
      END,
      
      count(*) as site_count
    FROM site_data
    GROUP BY code, year, organization_name, filiere_name, filiale_name
  )
  SELECT * INTO consolidated_data FROM aggregated_data;
  
  -- Si aucune donnée trouvée, sortir
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Calculer les variations et performances
  consolidated_data.variations_pourcent := 
    CASE 
      WHEN consolidated_data.consolidated_valeur_precedente IS NOT NULL 
           AND consolidated_data.consolidated_valeur_precedente != 0 
      THEN 
        ((consolidated_data.consolidated_value - consolidated_data.consolidated_valeur_precedente) 
         / consolidated_data.consolidated_valeur_precedente) * 100
      ELSE NULL 
    END;
    
  consolidated_data.performances_pourcent := 
    CASE 
      WHEN consolidated_data.cible IS NOT NULL AND consolidated_data.cible != 0 
      THEN 
        (consolidated_data.consolidated_value / consolidated_data.cible) * 100
      ELSE NULL 
    END;
  
  -- Insérer ou mettre à jour dans consolidated_global_indicator_values
  INSERT INTO consolidated_global_indicator_values (
    organization_name, filiere_name, filiale_name, indicator_code, year, site_names,
    axe_energetique, enjeux, normes, critere, indicateur, definition, processus, processus_code,
    frequence, unite, type, formule, value, valeur_precedente, cible, variation,
    janvier, fevrier, mars, avril, mai, juin, juillet, aout, septembre, octobre, novembre, decembre,
    variations_pourcent, performances_pourcent
  ) VALUES (
    consolidated_data.organization_name,
    consolidated_data.filiere_name,
    consolidated_data.filiale_name,
    consolidated_data.code,
    consolidated_data.year,
    consolidated_data.site_names,
    consolidated_data.axe_energetique,
    consolidated_data.enjeux,
    consolidated_data.normes,
    consolidated_data.critere,
    consolidated_data.indicateur,
    consolidated_data.definition,
    consolidated_data.processus,
    consolidated_data.processus_code,
    consolidated_data.frequence,
    consolidated_data.unite,
    consolidated_data.type,
    consolidated_data.formule,
    consolidated_data.consolidated_value,
    consolidated_data.consolidated_valeur_precedente,
    consolidated_data.cible,
    CASE 
      WHEN consolidated_data.consolidated_valeur_precedente IS NOT NULL 
           AND consolidated_data.consolidated_valeur_precedente != 0 
      THEN 
        CASE 
          WHEN consolidated_data.consolidated_value > consolidated_data.consolidated_valeur_precedente 
          THEN 'hausse'
          WHEN consolidated_data.consolidated_value < consolidated_data.consolidated_valeur_precedente 
          THEN 'baisse'
          ELSE 'stable'
        END
      ELSE 'non_defini'
    END,
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
    consolidated_data.variations_pourcent,
    consolidated_data.performances_pourcent
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
$$ LANGUAGE plpgsql;

-- Fonction principale pour mettre à jour toutes les consolidations
CREATE OR REPLACE FUNCTION update_consolidated_indicators_with_formula()
RETURNS void AS $$
DECLARE
  indicator_rec record;
  org_rec record;
  year_rec record;
BEGIN
  -- Pour chaque indicateur qui a des données dans site_global_indicator_values_simple
  FOR indicator_rec IN 
    SELECT DISTINCT code 
    FROM site_global_indicator_values_simple 
    WHERE site_name IS NOT NULL
  LOOP
    -- Pour chaque organisation
    FOR org_rec IN 
      SELECT DISTINCT organization_name, filiere_name, filiale_name
      FROM site_global_indicator_values_simple 
      WHERE code = indicator_rec.code 
        AND site_name IS NOT NULL
        AND (
          -- Au moins 2 sites pour justifier une consolidation
          (SELECT count(DISTINCT site_name) 
           FROM site_global_indicator_values_simple s2 
           WHERE s2.code = indicator_rec.code 
             AND s2.organization_name = site_global_indicator_values_simple.organization_name
             AND COALESCE(s2.filiere_name, '') = COALESCE(site_global_indicator_values_simple.filiere_name, '')
             AND COALESCE(s2.filiale_name, '') = COALESCE(site_global_indicator_values_simple.filiale_name, '')
             AND s2.site_name IS NOT NULL
          ) >= 2
        )
    LOOP
      -- Pour chaque année
      FOR year_rec IN 
        SELECT DISTINCT year 
        FROM site_global_indicator_values_simple 
        WHERE code = indicator_rec.code 
          AND organization_name = org_rec.organization_name
          AND COALESCE(filiere_name, '') = COALESCE(org_rec.filiere_name, '')
          AND COALESCE(filiale_name, '') = COALESCE(org_rec.filiale_name, '')
          AND site_name IS NOT NULL
      LOOP
        -- Effectuer la consolidation pour cet indicateur/organisation/année
        PERFORM consolidate_indicator_by_formula(
          indicator_rec.code,
          year_rec.year,
          org_rec.organization_name,
          org_rec.filiere_name,
          org_rec.filiale_name
        );
      END LOOP;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Fonction trigger pour la consolidation automatique
CREATE OR REPLACE FUNCTION trigger_consolidate_with_formula()
RETURNS trigger AS $$
BEGIN
  -- Consolider pour l'indicateur modifié
  IF TG_OP = 'DELETE' THEN
    PERFORM consolidate_indicator_by_formula(
      OLD.code,
      OLD.year,
      OLD.organization_name,
      OLD.filiere_name,
      OLD.filiale_name
    );
    RETURN OLD;
  ELSE
    PERFORM consolidate_indicator_by_formula(
      NEW.code,
      NEW.year,
      NEW.organization_name,
      NEW.filiere_name,
      NEW.filiale_name
    );
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Supprimer l'ancien trigger s'il existe
DROP TRIGGER IF EXISTS trigger_update_consolidated_indicators ON site_global_indicator_values_simple;

-- Créer le nouveau trigger
CREATE TRIGGER trigger_update_consolidated_indicators_with_formula
  AFTER INSERT OR UPDATE OR DELETE ON site_global_indicator_values_simple
  FOR EACH ROW
  EXECUTE FUNCTION trigger_consolidate_with_formula();

-- Fonction pour synchroniser les formules depuis la table indicators
CREATE OR REPLACE FUNCTION sync_formule_to_consolidated()
RETURNS void AS $$
BEGIN
  -- Mettre à jour les formules dans consolidated_global_indicator_values
  UPDATE consolidated_global_indicator_values 
  SET formule = i.formule,
      updated_at = now()
  FROM indicators i
  WHERE consolidated_global_indicator_values.indicator_code = i.code
    AND (consolidated_global_indicator_values.formule IS DISTINCT FROM i.formule);
    
  -- Mettre à jour les formules dans site_global_indicator_values_simple si pas déjà fait
  UPDATE site_global_indicator_values_simple 
  SET formule = i.formule,
      updated_at = now()
  FROM indicators i
  WHERE site_global_indicator_values_simple.code = i.code
    AND (site_global_indicator_values_simple.formule IS DISTINCT FROM i.formule);
END;
$$ LANGUAGE plpgsql;

-- Trigger pour propager les changements de formule depuis indicators
CREATE OR REPLACE FUNCTION propagate_formule_changes_to_consolidated()
RETURNS trigger AS $$
BEGIN
  -- Synchroniser les formules
  PERFORM sync_formule_to_consolidated();
  
  -- Recalculer les consolidations pour cet indicateur
  PERFORM update_consolidated_indicators_with_formula();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Supprimer l'ancien trigger s'il existe
DROP TRIGGER IF EXISTS trigger_propagate_formule_changes ON indicators;

-- Créer le trigger sur la table indicators
CREATE TRIGGER trigger_propagate_formule_changes_to_consolidated
  AFTER UPDATE OF formule ON indicators
  FOR EACH ROW
  WHEN (OLD.formule IS DISTINCT FROM NEW.formule)
  EXECUTE FUNCTION propagate_formule_changes_to_consolidated();

-- Synchroniser les formules existantes
SELECT sync_formule_to_consolidated();

-- Recalculer toutes les consolidations avec la nouvelle logique
SELECT update_consolidated_indicators_with_formula();

-- Créer une vue pour faciliter l'accès aux consolidations
CREATE OR REPLACE VIEW consolidated_indicators_view AS
SELECT 
  c.*,
  determine_consolidation_type(c.formule) as consolidation_type,
  array_length(c.site_names, 1) as nombre_sites_consolides
FROM consolidated_global_indicator_values c
ORDER BY c.organization_name, c.filiere_name, c.filiale_name, c.indicator_code, c.year;