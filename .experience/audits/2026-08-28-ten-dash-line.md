# South China Sea ten-dash layer closure audit

Date: 2026-08-28

## Verified source contract

- The supplied WGS84 Shapefile contains exactly ten `LineString` features.
- Every feature has `GBCODE=61010`, a non-null `备注=十段线`, and one of the ten expected segment identifiers.
- Every identifier has a counterpart in the supplied GS(2020)4619 boundary layer.
- The generated GeoJSON preserves the source geometry rounded to six decimals; source and output hashes are recorded in `docs/geography-policy.md`.

## Integration checks

- Layer pane order is basemap, ten-dash overlay, then job markers.
- The overlay is non-interactive and therefore does not intercept marker or map input.
- Light and dark themes use separate reviewed colors.
- The home map and individual job map both render all ten segments and the source attribution.

## Independent cold review

The reviewer reported no P0-P2 findings. Three P3 closure improvements were accepted: require every source label to be non-null, record archive/output hashes, and cover the detail map and attribution in end-to-end tests.

## Delivery state

- No commit or push was performed.
