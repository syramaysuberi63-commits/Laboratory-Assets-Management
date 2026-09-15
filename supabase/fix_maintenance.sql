-- Run this once in Supabase Dashboard > SQL Editor.
-- It enables Administrator -> Maintenance -> Add Maintenance.

drop function if exists public.create_maintenance_request(bigint, text);

create or replace function public.create_maintenance_request(
  p_equipment_id bigint,
  p_description text
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  request_id bigint;
begin
  if public.current_role() not in ('administrator', 'staff') then
    raise exception 'Only Administrator or Laboratory Staff may add maintenance requests';
  end if;

  if nullif(trim(p_description), '') is null then
    raise exception 'Description is required';
  end if;

  if not exists (
    select 1 from public.equipment where id = p_equipment_id
  ) then
    raise exception 'Equipment not found';
  end if;

  insert into public.maintenance_requests (
    equipment_id,
    requester_id,
    description
  )
  values (
    p_equipment_id,
    auth.uid(),
    trim(p_description)
  )
  returning id into request_id;

  update public.equipment
  set status = 'Maintenance'
  where id = p_equipment_id;

  perform public.write_audit(
    'CREATED',
    'Maintenance',
    request_id,
    'Created maintenance request'
  );

  return request_id;
end;
$$;

grant execute on function public.create_maintenance_request(bigint, text)
to authenticated;

notify pgrst, 'reload schema';
