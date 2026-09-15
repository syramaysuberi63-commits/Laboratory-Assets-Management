-- Run this once in Supabase Dashboard > SQL Editor.
-- Enables Administrator user, equipment, and maintenance management.

drop function if exists public.update_user_role(uuid, public.app_role);
drop function if exists public.update_maintenance_status(bigint, public.maintenance_status);

create or replace function public.update_user_role(
  p_user_id uuid,
  p_role public.app_role
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_role() <> 'administrator' then
    raise exception 'Only Administrator may manage users';
  end if;
  if not exists (select 1 from public.profiles where id = p_user_id) then
    raise exception 'User not found';
  end if;
  update public.profiles set role = p_role where id = p_user_id;
  perform public.write_audit('UPDATED', 'Users', null, 'Updated user role');
end;
$$;

grant execute on function public.update_user_role(uuid, public.app_role) to authenticated;

create or replace function public.update_maintenance_status(
  p_request_id bigint,
  p_status public.maintenance_status
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  equipment_id_value bigint;
begin
  if public.current_role() <> 'administrator' then
    raise exception 'Only Administrator may manage maintenance';
  end if;

  select equipment_id into equipment_id_value
  from public.maintenance_requests
  where id = p_request_id;

  if equipment_id_value is null then
    raise exception 'Maintenance request not found';
  end if;

  update public.maintenance_requests
  set status = p_status,
      resolved_at = case when p_status = 'Resolved' then now() else null end
  where id = p_request_id;

  if p_status = 'Resolved' then
    update public.equipment set status = 'Available'
    where id = equipment_id_value;
  end if;

  perform public.write_audit(
    'UPDATED',
    'Maintenance',
    p_request_id,
    'Updated maintenance status to ' || p_status
  );
end;
$$;

grant execute on function public.update_maintenance_status(bigint, public.maintenance_status) to authenticated;

-- create_equipment already exists in schema.sql. Re-grant it for the API role.
grant execute on function public.create_equipment(text, text, text, text) to authenticated;

create or replace function public.update_equipment(
  p_equipment_id bigint,
  p_asset_code text,
  p_name text,
  p_category text,
  p_condition text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_role() <> 'administrator' then
    raise exception 'Only Administrator may manage equipment';
  end if;
  update public.equipment
  set asset_code = trim(p_asset_code), name = trim(p_name),
      category = trim(p_category), condition = trim(p_condition)
  where id = p_equipment_id;
  if not found then raise exception 'Equipment not found'; end if;
  perform public.write_audit('UPDATED', 'Equipment', p_equipment_id, 'Updated equipment');
end;
$$;

grant execute on function public.update_equipment(bigint, text, text, text, text)
to authenticated;

notify pgrst, 'reload schema';
