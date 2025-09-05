/*
  # Ajouter les colonnes de performance mensuelle

  1. Nouvelles colonnes
    - `perf_janvier` à `perf_decembre` (numeric(10,2))
    - Calcul automatique : (valeur_mois / cible) * 100

  2. Fonction de calcul
    - Calcule la performance pour chaque mois
    - Gère les cas où la cible est nulle ou zéro

  3. Trigger automatique
    - Met à jour les performances lors de modifications des valeurs mensuelles ou de la cible
*/

-- 1. Ajouter les colonnes de performance mensuelle
ALTER TABLE site_global_indicator_values_simple 
ADD COLUMN IF NOT EXISTS perf_janvier numeric(10,2),
ADD COLUMN IF NOT EXISTS perf_fevrier numeric(10,2),
ADD COLUMN IF NOT EXISTS perf_mars numeric(10,2),
ADD COLUMN IF NOT EXISTS perf_avril numeric(10,2),
ADD COLUMN IF NOT EXISTS perf_mai numeric(10,2),
ADD COLUMN IF NOT EXISTS perf_juin numeric(10,2),
ADD COLUMN IF NOT EXISTS perf_juillet numeric(10,2),
ADD COLUMN IF NOT EXISTS perf_aout numeric(10,2),
ADD COLUMN IF NOT EXISTS perf_septembre numeric(10,2),
ADD COLUMN IF NOT EXISTS perf_octobre numeric(10,2),
ADD COLUMN IF NOT EXISTS perf_novembre numeric(10,2),
ADD COLUMN IF NOT EXISTS perf_decembre numeric(10,2);

-- 2. Fonction pour calculer les performances mensuelles
CREATE OR REPLACE FUNCTION calculate_monthly_performances()
RETURNS void AS $$
BEGIN
  UPDATE site_global_indicator_values_simple
  SET 
    perf_janvier = CASE 
      WHEN cible IS NOT NULL AND cible != 0 AND janvier IS NOT NULL 
      THEN ROUND(((janvier / cible) * 100)::numeric, 2)
      ELSE NULL 
    END,
    perf_fevrier = CASE 
      WHEN cible IS NOT NULL AND cible != 0 AND fevrier IS NOT NULL 
      THEN ROUND(((fevrier / cible) * 100)::numeric, 2)
      ELSE NULL 
    END,
    perf_mars = CASE 
      WHEN cible IS NOT NULL AND cible != 0 AND mars IS NOT NULL 
      THEN ROUND(((mars / cible) * 100)::numeric, 2)
      ELSE NULL 
    END,
    perf_avril = CASE 
      WHEN cible IS NOT NULL AND cible != 0 AND avril IS NOT NULL 
      THEN ROUND(((avril / cible) * 100)::numeric, 2)
      ELSE NULL 
    END,
    perf_mai = CASE 
      WHEN cible IS NOT NULL AND cible != 0 AND mai IS NOT NULL 
      THEN ROUND(((mai / cible) * 100)::numeric, 2)
      ELSE NULL 
    END,
    perf_juin = CASE 
      WHEN cible IS NOT NULL AND cible != 0 AND juin IS NOT NULL 
      THEN ROUND(((juin / cible) * 100)::numeric, 2)
      ELSE NULL 
    END,
    perf_juillet = CASE 
      WHEN cible IS NOT NULL AND cible != 0 AND juillet IS NOT NULL 
      THEN ROUND(((juillet / cible) * 100)::numeric, 2)
      ELSE NULL 
    END,
    perf_aout = CASE 
      WHEN cible IS NOT NULL AND cible != 0 AND aout IS NOT NULL 
      THEN ROUND(((aout / cible) * 100)::numeric, 2)
      ELSE NULL 
    END,
    perf_septembre = CASE 
      WHEN cible IS NOT NULL AND cible != 0 AND septembre IS NOT NULL 
      THEN ROUND(((septembre / cible) * 100)::numeric, 2)
      ELSE NULL 
    END,
    perf_octobre = CASE 
      WHEN cible IS NOT NULL AND cible != 0 AND octobre IS NOT NULL 
      THEN ROUND(((octobre / cible) * 100)::numeric, 2)
      ELSE NULL 
    END,
    perf_novembre = CASE 
      WHEN cible IS NOT NULL AND cible != 0 AND novembre IS NOT NULL 
      THEN ROUND(((novembre / cible) * 100)::numeric, 2)
      ELSE NULL 
    END,
    perf_decembre = CASE 
      WHEN cible IS NOT NULL AND cible != 0 AND decembre IS NOT NULL 
      THEN ROUND(((decembre / cible) * 100)::numeric, 2)
      ELSE NULL 
    END;
END;
$$ LANGUAGE plpgsql;

-- 3. Exécuter le calcul initial pour toutes les lignes existantes
SELECT calculate_monthly_performances();

