/*
  # Créer la table consolidated_global_indicator_values

  1. Nouvelle table
    - `consolidated_global_indicator_values`
    - Consolidation des indicateurs multi-sites
    - Structure organisationnelle (organization, filiere, filiale)
    - Valeurs mensuelles et annuelles consolidées

  2. Sécurité
    - Enable RLS
    - Politiques pour utilisateurs authentifiés

  3. Index et contraintes
    - Index sur organization_name, indicator_code, year
    - Contrainte unique pour éviter les doublons
*/

-- Créer la table consolidated_global_indicator_values
CREATE TABLE IF NOT EXISTS consolidated_global_indicator_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_name text NOT NULL,
  filiere_name text,
  filiale_name text,
  indicator_code text NOT NULL,
  year integer NOT NULL,
  site_names text[] NOT NULL DEFAULT '{}',
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
  cible numeric,
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
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE consolidated_global_indicator_values ENABLE ROW LEVEL SECURITY;

-- Créer les politiques RLS
CREATE POLICY "Enable read access for authenticated users"
  ON consolidated_global_indicator_values
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert for authenticated users"
  ON consolidated_global_indicator_values
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users"
  ON consolidated_global_indicator_values
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable delete for authenticated users"
  ON consolidated_global_indicator_values
  FOR DELETE
  TO authenticated
  USING (true);

-- Créer les index
CREATE INDEX IF NOT EXISTS idx_consolidated_global_indicator_values_org 
  ON consolidated_global_indicator_values (organization_name);

CREATE INDEX IF NOT EXISTS idx_consolidated_global_indicator_values_code 
  ON consolidated_global_indicator_values (indicator_code);

CREATE INDEX IF NOT EXISTS idx_consolidated_global_indicator_values_year 
  ON consolidated_global_indicator_values (year);

CREATE INDEX IF NOT EXISTS idx_consolidated_global_indicator_values_filiere 
  ON consolidated_global_indicator_values (filiere_name);

CREATE INDEX IF NOT EXISTS idx_consolidated_global_indicator_values_filiale 
  ON consolidated_global_indicator_values (filiale_name);

-- Contrainte unique pour éviter les doublons
CREATE UNIQUE INDEX IF NOT EXISTS consolidated_global_indicator_values_unique_idx 
  ON consolidated_global_indicator_values (
    organization_name, 
    COALESCE(filiere_name, ''), 
    COALESCE(filiale_name, ''), 
    indicator_code, 
    year
  );

-- Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_consolidated_global_indicator_values_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour updated_at
CREATE TRIGGER update_consolidated_global_indicator_values_updated_at
  BEFORE UPDATE ON consolidated_global_indicator_values
  FOR EACH ROW
  EXECUTE FUNCTION update_consolidated_global_indicator_values_updated_at();

-- Insérer les données consolidées depuis site_global_indicator_values_simple
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
  array_agg(DISTINCT sgiv.site_name ORDER BY sgiv.site_name) as site_names,
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
  SUM(COALESCE(sgiv.value, 0)) as value,
  SUM(COALESCE(sgiv.valeur_precedente, 0)) as valeur_precedente,
  AVG(sgiv.cible) as cible,
  CASE 
    WHEN SUM(COALESCE(sgiv.valeur_precedente, 0)) > 0 THEN
      ROUND(((SUM(COALESCE(sgiv.value, 0)) - SUM(COALESCE(sgiv.valeur_precedente, 0))) / SUM(COALESCE(sgiv.valeur_precedente, 0)) * 100)::numeric, 2) || '%'
    ELSE NULL
  END as variation,
  SUM(COALESCE(sgiv.janvier, 0)) as janvier,
  SUM(COALESCE(sgiv.fevrier, 0)) as fevrier,
  SUM(COALESCE(sgiv.mars, 0)) as mars,
  SUM(COALESCE(sgiv.avril, 0)) as avril,
  SUM(COALESCE(sgiv.mai, 0)) as mai,
  SUM(COALESCE(sgiv.juin, 0)) as juin,
  SUM(COALESCE(sgiv.juillet, 0)) as juillet,
  SUM(COALESCE(sgiv.aout, 0)) as aout,
  SUM(COALESCE(sgiv.septembre, 0)) as septembre,
  SUM(COALESCE(sgiv.octobre, 0)) as octobre,
  SUM(COALESCE(sgiv.novembre, 0)) as novembre,
  SUM(COALESCE(sgiv.decembre, 0)) as decembre
FROM site_global_indicator_values_simple sgiv
JOIN sites s ON s.name = sgiv.site_name
WHERE sgiv.code IS NOT NULL 
  AND sgiv.year IS NOT NULL
GROUP BY 
  s.organization_name,
  s.filiere_name,
  s.filiale_name,
  sgiv.code,
  sgiv.year,
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
  sgiv.formule
HAVING COUNT(DISTINCT sgiv.site_name) >= 1
ON CONFLICT ON CONSTRAINT consolidated_global_indicator_values_unique_idx 
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