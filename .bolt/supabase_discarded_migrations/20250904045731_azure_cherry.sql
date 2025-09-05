@@ .. @@
 SELECT * FROM populate_calculated_indicators_from_indicators();
 
 -- Afficher les indicateurs non configurés pour information
 SELECT 'Indicateurs calculés trouvés dans la table indicators:' as info;
-SELECT * FROM get_unconfigured_calculated_indicators();