# PROMPT ULTRA-DÉTAILLÉ : RÉPLICATION DU MODULE PILOTAGE

## CONTEXTE ET OBJECTIF

Je veux répliquer intégralement le module pilotage de mon application de gestion énergétique dans un autre projet. Le module pilotage permet aux contributeurs de saisir des valeurs d'indicateurs, aux validateurs de les valider, et aux administrateurs de superviser le processus. 

**IMPORTANT** : Tu dois modifier/supprimer/recréer toutes les tables nécessaires dans le projet de destination pour que le module fonctionne parfaitement. Ne garde aucune structure existante qui pourrait causer des conflits.

## ARCHITECTURE DU MODULE PILOTAGE

### 1. STRUCTURE DES DONNÉES (TABLES REQUISES)

#### A. TABLES DE BASE (À CRÉER/REMPLACER)

```sql
-- Table des organisations
CREATE TABLE organizations (
  name TEXT PRIMARY KEY,
  description TEXT,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  country TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  website TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des utilisateurs
CREATE TABLE users (
  email TEXT PRIMARY KEY,
  nom TEXT DEFAULT 'Nouvel',
  prenom TEXT DEFAULT 'Utilisateur',
  fonction TEXT DEFAULT '----',
  adresse TEXT,
  ville TEXT,
  pays TEXT,
  numero TEXT,
  titre TEXT,
  entreprise TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des profils utilisateurs avec rôles
CREATE TABLE profiles (
  email TEXT PRIMARY KEY REFERENCES users(email) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'guest' CHECK (role IN ('admin', 'guest', 'contributeur', 'validateur', 'admin_client')),
  organization_name TEXT REFERENCES organizations(name),
  organization_level TEXT,
  filiere_name TEXT,
  filiale_name TEXT,
  site_name TEXT,
  original_role TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des secteurs d'activité
CREATE TABLE sectors (
  name TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des types d'énergie
CREATE TABLE energy_types (
  name TEXT NOT NULL,
  sector_name TEXT NOT NULL REFERENCES sectors(name) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (name, sector_name)
);

-- Table des normes/standards
CREATE TABLE standards (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des enjeux
CREATE TABLE issues (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  axe_energetique TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des critères
CREATE TABLE criteria (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des indicateurs
CREATE TABLE indicators (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  unit TEXT,
  type TEXT,
  axe_energetique TEXT,
  enjeux TEXT,
  normes TEXT,
  critere TEXT,
  frequence TEXT DEFAULT 'Mensuelle',
  formule TEXT,
  processus_code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des processus
CREATE TABLE processus (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  criteres TEXT[],
  indicateurs TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des sites
CREATE TABLE sites (
  name TEXT PRIMARY KEY,
  organization_name TEXT REFERENCES organizations(name) ON DELETE CASCADE,
  filiere_name TEXT,
  filiale_name TEXT,
  description TEXT,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  country TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  website TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des filières
CREATE TABLE filieres (
  name TEXT PRIMARY KEY,
  organization_name TEXT REFERENCES organizations(name) ON DELETE CASCADE,
  location TEXT,
  manager TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des filiales
CREATE TABLE filiales (
  name TEXT PRIMARY KEY,
  organization_name TEXT REFERENCES organizations(name) ON DELETE CASCADE,
  filiere_name TEXT REFERENCES filieres(name) ON DELETE CASCADE,
  description TEXT,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  country TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  website TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### B. TABLES SPÉCIFIQUES AU PILOTAGE

```sql
-- Table des périodes de collecte
CREATE TABLE collection_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_name TEXT REFERENCES organizations(name) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  period_type TEXT NOT NULL CHECK (period_type IN ('month', 'quarter', 'year')),
  period_number INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (organization_name, year, period_type, period_number)
);

-- Table des valeurs d'indicateurs (CŒUR DU MODULE PILOTAGE)
CREATE TABLE indicator_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id UUID REFERENCES collection_periods(id) ON DELETE CASCADE,
  organization_name TEXT REFERENCES organizations(name) ON DELETE CASCADE,
  filiere_name TEXT REFERENCES filieres(name) ON DELETE CASCADE,
  filiale_name TEXT REFERENCES filiales(name) ON DELETE CASCADE,
  site_name TEXT REFERENCES sites(name) ON DELETE CASCADE,
  processus_code TEXT REFERENCES processus(code) ON DELETE CASCADE,
  indicator_code TEXT REFERENCES indicators(code) ON DELETE CASCADE,
  value NUMERIC,
  unit TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'validated', 'rejected')),
  comment TEXT,
  submitted_by TEXT REFERENCES profiles(email),
  submitted_at TIMESTAMPTZ,
  validated_by TEXT REFERENCES profiles(email),
  validated_at TIMESTAMPTZ,
  criteria_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table d'association utilisateur-processus
