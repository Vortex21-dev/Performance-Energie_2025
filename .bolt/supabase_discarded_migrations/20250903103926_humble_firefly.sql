/*
  # Mise à jour de la table site_consolidation

  1. Fonction de consolidation
    - Fonction pour consolider les données depuis site_global_indicator_values_simple
    - Agrégation par groupes de sites avec hiérarchie organisationnelle

  2. Synchronisation
    - Reconstruction complète des données consolidées
    - Mise à jour des métadonnées et calculs de performance

  3. Triggers
    - Trigger automatique pour maintenir la synchronisation
    - Mise à jour en temps réel lors des changements

  4. Index
    - Optimisation des index pour les performances de consolidation
*/

-- Fonction pour consolider les données de sites vers site_consolidation
CREATE OR REPLACE FUNCTION consolidate_site_data()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- Vider la table site_consolidation pour la reconstruire
  DELETE FROM site_consolidation;
  
  -- Insérer les données consolidées depuis site_global_indicator_values_simple
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
    organization_name,
    filiere_name,
    filiale_name,
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
    perf_decembre
  )
  SELECT 
    -- Grouper les sites par organisation, filière, filiale et indicateur
    ARRAY_AGG(DISTINCT sgiv.site_name ORDER BY sgiv.site_name) as site_names,
    sgiv.year,
    sgiv.code,
    sgiv.axe_energetique,
    sgiv.enjeux,
    sgiv.normes,
    sgiv.critere,
    sgiv.indicateur,
    sgiv.definition,
    sgiv.processus,
    sgiv.processus_code,
    sgiv.frequence,
    sgiv.unite,
    sgiv.type,
    sgiv.formule,
    
    -- Agrégation des valeurs (somme pour les valeurs absolues, moyenne pour les pourcentages)
    CASE 
      WHEN sgiv.type = 'percentage' THEN AVG(sgiv.value)
      ELSE SUM(sgiv.value)
    END as value,
    
    CASE 
      WHEN sgiv.type = 'percentage' THEN AVG(sgiv.valeur_precedente)
      ELSE SUM(sgiv.valeur_precedente)
    END as valeur_precedente,
    
    CASE 
      WHEN sgiv.type = 'percentage' THEN AVG(sgiv.cible)
      ELSE SUM(sgiv.cible)
    END as cible,
    
    -- Calcul de la variation moyenne
    AVG(
      CASE 
        WHEN sgiv.valeur_precedente IS NOT NULL AND sgiv.valeur_precedente != 0 
        THEN ((sgiv.value - sgiv.valeur_precedente) / sgiv.valeur_precedente * 100)
        ELSE NULL 
      END
    )::text as variation,
    
    -- Agrégation des valeurs mensuelles
    CASE 
      WHEN sgiv.type = 'percentage' THEN AVG(sgiv.janvier)
      ELSE SUM(sgiv.janvier)
    END as janvier,
    CASE 
      WHEN sgiv.type = 'percentage' THEN AVG(sgiv.fevrier)
      ELSE SUM(sgiv.fevrier)
    END as fevrier,
    CASE 
      WHEN sgiv.type = 'percentage' THEN AVG(sgiv.mars)
      ELSE SUM(sgiv.mars)
    END as mars,
    CASE 
      WHEN sgiv.type = 'percentage' THEN AVG(sgiv.avril)
      ELSE SUM(sgiv.avril)
    END as avril,
    CASE 
      WHEN sgiv.type = 'percentage' THEN AVG(sgiv.mai)
      ELSE SUM(sgiv.mai)
    END as mai,
    CASE 
      WHEN sgiv.type = 'percentage' THEN AVG(sgiv.juin)
      ELSE SUM(sgiv.juin)
    END as juin,
    CASE 
      WHEN sgiv.type = 'percentage' THEN AVG(sgiv.juillet)
      ELSE SUM(sgiv.juillet)
    END as juillet,
    CASE 
      WHEN sgiv.type = 'percentage' THEN AVG(sgiv.aout)
      ELSE SUM(sgiv.aout)
    END as aout,
    CASE 
      WHEN sgiv.type = 'percentage' THEN AVG(sgiv.septembre)
      ELSE SUM(sgiv.septembre)
    END as septembre,
    CASE 
      WHEN sgiv.type = 'percentage' THEN AVG(sgiv.octobre)
      ELSE SUM(sgiv.octobre)
    END as octobre,
    CASE 
      WHEN sgiv.type = 'percentage' THEN AVG(sgiv.novembre)
      ELSE SUM(sgiv.novembre)
    END as novembre,
    CASE 
      WHEN sgiv.type = 'percentage' THEN AVG(sgiv.decembre)
      ELSE SUM(sgiv.decembre)
    END as decembre,
    
    -- Informations organisationnelles
    sgiv.organization_name,
    sgiv.filiere_name,
    sgiv.filiale_name,
    
    -- Calcul des variations en pourcentage
    AVG(sgiv.variations_pourcent) as variations_pourcent,
    AVG(sgiv.performances_pourcent) as performances_pourcent,
    
    -- Performances mensuelles (moyenne des performances des sites)
    AVG(sgiv.perf_janvier) as perf_janvier,
    AVG(sgiv.perf_fevrier) as perf_fevrier,
    AVG(sgiv.perf_mars) as perf_mars,
    AVG(sgiv.perf_avril) as perf_avril,
    AVG(sgiv.perf_mai) as perf_mai,
    AVG(sgiv.perf_juin) as perf_juin,
    AVG(sgiv.perf_juillet) as perf_juillet,
    AVG(sgiv.perf_aout) as perf_aout,
    AVG(sgiv.perf_septembre) as perf_septembre,
    AVG(sgiv.perf_octobre) as perf_octobre,
    AVG(sgiv.perf_novembre) as perf_novembre,
    AVG(sgiv.perf_decembre) as perf_decembre
    
  FROM site_global_indicator_values_simple sgiv
  WHERE sgiv.site_name IS NOT NULL
    AND sgiv.code IS NOT NULL
    AND sgiv.year IS NOT NULL
    AND sgiv.organization_name IS NOT NULL
  GROUP BY 
    sgiv.organization_name,
    sgiv.filiere_name,
    sgiv.filiale_name,
    sgiv.year,
    sgiv.code,
    sgiv.axe_energetique,
    sgiv.enjeux,
    sgiv.normes,
    sgiv.critere,
    sgiv.indicateur,
    sgiv.definition,
    sgiv.processus,
    sgiv.processus_code,
    sgiv.frequence,
    sgiv.unite,
    sgiv.type,
    sgiv.formule;

  RAISE NOTICE 'Site consolidation mise à jour: % lignes insérées', 
    (SELECT COUNT(*) FROM site_consolidation);
