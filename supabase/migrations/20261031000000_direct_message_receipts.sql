alter table public.direct_messages
  add column if not exists delivered_at timestamptz,
  add column if not exists read_at timestamptz;

create or replace function public.mark_direct_messages_delivered(
  p_message_ids bigint[]
)
returns void
language sql
security definer
set search_path = public
as $$
  update public.direct_messages
  set delivered_at = now()
  where id = any(p_message_ids)
    and recipient_id = auth.uid()
    and delivered_at is null;
$$;

create or replace function public.mark_direct_messages_read(
  p_sender_id uuid
)
returns void
language sql
security definer
set search_path = public
as $$
  update public.direct_messages
  set delivered_at = coalesce(delivered_at, now()),
      read_at = coalesce(read_at, now())
  where sender_id = p_sender_id
    and recipient_id = auth.uid()
    and read_at is null;
$$;

revoke all on function public.mark_direct_messages_delivered(bigint[]) from public;
revoke all on function public.mark_direct_messages_read(uuid) from public;
grant execute on function public.mark_direct_messages_delivered(bigint[]) to authenticated;
grant execute on function public.mark_direct_messages_read(uuid) to authenticated;
