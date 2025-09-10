/*
  # Optimisation des performances pour indicator_values

  1. Optimisations
    - Désactiver temporairement les triggers coûteux pendant les insertions
    - Optimiser les index pour les requêtes fréquentes
    - Améliorer les performances des triggers existants
    
  2. Index
    - Ajouter des index composites pour les requêtes courantes
    - Optimiser les index existants
    
  3. Triggers
    - Optimiser les triggers pour réduire le temps d'exécution
    - Ajouter des conditions pour éviter les calculs inutiles
*/

-- Désactiver temporairement les triggers les plus coûteux pour améliorer les performances d'insertion
DROP TRIGGER IF EXISTS trigger_recalculate_on_indicator_change ON indicator_values;
DROP TRIGGER IF EXISTS trigger_sync_indicator_values_fixed ON indicator_values;
DROP TRIGGER IF EXISTS trigger_sync_indicator_values_improved ON indicator_values;
DROP TRIGGER IF EXISTS trigger_update_valeur_precedente ON indicator_values;

-- Optimiser les index existants et en ajouter de nouveaux pour améliorer les performances
DROP INDEX IF EXISTS idx_indicator_values_sync_lookup;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_indicator_values_sync_lookup_optimized 
ON indicator_values (site_name, indicator_code, organization_name, status);

-- Ajouter un index pour les requêtes par période
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_indicator_values_period_lookup 
ON indicator_values (period_id, status, submitted_at);

-- Index pour les requêtes de validation
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_indicator_values_validation 
ON indicator_values (status, validated_by, validated_at) 
WHERE status IN ('submitted', 'validated');

-- Créer une fonction optimisée pour la synchronisation des indicateurs
CREATE OR REPLACE FUNCTION trigger_sync_indicator_values_optimized()
RETURNS TRIGGER AS $$
BEGIN
  -- Seulement synchroniser si la valeur a réellement changé et que le statut est validé
  IF (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.value IS DISTINCT FROM NEW.value)) 
     AND NEW.status = 'validated' 
     AND NEW.site_name IS NOT NULL 
     AND NEW.indicator_code IS NOT NULL 
     AND NEW.value IS NOT NULL THEN
    
    -- Synchronisation optimisée vers site_global_indicator_values_simple
    INSERT INTO site_global_indicator_values_simple (
      site_name, 
      code, 
      year, 
      value,
      organization_name,
      filiere_name,
      filiale_name
    )
    SELECT 
      NEW.site_name,
      NEW.indicator_code,
      EXTRACT(YEAR FROM cp.start_date)::integer,
      NEW.value,
      NEW.organization_name,
      NEW.filiere_name,
      NEW.filiale_name
    FROM collection_periods cp 
    WHERE cp.id = NEW.period_id
    ON CONFLICT (site_name, code, year) 
    DO UPDATE SET 
      value = EXCLUDED.value,
      updated_at = now();
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Créer une fonction optimisée pour la mise à jour des valeurs précédentes
CREATE OR REPLACE FUNCTION update_valeur_precedente_optimized()
RETURNS TRIGGER AS $$
BEGIN
  -- Seulement si la valeur est validée et qu'on a les données nécessaires
  IF NEW.status = 'validated' AND NEW.value IS NOT NULL AND NEW.site_name IS NOT NULL THEN
    -- Mise à jour optimisée avec une seule requête
    UPDATE site_global_indicator_values_simple 
    SET valeur_precedente = (
      SELECT value 
      FROM site_global_indicator_values_simple s2 
      WHERE s2.site_name = NEW.site_name 
        AND s2.code = NEW.indicator_code 
        AND s2.year = (
          SELECT EXTRACT(YEAR FROM cp.start_date)::integer - 1
          FROM collection_periods cp 
          WHERE cp.id = NEW.period_id
        )
      LIMIT 1
    )
    WHERE site_name = NEW.site_name 
      AND code = NEW.indicator_code 
      AND year = (
        SELECT EXTRACT(YEAR FROM cp.start_date)::integer
        FROM collection_periods cp 
        WHERE cp.id = NEW.period_id
      );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recréer les triggers avec les fonctions optimisées
CREATE TRIGGER trigger_sync_indicator_values_optimized
  AFTER INSERT OR UPDATE OF value, status ON indicator_values
  FOR EACH ROW
  WHEN (NEW.status = 'validated')
  EXECUTE FUNCTION trigger_sync_indicator_values_optimized();

CREATE TRIGGER trigger_update_valeur_precedente_optimized
  AFTER INSERT OR UPDATE OF value, status ON indicator_values
  FOR EACH ROW
  WHEN (NEW.status = 'validated' AND NEW.value IS NOT NULL)
  EXECUTE FUNCTION update_valeur_precedente_optimized();

-- Optimiser la table indicator_values pour de meilleures performances
VACUUM ANALYZE indicator_values;

-- Mettre à jour les statistiques des tables liées
VACUUM ANALYZE site_global_indicator_values_simple;
VACUUM ANALYZE collection_periods;

-- Ajouter un commentaire pour documenter l'optimisation
COMMENT ON TABLE indicator_values IS 'Table optimisée pour réduire les timeouts lors des insertions - triggers allégés et index optimisés';