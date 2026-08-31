# Victoria, ENS, and repeated-world map verification

Date: 2026-08-29

## Scope

- Correct the current University of Victoria Geography job from Kampala,
  Uganda to the department's David Turpin Building in Victoria, Canada.
- Correct the current ENS Geosciences job from Bujumbura, Burundi to the
  department building at 24 rue Lhomond in Paris, France.
- Keep Leaflet job markers synchronized with the horizontally repeated English
  basemap when users navigate across the antimeridian in either direction.

## Truth routing

- Institution affiliation and address: official University of Victoria and ENS
  department/building pages linked from `docs/geography-policy.md`.
- Building coordinates: the map target linked from the UVic building directory
  and the OpenStreetMap building feature for ENS Geosciences.
- Runtime repeated-world behavior: `WORLD_COPY_JUMP_ENABLED` in
  `src/components/map/jobs-map-helpers.ts`, consumed by both map containers.
- Generated-data truth: the bundled 555-record JSON after the deterministic
  override rewrite.

## Evidence

- Python geocoding policy tests: 7 passed.
- Vitest: 13 files, 131 tests passed.
- TypeScript: `tsc --noEmit` passed.
- ESLint: full repository passed.
- `git diff --check`: passed.
- Production build: Next.js 16.3.2 webpack build passed.
- Playwright: 5/5 end-to-end tests passed against the final production server.
- Final browser checks against `http://localhost:3030/`:
  - University of Victoria search: one Victoria result; zero Uganda and Kampala
    results.
  - ENS search: one Paris result; zero Burundi and Bujumbura results.
  - After repeated eastward and westward keyboard panning across world copies,
    the filtered Paris marker remained available in both directions.
  - Browser console produced no errors or warnings.
- A complete scan of the rewritten dataset found zero remaining records in
  African countries; the two reported African locations were the only such
  records and both were false-positive institution matches.

## Cold replay

The primary agent re-read the live matcher, generated JSON, map configuration,
tests, documentation, and final verification output after implementation. An
independent subagent review was unavailable under the active no-delegation
constraint, so product-owner browser confirmation remains the independent
acceptance step for the visible map behavior.

## Delivery state

- Local production server is running on port 3030.
- No commit or push was performed.
