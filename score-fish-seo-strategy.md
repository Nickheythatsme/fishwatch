# score.fish — SEO & Paid Search Strategy

*Prepared: June 13, 2026 · Companion to the score.fish Business Analysis · Owner: Nick*

---

## Strategic framing: the post–March 2026 reality

Search changed materially in early 2026, and it changes how this site must be built. Google's March 2026 core update made **scaled content abuse** its top enforcement target. Sites publishing large volumes of AI-generated pages with thin, near-duplicate content saw traffic drops of **50–90%**, rolled out fast (full impact within ~14 days) and applied algorithmically — no manual-action warning in Search Console (per DigitalApplied and Breakline analyses of the update).

The crucial nuance: **Google is not penalizing AI content — it is penalizing thin content at scale, regardless of how it's produced** (Google Search Central guidance). Content automation is explicitly acceptable when it adds real value; Google's own and industry guidance name **live sports scores, financial data summaries, and live data feeds** as legitimate automated content.

**This is the single most important fact for score.fish.** Your model — a unique, live, frequently-changing Fish Score per water, backed by real USGS gauge data and distinct local shop reports — is exactly the "live data summary" category Google still rewards. But it only survives if every page carries genuinely unique data and demonstrable first-hand expertise. Build it as a thin template that swaps a river name into an AI paragraph, and it gets caught in the same net as everyone else.

Three rules, drawn straight from what survived the update:

1. **Real data differentiation per page.** Each page must answer a distinct query that no other page on the site answers, using unique structured data (live gauge readings, that water's specific reports).
2. **E-E-A-T, especially first-hand Experience.** Real author identity, genuine local angling knowledge, verified facts, and external authority signals. AI alone cannot demonstrate experience; you can.
3. **No doorway pages.** A visitor landing from search must find the answer *on the page*, not be funneled elsewhere.

---

## 1. Keyword & search-intent map

Fishing-report demand is overwhelmingly **informational and local-intent**, which is good news: low commercial competition, high freshness value, and a natural fit for organic rather than paid. Target query families, roughly in priority order:

| Query family | Example | Intent | Competition |
|---|---|---|---|
| `[water] fishing report` | "deschutes river fishing report" | Info / local | Moderate (shops, aggregators) |
| `[water] conditions / flows / water level` | "crooked river flows today" | Info / real-time | Low–moderate |
| `[water] hatch chart / what's hatching` | "metolius hatch chart june" | Info / seasonal | Low |
| `is the [water] fishing good right now` | "is the lower deschutes fishing right now" | Info / decision | Low |
| `fly fishing near [town]` | "fly fishing near bend oregon" | Local discovery | Moderate |
| `best flies for [water]` | "best flies for fall river" | Info / long-tail | Low |
| Seasonal events | "deschutes salmonfly hatch 2026" | Info / spike | Low, high-volume in season |

The long-tail, real-time, and seasonal families are where a fast, fresh, data-backed site can win quickly — incumbents like Current are app-first, and individual shop pages rarely optimize well or update structured data.

---

## 2. On-page & content SEO

The per-water page is the core ranking asset. Each one should be unmistakably more useful than a generic shop post:

- **Unique title & meta** per water and ideally per query family: e.g., "Lower Deschutes River Fishing Report & Conditions — [Month Year]". Include the water name, "fishing report/conditions," and the region.
- **The Score above the fold**, with a plain-language two-sentence summary ("signal without the scroll") — this is the answer the searcher came for, delivered immediately (anti–doorway-page).
- **Genuinely unique data on the page:** live USGS flow/temp with a trend, current hatch status, recommended flies pulled from the parsed reports, and a short synthesized outlook. This is the differentiation that keeps you compliant.
- **First-hand experience signals:** a real author/byline with local credentials, occasional human-added notes ("the canyon section below Trout Creek fishes better in the afternoon this time of year"), and dated "last updated" stamps.
- **Source attribution & outbound links** to the shops whose reports informed the page — this both earns goodwill/backlinks and signals trustworthiness (and avoids the "aggregator that adds nothing" failure mode the update punished).
- **Freshness:** update pages on a schedule and surface the update date. Fresh, frequently-changing data is a ranking asset for this query type and reinforces the "live data" framing.
- **Internal linking:** each water links to its basin hub and to the regional leaderboard; the leaderboard links down to each water. Clear topical clustering builds entity authority.
- **Supporting editorial content** (human-written or heavily human-edited): basin guides, hatch explainers, "how to read flows" — these build topical authority and rank for the broader informational queries that pure data pages won't.

---

## 3. Programmatic SEO — done compliantly

This is the growth engine, but it must be the "Zillow listing," not the "doorway page" version. Practical guardrails:

- **One page per genuinely distinct entity** (a specific water or named section), never per keyword permutation. Don't generate "fishing report Deschutes" / "Deschutes fishing report" / "Deschutes river report" as separate pages.
- **Each page must hold unique live data.** If you can't populate a water with real gauge data and at least one real report, don't publish it yet — empty/templated pages are the liability.
- **Human-in-the-loop gating.** Borrow the pattern that survived the update: auto-generate, then auto-publish only pages that clear a quality/data-completeness threshold; flag thin ones for review rather than publishing everything. (One source described a 500-generated / 420-published / 80-flagged workflow — adopt that mindset.)
- **Scale deliberately, not explosively.** A regional site rolling out dozens of well-populated waters reads very differently to Google than a site dumping thousands of thin pages overnight. Expand basin by basin as data depth allows.
- **Don't just re-summarize scraped text.** Add the score, the gauge synthesis, the trend, and local context — net-new value beyond the source reports.

---

## 4. Technical SEO (priority-zero item flagged)

**Critical first check — rendering.** When I fetched score.fish earlier, only the HTML shell and nav came back; the body content didn't render. That's the signature of a **client-side-rendered SPA**, and if Googlebot sees an empty shell, *none* of the page content gets indexed and nothing ranks — no amount of content strategy fixes this. **Before anything else, verify that Googlebot receives fully-rendered HTML.** Options:

- **Server-side rendering (SSR)** or **static site generation (SSG)** for the per-water pages (e.g., Next.js SSR/ISR — incremental static regeneration fits "frequently updated data" perfectly).
- Or **prerendering / dynamic rendering** for crawlers as an interim fix.
- Verify with Search Console's URL Inspection ("View crawled page") that the rendered HTML contains your score, summary, and data — not just the shell.

Once rendering is solid:

- **XML sitemaps** (segment by water/basin), submitted in Search Console, with accurate `lastmod` dates to advertise freshness.
- **Clean URL structure:** `/water/lower-deschutes`, `/basin/deschutes`, `/reports`. Stable, human-readable, keyword-relevant.
- **Core Web Vitals / speed:** fast loads, especially on mobile (anglers check from the truck). Lean pages, optimized images, cached data.
- **Mobile-first:** Google indexes mobile; the score and summary must be instantly readable on a phone.
- **Crawl hygiene:** canonical tags to avoid duplicate-URL dilution, sensible robots.txt, no accidental `noindex` on money pages.
- **HTTPS** (already in place on the `.fish` domain).

---

## 5. Structured data (schema markup)

Schema helps Google understand the page and improves eligibility for rich results and AI surfaces:

- **`Dataset` / `Observation`-style markup** for the gauge data, and a clear factual structure for the score and conditions.
- **`FAQPage`** for "is it fishing well / what's hatching / what flies" Q&A blocks.
- **`LocalBusiness`** markup when you list/credit the source shops (helps the local entity graph and the shops, reinforcing the partnership).
- **`Article` / author markup** with real author entity for E-E-A-T.
- **`BreadcrumbList`** for the basin → water hierarchy.

---

## 6. Off-page / authority building

Post-update, Google weights **entity authority and external signals** heavily. For a new domain, this is the slow but decisive work:

- **Shop & guide backlinks.** Crediting and linking shops gives them a reason to link back ("score for the Deschutes" widget or "as featured on"). These local, topically-relevant links are gold.
- **The leaderboard as link bait.** A public "where's it firing in Central Oregon today" ranking is inherently shareable and citable by local blogs, forums, and regional outdoor media.
- **Community seeding** (carefully, non-spammy): r/flyfishing, r/troutfishing, ifish.net (Oregon-specific), regional Facebook groups. Be a useful participant, not a link-dropper.
- **Local digital PR:** Central Oregon outdoor/lifestyle media, tourism sites, fly-fishing clubs and TU (Trout Unlimited) chapters.
- **Author authority:** build a real, named author presence with fishing credibility — it feeds E-E-A-T directly.

---

## 7. Local & regional relevance

Even though this is a web product (not a storefront, so Google Business Profile / Local Services Ads largely don't apply), geographic relevance still matters:

- Anchor pages to real places: town names, river sections, access points, nearby landmarks.
- Build the **entity graph** by interlinking waters, basins, towns, and shops with consistent naming.
- Consider a Google Business Profile only if you ever establish a genuine local business presence; otherwise skip it.

---

## 8. AI Overviews & generative-engine visibility (the emerging layer)

Google is surfacing AI Overviews and testing publisher controls over AI snippets; "optimize for AI understanding" is now a real channel. Anglers increasingly ask assistants "how's the Deschutes fishing." To be the cited source:

- **Clear, factual, well-structured answers** with explicit dates and numbers (LLMs and AI Overviews favor extractable, verifiable facts) — your data pages are naturally suited to this.
- **Strong schema + clean HTML** so machines parse you easily.
- **Authoritativeness signals** (citations, author credibility, consistent entity data) increase the odds of being the source an AI summary pulls from.
- Decide deliberately whether to allow AI snippet usage — being cited can drive brand/referral even when it reduces a click.

---

## 9. Measurement

- **Google Search Console** is the backbone: impressions, average position, and clicks per query and per page; index coverage; the URL Inspection rendering check.
- **Rank tracking** for the priority query families per water.
- **Analytics** for traffic, top landing pages, and whatever you define as a conversion (newsletter signup, alert opt-in).
- **Leading indicators in the first 90 days:** pages indexed, impressions growth, and first-page appearances for long-tail/seasonal terms — these move before clicks do.

---

## 10. Paid search — small, supporting, experimental

Honest framing: fishing-report queries are mostly informational, so paid search is **not** the primary growth lever here — organic is. Paid's role is narrow and tactical: seed early traffic while organic matures, discover which keywords convert, and protect your brand term. Treat it as a small experiment, not a budget center.

**What changed in 2026 (relevant to setup):** AI now drafts ad copy; call-only ads are being retired; Google Business Profile verification is required for Local Services Ads (not applicable to you). Performance Max is Google's default push, but for a small, controllable start a **standard Search campaign is the safer choice** (per multiple 2026 small-business guides).

**Budget reality.** Guides cite $1,000–$3,000/mo as a common local starting point, with a practical floor around $300–$500/mo *if the site converts*. Note that Smart Bidding needs ~30+ conversions/month to optimize, which you won't hit at a tiny budget — so start with **Manual CPC or Maximize Clicks**, not Smart Bidding. Fishing keywords are low-CPC (likely ~$1–3, not the $50 of legal/insurance), so a small budget buys meaningful clicks.

**Recommended structure for a ~$150–$400/mo test:**
- **Tight geo-targeting:** Central Oregon / Bend metro radius only. No national spend.
- **High-intent keywords only**, exact and phrase match (avoid broad match — it burns small budgets on junk): e.g., "deschutes river fishing report," "fly fishing near bend," "crooked river conditions."
- **Aggressive negative keyword list:** filter out gear-buying, licenses, guided-trip-booking, jobs, and unrelated "fish" queries.
- **Brand defense:** a cheap campaign on "score.fish" so competitors/aggregators can't bid over you once you have traction.
- **Dedicated, fast landing pages** that match the ad's query (usually the relevant water page) — Quality Score lowers your CPC when relevance is high.
- **Conversion tracking from day one** (newsletter/alert signup) so you can read what's working.

**The smartest use of paid here:** run it briefly to learn which queries actually convert to signups, then pour that intelligence back into your organic content priorities — and taper the spend as organic rankings take over. Reassess monthly; kill it if organic is carrying the load.

---

## 11. Phased roadmap

1. **Fix rendering first.** Confirm Googlebot sees full HTML. Nothing else matters until this is true.
2. **Ship 10–20 deeply-populated Deschutes-basin water pages** with live data, score, summary, schema, and source links.
3. **Submit sitemaps; verify indexing & rendering** in Search Console.
4. **Launch the regional leaderboard** as the shareable link-bait asset.
5. **Seed community + earn first shop backlinks.**
6. **Add supporting editorial** (basin guides, hatch explainers) for topical authority.
7. **Run the small paid test** to learn converting queries; feed results back into content.
8. **Measure, then expand basin by basin** as data depth allows — never faster than you can populate with real data.

---

## Sources

- DigitalApplied — "Scaled Content Abuse: Google's AI Page Crackdown" (March 2026 update analysis): https://www.digitalapplied.com/blog/scaled-content-abuse-google-march-update-ai-pages-decimated
- DigitalApplied — "Programmatic SEO After March 2026": https://www.digitalapplied.com/blog/programmatic-seo-after-march-2026-surviving-scaled-content-ban
- Google Search Central — guidance on generative AI content: https://developers.google.com/search/docs/fundamentals/using-gen-ai-content
- Breakline — guide to Google's scaled content abuse policies: https://www.breaklineagency.com/guide-to-googles-scaled-content-abuse/
- Morningscore — Google's AI content policy / E-E-A-T: https://morningscore.io/googles-ai-content-policy/
- Metaflow — "Programmatic SEO in 2026": https://metaflow.life/blog/what-is-programmatic-seo
- Forward Digital Marketing — "Google Ads 101 for Small Business" (2026 changes, budget floor): https://www.forwarddigitalmarketing.com/google-ads-101-for-small-business/
- Get-Ryze — Google Ads minimum budget guide 2026 (Smart Bidding conversion thresholds): https://www.get-ryze.ai/blog/google-ads-minimum-budget-guide-2026
- VibeAds — Google Ads cost for small business 2026 (CPC, budget reality): https://getvibeads.com/blog/how-much-does-google-ads-cost-for-small-business

*Note: search-algorithm policy and ad pricing shift frequently — re-verify the March 2026 guidance and CPC benchmarks against current sources before acting on the time-sensitive parts.*
