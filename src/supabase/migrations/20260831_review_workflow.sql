-- Phase 3.3 review workflow: extended status machine, review notes,
-- and social-publishing timestamps (tier-1: staff copy drafts manually).

alter type public.job_status add value if not exists 'needs_changes';
alter type public.job_status add value if not exists 'approved';

alter table public.job_posts
  add column if not exists facebook_posted_at timestamptz;

alter table public.job_posts
  add column if not exists x_posted_at timestamptz;

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

alter table public.job_review_notes enable row level security;

-- Admins read every note; creators read notes on their own submissions so
-- they can see "needs changes" feedback.
drop policy if exists "Admins and creators read review notes" on public.job_review_notes;
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

drop policy if exists "Authenticated users write their own review notes" on public.job_review_notes;
create policy "Authenticated users write their own review notes"
on public.job_review_notes
for insert
to authenticated
with check ((select auth.uid()) = author_id);

drop policy if exists "Admins manage review notes" on public.job_review_notes;
create policy "Admins manage review notes"
on public.job_review_notes
for delete
to authenticated
using ((select private.is_admin()));

-- Creators may revise their own records through the "needs changes" loop in
-- addition to draft/pending.
drop policy if exists "Members can update own non-published jobs" on public.job_posts;
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
