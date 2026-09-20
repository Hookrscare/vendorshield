import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "migrations/20260902004500_harden-vendor-persistence.sql"),
  "utf8"
);
const teamMigration = readFileSync(
  resolve(process.cwd(), "migrations/20260903031500_team-and-entitlements.sql"),
  "utf8"
);
const subscriberMigration = readFileSync(
  resolve(process.cwd(), "migrations/20260903032500_subprocessor-subscribers.sql"),
  "utf8"
);
const stripeLifecycleMigration = readFileSync(
  resolve(process.cwd(), "migrations/20260920104500_stripe-lifecycle-hardening.sql"),
  "utf8"
);

describe("hardened persistence migration contract", () => {
  it("keeps writer checks recursion-safe and viewer-excluding", () => {
    expect(migration).toContain("security definer");
    expect(migration).toContain("from public.organization_members membership");
    expect(migration).toContain("membership.role in ('owner', 'admin', 'member')");
  });

  it("rolls back the atomic company update when settings are missing", () => {
    expect(migration).toContain("if updated_settings is null then");
    expect(migration).toContain("raise exception 'company settings not found'");
  });

  it("exposes only the public RPC to anonymous callers", () => {
    expect(migration).toContain(
      "grant execute on function public.get_public_vendor_register(text) to anon, authenticated"
    );
    expect(migration).not.toContain("grant select on public.vendors to anon");
    expect(migration).not.toMatch(/'notes',\s*vendor\.notes/);
    expect(migration).not.toMatch(/'createdBy',\s*vendor\.created_by/);
  });
});

describe("team and entitlement migration contract", () => {
  it("keeps invitation writes behind role-checking RPCs", () => {
    expect(teamMigration).toContain("create table if not exists public.organization_invites");
    expect(teamMigration).toContain("caller_role not in ('owner', 'admin')");
    expect(teamMigration).toContain("only an organization owner can remove another owner");
    expect(teamMigration).toContain(
      "revoke all on public.organization_invites from anon, authenticated"
    );
  });

  it("keeps Stripe fulfillment server-only and idempotent", () => {
    expect(teamMigration).toContain("on conflict (event_id) do nothing");
    expect(teamMigration).toContain(
      "grant execute on function public.record_stripe_event_and_entitlement(text, text, uuid, text, text, text, text, text, timestamptz) to project_admin"
    );
    expect(teamMigration).not.toMatch(
      /grant execute on function public\.record_stripe_event_and_entitlement[^;]+to authenticated/
    );
  });
});

describe("subscriber and claim migration contract", () => {
  it("rejects unknown public registers instead of claiming success", () => {
    expect(subscriberMigration).toContain("if target_org_id is null then");
    expect(subscriberMigration).toContain("return false;");
  });

  it("keeps subscriber PII private and claim fulfillment server-only", () => {
    expect(subscriberMigration).toContain(
      "revoke all on public.subprocessor_subscribers from anon, authenticated"
    );
    expect(subscriberMigration).toContain(
      "grant execute on function public.record_directory_claim(text, text) to project_admin"
    );
    expect(subscriberMigration).not.toMatch(
      /grant execute on function public\.record_directory_claim[^;]+to authenticated/
    );
  });
});

describe("Stripe lifecycle migration contract", () => {
  it("uses partial uniqueness for nullable Stripe identifiers", () => {
    expect(stripeLifecycleMigration).toContain("where stripe_subscription_id is not null");
    expect(stripeLifecycleMigration).toContain("where stripe_checkout_session_id is not null");
  });

  it("keeps subscription updates idempotent, retriable, and server-only", () => {
    expect(stripeLifecycleMigration).toContain("on conflict (event_id) do nothing");
    expect(stripeLifecycleMigration).toContain("raise exception 'subscription entitlement not found'");
    expect(stripeLifecycleMigration).toContain(
      "grant execute on function public.sync_stripe_subscription_event(text, text, text, text, timestamptz) to project_admin"
    );
  });
});
