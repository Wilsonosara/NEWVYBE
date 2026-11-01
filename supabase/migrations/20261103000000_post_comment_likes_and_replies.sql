do $$
declare
  comment_id_type text;
begin
  select format_type(attribute.atttypid, attribute.atttypmod)
    into comment_id_type
    from pg_attribute as attribute
    join pg_class as relation on relation.oid = attribute.attrelid
    join pg_namespace as namespace on namespace.oid = relation.relnamespace
   where namespace.nspname = 'public'
     and relation.relname = 'post_comments'
     and attribute.attname = 'id'
     and not attribute.attisdropped;

  if comment_id_type is null then
    raise exception 'Could not find public.post_comments.id';
  end if;

  execute format(
    'alter table public.post_comments add column if not exists parent_comment_id %s references public.post_comments(id) on delete set null',
    comment_id_type
  );

  execute format(
    'create table if not exists public.post_comment_likes (
      comment_id %s not null references public.post_comments(id) on delete cascade,
      user_id uuid not null references auth.users(id) on delete cascade,
      created_at timestamptz not null default now(),
      primary key (comment_id, user_id)
    )',
    comment_id_type
  );
end $$;

alter table public.post_comment_likes enable row level security;

grant select, insert, delete on public.post_comment_likes to authenticated;

drop policy if exists "Comment likes are visible to signed-in users"
  on public.post_comment_likes;
create policy "Comment likes are visible to signed-in users"
  on public.post_comment_likes
  for select
  to authenticated
  using (true);

drop policy if exists "Users can like comments as themselves"
  on public.post_comment_likes;
create policy "Users can like comments as themselves"
  on public.post_comment_likes
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can remove their own comment likes"
  on public.post_comment_likes;
create policy "Users can remove their own comment likes"
  on public.post_comment_likes
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);
