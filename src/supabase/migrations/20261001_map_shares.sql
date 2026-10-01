create table if not exists public.map_shares (
  id uuid primary key,
  bounds jsonb not null,
  query text not null default '',
  include_expired boolean not null default false,
  theme text not null default 'light' check (theme in ('light', 'dark')),
  job_ids uuid[] not null default '{}',
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists map_shares_created_at_idx
  on public.map_shares (created_at desc);

alter table public.map_shares enable row level security;
drop policy if exists "Anyone can view a shared map" on public.map_shares;
create policy "Anyone can view a shared map"
on public.map_shares for select to anon, authenticated using (true);

grant select on public.map_shares to anon, authenticated;
