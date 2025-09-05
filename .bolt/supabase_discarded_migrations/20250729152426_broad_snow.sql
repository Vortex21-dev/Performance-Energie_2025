/*
  # Correction de la synchronisation site_global_indicator_values_simple

  1. Logique corrigée
    - Basée sur la correspondance site_name + processus_code entre site_processes et site_global_indicator_values_simple
    - Remplissage des indicateurs selon les processus réellement assignés aux sites
    - Mise à jour automatique lors des changements

  2. Fonctions
    - sync_site_indicators_based_on_site_processes() : Synchronisation complète
    - sync_indicators_for_site_process() : Synchronisation pour un site-processus spécifique
    - update_site_indicators_on_site_process_change() : Trigger sur site_processes

  3. Triggers
    - Sur site_processes : mise à jour automatique
    - Sur indicators : mise à jour des informations
*/

-- Supprimer les anciennes fonctions et triggers
DROP TRIGGER IF EXISTS trigger_site_created ON sites;
DROP TRIGGER IF EXISTS trigger_processus_created ON processus;
DROP TRIGGER IF EXISTS update_site_processes_updated_at ON site_processes;
DROP FUNCTION IF EXISTS trigger_populate_site_processes();
DROP FUNCTION IF EXISTS trigger_populate_sites_with_processus();
DROP FUNCTION IF EXISTS sync_site_indicators_for_site(text);
DROP FUNCTION IF EXISTS sync_all_site_indicators();

-- Fonction pour synchroniser les indicateurs d'un site-processus spécifique
CREATE OR REPLACE FUNCTION sync_indicators_for_site_process(
  p_site_name text,
  p_processus_code text,
  p_organization_name text
) RETURNS void AS $$
BEGIN
  -- Supprimer les indicateurs existants pour ce site-processus
  DELETE FROM site_global_indicator_values_simple 
  WHERE site_name = p_site_name 
    AND processus_code = p_processus_code
    AND organization_name = p_organization_name;
  
  -- Ajouter les indicateurs du processus pour ce site
  INSERT INTO site_global_indicator_values_simple (
    site_name,
    year,
    code,
    axe_energetique,
    enjeux,
    normes,
    critere,
    indicateur,
    definition,
    processus,
    processus_code,
    frequence,
    unite,
    type,
    formule,
    organization_name,
    filiere_name,
    filiale_name
  )
  SELECT DISTINCT
    p_site_name,
    generate_series(2023, 2025) as year,
    i.code,
    i.axe_energetique,
    i.enjeux,
    i.normes,
    i.critere,
    i.name as indicateur,
    i.description as definition,
    p.name as processus,
    i.processus_code,
    i.frequence,
    i.unit as unite,
    i.type,
    i.formule,
    p_organization_name,
    s.filiere_name,
    s.filiale_name
  FROM indicators i
  JOIN processus p ON p.code = i.processus_code
  JOIN sites s ON s.name = p_site_name
  WHERE i.processus_code = p_processus_code
    AND s.organization_name = p_organization_name;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour synchroniser tous les indicateurs basés sur site_processes
CREATE OR REPLACE FUNCTION sync_site_indicators_based_on_site_processes() RETURNS void AS $$
DECLARE
  site_process_record RECORD;
BEGIN
  -- Vider la table avant de la repeupler
  DELETE FROM site_global_indicator_values_simple;
  
  -- Pour chaque association site-processus active
  FOR site_process_record IN 
    SELECT DISTINCT 
      sp.site_name, 
      sp.processus_code, 
      sp.organization_name
    FROM site_processes sp
    WHERE sp.is_active = true
  LOOP
    -- Synchroniser les indicateurs pour ce site-processus
    PERFORM sync_indicators_for_site_process(
      site_process_record.site_name,
      site_process_record.processus_code,
      site_process_record.organization_name
    );
  END LOOP;
  
  RAISE NOTICE 'Synchronisation terminée pour % associations site-processus', 
    (SELECT COUNT(*) FROM site_processes WHERE is_active = true);
END;
$$ LANGUAGE plpgsql;

