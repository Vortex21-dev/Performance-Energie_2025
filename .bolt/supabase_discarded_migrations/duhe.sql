/*
  # Trigger pour supprimer automatiquement les indicateurs non sélectionnés

  1. Objectif
    - Vérifier à chaque insertion si l'indicateur est dans organization_selections
    - Si OUI : compléter les métadonnées et garder la ligne
    - Si NON : supprimer automatiquement la ligne
    - Maintenir la cohérence en temps réel

  2. Fonctionnement
    - BEFORE INSERT/UPDATE : Validation et suppression ou completion
    - AFTER INSERT/UPDATE/DELETE : Mise à jour de la table consolidée
*/

-- Supprimer les anciens triggers
DROP TRIGGER IF EXISTS trigger_validate_and_complete_indicator ON site_global_indicator_values_simple;
DROP TRIGGER IF EXISTS trigger_update_consolidated_indicators ON site_global_indicator_values_simple;

-- Supprimer les fonctions si elles existent
DROP FUNCTION IF EXISTS validate_and_complete_indicator();
DROP FUNCTION IF EXISTS update_consolidated_indicators();

-- Fonction pour valider et compléter ou supprimer
CREATE OR REPLACE FUNCTION validate_and_complete_indicator()
RETURNS TRIGGER AS $$
DECLARE
    metadata_record RECORD;
    is_selected BOOLEAN := FALSE;
BEGIN
    -- 1. Vérifier si l'indicateur est sélectionné pour l'organisation
    IF NEW.organization_name IS NOT NULL AND NEW.indicateur IS NOT NULL THEN
        SELECT EXISTS (
            SELECT 1 
            FROM organization_selections os
            WHERE os.organization_name = NEW.organization_name
            AND NEW.indicateur = ANY(os.indicator_names)
        ) INTO is_selected;

        IF NOT is_selected THEN
            RAISE NOTICE 'Indicateur "%" supprimé automatiquement pour l''organisation "%" (non sélectionné)', 
                NEW.indicateur, NEW.organization_name;
            RETURN NULL;
        END IF;
    END IF;

    -- 2. Compléter les métadonnées
    IF NEW.organization_name IS NOT NULL AND NEW.code IS NOT NULL THEN
        SELECT 
            COALESCE(iss.axe_energetique, i.axe_energetique) as axe_energetique,
            COALESCE(ssici.issue_name, i.enjeux) as enjeux,
            COALESCE(ssici.standard_name, i.normes) as normes,
            COALESCE(ssici.criteria_name, i.critere) as critere,
            COALESCE(i.name, NEW.indicateur) as indicateur,
            i.description as definition,
            p.name as processus,
            i.processus_code,
            COALESCE(i.frequence, 'Mensuelle') as frequence,
            i.unit as unite,
            i.type,
            i.formule
        INTO metadata_record
        FROM indicators i
        LEFT JOIN organization_selections os ON os.organization_name = NEW.organization_name
        LEFT JOIN sector_standards_issues_criteria_indicators ssici 
            ON ssici.sector_name = os.sector_name 
            AND ssici.energy_type_name = os.energy_type_name
            AND i.code = ANY(ssici.indicator_codes)
        LEFT JOIN issues iss ON iss.name = ssici.issue_name
        LEFT JOIN processus p ON p.code = i.processus_code
        WHERE i.code = NEW.code
        LIMIT 1;

        IF metadata_record IS NOT NULL THEN
            NEW.axe_energetique = COALESCE(NEW.axe_energetique, metadata_record.axe_energetique);
            NEW.enjeux = COALESCE(NEW.enjeux, metadata_record.enjeux);
            NEW.normes = COALESCE(NEW.normes, metadata_record.normes);
            NEW.critere = COALESCE(NEW.critere, metadata_record.critere);
            NEW.indicateur = COALESCE(NEW.indicateur, metadata_record.indicateur);
            NEW.definition = COALESCE(NEW.definition, metadata_record.definition);
            NEW.processus = COALESCE(NEW.processus, metadata_record.processus);
            NEW.processus_code = COALESCE(NEW.processus_code, metadata_record.processus_code);
            NEW.frequence = COALESCE(NEW.frequence, metadata_record.frequence);
            NEW.unite = COALESCE(NEW.unite, metadata_record.unite);
            NEW.type = COALESCE(NEW.type, metadata_record.type);
            NEW.formule = COALESCE(NEW.formule, metadata_record.formule);

            RAISE NOTICE 'Indicateur "%" validé et métadonnées complétées pour l''organisation "%"', 
                NEW.indicateur, NEW.organization_name;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Fonction pour mettre à jour la table consolidée