CREATE TABLE user_processus (
  email TEXT REFERENCES profiles(email) ON DELETE CASCADE,
  processus_code TEXT REFERENCES processus(code) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (email, processus_code)
);

-- Table des sélections d'organisation
CREATE TABLE organization_selections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_name TEXT REFERENCES organizations(name) ON DELETE CASCADE,
  sector_name TEXT REFERENCES sectors(name),
  energy_type_name TEXT,
  standard_names TEXT[],
  issue_names TEXT[],
  criteria_names TEXT[],
  indicator_names TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des associations secteur-standards
CREATE TABLE sector_standards (
  sector_name TEXT REFERENCES sectors(name) ON DELETE CASCADE,
  energy_type_name TEXT,
  standard_codes TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (sector_name, energy_type_name)
);

-- Table des associations secteur-standards-enjeux
CREATE TABLE sector_standards_issues (
  sector_name TEXT REFERENCES sectors(name) ON DELETE CASCADE,
  energy_type_name TEXT,
  standard_name TEXT,
  issue_codes TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (sector_name, energy_type_name, standard_name)
);

-- Table des associations secteur-standards-enjeux-critères
CREATE TABLE sector_standards_issues_criteria (
  sector_name TEXT REFERENCES sectors(name) ON DELETE CASCADE,
  energy_type_name TEXT,
  standard_name TEXT,
  issue_name TEXT,
  criteria_codes TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (sector_name, energy_type_name, standard_name, issue_name)
);

-- Table des associations secteur-standards-enjeux-critères-indicateurs
CREATE TABLE sector_standards_issues_criteria_indicators (
  sector_name TEXT REFERENCES sectors(name) ON DELETE CASCADE,
  energy_type_name TEXT,
  standard_name TEXT,
  criteria_name TEXT,
  issue_name TEXT,
  indicator_codes TEXT[],
  unit TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (sector_name, energy_type_name, standard_name, criteria_name, issue_name)
);
```

### 2. POLITIQUES RLS (ROW LEVEL SECURITY)

```sql
-- Activer RLS sur toutes les tables sensibles
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE indicator_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_processus ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_selections ENABLE ROW LEVEL SECURITY;
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE filieres ENABLE ROW LEVEL SECURITY;
ALTER TABLE filiales ENABLE ROW LEVEL SECURITY;

-- Politiques pour indicator_values (CRITIQUES POUR LE PILOTAGE)
CREATE POLICY "Enable read access for authenticated users" ON indicator_values
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert for contributors and validators" ON indicator_values
  FOR INSERT TO authenticated 
  WITH CHECK (
    (jwt() ->> 'role') IN ('contributeur', 'validateur', 'admin', 'admin_client')
  );

CREATE POLICY "Enable update for contributors and validators" ON indicator_values
  FOR UPDATE TO authenticated 
  USING (
    (jwt() ->> 'role') IN ('contributeur', 'validateur', 'admin', 'admin_client')
  );

CREATE POLICY "Enable delete for admins only" ON indicator_values
  FOR DELETE TO authenticated 
  USING ((jwt() ->> 'role') = 'admin');

-- Politiques pour collection_periods
CREATE POLICY "Enable read access for authenticated users" ON collection_periods
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable full access for admin users" ON collection_periods
  FOR ALL TO authenticated 
  USING ((jwt() ->> 'role') = 'admin')
  WITH CHECK ((jwt() ->> 'role') = 'admin');

-- Politiques pour profiles
CREATE POLICY "Allow all operations for authenticated users" ON profiles
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Politiques pour user_processus
CREATE POLICY "Enable full access for admin users" ON user_processus
  FOR ALL TO authenticated 
  USING ((jwt() ->> 'role') = 'admin')
  WITH CHECK ((jwt() ->> 'role') = 'admin');

CREATE POLICY "Enable read access for authenticated users" ON user_processus
  FOR SELECT TO authenticated USING (true);
```

### 3. INDEX POUR PERFORMANCE

```sql
-- Index critiques pour le module pilotage
CREATE INDEX idx_indicator_values_period ON indicator_values(period_id);
CREATE INDEX idx_indicator_values_status ON indicator_values(status);
CREATE INDEX idx_indicator_values_org ON indicator_values(organization_name);
CREATE INDEX idx_indicator_values_site ON indicator_values(site_name);
CREATE INDEX idx_indicator_values_processus ON indicator_values(processus_code);
CREATE INDEX idx_indicator_values_indicator ON indicator_values(indicator_code);
CREATE INDEX idx_indicator_values_submitted_by ON indicator_values(submitted_by);
CREATE INDEX idx_indicator_values_validated_by ON indicator_values(validated_by);

