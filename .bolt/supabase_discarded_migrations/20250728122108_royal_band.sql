/*
  # Correction des calculs pour la table consolidated_global_indicator_values

  1. Modifications
    - Mise à jour de la fonction de consolidation pour calculer les moyennes
    - Correction des calculs de variations_pourcent et performances_pourcent
    - Les valeurs mensuelles deviennent des moyennes des sites
    - La valeur globale devient la moyenne des indicateurs des sites

  2. Fonctionnalités
    - Calcul automatique des moyennes par indicateur
    - Mise à jour des pourcentages basés sur les moyennes
    - Trigger pour maintenir la cohérence des données
*/

-- Fonction pour recalculer les indicateurs consolidés avec les moyennes
CREATE OR REPLACE FUNCTION update_consolidated_indicators()
RETURNS TRIGGER AS $$
BEGIN
  -- Supprimer les anciennes données consolidées pour cet indicateur/année
  DELETE FROM consolidated_global_indicator_values 
  WHERE indicator_code = COALESCE(NEW.code, OLD.code) 
    AND year = COALESCE(NEW.year, OLD.year)
    AND organization_name = COALESCE(NEW.organization_name, OLD.organization_name);

  -- Recalculer et insérer les nouvelles données consolidées
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
    decembre,
    variations_pourcent,
    performances_pourcent
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
    -- Moyenne des valeurs des sites
    ROUND(AVG(s.value)::numeric, 2) as value,
    ROUND(AVG(s.valeur_precedente)::numeric, 2) as valeur_precedente,
    ROUND(AVG(s.cible)::numeric, 2) as cible,
    s.variation,
    -- Moyennes mensuelles
    ROUND(AVG(s.janvier)::numeric, 2) as janvier,
    ROUND(AVG(s.fevrier)::numeric, 2) as fevrier,
    ROUND(AVG(s.mars)::numeric, 2) as mars,
    ROUND(AVG(s.avril)::numeric, 2) as avril,
    ROUND(AVG(s.mai)::numeric, 2) as mai,
    ROUND(AVG(s.juin)::numeric, 2) as juin,
    ROUND(AVG(s.juillet)::numeric, 2) as juillet,
    ROUND(AVG(s.aout)::numeric, 2) as aout,
    ROUND(AVG(s.septembre)::numeric, 2) as septembre,
    ROUND(AVG(s.octobre)::numeric, 2) as octobre,
    ROUND(AVG(s.novembre)::numeric, 2) as novembre,
    ROUND(AVG(s.decembre)::numeric, 2) as decembre,
    -- Calcul des variations en pourcentage basé sur la moyenne
    CASE
      WHEN AVG(s.cible) IS NOT NULL AND AVG(s.cible) != 0 AND AVG(s.value) IS NOT NULL
      THEN ROUND(((AVG(s.value) - AVG(s.cible)) / AVG(s.cible) * 100)::numeric, 2)
      ELSE NULL
    END as variations_pourcent,
    -- Calcul des performances en pourcentage basé sur la moyenne
    CASE
      WHEN AVG(s.cible) IS NOT NULL AND AVG(s.cible) != 0 AND AVG(s.value) IS NOT NULL
      THEN ROUND((AVG(s.value) / AVG(s.cible) * 100)::numeric, 2)
      ELSE NULL
    END as performances_pourcent
  FROM site_global_indicator_values_simple s
  WHERE s.code = COALESCE(NEW.code, OLD.code) 
    AND s.year = COALESCE(NEW.year, OLD.year)
    AND s.organization_name = COALESCE(NEW.organization_name, OLD.organization_name)
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
    s.formule,
    s.variation;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Recalculer toutes les données consolidées existantes avec les nouvelles formules
TRUNCATE TABLE consolidated_global_indicator_values;

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
  decembre,
  variations_pourcent,
  performances_pourcent
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
  -- Moyenne des valeurs des sites
  ROUND(AVG(s.value)::numeric, 2) as value,
  ROUND(AVG(s.valeur_precedente)::numeric, 2) as valeur_precedente,
  ROUND(AVG(s.cible)::numeric, 2) as cible,
  s.variation,
  -- Moyennes mensuelles
  ROUND(AVG(s.janvier)::numeric, 2) as janvier,
  ROUND(AVG(s.fevrier)::numeric, 2) as fevrier,
  ROUND(AVG(s.mars)::numeric, 2) as mars,
  ROUND(AVG(s.avril)::numeric, 2) as avril,
  ROUND(AVG(s.mai)::numeric, 2) as mai,
  ROUND(AVG(s.juin)::numeric, 2) as juin,
  ROUND(AVG(s.juillet)::numeric, 2) as juillet,
  ROUND(AVG(s.aout)::numeric, 2) as aout,
  ROUND(AVG(s.septembre)::numeric, 2) as septembre,
  ROUND(AVG(s.octobre)::numeric, 2) as octobre,
  ROUND(AVG(s.novembre)::numeric, 2) as novembre,
  ROUND(AVG(s.decembre)::numeric, 2) as decembre,
  -- Calcul des variations en pourcentage basé sur la moyenne
  CASE
    WHEN AVG(s.cible) IS NOT NULL AND AVG(s.cible) != 0 AND AVG(s.value) IS NOT NULL
    THEN ROUND(((AVG(s.value) - AVG(s.cible)) / AVG(s.cible) * 100)::numeric, 2)
    ELSE NULL
  END as variations_pourcent,
  -- Calcul des performances en pourcentage basé sur la moyenne
  CASE
    WHEN AVG(s.cible) IS NOT NULL AND AVG(s.cible) != 0 AND AVG(s.value) IS NOT NULL
    THEN ROUND((AVG(s.value) / AVG(s.cible) * 100)::numeric, 2)
    ELSE NULL
  END as performances_pourcent
FROM site_global_indicator_values_simple s
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
  s.formule,
  s.variation;