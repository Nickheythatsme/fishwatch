-- Central Oregon rivers and lakes
INSERT INTO water_bodies (name, slug, region, latitude, longitude, usgs_station_ids, typical_species, description) VALUES
('Lower Deschutes River', 'lower-deschutes', 'oregon', 44.9572, -121.2695, ARRAY['14092500'], ARRAY['rainbow trout', 'steelhead', 'brown trout'], 'Trophy water below Pelton Dam. Year-round fishery with strong redsides.'),
('Upper Deschutes River', 'upper-deschutes', 'oregon', 43.9945, -121.3856, ARRAY['14050000'], ARRAY['rainbow trout', 'brown trout', 'brook trout'], 'Urban stretch through Bend. Accessible wade fishing.'),
('Middle Deschutes River', 'middle-deschutes', 'oregon', 44.3500, -121.2400, ARRAY['14076500'], ARRAY['rainbow trout', 'brown trout', 'whitefish'], 'Between Bend and Lake Billy Chinook. Less pressured canyon water.'),
('Crooked River', 'crooked-river', 'oregon', 44.3072, -121.1300, ARRAY['14087400'], ARRAY['rainbow trout', 'whitefish', 'mountain whitefish'], 'Tailwater below Bowman Dam. Consistent year-round nymphing.'),
('Fall River', 'fall-river', 'oregon', 43.7800, -121.6300, ARRAY['14057500'], ARRAY['rainbow trout', 'brown trout', 'brook trout'], 'Spring creek. Sight fishing to rising trout. Catch and release.'),
('Metolius River', 'metolius', 'oregon', 44.5800, -121.5100, ARRAY['14091500'], ARRAY['rainbow trout', 'bull trout', 'brook trout', 'whitefish'], 'Crystal-clear spring-fed river. Challenging technical fishing.'),
('Crane Prairie Reservoir', 'crane-prairie', 'oregon', 43.7930, -121.7830, '{}', ARRAY['rainbow trout', 'brook trout', 'largemouth bass'], 'Stillwater. Famous for large "cranebows." Best from boat or float tube.'),
('Hosmer Lake', 'hosmer-lake', 'oregon', 43.8260, -121.7950, '{}', ARRAY['atlantic salmon', 'brook trout'], 'Fly fishing only, catch and release. Unique Atlantic salmon fishery.'),
('East Lake', 'east-lake', 'oregon', 43.7180, -121.2080, '{}', ARRAY['rainbow trout', 'brown trout', 'atlantic salmon', 'kokanee'], 'Volcanic lake in Newberry Caldera. Hot springs influence.'),
('Davis Lake', 'davis-lake', 'oregon', 43.5900, -121.8000, '{}', ARRAY['rainbow trout', 'largemouth bass'], 'Shallow fly fishing lake. Good damselfly and callibaetis hatches.'),
('Tumalo Creek', 'tumalo-creek', 'oregon', 44.0200, -121.5600, '{}', ARRAY['rainbow trout', 'brook trout'], 'Small mountain stream west of Bend. Fun pocket water fishing.');