-- Index composites pour requêtes complexes
CREATE INDEX idx_indicator_values_site_period ON indicator_values(site_name, period_id);
CREATE INDEX idx_indicator_values_org_status ON indicator_values(organization_name, status);
CREATE INDEX idx_indicator_values_processus_status ON indicator_values(processus_code, status);

-- Index pour collection_periods
CREATE INDEX idx_collection_periods_org ON collection_periods(organization_name);
CREATE INDEX idx_collection_periods_status ON collection_periods(status);
CREATE INDEX idx_collection_periods_year ON collection_periods(year);

-- Index pour user_processus
CREATE INDEX idx_user_processus_email ON user_processus(email);
CREATE INDEX idx_user_processus_processus ON user_processus(processus_code);
```

### 4. FONCTIONS ET TRIGGERS ESSENTIELS

```sql
-- Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers pour updated_at
CREATE TRIGGER update_indicator_values_updated_at
  BEFORE UPDATE ON indicator_values
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_collection_periods_updated_at
  BEFORE UPDATE ON collection_periods
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Fonction pour gérer les nouveaux utilisateurs
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (email, role)
  VALUES (NEW.email, 'guest')
  ON CONFLICT (email) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour créer automatiquement un profil
CREATE TRIGGER on_user_created
  AFTER INSERT ON users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

### 5. DONNÉES DE TEST MINIMALES

```sql
-- Insérer des données de test pour que le module fonctionne
INSERT INTO sectors (name) VALUES 
  ('Industrie'),
  ('Transport'),
  ('Batiment tertiaire')
ON CONFLICT (name) DO NOTHING;

INSERT INTO energy_types (name, sector_name) VALUES 
  ('Électricité', 'Industrie'),
  ('Gaz Naturel', 'Industrie'),
  ('Énergies Renouvelables', 'Industrie')
ON CONFLICT (name, sector_name) DO NOTHING;

INSERT INTO standards (code, name, description) VALUES 
  ('ISO50001', 'ISO 50001', 'Système de management de l''énergie'),
  ('ISO50003', 'ISO 50003', 'Exigences pour les organismes d''audit'),
  ('ISO50006', 'ISO 50006', 'Mesure de la performance énergétique')
ON CONFLICT (code) DO NOTHING;

INSERT INTO issues (code, name, description) VALUES 
  ('CTX001', 'Contexte, domaine d''application et SER', 'Définition du périmètre et des objectifs'),
  ('RIS001', 'Risques, impacts et opportunités', 'Analyse des risques et opportunités'),
  ('PAR001', 'Parties intéressées et exigences', 'Identification des parties prenantes')
ON CONFLICT (code) DO NOTHING;

INSERT INTO criteria (code, name, description) VALUES 
  ('CRIT001', 'Contexte', 'Analyse du contexte organisationnel'),
  ('CRIT002', 'Domaine d''application', 'Définition du périmètre'),
  ('CRIT003', 'SER', 'Situation énergétique de référence')
ON CONFLICT (code) DO NOTHING;

INSERT INTO indicators (code, name, description, unit, frequence, processus_code) VALUES 
  ('IND001', 'Consommation électrique totale', 'Consommation totale d''électricité', 'kWh', 'Mensuelle', 'PROC001'),
  ('IND002', 'Efficacité énergétique', 'Ratio de performance énergétique', '%', 'Mensuelle', 'PROC001'),
  ('IND003', 'Émissions CO2', 'Émissions de dioxyde de carbone', 'tCO2', 'Mensuelle', 'PROC002')
ON CONFLICT (code) DO NOTHING;

INSERT INTO processus (code, name, description, indicateurs) VALUES 
  ('PROC001', 'Processus Énergétique Principal', 'Gestion de l''énergie principale', ARRAY['IND001', 'IND002']),
  ('PROC002', 'Processus Environnemental', 'Gestion des impacts environnementaux', ARRAY['IND003'])
ON CONFLICT (code) DO NOTHING;
```

## LOGIQUE MÉTIER DU MODULE PILOTAGE

### 1. FLUX DE DONNÉES PRINCIPAL

#### A. CONTRIBUTEUR (Saisie des données)
1. **Connexion** : L'utilisateur se connecte avec son rôle `contributeur`
2. **Sélection du site** : Le contributeur voit uniquement les sites qui lui sont assignés
3. **Sélection du processus** : Pour chaque site, il voit les processus auxquels il est assigné (table `user_processus`)
4. **Saisie des indicateurs** : Pour chaque processus, il voit les indicateurs associés et peut saisir des valeurs
5. **Soumission** : Les valeurs passent du statut `draft` à `submitted`

