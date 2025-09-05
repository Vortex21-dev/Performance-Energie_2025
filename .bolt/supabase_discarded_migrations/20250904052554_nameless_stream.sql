@@ .. @@
 SELECT * FROM get_calculated_indicators_summary();

+-- EXÉCUTION : Remplir automatiquement la table calculated_indicators
+SELECT 'DÉBUT DE LA POPULATION AUTOMATIQUE' as info;
+
+-- 1. D'abord, peupler la table indicator_dependencies avec les indicateurs calculés
+SELECT 'Étape 1: Population des configurations de dépendances...' as info;
+SELECT * FROM populate_calculated_indicators_from_indicators();
+
+-- 2. Ensuite, remplir la table calculated_indicators basée sur site_processes
+SELECT 'Étape 2: Population de calculated_indicators basée sur site_processes...' as info;
+SELECT * FROM auto_populate_calculated_indicators();
+
+-- 3. Afficher le résumé final
+SELECT 'RÉSUMÉ FINAL:' as info;
+SELECT * FROM get_calculated_indicators_summary();
+
+-- 4. Afficher les indicateurs qui nécessitent encore une configuration
+SELECT 'Indicateurs nécessitant une configuration manuelle:' as info;
+SELECT * FROM get_indicators_needing_configuration();
+
+-- 5. Compter le nombre total d'enregistrements créés
+SELECT 
+  'STATISTIQUES FINALES' as info,
+  COUNT(*) as total_calculated_indicators_created,
+  COUNT(DISTINCT site_name) as sites_processed,
+  COUNT(DISTINCT organization_name) as organizations_processed,
+  COUNT(DISTINCT indicator_code) as unique_indicators
+FROM calculated_indicators;
+
+SELECT 'POPULATION TERMINÉE AVEC SUCCÈS' as info;