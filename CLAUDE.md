# CLAUDE.md

## Project Overview

FishSignal — a fishing conditions intelligence app for Central Oregon. Scrapes fly shop reports, combines with USGS gauge data, and produces composite fishing signals. Monorepo with a Next.js frontend/API and Python data pipeline.

## Architecture

- `apps/web/` — Next.js 14 (App Router) with GraphQL Yoga API route at `/api/graphql`
- `packages/db/` — Shared Supabase PostgreSQL schema, seed data, TypeScript types
- `jobs/` — Python 3.11+ data pipeline (scraper, extractor, scorer), runs via GitHub Actions
- `.github/workflows/` — Cron pipeline: scrape → extract → score

The GraphQL API runs as a Next.js API route (no separate backend). Python jobs are independent — they share only the Supabase database.

## Commands

### TypeScript / Next.js

```bash
npm run dev          # Start Next.js dev server
npm run build        # Production build (runs type checking + linting)
npm run lint         # ESLint via next lint
```

### Python jobs (run from `jobs/` directory)

```bash
pip install -r requirements.txt
python -m scraper.main           # Scrape all shop reports
python -m scraper.sources.usgs   # Fetch USGS gauge data
python -m extractor.main         # LLM extraction from raw reports
python -m scorer.main            # Compute composite signals
```

### Testing

No test framework is configured yet. Verify changes with:
- `npm run build` — catches TypeScript errors and lint issues
- `npm run lint` — ESLint only
- For Python, verify imports work: `cd jobs && python -c "from scraper.main import run; from extractor.main import run; from scorer.main import run"`

## Coding Guidelines

### TypeScript

- Strict mode is enabled. Do not use `@ts-ignore` or weaken strict settings.
- Never use `any`. Use proper interfaces, `unknown` with type narrowing, or generics instead. For GraphQL query results, define explicit response types matching the query shape.
- Resolvers map snake_case DB columns to camelCase GraphQL fields explicitly in field resolvers (see `apps/web/lib/graphql/resolvers/`).
- Components are in `apps/web/components/`, organized by domain: `map/`, `signals/`, `reports/`, `gauges/`.
- Pages use the App Router (`app/` directory). Client components are marked `'use client'`.

### Python

- Python 3.11+ required. Use modern syntax (type unions with `|`, etc.).
- All scrapers extend `BaseScraper` in `jobs/scraper/sources/base.py`.
- The extractor processes only `raw_reports WHERE is_processed = FALSE`, then flips the flag.
- Content deduplication uses SHA256 hash — always upsert on `(source_name, content_hash)`.

### Database

- Schema lives in `packages/db/schema.sql`. DB uses snake_case.
- Seed data in `packages/db/seed.sql`. TypeScript types in `packages/db/types.ts`.
- Supabase service role key is used server-side only (resolvers, Python jobs). Never expose it to the browser.

### Styling

- Tailwind CSS v3.4. Custom signal colors defined in `tailwind.config.ts` under `theme.extend.colors.signal`.
- Mobile-first responsive design — many users check streamside on phones.

## Environment Variables

Copy `.env.example` to `apps/web/.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon/public key
- `SUPABASE_SERVICE_ROLE_KEY` — Server-side only
- `ANTHROPIC_API_KEY` — For Claude extraction jobs

Python jobs use `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` (set as GitHub Actions secrets).
