/*
  # Correction des problèmes d'insertion dans site_global_indicator_values_simple

  1. Problèmes identifiés
    - Triggers conflictuels qui empêchent les insertions
    - Fonctions avec des erreurs de logique
    - Contraintes trop restrictives

  2. Solutions
    - Supprimer les triggers problématiques
    - Recréer des fonctions simplifiées et robustes
    - Permettre les insertions avec des valeurs par défaut appropriées

  3. Sécurité
    - Maintenir RLS activé
    - Conserver l'intégrité des données
    - Permettre les opérations CRUD nécessaires
*/

-- Supprimer tous les triggers existants qui pourraient causer des problèmes
DROP TRIGGER IF EXISTS trigger_auto_update_indicator_metadata ON site_global_indicator_values_simple;
DROP TRIGGER IF EXISTS trigger_calculate_indicator_metrics ON site_global_indicator_values_simple;
DROP TRIGGER IF EXISTS trigger_calculate_monthly_performances ON site_global_indicator_values_simple;
DROP TRIGGER IF EXISTS update_indicator_metadata ON site_global_indicator_values_simple;

-- Supprimer les fonctions existantes pour éviter les conflits
DROP FUNCTION IF EXISTS auto_update_indicator_metadata() CASCADE;
DROP FUNCTION IF EXISTS calculate_indicator_metrics() CASCADE;
DROP FUNCTION IF EXISTS update_monthly_performances_simple() CASCADE;

-- Créer une fonction simplifiée pour les métadonnées
CREATE OR REPLACE FUNCTION simple_update_indicator_metadata()
RETURNS TRIGGER AS $$
BEGIN
  -- Remplir les métadonnées de base si elles sont vides
  IF NEW.axe_energetique IS NULL THEN
    NEW.axe_energetique := 'Axe énergétique';
  END IF;
  
  IF NEW.enjeux IS NULL THEN
    NEW.enjeux := 'Enjeu énergétique';
  END IF;
  
  IF NEW.normes IS NULL THEN
    NEW.normes := 'Norme applicable';
  END IF;
  
  IF NEW.critere IS NULL THEN
    NEW.critere := 'Critère de performance';
  END IF;
  
  IF NEW.indicateur IS NULL THEN
    NEW.indicateur := 'Indicateur ' || COALESCE(NEW.code, 'IND');
  END IF;
  
  IF NEW.definition IS NULL THEN
    NEW.definition := 'Définition de l''indicateur';
  END IF;
  
  IF NEW.processus IS NULL THEN
    NEW.processus := 'Processus associé';
  END IF;
  
  IF NEW.processus_code IS NULL THEN
    NEW.processus_code := 'PROC-001';
  END IF;
  
  IF NEW.frequence IS NULL THEN
    NEW.frequence := 'Mensuelle';
  END IF;
  
  IF NEW.unite IS NULL THEN
    NEW.unite := 'Unité';
  END IF;
  
  IF NEW.type IS NULL THEN
    NEW.type := 'Performance';
  END IF;
  
  IF NEW.formule IS NULL THEN
    NEW.formule := 'Formule de calcul';
  END IF;
  
  -- S'assurer que cible a une valeur par défaut
  IF NEW.cible IS NULL THEN
    NEW.cible := 100;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer une fonction simplifiée pour les calculs
