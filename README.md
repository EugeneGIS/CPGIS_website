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
- Leaflet + OpenStreetMap/CARTO basemap
- Supabase Auth + Postgres
- `mammoth` for `.docx` import parsing

## What already works

- Public homepage that links a map, list, summary cards, and a monthly chart
- Map extent filtering similar to ArcGIS Dashboard behavior
- Address search via `/api/geocode`
- Public share pages at `/jobs/[slug]`
- Submission form for new opportunities
- Admin import page that parses CPGIS-style `.docx` content
- Supabase-ready API routes and schema
- Demo fallback mode when Supabase keys are not configured

## Project structure

- `src/app/page.tsx`: public jobs map
- `src/app/submit/page.tsx`: member submission page
- `src/app/admin/page.tsx`: admin workspace
- `src/app/jobs/[slug]/page.tsx`: public share page
- `src/app/api/geocode/route.ts`: address search proxy
- `src/app/api/import/docx/route.ts`: DOCX parser endpoint
- `src/app/api/jobs/route.ts`: job submission endpoint
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

4. Open [http://localhost:3000](http://localhost:3000)

Without Supabase keys, the app runs in demo mode using local sample data.

## Supabase setup

1. Create a Supabase project.
2. Run the SQL from [src/supabase/schema.sql](/Users/hliu5/Documents/New project/cpgis-job-portal/src/supabase/schema.sql).
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