END;
$$;

-- Fonction trigger pour maintenir la synchronisation automatique
CREATE OR REPLACE FUNCTION trigger_sync_site_consolidation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Supprimer les anciennes données pour cette combinaison
  DELETE FROM site_consolidation 
  WHERE organization_name = COALESCE(NEW.organization_name, OLD.organization_name)
    AND code = COALESCE(NEW.code, OLD.code)
    AND year = COALESCE(NEW.year, OLD.year)
    AND COALESCE(filiere_name, '') = COALESCE(COALESCE(NEW.filiere_name, OLD.filiere_name), '')
    AND COALESCE(filiale_name, '') = COALESCE(COALESCE(NEW.filiale_name, OLD.filiale_name), '');
  
  -- Recalculer et insérer les nouvelles données consolidées
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
    organization_name,
    filiere_name,
    filiale_name,
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
    perf_decembre
  )
  SELECT 
    ARRAY_AGG(DISTINCT sgiv.site_name ORDER BY sgiv.site_name) as site_names,
    sgiv.year,
    sgiv.code,
    sgiv.axe_energetique,
    sgiv.enjeux,
    sgiv.normes,
    sgiv.critere,
    sgiv.indicateur,
    sgiv.definition,
    sgiv.processus,
    sgiv.processus_code,
    sgiv.frequence,
    sgiv.unite,
    sgiv.type,
    sgiv.formule,
    
    CASE 
      WHEN sgiv.type = 'percentage' THEN AVG(sgiv.value)
      ELSE SUM(sgiv.value)
    END as value,
    
    CASE 
      WHEN sgiv.type = 'percentage' THEN AVG(sgiv.valeur_precedente)
      ELSE SUM(sgiv.valeur_precedente)
    END as valeur_precedente,
    
    CASE 
      WHEN sgiv.type = 'percentage' THEN AVG(sgiv.cible)
      ELSE SUM(sgiv.cible)
    END as cible,
    
    AVG(
      CASE 
        WHEN sgiv.valeur_precedente IS NOT NULL AND sgiv.valeur_precedente != 0 
        THEN ((sgiv.value - sgiv.valeur_precedente) / sgiv.valeur_precedente * 100)
        ELSE NULL 
      END
    )::text as variation,
    
    CASE WHEN sgiv.type = 'percentage' THEN AVG(sgiv.janvier) ELSE SUM(sgiv.janvier) END as janvier,
    CASE WHEN sgiv.type = 'percentage' THEN AVG(sgiv.fevrier) ELSE SUM(sgiv.fevrier) END as fevrier,
    CASE WHEN sgiv.type = 'percentage' THEN AVG(sgiv.mars) ELSE SUM(sgiv.mars) END as mars,
    CASE WHEN sgiv.type = 'percentage' THEN AVG(sgiv.avril) ELSE SUM(sgiv.avril) END as avril,
    CASE WHEN sgiv.type = 'percentage' THEN AVG(sgiv.mai) ELSE SUM(sgiv.mai) END as mai,
    CASE WHEN sgiv.type = 'percentage' THEN AVG(sgiv.juin) ELSE SUM(sgiv.juin) END as juin,
    CASE WHEN sgiv.type = 'percentage' THEN AVG(sgiv.juillet) ELSE SUM(sgiv.juillet) END as juillet,
    CASE WHEN sgiv.type = 'percentage' THEN AVG(sgiv.aout) ELSE SUM(sgiv.aout) END as aout,
    CASE WHEN sgiv.type = 'percentage' THEN AVG(sgiv.septembre) ELSE SUM(sgiv.septembre) END as septembre,
    CASE WHEN sgiv.type = 'percentage' THEN AVG(sgiv.octobre) ELSE SUM(sgiv.octobre) END as octobre,
    CASE WHEN sgiv.type = 'percentage' THEN AVG(sgiv.novembre) ELSE SUM(sgiv.novembre) END as novembre,
    CASE WHEN sgiv.type = 'percentage' THEN AVG(sgiv.decembre) ELSE SUM(sgiv.decembre) END as decembre,
    
    sgiv.organization_name,
    sgiv.filiere_name,
    sgiv.filiale_name,
    
    AVG(sgiv.variations_pourcent) as variations_pourcent,
    AVG(sgiv.performances_pourcent) as performances_pourcent,
    
    AVG(sgiv.perf_janvier) as perf_janvier,
    AVG(sgiv.perf_fevrier) as perf_fevrier,
    AVG(sgiv.perf_mars) as perf_mars,
    AVG(sgiv.perf_avril) as perf_avril,
    AVG(sgiv.perf_mai) as perf_mai,
    AVG(sgiv.perf_juin) as perf_juin,
    AVG(sgiv.perf_juillet) as perf_juillet,
    AVG(sgiv.perf_aout) as perf_aout,
    AVG(sgiv.perf_septembre) as perf_septembre,
    AVG(sgiv.perf_octobre) as perf_octobre,
    AVG(sgiv.perf_novembre) as perf_novembre,
    AVG(sgiv.perf_decembre) as perf_decembre
    
  FROM site_global_indicator_values_simple sgiv
  WHERE sgiv.site_name IS NOT NULL
    AND sgiv.code IS NOT NULL
    AND sgiv.year IS NOT NULL
    AND sgiv.organization_name IS NOT NULL
  GROUP BY 
    sgiv.organization_name,
    sgiv.filiere_name,
    sgiv.filiale_name,
    sgiv.year,
    sgiv.code,
    sgiv.axe_energetique,
    sgiv.enjeux,
    sgiv.normes,
    sgiv.critere,
    sgiv.indicateur,
    sgiv.definition,
    sgiv.processus,
    sgiv.processus_code,
    sgiv.frequence,
    sgiv.unite,
    sgiv.type,
    sgiv.formule;

  RAISE NOTICE 'Consolidation des sites terminée: % lignes consolidées', 
    (SELECT COUNT(*) FROM site_consolidation);
