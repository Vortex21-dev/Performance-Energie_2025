@@ .. @@
 /*
   # Mettre à jour processus_code depuis indicator_values
 
   1. Fonctions
-    - `update_processus_code_from_indicator_values_direct()` : Met à jour le processus_code depuis indicator_values
-    - `sync_all_processus_codes_from_indicator_values_direct()` : Synchronise toutes les données existantes
+    - `update_processus_code_from_indicator_values_direct()` : Met à jour le processus_code, filiere_name et filiale_name depuis indicator_values
+    - `sync_all_processus_codes_from_indicator_values_direct()` : Synchronise toutes les données existantes avec structure organisationnelle
   2. Triggers
-    - Trigger automatique pour mettre à jour processus_code lors des insertions/mises à jour
+    - Trigger automatique pour mettre à jour processus_code, filiere_name et filiale_name lors des insertions/mises à jour
   3. Synchronisation
     - Mise à jour de toutes les données existantes
 */
 
 -- Fonction pour mettre à jour le processus_code depuis indicator_values
 CREATE OR REPLACE FUNCTION update_processus_code_from_indicator_values_direct()
 RETURNS TRIGGER AS $$
 DECLARE
   found_processus_code TEXT;
+  found_filiere_name TEXT;
+  found_filiale_name TEXT;
 BEGIN
-  -- Récupérer le processus_code depuis indicator_values
+  -- Récupérer le processus_code, filiere_name et filiale_name depuis indicator_values
   SELECT DISTINCT 
-    iv.processus_code
+    iv.processus_code,
+    iv.filiere_name,
+    iv.filiale_name
   INTO 
-    found_processus_code
+    found_processus_code,
+    found_filiere_name,
+    found_filiale_name
   FROM indicator_values iv
   WHERE iv.indicator_code = NEW.code
     AND iv.site_name = NEW.site_name
     AND iv.processus_code IS NOT NULL
   ORDER BY iv.created_at DESC
   LIMIT 1;
   
-  -- Mettre à jour le processus_code si trouvé
+  -- Mettre à jour le processus_code, filiere_name et filiale_name si trouvés
   IF found_processus_code IS NOT NULL THEN
     NEW.processus_code := found_processus_code;
   END IF;
+  
+  IF found_filiere_name IS NOT NULL THEN
+    NEW.filiere_name := found_filiere_name;
+  END IF;
+  
+  IF found_filiale_name IS NOT NULL THEN
+    NEW.filiale_name := found_filiale_name;
+  END IF;
   
   RETURN NEW;
 END;
 $$ LANGUAGE plpgsql;
 
 -- Fonction pour synchroniser toutes les données existantes
 CREATE OR REPLACE FUNCTION sync_all_processus_codes_from_indicator_values_direct()
 RETURNS INTEGER AS $$
 DECLARE
   rec RECORD;
   found_processus_code TEXT;
+  found_filiere_name TEXT;
+  found_filiale_name TEXT;
   updated_count INTEGER := 0;
 BEGIN
   -- Parcourir toutes les lignes de site_global_indicator_values_simple
   FOR rec IN 
     SELECT id, code, site_name, processus_code, filiere_name, filiale_name
     FROM site_global_indicator_values_simple
   LOOP
-    -- Récupérer le processus_code depuis indicator_values
+    -- Récupérer le processus_code, filiere_name et filiale_name depuis indicator_values
     SELECT DISTINCT 
-      iv.processus_code
+      iv.processus_code,
+      iv.filiere_name,
+      iv.filiale_name
     INTO 
-      found_processus_code
+      found_processus_code,
+      found_filiere_name,
+      found_filiale_name
     FROM indicator_values iv
     WHERE iv.indicator_code = rec.code
       AND iv.site_name = rec.site_name
       AND iv.processus_code IS NOT NULL
     ORDER BY iv.created_at DESC
     LIMIT 1;
     
-    -- Mettre à jour si nécessaire
-    IF found_processus_code IS NOT NULL AND 
-       (rec.processus_code IS NULL OR rec.processus_code != found_processus_code) THEN
+    -- Mettre à jour si nécessaire
+    IF (found_processus_code IS NOT NULL AND 
+        (rec.processus_code IS NULL OR rec.processus_code != found_processus_code)) OR
+       (found_filiere_name IS NOT NULL AND 
+        (rec.filiere_name IS NULL OR rec.filiere_name != found_filiere_name)) OR
+       (found_filiale_name IS NOT NULL AND 
+        (rec.filiale_name IS NULL OR rec.filiale_name != found_filiale_name)) THEN
       
       UPDATE site_global_indicator_values_simple
-      SET processus_code = found_processus_code
+      SET 
+        processus_code = COALESCE(found_processus_code, processus_code),
+        filiere_name = COALESCE(found_filiere_name, filiere_name),
+        filiale_name = COALESCE(found_filiale_name, filiale_name)
       WHERE id = rec.id;
       
       updated_count := updated_count + 1;
     END IF;
     
-    -- Reset pour la prochaine itération
+    -- Reset pour la prochaine itération
     found_processus_code := NULL;
+    found_filiere_name := NULL;
+    found_filiale_name := NULL;
   END LOOP;
   
   RETURN updated_count;
 END;
 $$ LANGUAGE plpgsql;
 
 -- Supprimer l'ancien trigger s'il existe
 DROP TRIGGER IF EXISTS trigger_update_processus_code ON site_global_indicator_values_simple;
 
 -- Créer le nouveau trigger
 CREATE TRIGGER trigger_update_processus_code_from_indicator_values
   BEFORE INSERT OR UPDATE OF code, site_name ON site_global_indicator_values_simple
   FOR EACH ROW
   EXECUTE FUNCTION update_processus_code_from_indicator_values_direct();
 
 -- Synchroniser toutes les données existantes
 DO $$
 DECLARE
   updated_rows INTEGER;
 BEGIN
   SELECT sync_all_processus_codes_from_indicator_values_direct() INTO updated_rows;
-  RAISE NOTICE 'Synchronisation terminée. % lignes mises à jour avec processus_code depuis indicator_values.', updated_rows;
+  RAISE NOTICE 'Synchronisation terminée. % lignes mises à jour avec processus_code, filiere_name et filiale_name depuis indicator_values.', updated_rows;
 END $$;