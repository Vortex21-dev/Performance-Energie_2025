/*
  # Update Industrie sector standards and issues relationships

  1. Changes
    - Clear existing relationships
    - Create specific mappings between standards and issues
    - Apply relationships for all energy types in Industrie sector
    
  2. Security
    - Maintains existing RLS policies
*/

-- Clear existing relationships for Industrie sector
DELETE FROM sector_standards_issues_criteria_indicator
WHERE sector_name = 'Industrie';

DELETE FROM sector_standards_issues_criteria
WHERE sector_name = 'Industrie';

DELETE FROM sector_standards_issues
WHERE sector_name = 'Industrie';

-- Insert new relationships between standards and issues
WITH standard_issue_mapping AS (
  SELECT * FROM (
    VALUES
      -- Contexte, domaine d'application et SER
      ('ISO 50001', 'Contexte, dommaine d''application et Situation Energetique de reference (SER)'),
      ('ISO 50004', 'Contexte, dommaine d''application et Situation Energetique de reference (SER)'),
      ('ISO 50006', 'Contexte, dommaine d''application et Situation Energetique de reference (SER)'),
      ('BP X-30 120', 'Contexte, dommaine d''application et Situation Energetique de reference (SER)'),
      
      -- Risques, impacts et opportunités
      ('ISO 50001', 'Risques, impacts et opportunités'),
      ('ISO 50004', 'Risques, impacts et opportunités'),
      
      -- Parties intéressées et exigences
      ('ISO 50001', 'Parties intéressées et exigences'),
      
      -- Leadership et politique
      ('ISO 50001', 'Leadership et politique'),
      ('ISO 50004', 'Leadership et politique'),
      ('BP X-30 120', 'Leadership et politique'),
      
      -- Ressources, achats et services énergétiques
      ('ISO 50001', 'Ressources, achats et services énergétiques'),
      
      -- Compétences, communication et sensibilisation
      ('ISO 50001', 'Compétences, communication et sensibilisations'),
      ('ISO 50004', 'Compétences, communication et sensibilisations'),
      ('ISO 50003', 'Compétences, communication et sensibilisations'),
      
      -- SMé, processus et informations documentées
      ('ISO 50001', 'SMé, processus et infirmations documentées'),
      ('ISO 50004', 'SMé, processus et infirmations documentées'),
      
      -- Objectifs, cibles et planifications
      ('ISO 50001', 'Objectifs, cibles et planifications'),
      ('ISO 50004', 'Objectifs, cibles et planifications'),
      ('ISO 50006', 'Objectifs, cibles et planifications'),
      ('EN 16231', 'Objectifs, cibles et planifications'),
      
      -- Installations, équipements, usages significatifs
      ('ISO 50001', 'Installations, équipements, usages énergétiques significatifs, conception et modifications'),
      ('EN 16247-1', 'Installations, équipements, usages énergétiques significatifs, conception et modifications'),
      ('EN 16247-3', 'Installations, équipements, usages énergétiques significatifs, conception et modifications'),
      
      -- IPE, Données énergétiques, Mesure et analyse
      ('ISO 50001', 'Indicateurs de performance énergetique (IPE), Données énergétiques, Mesure et analyse'),
      ('ISO 50004', 'Indicateurs de performance énergetique (IPE), Données énergétiques, Mesure et analyse'),
      ('ISO 50006', 'Indicateurs de performance énergetique (IPE), Données énergétiques, Mesure et analyse'),
      ('EN 16247-1', 'Indicateurs de performance énergetique (IPE), Données énergétiques, Mesure et analyse'),
      ('EN 16247-3', 'Indicateurs de performance énergetique (IPE), Données énergétiques, Mesure et analyse'),
      ('EN 16231', 'Indicateurs de performance énergetique (IPE), Données énergétiques, Mesure et analyse'),
      
      -- Revue énergétique, Audit et revue de management
      ('ISO 50001', 'Revue énergétique, Audit et revue de management énergétique'),
      ('ISO 50003', 'Revue énergétique, Audit et revue de management énergétique'),
      ('ISO 50004', 'Revue énergétique, Audit et revue de management énergétique'),
      ('EN 16247-1', 'Revue énergétique, Audit et revue de management énergétique'),
      ('EN 16247-3', 'Revue énergétique, Audit et revue de management énergétique'),
      ('EN 16231', 'Revue énergétique, Audit et revue de management énergétique'),
      
      -- NC, AC et Amélioration
      ('ISO 50001', 'Non conformités (NC), Actions correctives (AC) et Amélioration'),
      ('ISO 50003', 'Non conformités (NC), Actions correctives (AC) et Amélioration'),
      ('ISO 50004', 'Non conformités (NC), Actions correctives (AC) et Amélioration'),
      ('EN 16247-1', 'Non conformités (NC), Actions correctives (AC) et Amélioration'),
      ('EN 16247-3', 'Non conformités (NC), Actions correctives (AC) et Amélioration')
  ) AS t(standard_name, issue_name)
)
INSERT INTO sector_standards_issues (
  sector_name,
  energy_type_name,
  standard_name,
  issue_name
)
SELECT DISTINCT
  'Industrie' as sector_name,
  et.name as energy_type_name,
  sim.standard_name,
  sim.issue_name
FROM energy_types et
CROSS JOIN standard_issue_mapping sim
WHERE et.sector_name = 'Industrie'
  AND EXISTS (
    SELECT 1 
    FROM sector_standards ss 
    WHERE ss.sector_name = 'Industrie' 
      AND ss.energy_type_name = et.name 
      AND ss.standard_name = sim.standard_name
  )
ON CONFLICT (sector_name, energy_type_name, standard_name, issue_name) DO NOTHING;