-- Fonction trigger pour les changements dans site_processes
CREATE OR REPLACE FUNCTION update_site_indicators_on_site_process_change() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Nouveau site-processus : ajouter les indicateurs
    IF NEW.is_active THEN
      PERFORM sync_indicators_for_site_process(
        NEW.site_name,
        NEW.processus_code,
        NEW.organization_name
      );
    END IF;
    RETURN NEW;
    
  ELSIF TG_OP = 'UPDATE' THEN
    -- Mise à jour : gérer le changement de statut
    IF OLD.is_active != NEW.is_active THEN
      IF NEW.is_active THEN
        -- Activé : ajouter les indicateurs
        PERFORM sync_indicators_for_site_process(
          NEW.site_name,
          NEW.processus_code,
          NEW.organization_name
        );
      ELSE
        -- Désactivé : supprimer les indicateurs
        DELETE FROM site_global_indicator_values_simple 
        WHERE site_name = NEW.site_name 
          AND processus_code = NEW.processus_code
          AND organization_name = NEW.organization_name;
      END IF;
    END IF;
    RETURN NEW;
    
  ELSIF TG_OP = 'DELETE' THEN
    -- Suppression : retirer les indicateurs
    DELETE FROM site_global_indicator_values_simple 
    WHERE site_name = OLD.site_name 
      AND processus_code = OLD.processus_code
      AND organization_name = OLD.organization_name;
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Fonction trigger pour les changements dans indicators
CREATE OR REPLACE FUNCTION update_site_indicators_on_indicator_change() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Nouvel indicateur : l'ajouter aux sites qui ont ce processus
    INSERT INTO site_global_indicator_values_simple (
      site_name,
      year,
      code,
      axe_energetique,
      enjeux,
      normes,
      critere,
      indicateur,
      definition,
      processus,
      processus_code,
      frequence,
      unite,
      type,
      formule,
      organization_name,
      filiere_name,
      filiale_name
    )
    SELECT DISTINCT
      sp.site_name,
      generate_series(2023, 2025) as year,
      NEW.code,
      NEW.axe_energetique,
      NEW.enjeux,
      NEW.normes,
      NEW.critere,
      NEW.name as indicateur,
      NEW.description as definition,
      p.name as processus,
      NEW.processus_code,
      NEW.frequence,
      NEW.unit as unite,
      NEW.type,
      NEW.formule,
      sp.organization_name,
      s.filiere_name,
      s.filiale_name
    FROM site_processes sp
    JOIN processus p ON p.code = sp.processus_code
    JOIN sites s ON s.name = sp.site_name AND s.organization_name = sp.organization_name
    WHERE sp.processus_code = NEW.processus_code
      AND sp.is_active = true;
    RETURN NEW;
    
  ELSIF TG_OP = 'UPDATE' THEN
    -- Mise à jour indicateur : mettre à jour les informations
    UPDATE site_global_indicator_values_simple SET
      axe_energetique = NEW.axe_energetique,
      enjeux = NEW.enjeux,
      normes = NEW.normes,
      critere = NEW.critere,
      indicateur = NEW.name,
      definition = NEW.description,
      frequence = NEW.frequence,
      unite = NEW.unit,
      type = NEW.type,
      formule = NEW.formule,
      updated_at = now()
    WHERE code = NEW.code;
    
    -- Si le processus a changé, resynchroniser
    IF OLD.processus_code != NEW.processus_code THEN
      -- Supprimer de l'ancien processus
      DELETE FROM site_global_indicator_values_simple 
      WHERE code = OLD.code AND processus_code = OLD.processus_code;
      
      -- Ajouter au nouveau processus
      INSERT INTO site_global_indicator_values_simple (
        site_name,
        year,
        code,
        axe_energetique,
        enjeux,
        normes,
        critere,
        indicateur,
        definition,
        processus,
        processus_code,
        frequence,
        unite,
        type,
        formule,
        organization_name,
        filiere_name,
        filiale_name
      )
      SELECT DISTINCT
        sp.site_name,
        generate_series(2023, 2025) as year,
        NEW.code,
        NEW.axe_energetique,
        NEW.enjeux,
        NEW.normes,
        NEW.critere,
        NEW.name as indicateur,
        NEW.description as definition,
        p.name as processus,
        NEW.processus_code,
        NEW.frequence,
        NEW.unit as unite,
        NEW.type,
        NEW.formule,
        sp.organization_name,
        s.filiere_name,
        s.filiale_name
      FROM site_processes sp
      JOIN processus p ON p.code = sp.processus_code
      JOIN sites s ON s.name = sp.site_name AND s.organization_name = sp.organization_name
      WHERE sp.processus_code = NEW.processus_code
        AND sp.is_active = true;
    END IF;
    RETURN NEW;
    
  ELSIF TG_OP = 'DELETE' THEN
    -- Suppression indicateur : le retirer de tous les sites
    DELETE FROM site_global_indicator_values_simple WHERE code = OLD.code;
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Créer les triggers
CREATE TRIGGER trigger_site_process_change
  AFTER INSERT OR UPDATE OR DELETE ON site_processes
  FOR EACH ROW EXECUTE FUNCTION update_site_indicators_on_site_process_change();

CREATE TRIGGER trigger_indicator_change
  AFTER INSERT OR UPDATE OR DELETE ON indicators
  FOR EACH ROW EXECUTE FUNCTION update_site_indicators_on_indicator_change();

-- Trigger pour mettre à jour updated_at sur site_processes
CREATE OR REPLACE FUNCTION update_site_processes_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_site_processes_updated_at
  BEFORE UPDATE ON site_processes
  FOR EACH ROW EXECUTE FUNCTION update_site_processes_updated_at();

-- Exécuter la synchronisation initiale
SELECT sync_site_indicators_based_on_site_processes();

-- Fonction utilitaire pour vérifier l'état
CREATE OR REPLACE FUNCTION check_site_indicators_sync() RETURNS TABLE(
  site_name text,
  processus_count bigint,
  indicator_count bigint,
  years_covered text[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sp.site_name,
    COUNT(DISTINCT sp.processus_code) as processus_count,
    COUNT(DISTINCT sgi.code) as indicator_count,
    ARRAY_AGG(DISTINCT sgi.year::text ORDER BY sgi.year::text) as years_covered
  FROM site_processes sp
  LEFT JOIN site_global_indicator_values_simple sgi 
    ON sp.site_name = sgi.site_name 
    AND sp.processus_code = sgi.processus_code
    AND sp.organization_name = sgi.organization_name
  WHERE sp.is_active = true
  GROUP BY sp.site_name
  ORDER BY sp.site_name;
END;
$$ LANGUAGE plpgsql;