CREATE OR REPLACE FUNCTION update_consolidated_indicators()
RETURNS TRIGGER AS $$
DECLARE
    target_org TEXT;
    target_filiere TEXT;
    target_filiale TEXT;
    target_code TEXT;
    target_year INTEGER;
BEGIN
    IF TG_OP = 'DELETE' THEN
        target_org = OLD.organization_name;
        target_filiere = OLD.filiere_name;
        target_filiale = OLD.filiale_name;
        target_code = OLD.code;
        target_year = OLD.year;
    ELSE
        target_org = NEW.organization_name;
        target_filiere = NEW.filiere_name;
        target_filiale = NEW.filiale_name;
        target_code = NEW.code;
        target_year = NEW.year;
    END IF;

    DELETE FROM consolidated_global_indicator_values
    WHERE indicator_code = target_code
      AND year = target_year
      AND organization_name = target_org
      AND COALESCE(filiere_name, '') = COALESCE(target_filiere, '')
      AND COALESCE(filiale_name, '') = COALESCE(target_filiale, '');

    IF TG_OP != 'DELETE' THEN
        INSERT INTO consolidated_global_indicator_values (
            organization_name, filiere_name, filiale_name, indicator_code, year,
            site_names, axe_energetique, enjeux, normes, critere, indicateur,
            definition, processus, processus_code, frequence, unite, type, formule,
            value, valeur_precedente, cible, variation,
            janvier, fevrier, mars, avril, mai, juin, juillet, aout, septembre,
            octobre, novembre, decembre,
            variations_pourcent, performances_pourcent
        )
        SELECT
            s.organization_name,
            s.filiere_name,
            s.filiale_name,
            s.code,
            s.year,
            array_agg(DISTINCT s.site_name ORDER BY s.site_name),
            s.axe_energetique, s.enjeux, s.normes, s.critere, s.indicateur,
            s.definition, s.processus, s.processus_code,
            s.frequence, s.unite, s.type, s.formule,
            AVG(s.value), AVG(s.valeur_precedente), AVG(s.cible), s.variation,
            AVG(s.janvier), AVG(s.fevrier), AVG(s.mars), AVG(s.avril), AVG(s.mai),
            AVG(s.juin), AVG(s.juillet), AVG(s.aout), AVG(s.septembre),
            AVG(s.octobre), AVG(s.novembre), AVG(s.decembre),
            AVG(s.variations_pourcent), AVG(s.performances_pourcent)
        FROM site_global_indicator_values_simple s
        WHERE s.code = target_code
          AND s.year = target_year
          AND s.organization_name = target_org
          AND COALESCE(s.filiere_name, '') = COALESCE(target_filiere, '')
          AND COALESCE(s.filiale_name, '') = COALESCE(target_filiale, '')
        GROUP BY
            s.organization_name, s.filiere_name, s.filiale_name, s.code, s.year,
            s.axe_energetique, s.enjeux, s.normes, s.critere, s.indicateur,
            s.definition, s.processus, s.processus_code,
            s.frequence, s.unite, s.type, s.formule, s.variation;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Re-créer les triggers
CREATE TRIGGER trigger_validate_and_complete_indicator
    BEFORE INSERT OR UPDATE ON site_global_indicator_values_simple
    FOR EACH ROW
    EXECUTE FUNCTION validate_and_complete_indicator();

CREATE TRIGGER trigger_update_consolidated_indicators
    AFTER INSERT OR UPDATE OR DELETE ON site_global_indicator_values_simple
    FOR EACH ROW
    EXECUTE FUNCTION update_consolidated_indicators();
