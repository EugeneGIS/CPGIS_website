create extension if not exists pgcrypto;

create type public.job_status as enum (
  'draft',
  'pending',
  'needs_changes',
  'approved',
  'published',
  'archived'
);
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
  facebook_posted_at timestamptz,
  x_posted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.job_review_notes (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.job_posts (id) on delete cascade,
  author_id uuid references auth.users (id) on delete set null,
  author_email text,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists job_review_notes_job_id_idx
  on public.job_review_notes (job_id, created_at desc);

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
alter table public.job_review_notes enable row level security;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where public.profiles.id = (select auth.uid())
      and public.profiles.role = 'admin'
  );
$$;

revoke all on function private.is_admin() from public;
grant execute on function private.is_admin() to authenticated;

drop policy if exists "Public profiles are readable" on public.profiles;
drop policy if exists "Users read their own profile or admins read all" on public.profiles;
create policy "Users read their own profile or admins read all"
on public.profiles
for select
to authenticated
using (
  (select auth.uid()) = id
  or (select private.is_admin())
);

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
  and status in ('draft', 'pending', 'needs_changes')
)
with check (
  auth.uid() = created_by
  and status in ('draft', 'pending', 'needs_changes')
);

create policy "Admins and creators read review notes"
on public.job_review_notes
for select
to authenticated
using (
  (select private.is_admin())
  or exists (
    select 1
    from public.job_posts
    where public.job_posts.id = job_review_notes.job_id
      and public.job_posts.created_by = (select auth.uid())
  )
);

create policy "Authenticated users write their own review notes"
on public.job_review_notes
for insert
to authenticated
with check ((select auth.uid()) = author_id);

create policy "Admins manage review notes"
on public.job_review_notes
for delete
to authenticated
using ((select private.is_admin()));

drop policy if exists "Admins manage everything" on public.job_posts;
create policy "Admins manage everything"
on public.job_posts
for all
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));
