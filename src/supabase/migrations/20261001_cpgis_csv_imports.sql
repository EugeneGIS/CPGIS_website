create table if not exists public.cpgis_csv_imports (
  source_id text primary key,
  posted_at timestamptz not null,
  raw_text text not null,
  extracted jsonb not null,
  source_file text not null,
  review_status text not null default 'pending' check (review_status in ('pending', 'reviewed', 'ignored')),
  imported_at timestamptz not null default timezone('utc', now())
);

create index if not exists cpgis_csv_imports_review_idx
  on public.cpgis_csv_imports (review_status, posted_at desc);

alter table public.cpgis_csv_imports enable row level security;
-- Import routes use the service role after separately verifying the admin session.
