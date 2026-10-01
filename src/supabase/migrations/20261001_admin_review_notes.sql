drop policy if exists "Admins and creators read review notes" on public.job_review_notes;
drop policy if exists "Authenticated users write their own review notes" on public.job_review_notes;

revoke all on public.job_review_notes from anon;
revoke all on public.job_review_notes from authenticated;
grant select, insert, delete on public.job_review_notes to authenticated;

create policy "Admins read review notes"
on public.job_review_notes for select to authenticated
using ((select private.is_admin()));

create policy "Admins write review notes"
on public.job_review_notes for insert to authenticated
with check ((select private.is_admin()) and (select auth.uid()) = author_id);
