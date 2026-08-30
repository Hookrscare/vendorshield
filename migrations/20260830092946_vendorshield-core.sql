-- VendorShield durable multi-tenant foundation.
-- All customer-owned rows carry organization_id and are protected by RLS.

create extension if not exists pgcrypto;

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 160),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create table public.company_settings (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  website text not null default '',
  logo_url text,
  privacy_email text not null default '',
  dpo_name text not null default '',
  notification_email text not null default '',
  last_audit_date date,
  auto_sync_public_page boolean not null default true,
  theme text not null default 'system' check (theme in ('light', 'dark', 'system')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.vendors (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 200),
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text not null default '',
  category text not null,
  website text not null default '',
  logo_url text,
  data_processed text[] not null default '{}',
  data_location text not null default '',
  dpa_url text not null default '',
  dpa_status text not null default 'Missing'
    check (dpa_status in ('Signed', 'Under Review', 'Standard Terms', 'Missing')),
  certifications text[] not null default '{}',
  risk_level text not null default 'Low' check (risk_level in ('Low', 'Medium', 'High')),
  last_reviewed_date date,
  next_review_date date,
  notes text not null default '',
  is_public boolean not null default true,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, slug),
  unique (id, organization_id),
  check (next_review_date is null or last_reviewed_date is null or next_review_date >= last_reviewed_date)
);

create table public.inspections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 240),
  property_address text not null default '',
  client_name text not null default '',
  status text not null default 'draft' check (status in ('draft', 'in_progress', 'completed', 'archived')),
  inspected_at timestamptz,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id)
);

create table public.defects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  inspection_id uuid not null,
  title text not null check (char_length(title) between 1 and 240),
  description text not null default '',
  location text not null default '',
  severity text not null default 'medium' check (severity in ('low', 'medium', 'high', 'critical')),
  status text not null default 'open' check (status in ('open', 'monitor', 'resolved')),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (inspection_id, organization_id)
    references public.inspections(id, organization_id) on delete cascade
);

create table public.defect_photos (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  defect_id uuid not null,
  storage_key text not null,
  url text not null,
  caption text not null default '',
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  foreign key (defect_id, organization_id)
    references public.defects(id, organization_id) on delete cascade
);

create table public.entitlements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  product_key text not null,
  status text not null check (status in ('trialing', 'active', 'past_due', 'canceled', 'expired')),
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_checkout_session_id text,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, product_key),
  unique nulls not distinct (stripe_subscription_id),
  unique nulls not distinct (stripe_checkout_session_id)
);

create table public.stripe_events (
  event_id text primary key,
  event_type text not null,
  processed_at timestamptz not null default now()
);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index organization_members_user_idx on public.organization_members(user_id, organization_id);
create index vendors_org_created_idx on public.vendors(organization_id, created_at desc);
create index vendors_org_review_idx on public.vendors(organization_id, next_review_date);
create index inspections_org_created_idx on public.inspections(organization_id, created_at desc);
create index defects_inspection_idx on public.defects(organization_id, inspection_id, created_at desc);
create index defect_photos_defect_idx on public.defect_photos(organization_id, defect_id);
create index audit_events_org_created_idx on public.audit_events(organization_id, created_at desc);
create index entitlements_org_status_idx on public.entitlements(organization_id, status);

create function public.is_organization_member(target_organization_id uuid)
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
  );
$$;

create function public.is_organization_admin(target_organization_id uuid)
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
      and membership.role in ('owner', 'admin')
  );
$$;

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create function public.prevent_tenant_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.organization_id <> old.organization_id then
    raise exception 'organization_id is immutable';
  end if;
  return new;
end;
$$;

create trigger organizations_updated_at before update on public.organizations
for each row execute function public.set_updated_at();
create trigger company_settings_updated_at before update on public.company_settings
for each row execute function public.set_updated_at();
create trigger vendors_updated_at before update on public.vendors
for each row execute function public.set_updated_at();
create trigger inspections_updated_at before update on public.inspections
for each row execute function public.set_updated_at();
create trigger defects_updated_at before update on public.defects
for each row execute function public.set_updated_at();
create trigger entitlements_updated_at before update on public.entitlements
for each row execute function public.set_updated_at();

create trigger vendors_tenant_immutable before update on public.vendors
for each row execute function public.prevent_tenant_change();
create trigger inspections_tenant_immutable before update on public.inspections
for each row execute function public.prevent_tenant_change();
create trigger defects_tenant_immutable before update on public.defects
for each row execute function public.prevent_tenant_change();
create trigger defect_photos_tenant_immutable before update on public.defect_photos
for each row execute function public.prevent_tenant_change();
create trigger entitlements_tenant_immutable before update on public.entitlements
for each row execute function public.prevent_tenant_change();

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.company_settings enable row level security;
alter table public.vendors enable row level security;
alter table public.inspections enable row level security;
alter table public.defects enable row level security;
alter table public.defect_photos enable row level security;
alter table public.entitlements enable row level security;
alter table public.stripe_events enable row level security;
alter table public.audit_events enable row level security;

