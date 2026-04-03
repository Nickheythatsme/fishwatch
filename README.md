# FishSignal

Real-time fishing conditions intelligence for Central Oregon. Scrapes fly shop reports, combines with USGS gauge data, and produces actionable "where should I fish today?" signals.

## Architecture

- **Frontend + API**: Next.js 14 (App Router) with GraphQL Yoga API route, deployed on Vercel
- **Database**: Supabase (PostgreSQL)
- **Data pipeline**: Python jobs running on GitHub Actions cron
- **LLM extraction**: Claude Haiku for structured data extraction from fishing reports

## Quick Start

### Prerequisites

- Node.js 18+
- Python 3.11+
- A Supabase project
- Anthropic API key (for extraction jobs)

### Setup

1. Clone and install dependencies:

```bash
npm install
```

2. Copy `.env.example` to `.env.local` in `apps/web/` and fill in your Supabase credentials.

3. Set up the database — run `packages/db/schema.sql` then `packages/db/seed.sql` in your Supabase SQL editor.

4. Start the dev server:

```bash
npm run dev
```

5. Visit `http://localhost:3000` and the GraphQL playground at `http://localhost:3000/api/graphql`.

### Python Jobs

```bash
cd jobs
pip install -r requirements.txt

# Run scraper
python -m scraper.main

# Run USGS gauge fetch
python -m scraper.sources.usgs

# Run LLM extraction
python -m extractor.main

# Run scorer
python -m scorer.main
```

### GitHub Actions

The pipeline runs automatically via cron (7am/7pm UTC). Set these repository secrets:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `ANTHROPIC_API_KEY`

## Project Structure

```
apps/web/       Next.js frontend + GraphQL API
packages/db/    Database schema, seed data, TypeScript types
jobs/           Python data pipeline (scraper, extractor, scorer)
.github/        GitHub Actions workflows
```
