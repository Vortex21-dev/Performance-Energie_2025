/*
  # Calcul automatique des performances mensuelles

  1. Fonctions
    - Fonction pour calculer les performances mensuelles par rapport aux cibles
    - Gestion des valeurs nulles et division par zéro

  2. Triggers
    - Triggers sur filiere_consolide pour calculer perf_janvier à perf_decembre
    - Triggers sur consolide_site pour calculer perf_janvier à perf_decembre  
    - Triggers sur filaires_consolide pour calculer perf_janvier à perf_decembre

  3. Mise à jour des données existantes
    - Recalcul de toutes les performances mensuelles existantes
*/

-- Fonction pour calculer les performances mensuelles
CREATE OR REPLACE FUNCTION calculate_monthly_performances()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculer les performances mensuelles seulement si cible > 0
  IF NEW.cible IS NOT NULL AND NEW.cible > 0 THEN
    -- Janvier
    NEW.perf_janvier = CASE 
      WHEN NEW.janvier IS NOT NULL THEN ROUND((NEW.janvier / NEW.cible) * 100, 2)
      ELSE NULL 
    END;
    
    -- Février
    NEW.perf_fevrier = CASE 
      WHEN NEW.fevrier IS NOT NULL THEN ROUND((NEW.fevrier / NEW.cible) * 100, 2)
      ELSE NULL 
    END;
    
    -- Mars
    NEW.perf_mars = CASE 
      WHEN NEW.mars IS NOT NULL THEN ROUND((NEW.mars / NEW.cible) * 100, 2)
      ELSE NULL 
    END;
    
    -- Avril
    NEW.perf_avril = CASE 
      WHEN NEW.avril IS NOT NULL THEN ROUND((NEW.avril / NEW.cible) * 100, 2)
      ELSE NULL 
    END;
    
    -- Mai
    NEW.perf_mai = CASE 
      WHEN NEW.mai IS NOT NULL THEN ROUND((NEW.mai / NEW.cible) * 100, 2)
      ELSE NULL 
    END;
    
    -- Juin
    NEW.perf_juin = CASE 
      WHEN NEW.juin IS NOT NULL THEN ROUND((NEW.juin / NEW.cible) * 100, 2)
      ELSE NULL 
    END;
    
    -- Juillet
    NEW.perf_juillet = CASE 
      WHEN NEW.juillet IS NOT NULL THEN ROUND((NEW.juillet / NEW.cible) * 100, 2)
      ELSE NULL 
    END;
    
    -- Août
    NEW.perf_aout = CASE 
      WHEN NEW.aout IS NOT NULL THEN ROUND((NEW.aout / NEW.cible) * 100, 2)
      ELSE NULL 
    END;
    
    -- Septembre
    NEW.perf_septembre = CASE 
      WHEN NEW.septembre IS NOT NULL THEN ROUND((NEW.septembre / NEW.cible) * 100, 2)
      ELSE NULL 
    END;
    
    -- Octobre
    NEW.perf_octobre = CASE 
      WHEN NEW.octobre IS NOT NULL THEN ROUND((NEW.octobre / NEW.cible) * 100, 2)
      ELSE NULL 
    END;
    
    -- Novembre
    NEW.perf_novembre = CASE 
      WHEN NEW.novembre IS NOT NULL THEN ROUND((NEW.novembre / NEW.cible) * 100, 2)
      ELSE NULL 
    END;
    
    -- Décembre
    NEW.perf_decembre = CASE 
      WHEN NEW.decembre IS NOT NULL THEN ROUND((NEW.decembre / NEW.cible) * 100, 2)
      ELSE NULL 
    END;
  ELSE
    -- Si pas de cible, mettre les performances à NULL
    NEW.perf_janvier = NULL;
    NEW.perf_fevrier = NULL;
    NEW.perf_mars = NULL;
    NEW.perf_avril = NULL;
    NEW.perf_mai = NULL;
    NEW.perf_juin = NULL;
    NEW.perf_juillet = NULL;
    NEW.perf_aout = NULL;
    NEW.perf_septembre = NULL;
    NEW.perf_octobre = NULL;
    NEW.perf_novembre = NULL;
    NEW.perf_decembre = NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ajouter les triggers pour filiere_consolide
DROP TRIGGER IF EXISTS trigger_calculate_monthly_performances_filiere ON filiere_consolide;
CREATE TRIGGER trigger_calculate_monthly_performances_filiere
  BEFORE INSERT OR UPDATE OF janvier, fevrier, mars, avril, mai, juin, juillet, aout, septembre, octobre, novembre, decembre, cible
  ON filiere_consolide
  FOR EACH ROW
  EXECUTE FUNCTION calculate_monthly_performances();