-- Oregon rivers (beyond Central Oregon)
INSERT INTO water_bodies (name, slug, region, latitude, longitude, usgs_station_ids, typical_species, description) VALUES
('McKenzie River', 'mckenzie-river', 'oregon', 44.1237, -122.6276, ARRAY['14163150'], ARRAY['rainbow trout', 'spring chinook salmon', 'summer steelhead', 'bull trout'], 'Premier trout river below Leaburg Dam near Eugene. Drift boat and wade fishing with dam-regulated flows.'),
('Willamette River', 'willamette-river', 'oregon', 44.0570, -123.0868, ARRAY['14166000'], ARRAY['summer steelhead', 'rainbow trout', 'cutthroat trout', 'spring chinook salmon', 'largemouth bass'], 'Large river through Eugene with summer steelhead runs and wild trout. Shallow runs and ledgerock pools.'),
('Hood River', 'hood-river', 'oregon', 45.6550, -121.5490, ARRAY['14120000'], ARRAY['winter steelhead', 'summer steelhead', 'rainbow trout', 'cutthroat trout'], 'Small glacial-fed Columbia Gorge tributary with winter and summer steelhead runs.'),
('Rogue River', 'rogue-river', 'oregon', 42.6554, -122.7150, ARRAY['14337600'], ARRAY['rainbow trout', 'summer steelhead', 'winter steelhead', 'chinook salmon', 'coho salmon'], 'Dam-controlled tailwater below Lost Creek Dam. Fly-only Holy Water section with large trout and excellent hatches.'),
('North Umpqua River', 'north-umpqua-river', 'oregon', 43.3307, -123.0031, ARRAY['14319500'], ARRAY['summer steelhead', 'winter steelhead', 'rainbow trout', 'chinook salmon'], 'Legendary 31-mile fly-only section. Premier summer steelhead river with spring-fed flows and extreme clarity.'),
('Klamath River', 'klamath-river', 'oregon', 42.1330, -121.9620, ARRAY['11509500'], ARRAY['redband trout', 'rainbow trout', 'brown trout'], 'High-desert tailwater below Keno Dam with excellent redband trout fishing.'),
('Sandy River', 'sandy-river', 'oregon', 45.4490, -122.2450, ARRAY['14142500'], ARRAY['winter steelhead', 'summer steelhead', 'coho salmon', 'chinook salmon', 'rainbow trout'], 'Free-flowing glacial river near Portland with strong steelhead runs. Wade fishing from Dodge Park to Oxbow Park.'),
('Clackamas River', 'clackamas-river', 'oregon', 45.3000, -122.3540, ARRAY['14210000'], ARRAY['winter steelhead', 'summer steelhead', 'spring chinook salmon', 'coho salmon', 'rainbow trout', 'cutthroat trout'], 'Broad river near Portland favored by spey casters. Ledgy slots and boulder runs.'),
('Grande Ronde River', 'grande-ronde', 'oregon', 45.9457, -117.4510, ARRAY['13333000'], ARRAY['steelhead', 'rainbow trout', 'smallmouth bass', 'whitefish'], 'OR/WA border canyon. Prime steelhead water around 900-1400 CFS.');

-- Washington / Idaho rivers (Silver Bow coverage)
INSERT INTO water_bodies (name, slug, region, latitude, longitude, usgs_station_ids, typical_species, description) VALUES
('Spokane River', 'spokane-river', 'washington', 47.6593, -117.4491, ARRAY['12422500'], ARRAY['rainbow trout', 'brown trout', 'whitefish'], 'Large freestone through Spokane. Best wade fishing below 3000 CFS.'),
('North Fork Coeur d''Alene River', 'nf-coeur-d-alene', 'idaho', 47.7061, -115.9792, ARRAY['12411000'], ARRAY['westslope cutthroat trout', 'rainbow trout', 'bull trout'], 'Pristine panhandle freestone. Dry fly paradise for westslope cutthroat.'),
('St. Joe River', 'st-joe-river', 'idaho', 47.2744, -116.1889, ARRAY['12414500'], ARRAY['westslope cutthroat trout'], 'Remote mountain river. Walk-and-wade ideal near 90 CFS. Aggressive dry fly cutthroat.');

