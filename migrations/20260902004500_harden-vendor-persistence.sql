-- VendorShield Hardened Persistence & Role Enforcement
-- Migration: 20260902004500_harden-vendor-persistence.sql
-- Enforces role-based write gates (viewer blocked), immutable audit triggers,
-- tenant immutability, and atomic company settings management.

-- 1. Helper function: verify if authenticated user has write permissions (owner, admin, member)
create or replace function public.is_organization_writer(target_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members membership
    where membership.organization_id = target_organization_id
      and membership.user_id = auth.uid()
      and membership.role in ('owner', 'admin', 'member')
  );
$$;

-- 2. Update RLS policies on public.vendors to restrict inserts and updates from viewers
drop policy if exists vendors_insert on public.vendors;
create policy vendors_insert on public.vendors for insert to authenticated
with check (
  public.is_organization_writer(organization_id)
  and created_by = auth.uid()
);

drop policy if exists vendors_update on public.vendors;
create policy vendors_update on public.vendors for update to authenticated
using (public.is_organization_writer(organization_id))
with check (public.is_organization_writer(organization_id));

drop policy if exists vendors_delete on public.vendors;
create policy vendors_delete on public.vendors for delete to authenticated
using (public.is_organization_admin(organization_id));

-- 3. Prevent modification of immutable fields on public.vendors
create or replace function public.prevent_vendor_immutable_field_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.organization_id <> old.organization_id then
    raise exception 'organization_id is immutable';
  end if;
  if new.id <> old.id then
    raise exception 'id is immutable';
  end if;
  if new.created_by <> old.created_by then
    raise exception 'created_by is immutable';
  end if;
  if new.created_at <> old.created_at then
    raise exception 'created_at is immutable';
  end if;
  return new;
end;
$$;

drop trigger if exists vendors_immutable_fields on public.vendors;
create trigger vendors_immutable_fields
before update on public.vendors
for each row execute function public.prevent_vendor_immutable_field_change();

-- 4. Automatic immutable audit logging trigger on public.vendors
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
      organization_id,
      actor_user_id,
      action,
      entity_type,
      entity_id,
      details
    ) values (
      new.organization_id,
      coalesce(actor_id, new.created_by),
      'VENDOR_ADDED',
      'vendor',
      new.id::text,
      jsonb_build_object(
        'name', new.name,
        'category', new.category,
        'risk_level', new.risk_level,
        'dpa_status', new.dpa_status
      )
    );
    return new;
  elsif tg_op = 'UPDATE' then
    insert into public.audit_events (
      organization_id,
      actor_user_id,
      action,
      entity_type,
      entity_id,
      details
    ) values (
      new.organization_id,
      actor_id,
      'VENDOR_UPDATED',
      'vendor',
      new.id::text,
      jsonb_build_object(
        'name', new.name,
        'category', new.category,
        'risk_level', new.risk_level,
        'dpa_status', new.dpa_status
      )
    );
    return new;
  elsif tg_op = 'DELETE' then
    insert into public.audit_events (
      organization_id,
      actor_user_id,
      action,
      entity_type,
      entity_id,
      details
    ) values (
      old.organization_id,
      actor_id,
      'VENDOR_DELETED',
      'vendor',
      old.id::text,
      jsonb_build_object(
        'name', old.name,
        'category', old.category
      )
    );
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists vendors_audit_mutation on public.vendors;
create trigger vendors_audit_mutation
after insert or update or delete on public.vendors
for each row execute function public.audit_vendor_mutation();

-- 5. Automatic immutable audit logging trigger on public.company_settings
create or replace function public.audit_company_settings_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := auth.uid();
begin
  insert into public.audit_events (
    organization_id,
    actor_user_id,
    action,
    entity_type,
    entity_id,
    details
  ) values (
    new.organization_id,
    actor_id,
    'COMPANY_SETTINGS_UPDATED',
    'company_settings',
    new.organization_id::text,
    jsonb_build_object(
      'website', new.website,
      'privacy_email', new.privacy_email,
      'dpo_name', new.dpo_name,
      'theme', new.theme
    )
  );
  return new;
end;
$$;

drop trigger if exists company_settings_audit_mutation on public.company_settings;
create trigger company_settings_audit_mutation
after update on public.company_settings
for each row execute function public.audit_company_settings_mutation();

-- 6. Atomic company settings update RPC for admin/owner
create or replace function public.update_company_settings(
  target_organization_id uuid,
  new_name text default null,
  new_website text default null,
  new_privacy_email text default null,
  new_dpo_name text default null,
  new_notification_email text default null,
  new_theme text default null,
  new_auto_sync_public_page boolean default null,
  new_last_audit_date date default null
)
returns public.company_settings
language plpgsql
security definer
set search_path = ''
as $$
declare
  updated_settings public.company_settings;
  normalized_name text;
begin
  if not public.is_organization_admin(target_organization_id) then
    raise exception 'admin permission required';
  end if;

  if new_name is not null then
    normalized_name := btrim(new_name);
    if char_length(normalized_name) not between 1 and 160 then
      raise exception 'organization name must be between 1 and 160 characters';
    end if;

    update public.organizations
    set name = normalized_name, updated_at = now()
    where id = target_organization_id;
  end if;

  update public.company_settings
  set
    website = coalesce(new_website, website),
    privacy_email = coalesce(new_privacy_email, privacy_email),
    dpo_name = coalesce(new_dpo_name, dpo_name),
    notification_email = coalesce(new_notification_email, notification_email),
    theme = coalesce(new_theme, theme),
    auto_sync_public_page = coalesce(new_auto_sync_public_page, auto_sync_public_page),
    last_audit_date = coalesce(new_last_audit_date, last_audit_date),
    updated_at = now()
  where organization_id = target_organization_id
  returning * into updated_settings;

  return updated_settings;
end;
$$;

-- 7. Grant and revoke definitions
revoke all on function public.is_organization_writer(uuid) from public;
revoke all on function public.prevent_vendor_immutable_field_change() from public;
revoke all on function public.audit_vendor_mutation() from public;
revoke all on function public.audit_company_settings_mutation() from public;
revoke all on function public.update_company_settings(uuid, text, text, text, text, text, text, boolean, date) from public;

grant execute on function public.is_organization_writer(uuid) to authenticated;
grant execute on function public.update_company_settings(uuid, text, text, text, text, text, text, boolean, date) to authenticated;
