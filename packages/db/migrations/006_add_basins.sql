-- Add basins table and basin_id FK on water_bodies (issue #65)

CREATE TABLE basins (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        TEXT NOT NULL UNIQUE,
    slug        TEXT NOT NULL UNIQUE,
    region      TEXT NOT NULL,
    description TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE water_bodies
    ADD COLUMN basin_id UUID REFERENCES basins(id);

CREATE INDEX idx_water_bodies_basin ON water_bodies(basin_id);

-- Insert Oregon basins
INSERT INTO basins (name, slug, region, description) VALUES
('Deschutes',          'deschutes',          'oregon', 'Central Oregon''s iconic high-desert river system, anchored by the renowned Lower Deschutes and its spring-fed tributaries.'),
('Willamette–McKenzie','willamette-mckenzie', 'oregon', 'The Willamette Valley watershed including the technical spring-run McKenzie and the broad mid-valley Willamette.'),
('Rogue–Umpqua',       'rogue-umpqua',        'oregon', 'Southern Oregon''s legendary steelhead and trout rivers, including the fly-only North Umpqua and the Rogue''s Holy Water.'),
('Klamath',            'klamath',             'oregon', 'The high-desert Klamath River tailwater below Keno Dam, famous for its redband trout fishery.'),
('Mt Hood–Columbia',   'mt-hood-columbia',    'oregon', 'Columbia River Gorge tributaries draining the south slopes of Mt. Hood, offering premier steelhead and salmon runs near Portland.'),
('Grande Ronde',       'grande-ronde-basin',  'oregon', 'Remote OR/WA border canyon offering prime steelhead and trout fishing through roadless wilderness.');

-- Assign Oregon water bodies to their basins
UPDATE water_bodies
SET basin_id = (SELECT id FROM basins WHERE slug = 'deschutes')
WHERE slug IN (
    'lower-deschutes', 'upper-deschutes', 'middle-deschutes',
    'crooked-river', 'fall-river', 'metolius', 'crane-prairie',
    'hosmer-lake', 'east-lake', 'davis-lake', 'tumalo-creek'
);

UPDATE water_bodies
SET basin_id = (SELECT id FROM basins WHERE slug = 'willamette-mckenzie')
WHERE slug IN ('mckenzie-river', 'willamette-river');

UPDATE water_bodies
SET basin_id = (SELECT id FROM basins WHERE slug = 'rogue-umpqua')
WHERE slug IN ('rogue-river', 'north-umpqua-river');

UPDATE water_bodies
SET basin_id = (SELECT id FROM basins WHERE slug = 'klamath')
WHERE slug = 'klamath-river';

UPDATE water_bodies
SET basin_id = (SELECT id FROM basins WHERE slug = 'mt-hood-columbia')
WHERE slug IN ('hood-river', 'sandy-river', 'clackamas-river');

UPDATE water_bodies
SET basin_id = (SELECT id FROM basins WHERE slug = 'grande-ronde-basin')
WHERE slug = 'grande-ronde';

-- WA/ID waters (spokane-river, nf-coeur-d-alene, st-joe-river, silver-creek,
-- big-wood-river, big-lost-river, sf-boise-river) remain basin_id NULL.
