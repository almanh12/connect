-- Remove district competition level (not used in Ontario DECA)
-- Migrate existing district registrations to regional before altering constraint

UPDATE competition_registrations SET competition_level = 'regional' WHERE competition_level = 'district';

ALTER TABLE competition_registrations DROP CONSTRAINT IF EXISTS competition_registrations_competition_level_check;
ALTER TABLE competition_registrations ADD CONSTRAINT competition_registrations_competition_level_check CHECK (competition_level IN ('regional', 'provincial', 'icdc'));
