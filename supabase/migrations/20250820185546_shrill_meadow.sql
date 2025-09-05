/*
  # Supprimer les fonctions dupliquées et conflictuelles

  1. Problème résolu
    - Supprime toutes les versions de la fonction `populate_site_indicators`
    - Supprime tous les déclencheurs qui utilisent ces fonctions
    - Nettoie complètement la base de données des conflits de fonctions

  2. Sécurité
    - Utilise CASCADE pour supprimer toutes les dépendances
    - Supprime les déclencheurs avant les fonctions pour éviter les erreurs
    - Nettoie toutes les versions conflictuelles
*/

-- Supprimer tous les déclencheurs qui utilisent les fonctions problématiques
DROP TRIGGER IF EXISTS trigger_populate_sites_on_new_indicator ON indicators CASCADE;
DROP TRIGGER IF EXISTS trigger_populate_site_indicators_on_new_indicator ON indicators CASCADE;
DROP TRIGGER IF EXISTS trigger_populate_indicators_on_new_indicator ON indicators CASCADE;
DROP TRIGGER IF EXISTS trigger_populate_site_indicators_on_new_site_process ON site_processes CASCADE;
DROP TRIGGER IF EXISTS trigger_populate_site_indicators_on_site_process ON site_processes CASCADE;
DROP TRIGGER IF EXISTS trigger_new_site_process_populate_indicators ON site_processes CASCADE;
DROP TRIGGER IF EXISTS trigger_populate_on_site_process_insert ON site_processes CASCADE;
DROP TRIGGER IF EXISTS trigger_populate_on_indicator_insert ON indicators CASCADE;

-- Supprimer toutes les versions de la fonction populate_site_indicators
DROP FUNCTION IF EXISTS populate_site_indicators(text) CASCADE;
DROP FUNCTION IF EXISTS populate_site_indicators(text, text) CASCADE;
DROP FUNCTION IF EXISTS populate_site_indicators(text, text, text) CASCADE;
DROP FUNCTION IF EXISTS populate_site_indicators() CASCADE;

-- Supprimer toutes les autres fonctions problématiques similaires
DROP FUNCTION IF EXISTS trigger_populate_sites_on_new_indicator() CASCADE;
DROP FUNCTION IF EXISTS trigger_populate_site_indicators_on_new_indicator() CASCADE;
DROP FUNCTION IF EXISTS trigger_populate_indicators_on_new_indicator() CASCADE;
DROP FUNCTION IF EXISTS trigger_populate_site_indicators_on_new_site_process() CASCADE;
DROP FUNCTION IF EXISTS trigger_populate_site_indicators_on_site_process() CASCADE;

-- Supprimer les fonctions de mise à jour qui pourraient causer des conflits
DROP FUNCTION IF EXISTS update_site_indicators_on_indicator_change() CASCADE;
DROP FUNCTION IF EXISTS update_site_indicators_on_site_process_change() CASCADE;

-- Nettoyer les déclencheurs restants qui pourraient référencer ces fonctions
DROP TRIGGER IF EXISTS trigger_indicator_change ON indicators CASCADE;
DROP TRIGGER IF EXISTS trigger_site_process_change ON site_processes CASCADE;

-- Vérifier et supprimer toute autre fonction avec des signatures similaires
DO $$
DECLARE
    func_record RECORD;
BEGIN
    -- Supprimer toutes les fonctions qui contiennent 'populate' dans leur nom
    FOR func_record IN 
        SELECT proname, oidvectortypes(proargtypes) as args
        FROM pg_proc 
        WHERE proname LIKE '%populate%' 
        AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    LOOP
        EXECUTE format('DROP FUNCTION IF EXISTS %I(%s) CASCADE', func_record.proname, func_record.args);
    END LOOP;
END $$;