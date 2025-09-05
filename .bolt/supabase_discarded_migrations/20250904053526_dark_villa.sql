@@ .. @@
       IF FOUND THEN
         -- Insérer dans calculated_indicators
-        INSERT INTO calculated_indicators (
-          site_name,
-          organization_name,
-          indicator_code,
-          dependances,
-          methode_calcul,
-          periode,
-          year
-        )
-        VALUES (
-          p_site_name,
-          p_organization_name,
-          indicator_record.code,
-          dependency_record.dependances,
-          COALESCE(dependency_record.methode_calcul, indicator_record.formule),
-          'mensuel',
-          p_year
-        )
-        ON CONFLICT (site_name, organization_name, indicator_code, periode, year, month) 
-        DO UPDATE SET
-          dependances = EXCLUDED.dependances,
-          methode_calcul = EXCLUDED.methode_calcul,
-          updated_at = CURRENT_TIMESTAMP;
+        -- Insérer pour chaque mois de l'année (1 à 12)
+        FOR month_num IN 1..12 LOOP
+          INSERT INTO calculated_indicators (
+            site_name,
+            organization_name,
+            indicator_code,
+            dependances,
+            methode_calcul,
+            periode,
+            year,
+            month
+          )
+          VALUES (
+            p_site_name,
+            p_organization_name,
+            indicator_record.code,
+            dependency_record.dependances,
+            COALESCE(dependency_record.methode_calcul, indicator_record.formule),
+            'mensuel',
+            p_year,
+            month_num
+          )
+          ON CONFLICT (site_name, organization_name, indicator_code, periode, year, month) 
+          DO UPDATE SET
+            dependances = EXCLUDED.dependances,
+            methode_calcul = EXCLUDED.methode_calcul,
+            updated_at = CURRENT_TIMESTAMP;
+        END LOOP;
         
         indicator_code := indicator_record.code;
         status := 'SUCCESS';
-        message := 'Indicateur calculé synchronisé';
+        message := 'Indicateur calculé synchronisé pour 12 mois';
         RETURN NEXT;
       ELSE
         indicator_code := indicator_record.code;
@@ .. @@
       IF FOUND THEN
         -- Insérer dans calculated_indicators si pas déjà présent
-        INSERT INTO calculated_indicators (
-          site_name,
-          organization_name,
-          indicator_code,
-          dependances,
-          methode_calcul,
-          periode,
-          year
-        )
-        VALUES (
-          site_record.site_name,
-          site_record.organization_name,
-          indicator_record.code,
-          dependency_record.dependances,
-          COALESCE(dependency_record.methode_calcul, indicator_record.formule),
-          'mensuel',
-          current_year
-        )
-        ON CONFLICT (site_name, organization_name, indicator_code, periode, year, month) 
-        DO UPDATE SET
-          dependances = EXCLUDED.dependances,
-          methode_calcul = EXCLUDED.methode_calcul,
-          updated_at = CURRENT_TIMESTAMP;
+        -- Insérer pour chaque mois de l'année (1 à 12)
+        FOR month_num IN 1..12 LOOP
+          INSERT INTO calculated_indicators (
+            site_name,
+            organization_name,
+            indicator_code,
+            dependances,
+            methode_calcul,
+            periode,
+            year,
+            month
+          )
+          VALUES (
+            site_record.site_name,
+            site_record.organization_name,
+            indicator_record.code,
+            dependency_record.dependances,
+            COALESCE(dependency_record.methode_calcul, indicator_record.formule),
+            'mensuel',
+            current_year,
+            month_num
+          )
+          ON CONFLICT (site_name, organization_name, indicator_code, periode, year, month) 
+          DO UPDATE SET
+            dependances = EXCLUDED.dependances,
+            methode_calcul = EXCLUDED.methode_calcul,
+            updated_at = CURRENT_TIMESTAMP;
+        END LOOP;
         
         -- Retourner le statut de succès
         site_name := site_record.site_name;
         organization_name := site_record.organization_name;
         indicator_code := indicator_record.code;
         status := 'SUCCESS';
-        message := 'Indicateur calculé ajouté avec configuration de dépendances';
+        message := 'Indicateur calculé ajouté pour 12 mois avec configuration de dépendances';
         RETURN NEXT;
       ELSE
@@ .. @@
+
+-- Fonction pour obtenir le nombre d'enregistrements créés par site
+CREATE OR REPLACE FUNCTION get_calculated_indicators_count_by_site()
+RETURNS TABLE(
+  site_name text,
+  organization_name text,
+  total_indicators bigint,
+  total_monthly_records bigint,
+  configured_indicators bigint,
+  unconfigured_indicators bigint
+) 
+LANGUAGE plpgsql
+AS $$
+BEGIN
+  RETURN QUERY
+  SELECT 
+    ci.site_name,
+    ci.organization_name,
+    COUNT(DISTINCT ci.indicator_code) as total_indicators,
+    COUNT(*) as total_monthly_records,
+    COUNT(DISTINCT CASE WHEN id.is_active = true THEN ci.indicator_code END) as configured_indicators,
+    COUNT(DISTINCT CASE WHEN id.is_active = false OR id.indicator_code IS NULL THEN ci.indicator_code END) as unconfigured_indicators
+  FROM calculated_indicators ci
+  LEFT JOIN indicator_dependencies id ON id.indicator_code = ci.indicator_code
+  GROUP BY ci.site_name, ci.organization_name
+  ORDER BY ci.organization_name, ci.site_name;
+END;
+$$;
+
+-- Fonction pour voir les détails mensuels d'un site
+CREATE OR REPLACE FUNCTION get_site_monthly_calculated_indicators(
+  p_site_name text,
+  p_organization_name text,
+  p_year integer DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::integer
+)
+RETURNS TABLE(
+  indicator_code text,
+  indicator_name text,
+  month_number integer,
+  month_name text,
+  dependances text[],
+  methode_calcul text,
+  valeur numeric,
+  is_configured boolean
+) 
+LANGUAGE plpgsql
+AS $$
+BEGIN
+  RETURN QUERY
+  SELECT 
+    ci.indicator_code,
+    i.name as indicator_name,
+    ci.month,
+    CASE ci.month
+      WHEN 1 THEN 'Janvier'
+      WHEN 2 THEN 'Février'
+      WHEN 3 THEN 'Mars'
+      WHEN 4 THEN 'Avril'
+      WHEN 5 THEN 'Mai'
+      WHEN 6 THEN 'Juin'
+      WHEN 7 THEN 'Juillet'
+      WHEN 8 THEN 'Août'
+      WHEN 9 THEN 'Septembre'
+      WHEN 10 THEN 'Octobre'
+      WHEN 11 THEN 'Novembre'
+      WHEN 12 THEN 'Décembre'
+    END as month_name,
+    ci.dependances,
+    ci.methode_calcul,
+    ci.valeur,
+    COALESCE(id.is_active, false) as is_configured
+  FROM calculated_indicators ci
+  LEFT JOIN indicators i ON i.code = ci.indicator_code
+  LEFT JOIN indicator_dependencies id ON id.indicator_code = ci.indicator_code
+  WHERE ci.site_name = p_site_name 
+    AND ci.organization_name = p_organization_name
+    AND ci.year = p_year
+    AND ci.periode = 'mensuel'
+  ORDER BY ci.indicator_code, ci.month;
+END;
+$$;