# score.fish — Business Analysis & Strategy Manifesto

*Prepared: June 13, 2026 · Status: pre-MVP validation · Owner: Nick*

---

## Thesis

**score.fish should not try to be a novel national AI fishing app. That lane is already taken.** Instead, it should aim to *own fishing intelligence on the open web for one region at a time* — starting with Central Oregon and the Deschutes basin — by turning the prose fishing reports that local shops and guides already publish into a single, comparable, daily **Fish Score** per body of water, and by ranking on the searches anglers actually type.

The concept is validated. The category makes money. But the winning move is **distribution and local depth, not invention.**

---

## 1. Market validation

The underlying market is large and still growing. A record **57.9 million Americans fished in 2025** — an all-time high and roughly 19% of the U.S. population (RBFF 2025 Special Report, cited by Fishbox). More anglers each year means more demand for planning and conditions tools.

Anglers also demonstrably pay for intel. Representative subscription pricing in the space:

- TroutRoutes — ~$59/year
- Fishbrain Pro — ~$120/year ($10–13/month)
- Navionics — ~$50/year

The takeaway: willingness-to-pay for fishing conditions/intelligence is established. The question is never "will anglers pay for this kind of thing" — it's "why would they pay *you* over the incumbents."

---

## 2. Competitive landscape

