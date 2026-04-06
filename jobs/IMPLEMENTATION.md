# Python Jobs Implementation Guide

This document is the implementation roadmap for the FishSignal data pipeline: scraping fly shop reports, fetching USGS gauge data, extracting structured data via Claude, and computing composite fishing signals.

---

## Architecture Overview

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Scraper    │────▶│  Extractor  │────▶│   Scorer    │
│  (Playwright)│     │ (Claude API)│     │ (Composite) │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                    │
       ▼                    ▼                    ▼
  raw_reports         parsed_reports        water_scores
       │                                         │
       │              ┌─────────────┐            │
       │              │    USGS     │            │
       │              │  (JSON API) │            │
       │              └──────┬───────┘            │
       │                     ▼                    │
       │              gauge_readings              │
       │                     │                    │
       └─────────────────────┴────────────────────┘
                             │
                      Supabase Postgres
```

**Pipeline flow**: Scrape → Extract → Score (sequential GitHub Actions jobs)
**USGS flow**: Independent, runs on its own schedule

---

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Scraping engine | Playwright (Python) | All sources use Playwright for consistency; handles JS-rendered Shopify blogs and static HTML alike |
| Crawl depth | Follow links into individual posts | Some shops truncate reports on the index page; following links gets the full content |
| Deduplication | SHA256 content hash in DB | Re-scrape all visible posts each run; `ON CONFLICT (source_name, content_hash) DO NOTHING` skips duplicates. No URL tracking needed. |
| USGS data | httpx + JSON API | USGS provides structured JSON at `waterservices.usgs.gov/nwis/iv/`. No browser needed. |
| Job coupling | Separate jobs (scrape → extract → score) | If extraction fails, raw data is still saved. Each step is independently retryable. |
| Error handling | Log and skip | If a source fails, log the error and continue with remaining sources. GitHub Actions surfaces failures. |
| Water body matching | Best-effort fuzzy match | Include known water body names in the Claude prompt. Fuzzy fallback for partial names (e.g. "the Deschutes"). |
| Scoring | Always run, skip empty | Run scorer on schedule but only produce scores for water bodies that have at least one report or gauge reading. |
| Scrape frequency | 2x/day for shops, every 2h for USGS | Shops update weekly; USGS gauges update every 15 min but 2h snapshots are sufficient for flow charts. |

---

## Phase 1: Scraper Infrastructure Rewrite

### Goal
Replace the httpx + BeautifulSoup scrapers with async Playwright-based scrapers that follow links into individual report posts.

### 1.1 Update dependencies

**`jobs/requirements.txt`** — add:
```
playwright>=1.44.0
```

**`jobs/pyproject.toml`** — add to dependencies:
```
"playwright>=1.44.0",
```

Keep `httpx` — still used by the USGS fetcher. The Playwright-based scrapers extract page text directly via `inner_text()`, so BeautifulSoup is not part of scraper-side text extraction. BeautifulSoup is still used by the extractor job to parse raw HTML from stored reports.

### 1.2 Rewrite BaseScraper (`jobs/scraper/sources/base.py`)

The new base class manages the Playwright browser lifecycle. Subclasses implement two methods:

```python
class BaseScraper(ABC):
    name: str
    url: str  # index page URL

    async def run(self) -> list[dict]:
        """Full scrape flow. Returns list of raw_report dicts."""
        # 1. Launch headless Chromium
        # 2. Navigate to self.url (index page)
        # 3. Call self.discover_posts(page) → list of post URLs
        # 4. For each URL:
        #    a. Navigate to the post
        #    b. Call self.extract_content(page) → plain text
        #    c. SHA256 hash the content
        #    d. Build raw_report dict
        # 5. Close browser
        # 6. Return list of raw_report dicts

    @abstractmethod
    async def discover_posts(self, page: Page) -> list[str]:
        """Given the index page, return absolute URLs of individual report posts."""
        ...

    @abstractmethod
    async def extract_content(self, page: Page) -> str:
        """Given an individual post page, extract the report text content."""
        ...
```

Key details:
- Use `playwright.async_api` (async Playwright)
- One browser instance and one reused page per scraper run
- Set a 30-second timeout per page load
- User-Agent: `"FishSignal/1.0 (fishing report aggregator)"`

### 1.3 Implement each concrete scraper

Each scraper needs investigation of the actual site structure to write correct selectors. For each source:

#### `confluence.py` — Confluence Fly Shop
- **Index**: `https://confluenceflyshop.com/fishing-reports/`
- **discover_posts**: Find links to individual report posts from the index
- **extract_content**: Extract the article/entry-content div text

