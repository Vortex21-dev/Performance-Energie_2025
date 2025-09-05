/*
  # Mise à jour de valeur_precedente depuis indicator_values

  1. Fonction de calcul
    - Calcule la somme des valeurs mensuelles pour une année donnée
    - Gestion des valeurs nulles avec COALESCE
    
  2. Mise à jour des données
    - valeur_precedente = somme des 12 mois de l'année précédente
    - variation = pourcentage de variation (type numeric)
    
  3. Recalcul de la table consolidée
    - Moyennes des valeurs précédentes
    - Variation consolidée
*/

-- Fonction pour calculer la somme des valeurs mensuelles
CREATE OR REPLACE FUNCTION calculate_monthly_sum(
  p_indicator_code text,
  p_site_name text,
  p_year integer
) RETURNS numeric AS $$
DECLARE
  monthly_sum numeric := 0;
BEGIN
  SELECT COALESCE(SUM(iv.value), 0)
  INTO monthly_sum
  FROM indicator_values iv
  JOIN collection_periods cp ON iv.period_id = cp.id
  WHERE iv.indicator_code = p_indicator_code
    AND iv.site_name = p_site_name
    AND cp.year = p_year
    AND cp.period_type = 'month';
    
  RETURN monthly_sum;
END;
$$ LANGUAGE plpgsql;

-- Mise à jour de valeur_precedente pour 2025 (depuis 2024)
UPDATE site_global_indicator_values_simple 
SET valeur_precedente = calculate_monthly_sum(code, site_name, year - 1)
WHERE year = 2025;

-- Mise à jour de valeur_precedente pour 2024 (depuis 2023)
UPDATE site_global_indicator_values_simple 
SET valeur_precedente = calculate_monthly_sum(code, site_name, year - 1)
WHERE year = 2024;

-- Recalcul de la variation (type numeric)
UPDATE site_global_indicator_values_simple 
SET variation = CASE 
  WHEN valeur_precedente IS NULL OR valeur_precedente = 0 THEN NULL
  WHEN value IS NULL THEN NULL
  ELSE ROUND(((value - valeur_precedente) / valeur_precedente * 100)::numeric, 2)
END
WHERE valeur_precedente IS NOT NULL;

-- Fonction pour mettre à jour automatiquement valeur_precedente
CREATE OR REPLACE FUNCTION update_valeur_precedente_on_indicator_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Mettre à jour valeur_precedente pour l'année suivante
  UPDATE site_global_indicator_values_simple 
  SET valeur_precedente = calculate_monthly_sum(
    NEW.indicator_code, 
    NEW.site_name, 
    (SELECT year FROM collection_periods WHERE id = NEW.period_id)
  )
  WHERE code = NEW.indicator_code 
    AND site_name = NEW.site_name 
    AND year = (SELECT year + 1 FROM collection_periods WHERE id = NEW.period_id);
    
  -- Recalculer la variation
  UPDATE site_global_indicator_values_simple 
  SET variation = CASE 
    WHEN valeur_precedente IS NULL OR valeur_precedente = 0 THEN NULL
    WHEN value IS NULL THEN NULL
    ELSE ROUND(((value - valeur_precedente) / valeur_precedente * 100)::numeric, 2)
  END
  WHERE code = NEW.indicator_code 
    AND site_name = NEW.site_name 
    AND year = (SELECT year + 1 FROM collection_periods WHERE id = NEW.period_id)
    AND valeur_precedente IS NOT NULL;
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger
DROP TRIGGER IF EXISTS trigger_update_valeur_precedente ON indicator_values;
CREATE TRIGGER trigger_update_valeur_precedente
  AFTER INSERT OR UPDATE OR DELETE ON indicator_values
  FOR EACH ROW
  EXECUTE FUNCTION update_valeur_precedente_on_indicator_change();

-- Recalculer la table consolidée avec les nouvelles moyennes
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
  decembre
)
SELECT 
  s.organization_name,
  s.filiere_name,
  s.filiale_name,
  sgiv.code as indicator_code,
  sgiv.year,
  array_agg(DISTINCT sgiv.site_name) as site_names,
  MAX(sgiv.axe_energetique) as axe_energetique,
  MAX(sgiv.enjeux) as enjeux,
  MAX(sgiv.normes) as normes,
  MAX(sgiv.critere) as critere,
  MAX(sgiv.indicateur) as indicateur,
  MAX(sgiv.definition) as definition,
  MAX(sgiv.processus) as processus,
  MAX(sgiv.processus_code) as processus_code,
  MAX(sgiv.frequence) as frequence,
  MAX(sgiv.unite) as unite,
  MAX(sgiv.type) as type,
  MAX(sgiv.formule) as formule,
  ROUND(AVG(sgiv.value)::numeric, 2) as value,
  ROUND(AVG(sgiv.valeur_precedente)::numeric, 2) as valeur_precedente,
  ROUND(AVG(sgiv.cible)::numeric, 2) as cible,
  CASE 
    WHEN AVG(sgiv.valeur_precedente) IS NULL OR AVG(sgiv.valeur_precedente) = 0 THEN NULL
    WHEN AVG(sgiv.value) IS NULL THEN NULL
    ELSE ROUND(((AVG(sgiv.value) - AVG(sgiv.valeur_precedente)) / AVG(sgiv.valeur_precedente) * 100)::numeric, 2)
  END as variation,
  ROUND(AVG(sgiv.janvier)::numeric, 2) as janvier,
  ROUND(AVG(sgiv.fevrier)::numeric, 2) as fevrier,
  ROUND(AVG(sgiv.mars)::numeric, 2) as mars,
  ROUND(AVG(sgiv.avril)::numeric, 2) as avril,
  ROUND(AVG(sgiv.mai)::numeric, 2) as mai,
  ROUND(AVG(sgiv.juin)::numeric, 2) as juin,
  ROUND(AVG(sgiv.juillet)::numeric, 2) as juillet,
  ROUND(AVG(sgiv.aout)::numeric, 2) as aout,
  ROUND(AVG(sgiv.septembre)::numeric, 2) as septembre,
  ROUND(AVG(sgiv.octobre)::numeric, 2) as octobre,
  ROUND(AVG(sgiv.novembre)::numeric, 2) as novembre,
  ROUND(AVG(sgiv.decembre)::numeric, 2) as decembre
FROM site_global_indicator_values_simple sgiv
JOIN sites s ON sgiv.site_name = s.name
WHERE sgiv.value IS NOT NULL
GROUP BY 
  s.organization_name,
  s.filiere_name,
  s.filiale_name,
  sgiv.code,
  sgiv.year
HAVING COUNT(*) >= 1
ON CONFLICT (organization_name, COALESCE(filiere_name, ''), COALESCE(filiale_name, ''), indicator_code, year)
DO UPDATE SET
  site_names = EXCLUDED.site_names,
  value = EXCLUDED.value,
  valeur_precedente = EXCLUDED.valeur_precedente,
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