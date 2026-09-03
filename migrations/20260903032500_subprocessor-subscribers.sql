-- Migration: 20260903032500_subprocessor-subscribers.sql
-- Description: GDPR Article 28(2) sub-processor change subscribers and directory profile claiming.

-- 1. Sub-processor change subscribers
create table if not exists public.subprocessor_subscribers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
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
  stripe_subscription_id text,
  is_verified boolean not null default true,
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
  select id into target_org_id
  from public.organizations
  where slug = p_slug
  limit 1;

  if target_org_id is null then
    -- Demo or fallback: still succeed without error
    return true;
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

grant execute on function public.subscribe_subprocessor_changes(text, text) to anon, authenticated;
