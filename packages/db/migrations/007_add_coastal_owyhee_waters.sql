-- Expand water coverage: Oregon Coast Range rivers + Owyhee tailwater (issue #126)
-- Idempotent: re-running this migration is a no-op.

-- New basins for the coastal rivers and the southeastern Owyhee canyon.
INSERT INTO basins (name, slug, region, description) VALUES
('Oregon Coast',       'oregon-coast',        'oregon', 'Coast Range rivers draining the Pacific slope west of the Willamette Valley, prized for winter steelhead, sea-run cutthroat, and fall salmon on the Wilson, Nestucca, Siletz, and Alsea.'),
('Owyhee',             'owyhee',              'oregon', 'Remote high-desert canyon tailwater below Owyhee Dam in southeastern Oregon, renowned for its trophy brown trout fishery.')
ON CONFLICT (slug) DO NOTHING;

-- New tracked waters. usgs_station_ids verified against the USGS NWIS site service.
INSERT INTO water_bodies (name, slug, region, latitude, longitude, usgs_station_ids, typical_species, description) VALUES
('Wilson River', 'wilson-river', 'oregon', 45.4759, -123.7251, ARRAY['14301500'], ARRAY['winter steelhead', 'summer steelhead', 'chinook salmon', 'coho salmon', 'cutthroat trout'], 'Coast Range river near Tillamook with strong winter steelhead and fall salmon runs. Roadside drift-boat and bank access along Highway 6.'),
('Nestucca River', 'nestucca-river', 'oregon', 45.2665, -123.8471, ARRAY['14303600'], ARRAY['winter steelhead', 'spring chinook salmon', 'coho salmon', 'cutthroat trout'], 'Productive north-coast river near Beaver known for hatchery and wild winter steelhead plus a strong spring chinook run.'),
('Siletz River', 'siletz-river', 'oregon', 44.7151, -123.8873, ARRAY['14305500'], ARRAY['summer steelhead', 'winter steelhead', 'chinook salmon', 'cutthroat trout'], 'Central-coast river holding one of the coast''s few summer steelhead runs along with a deep wild winter run.'),
('Alsea River', 'alsea-river', 'oregon', 44.3860, -123.8318, ARRAY['14306500'], ARRAY['winter steelhead', 'chinook salmon', 'coho salmon', 'cutthroat trout'], 'Popular central-coast river near Waldport with bank and drift-boat access for winter steelhead and fall salmon.'),
('Umpqua River', 'umpqua-river', 'oregon', 43.5860, -123.5554, ARRAY['14321000'], ARRAY['smallmouth bass', 'summer steelhead', 'chinook salmon', 'cutthroat trout'], 'Mainstem below the forks near Elkton, famous for a prolific summer smallmouth bass fishery alongside steelhead and salmon runs.'),
('Owyhee River', 'owyhee-river', 'oregon', 43.6544, -117.2558, ARRAY['13183000'], ARRAY['brown trout', 'rainbow trout'], 'Remote high-desert tailwater below Owyhee Dam in southeastern Oregon. Trophy brown trout fishery with technical sight fishing.')
ON CONFLICT (slug) DO NOTHING;

-- Assign the new waters to their basins.
UPDATE water_bodies
SET basin_id = (SELECT id FROM basins WHERE slug = 'oregon-coast')
WHERE slug IN ('wilson-river', 'nestucca-river', 'siletz-river', 'alsea-river');

UPDATE water_bodies
SET basin_id = (SELECT id FROM basins WHERE slug = 'owyhee')
WHERE slug = 'owyhee-river';

-- The mainstem Umpqua joins the existing Rogue–Umpqua basin.
UPDATE water_bodies
SET basin_id = (SELECT id FROM basins WHERE slug = 'rogue-umpqua')
WHERE slug = 'umpqua-river';
