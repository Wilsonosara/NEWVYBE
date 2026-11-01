create policy "Users can delete their own post comments"
on public.post_comments
for delete
to authenticated
using ((select auth.uid()) = user_id);