#### `fly_fishers.py` — The Fly Fishers Place
- **Index**: `https://flyfishersplace.com/category/fishing-reports/`
- **discover_posts**: WordPress blog listing, find post permalink links
- **extract_content**: Extract `.entry-content` div text

#### `fly_and_field.py` — Fly and Field Outfitters
- **Index**: `https://flyandfield.com/blogs/fishing-reports`
- **discover_posts**: Shopify blog layout, find article links
- **extract_content**: Extract article body text

#### `deschutes_angler.py` — Deschutes Angler
- **Index**: `https://deschutesangler.com/blogs/fishing-report`
- **discover_posts**: Shopify blog layout, find article links
- **extract_content**: Extract blog post body text

#### `deschutes_camp.py` — Deschutes River Camp
- **Index**: `https://deschutescamp.com/fishing-report/`
- **discover_posts**: Find report page links
- **extract_content**: Extract `.entry-content` div text

#### `odfw.py` — ODFW Central Zone
- **Index**: `https://myodfw.com/recreation-report/fishing-report/central-zone`
- **discover_posts**: ODFW may be a single-page report (no individual posts). If so, `discover_posts` returns `[self.url]` and the index page IS the report.
- **extract_content**: Extract `.field--name-body` or `.node__content` div text

**Implementation approach**: For each source, we will:
1. Load the actual site with Playwright to inspect the DOM structure
2. Identify the correct selectors for post links and content areas
3. Implement and test the scraper against the live site

### 1.4 Update scraper main.py

- Use `asyncio.run()` as the entrypoint
- Process each source sequentially (one browser at a time to conserve resources)
- For each source:
  - Instantiate the scraper
  - Call `await scraper.run()` → list of raw_report dicts
  - Insert each into the DB with `ON CONFLICT DO NOTHING`
  - Log success/failure
- Wrap each source in try/except — log and skip on failure

