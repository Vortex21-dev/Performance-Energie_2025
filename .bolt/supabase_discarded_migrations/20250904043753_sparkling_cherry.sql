@@ .. @@
   RETURN NEW;
 END;
 $$ LANGUAGE plpgsql;
+
+-- Fonction pour récupérer et insérer les indicateurs calculés depuis la table indicators
+CREATE OR REPLACE FUNCTION populate_calculated_indicators_from_indicators()
+RETURNS TABLE(
+  indicator_code text,
+  indicator_name text,
+  formula text,
+  status text
+) AS $$
+BEGIN
+  -- Insérer les indicateurs qui ont une formule définie dans la table indicators
+  INSERT INTO indicator_dependencies (
+    indicator_code,
+    dependances,
+    methode_calcul,
+    description,
+    is_active
+  )
+  SELECT 
+    i.code,
+    ARRAY[]::text[], -- Dépendances vides par défaut, à configurer manuellement
+    COALESCE(i.formule, 'À définir'), -- Utilise la formule de la table indicators
+    CONCAT('Indicateur calculé: ', i.name),
+    true
+  FROM indicators i
+  WHERE i.formule IS NOT NULL 
+    AND i.formule != ''
+    AND NOT EXISTS (
+      SELECT 1 FROM indicator_dependencies id 
+      WHERE id.indicator_code = i.code
+    );
+
+  -- Retourner les indicateurs traités
+  RETURN QUERY
+  SELECT 
+    i.code as indicator_code,
+    i.name as indicator_name,
+    COALESCE(i.formule, 'Aucune formule') as formula,
+    CASE 
+      WHEN EXISTS (SELECT 1 FROM indicator_dependencies id WHERE id.indicator_code = i.code)
+      THEN 'Configuré'
+      ELSE 'Non configuré'
+    END as status
+  FROM indicators i
+  WHERE i.formule IS NOT NULL AND i.formule != ''
+  ORDER BY i.name;
+END;
+$$ LANGUAGE plpgsql;
+
+-- Fonction pour mettre à jour les dépendances d'un indicateur calculé
+CREATE OR REPLACE FUNCTION update_indicator_dependencies(
+  p_indicator_code text,
+  p_dependances text[],
+  p_methode_calcul text DEFAULT NULL
+)
+RETURNS boolean AS $$
+DECLARE
+  v_formula text;
+BEGIN
+  -- Récupérer la formule depuis la table indicators si pas fournie
+  IF p_methode_calcul IS NULL THEN
+    SELECT formule INTO v_formula
+    FROM indicators 
+    WHERE code = p_indicator_code;
+    
+    IF v_formula IS NULL OR v_formula = '' THEN
+      RAISE EXCEPTION 'Aucune formule trouvée pour l''indicateur %', p_indicator_code;
+    END IF;
+  ELSE
+    v_formula := p_methode_calcul;
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
+    v_formula,
+    (SELECT CONCAT('Indicateur calculé: ', name) FROM indicators WHERE code = p_indicator_code),
+    true
+  )
+  ON CONFLICT (indicator_code) 
+  DO UPDATE SET
+    dependances = EXCLUDED.dependances,
+    methode_calcul = EXCLUDED.methode_calcul,
+    updated_at = now();
+
+  RETURN true;
+END;
+$$ LANGUAGE plpgsql;
+
+-- Fonction pour obtenir les indicateurs calculés non configurés
+CREATE OR REPLACE FUNCTION get_unconfigured_calculated_indicators()
+RETURNS TABLE(
+  indicator_code text,
+  indicator_name text,
+  formula text,
+  processus_code text
+) AS $$
+BEGIN
+  RETURN QUERY
+  SELECT 
+    i.code,
+    i.name,
+    COALESCE(i.formule, 'Aucune formule'),
+    COALESCE(i.processus_code, 'Non défini')
+  FROM indicators i
+  WHERE i.formule IS NOT NULL 
+    AND i.formule != ''
+    AND NOT EXISTS (
+      SELECT 1 FROM indicator_dependencies id 
+      WHERE id.indicator_code = i.code
+    )
+  ORDER BY i.name;
+END;
+$$ LANGUAGE plpgsql;
 
 -- Exécuter la population initiale des indicateurs calculés
-SELECT * FROM populate_calculated_indicators_from_indicators();