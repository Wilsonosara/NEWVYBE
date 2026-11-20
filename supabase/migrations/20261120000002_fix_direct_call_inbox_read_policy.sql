drop policy if exists "Users can receive direct call signals in their inbox"
on realtime.messages;

create policy "Users can receive direct call signals in their inbox"
on realtime.messages
for select
to authenticated
using (
  extension = 'broadcast'
  and (
    (select realtime.topic()) = 'direct-calls:' || (select auth.uid())::text
    or (
      (select realtime.topic()) like 'direct-calls:%'
      and split_part((select realtime.topic()), ':', 2) <> (select auth.uid())::text
      and exists (
        select 1
        from public.direct_messages dm
        where (
          dm.sender_id = (select auth.uid())
          and dm.recipient_id::text = split_part((select realtime.topic()), ':', 2)
        ) or (
          dm.recipient_id = (select auth.uid())
          and dm.sender_id::text = split_part((select realtime.topic()), ':', 2)
        )
      )
      and not exists (
        select 1
        from public.blocked_users bu
        where (
          bu.blocker_id = (select auth.uid())
          and bu.blocked_id::text = split_part((select realtime.topic()), ':', 2)
        ) or (
          bu.blocked_id = (select auth.uid())
          and bu.blocker_id::text = split_part((select realtime.topic()), ':', 2)
        )
      )
    )
  )
);
