# CPGIS Jobs Portal

A non-ArcGIS web implementation of the dashboard pattern you shared, built as a modern web app with:

- public map browsing and shareable detail pages
- member submissions for new job posts
- admin review/import workspace
- address search and map extent filtering
- a Supabase-ready auth and database layer

## Stack

- Next.js 16
- React 19
- Tailwind CSS 4
- Leaflet + MapLibre + keyless OpenFreeMap/OpenStreetMap vector basemap
- Supabase Auth + Postgres
- `mammoth` for `.docx` import parsing

## What already works

- Public homepage that links a map, list, summary cards, and a monthly chart
- Map extent filtering similar to ArcGIS Dashboard behavior
- English-first map labels with Latin/local-name fallback
- Theme-aware South China Sea ten-dash overlay, cross-checked against the
  supplied GS(2020)4619 standard-map boundary layer
- Address search via `/api/geocode`
- Public share pages at `/jobs/[slug]`
- Shareable map ranges at `/map-share` with a server-rendered PNG preview
- Submission form for new opportunities
- Admin import page that parses CPGIS-style `.docx` content
- Admin-only weekly CPGIS media CSV intake with post-ID deduplication and a private review queue (Supabase mode)
- Supabase-ready API routes and schema
- Demo fallback mode for local development when Supabase keys are not configured

## Project structure

- `src/app/page.tsx`: public jobs map
- `src/app/submit/page.tsx`: member submission page
- `src/app/admin/page.tsx`: admin workspace
- `src/app/jobs/[slug]/page.tsx`: public share page
- `src/app/api/geocode/route.ts`: address search proxy
- `src/app/api/import/docx/route.ts`: DOCX parser endpoint
- `src/app/api/import/csv/route.ts`: admin CSV intake endpoint
- `src/app/map-share/page.tsx`: shareable map-range page
- `src/app/api/jobs/route.ts`: job submission endpoint
- `src/data/china-ten-dash-line.json`: validated WGS84 ten-dash GeoJSON layer
- `scripts/build_south_china_sea_layer.py`: optional GeoPandas maintenance tool
  for rebuilding and cross-checking that layer
- `src/lib/mock-data.ts`: demo dataset based on your sample
- `src/supabase/schema.sql`: Supabase tables, trigger, and RLS policies
- `src/supabase/migrations/20261001_map_shares.sql`: saved map-range snapshots
- `src/supabase/migrations/20261001_cpgis_csv_imports.sql`: private weekly intake queue

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Copy the env template:

```bash
cp .env.example .env.local
```

3. Start the app:

```bash
npm run dev
```

Production builds use Next.js's supported webpack opt-in for reproducibility in
the desktop and CI runtimes:

```bash
npm run build
```