#### B. VALIDATEUR (Validation des données)
1. **Vue d'ensemble** : Le validateur voit toutes les valeurs avec le statut `submitted`
2. **Validation** : Il peut approuver (`validated`) ou rejeter (`rejected`) les valeurs
3. **Commentaires** : Il peut ajouter des commentaires lors de la validation

#### C. ADMINISTRATEUR (Supervision)
1. **Vue globale** : Accès à toutes les données, tous les statuts
2. **Gestion des périodes** : Création et gestion des périodes de collecte
3. **Attribution des processus** : Assignation des contributeurs aux processus

### 2. REQUÊTES CLÉS DU MODULE

#### A. Récupération des sites pour un contributeur
```sql
SELECT DISTINCT s.name, s.organization_name, s.city
FROM sites s
JOIN profiles p ON p.site_name = s.name
WHERE p.email = $1 AND p.role = 'contributeur';
```

#### B. Récupération des processus pour un site et un contributeur
```sql
SELECT DISTINCT pr.code, pr.name, pr.description
FROM processus pr
JOIN user_processus up ON up.processus_code = pr.code
JOIN profiles p ON p.email = up.email
WHERE p.email = $1 AND p.site_name = $2;
```

#### C. Récupération des indicateurs pour un processus
```sql
SELECT i.code, i.name, i.description, i.unit, i.frequence
FROM indicators i
WHERE i.processus_code = $1
AND i.name = ANY(
  SELECT UNNEST(os.indicator_names)
  FROM organization_selections os
  WHERE os.organization_name = $2
);
```

#### D. Récupération des valeurs d'indicateurs avec filtres
```sql
SELECT 
  iv.*,
  cp.year,
  cp.period_number,
  cp.period_type,
  i.name as indicator_name,
  i.unit as indicator_unit,
  pr.name as processus_name
FROM indicator_values iv
LEFT JOIN collection_periods cp ON cp.id = iv.period_id
LEFT JOIN indicators i ON i.code = iv.indicator_code
LEFT JOIN processus pr ON pr.code = iv.processus_code
WHERE iv.organization_name = $1
AND ($2::TEXT IS NULL OR iv.site_name = $2)
AND ($3::TEXT IS NULL OR iv.processus_code = $3)
AND ($4::TEXT IS NULL OR iv.status = $4)
ORDER BY iv.created_at DESC;
```

### 3. LOGIQUE DE VALIDATION

#### A. Soumission d'une valeur (Contributeur)
```typescript
const submitValue = async (valueId: string) => {
  const { error } = await supabase
    .from('indicator_values')
    .update({
      status: 'submitted',
      submitted_by: user.email,
      submitted_at: new Date().toISOString()
    })
    .eq('id', valueId);
};
```

#### B. Validation d'une valeur (Validateur)
```typescript
const validateValue = async (valueId: string, isApproved: boolean, comment?: string) => {
  const { error } = await supabase
    .from('indicator_values')
    .update({
      status: isApproved ? 'validated' : 'rejected',
      validated_by: user.email,
      validated_at: new Date().toISOString(),
      comment: comment || null
    })
    .eq('id', valueId);
};
```

### 4. STRUCTURE DES COMPOSANTS REACT

#### A. Page principale : ContributorPilotagePage
```typescript
interface IndicatorValue {
  id: string;
  period_id: string;
  indicator_code: string;
  processus_code: string;
  value: number | null;
  unit: string | null;
  status: 'draft' | 'submitted' | 'validated' | 'rejected';
  comment: string | null;
  submitted_by: string | null;
  submitted_at: string | null;
  validated_by: string | null;
  validated_at: string | null;
  organization_name: string;
  site_name: string | null;
  created_at: string;
  updated_at: string;
}

interface Site {
  name: string;
  organization_name: string;
  city: string;
}

interface Processus {
  code: string;
  name: string;
  description: string | null;
}

interface Indicator {
  code: string;
  name: string;
  description: string | null;
  unit: string | null;
  frequence: string | null;
}

interface CollectionPeriod {
  id: string;
  year: number;
  period_type: string;
  period_number: number;
  start_date: string;
  end_date: string;
  status: string;
}
```