-- Ajouter les triggers pour consolide_site
DROP TRIGGER IF EXISTS trigger_calculate_monthly_performances_site ON consolide_site;
CREATE TRIGGER trigger_calculate_monthly_performances_site
  BEFORE INSERT OR UPDATE OF janvier, fevrier, mars, avril, mai, juin, juillet, aout, septembre, octobre, novembre, decembre, cible
  ON consolide_site
  FOR EACH ROW
  EXECUTE FUNCTION calculate_monthly_performances();

-- Ajouter les triggers pour filaires_consolide
DROP TRIGGER IF EXISTS trigger_calculate_monthly_performances_filaires ON filaires_consolide;
CREATE TRIGGER trigger_calculate_monthly_performances_filaires
  BEFORE INSERT OR UPDATE OF janvier, fevrier, mars, avril, mai, juin, juillet, aout, septembre, octobre, novembre, decembre, cible
  ON filaires_consolide
  FOR EACH ROW
  EXECUTE FUNCTION calculate_monthly_performances();

-- Mettre à jour les données existantes dans filiere_consolide
UPDATE filiere_consolide 
SET 
  perf_janvier = CASE 
    WHEN cible IS NOT NULL AND cible > 0 AND janvier IS NOT NULL 
    THEN ROUND((janvier / cible) * 100, 2)
    ELSE NULL 
  END,
  perf_fevrier = CASE 
    WHEN cible IS NOT NULL AND cible > 0 AND fevrier IS NOT NULL 
    THEN ROUND((fevrier / cible) * 100, 2)
    ELSE NULL 
  END,
  perf_mars = CASE 
    WHEN cible IS NOT NULL AND cible > 0 AND mars IS NOT NULL 
    THEN ROUND((mars / cible) * 100, 2)
    ELSE NULL 
  END,
  perf_avril = CASE 
    WHEN cible IS NOT NULL AND cible > 0 AND avril IS NOT NULL 
    THEN ROUND((avril / cible) * 100, 2)
    ELSE NULL 
  END,
  perf_mai = CASE 
    WHEN cible IS NOT NULL AND cible > 0 AND mai IS NOT NULL 
    THEN ROUND((mai / cible) * 100, 2)
    ELSE NULL 
  END,
  perf_juin = CASE 
    WHEN cible IS NOT NULL AND cible > 0 AND juin IS NOT NULL 
    THEN ROUND((juin / cible) * 100, 2)
    ELSE NULL 
  END,
  perf_juillet = CASE 
    WHEN cible IS NOT NULL AND cible > 0 AND juillet IS NOT NULL 
    THEN ROUND((juillet / cible) * 100, 2)
    ELSE NULL 
  END,
  perf_aout = CASE 
    WHEN cible IS NOT NULL AND cible > 0 AND aout IS NOT NULL 
    THEN ROUND((aout / cible) * 100, 2)
    ELSE NULL 
  END,
  perf_septembre = CASE 
    WHEN cible IS NOT NULL AND cible > 0 AND septembre IS NOT NULL 
    THEN ROUND((septembre / cible) * 100, 2)
    ELSE NULL 
  END,
  perf_octobre = CASE 
    WHEN cible IS NOT NULL AND cible > 0 AND octobre IS NOT NULL 
    THEN ROUND((octobre / cible) * 100, 2)
    ELSE NULL 
  END,
  perf_novembre = CASE 
    WHEN cible IS NOT NULL AND cible > 0 AND novembre IS NOT NULL 
    THEN ROUND((novembre / cible) * 100, 2)
    ELSE NULL 
  END,
  perf_decembre = CASE 
    WHEN cible IS NOT NULL AND cible > 0 AND decembre IS NOT NULL 
    THEN ROUND((decembre / cible) * 100, 2)
    ELSE NULL 
  END
WHERE cible IS NOT NULL AND cible > 0;

