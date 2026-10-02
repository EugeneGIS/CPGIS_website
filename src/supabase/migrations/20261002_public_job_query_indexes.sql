-- Speeds up the active-map date branches and published-job ordering.
create index if not exists job_posts_published_apply_by_idx
  on public.job_posts (apply_by)
  where status = 'published' and apply_by is not null;

create index if not exists job_posts_published_source_date_idx
  on public.job_posts (source_date)
  where status = 'published' and apply_by is null and source_date is not null;

create index if not exists job_posts_published_created_at_idx
  on public.job_posts (created_at desc)
  where status = 'published';

create index if not exists job_posts_status_updated_at_idx
  on public.job_posts (status, updated_at desc);
