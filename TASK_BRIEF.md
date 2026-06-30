# TASK BRIEF — Issue #147: Internal linking (/near + /compare) + gating-aware hub pages

Repo: Nickheythatsme/fishwatch (score.fish). Branch: `feat/issue-147-internal-linking` (off main c5ff0c5).
Full spec: GitHub issue #147 — READ IT FIRST (`gh issue view 147`). This brief summarizes; the issue is authoritative.

## GOAL
Fix the inbound-orphaned `/near/*` (10) and `/compare/*` (54) pages — they're "Discovered – currently not indexed" in GSC because NOTHING links to them. Build `/near` + `/compare` index/hub pages and add gating-aware contextual links from water/basin pages + nav. Completes Epic 1.5 (internal linking) + Epic 4.4 (compare/near).

## DO NOT TOUCH (already done / out of scope)
- **Leaderboard linking** — it is NOT orphaned. `href="/leaderboard"` already renders in SERVER HTML on home + every water page (TopBar + MobileNav). Its GSC "None detected" is STALE pre-SSR data, fixed by recrawl (already requested). Make NO changes for leaderboard discoverability.
- **Water → basin breadcrumb link** — already shipped in `app/water/[slug]/page.tsx`. Verify it renders; do not reimplement.

## HARD REQUIREMENT — GATING (this is the #1 way to get this wrong)
`apps/web/lib/seo/gating.ts` `isPublishable()` (signal present + report ≤ 21 days) is the single source of truth for robots/sitemap/links. EVERY new link MUST route through `isPublishable()` and, for pairs, `selectCuratedPairs()` (`apps/web/lib/compare/pairs.ts`).
- `near/[town]` is `dynamicParams=false` → linking a non-curated town slug = HARD 404. Only link the 10 towns in `apps/web/lib/near/towns.ts`.
- Linking a non-publishable compare pair = link to a noindex page = wasted crawl budget. Filter pairs by isPublishable on both waters.
- NEVER emit a link to a 404 or a noindex page. This is an acceptance criterion.

## WHAT TO BUILD
1. **`app/near/page.tsx`** — static index of the 10 towns (from `lib/near/towns.ts`), each linking to `/near/[town]`. Server-rendered, metadata + self-canonical + BreadcrumbList. Add to sitemap.
2. **Nav** — add a "Near" entry (label e.g. "Near You"/"Towns") to BOTH `components/shell/TopBar.tsx` (TABS) and `components/shell/MobileNav.tsx` (ITEMS, pick a lucide icon). Points to `/near`.
3. **`app/compare/page.tsx`** — index of ONLY publishable curated pairs (`selectCuratedPairs()` filtered by `isPublishable()` on both waters). Server-rendered, metadata + self-canonical + BreadcrumbList. Add to sitemap. NOT in global nav.
4. **Water page** (`app/water/[slug]/page.tsx`) — add a gating-aware block (~3–5 links, capped) "Compare with nearby waters": publishable curated pairs that involve THIS water. Optionally a "Waters near {town}" link if this water maps to a town. Below the conditions fold. Visible UI (NOT sr-only). Clearly labeled.
5. **Basin page** (`app/basin/[slug]/page.tsx`) — links to in-basin publishable compare pairs + relevant near-town pages (publishable only), capped/labeled.

## IA / UX CONSTRAINTS
- `/near` → nav prominence. `/compare` → contextual on water/basin pages only, NOT global nav.
- Cap per-page SEO links ≤5, most-relevant, clearly labeled. No footer/link-soup.
- MOBILE-FIRST: score/conditions MUST stay above the fold (users check streamside on phones, see CLAUDE.md). Link blocks go BELOW conditions content.
- Hub/contextual links are VISIBLE UI, not sr-only. (sr-only on homepage was a Leaflet-island workaround, #124 — not the pattern here.) Reuse the existing glass-panel visual system (`components/ui/GlassPanel.tsx`, `Tag.tsx`, breadcrumbs in `components/shell/Breadcrumbs.tsx`).
- New components (if any): small, e.g. `RelatedCompare` / `NearbyTowns`, matching existing component style. No `any`.

## SITEMAP
Add `/near` and `/compare` index URLs to `app/sitemap.ts` (they're static/always-publishable hub pages — index,follow + self-canonical). Keep the existing gated per-leaf logic intact.

## VERIFY BEFORE PR (sandbox can't run interactive approvals — run these yourself)
- `npm run lint` → 0 errors.
- `npm test` (or the repo's test script) → green; add tests for any new gating/link-selection logic.
- `npm run build` → clean (watch TS strictness; this repo bans `any` and has tripped on Set/Map iteration + null-prototype GraphQL objects across server→client before).
- Grep the built/SSR output or reason through it: assert ZERO links to non-publishable or non-existent near/compare targets.

## PR
- Branch is already `feat/issue-147-internal-linking`. Commit your work.
- Open a PR with `gh pr create`. PR body MUST include `Closes #147` and a short summary of: hubs built, links added, gating enforcement, mobile-fold decision, and explicit note that leaderboard was intentionally untouched (stale-data, not a bug).
- Do NOT merge. Leave the PR open for review.
- If CI has a Copilot reviewer, note that human review follows; address obvious issues but don't block on it.

## CONTEXT FILES TO READ
- `gh issue view 147` (authoritative spec)
- `apps/web/lib/seo/gating.ts`, `apps/web/lib/compare/pairs.ts`, `apps/web/lib/near/towns.ts`
- `apps/web/app/sitemap.ts` (gating pattern)
- `apps/web/components/shell/TopBar.tsx`, `MobileNav.tsx`, `Breadcrumbs.tsx`
- `apps/web/app/water/[slug]/page.tsx`, `apps/web/app/basin/[slug]/page.tsx`
- `apps/web/app/near/[town]/page.tsx`, `apps/web/app/compare/[pair]/page.tsx` (existing leaves — mirror their gating/metadata patterns)
- `CLAUDE.md` (conventions, mobile-first rule)
