/*
  # Fix Transport sector relationships

  1. Changes
    - Ensure Transport sector exists
    - Add energy types for Transport sector
    - Create relationships with standards and issues
*/

-- First, ensure Transport sector exists
INSERT INTO sectors (name)
VALUES ('Transport')
ON CONFLICT (name) DO NOTHING;

-- Add energy types for Transport sector
INSERT INTO energy_types (name, sector_name)
VALUES 
  ('Énergies Fossiles', 'Transport'),
  ('Énergies Renouvelables', 'Transport')
ON CONFLICT (name, sector_name) DO NOTHING;

-- Add standards for Transport sector
INSERT INTO sector_standards (sector_name, energy_type_name, standard_name)
SELECT 
  'Transport',
  et.name,
  s.name
FROM energy_types et
CROSS JOIN (
  VALUES 
    ('EN 16247-1'),
    ('EN 16247-4'),
    ('BP X-30 120'),
    ('ISO 50001'),
    ('ISO 50003'),
    ('ISO 50004'),
    ('ISO 50006'),
    ('EN 16231')
) as s(name)
WHERE et.sector_name = 'Transport'
ON CONFLICT (sector_name, energy_type_name, standard_name) DO NOTHING;

-- Add issues for Transport sector standards
INSERT INTO sector_standards_issues (
  sector_name,
  energy_type_name,
  standard_name,
  issue_name
)
SELECT DISTINCT
  ss.sector_name,
  ss.energy_type_name,
  ss.standard_name,
  i.name as issue_name
FROM sector_standards ss
CROSS JOIN (
  VALUES 
    ('Contexte, dommaine d''application et Situation Energetique de reference (SER)'),
    ('Risques, impacts et opportunités'),
    ('Parties intéressées et exigences'),
    ('Leadership et politique'),
    ('Ressources, achats et services énergétiques'),
    ('Compétences, communication et sensibilisations'),
    ('SMé, processus et infirmations documentées'),
    ('Objectifs, cibles et planifications'),
    ('Installations, équipements, usages énergétiques significatifs, conception et modifications'),
    ('Indicateurs de performance énergetique (IPE), Données énergétiques, Mesure et analyse'),
    ('Revue énergétique, Audit et revue de management énergétique'),
    ('Non conformités (NC), Actions correctives (AC) et Amélioration')
) as i(name)
WHERE ss.sector_name = 'Transport'
ON CONFLICT (sector_name, energy_type_name, standard_name, issue_name) DO NOTHING;