create table if not exists public.direct_message_deletions (
  message_id bigint not null references public.direct_messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  deleted_at timestamptz not null default now(),
  primary key (message_id, user_id)
);

alter table public.direct_message_deletions enable row level security;

drop policy if exists "Users can view their own message deletions" on public.direct_message_deletions;
create policy "Users can view their own message deletions"
  on public.direct_message_deletions for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "Conversation members can hide messages for themselves" on public.direct_message_deletions;
create policy "Conversation members can hide messages for themselves"
  on public.direct_message_deletions for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.direct_messages dm
      where dm.id = message_id
        and auth.uid() in (dm.sender_id, dm.recipient_id)
    )
  );

grant select, insert on public.direct_message_deletions to authenticated;
