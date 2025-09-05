@@ .. @@
 CREATE OR REPLACE FUNCTION update_processus_code_from_indicator_values_direct()
 RETURNS TRIGGER AS $$
 DECLARE
     found_processus_code TEXT;
+    found_filiere_name TEXT;
+    found_filiale_name TEXT;
 BEGIN
     -- Récupérer le processus_code depuis indicator_values en utilisant le code de l'indicateur et le site_name
-    SELECT DISTINCT iv.processus_code
-    INTO found_processus_code
+    SELECT DISTINCT iv.processus_code, iv.filiere_name, iv.filiale_name
+    INTO found_processus_code, found_filiere_name, found_filiale_name
     FROM indicator_values iv
     WHERE iv.indicator_code = NEW.code
       AND iv.site_name = NEW.site_name
       AND iv.processus_code IS NOT NULL
     ORDER BY iv.created_at DESC
     LIMIT 1;
     
-    -- Mettre à jour le processus_code si trouvé
+    -- Mettre à jour les attributs si trouvés
     IF found_processus_code IS NOT NULL THEN
         NEW.processus_code := found_processus_code;
     END IF;
+    
+    IF found_filiere_name IS NOT NULL THEN
+        NEW.filiere_name := found_filiere_name;
+    END IF;
+    
+    IF found_filiale_name IS NOT NULL THEN
+        NEW.filiale_name := found_filiale_name;
+    END IF;
     
     RETURN NEW;
 END;
@@ .. @@
 CREATE OR REPLACE FUNCTION sync_all_processus_codes_from_indicator_values_direct()
 RETURNS INTEGER AS $$
 DECLARE
     rec RECORD;
     found_processus_code TEXT;
+    found_filiere_name TEXT;
+    found_filiale_name TEXT;
     update_count INTEGER := 0;
 BEGIN
     -- Parcourir toutes les lignes de site_global_indicator_values_simple
     FOR rec IN 
         SELECT id, code, site_name, processus_code, filiere_name, filiale_name
         FROM site_global_indicator_values_simple
     LOOP
-        -- Récupérer le processus_code depuis indicator_values
-        SELECT DISTINCT iv.processus_code
-        INTO found_processus_code
+        -- Récupérer les attributs depuis indicator_values
+        SELECT DISTINCT iv.processus_code, iv.filiere_name, iv.filiale_name
+        INTO found_processus_code, found_filiere_name, found_filiale_name
         FROM indicator_values iv
         WHERE iv.indicator_code = rec.code
           AND iv.site_name = rec.site_name
           AND iv.processus_code IS NOT NULL
         ORDER BY iv.created_at DESC
         LIMIT 1;
         
-        -- Mettre à jour si le processus_code a changé
-        IF found_processus_code IS NOT NULL AND (rec.processus_code IS NULL OR rec.processus_code != found_processus_code) THEN
+        -- Mettre à jour si les attributs ont changé
+        IF (found_processus_code IS NOT NULL AND (rec.processus_code IS NULL OR rec.processus_code != found_processus_code)) OR
+           (found_filiere_name IS NOT NULL AND (rec.filiere_name IS NULL OR rec.filiere_name != found_filiere_name)) OR
+           (found_filiale_name IS NOT NULL AND (rec.filiale_name IS NULL OR rec.filiale_name != found_filiale_name)) THEN
+           
             UPDATE site_global_indicator_values_simple
-            SET processus_code = found_processus_code
+            SET processus_code = COALESCE(found_processus_code, processus_code),
+                filiere_name = COALESCE(found_filiere_name, filiere_name),
+                filiale_name = COALESCE(found_filiale_name, filiale_name)
             WHERE id = rec.id;
             
             update_count := update_count + 1;
         END IF;
     END LOOP;
     
     RETURN update_count;
 END;