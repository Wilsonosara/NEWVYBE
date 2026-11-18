update public.profiles as profile
set
  display_name = coalesce(
    nullif(btrim(auth_user.raw_user_meta_data ->> 'full_name'), ''),
    nullif(btrim(auth_user.raw_user_meta_data ->> 'name'), ''),
    nullif(btrim(profile.username), ''),
    nullif(split_part(coalesce(auth_user.email, ''), '@', 1), '')
  ),
  updated_at = now()
from auth.users as auth_user
where profile.id = auth_user.id
  and (
    profile.display_name is null
    or btrim(profile.display_name) = ''
    or lower(btrim(profile.display_name)) in (
      'vybe user',
      'vybe users',
      'vybe member',
      'vybe members'
    )
  )
  and coalesce(
    nullif(btrim(auth_user.raw_user_meta_data ->> 'full_name'), ''),
    nullif(btrim(auth_user.raw_user_meta_data ->> 'name'), ''),
    nullif(btrim(profile.username), ''),
    nullif(split_part(coalesce(auth_user.email, ''), '@', 1), '')
  ) is not null;