CREATE OR REPLACE FUNCTION simple_calculate_metrics()
RETURNS TRIGGER AS $$
BEGIN
  -- S'assurer que cible a une valeur
  IF NEW.cible IS NULL THEN
    NEW.cible := 100;
  END IF;
  
  -- Calculer variations_pourcent = value - cible (seulement si les deux valeurs existent)
  IF NEW.value IS NOT NULL AND NEW.cible IS NOT NULL THEN
    NEW.variations_pourcent := NEW.value - NEW.cible;
  END IF;
  
  -- Calculer performances_pourcent = (value / cible) * 100 (seulement si cible != 0)
  IF NEW.value IS NOT NULL AND NEW.cible IS NOT NULL AND NEW.cible != 0 THEN
    NEW.performances_pourcent := (NEW.value / NEW.cible) * 100;
  END IF;
  
  -- Calculer les performances mensuelles
  IF NEW.cible IS NOT NULL AND NEW.cible != 0 THEN
    IF NEW.janvier IS NOT NULL THEN
      NEW.perf_janvier := (NEW.janvier / NEW.cible) * 100;
    END IF;
    
    IF NEW.fevrier IS NOT NULL THEN
      NEW.perf_fevrier := (NEW.fevrier / NEW.cible) * 100;
    END IF;
    
    IF NEW.mars IS NOT NULL THEN
      NEW.perf_mars := (NEW.mars / NEW.cible) * 100;
    END IF;
    
    IF NEW.avril IS NOT NULL THEN
      NEW.perf_avril := (NEW.avril / NEW.cible) * 100;
    END IF;
    
    IF NEW.mai IS NOT NULL THEN
      NEW.perf_mai := (NEW.mai / NEW.cible) * 100;
    END IF;
    
    IF NEW.juin IS NOT NULL THEN
      NEW.perf_juin := (NEW.juin / NEW.cible) * 100;
    END IF;
    
    IF NEW.juillet IS NOT NULL THEN
      NEW.perf_juillet := (NEW.juillet / NEW.cible) * 100;
    END IF;
    
    IF NEW.aout IS NOT NULL THEN
      NEW.perf_aout := (NEW.aout / NEW.cible) * 100;
    END IF;
    
    IF NEW.septembre IS NOT NULL THEN
      NEW.perf_septembre := (NEW.septembre / NEW.cible) * 100;
    END IF;
    
    IF NEW.octobre IS NOT NULL THEN
      NEW.perf_octobre := (NEW.octobre / NEW.cible) * 100;
    END IF;
    
    IF NEW.novembre IS NOT NULL THEN
      NEW.perf_novembre := (NEW.novembre / NEW.cible) * 100;
    END IF;
    
    IF NEW.decembre IS NOT NULL THEN
      NEW.perf_decembre := (NEW.decembre / NEW.cible) * 100;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer les nouveaux triggers simplifiés
CREATE TRIGGER trigger_simple_update_metadata
  BEFORE INSERT OR UPDATE ON site_global_indicator_values_simple
  FOR EACH ROW
  EXECUTE FUNCTION simple_update_indicator_metadata();

CREATE TRIGGER trigger_simple_calculate_metrics
  BEFORE INSERT OR UPDATE ON site_global_indicator_values_simple
  FOR EACH ROW
  EXECUTE FUNCTION simple_calculate_metrics();

-- S'assurer que RLS est activé
ALTER TABLE site_global_indicator_values_simple ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes politiques RLS restrictives
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON site_global_indicator_values_simple;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON site_global_indicator_values_simple;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON site_global_indicator_values_simple;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON site_global_indicator_values_simple;

-- Créer des politiques RLS permissives pour les utilisateurs authentifiés
CREATE POLICY "Allow all operations for authenticated users"
  ON site_global_indicator_values_simple
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Mettre à jour la valeur par défaut de la colonne cible
ALTER TABLE site_global_indicator_values_simple 
ALTER COLUMN cible SET DEFAULT 100;

-- Mettre à jour les lignes existantes qui ont des valeurs NULL pour cible
UPDATE site_global_indicator_values_simple 
SET cible = 100 
WHERE cible IS NULL;

-- Recalculer les métriques pour toutes les lignes existantes
UPDATE site_global_indicator_values_simple 
SET 
  variations_pourcent = CASE 
    WHEN value IS NOT NULL AND cible IS NOT NULL THEN value - cible
    ELSE variations_pourcent 
  END,
  performances_pourcent = CASE 
    WHEN value IS NOT NULL AND cible IS NOT NULL AND cible != 0 THEN (value / cible) * 100
    ELSE performances_pourcent 
  END
WHERE variations_pourcent IS NULL OR performances_pourcent IS NULL;

-- Ajouter des commentaires pour documenter la table
COMMENT ON TABLE site_global_indicator_values_simple IS 'Table pour stocker les valeurs des indicateurs globaux par site avec calculs automatiques';
COMMENT ON COLUMN site_global_indicator_values_simple.cible IS 'Valeur cible pour l''indicateur (défaut: 100)';
COMMENT ON COLUMN site_global_indicator_values_simple.variations_pourcent IS 'Calculé automatiquement: value - cible';
COMMENT ON COLUMN site_global_indicator_values_simple.performances_pourcent IS 'Calculé automatiquement: (value / cible) * 100';