create extension if not exists pgcrypto;

create type public.job_status as enum ('draft', 'pending', 'published', 'archived');
create type public.app_role as enum ('member', 'admin');

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  role public.app_role not null default 'member',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.job_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  organization text not null,
  department text,
  summary text not null,
  description text,
  application_url text not null,
  contact_email text,
  city text not null,
  country text not null,
  address text,
  latitude double precision not null,
  longitude double precision not null,
  apply_by date,
  deadline_text text not null default 'Open until filled',
  source_date date,
  import_source text not null default 'manual-form',
  tags text[] not null default '{}',
  status public.job_status not null default 'pending',
  created_by uuid references auth.users (id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
before update on public.profiles
for each row execute procedure public.handle_updated_at();

drop trigger if exists job_posts_updated_at on public.job_posts;
create trigger job_posts_updated_at
before update on public.job_posts
for each row execute procedure public.handle_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.job_posts enable row level security;

create policy "Public profiles are readable"
on public.profiles
for select
using (true);

create policy "Users can read published jobs"
on public.job_posts
for select
using (status = 'published' or auth.uid() = created_by);

create policy "Members can create jobs"
on public.job_posts
for insert
to authenticated
with check (auth.uid() = created_by);

create policy "Members can update own non-published jobs"
on public.job_posts
for update
to authenticated
using (
  auth.uid() = created_by
  and status in ('draft', 'pending')
)
with check (
  auth.uid() = created_by
  and status in ('draft', 'pending')
);

create policy "Admins manage everything"
on public.job_posts
for all
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);