The fishing-app market clusters into three camps (per Fishbox's 2026 roundup):

1. **All-in-one planners** — e.g., Fishbox: forecasts, charts, AI assistant, catch logging in one app.
2. **Specialists** — e.g., BassForecast and Deep Dive (tournament bass), onX Fish (regional waters).
3. **Hybrids** — e.g., Omnia Fishing, which pairs chart layers with an in-app tackle store.

Layered across those are:

- **Crowdsourced social/catch-log apps** — Fishbrain (biggest by user count, heavily paywalled), FishAngler (fully free, social), ANGLR (auto GPS trip recording), Fishidy.
- **Weather/solunar forecasters** — FishWeather, Fishing Points, Pro Angler, generic "Fishing Forecast" apps.
- **Mapping/navigation** — Navionics, onWater (224k+ lakes, 201k+ rivers), TroutRoutes, FlyFishFinder.

### The direct competitor: Current (currentfishing.com)

This is the one that matters. Current already does almost exactly what score.fish set out to do:

- Pulls from **USGS, NOAA, WeatherKit, Water Survey of Canada, CDEC, and dozens of fly shop report feeds**.
- Uses **AI to synthesize** government gauges, weather APIs, and shop reports into actionable daily insights.
- Covers **245 hand-curated waters**, each with a calibrated hatch calendar, real-time stream gauge, regional outlook, and nearby fly shop reports.
- **Summarizes shop reports** so users "get the signal without the scroll."
- Generates an **AI outlook for any water in the world** not on the curated list.
- Parses **regulations** into plain language.
- Ships on **iOS and browser**.

**Implication:** score.fish is entering a contested lane, not an empty one. The "AI reads fly shop reports and scores the water" idea is no longer differentiating on its own. Differentiation must come from positioning, depth, and channel.

### Report-adjacent players

- **FlyFishFinder** — community live reports + fly shop directory (subscription).
- **FlyFishingReports.com** — free network of professional guide/angler reports.
- **Orvis Fly Fishing app** — bundles local fishing reports.
- Individual shops publish prose reports today (e.g., Confluence Fly Shop's Lower Deschutes updates) — this is the raw material, and it is abundant, fragmented, and SEO-rich.

---

## 3. Where score.fish can actually win

Three defensible wedges, in priority order:

### Wedge 1 — Hyper-local depth (vs. national breadth)
Current is wide and shallow: ~245 curated waters plus thinner AI-generated outlooks everywhere else. score.fish can be the **definitive** source for the Deschutes basin and Central Oregon — every shop report, every micro-section (Upper/Middle/Lower Deschutes, Crooked, Metolius, Fall, Williamson, Tumalo Creek), hatch timing tuned to local reality. This is the classic wedge against a broad incumbent: be deeper where they're shallow, then expand region by region. Authentic local credibility (you fish these waters) is something a national app cannot fake.

### Wedge 2 — The Score as the product
Current produces narrative outlooks. The original score.fish framing — a single **quantified, comparable score per water** — is a genuinely different experience: a sortable "where's it firing today" ranking (e.g., Lower Deschutes 8.2 · Crooked 6.1 · Fall 4.5). The data moat is thin, but the product framing is distinct, glanceable, and inherently shareable.

### Wedge 3 — Web-first, not app-first
Current leads with an iOS app. The search demand for "[river] fishing report / conditions / flows today" is enormous and currently served by scattered shop pages and aggregators. A fast, free, frequently-updated web page per water is both a traffic engine and a structural opening that an app-first competitor leaves on the table.

---

## 4. MVP feature set

Web-first, solo-achievable, and a direct reuse of an existing core competency: AI parsing of unstructured documents into structured, comparable data — here the "document" is a fishing report.

**Scope discipline:** one geography first — Central Oregon / Deschutes basin. Depth over breadth.

**Core pipeline**
- Scheduled ingest of shop + guide reports for the target waters.
- LLM parses each report into structured fields: overall score, flow/clarity, what's hatching, recommended flies, techniques, and trend vs. last week.
- Enrich with live USGS gauge data (free API): flow, temperature, trend.

**Core surfaces**
- **Per-water page:** headline Fish Score, a two-sentence AI summary, live gauge data, hatch status, and a visible credit + link back to the source shop.
- **Regional leaderboard / map:** all waters ranked by today's score — the shareable "where should I go" artifact.
- **One retention hook:** an alert ("flows just dropped into the sweet spot on the Crooked").

**Explicitly deferred**
- Native mobile app.
- National coverage.
- Social feed / community (brutal cold-start; incumbents already own this).
- Catch logging (commodity feature, no edge).

---

## 5. Traffic strategy (first priority)

Distribution is the whole game. Prove score.fish can pull traffic *before* building any paywall.

- **Programmatic SEO (primary channel).** One fresh, indexable page per water, updated frequently, targeting "[river] fishing report / conditions / flows today." Fresh AI summaries + live gauge data is exactly the kind of frequently-updated page search engines reward — and it directly exploits Current being app-first.
- **The leaderboard as shareable content.** Cross-water "today's scores" rankings travel well in r/flyfishing, ifish.net, and regional fishing Facebook groups. Anglers love to argue about rankings.
- **Shop goodwill = backlinks + distribution.** Crediting and linking source shops earns links and goodwill instead of resentment — and opens the B2B door (see §6). This is also the answer to the scraping-ethics risk.
- **Weekly regional newsletter.** A free "Central Oregon fishing signal" email compounds an owned audience over time (reuses prior newsletter work).

---

## 6. Monetization (later)

Only after traffic + retention exist. In rough order of fit:

1. **Freemium subscription** — alerts, history/trends, more waters, hatch forecasts. Benchmark $40–70/year is normal in this space.
2. **Affiliate / commerce** — affiliate links on the exact flies each report recommends (the Omnia Fishing model). Natural, because reports already name the flies.
3. **B2B with the shops (strongest unique angle)** — the fly shops are both the data source *and* potential customers: featured placement, a report-repackaging widget for their own site, or qualified guide-trip lead-gen (guides pay for booked trips).
4. **Data/insight licensing (far horizon)** — conservation groups, tourism boards. Speculative; ignore for now.

---

## 7. Honest risk assessment

- **Not first.** A well-built, focused competitor (Current) already owns the core concept. score.fish is a challenger, on a side-project budget, against a dedicated team.
- **Thin data moat.** The source reports and gov gauges are available to anyone. The defensibility is in local depth, brand/trust, and SEO real estate — not proprietary data.
- **Scraping ethics & ToS.** Strip-mining shop reports invites friction and ill-will. Partner and credit; don't extract and bury.
- **Modest ceiling.** This is a passion vertical. Real money exists, but the breadth-driven upside (Fishbrain scale) requires resources a solo builder can't match.
- **Sustained effort.** Programmatic SEO and regional expansion reward consistency over months — the failure mode is abandonment, not a wrong idea.

---

## 8. Bottom line

Pursue score.fish **if and only if it's reframed**: from "novel national AI fishing app" to "**own Central Oregon fishing intel on the open web, then expand region by region.**" The concept is proven, the willingness-to-pay is real, and the work doubles as a learning vehicle that reuses an existing core competency — so the downside is low. Go in clear-eyed that the job is distribution and local depth, not invention.

**Immediate next steps**
1. Lock the target geography and the initial water list (Deschutes basin).
2. Build the report-ingestion → LLM-parse → score pipeline for those waters.
3. Ship the per-water SEO page template + the regional leaderboard.
4. Instrument traffic. Validate ranking and retention before touching monetization.

---

## Sources

- Fishbox — "9 Best Fishing Apps in 2026" (market size, market segmentation): https://fishbox.com/blog/best-fishing-apps
- Current — product site (direct competitor): https://currentfishing.com/
- GilledIt — "Best Fishing Apps" (Fishbrain pricing): https://www.gilledit.com/us/blog/best-fishing-apps
- Kayak Angler — "8 Best Fishing Apps" (TroutRoutes pricing): https://kayakanglermag.com/tactics-skills/best-fishing-apps/
- Wired2Fish — "Best Fishing Apps" (Navionics pricing): https://www.wired2fish.com/bass-fishing/best-fishing-apps
- FlyFishFinder — product site (community reports comp): https://flyfishfinder.com/pages/fly-fishing-app/
- FlyFishingReports.com (guide report network): https://www.flyfishingreports.com/
- Confluence Fly Shop — Lower Deschutes reports (local source example): https://confluenceflyshop.com/fishing-reports/
