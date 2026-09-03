-- Migration: 20260903031500_team-and-entitlements.sql
-- Description: Atomic team invitations, membership management, and durable webhook entitlement provisioning.

-- 1. Create team invitation RPC
create or replace function public.create_team_invite(
  target_org_id uuid,
  invite_email text,
  invite_role text,
  invite_token text,
  invite_expires_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_role text;
  new_invite public.organization_invites;
begin
  -- Validate caller has owner or admin role
  select membership.role into caller_role
  from public.organization_members membership
  where membership.organization_id = target_org_id
    and membership.user_id = auth.uid()
  limit 1;

  if caller_role is null or caller_role not in ('owner', 'admin') then
    raise exception 'only organization owners and admins can invite team members';
  end if;

  if invite_role not in ('admin', 'member', 'viewer') then
    raise exception 'invalid role specified for invitation';
  end if;

  insert into public.organization_invites (
    organization_id,
    email,
    role,
    invited_by,
    token,
    expires_at
  ) values (
    target_org_id,
    lower(btrim(invite_email)),
    invite_role,
    auth.uid(),
    invite_token,
    invite_expires_at
  )
  on conflict (organization_id, email) do update set
    role = excluded.role,
    token = excluded.token,
    expires_at = excluded.expires_at,
    created_at = now()
  returning * into new_invite;

  return jsonb_build_object(
    'id', new_invite.id,
    'email', new_invite.email,
    'role', new_invite.role,
    'expiresAt', new_invite.expires_at,
    'createdAt', new_invite.created_at
  );
end;
$$;

-- 2. Remove team member RPC
create or replace function public.remove_team_member(
  target_org_id uuid,
  target_user_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_role text;
  target_member_role text;
  owner_count int;
begin
  select membership.role into caller_role
  from public.organization_members membership
  where membership.organization_id = target_org_id
    and membership.user_id = auth.uid()
  limit 1;

  if caller_role is null or caller_role not in ('owner', 'admin') then
    raise exception 'only organization owners and admins can remove team members';
  end if;

  select membership.role into target_member_role
  from public.organization_members membership
  where membership.organization_id = target_org_id
    and membership.user_id = target_user_id
  limit 1;

  if target_member_role is null then
    return false;
  end if;

  -- Protect against removing the sole owner
  if target_member_role = 'owner' then
    select count(*) into owner_count
    from public.organization_members membership
    where membership.organization_id = target_org_id
      and membership.role = 'owner';

    if owner_count <= 1 then
      raise exception 'cannot remove the only organization owner';
    end if;
  end if;

  delete from public.organization_members
  where organization_id = target_org_id
    and user_id = target_user_id;

  return true;
end;
$$;

-- 3. Atomic Stripe event recording and entitlement provisioning
create or replace function public.record_stripe_event_and_entitlement(
  p_event_id text,
  p_event_type text,
  p_org_id uuid,
  p_product_key text,
  p_status text,
  p_customer_id text,
  p_subscription_id text,
  p_session_id text,
  p_period_end timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Idempotency check: insert event. If exists, do nothing and return false (deduplicated).
  insert into public.stripe_events (event_id, event_type, processed_at)
  values (p_event_id, p_event_type, now())
  on conflict (event_id) do nothing;

  if not found then
    return false; -- Event already processed
  end if;

  -- Upsert entitlement if organization ID is supplied
  if p_org_id is not null and p_product_key is not null then
    insert into public.entitlements (
      organization_id,
      product_key,
      status,
      stripe_customer_id,
      stripe_subscription_id,
      stripe_checkout_session_id,
      current_period_end,
      updated_at
    ) values (
      p_org_id,
      p_product_key,
      p_status,
      p_customer_id,
      p_subscription_id,
      p_session_id,
      p_period_end,
      now()
    )
    on conflict (organization_id, product_key) do update set
      status = excluded.status,
      stripe_customer_id = coalesce(excluded.stripe_customer_id, public.entitlements.stripe_customer_id),
      stripe_subscription_id = coalesce(excluded.stripe_subscription_id, public.entitlements.stripe_subscription_id),
      stripe_checkout_session_id = coalesce(excluded.stripe_checkout_session_id, public.entitlements.stripe_checkout_session_id),
      current_period_end = coalesce(excluded.current_period_end, public.entitlements.current_period_end),
      updated_at = now();

    -- Append audit log entry
    insert into public.audit_events (
      organization_id,
      event_type,
      entity_type,
      entity_id,
      metadata
    ) values (
      p_org_id,
      'entitlement_provisioned',
      'entitlements',
      p_product_key,
      jsonb_build_object(
        'productKey', p_product_key,
        'status', p_status,
        'eventId', p_event_id,
        'subscriptionId', p_subscription_id
      )
    );
  end if;

  return true;
end;
$$;

-- 4. Permissions
revoke all on function public.create_team_invite(uuid, text, text, text, timestamptz) from public;
revoke all on function public.remove_team_member(uuid, uuid) from public;
revoke all on function public.record_stripe_event_and_entitlement(text, text, uuid, text, text, text, text, text, timestamptz) from public;

grant execute on function public.create_team_invite(uuid, text, text, text, timestamptz) to authenticated;
grant execute on function public.remove_team_member(uuid, uuid) to authenticated;
grant execute on function public.record_stripe_event_and_entitlement(text, text, uuid, text, text, text, text, text, timestamptz) to authenticated, service_role;
