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
- Submission form for new opportunities
- Admin import page that parses CPGIS-style `.docx` content
- Supabase-ready API routes and schema
- Demo fallback mode for local development when Supabase keys are not configured

## Project structure

- `src/app/page.tsx`: public jobs map
- `src/app/submit/page.tsx`: member submission page
- `src/app/admin/page.tsx`: admin workspace
- `src/app/jobs/[slug]/page.tsx`: public share page
- `src/app/api/geocode/route.ts`: address search proxy
- `src/app/api/import/docx/route.ts`: DOCX parser endpoint
- `src/app/api/jobs/route.ts`: job submission endpoint
- `src/data/china-ten-dash-line.json`: validated WGS84 ten-dash GeoJSON layer
- `scripts/build_south_china_sea_layer.py`: optional GeoPandas maintenance tool
  for rebuilding and cross-checking that layer
- `src/lib/mock-data.ts`: demo dataset based on your sample
- `src/supabase/schema.sql`: Supabase tables, trigger, and RLS policies

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

Without Supabase keys, the app runs in demo mode using local sample data. In
production, DOCX import is disabled until Supabase authentication is configured;
the unauthenticated import preview is development-only.

## Supabase setup

1. Create a Supabase project.
2. Run the SQL from [src/supabase/schema.sql](src/supabase/schema.sql).
3. Add these variables to `.env.local`:

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
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
4. Point Vercel to the `cpgis-job-portal` directory if the repo contains other folders.

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
