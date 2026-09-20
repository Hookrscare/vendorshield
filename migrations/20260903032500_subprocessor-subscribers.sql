-- Migration: 20260903032500_subprocessor-subscribers.sql
-- Description: GDPR Article 28(2) sub-processor change subscribers and directory profile claiming.

-- 1. Sub-processor change subscribers
create table if not exists public.subprocessor_subscribers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (organization_id, email)
);

create index if not exists idx_subprocessor_subscribers_org
  on public.subprocessor_subscribers (organization_id);

-- 2. Claimed directory profiles
create table if not exists public.claimed_directory_profiles (
  id uuid primary key default gen_random_uuid(),
  vendor_slug text not null unique,
  organization_id uuid references public.organizations(id) on delete set null,
  stripe_subscription_id text unique,
  is_verified boolean not null default false,
  claimed_at timestamptz not null default now()
);

-- 3. Public subscription RPC
create or replace function public.subscribe_subprocessor_changes(
  p_slug text,
  p_email text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_org_id uuid;
begin
  if p_email is null
    or char_length(lower(btrim(p_email))) not between 3 and 254
    or lower(btrim(p_email)) !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'invalid subscriber email';
  end if;

  select organization.id into target_org_id
  from public.organizations organization
  join public.company_settings settings
    on settings.organization_id = organization.id
   and settings.auto_sync_public_page = true
  where organization.slug = lower(btrim(p_slug))
  limit 1;

  if target_org_id is null then
    return false;
  end if;

  insert into public.subprocessor_subscribers (
    organization_id,
    email,
    is_active
  ) values (
    target_org_id,
    lower(btrim(p_email)),
    true
  )
  on conflict (organization_id, email) do update set
    is_active = true;

  return true;
end;
$$;

-- 4. Server-only directory claim fulfillment. A paid checkout creates a pending
-- claim; verification remains false until ownership is separately established.
create or replace function public.record_directory_claim(
  p_vendor_slug text,
  p_subscription_id text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized_slug text := lower(btrim(p_vendor_slug));
begin
  if normalized_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    raise exception 'invalid vendor slug';
  end if;

  insert into public.claimed_directory_profiles (
    vendor_slug,
    stripe_subscription_id,
    is_verified
  ) values (
    normalized_slug,
    p_subscription_id,
    false
  )
  on conflict (vendor_slug) do update set
    stripe_subscription_id = excluded.stripe_subscription_id,
    is_verified = false,
    claimed_at = now();

  return true;
end;
$$;

alter table public.subprocessor_subscribers enable row level security;
alter table public.claimed_directory_profiles enable row level security;

revoke all on public.subprocessor_subscribers from anon, authenticated;
revoke all on public.claimed_directory_profiles from anon, authenticated;

revoke all on function public.subscribe_subprocessor_changes(text, text) from public;
revoke all on function public.record_directory_claim(text, text) from public;
grant execute on function public.subscribe_subprocessor_changes(text, text) to anon, authenticated;
grant execute on function public.record_directory_claim(text, text) to project_admin;