4. Open [http://localhost:3000](http://localhost:3000)

Without Supabase keys, local development runs in demo mode using sample data.
In production, the admin page, moderation APIs, CSV/DOCX intake, and job
submissions fail closed until Supabase authentication is configured. The
unauthenticated demo review workflow is development-only.

## Supabase setup

1. Create a Supabase project.
2. Run the SQL from [src/supabase/schema.sql](src/supabase/schema.sql).
3. Add these variables to `.env.local`:

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
GEOCODER_PROVIDER=nominatim
GEOCODER_API_KEY=
NOMINATIM_EMAIL=you@example.com
```

4. Promote an admin user:

```sql
update public.profiles
set role = 'admin'
where id = 'YOUR-USER-UUID';
```

5. Apply the SQL files in `src/supabase/migrations/`, including `20261001_admin_review_notes.sql`. Keep `SUPABASE_SERVICE_ROLE_KEY` server-side only; never expose it as `NEXT_PUBLIC_*` or commit it.

### Admin-only access

The Admin navigation item is rendered only for an authenticated user whose
`profiles.role` is `admin`. Direct `/admin` visits by public visitors or members
return 404; moderation endpoints enforce the same role independently. The
database's RLS policies are the final backstop. Local demo mode deliberately
allows review without a login only outside production.

To enable your own admin account: configure the Supabase URL and anon key in
Vercel, run `schema.sql` plus the migrations in the Supabase SQL Editor, create
your account at `/sign-in`, find its UUID under Supabase Authentication → Users,
and run the `update public.profiles ... where id = ...` statement above. Sign out
and back in if the navigation does not refresh immediately. Keep the service-role
key only in Vercel's server-side environment variables, not in the browser.

## One-time historical DOCX migration

After the Supabase schema and admin-role migration are applied, sign in as an
admin and open `/admin`. Click **Import historical jobs** to move the 5,147
bundled `CPGIS.docx` records into `job_posts`. The import runs in 100-row
batches; if the browser closes or a request fails, click again to resume.
Existing slugs are skipped without overwriting edits. Original source and
publication dates are retained, so the current-jobs map hides expired posts
by default. Do not use the weekly CSV intake for this one-time migration;
that CSV is a separate private review queue.

This action requires a deployed version containing the import button and a
Supabase-authenticated admin session. Repository files alone cannot write to
the hosted database; the import is complete only when the admin panel reports
all 5,147 rows checked. No service-role key needs to be shared in chat.

## Weekly CSV workflow

The provided Friday export directory is `/Users/hliu5/Downloads/CPGIS_statistics/CPGIS-media-20260327/output`. Its CSVs are **social-post statistics**, not a structured jobs table: they contain post IDs, timestamps, raw announcement text, non-job posts, and usually `t.co` short links. The latest file was validated with `CPGIS_SAMPLE_CSV=/absolute/path/to/file.csv npm run test -- tests/unit/cpgis-csv.test.ts`.

An admin can upload the latest CSV in `/admin`. The importer extracts job-like posts, skips repeated post IDs, and stores new entries in a private queue. Review each one in the submission form, resolve its short application link, verify title, organization, deadline and coordinates, then submit it for normal approval and publication. Uploading the same file again does not create duplicate queue entries. Absence from a later weekly export does not withdraw an existing job. The source directory is on a personal computer, so Vercel cannot poll it; **weekly upload is currently manual, not automated**. A scheduled cloud import needs a cloud-accessible source or an upload agent.

Without Supabase, map-range links are live filtered views, not immutable saved snapshots. With Supabase and the service-role key, shares store their selected public job IDs; withdrawn jobs are not disclosed in old shares. The share-image preview reads OpenFreeMap vector tiles on demand and draws water, parks, major roads, and city labels without administrative boundaries. Vercel caches the source tile requests for one day. It does not use CARTO raster tiles or a local basemap GeoJSON. If the upstream tiles are unavailable, the image explicitly says so rather than displaying a watermark or pretending the basemap loaded.

## Geocoding choices

Default: Nominatim fallback for low-volume/demo use.

Recommended for production:

- Geoapify
- Mapbox
- MapTiler

If you use Geoapify, set:

```bash
GEOCODER_PROVIDER=geoapify
GEOCODER_API_KEY=your_key
```

## GitHub and deployment

This app should live in a GitHub repo for source control, but it should **not** be deployed on GitHub Pages because it needs server routes and auth.

Recommended deployment:

- GitHub for code hosting
- Vercel for the Next.js app
- Supabase for auth + database

Typical flow:

1. Push this folder to a GitHub repository.
2. Import that repo into Vercel.
3. Add the same environment variables in Vercel.
4. Set the root directory to this Next.js project if the repository contains other folders.

## Sample data note

The current demo dataset was derived from your `CPGIS.docx` sample. The admin import page can also parse similar `.docx` files directly and preview extracted opportunities before review.

To rebuild the demo data from a DOCX file, pass the source explicitly:

```bash
npm run import:cpgis-demo -- --source-docx /absolute/path/to/CPGIS.docx
```

To recompute stable slugs and the complete legacy-alias policy without reading a
DOCX file, calling external geocoders, or accessing Git history, use the offline
rewrite mode:

```bash
python3 scripts/build_cpgis_demo_data.py --rewrite-existing-slugs
```

When Supabase is configured, database errors are surfaced rather than silently
replaced with demo records. Existing rows that still store legacy slugs remain
resolvable through the generated, identity-verified alias policy.

The DOCX endpoint currently caps uploaded files at 10 MB and checks extension,
MIME type, and ZIP signature. A reverse-proxy request-size/rate limit and a
parser-level decompressed-size or archive-entry cap remain deployment follow-ups;
the current Mammoth integration does not expose those resource controls directly.