END;
$$;

-- Fonction trigger pour synchronisation automatique lors des changements
CREATE OR REPLACE FUNCTION trigger_auto_sync_site_consolidation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  affected_org text;
  affected_year integer;
  affected_code text;
  affected_filiere text;
  affected_filiale text;
BEGIN
  -- Déterminer les valeurs affectées selon l'opération
  IF TG_OP = 'DELETE' THEN
    affected_org := OLD.organization_name;
    affected_year := OLD.year;
    affected_code := OLD.code;
    affected_filiere := OLD.filiere_name;
    affected_filiale := OLD.filiale_name;
  ELSE
    affected_org := NEW.organization_name;
    affected_year := NEW.year;
    affected_code := NEW.code;
    affected_filiere := NEW.filiere_name;
    affected_filiale := NEW.filiale_name;
  END IF;

  -- Supprimer les anciennes données consolidées pour cette combinaison
  DELETE FROM site_consolidation 
  WHERE organization_name = affected_org
    AND year = affected_year
    AND code = affected_code
    AND COALESCE(filiere_name, '') = COALESCE(affected_filiere, '')
    AND COALESCE(filiale_name, '') = COALESCE(affected_filiale, '');

  -- Si ce n'est pas une suppression, recalculer les données consolidées
  IF TG_OP != 'DELETE' THEN
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
      organization_name,
      filiere_name,
      filiale_name,
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
      perf_decembre
    )
    SELECT 
      ARRAY_AGG(DISTINCT sgiv.site_name ORDER BY sgiv.site_name) as site_names,
      sgiv.year,
      sgiv.code,
      sgiv.axe_energetique,
      sgiv.enjeux,
      sgiv.normes,
      sgiv.critere,
      sgiv.indicateur,
      sgiv.definition,
      sgiv.processus,
      sgiv.processus_code,
      sgiv.frequence,
      sgiv.unite,
      sgiv.type,
      sgiv.formule,
      
      CASE 
        WHEN sgiv.type = 'percentage' THEN AVG(sgiv.value)
        ELSE SUM(sgiv.value)
      END as value,
      
      CASE 
        WHEN sgiv.type = 'percentage' THEN AVG(sgiv.valeur_precedente)
        ELSE SUM(sgiv.valeur_precedente)
      END as valeur_precedente,
      
      CASE 
        WHEN sgiv.type = 'percentage' THEN AVG(sgiv.cible)
        ELSE SUM(sgiv.cible)
      END as cible,
      
      AVG(
        CASE 
          WHEN sgiv.valeur_precedente IS NOT NULL AND sgiv.valeur_precedente != 0 
          THEN ((sgiv.value - sgiv.valeur_precedente) / sgiv.valeur_precedente * 100)
          ELSE NULL 
        END
      )::text as variation,
      
      CASE WHEN sgiv.type = 'percentage' THEN AVG(sgiv.janvier) ELSE SUM(sgiv.janvier) END as janvier,
      CASE WHEN sgiv.type = 'percentage' THEN AVG(sgiv.fevrier) ELSE SUM(sgiv.fevrier) END as fevrier,
      CASE WHEN sgiv.type = 'percentage' THEN AVG(sgiv.mars) ELSE SUM(sgiv.mars) END as mars,
      CASE WHEN sgiv.type = 'percentage' THEN AVG(sgiv.avril) ELSE SUM(sgiv.avril) END as avril,
      CASE WHEN sgiv.type = 'percentage' THEN AVG(sgiv.mai) ELSE SUM(sgiv.mai) END as mai,
      CASE WHEN sgiv.type = 'percentage' THEN AVG(sgiv.juin) ELSE SUM(sgiv.juin) END as juin,
      CASE WHEN sgiv.type = 'percentage' THEN AVG(sgiv.juillet) ELSE SUM(sgiv.juillet) END as juillet,
      CASE WHEN sgiv.type = 'percentage' THEN AVG(sgiv.aout) ELSE SUM(sgiv.aout) END as aout,
      CASE WHEN sgiv.type = 'percentage' THEN AVG(sgiv.septembre) ELSE SUM(sgiv.septembre) END as septembre,
      CASE WHEN sgiv.type = 'percentage' THEN AVG(sgiv.octobre) ELSE SUM(sgiv.octobre) END as octobre,
      CASE WHEN sgiv.type = 'percentage' THEN AVG(sgiv.novembre) ELSE SUM(sgiv.novembre) END as novembre,
      CASE WHEN sgiv.type = 'percentage' THEN AVG(sgiv.decembre) ELSE SUM(sgiv.decembre) END as decembre,
      
      sgiv.organization_name,
      sgiv.filiere_name,
      sgiv.filiale_name,
      
      AVG(sgiv.variations_pourcent) as variations_pourcent,
      AVG(sgiv.performances_pourcent) as performances_pourcent,
      
      AVG(sgiv.perf_janvier) as perf_janvier,
      AVG(sgiv.perf_fevrier) as perf_fevrier,
      AVG(sgiv.perf_mars) as perf_mars,
      AVG(sgiv.perf_avril) as perf_avril,
      AVG(sgiv.perf_mai) as perf_mai,
      AVG(sgiv.perf_juin) as perf_juin,
      AVG(sgiv.perf_juillet) as perf_juillet,
      AVG(sgiv.perf_aout) as perf_aout,
      AVG(sgiv.perf_septembre) as perf_septembre,
      AVG(sgiv.perf_octobre) as perf_octobre,
      AVG(sgiv.perf_novembre) as perf_novembre,
      AVG(sgiv.perf_decembre) as perf_decembre
      
    FROM site_global_indicator_values_simple sgiv
    WHERE sgiv.organization_name = affected_org
      AND sgiv.year = affected_year
      AND sgiv.code = affected_code
      AND COALESCE(sgiv.filiere_name, '') = COALESCE(affected_filiere, '')
      AND COALESCE(sgiv.filiale_name, '') = COALESCE(affected_filiale, '')
    GROUP BY 
      sgiv.organization_name,
      sgiv.filiere_name,
      sgiv.filiale_name,
      sgiv.year,
      sgiv.code,
      sgiv.axe_energetique,
      sgiv.enjeux,
      sgiv.normes,
      sgiv.critere,
      sgiv.indicateur,
      sgiv.definition,
      sgiv.processus,
      sgiv.processus_code,
      sgiv.frequence,
      sgiv.unite,
      sgiv.type,
      sgiv.formule;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Supprimer l'ancien trigger s'il existe
