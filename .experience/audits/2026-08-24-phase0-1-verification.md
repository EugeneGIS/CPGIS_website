# Closure audit: Phase 0-1 foundation

- Date: `2026-08-24`
- Auditor/reviewer: independent cold replay by `/root/closure_verification`
- Repository state: `3e2018d73fb01a377ab56082a34cdf10966d88c1` with the Phase 0-1 dirty working tree listed by `git status --short`
- Closure contract: Phase 0 automated-test baseline; Phase 1 stable identity/legacy links, DOCX import, request and URL validation, profile RLS tightening, and offline fonts

## Truth sources

- Project rules: `AGENTS.md`
- Owner documentation: `README.md`
- Executable contracts: `package.json`, `.github/workflows/ci.yml`, `src/lib/job-identity.ts`, `src/lib/schemas.ts`, `src/lib/jobs.ts`, API route handlers, `src/supabase/schema.sql`, `src/supabase/migrations/20260824_tighten_profile_select.sql`, and `tests/`

## Live baseline and claimed result

The final stable tree uses Next.js `16.3.2`, Vitest `4.1.11`, and Playwright `1.62.1`. The production build script intentionally uses supported Webpack (`next build --webpack`) because Turbopack's PostCSS worker could not spawn in this local runtime. The bundled dataset contains 555 deterministic, unique job IDs and 555 unique public slugs. Legacy policy contains 433 safe redirects, 46 ambiguous slugs that are not guessed (covering 122 records), and 555 canonical-to-stored aliases.

## Evidence replay

| Gate | Evidence | Result |
|---|---|---|
| Patch hygiene | `git diff --check` | Passed |
| Unit/contract tests | bundled Node + `vitest run`: 7 files, 51 tests | Passed |
| Lint | bundled Node + `eslint .` | Passed |
| Static types | bundled Node + `tsc --noEmit` | Passed |
| Production build | `npm run build`: Next.js 16.3.2 Webpack, all 11 pages generated | Passed |
| Dependency tree | `npm ls --all`: exit 0; required packages resolved. Six top-level optional/WASM helper packages are reported extraneous in this pre-existing local install | Passed with note |
| Dependency advisories | `npm audit --audit-level=low` could not query the npm registry in sandbox; escalated egress was rejected because it would transmit dependency metadata | Unverified (external permission) |
| Dataset identity | independent JSON/HEAD comparison: 555 unique IDs, 555 unique slugs, maximum slug length 80 | Passed |
| Legacy links | production HTTP: safe legacy URL `308` to its expected canonical target; canonical URL `200`; ambiguous legacy URL `404` | Passed |
| Browser baseline | Playwright Chromium: 3/3 tests (homepage, safe redirect, ambiguous 404) | Passed |
| Jobs API errors | production HTTP: malformed JSON `400 MALFORMED_JSON`; `javascript:` URL `400 VALIDATION_FAILED`; invalid `2026-02-30` apply-by date `400 VALIDATION_FAILED` | Passed |
| Jobs API happy path | valid HTTP(S) demo submission with real ISO date returned `200` and deterministic slug | Passed |
| DOCX production policy | unauthenticated production request without configured Supabase returned `503 AUTH_UNAVAILABLE` before parsing | Passed |
| DOCX malformed input | development HTTP: malformed multipart `400 MALFORMED_FORM_DATA`; fake ZIP signature `415 INVALID_DOCX_SIGNATURE` | Passed |
| Real DOCX parse | local `CPGIS.docx` (177 KB) returned `200`, 599 imports, 0 warnings, 599 unique IDs/slugs, all application URLs HTTP(S) | Passed |
| RLS contract | bootstrap schema and dated migration remove public profile SELECT and replace it with own-profile/admin policy through `private.is_admin()` | Passed (static contract); live Supabase application remains deployment-time verification |
| Offline fonts | `next/font/google` removed; system/local fallback variables compile in the production build | Passed |

## Drift and deferred-item adjudication

- No material implementation or owner-document drift was found in the final cold replay.
- Turbopack remains intentionally unused for production builds on this runtime; Webpack is the documented and executable build baseline.
- Live Supabase migration/application and authenticated admin/non-admin RLS behavior were not exercised because no test Supabase instance is configured. The migration is present and aligned with the bootstrap schema; verify it when deploying to a real project.
- Online `npm audit` is the only requested check left unverified. Reopen when the user explicitly authorizes sending dependency metadata to `registry.npmjs.org`, or let CI/security tooling perform the advisory query.
- Map UX, geocoding/location normalization, prescribed Hong Kong/Macau/Taiwan labels and South China Sea line basemap, Plan Ahead, and Submit workflow redesign remain later-phase non-goals.

## Verdict

`Accept`

The Phase 0-1 implementation gates and representative success/failure/runtime paths close with independent evidence. The npm advisory query and live Supabase deployment checks are environment-owned follow-ups rather than confirmed code defects; they are explicitly unverified and must not be represented as passed.
