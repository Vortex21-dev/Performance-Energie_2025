# PROMPT POUR CORRIGER L'ENREGISTREMENT DES DONNÉES ORGANISATIONNELLES

## PROBLÈME IDENTIFIÉ

Dans votre projet, les informations organisationnelles (nom du site, filiale, filière) ne sont pas enregistrées lors de l'ajout de données. Ce prompt corrige ce problème en répliquant la logique fonctionnelle de votre projet principal.

## SOLUTION : SYSTÈME DE HIÉRARCHIE ORGANISATIONNELLE AUTOMATIQUE

### 1. STRUCTURE DES TABLES REQUISES

#### A. Table des profils utilisateurs (CRITIQUE)
```sql
-- Modifier la table profiles pour inclure la hiérarchie organisationnelle
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS organization_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS organization_level TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS filiere_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS filiale_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS site_name TEXT;

-- Ajouter les contraintes de foreign key
ALTER TABLE profiles ADD CONSTRAINT profiles_organization_name_fkey 
  FOREIGN KEY (organization_name) REFERENCES organizations(name);
ALTER TABLE profiles ADD CONSTRAINT profiles_site_name_fkey 
  FOREIGN KEY (site_name) REFERENCES sites(name);
```

#### B. Table indicator_values avec hiérarchie complète
```sql
-- Vérifier que la table indicator_values a toutes les colonnes nécessaires
ALTER TABLE indicator_values ADD COLUMN IF NOT EXISTS organization_name TEXT;
ALTER TABLE indicator_values ADD COLUMN IF NOT EXISTS filiere_name TEXT;
ALTER TABLE indicator_values ADD COLUMN IF NOT EXISTS filiale_name TEXT;
ALTER TABLE indicator_values ADD COLUMN IF NOT EXISTS site_name TEXT;

-- Ajouter les contraintes
ALTER TABLE indicator_values ADD CONSTRAINT indicator_values_organization_name_fkey 
  FOREIGN KEY (organization_name) REFERENCES organizations(name) ON DELETE CASCADE;
ALTER TABLE indicator_values ADD CONSTRAINT indicator_values_site_name_fkey 
  FOREIGN KEY (site_name) REFERENCES sites(name) ON DELETE CASCADE;
```

### 2. FONCTION TRIGGER POUR AUTO-REMPLISSAGE

```sql
-- Fonction pour remplir automatiquement la hiérarchie organisationnelle
CREATE OR REPLACE FUNCTION update_indicator_values_hierarchy()
RETURNS TRIGGER AS $$
BEGIN
  -- Récupérer les informations du profil utilisateur
  SELECT 
    p.organization_name,
    p.filiere_name,
    p.filiale_name,
    p.site_name
  INTO 
    NEW.organization_name,
    NEW.filiere_name,
    NEW.filiale_name,
    NEW.site_name
  FROM profiles p
  WHERE p.email = (jwt() ->> 'email');
  
  -- Si pas trouvé dans le profil, essayer de récupérer depuis le site_name fourni
  IF NEW.site_name IS NOT NULL AND NEW.organization_name IS NULL THEN
    SELECT 
      s.organization_name,
      s.filiere_name,
      s.filiale_name
    INTO 
      NEW.organization_name,
      NEW.filiere_name,
      NEW.filiale_name
    FROM sites s
    WHERE s.name = NEW.site_name;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Créer le trigger
DROP TRIGGER IF EXISTS trigger_update_indicator_values_hierarchy ON indicator_values;
CREATE TRIGGER trigger_update_indicator_values_hierarchy
  BEFORE INSERT OR UPDATE OF site_name ON indicator_values
  FOR EACH ROW EXECUTE FUNCTION update_indicator_values_hierarchy();
```

### 3. LOGIQUE FRONTEND POUR L'ENREGISTREMENT

