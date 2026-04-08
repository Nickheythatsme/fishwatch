-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- Reference / lookup tables
-- ============================================================

CREATE TABLE water_bodies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,             -- URL-friendly: "lower-deschutes"
    region TEXT NOT NULL DEFAULT 'oregon',
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    description TEXT,
    usgs_station_ids TEXT[] DEFAULT '{}',   -- Array of USGS station IDs
    typical_species TEXT[] DEFAULT '{}',    -- e.g. {"rainbow trout", "brown trout"}
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE species (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,              -- "rainbow trout"
    common_aliases TEXT[] DEFAULT '{}',     -- {"redsides", "bows", "rainbow"}
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE fly_patterns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,              -- "Blue Wing Olive"
    aliases TEXT[] DEFAULT '{}',            -- {"BWO", "Baetis"}
    category TEXT,                          -- "dry", "nymph", "streamer", "emerger"
    typical_sizes TEXT,                     -- "16-22"
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Scraped data tables
-- ============================================================

CREATE TABLE raw_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_name TEXT NOT NULL,              -- "confluence_fly_shop"
    source_url TEXT NOT NULL,
    content_hash TEXT NOT NULL,             -- SHA256 of content for dedup
    raw_html TEXT NOT NULL,
    fetched_at TIMESTAMPTZ DEFAULT NOW(),
    is_processed BOOLEAN DEFAULT FALSE,

    UNIQUE(source_name, content_hash)       -- Prevent duplicate scrapes
);

CREATE TABLE parsed_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    raw_report_id UUID REFERENCES raw_reports(id) ON DELETE CASCADE,
    water_body_id UUID REFERENCES water_bodies(id),
    source_name TEXT NOT NULL,
    report_date DATE,                        -- Date the report covers
    sentiment TEXT CHECK (sentiment IN ('excellent', 'good', 'fair', 'poor', 'off')),
    species_mentioned TEXT[] DEFAULT '{}',
    fly_patterns_mentioned TEXT[] DEFAULT '{}',
    conditions_summary TEXT,                 -- LLM-generated plain English summary
    flow_commentary TEXT,                    -- What the report says about flows
    water_clarity TEXT,                      -- "clear", "off-color", "muddy", etc.
    hatches JSONB NOT NULL DEFAULT '[]'::jsonb,  -- Array of {name, stage, timing} objects
    river_section TEXT,                      -- Specific section or access point mentioned
    raw_extraction JSONB,                    -- Full Claude extraction JSON
    extracted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE gauge_readings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    station_id TEXT NOT NULL,                -- USGS station ID
    water_body_id UUID REFERENCES water_bodies(id),
    measured_at TIMESTAMPTZ NOT NULL,
    flow_cfs DOUBLE PRECISION,              -- Cubic feet per second
    gauge_height_ft DOUBLE PRECISION,
    water_temp_f DOUBLE PRECISION,
    fetched_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(station_id, measured_at)          -- Prevent duplicate readings
);

CREATE TABLE water_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    water_body_id UUID NOT NULL REFERENCES water_bodies(id),
    score_date DATE NOT NULL,
    composite_score NUMERIC(3,1) NOT NULL CHECK (composite_score BETWEEN 0 AND 10),
    flow_score NUMERIC(3,1),
    sentiment_score NUMERIC(3,1),
    consensus_score NUMERIC(3,1),
    recommended_species TEXT[] DEFAULT '{}',
    recommended_flies TEXT[] DEFAULT '{}',
    summary TEXT,                             -- Human-readable signal blurb
    components JSONB,                        -- Full scoring breakdown
    scored_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(water_body_id, score_date)
);

-- ============================================================
-- Indexes for query performance
-- ============================================================

CREATE INDEX idx_gauge_readings_station_time ON gauge_readings(station_id, measured_at DESC);
CREATE INDEX idx_gauge_readings_water_body ON gauge_readings(water_body_id, measured_at DESC);
CREATE INDEX idx_parsed_reports_water_body ON parsed_reports(water_body_id, report_date DESC);
CREATE INDEX idx_parsed_reports_source ON parsed_reports(source_name, report_date DESC);
CREATE INDEX idx_water_scores_water_body ON water_scores(water_body_id, score_date DESC);
CREATE INDEX idx_raw_reports_source ON raw_reports(source_name, fetched_at DESC);
CREATE INDEX idx_raw_reports_unprocessed ON raw_reports(is_processed) WHERE is_processed = FALSE;