#### B. Hooks personnalisés requis
```typescript
// Hook pour récupérer les sites d'un contributeur
const useContributorSites = (userEmail: string) => {
  // Logique de récupération des sites
};

// Hook pour récupérer les processus d'un site
const useSiteProcessus = (siteName: string, userEmail: string) => {
  // Logique de récupération des processus
};

// Hook pour récupérer les indicateurs d'un processus
const useProcessusIndicators = (processusCode: string, organizationName: string) => {
  // Logique de récupération des indicateurs
};

// Hook pour récupérer les valeurs d'indicateurs
const useIndicatorValues = (filters: any) => {
  // Logique de récupération des valeurs avec filtres
};
```

### 5. FONCTIONNALITÉS CLÉS À IMPLÉMENTER

#### A. Interface Contributeur
1. **Sélection de site** : Dropdown avec les sites assignés
2. **Sélection de processus** : Dropdown avec les processus assignés pour le site
3. **Tableau des indicateurs** : Affichage des indicateurs avec possibilité de saisie
4. **Saisie de valeurs** : Modal ou inline editing pour saisir les valeurs
5. **Soumission** : Bouton pour soumettre les valeurs saisies
6. **Historique** : Affichage de l'historique des valeurs saisies

#### B. Interface Validateur
1. **Vue d'ensemble** : Tableau de toutes les valeurs soumises
2. **Filtres** : Par organisation, site, processus, période
3. **Actions de validation** : Approuver/Rejeter avec commentaires
4. **Statuts visuels** : Badges colorés pour les différents statuts

#### C. Interface Administrateur
1. **Gestion des périodes** : Création/modification des périodes de collecte
2. **Attribution des processus** : Assignation des contributeurs aux processus
3. **Vue globale** : Accès à toutes les données et statistiques
4. **Export** : Possibilité d'exporter les données

### 6. GESTION DES ERREURS ET PERFORMANCE

#### A. Gestion des timeouts
```typescript
// Fonction de retry avec backoff
const retryWithBackoff = async (fn: () => Promise<any>, maxRetries = 3) => {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      if (error.code === '57014' && attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
        continue;
      }
      throw error;
    }
  }
};
```

#### B. Optimisation des requêtes
- Utiliser `select()` avec des colonnes spécifiques au lieu de `select('*')`
- Implémenter la pagination pour les grandes listes
- Utiliser `maybeSingle()` au lieu de `single()` quand approprié

### 7. CONFIGURATION SUPABASE REQUISE

#### A. Variables d'environnement
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

#### B. Configuration du client Supabase
```typescript
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  db: {
    schema: 'public',
  },
});
```

## INSTRUCTIONS D'IMPLÉMENTATION

### ÉTAPE 1 : PRÉPARATION DE LA BASE DE DONNÉES
1. **Supprimer toutes les tables existantes** qui pourraient entrer en conflit
2. **Créer les tables** dans l'ordre des dépendances (organisations → utilisateurs → sites → processus → indicateurs → valeurs)
3. **Activer RLS** sur toutes les tables sensibles
4. **Créer les politiques RLS** selon les spécifications
5. **Créer les index** pour optimiser les performances
6. **Insérer les données de test** pour valider le fonctionnement

### ÉTAPE 2 : IMPLÉMENTATION DU FRONTEND
1. **Créer la page ContributorPilotagePage** avec toutes les fonctionnalités
2. **Implémenter les hooks personnalisés** pour la récupération des données
3. **Créer les composants** de saisie et de validation
4. **Intégrer la gestion d'erreurs** avec retry automatique
5. **Ajouter les routes** dans le routeur principal

### ÉTAPE 3 : TESTS ET VALIDATION
1. **Tester la saisie** de valeurs par un contributeur
2. **Tester la validation** par un validateur
3. **Tester la supervision** par un administrateur
4. **Vérifier les performances** et l'absence de timeouts
5. **Valider la sécurité** des accès selon les rôles

## POINTS CRITIQUES À RESPECTER

1. **Ordre de création des tables** : Respecter les dépendances (foreign keys)
2. **Politiques RLS simplifiées** : Éviter les sous-requêtes complexes qui causent des timeouts
3. **Index optimisés** : Créer les index AVANT d'insérer de grandes quantités de données
4. **Gestion des erreurs** : Implémenter le retry automatique pour les timeouts
5. **Validation côté client** : Valider les données avant envoi pour éviter les erreurs serveur

## RÉSULTAT ATTENDU

Après implémentation, vous devriez avoir :
- Un module pilotage fonctionnel identique à l'original
- Des performances optimisées sans timeouts
- Une sécurité maintenue avec RLS
- Une interface utilisateur intuitive pour chaque rôle
- Une base de données structurée et optimisée

**IMPORTANT** : Exécute ce prompt étape par étape, en commençant par la base de données, puis le frontend. Teste chaque étape avant de passer à la suivante.