@@ .. @@
 SELECT * FROM get_calculated_indicators_summary();

+-- Fonction principale pour peupler calculated_indicators basée sur site_processes
+CREATE OR REPLACE FUNCTION populate_calculated_indicators_from_site_processes()
+RETURNS TABLE(
+  site_name text,
+  organization_name text,
+  indicator_code text,
+  processus_code text,
+  status text,
+  message text
+) 
+LANGUAGE plpgsql
+AS $$
+DECLARE
+  site_process_record RECORD;
+  indicator_record RECORD;
+  dependency_record RECORD;
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
+    -- Si aucun indicateur sélectionné, passer au suivant
+    IF array_length(org_indicators, 1) IS NULL THEN
+      site_name := site_process_record.site_name;
+      organization_name := site_process_record.organization_name;
+      indicator_code := NULL;
+      processus_code := site_process_record.processus_code;
+      status := 'SKIPPED';
+      message := 'Aucun indicateur sélectionné pour cette organisation';
+      RETURN NEXT;
+      CONTINUE;
+    END IF;
+    
+    -- Pour chaque indicateur calculé du processus
+    FOR indicator_record IN
+      SELECT i.code, i.name, i.formule
+      FROM indicators i
+      WHERE i.processus_code = site_process_record.processus_code
+        AND i.formule IS NOT NULL 
+        AND i.formule != ''
+        AND i.name = ANY(org_indicators) -- Vérifier que l'indicateur fait partie des sélections
+    LOOP
+      -- Récupérer la configuration de dépendances
+      SELECT * INTO dependency_record
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
+            dependency_record.dependances,
+            COALESCE(dependency_record.methode_calcul, indicator_record.formule),
+            NULL, -- Valeur sera calculée plus tard
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
+        processus_code := site_process_record.processus_code;
+        status := 'SUCCESS';
+        message := 'Indicateur calculé ajouté pour 12 mois avec dépendances configurées';
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
+          ARRAY[]::text[], -- Dépendances vides - à configurer manuellement
+          indicator_record.formule,
+          'Configuration automatique depuis la table indicators - dépendances à définir',
+          false -- Inactif jusqu'à configuration des dépendances
+        )
+        ON CONFLICT (indicator_code) DO NOTHING;
+        
+        -- Retourner le statut d'avertissement
+        site_name := site_process_record.site_name;
+        organization_name := site_process_record.organization_name;
+        indicator_code := indicator_record.code;
+        processus_code := site_process_record.processus_code;
+        status := 'NEEDS_CONFIG';
+        message := 'Indicateur trouvé mais dépendances à configurer manuellement';
+        RETURN NEXT;
+      END IF;
+    END LOOP;
+  END LOOP;
+  
+  RETURN;
+END;
+$$;
+
+-- Fonction pour configurer les dépendances d'un indicateur et activer le calcul
+CREATE OR REPLACE FUNCTION configure_indicator_dependencies(
+  p_indicator_code text,
+  p_dependances text[],
+  p_methode_calcul text DEFAULT NULL
+)
+RETURNS boolean
+LANGUAGE plpgsql
+AS $$
+DECLARE
+  existing_formula text;
+BEGIN
+  -- Récupérer la formule existante si pas fournie
+  IF p_methode_calcul IS NULL THEN
+    SELECT formule INTO existing_formula
+    FROM indicators
+    WHERE code = p_indicator_code;
+    
+    p_methode_calcul := existing_formula;
+  END IF;
+  
+  -- Mettre à jour la configuration
+  UPDATE indicator_dependencies
+  SET 
+    dependances = p_dependances,
+    methode_calcul = p_methode_calcul,
+    is_active = true,
+    updated_at = CURRENT_TIMESTAMP
+  WHERE indicator_code = p_indicator_code;
+  
+  -- Si pas trouvé, créer la configuration
+  IF NOT FOUND THEN
+    INSERT INTO indicator_dependencies (
+      indicator_code,
+      dependances,
+      methode_calcul,
+      description,
+      is_active
+    )
+    VALUES (
+      p_indicator_code,
+      p_dependances,
+      p_methode_calcul,
+      'Configuration manuelle des dépendances',
+      true
+    );
+  END IF;
+  
+  -- Mettre à jour tous les enregistrements calculated_indicators correspondants
+  UPDATE calculated_indicators
+  SET 
+    dependances = p_dependances,
+    methode_calcul = p_methode_calcul,
+    updated_at = CURRENT_TIMESTAMP
+  WHERE indicator_code = p_indicator_code;
+  
+  RETURN true;
+END;
+$$;
+
+-- Fonction pour obtenir les indicateurs qui nécessitent une configuration
+CREATE OR REPLACE FUNCTION get_indicators_needing_configuration()
+RETURNS TABLE(
+  indicator_code text,
+  indicator_name text,
+  current_formula text,
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
+    i.formule as current_formula,
+    COUNT(DISTINCT ci.site_name) as sites_count,
+    array_agg(DISTINCT ci.organization_name) as organizations
+  FROM indicators i
+  LEFT JOIN calculated_indicators ci ON ci.indicator_code = i.code
+  LEFT JOIN indicator_dependencies id ON id.indicator_code = i.code
+  WHERE i.formule IS NOT NULL 
+    AND i.formule != ''
+    AND (id.is_active = false OR id.is_active IS NULL)
+  GROUP BY i.code, i.name, i.formule
+  ORDER BY i.name;
+END;
+$$;
+
+-- Exécuter la population automatique
+SELECT 'Population des indicateurs calculés basée sur site_processes:' as info;
+SELECT * FROM populate_calculated_indicators_from_site_processes();
+
+-- Afficher les indicateurs qui nécessitent une configuration
+SELECT 'Indicateurs nécessitant une configuration de dépendances:' as info;
+SELECT * FROM get_indicators_needing_configuration();