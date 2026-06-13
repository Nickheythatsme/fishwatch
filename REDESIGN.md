# Score.Fish Dashboard Redesign

## Stitch Prototype

- **Project ID:** 14044890975353543681
- **Homepage Screen ID:** e087ab40abc746e2a087bac3604de90e
- **Design System:** "The Tactile Cartographer" — editorial field-journal aesthetic
- **Local files:** `.stitch/homepage_screenshot.png`, `.stitch/homepage.html`

## Design System Summary

- **Fonts:** Newsreader (headlines/editorial) + Manrope (body/labels/data)
- **Palette:** River blues (`#0f426f` primary), forest greens (`#50653e` secondary), earth tones (`#5b3918` tertiary)
- **Key rules:** No borders for sectioning (use tonal shifts), glassmorphism for overlays, gradient primary buttons, tonal layering instead of shadows, 44px min touch targets
- **Score colors:** 1-4 error (red), 5-7 tertiary (amber/earth), 8-10 secondary (green)

## Open Questions

### UI / Layout

1. What does the current app look like today? What's the delta from current state to this prototype?
2. The prototype shows 4 nav items: Intelligence, Map View, Reports, Fly Shops. Which are new pages vs. existing pages getting restyled?
3. The map — real mapping library (Mapbox, Leaflet, etc.) or styled static/image background for now?
4. The "Local Conditions" glassmorphic panel — aggregated from existing data, or needs new sources?

### Data / API

5. The river cards show composite scores (9.2), hatch info ("PMD Hatch"), CFS flow, and species icons. Which fields already exist in the GraphQL API, and which are new?
6. The prototype shows river *sections* (e.g., "Maupin Section" under Lower Deschutes). Does the current data model have sections/reaches, or just rivers?
7. Water temperature (64°F) — coming from USGS gauges already, or new data source needed?

### Scope

8. Full replacement of the current homepage, or a new route alongside the existing one?
9. How closely to follow the Stitch design system? Pixel-perfect or directional inspiration?
10. Priority order — visual redesign first then backfill APIs, or APIs first?
