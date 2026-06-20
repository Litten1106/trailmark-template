# AGENTS.md

Trailmark template — visual roadbook from `src/data/itinerary.ts`.

## Commands

- `pnpm dev` — dev server (http://localhost:3000)
- `pnpm build` — production build to `dist/`
- `node scripts/validate-itinerary.mjs` — check itinerary completeness
- `node scripts/geocode-pois.mjs` — geocode missing POI coordinates
- `node scripts/sanitize-check.mjs` — pre-publish privacy scan

## Skill

Tell your agent: 用 trailmark 帮我把行程做成可部署的路书

First-time install: `npx skills add Litten1106/trailmark --skill trailmark -g -y`
