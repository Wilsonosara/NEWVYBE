alter table public.posts
  add column if not exists video_views bigint not null default 0;

create table if not exists public.post_video_views (
  post_id bigint not null references public.posts(id) on delete cascade,
  viewer_id uuid not null references auth.users(id) on delete cascade,
  view_date date not null default ((now() at time zone 'utc')::date),
  created_at timestamptz not null default now(),
  primary key (post_id, viewer_id, view_date)
);

alter table public.post_video_views enable row level security;
revoke all on public.post_video_views from anon, authenticated;

create or replace function public.record_post_video_view(p_post_id bigint)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  current_viewer_id uuid := auth.uid();
  updated_view_count bigint;
begin
  if current_viewer_id is null then
    raise exception 'Sign in to view videos.' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.posts p
    where p.id = p_post_id
      and (
        p.media_type = 'video'
        or (
          jsonb_typeof(p.media_items) = 'array'
          and exists (
            select 1
            from jsonb_array_elements(p.media_items) as item
            where item ->> 'mediaType' = 'video'
          )
        )
      )
  ) then
    raise exception 'Video post not found.' using errcode = '22023';
  end if;

  insert into public.post_video_views (post_id, viewer_id, view_date)
  values (p_post_id, current_viewer_id, (now() at time zone 'utc')::date)
  on conflict (post_id, viewer_id, view_date) do nothing;

  if found then
    update public.posts
      set video_views = coalesce(video_views, 0) + 1
      where id = p_post_id
      returning video_views into updated_view_count;
  else
    select video_views into updated_view_count
      from public.posts
      where id = p_post_id;
  end if;

  return coalesce(updated_view_count, 0);
end;
$$;

revoke all on function public.record_post_video_view(bigint) from public, anon;
grant execute on function public.record_post_video_view(bigint) to authenticated;
