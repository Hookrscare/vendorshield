-- Keep direct vendor deletions auditable without blocking organization cascades.

create or replace function public.audit_vendor_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
begin
  if tg_op = 'INSERT' then
    insert into public.audit_events (
      organization_id, actor_user_id, action, entity_type, entity_id, details
    ) values (
      new.organization_id, coalesce(actor_id, new.created_by), 'VENDOR_ADDED',
      'vendor', new.id::text,
      jsonb_build_object('name', new.name, 'category', new.category,
        'risk_level', new.risk_level, 'dpa_status', new.dpa_status)
    );
    return new;
  elsif tg_op = 'UPDATE' then
    insert into public.audit_events (
      organization_id, actor_user_id, action, entity_type, entity_id, details
    ) values (
      new.organization_id, actor_id, 'VENDOR_UPDATED', 'vendor', new.id::text,
      jsonb_build_object('name', new.name, 'category', new.category,
        'risk_level', new.risk_level, 'dpa_status', new.dpa_status)
    );
    return new;
  elsif tg_op = 'DELETE' then
    -- During ON DELETE CASCADE the parent organization is already absent from
    -- the statement snapshot. Do not attempt to insert an orphan audit row.
    if exists (
      select 1 from public.organizations organization
      where organization.id = old.organization_id
    ) then
      insert into public.audit_events (
        organization_id, actor_user_id, action, entity_type, entity_id, details
      ) values (
        old.organization_id, actor_id, 'VENDOR_DELETED', 'vendor', old.id::text,
        jsonb_build_object('name', old.name, 'category', old.category)
      );
    end if;
    return old;
  end if;
  return null;
end;
$$;

revoke all on function public.audit_vendor_mutation() from public;
