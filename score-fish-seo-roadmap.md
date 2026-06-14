# score.fish — SEO Implementation Roadmap

*Companion to `score-fish-seo-strategy.md` and `score-fish-business-analysis.md`.
This doc turns that strategy into an architecture and a sequenced set of
GitHub-issue-ready tasks. Owner: Nick · Last updated: 2026-06-13*

---

## Why this exists

The strategy doc identifies a **priority-zero blocker**: score.fish is a fully
client-rendered SPA, so Googlebot receives an empty HTML shell and indexes nothing.
No content or link strategy matters until that is fixed.

A codebase review confirmed it — and also confirmed the foundation is strong:

- **Rendering (the blocker):** every content page (`app/page.tsx`,
  `app/reports/page.tsx`, `app/water/[id]/page.tsx`) is `'use client'` and fetches via
  Apollo `useQuery`. No `generateMetadata`, no `sitemap.ts`, no `robots.ts`, no JSON-LD.
  All pages share one root `<title>`/description.
- **The data is rich enough to be compliant under the March 2026 "scaled content" rules.**
  `water_bodies` (slug, description, region, lat/long, `usgs_station_ids`,
  `typical_species`), `water_scores` (composite + subscores + `summary` + recommended
  flies/species + `score_date`), `parsed_reports` (`source_url`, `sentiment`, `hatches`
  JSONB), `gauge_readings` (live USGS flow/temp). This is the "live data summary"
  category Google still rewards — each page can carry genuinely unique data.
- **GraphQL already exposes** `waterBody(slug)`, `waterBodies(region)`, `topPicks(limit)`
  (defined but unused), `reports`, `regionConditions`. The per-water page already queries
  by **slug**.
- **Components mostly exist:** `ScoreRing`, `SignalBadge`, `ScoreBreakdown`,
  `ReportCard`/`ReportFeed` (with outbound "View original report" link), `GaugeStatus`,
  `FlowChart`, `IntelligencePanel`/`IntelligenceCard` (the de-facto leaderboard, today
  client-only on the homepage).

**Scope decisions:** (1) first indexable wave = **all Oregon waters (~20)**, WA/ID
deferred; (2) **add a proper `basins` DB table** + FK for hub pages.

---

## Architecture decisions (hold across all tasks)

1. **Server-render with ISR**, not SSR-per-request. Content pages become Server
   Components using `export const revalidate` — static HTML for crawlers, regenerated on
   a schedule that tracks the scrape→extract→score pipeline cron. Suggested `revalidate`:
   water/basin/leaderboard ≈ 1800s; editorial = long/static. *App Router caching APIs
   move fast — verify current signatures against nextjs.org docs at implementation time.*
2. **Reuse resolvers via an in-process GraphQL executor.** Add
   `apps/web/lib/graphql/execute.ts` that runs the existing `typeDefs` + `resolvers` +
   `createContext` via graphql `execute`. Server components call this — no HTTP self-call,
   no duplicated data access. Yoga route stays for remaining client queries.
3. **Server shell, client islands.** Server pages render crawlable HTML (score, summary,
   gauge numbers, report text); interactive pieces (Leaflet map `ssr: false`, sort/filter,
   hover-highlight) stay client islands. The homepage must server-render the ranked list.
4. **Clean, stable URLs:** `/water/[slug]`, `/basin/[slug]`, `/leaderboard`, `/reports`,
   `/guides/...`. Rename `app/water/[id]` → `app/water/[slug]`.
5. **Compliance guardrail baked in.** A page is only indexable (`index,follow` + in
   sitemap) once it clears a data-completeness threshold (real score + ≥1 real report).
   Thin waters get `noindex` and are excluded from the sitemap until they fill in.

---

## Epics & tasks (dependency order)

Ship Epic 0 first and verify indexing before proceeding. **Do not ship everything at once.**

### Epic 0 — Rendering & SEO foundation (priority zero, blocks everything)

- **0.1 In-process GraphQL executor** — `apps/web/lib/graphql/execute.ts` exposing a typed
  `executeQuery(query, variables)` over the existing schema/resolvers/context.
  *Done when:* a server component fetches `waterBody` by slug with no HTTP round-trip.
- **0.2 Server-render per-water page + slug route + ISR** — rename `[id]`→`[slug]`, Server
  Component fetch via 0.1, add `revalidate` + `generateStaticParams` (all Oregon slugs),
  keep mini-map as a client island. *Done when:* `view-source` shows score/summary/gauge/
  reports, not a loading shell.
