import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "migrations/20260902004500_harden-vendor-persistence.sql"),
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