create policy organizations_select on public.organizations for select to authenticated
using (public.is_organization_member(id));
create policy organizations_insert on public.organizations for insert to authenticated
with check (created_by = auth.uid());
create policy organizations_update on public.organizations for update to authenticated
using (public.is_organization_admin(id)) with check (public.is_organization_admin(id));

create policy members_select on public.organization_members for select to authenticated
using (public.is_organization_member(organization_id));
create policy members_insert_bootstrap on public.organization_members for insert to authenticated
with check (
  user_id = auth.uid()
  and role = 'owner'
  and exists (
    select 1 from public.organizations organization
    where organization.id = organization_id and organization.created_by = auth.uid()
  )
);
create policy members_insert_admin on public.organization_members for insert to authenticated
with check (public.is_organization_admin(organization_id));
create policy members_update_admin on public.organization_members for update to authenticated
using (public.is_organization_admin(organization_id))
with check (public.is_organization_admin(organization_id));
create policy members_delete_admin on public.organization_members for delete to authenticated
using (public.is_organization_admin(organization_id) and user_id <> auth.uid());

create policy company_settings_select on public.company_settings for select to authenticated
using (public.is_organization_member(organization_id));
create policy company_settings_insert on public.company_settings for insert to authenticated
with check (public.is_organization_admin(organization_id));
create policy company_settings_update on public.company_settings for update to authenticated
using (public.is_organization_admin(organization_id))
with check (public.is_organization_admin(organization_id));

create policy vendors_select on public.vendors for select to authenticated
using (public.is_organization_member(organization_id));
create policy vendors_insert on public.vendors for insert to authenticated
with check (public.is_organization_member(organization_id) and created_by = auth.uid());
create policy vendors_update on public.vendors for update to authenticated
using (public.is_organization_member(organization_id))
with check (public.is_organization_member(organization_id));
create policy vendors_delete on public.vendors for delete to authenticated
using (public.is_organization_admin(organization_id));

create policy inspections_select on public.inspections for select to authenticated
using (public.is_organization_member(organization_id));
create policy inspections_insert on public.inspections for insert to authenticated
with check (public.is_organization_member(organization_id) and created_by = auth.uid());
create policy inspections_update on public.inspections for update to authenticated
using (public.is_organization_member(organization_id))
with check (public.is_organization_member(organization_id));
create policy inspections_delete on public.inspections for delete to authenticated
using (public.is_organization_admin(organization_id));

create policy defects_select on public.defects for select to authenticated
using (public.is_organization_member(organization_id));
create policy defects_insert on public.defects for insert to authenticated
with check (public.is_organization_member(organization_id) and created_by = auth.uid());
create policy defects_update on public.defects for update to authenticated
using (public.is_organization_member(organization_id))
with check (public.is_organization_member(organization_id));
create policy defects_delete on public.defects for delete to authenticated
using (public.is_organization_admin(organization_id));

create policy defect_photos_select on public.defect_photos for select to authenticated
using (public.is_organization_member(organization_id));
create policy defect_photos_insert on public.defect_photos for insert to authenticated
with check (public.is_organization_member(organization_id) and created_by = auth.uid());
create policy defect_photos_delete on public.defect_photos for delete to authenticated
using (public.is_organization_member(organization_id));

create policy entitlements_select on public.entitlements for select to authenticated
using (public.is_organization_member(organization_id));
create policy audit_events_select on public.audit_events for select to authenticated
using (public.is_organization_member(organization_id));

revoke all on public.stripe_events from anon, authenticated;
revoke insert, update, delete on public.entitlements from anon, authenticated;
revoke insert, update, delete on public.audit_events from anon, authenticated;

grant usage on schema public to authenticated;
grant select, insert, update on public.organizations to authenticated;
grant select, insert, update, delete on public.organization_members to authenticated;
grant select, insert, update on public.company_settings to authenticated;
grant select, insert, update, delete on public.vendors to authenticated;
grant select, insert, update, delete on public.inspections to authenticated;
grant select, insert, update, delete on public.defects to authenticated;
grant select, insert, delete on public.defect_photos to authenticated;
grant select on public.entitlements, public.audit_events to authenticated;
grant execute on function public.is_organization_member(uuid) to authenticated;
grant execute on function public.is_organization_admin(uuid) to authenticated;

revoke all on function public.set_updated_at() from public;
revoke all on function public.prevent_tenant_change() from public;