DROP TRIGGER IF EXISTS trigger_auto_consolidate_sites ON site_global_indicator_values_simple;

-- Créer le nouveau trigger pour synchronisation automatique
CREATE TRIGGER trigger_auto_consolidate_sites_updated
  AFTER INSERT OR UPDATE OR DELETE ON site_global_indicator_values_simple
  FOR EACH ROW
  EXECUTE FUNCTION trigger_auto_sync_site_consolidation();

-- Ajouter des index pour optimiser les performances de consolidation
CREATE INDEX IF NOT EXISTS idx_site_consolidation_lookup_optimized 
ON site_consolidation (organization_name, filiere_name, filiale_name, year, code);

CREATE INDEX IF NOT EXISTS idx_site_consolidation_hierarchy 
ON site_consolidation (organization_name, filiere_name, filiale_name);

CREATE INDEX IF NOT EXISTS idx_site_global_simple_consolidation_lookup 
ON site_global_indicator_values_simple (organization_name, filiere_name, filiale_name, year, code);

-- Exécuter la consolidation initiale
SELECT consolidate_site_data();

-- Afficher un résumé des données consolidées
DO $$
DECLARE
  total_sites integer;
  total_consolidated integer;
  organizations_count integer;
BEGIN
  SELECT COUNT(DISTINCT site_name) INTO total_sites 
  FROM site_global_indicator_values_simple;
  
  SELECT COUNT(*) INTO total_consolidated 
  FROM site_consolidation;
  
  SELECT COUNT(DISTINCT organization_name) INTO organizations_count 
  FROM site_consolidation;
  
  RAISE NOTICE '=== RÉSUMÉ DE LA CONSOLIDATION ===';
  RAISE NOTICE 'Sites sources: %', total_sites;
  RAISE NOTICE 'Lignes consolidées: %', total_consolidated;
  RAISE NOTICE 'Organisations: %', organizations_count;
  RAISE NOTICE 'Synchronisation automatique activée';
END;
$$;