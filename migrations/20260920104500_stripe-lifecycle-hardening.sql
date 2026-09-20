-- Harden Stripe entitlement identifiers and synchronize subscription lifecycle events.

-- NULL should mean "not assigned yet", not a globally unique singleton value.
alter table public.entitlements
  drop constraint if exists entitlements_stripe_subscription_id_key;
alter table public.entitlements
  drop constraint if exists entitlements_stripe_checkout_session_id_key;

create unique index if not exists entitlements_stripe_subscription_id_unique
  on public.entitlements (stripe_subscription_id)
  where stripe_subscription_id is not null;
create unique index if not exists entitlements_stripe_checkout_session_id_unique
  on public.entitlements (stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;

create or replace function public.sync_stripe_subscription_event(
  p_event_id text,
  p_event_type text,
  p_subscription_id text,
  p_status text,
  p_period_end timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_org_id uuid;
  target_product_key text;
begin
  if p_subscription_id is null or btrim(p_subscription_id) = '' then
    raise exception 'subscription id is required';
  end if;

  if p_status not in ('trialing', 'active', 'past_due', 'canceled', 'expired') then
    raise exception 'invalid entitlement status';
  end if;

  insert into public.stripe_events (event_id, event_type, processed_at)
  values (p_event_id, p_event_type, now())
  on conflict (event_id) do nothing;

  if not found then
    return false;
  end if;

  update public.entitlements
  set
    status = p_status,
    current_period_end = coalesce(p_period_end, current_period_end),
    updated_at = now()
  where stripe_subscription_id = p_subscription_id
  returning organization_id, product_key
    into target_org_id, target_product_key;

  if target_org_id is null then
    -- Roll the event insert back as well so Stripe can retry after checkout
    -- fulfillment creates the entitlement.
    raise exception 'subscription entitlement not found';
  end if;

  insert into public.audit_events (
    organization_id,
    actor_user_id,
    action,
    entity_type,
    entity_id,
    details
  ) values (
    target_org_id,
    null,
    'ENTITLEMENT_STATUS_UPDATED',
    'entitlement',
    target_product_key,
    jsonb_build_object(
      'status', p_status,
      'eventId', p_event_id,
      'subscriptionId', p_subscription_id
    )
  );

  return true;
end;
$$;

revoke all on function public.sync_stripe_subscription_event(text, text, text, text, timestamptz) from public;
grant execute on function public.sync_stripe_subscription_event(text, text, text, text, timestamptz) to project_admin;
