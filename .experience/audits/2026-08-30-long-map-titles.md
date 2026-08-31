# Closure audit: compact long-title map cards

- Date: `2026-08-30`
- Auditor/reviewer: primary-agent solo cold replay; independent review unavailable under the active no-delegation constraint
- Repository state: dirty Phase 0-2 working tree; no commit or push performed
- Closure contract: the product-owner report that long job titles impaired browsing in the map visualization

## Truth sources

- Requirement: the product-owner feedback in the active task
- Project rules: `AGENTS.md`
- Executable behavior: `src/components/map/jobs-map.tsx` and `src/app/globals.css`
- Regression contract: `tests/e2e/home.spec.ts`

## Live baseline and claimed result

Leaflet's default no-wrap tooltip allowed the longest bundled title (237
characters) to overflow horizontally across the map, while the selected-job
popup devoted excessive vertical space to the same title. The updated map uses
viewport-bounded cards, natural word wrapping, a three-line tooltip title, and
a four-line selected-job title. Institution names are limited to two lines.
The full title remains available through the native title attribute and the
popup exposes a `View details` link to the complete job page.

On screens at or below 480 CSS pixels, the Leaflet zoom control is temporarily
hidden while a popup is open so it cannot cover the compact card; it returns
when the popup closes and touch zoom remains available.

## Evidence replay

| Gate | Evidence | Result |
|---|---|---|
| Long-title behavior | Playwright `long job titles stay inside compact map cards` checks horizontal bounds, real title clamping, detail link, 390x844 popup bounds, and narrow-screen control behavior | Passed |
| Full browser flows | `PLAYWRIGHT_TEST_BASE_URL=http://127.0.0.1:3030 npm run test:e2e`: 6/6 Chromium tests | Passed |
| Unit and data contracts | `npm test`: 13 Vitest files / 131 tests and 7 Python tests | Passed |
| Static checks | `npm run lint`, `npx tsc --noEmit`, and `git diff --check` | Passed |
| Production package | `npm run build`: Next.js 16.3.2 Webpack production build | Passed |
| Desktop visual runtime | longest title rendered as a compact four-line popup with ellipsis and three actions; no horizontal overflow | Passed |
| Mobile visual runtime | 390x844 popup measured x=21.89, right=379.89, width=358; title client/scroll heights 73/109; zoom control opacity 0 while open | Passed |
| Owner-doc adjudication | no stable product or architecture contract changes; behavior is owned by component styles and the end-to-end regression test | Aligned |

## Drift and deferred-item adjudication

- No implementation or document drift was found for this UI slice.
- The broader Phase 0-2 dirty working tree is intentionally preserved and is
  outside this micro-feature's version-control authority.
- No reusable Experience candidate was created: the solution is a localized,
  fully tested presentation rule rather than a cross-project method.
- Product-owner browser confirmation remains the independent acceptance step
  for the visible design because a separate reviewer was unavailable.

## Verdict

`Accept`

The reported browsing defect is closed with focused desktop and mobile runtime
proof plus the full configured test, lint, type, build, and end-to-end gates.
The solo-review limitation is acceptable for this non-protected presentation
change and does not conceal a failed or unverified implementation gate.
