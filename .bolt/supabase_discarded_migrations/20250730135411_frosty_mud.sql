@@ .. @@
         -- Calculer la variation par rapport à l'année précédente
         IF prev_year_value IS NOT NULL AND prev_year_value > 0 THEN
             variation_text := ROUND(((annual_sum - prev_year_value) / prev_year_value * 100)::numeric, 2) || '%';
-            variations_pourcent := ROUND(((annual_sum - prev_year_value) / prev_year_value * 100)::numeric, 2);
+            -- variations_pourcent sera calculé comme value - cible plus tard
         ELSE
             variation_text := NULL;
-            variations_pourcent := NULL;
+            -- variations_pourcent sera calculé comme value - cible plus tard
         END IF;
         
         -- Insérer ou mettre à jour dans site_global_indicator_values_simple
@@ .. @@
             valeur_precedente = prev_year_value,
             variation = variation_text,
             janvier = monthly_values[1], fevrier = monthly_values[2], mars = monthly_values[3],
             avril = monthly_values[4], mai = monthly_values[5], juin = monthly_values[6],
             juillet = monthly_values[7], aout = monthly_values[8], septembre = monthly_values[9],
             octobre = monthly_values[10], novembre = monthly_values[11], decembre = monthly_values[12],
-            variations_pourcent = variations_pourcent,
+            variations_pourcent = CASE 
+                WHEN cible IS NOT NULL THEN (annual_sum - cible)
+                ELSE NULL 
+            END,
             updated_at = NOW()
         WHERE site_name = p_site_name 
           AND code = p_indicator_code 
@@ .. @@
             valeur_precedente, cible, variation,
             janvier, fevrier, mars, avril, mai, juin,
             juillet, aout, septembre, octobre, novembre, decembre,
             variations_pourcent, performances_pourcent,
             perf_janvier, perf_fevrier, perf_mars, perf_avril, perf_mai, perf_juin,
             perf_juillet, perf_aout, perf_septembre, perf_octobre, perf_novembre, perf_decembre,
             created_at, updated_at
         ) VALUES (
             p_site_name, p_year, p_indicator_code,
             axe_energetique_val, enjeux_val, normes_val, critere_val, indicateur_val, definition_val,
             processus_val, processus_code_val, frequence_val, unite_val, type_val, formule_val,
             annual_sum, prev_year_value, NULL, variation_text,
             monthly_values[1], monthly_values[2], monthly_values[3],
             monthly_values[4], monthly_values[5], monthly_values[6],
             monthly_values[7], monthly_values[8], monthly_values[9],
             monthly_values[10], monthly_values[11], monthly_values[12],
-            variations_pourcent, NULL,
+            CASE 
+                WHEN cible_val IS NOT NULL THEN (annual_sum - cible_val)
+                ELSE NULL 
+            END, NULL,
             NULL, NULL, NULL, NULL, NULL, NULL,
             NULL, NULL, NULL, NULL, NULL, NULL,
             NOW(), NOW()
         );
@@ .. @@
         -- Récupérer les métadonnées de l'indicateur
         SELECT i.axe_energetique, i.enjeux, i.normes, i.critere, i.name, i.description,
                p.name, i.processus_code, i.frequence, i.unit, i.type, i.formule
+               -- Note: cible n'est pas dans la table indicators, sera NULL pour l'instant
         INTO axe_energetique_val, enjeux_val, normes_val, critere_val, indicateur_val, definition_val,
              processus_val, processus_code_val, frequence_val, unite_val, type_val, formule_val
         FROM indicators i
         LEFT JOIN processus p ON i.processus_code = p.code
         WHERE i.code = p_indicator_code;