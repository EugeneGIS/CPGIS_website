# Phase 2 map, feed, geography, and job-detail verification

Date: 2026-08-28

## Scope

- Home map interaction fixes: larger hit targets, stable drag state, clear-on-map-click, lighter expired markers, theme-aware palette, updated legend, Share and Apply now.
- Home information architecture: removed public metrics and Map-linked list, five-item incremental feed, selected-item prioritization, back-to-top control.
- Geography policy: product-owned Hong Kong/Macau/Taiwai display strings, deterministic institution-first locations, a 555-record anomaly audit, and the supplied South China Sea ten-dash layer.
- Job detail: single-location map, canonical/Open Graph/Twitter metadata, generated map-style social image, safe Share and Apply now actions.
- Temporary development basemap: keyless OpenFreeMap/OpenStreetMap vector data with English-first labels (`name:en`, then Latin transliteration, then local name); dark presentation uses a local CSS filter.

## Source-of-truth routing

- Product wording: the user's explicit labels are authoritative, including `Taiwai, China`.
- Campus positions: official university contact/campus-map sources recorded in `docs/geography-policy.md`.
- South China Sea representation: the product-owner-supplied WGS84 line is the displayed source; GS(2020)4619 is the review reference. Hashes and geometry checks are recorded in `docs/geography-policy.md`.
- Runtime behavior: current source code and bundled 555-record JSON.

## Verification evidence

- Vitest: 13 files, 128 tests passed.
- Python geocoding policy tests: 6 passed.
- TypeScript: `tsc --noEmit` passed.
- ESLint: full repository passed.
- Production build: Next.js 16.3.2 webpack build passed; dynamic job and Open Graph image routes emitted.
- Playwright: 5/5 end-to-end tests passed against the production server, including home/detail ten-dash rendering.
- Browser checks against `http://localhost:3030/`:
  - 555 marker hit targets rendered.
  - Marker popup exposed Share and Apply now.
  - Clicking blank map space cleared popup and selected feed state.
  - A short drag changed and retained map pane state.
  - Light and dark marker fills differed as specified.
  - Feed started at five items and incrementally loaded additional batches.
  - Back-to-top appeared after scrolling and disappeared after returning to the top.
  - Job detail exposed one location-map region, Share, Apply now, canonical metadata, Twitter large-image metadata, and a rendered 1200x630 Open Graph PNG.
  - The OpenFreeMap vector canvas and required local MapLibre workers loaded; English country labels were visible and no CARTO `API KEY REQUIRED` watermark remained.
  - Light and dark English basemaps rendered; the dark filter was confined to the basemap canvas so job marker colors stayed theme-aware.
  - University of York search returned York, United Kingdom and no York, United States result.
  - University of Augsburg search returned two Augsburg, Germany results and no Almaty/Kazakhstan result.
  - Cornell University search returned six Ithaca, United States results and no Philippines result.
  - Reviewed institution/location rules passed; 63 wrong city/country assignments were corrected and 108 records were normalized to reviewed campus/unit points.
  - Aarhus University's 14 records were split across Aarhus (8), Roskilde (4), Herning (1), and Slagelse (1) instead of sharing one university-wide point.
  - New ROR matches fail closed unless the affiliation endpoint explicitly returns `chosen: true`; direct Python tests cover collision and fallback behavior.
  - Ten separate South China Sea line segments rendered in both themes and on the individual job map.
  - Browser console produced no new errors or warnings in the final pass.

## Independent review note

Implementation was divided across map, home-feed, geography, and job-detail agents. A separate cold review of the ten-dash implementation found no P0-P2 issue. Its P3 recommendations were incorporated by rejecting null source labels, recording source hashes, and covering the detail-map layer and attribution in Playwright. The primary agent then reran all gates.

## Closed release blocker

The South China Sea line is shipped as a non-interactive ten-feature GeoJSON overlay on the English basemap. The source Shapefile and GS(2020)4619 reference were independently compared; the layer was visually verified in light and dark modes. Production publication and any external map-review obligations remain a release-owner decision, not an implementation blocker.

## Delivery state

- No commit or push was performed.
- The working tree contains Phase 0-2 changes and must be reviewed before version-control actions.
