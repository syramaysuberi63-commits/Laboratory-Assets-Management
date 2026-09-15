-- Run this once in Supabase Dashboard > SQL Editor.
-- It fixes: Could not find the function public.ensure_profile without parameters.

drop function if exists public.ensure_profile();

create or replace function public.ensure_profile()
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  profile_row public.profiles;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in';
  end if;

  select * into profile_row
  from public.profiles
  where id = auth.uid();

  if not found then
    insert into public.profiles (id, email, full_name, role)
    values (
      auth.uid(),
      auth.jwt() ->> 'email',
      coalesce(
        nullif(auth.jwt() ->> 'name', ''),
        split_part(coalesce(auth.jwt() ->> 'email', 'User'), '@', 1)
      ),
      'requester'
    )
    returning * into profile_row;
  end if;

  return profile_row;
end;
$$;

grant usage on schema public to authenticated;
grant execute on function public.ensure_profile() to authenticated;

-- Make the new RPC visible to the Supabase API immediately.
notify pgrst, 'reload schema';