-- Idaho rivers (Fly Fish Food / Silver Creek Outfitters coverage)
INSERT INTO water_bodies (name, slug, region, latitude, longitude, usgs_station_ids, typical_species, description) VALUES
('Silver Creek', 'silver-creek', 'idaho', 43.3234, -114.1084, ARRAY['13150430'], ARRAY['rainbow trout', 'brown trout'], 'Legendary spring creek near Sun Valley. Ultra-technical sight fishing to selective trout.'),
('Big Wood River', 'big-wood-river', 'idaho', 43.7863, -114.4251, ARRAY['13135500'], ARRAY['rainbow trout', 'brown trout', 'whitefish', 'brook trout'], 'Freestone through Sun Valley. Accessible roadside fishing from Ketchum to Bellevue.'),
('Big Lost River', 'big-lost-river', 'idaho', 43.9392, -113.6483, ARRAY['13127000'], ARRAY['rainbow trout', 'brown trout', 'whitefish'], 'Cold tailwater below Mackay Reservoir. Large rainbows. Best late June through September.'),
('South Fork Boise River', 'sf-boise-river', 'idaho', 43.4958, -115.3081, ARRAY['13186000'], ARRAY['rainbow trout', 'bull trout', 'whitefish'], 'Mountain tailwater with trophy potential. Barbless-only above Neal Bridge.');

INSERT INTO species (name, common_aliases) VALUES
('rainbow trout', ARRAY['rainbow', 'bows', 'redsides', 'redside', 'bow', 'deschutes redside']),
('brown trout', ARRAY['brown', 'browns', 'brownie']),
('brook trout', ARRAY['brook', 'brookies', 'brookie', 'char']),
('steelhead', ARRAY['steelie', 'steelies', 'chrome', 'summer steelhead', 'winter steelhead']),
('bull trout', ARRAY['bull', 'bulls', 'dolly varden']),
('whitefish', ARRAY['mountain whitefish', 'whitie', 'whities', 'rocky mountain whitefish']),
('atlantic salmon', ARRAY['atlantic', 'landlocked salmon']),
('kokanee', ARRAY['kokanee salmon', 'sockeye']),
('largemouth bass', ARRAY['largemouth', 'bass', 'bucketmouth']);

INSERT INTO fly_patterns (name, aliases, category, typical_sizes) VALUES
('Blue Wing Olive', ARRAY['BWO', 'Baetis', 'blue wing'], 'dry', '16-22'),
('Pale Morning Dun', ARRAY['PMD', 'pale morning'], 'dry', '14-18'),
('October Caddis', ARRAY['giant orange caddis', 'Dicosmoecus'], 'dry', '6-10'),
('Elk Hair Caddis', ARRAY['EHC', 'elk hair'], 'dry', '12-18'),
('Comparadun', ARRAY['compara-dun'], 'dry', '14-20'),
('Adams', ARRAY['parachute adams'], 'dry', '12-18'),
('Zebra Midge', ARRAY['zebra', 'midge'], 'nymph', '18-24'),
('Pheasant Tail', ARRAY['PT', 'pheasant tail nymph', 'PTN'], 'nymph', '14-20'),
('Hares Ear', ARRAY['GRHE', 'gold ribbed hares ear'], 'nymph', '12-18'),
('Prince Nymph', ARRAY['prince', 'bead head prince'], 'nymph', '12-16'),
('San Juan Worm', ARRAY['worm', 'squirmy wormy'], 'nymph', '8-14'),
('Egg Pattern', ARRAY['egg', 'glo bug', 'nuke egg'], 'nymph', '8-14'),
('Woolly Bugger', ARRAY['bugger', 'woolly'], 'streamer', '6-10'),
('Sculpzilla', ARRAY['sculpin', 'sculpzilla'], 'streamer', '4-8'),
('Callibaetis', ARRAY['speckle wing', 'callibaetis spinner'], 'dry', '14-16'),
('Damselfly', ARRAY['damsel', 'damselfly nymph'], 'nymph', '10-12'),
('Chironomid', ARRAY['chronies', 'chronomid', 'bloodworm'], 'nymph', '14-20'),
('Stonefly Nymph', ARRAY['stone', 'pat''s rubber legs', 'girdle bug'], 'nymph', '4-10'),
('Salmonfly', ARRAY['salmon fly', 'pteronarcys'], 'dry', '4-8'),
('Golden Stone', ARRAY['golden stonefly', 'golden'], 'dry', '6-10');
