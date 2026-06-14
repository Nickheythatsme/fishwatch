-- Normalize species_mentioned casing on existing parsed_reports rows.
-- Going forward the extractor (_normalize_species) guarantees canonical
-- (lowercase, trimmed, de-duped) values; this backfills historical rows so the
-- filter dropdown shows no duplicate-cased species chips.
UPDATE parsed_reports
SET species_mentioned = COALESCE(
    (
        SELECT array_agg(DISTINCT lower(trim(elem)))
        FROM unnest(species_mentioned) AS elem
        WHERE trim(elem) <> ''
    ),
    '{}'
)
WHERE species_mentioned IS NOT NULL
  AND array_length(species_mentioned, 1) > 0;
