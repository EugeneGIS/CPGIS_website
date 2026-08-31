begin;

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

drop policy if exists "Admins manage everything" on public.job_posts;
create policy "Admins manage everything"
on public.job_posts
for all
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

commit;