-- Mettre à jour les données existantes dans consolide_site
UPDATE consolide_site 
SET 
  perf_janvier = CASE 
    WHEN cible IS NOT NULL AND cible > 0 AND janvier IS NOT NULL 
    THEN ROUND((janvier / cible) * 100, 2)
    ELSE NULL 
  END,
  perf_fevrier = CASE 
    WHEN cible IS NOT NULL AND cible > 0 AND fevrier IS NOT NULL 
    THEN ROUND((fevrier / cible) * 100, 2)
    ELSE NULL 
  END,
  perf_mars = CASE 
    WHEN cible IS NOT NULL AND cible > 0 AND mars IS NOT NULL 
    THEN ROUND((mars / cible) * 100, 2)
    ELSE NULL 
  END,
  perf_avril = CASE 
    WHEN cible IS NOT NULL AND cible > 0 AND avril IS NOT NULL 
    THEN ROUND((avril / cible) * 100, 2)
    ELSE NULL 
  END,
  perf_mai = CASE 
    WHEN cible IS NOT NULL AND cible > 0 AND mai IS NOT NULL 
    THEN ROUND((mai / cible) * 100, 2)
    ELSE NULL 
  END,
  perf_juin = CASE 
    WHEN cible IS NOT NULL AND cible > 0 AND juin IS NOT NULL 
    THEN ROUND((juin / cible) * 100, 2)
    ELSE NULL 
  END,
  perf_juillet = CASE 
    WHEN cible IS NOT NULL AND cible > 0 AND juillet IS NOT NULL 
    THEN ROUND((juillet / cible) * 100, 2)
    ELSE NULL 
  END,
  perf_aout = CASE 
    WHEN cible IS NOT NULL AND cible > 0 AND aout IS NOT NULL 
    THEN ROUND((aout / cible) * 100, 2)
    ELSE NULL 
  END,
  perf_septembre = CASE 
    WHEN cible IS NOT NULL AND cible > 0 AND septembre IS NOT NULL 
    THEN ROUND((septembre / cible) * 100, 2)
    ELSE NULL 
  END,
  perf_octobre = CASE 
    WHEN cible IS NOT NULL AND cible > 0 AND octobre IS NOT NULL 
    THEN ROUND((octobre / cible) * 100, 2)
    ELSE NULL 
  END,
  perf_novembre = CASE 
    WHEN cible IS NOT NULL AND cible > 0 AND novembre IS NOT NULL 
    THEN ROUND((novembre / cible) * 100, 2)
    ELSE NULL 
  END,
  perf_decembre = CASE 
    WHEN cible IS NOT NULL AND cible > 0 AND decembre IS NOT NULL 
    THEN ROUND((decembre / cible) * 100, 2)
    ELSE NULL 
  END
WHERE cible IS NOT NULL AND cible > 0;

-- Mettre à jour les données existantes dans filaires_consolide
UPDATE filaires_consolide 
SET 
  perf_janvier = CASE 
    WHEN cible IS NOT NULL AND cible > 0 AND janvier IS NOT NULL 
    THEN ROUND((janvier / cible) * 100, 2)
    ELSE NULL 
  END,
  perf_fevrier = CASE 
    WHEN cible IS NOT NULL AND cible > 0 AND fevrier IS NOT NULL 
    THEN ROUND((fevrier / cible) * 100, 2)
    ELSE NULL 
  END,
  perf_mars = CASE 
    WHEN cible IS NOT NULL AND cible > 0 AND mars IS NOT NULL 
    THEN ROUND((mars / cible) * 100, 2)
    ELSE NULL 
  END,
  perf_avril = CASE 
    WHEN cible IS NOT NULL AND cible > 0 AND avril IS NOT NULL 
    THEN ROUND((avril / cible) * 100, 2)
    ELSE NULL 
  END,
  perf_mai = CASE 
    WHEN cible IS NOT NULL AND cible > 0 AND mai IS NOT NULL 
    THEN ROUND((mai / cible) * 100, 2)
    ELSE NULL 
  END,
  perf_juin = CASE 
    WHEN cible IS NOT NULL AND cible > 0 AND juin IS NOT NULL 
    THEN ROUND((juin / cible) * 100, 2)
    ELSE NULL 
  END,
  perf_juillet = CASE 
    WHEN cible IS NOT NULL AND cible > 0 AND juillet IS NOT NULL 
    THEN ROUND((juillet / cible) * 100, 2)
    ELSE NULL 
  END,
  perf_aout = CASE 
    WHEN cible IS NOT NULL AND cible > 0 AND aout IS NOT NULL 
    THEN ROUND((aout / cible) * 100, 2)
    ELSE NULL 
  END,
  perf_septembre = CASE 
    WHEN cible IS NOT NULL AND cible > 0 AND septembre IS NOT NULL 
    THEN ROUND((septembre / cible) * 100, 2)
    ELSE NULL 
  END,
  perf_octobre = CASE 
    WHEN cible IS NOT NULL AND cible > 0 AND octobre IS NOT NULL 
    THEN ROUND((octobre / cible) * 100, 2)
    ELSE NULL 
  END,
  perf_novembre = CASE 
    WHEN cible IS NOT NULL AND cible > 0 AND novembre IS NOT NULL 
    THEN ROUND((novembre / cible) * 100, 2)
    ELSE NULL 
  END,
  perf_decembre = CASE 
    WHEN cible IS NOT NULL AND cible > 0 AND decembre IS NOT NULL 
    THEN ROUND((decembre / cible) * 100, 2)
    ELSE NULL 
  END
WHERE cible IS NOT NULL AND cible > 0;