-- 4. Fonction de trigger pour mise à jour automatique
CREATE OR REPLACE FUNCTION update_monthly_performances_trigger()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculer les performances mensuelles pour la ligne modifiée
  NEW.perf_janvier := CASE 
    WHEN NEW.cible IS NOT NULL AND NEW.cible != 0 AND NEW.janvier IS NOT NULL 
    THEN ROUND(((NEW.janvier / NEW.cible) * 100)::numeric, 2)
    ELSE NULL 
  END;

  NEW.perf_fevrier := CASE 
    WHEN NEW.cible IS NOT NULL AND NEW.cible != 0 AND NEW.fevrier IS NOT NULL 
    THEN ROUND(((NEW.fevrier / NEW.cible) * 100)::numeric, 2)
    ELSE NULL 
  END;

  NEW.perf_mars := CASE 
    WHEN NEW.cible IS NOT NULL AND NEW.cible != 0 AND NEW.mars IS NOT NULL 
    THEN ROUND(((NEW.mars / NEW.cible) * 100)::numeric, 2)
    ELSE NULL 
  END;

  NEW.perf_avril := CASE 
    WHEN NEW.cible IS NOT NULL AND NEW.cible != 0 AND NEW.avril IS NOT NULL 
    THEN ROUND(((NEW.avril / NEW.cible) * 100)::numeric, 2)
    ELSE NULL 
  END;

  NEW.perf_mai := CASE 
    WHEN NEW.cible IS NOT NULL AND NEW.cible != 0 AND NEW.mai IS NOT NULL 
    THEN ROUND(((NEW.mai / NEW.cible) * 100)::numeric, 2)
    ELSE NULL 
  END;

  NEW.perf_juin := CASE 
    WHEN NEW.cible IS NOT NULL AND NEW.cible != 0 AND NEW.juin IS NOT NULL 
    THEN ROUND(((NEW.juin / NEW.cible) * 100)::numeric, 2)
    ELSE NULL 
  END;

  NEW.perf_juillet := CASE 
    WHEN NEW.cible IS NOT NULL AND NEW.cible != 0 AND NEW.juillet IS NOT NULL 
    THEN ROUND(((NEW.juillet / NEW.cible) * 100)::numeric, 2)
    ELSE NULL 
  END;

  NEW.perf_aout := CASE 
    WHEN NEW.cible IS NOT NULL AND NEW.cible != 0 AND NEW.aout IS NOT NULL 
    THEN ROUND(((NEW.aout / NEW.cible) * 100)::numeric, 2)
    ELSE NULL 
  END;

  NEW.perf_septembre := CASE 
    WHEN NEW.cible IS NOT NULL AND NEW.cible != 0 AND NEW.septembre IS NOT NULL 
    THEN ROUND(((NEW.septembre / NEW.cible) * 100)::numeric, 2)
    ELSE NULL 
  END;

  NEW.perf_octobre := CASE 
    WHEN NEW.cible IS NOT NULL AND NEW.cible != 0 AND NEW.octobre IS NOT NULL 
    THEN ROUND(((NEW.octobre / NEW.cible) * 100)::numeric, 2)
    ELSE NULL 
  END;

  NEW.perf_novembre := CASE 
    WHEN NEW.cible IS NOT NULL AND NEW.cible != 0 AND NEW.novembre IS NOT NULL 
    THEN ROUND(((NEW.novembre / NEW.cible) * 100)::numeric, 2)
    ELSE NULL 
  END;

  NEW.perf_decembre := CASE 
    WHEN NEW.cible IS NOT NULL AND NEW.cible != 0 AND NEW.decembre IS NOT NULL 
    THEN ROUND(((NEW.decembre / NEW.cible) * 100)::numeric, 2)
    ELSE NULL 
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Créer le trigger pour mise à jour automatique
DROP TRIGGER IF EXISTS trigger_update_monthly_performances ON site_global_indicator_values_simple;

CREATE TRIGGER trigger_update_monthly_performances
BEFORE INSERT OR UPDATE OF janvier, fevrier, mars, avril, mai, juin, juillet, aout, septembre, octobre, novembre, decembre, cible
ON site_global_indicator_values_simple
FOR EACH ROW
EXECUTE FUNCTION update_monthly_performances_trigger();