### 1.5 Verification checklist
- [ ] Each scraper discovers at least 1 post URL from the live index page
- [ ] Each scraper extracts non-empty text content from a post
- [ ] Content hash dedup works (running twice doesn't create duplicates)
- [ ] Failures in one source don't block other sources
- [ ] `python -m scraper.main` runs end-to-end locally

---

## Phase 2: USGS Gauge Workflow Split

### Goal
Keep USGS fetcher as-is (httpx + JSON API). Move it to a separate, more frequent GitHub Actions workflow.

### 2.1 USGS fetcher — no code changes needed

The current implementation in `jobs/scraper/sources/usgs.py` is correct:
- Fetches from `waterservices.usgs.gov/nwis/iv/` with JSON format
- Parses flow (00060), gauge height (00065), water temp (00010)
- Converts Celsius to Fahrenheit for water temp
- Upserts into `gauge_readings` with `ON CONFLICT (station_id, measured_at) DO NOTHING`

### 2.2 New workflow: `.github/workflows/gauge.yml`

```yaml
name: Fetch USGS gauge data

on:
  schedule:
    - cron: '0 */2 * * *'    # Every 2 hours
  workflow_dispatch:

jobs:
  fetch:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: jobs
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
          cache: 'pip'
          cache-dependency-path: jobs/requirements.txt
      - run: pip install -r requirements.txt
      - name: Fetch gauge readings
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
        run: python -m scraper.sources.usgs
```

### 2.3 Update `.github/workflows/scrape.yml`

- Remove the "Run USGS gauge fetch" step from the scrape job
- Add `playwright install --with-deps chromium` step before running scrapers
- The scrape workflow now only handles fly shop reports

### 2.4 Verification checklist
- [ ] `python -m scraper.sources.usgs` inserts gauge readings locally
- [ ] gauge.yml is syntactically valid
- [ ] scrape.yml no longer references USGS

---

## Phase 3: Extraction Enhancements

### Goal
Add hatch info and river section fields. Improve water body matching with fuzzy logic and prompt-based matching.

### 3.1 Database migration

**New file**: `packages/db/migrations/001_add_hatch_and_section.sql`

```sql
ALTER TABLE parsed_reports ADD COLUMN IF NOT EXISTS hatches JSONB DEFAULT '[]';
ALTER TABLE parsed_reports ADD COLUMN IF NOT EXISTS river_section TEXT;
```

The `hatches` column stores an array of objects:
```json
[
  {"name": "BWO", "stage": "emerger", "timing": "afternoon"},
  {"name": "PMD", "stage": "dun", "timing": "morning"}
]
```

### 3.2 Update extraction prompt (`jobs/extractor/prompt.py`)

Add to the extraction schema:
```
- hatches: object[] — insect hatches mentioned, each with:
  - name: string — hatch name (e.g. "BWO", "PMD", "October Caddis")
  - stage: string — life stage being fished (e.g. "nymph", "emerger", "dun", "spinner", or null)
  - timing: string — time of day the hatch is active (e.g. "morning", "afternoon", "evening", or null)
- river_section: string — specific river section, reach, or access point mentioned (e.g. "Warm Springs to Trout Creek", "Riverbend Park", or null)
```

Also add a water body matching hint to the prompt:
```
Known water bodies (match the report content to the closest one):
- Lower Deschutes River (below Pelton Dam)
- Upper Deschutes River (through Bend)
- Middle Deschutes River (Bend to Lake Billy Chinook)
- Crooked River (below Bowman Dam)
- Fall River
- Metolius River
- Crane Prairie Reservoir
- Hosmer Lake
- East Lake
- Davis Lake
- Tumalo Creek
```

### 3.3 Update parser (`jobs/extractor/parser.py`)

Add new fields to the parsed row:
- `hatches` → store as JSONB
- `river_section` → store as TEXT

### 3.4 Update extractor main.py — fuzzy matching

Improve `_water_body_name` → `water_body_id` resolution:
1. **Exact match**: check `name.lower()` and `slug` against known water bodies (current behavior)
2. **Substring match**: if "deschutes" is in the name, check if the shop typically covers a specific section (e.g. Confluence Fly Shop → Lower Deschutes)
3. **Claude-assisted**: since we include known water bodies in the prompt, Claude should return the exact name. This reduces the need for fuzzy matching.

Build a mapping of `source_name → default_water_body_slug` for ambiguous cases:
```python
SOURCE_DEFAULT_WATER_BODY = {
    "deschutes_angler": "lower-deschutes",
    "deschutes_camp": "lower-deschutes",
    # Other sources cover multiple water bodies, no default
}
```

### 3.5 Update TypeScript types (`packages/db/types.ts`)

Add to `ParsedReport`:
```typescript
hatches: { name: string; stage: string | null; timing: string | null }[]
river_section: string | null
```

### 3.6 Update GraphQL schema (`apps/web/lib/graphql/schema.ts`)

Add to `Report` type:
```graphql
hatches: [Hatch!]!
riverSection: String
```

Add new type:
```graphql
type Hatch {
  name: String!
  stage: String
  timing: String
}
```

### 3.7 Update report resolver (`apps/web/lib/graphql/resolvers/report.ts`)

Add field resolvers:
```typescript
hatches: (parent) => parent.hatches ?? [],
riverSection: (parent) => parent.river_section,
```

### 3.8 Implementation notes (completed)

**Model**: Claude Sonnet 4.6 (`claude-sonnet-4-6`) with `max_tokens=8192` (increased from 4096 to avoid truncated JSON).

**HTML-to-text extraction**: The extractor uses BeautifulSoup with per-source CSS selectors (mirroring the scraper selectors) to strip nav/ads before sending to Claude. Falls back to stripping `<nav>`, `<header>`, `<footer>`, `<script>`, `<style>` tags and using body text.

**Fuzzy matching**: Three-tier approach:
1. Exact match on `name.lower()` or `slug`
2. Substring match (e.g. "Crooked" matches "Crooked River")
3. Source default fallback (`deschutes_angler` → Lower Deschutes)

**Sentiment resolver fix**: DB stores lowercase (`"good"`), GraphQL enum expects uppercase (`GOOD`). Added `.toUpperCase()` in the report resolver.

### 3.9 Verification checklist
- [x] Migration runs without error on Supabase
- [x] Extraction prompt produces hatches and river_section in Claude's response
- [x] Parser correctly maps new fields into parsed_reports rows
- [x] 103 parsed reports created across all 11 water bodies
- [x] All 103 reports matched to a water_body_id (100% match rate)
- [x] GraphQL returns new fields including hatches and riverSection
- [x] `npm run build` passes with schema changes
- [x] Scorer produces scores for water bodies with data

---

## Phase 4: Scorer Refinements

### Goal
Only produce scores for water bodies that have at least one report or gauge reading.

### 4.1 Update scorer main.py

After querying recent reports and gauge data for a water body:
```python
if not recent_reports and current_flow is None:
    print(f"Skipping {wb['name']}: no data")
    continue
```

No other scoring logic changes needed — the existing composite scorer handles missing sub-scores by redistributing weights.

### 4.2 Verification checklist
- [ ] Water bodies with no data are skipped (log message confirms)
- [ ] Water bodies with only gauge data get a flow-only score
- [ ] Water bodies with only reports get a sentiment+consensus score
- [ ] Full pipeline produces scores for water bodies that have data

---

## Phase 5: CI / GitHub Actions Updates

### 5.1 Final workflow layout

**`.github/workflows/scrape.yml`** — Fly shop pipeline (2x/day)
```
Schedule: 0 7,19 * * * (7am/7pm UTC)
Jobs:
  scrape:
    - checkout
    - setup python 3.11
    - pip install
    - playwright install --with-deps chromium
    - python -m scraper.main
  extract:
    needs: scrape
    - checkout
    - setup python 3.11
    - pip install
    - python -m extractor.main
  score:
    needs: extract
    - checkout
    - setup python 3.11
    - pip install
    - python -m scorer.main
```

**`.github/workflows/gauge.yml`** — USGS gauge fetch (every 2 hours)
```
Schedule: 0 */2 * * *
Jobs:
  fetch:
    - checkout
    - setup python 3.11
    - pip install
    - python -m scraper.sources.usgs
```

### 5.2 Playwright in CI

Add to the scrape job before running scrapers:
```yaml
- name: Install Playwright browsers
  run: playwright install --with-deps chromium
```

This installs Chromium and its system dependencies (libgbm, libnss3, etc.) on ubuntu-latest.

### 5.3 Verification checklist
- [ ] `scrape.yml` runs end-to-end in Actions (or verify locally with `act`)
- [ ] `gauge.yml` runs independently
- [ ] Playwright installs correctly in CI

---

## Phase 6: End-to-End Verification

### 6.1 Local testing sequence
1. `cd jobs && pip install -r requirements.txt && playwright install chromium`
2. `python -m scraper.main` — verify raw_reports are inserted
3. `python -m scraper.sources.usgs` — verify gauge_readings are inserted
4. `python -m extractor.main` — verify parsed_reports with hatch/section data
5. `python -m scorer.main` — verify water_scores are produced
6. Start dev server, query GraphQL:
   ```graphql
   {
     waterBodies {
       name
       currentSignal { compositeScore summary }
       currentFlow
       recentReports {
         sourceName conditionsSummary hatches { name stage timing } riverSection
       }
     }
   }
   ```
7. Open dashboard in browser — verify data displays

### 6.2 Data quality checks
- [ ] At least 3 sources produce usable reports
- [ ] Extraction correctly identifies water bodies, species, flies, and hatches
- [ ] Scores range between 0-10 and feel reasonable given the data
- [ ] Flow chart shows gauge readings over time
- [ ] No duplicate reports in the database

### 6.3 Failure mode testing
- [ ] Kill network during a scrape → other sources continue
- [ ] Feed garbled HTML to extractor → parser returns empty list, raw_report stays unprocessed
- [ ] Remove all reports for a water body → scorer skips it

---

## File Change Summary

### New files
| File | Purpose |
|------|---------|
| `.github/workflows/gauge.yml` | USGS gauge fetch workflow (every 2h) |
| `packages/db/migrations/001_add_hatch_and_section.sql` | Add hatches + river_section columns |

### Modified files
| File | Changes |
|------|---------|
| `jobs/requirements.txt` | Add `playwright>=1.44.0` |
| `jobs/pyproject.toml` | Add `playwright>=1.44.0` |
| `jobs/scraper/sources/base.py` | Rewrite: httpx → async Playwright with discover_posts/extract_content pattern |
| `jobs/scraper/sources/confluence.py` | Rewrite: implement discover_posts + extract_content |
| `jobs/scraper/sources/fly_fishers.py` | Rewrite: implement discover_posts + extract_content |
| `jobs/scraper/sources/fly_and_field.py` | Rewrite: implement discover_posts + extract_content |
| `jobs/scraper/sources/deschutes_angler.py` | Rewrite: implement discover_posts + extract_content |
| `jobs/scraper/sources/deschutes_camp.py` | Rewrite: implement discover_posts + extract_content |
| `jobs/scraper/sources/odfw.py` | Rewrite: implement discover_posts + extract_content |
| `jobs/scraper/main.py` | Async entrypoint, sequential source processing |
| `jobs/extractor/prompt.py` | Add hatches, river_section, water body list to prompt |
| `jobs/extractor/parser.py` | Parse new fields |
| `jobs/extractor/main.py` | Fuzzy water body matching |
| `jobs/scorer/main.py` | Skip water bodies with no data |
| `.github/workflows/scrape.yml` | Remove USGS step, add Playwright install |
| `packages/db/types.ts` | Add hatches, river_section to ParsedReport |
| `apps/web/lib/graphql/schema.ts` | Add Hatch type, hatches + riverSection fields |
| `apps/web/lib/graphql/resolvers/report.ts` | Map new fields |