#### A. Fonction de sauvegarde corrigée (TypeScript)
```typescript
const handleSaveNewValue = async (
  periodId: string,
  indicatorCode: string,
  processusCode: string,
  value: number,
  unit: string,
  comment?: string
) => {
  try {
    // 1. Récupérer les informations du profil utilisateur
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('organization_name, filiere_name, filiale_name, site_name')
      .eq('email', user?.email)
      .single();

    if (profileError) throw profileError;

    // 2. Préparer les données avec la hiérarchie complète
    const indicatorValueData = {
      period_id: periodId,
      indicator_code: indicatorCode,
      processus_code: processusCode,
      value: value,
      unit: unit,
      comment: comment || null,
      status: 'draft',
      // CRITIQUE : Inclure TOUTES les informations organisationnelles
      organization_name: profileData.organization_name,
      filiere_name: profileData.filiere_name,
      filiale_name: profileData.filiale_name,
      site_name: profileData.site_name,
      submitted_by: user?.email
    };

    // 3. Insérer avec toutes les informations
    const { data, error } = await supabase
      .from('indicator_values')
      .insert([indicatorValueData])
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error: any) {
    console.error('Error saving indicator value:', error);
    return { success: false, error: error.message };
  }
};
```

#### B. Hook pour récupérer les données utilisateur
```typescript
const useUserOrganizationData = () => {
  const { user } = useAuth();
  const [organizationData, setOrganizationData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchOrganizationData = async () => {
      if (!user?.email) return;

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select(`
            organization_name,
            filiere_name,
            filiale_name,
            site_name,
            organization_level
          `)
          .eq('email', user.email)
          .single();

        if (error) throw error;
        setOrganizationData(data);
      } catch (error) {
        console.error('Error fetching organization data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrganizationData();
  }, [user?.email]);

  return { organizationData, isLoading };
};
```

### 4. REQUÊTE DE RÉCUPÉRATION AVEC HIÉRARCHIE

```sql
-- Requête pour récupérer les valeurs avec toute la hiérarchie
SELECT 
  iv.*,
  cp.year,
  cp.period_number,
  cp.period_type,
  i.name as indicator_name,
  i.unit as indicator_unit,
  pr.name as processus_name,
  s.name as site_name,
  s.city as site_city,
  fil.name as filiale_name,
  fir.name as filiere_name,
  o.name as organization_name
FROM indicator_values iv
LEFT JOIN collection_periods cp ON cp.id = iv.period_id
LEFT JOIN indicators i ON i.code = iv.indicator_code
LEFT JOIN processus pr ON pr.code = iv.processus_code
LEFT JOIN sites s ON s.name = iv.site_name
LEFT JOIN filiales fil ON fil.name = iv.filiale_name
LEFT JOIN filieres fir ON fir.name = iv.filiere_name
LEFT JOIN organizations o ON o.name = iv.organization_name
WHERE iv.organization_name = $1
ORDER BY iv.created_at DESC;
```

### 5. VALIDATION DES DONNÉES AVANT INSERTION

#### A. Fonction de validation côté client
```typescript
const validateIndicatorValueData = (data: any) => {
  const errors: string[] = [];

  // Vérifications obligatoires
  if (!data.period_id) errors.push('Période manquante');
  if (!data.indicator_code) errors.push('Code indicateur manquant');
  if (!data.processus_code) errors.push('Code processus manquant');
  if (data.value === null || data.value === undefined) errors.push('Valeur manquante');
  
  // Vérifications organisationnelles CRITIQUES
  if (!data.organization_name) errors.push('Nom de l\'organisation manquant');
  if (!data.site_name) errors.push('Nom du site manquant');

  return {
    isValid: errors.length === 0,
    errors
  };
};
```

#### B. Utilisation dans le composant
```typescript
const handleSubmit = async (formData: any) => {
  // 1. Valider les données
  const validation = validateIndicatorValueData(formData);
  if (!validation.isValid) {
    setError(`Données incomplètes: ${validation.errors.join(', ')}`);
    return;
  }

  // 2. Sauvegarder avec retry
  const result = await retryWithBackoff(() => 
    handleSaveNewValue(
      formData.period_id,
      formData.indicator_code,
      formData.processus_code,
      formData.value,
      formData.unit,
      formData.comment
    )
  );

  if (result.success) {
    setSuccess('Valeur enregistrée avec succès');
    // Rafraîchir les données
    refetchIndicatorValues();
  } else {
    setError(`Erreur: ${result.error}`);
  }
};
```

