/*
  # Créer la table site_global_indicator_values_simple

  1. Nouvelle table
    - `site_global_indicator_values_simple` avec tous les champs requis
    - Clés étrangères vers sites, indicators et processus
    - Index pour les performances
    
  2. Sécurité
    - Enable RLS
    - Politiques pour les utilisateurs authentifiés
    
  3. Trigger
    - Fonction et trigger pour updated_at
*/

-- Créer la table site_global_indicator_values_simple
CREATE TABLE IF NOT EXISTS site_global_indicator_values_simple (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_name text NOT NULL,
  year integer NOT NULL,
  code text NOT NULL,
  axe_energetique text,
  enjeux text,
  normes text,
  critere text,
  indicateur text,
  definition text,
  processus text,
  processus_code text,
  frequence text,
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

-- Ajouter les clés étrangères
ALTER TABLE site_global_indicator_values_simple 
ADD CONSTRAINT fk_site_name 
FOREIGN KEY (site_name) REFERENCES sites(name) ON DELETE CASCADE;

ALTER TABLE site_global_indicator_values_simple 
ADD CONSTRAINT fk_indicator_code 
FOREIGN KEY (code) REFERENCES indicators(code) ON DELETE CASCADE;

ALTER TABLE site_global_indicator_values_simple 
ADD CONSTRAINT fk_processus_code 
FOREIGN KEY (processus_code) REFERENCES processus(code) ON DELETE CASCADE;

-- Créer les index
CREATE UNIQUE INDEX IF NOT EXISTS site_global_indicator_values_simple_unique_idx 
ON site_global_indicator_values_simple (site_name, code, year);

CREATE INDEX IF NOT EXISTS idx_site_global_indicator_values_simple_site_name 
ON site_global_indicator_values_simple (site_name);

CREATE INDEX IF NOT EXISTS idx_site_global_indicator_values_simple_year 
ON site_global_indicator_values_simple (year);

CREATE INDEX IF NOT EXISTS idx_site_global_indicator_values_simple_code 
ON site_global_indicator_values_simple (code);

-- Créer la fonction pour le trigger updated_at
CREATE OR REPLACE FUNCTION update_site_global_indicator_values_simple_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger
CREATE TRIGGER update_site_global_indicator_values_simple_updated_at
  BEFORE UPDATE ON site_global_indicator_values_simple
  FOR EACH ROW
  EXECUTE FUNCTION update_site_global_indicator_values_simple_updated_at();

-- Activer RLS
ALTER TABLE site_global_indicator_values_simple ENABLE ROW LEVEL SECURITY;

-- Créer les politiques RLS
CREATE POLICY "Enable read access for authenticated users" ON site_global_indicator_values_simple
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert for authenticated users" ON site_global_indicator_values_simple
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON site_global_indicator_values_simple
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Enable delete for authenticated users" ON site_global_indicator_values_simple
  FOR DELETE TO authenticated USING (true);

-- Insérer des données de base pour tester
INSERT INTO site_global_indicator_values_simple (
  site_name, 
  year, 
  code, 
  indicateur, 
  processus_code,
  processus,
  unite,
  type,
  frequence,
  value
)
SELECT DISTINCT
  sp.site_name,
  2024 as year,
  i.code,
  i.name as indicateur,
  i.processus_code,
  p.name as processus,
  i.unit as unite,
  i.type,
  COALESCE(i.frequence, 'Mensuelle') as frequence,
  ROUND((RANDOM() * 1000)::numeric, 2) as value
FROM site_processes sp
JOIN indicators i ON i.processus_code = sp.processus_code
JOIN processus p ON p.code = sp.processus_code
WHERE sp.is_active = true
ON CONFLICT (site_name, code, year) DO NOTHING;