- **0.3 Per-page metadata** — `generateMetadata` for unique title ("Lower Deschutes River
  Fishing Report & Conditions — [Month Year]"), description, canonical, OG/Twitter. Helper
  in `lib/seo/metadata.ts`.
- **0.4 Server-render homepage ranked list + reports page** — ranked list + report feed in
  initial HTML; map/sort/filters hydrate as client islands.
- **0.5 `sitemap.ts`, `robots.ts`, manifest** — segmented sitemap with accurate `lastmod`,
  excluding non-indexable waters (see 5.1); robots points to sitemap.
- **0.6 Rendering verification (doc/issue, no code)** — GSC URL Inspection shows rendered
  content; submit sitemap; confirm no stray `noindex` on money pages.

### Epic 1 — Per-water page depth & E-E-A-T (anti-doorway, anti-thin)

- **1.1 Score + two-sentence summary above the fold** (reuse `currentSignal.summary`).
- **1.2 Hatch table + "last updated" stamp** — render `hatches` JSONB (in GraphQL, unused
  in UI); new `components/reports/HatchTable.tsx`.
- **1.3 Strengthen source attribution** — per-water "Reports sourced from: [shop]" credit
  block with outbound links.
- **1.4 Editorial / first-hand fields (E-E-A-T)** — author byline + human local notes;
  DB add (`author`/`editorial_notes` or a `water_editorial` table) in `schema.sql` +
  `types.ts` + resolver fields.
- **1.5 Breadcrumbs + internal linking** — Home → Basin → Water; "other waters in this
  basin"; link to basin hub + leaderboard (wire basin link after Epic 4).

### Epic 2 — Structured data (schema.org JSON-LD)

- **2.1** Water page `Dataset`/`Observation` (gauge) + factual score/conditions +
  `BreadcrumbList`; helper `lib/seo/jsonld.ts`.
- **2.2** `FAQPage` for "is it fishing well / what's hatching / what flies".
- **2.3** `Article` + author (pairs with 1.4) and `LocalBusiness` for credited shops.
  *Done when:* Rich Results Test passes with no errors.

### Epic 3 — Leaderboard as shareable link-bait

- **3.1** Server-rendered `/leaderboard` ("where's it firing in Oregon today") using the
  existing `topPicks` resolver, with `revalidate`, metadata, `ItemList` JSON-LD.
- **3.2** Social/OG image so shared links render rich cards.

### Epic 4 — Basin hubs & internal linking (DB change)

- **4.1** Add `basins` table (id, name, slug, region, description) + `basin_id` FK on
  `water_bodies`; update `seed.sql` (assign Oregon waters: Deschutes, Willamette/McKenzie,
  Rogue–Umpqua, Klamath, Columbia tributaries, Grande Ronde, etc.) + `types.ts`; run
  `npx tsc --noEmit -p packages/db/tsconfig.json`.
- **4.2** GraphQL `basin`/`basins` queries + resolvers (snake→camel), exposing a basin's waters.
- **4.3** Server-rendered `/basin/[slug]` hubs with metadata, `BreadcrumbList`, links down
  to each water; back-wire breadcrumb from 1.5.

### Epic 5 — Programmatic-SEO quality gating & freshness

- **5.1** Data-completeness gate → `index`/`noindex`: central helper (real score + ≥1
  recent report); non-qualifying pages emit `noindex,follow` and are excluded from the
  sitemap; thin waters flagged for review. *Biggest March-2026 compliance lever.*
- **5.2** Freshness plumbing: align ISR `revalidate` with the pipeline cron; sitemap
  `lastmod` reflects real update times.

### Epic 6 — Supporting editorial / topical authority

- **6.1** Editorial system (MDX or DB-backed) for basin guides, hatch explainers, "how to
  read flows"; server-rendered, `Article` schema, internally linked. Start with 2–3
  cornerstone pieces (e.g. Deschutes salmonfly hatch guide).

### Epic 7 — Measurement & analytics

- **7.1** GSC + analytics + conversion instrumentation (conversion = newsletter/alert
  signup); track pages indexed, impressions, first-page long-tail from day one.

### Epic 8 — Paid search support (later, small/experimental)

- **8.1** Conversion tracking + fast landing pages for a small geo-targeted, exact/phrase
  test that feeds converting queries back into organic priorities. Defer until organic
  foundation is live.

---

## Suggested sequencing

1. **Epic 0** in full → verify indexing in GSC before anything else.
2. **Epics 1 + 2** — make indexed pages compliant and rich.
3. **Epic 5.1** early (the `noindex` gate) so thin pages never get indexed.
4. **Epic 3** (leaderboard) for link-bait once pages are solid.
5. **Epic 4** (basins) for clustering; back-wire breadcrumb links from 1.5.
6. **Epic 6** (editorial), **Epic 7** (measurement, runs throughout), **Epic 8** last.

## Verification

- **Local CI (per CLAUDE.md), per touched project:** TS/Next → `npm run lint` &&
  `npm run build` && `npm run test`; `packages/db/` →
  `npx tsc --noEmit -p packages/db/tsconfig.json`.
- **Rendering proof:** `view-source` a water URL shows score/summary/gauge/reports in the
  **initial HTML**; GSC URL Inspection "View crawled page" matches.
- **SEO infra:** `/sitemap.xml` + `/robots.txt` resolve; sitemap lists only gated
  (indexable) URLs with correct `lastmod`; non-qualifying waters carry `noindex`.
- **Structured data:** Rich Results Test passes for Dataset/FAQ/Article/Breadcrumb/ItemList.
- **DB (Epic 4):** migration applies; `basins` + `basin_id` queryable; every Oregon water
  assigned a basin; types compile.
- **Leading indicators (first 90 days):** GSC pages-indexed rises, impressions grow,
  long-tail/seasonal terms reach page one.