-- 6. Mettre à jour la table consolidated_global_indicator_values avec les nouvelles colonnes
ALTER TABLE consolidated_global_indicator_values 
ADD COLUMN IF NOT EXISTS perf_janvier numeric(10,2),
ADD COLUMN IF NOT EXISTS perf_fevrier numeric(10,2),
ADD COLUMN IF NOT EXISTS perf_mars numeric(10,2),
ADD COLUMN IF NOT EXISTS perf_avril numeric(10,2),
ADD COLUMN IF NOT EXISTS perf_mai numeric(10,2),
ADD COLUMN IF NOT EXISTS perf_juin numeric(10,2),
ADD COLUMN IF NOT EXISTS perf_juillet numeric(10,2),
ADD COLUMN IF NOT EXISTS perf_aout numeric(10,2),
ADD COLUMN IF NOT EXISTS perf_septembre numeric(10,2),
ADD COLUMN IF NOT EXISTS perf_octobre numeric(10,2),
ADD COLUMN IF NOT EXISTS perf_novembre numeric(10,2),
ADD COLUMN IF NOT EXISTS perf_decembre numeric(10,2);

-- 7. Mettre à jour la fonction de consolidation pour inclure les performances mensuelles
CREATE OR REPLACE FUNCTION update_consolidated_indicators_with_monthly_performances()
RETURNS void AS $$
BEGIN
  DELETE FROM consolidated_global_indicator_values;

  INSERT INTO consolidated_global_indicator_values (
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
    variations_pourcent,
    performances_pourcent,
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
    s.organization_name,
    s.filiere_name,
    s.filiale_name,
    s.code as indicator_code,
    s.year,
    array_agg(DISTINCT s.site_name ORDER BY s.site_name) as site_names,
    s.axe_energetique,
    s.enjeux,
    s.normes,
    s.critere,
    s.indicateur,
    s.definition,
    s.processus,
    s.processus_code,
    s.frequence,
    s.unite,
    s.type,
    s.formule,
    ROUND(AVG(s.value)::numeric, 2),
    ROUND(AVG(s.valeur_precedente)::numeric, 2),
    ROUND(AVG(s.cible)::numeric, 2),
    ROUND(AVG(s.variations_pourcent)::numeric, 2),
    ROUND(AVG(s.performances_pourcent)::numeric, 2),
    ROUND(AVG(s.janvier)::numeric, 2),
    ROUND(AVG(s.fevrier)::numeric, 2),
    ROUND(AVG(s.mars)::numeric, 2),
    ROUND(AVG(s.avril)::numeric, 2),
    ROUND(AVG(s.mai)::numeric, 2),
    ROUND(AVG(s.juin)::numeric, 2),
    ROUND(AVG(s.juillet)::numeric, 2),
    ROUND(AVG(s.aout)::numeric, 2),
    ROUND(AVG(s.septembre)::numeric, 2),
    ROUND(AVG(s.octobre)::numeric, 2),
    ROUND(AVG(s.novembre)::numeric, 2),
    ROUND(AVG(s.decembre)::numeric, 2),
    ROUND(AVG(s.perf_janvier)::numeric, 2),
    ROUND(AVG(s.perf_fevrier)::numeric, 2),
    ROUND(AVG(s.perf_mars)::numeric, 2),
    ROUND(AVG(s.perf_avril)::numeric, 2),
    ROUND(AVG(s.perf_mai)::numeric, 2),
    ROUND(AVG(s.perf_juin)::numeric, 2),
    ROUND(AVG(s.perf_juillet)::numeric, 2),
    ROUND(AVG(s.perf_aout)::numeric, 2),
    ROUND(AVG(s.perf_septembre)::numeric, 2),
    ROUND(AVG(s.perf_octobre)::numeric, 2),
    ROUND(AVG(s.perf_novembre)::numeric, 2),
    ROUND(AVG(s.perf_decembre)::numeric, 2)
  FROM site_global_indicator_values_simple s
  WHERE s.organization_name IS NOT NULL
  GROUP BY 
    s.organization_name,
    s.filiere_name,
    s.filiale_name,
    s.code,
    s.year,
    s.axe_energetique,
    s.enjeux,
    s.normes,
    s.critere,
    s.indicateur,
    s.definition,
    s.processus,
    s.processus_code,
    s.frequence,
    s.unite,
    s.type,
    s.formule;
END;
$$ LANGUAGE plpgsql;

-- 8. Exécuter la consolidation avec les nouvelles colonnes
SELECT update_consolidated_indicators_with_monthly_performances();

-- 9. Mettre à jour le trigger de consolidation automatique
CREATE OR REPLACE FUNCTION update_consolidated_indicators_with_performances()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM update_consolidated_indicators_with_monthly_performances();
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 10. Recréer le trigger pour inclure les nouvelles colonnes
DROP TRIGGER IF EXISTS trg_auto_consolidate_performances ON site_global_indicator_values_simple;

CREATE TRIGGER trg_auto_consolidate_performances
AFTER INSERT OR UPDATE OF value, cible, janvier, fevrier, mars, avril, mai, juin, juillet, aout, septembre, octobre, novembre, decembre
ON site_global_indicator_values_simple
FOR EACH STATEMENT
EXECUTE FUNCTION update_consolidated_indicators_with_performances();