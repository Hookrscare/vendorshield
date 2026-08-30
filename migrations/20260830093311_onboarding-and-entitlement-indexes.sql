-- Make nullable Stripe identifiers unique only when they exist.
alter table public.entitlements
  drop constraint entitlements_stripe_subscription_id_key,
  drop constraint entitlements_stripe_checkout_session_id_key;

create unique index entitlements_stripe_subscription_unique
  on public.entitlements(stripe_subscription_id)
  where stripe_subscription_id is not null;

create unique index entitlements_stripe_checkout_session_unique
  on public.entitlements(stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;

-- Bootstrap an organization, owner membership, settings, and audit record atomically.
create function public.create_organization(organization_name text, organization_slug text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  new_organization_id uuid;
  normalized_name text := btrim(organization_name);
  normalized_slug text := lower(btrim(organization_slug));
begin
  if current_user_id is null then
    raise exception 'authentication required';
  end if;

  if char_length(normalized_name) not between 1 and 160 then
    raise exception 'organization name must be between 1 and 160 characters';
  end if;

  if normalized_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    raise exception 'organization slug is invalid';
  end if;

  insert into public.organizations (name, slug, created_by)
  values (normalized_name, normalized_slug, current_user_id)
  returning id into new_organization_id;

  insert into public.organization_members (organization_id, user_id, role)
  values (new_organization_id, current_user_id, 'owner');

  insert into public.company_settings (organization_id)
  values (new_organization_id);

  insert into public.audit_events (
    organization_id,
    actor_user_id,
    action,
    entity_type,
    entity_id,
    details
  ) values (
    new_organization_id,
    current_user_id,
    'ORGANIZATION_CREATED',
    'organization',
    new_organization_id::text,
    jsonb_build_object('name', normalized_name)
  );

  return new_organization_id;
end;
$$;

revoke all on function public.is_organization_member(uuid) from public;
revoke all on function public.is_organization_admin(uuid) from public;
revoke all on function public.create_organization(text, text) from public;

grant execute on function public.is_organization_member(uuid) to authenticated;
grant execute on function public.is_organization_admin(uuid) to authenticated;
grant execute on function public.create_organization(text, text) to authenticated;
