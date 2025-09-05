@@ .. @@
 SELECT * FROM get_calculated_indicators_summary();

+-- Fonction principale pour remplir automatiquement calculated_indicators
+-- basée sur site_processes et organization_selections
+CREATE OR REPLACE FUNCTION auto_populate_calculated_indicators()
+RETURNS TABLE(
+  site_name text,
+  organization_name text,
+  indicator_code text,
+  status text,
+  message text
+) 
+LANGUAGE plpgsql
+AS $$
+DECLARE
+  site_process_record RECORD;
+  indicator_record RECORD;
+  dependency_config RECORD;
+  org_indicators text[];
+  current_year integer := EXTRACT(YEAR FROM CURRENT_DATE);
+  month_num integer;
+BEGIN
+  -- Pour chaque association site-processus active
+  FOR site_process_record IN 
+    SELECT DISTINCT 
+      sp.site_name,
+      sp.organization_name,
+      sp.processus_code
+    FROM site_processes sp
+    WHERE sp.is_active = true
+      AND sp.site_name IS NOT NULL
+      AND sp.organization_name IS NOT NULL
+      AND sp.processus_code IS NOT NULL
+  LOOP
+    -- Récupérer les indicateurs sélectionnés par l'organisation
+    SELECT COALESCE(indicator_names, ARRAY[]::text[]) INTO org_indicators
+    FROM organization_selections 
+    WHERE organization_name = site_process_record.organization_name
+    ORDER BY created_at DESC 
+    LIMIT 1;
+    
+    -- Si aucune sélection d'organisation trouvée, passer au suivant
+    IF array_length(org_indicators, 1) IS NULL THEN
+      site_name := site_process_record.site_name;
+      organization_name := site_process_record.organization_name;
+      indicator_code := 'N/A';
+      status := 'SKIPPED';
+      message := 'Aucune sélection d''indicateurs trouvée pour l''organisation';
+      RETURN NEXT;
+      CONTINUE;
+    END IF;
+    
+    -- Identifier les indicateurs calculés du processus
+    FOR indicator_record IN
+      SELECT 
+        i.code,
+        i.name,
+        i.formule,
+        i.type
+      FROM indicators i
+      WHERE i.processus_code = site_process_record.processus_code
+        AND (
+          i.formule IS NOT NULL 
+          AND i.formule != ''
+          AND i.formule != 'N/A'
+        )
+        AND i.name = ANY(org_indicators) -- Vérification organisationnelle
+    LOOP
+      -- Récupérer la configuration des dépendances
+      SELECT * INTO dependency_config
+      FROM indicator_dependencies
+      WHERE indicator_code = indicator_record.code;
+      
+      IF FOUND THEN
+        -- Créer des enregistrements pour chaque mois (période mensuelle)
+        FOR month_num IN 1..12 LOOP
+          INSERT INTO calculated_indicators (
+            site_name,
+            organization_name,
+            indicator_code,
+            dependances,
+            methode_calcul,
+            valeur,
+            periode,
+            year,
+            month
+          )
+          VALUES (
+            site_process_record.site_name,
+            site_process_record.organization_name,
+            indicator_record.code,
+            COALESCE(dependency_config.dependances, ARRAY[]::text[]),
+            COALESCE(dependency_config.methode_calcul, indicator_record.formule),
+            NULL, -- Valeur initialement vide
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
+        
+        -- Retourner le statut de succès
+        site_name := site_process_record.site_name;
+        organization_name := site_process_record.organization_name;
+        indicator_code := indicator_record.code;
+        status := 'SUCCESS';
+        message := FORMAT('Indicateur calculé ajouté pour 12 mois (dépendances: %s)', 
+                         array_to_string(COALESCE(dependency_config.dependances, ARRAY[]::text[]), ', '));
+        RETURN NEXT;
+      ELSE
+        -- Créer une configuration par défaut dans indicator_dependencies
+        INSERT INTO indicator_dependencies (
+          indicator_code,
+          dependances,
+          methode_calcul,
+          description,
+          is_active
+        )
+        VALUES (
+          indicator_record.code,
+          ARRAY[]::text[], -- Dépendances vides à configurer manuellement
+          indicator_record.formule,
+          FORMAT('Configuration automatique pour %s', indicator_record.name),
+          false -- Inactif jusqu'à configuration manuelle des dépendances
+        )
+        ON CONFLICT (indicator_code) DO NOTHING;
+        
+        -- Retourner le statut d'avertissement
+        site_name := site_process_record.site_name;
+        organization_name := site_process_record.organization_name;
+        indicator_code := indicator_record.code;
+        status := 'NEEDS_CONFIG';
+        message := 'Indicateur trouvé mais nécessite une configuration des dépendances';
+        RETURN NEXT;
+      END IF;
+    END LOOP;
+  END LOOP;
+  
+  RETURN;
+END;
+$$;
+
+-- Fonction pour configurer rapidement les dépendances d'un indicateur
+CREATE OR REPLACE FUNCTION configure_calculated_indicator(
+  p_indicator_code text,
+  p_dependances text[],
+  p_methode_calcul text DEFAULT NULL
+)
+RETURNS boolean
+LANGUAGE plpgsql
+AS $$
+DECLARE
+  indicator_formule text;
+BEGIN
+  -- Récupérer la formule de l'indicateur si pas fournie
+  IF p_methode_calcul IS NULL THEN
+    SELECT formule INTO indicator_formule
+    FROM indicators
+    WHERE code = p_indicator_code;
+    
+    p_methode_calcul := COALESCE(indicator_formule, '');
+  END IF;
+  
+  -- Mettre à jour ou insérer la configuration
+  INSERT INTO indicator_dependencies (
+    indicator_code,
+    dependances,
+    methode_calcul,
+    description,
+    is_active
+  )
+  VALUES (
+    p_indicator_code,
+    p_dependances,
+    p_methode_calcul,
+    FORMAT('Configuration manuelle pour %s', p_indicator_code),
+    true
+  )
+  ON CONFLICT (indicator_code) 
+  DO UPDATE SET
+    dependances = EXCLUDED.dependances,
+    methode_calcul = EXCLUDED.methode_calcul,
+    is_active = true,
+    updated_at = CURRENT_TIMESTAMP;
+  
+  RETURN true;
+END;
+$$;
+
+-- Fonction pour voir les indicateurs qui nécessitent une configuration
+CREATE OR REPLACE FUNCTION get_indicators_needing_configuration()
+RETURNS TABLE(
+  indicator_code text,
+  indicator_name text,
+  processus_code text,
+  sites_count bigint,
+  organizations text[]
+) 
+LANGUAGE plpgsql
+AS $$
+BEGIN
+  RETURN QUERY
+  SELECT 
+    i.code as indicator_code,
+    i.name as indicator_name,
+    i.processus_code,
+    COUNT(DISTINCT sp.site_name) as sites_count,
+    array_agg(DISTINCT sp.organization_name) as organizations
+  FROM indicators i
+  JOIN site_processes sp ON sp.processus_code = i.processus_code AND sp.is_active = true
+  JOIN organization_selections os ON os.organization_name = sp.organization_name 
+    AND i.name = ANY(os.indicator_names)
+  LEFT JOIN indicator_dependencies id ON id.indicator_code = i.code AND id.is_active = true
+  WHERE i.formule IS NOT NULL 
+    AND i.formule != ''
+    AND i.formule != 'N/A'
+    AND id.indicator_code IS NULL -- Pas encore configuré
+  GROUP BY i.code, i.name, i.processus_code
+  ORDER BY sites_count DESC, i.name;
+END;
+$$;
+
+-- Exécuter la population automatique
+SELECT 'DÉBUT DE LA POPULATION AUTOMATIQUE' as info;
+SELECT * FROM auto_populate_calculated_indicators();
+
+SELECT 'INDICATEURS NÉCESSITANT UNE CONFIGURATION' as info;
+SELECT * FROM get_indicators_needing_configuration();