### 6. MISE À JOUR DES COMPOSANTS EXISTANTS

#### A. Modifier ContributorPilotagePage.tsx
```typescript
// Dans le composant ContributorPilotagePage, s'assurer que :

// 1. Les données du profil sont récupérées au chargement
const { organizationData, isLoading: isLoadingOrg } = useUserOrganizationData();

// 2. Les données sont incluses dans chaque insertion
const saveIndicatorValue = async (valueData: any) => {
  const completeData = {
    ...valueData,
    organization_name: organizationData?.organization_name,
    filiere_name: organizationData?.filiere_name,
    filiale_name: organizationData?.filiale_name,
    site_name: organizationData?.site_name
  };

  return await handleSaveNewValue(completeData);
};
```

#### B. Modifier ValidatorPilotagePage.tsx
```typescript
// S'assurer que les filtres incluent la hiérarchie organisationnelle
const fetchIndicatorValues = async (filters: any) => {
  const { data, error } = await supabase
    .from('indicator_values')
    .select(`
      *,
      collection_period:period_id(year, period_number, period_type),
      indicator:indicators(name, unit),
      processus:processus(name),
      site:sites(name, city),
      filiale:filiales(name),
      filiere:filieres(name),
      organization:organizations(name)
    `)
    .eq('status', 'submitted')
    .order('created_at', { ascending: false });

  return { data, error };
};
```

### 7. VÉRIFICATIONS POST-IMPLÉMENTATION

#### A. Tests à effectuer
```sql
-- 1. Vérifier que les données sont bien enregistrées avec la hiérarchie
SELECT 
  organization_name,
  filiere_name,
  filiale_name,
  site_name,
  indicator_code,
  value
FROM indicator_values 
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;

-- 2. Vérifier l'intégrité des foreign keys
SELECT 
  iv.site_name,
  s.name as site_exists
FROM indicator_values iv
LEFT JOIN sites s ON s.name = iv.site_name
WHERE iv.site_name IS NOT NULL
AND s.name IS NULL;
```

#### B. Requêtes de diagnostic
```sql
-- Compter les enregistrements sans hiérarchie organisationnelle
SELECT 
  COUNT(*) as total_records,
  COUNT(organization_name) as with_organization,
  COUNT(site_name) as with_site,
  COUNT(filiere_name) as with_filiere,
  COUNT(filiale_name) as with_filiale
FROM indicator_values;
```

### 8. POINTS CRITIQUES À VÉRIFIER

1. **Profil utilisateur complet** : Vérifier que chaque utilisateur a bien ses informations organisationnelles dans la table `profiles`
2. **Trigger fonctionnel** : S'assurer que le trigger `update_indicator_values_hierarchy` s'exécute correctement
3. **Données de test** : Créer des données de test avec la hiérarchie complète
4. **Frontend synchronisé** : Vérifier que le frontend récupère et utilise les bonnes données

### 9. COMMANDES DE DÉBOGAGE

```sql
-- Vérifier les profils utilisateurs
SELECT email, organization_name, filiere_name, filiale_name, site_name 
FROM profiles 
WHERE email = 'votre_email@example.com';

-- Vérifier les dernières insertions
SELECT * FROM indicator_values 
ORDER BY created_at DESC 
LIMIT 10;

-- Vérifier les triggers actifs
SELECT trigger_name, event_manipulation, action_statement 
FROM information_schema.triggers 
WHERE event_object_table = 'indicator_values';
```

## INSTRUCTIONS D'APPLICATION

1. **Exécuter les migrations SQL** dans l'ordre indiqué
2. **Mettre à jour le code frontend** avec les nouvelles fonctions
3. **Tester l'insertion** d'une nouvelle valeur
4. **Vérifier** que toutes les informations organisationnelles sont bien enregistrées
5. **Déboguer** si nécessaire avec les requêtes fournies

Ce prompt corrige spécifiquement le problème d'enregistrement des données organisationnelles en répliquant la logique fonctionnelle de votre projet principal.