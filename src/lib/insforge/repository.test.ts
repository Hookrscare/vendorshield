import { describe, expect, it, vi } from "vitest";
import {
  mapVendorRowToSubProcessorVendor,
  mapCompanySettingsRow,
  mapAuditEventRow,
  AuthorizationError,
  InsForgeRepository,
} from "./repository";
import { VendorRow, CompanySettingsRow, AuditEventRow } from "./database.types";
import { TenantAuthContext } from "./context";

describe("InsForgeRepository and Mappers", () => {
  const sampleVendorRow: VendorRow = {
    id: "v-1234",
    organization_id: "org-1",
    name: "Supabase",
    slug: "supabase",
    description: "Postgres database hosting",
    category: "Database & Storage",
    website: "https://supabase.com",
    logo_url: "https://example.com/logo.png",
    data_processed: ["User ID", "Customer Metadata"],
    data_location: "United States (US-East)",
    dpa_url: "https://supabase.com/dpa",
    dpa_status: "Signed",
    certifications: ["SOC 2 Type II", "HIPAA"],
    risk_level: "Low",
    last_reviewed_date: "2026-08-01",
    next_review_date: "2027-08-01",
    notes: "Critical database sub-processor",
    is_public: true,
    created_by: "user-1",
    created_at: "2026-08-01T12:00:00Z",
    updated_at: "2026-08-01T12:00:00Z",
  };

  it("maps VendorRow correctly to SubProcessorVendor domain model", () => {
    const domain = mapVendorRowToSubProcessorVendor(sampleVendorRow);
    expect(domain.id).toBe("v-1234");
    expect(domain.name).toBe("Supabase");
    expect(domain.category).toBe("Database & Storage");
    expect(domain.logoUrl).toBe("https://example.com/logo.png");
    expect(domain.dpaStatus).toBe("Signed");
    expect(domain.dataProcessed).toEqual(["User ID", "Customer Metadata"]);
    expect(domain.isPublic).toBe(true);
    expect(domain.addedAt).toBe("2026-08-01T12:00:00Z");
  });

  it("maps CompanySettingsRow correctly to CompanySettings domain model", () => {
    const settingsRow: CompanySettingsRow = {
      organization_id: "org-1",
      website: "https://mycompany.com",
      logo_url: "https://mycompany.com/logo.png",
      privacy_email: "privacy@mycompany.com",
      dpo_name: "Jane Doe",
      notification_email: "alerts@mycompany.com",
      last_audit_date: "2026-07-15",
      auto_sync_public_page: true,
      theme: "dark",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-07-15T00:00:00Z",
    };

    const domain = mapCompanySettingsRow(settingsRow, "My Company Inc.", "my-company");
    expect(domain.name).toBe("My Company Inc.");
    expect(domain.slug).toBe("my-company");
    expect(domain.website).toBe("https://mycompany.com");
    expect(domain.privacyEmail).toBe("privacy@mycompany.com");
    expect(domain.dpoName).toBe("Jane Doe");
    expect(domain.theme).toBe("dark");
  });

  it("maps AuditEventRow correctly to AuditLog", () => {
    const auditRow: AuditEventRow = {
      id: "ae-1",
      organization_id: "org-1",
      actor_user_id: "user-1",
      action: "VENDOR_ADDED",
      entity_type: "vendor",
      entity_id: "v-1234",
      details: {
        name: "Supabase",
        category: "Database & Storage",
        actor_email: "admin@mycompany.com",
      },
      created_at: "2026-08-01T12:00:00Z",
    };

    const log = mapAuditEventRow(auditRow);
    expect(log.id).toBe("ae-1");
    expect(log.action).toBe("ADDED");
    expect(log.vendorName).toBe("Supabase");
    expect(log.actor).toBe("admin@mycompany.com");
    expect(log.details).toContain("Added Supabase");
  });

  it("rejects vendor mutations for viewer role", async () => {
    const viewerContext: TenantAuthContext = {
      user: { id: "user-viewer", email: "viewer@example.com" },
      organization: { id: "org-1", name: "Test Org", slug: "test-org" },
      role: "viewer",
      client: {} as any,
    };

    await expect(
      InsForgeRepository.createVendor(viewerContext, {
        name: "Test Vendor",
        category: "Payment Processing",
      })
    ).rejects.toThrow(AuthorizationError);

    await expect(
      InsForgeRepository.updateVendor(viewerContext, "v-1234", {
        name: "Updated",
      })
    ).rejects.toThrow(AuthorizationError);

    await expect(
      InsForgeRepository.deleteVendor(viewerContext, "v-1234")
    ).rejects.toThrow(AuthorizationError);
  });

  it("rejects delete vendor for member role", async () => {
    const memberContext: TenantAuthContext = {
      user: { id: "user-member", email: "member@example.com" },
      organization: { id: "org-1", name: "Test Org", slug: "test-org" },
      role: "member",
      client: {} as any,
    };

    await expect(
      InsForgeRepository.deleteVendor(memberContext, "v-1234")
    ).rejects.toThrow(AuthorizationError);
  });

  it("rejects company settings updates for member or viewer roles", async () => {
    const memberContext: TenantAuthContext = {
      user: { id: "user-member", email: "member@example.com" },
      organization: { id: "org-1", name: "Test Org", slug: "test-org" },
      role: "member",
      client: {} as any,
    };

    await expect(
      InsForgeRepository.updateCompanySettings(memberContext, {
        website: "https://newsite.com",
      })
    ).rejects.toThrow(AuthorizationError);
  });

  it("updates organization name and settings through one atomic RPC", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        organization_id: "org-1",
        website: "https://new.example",
        logo_url: null,
        privacy_email: "privacy@example.com",
        dpo_name: "Owner",
        notification_email: "alerts@example.com",
        last_audit_date: null,
        auto_sync_public_page: true,
        theme: "system",
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-09-02T00:00:00Z",
      },
      error: null,
    });
    const context: TenantAuthContext = {
      user: { id: "user-owner", email: "owner@example.com" },
      organization: { id: "org-1", name: "Old Name", slug: "test-org" },
      role: "owner",
      client: { database: { rpc } } as any,
    };

    const updated = await InsForgeRepository.updateCompanySettings(context, {
      name: "New Name",
      website: "https://new.example",
    });

    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("update_company_settings", {
      target_organization_id: "org-1",
      new_name: "New Name",
      new_website: "https://new.example",
      new_privacy_email: null,
      new_dpo_name: null,
      new_notification_email: null,
      new_theme: null,
      new_auto_sync_public_page: null,
      new_last_audit_date: null,
    });
    expect(updated.name).toBe("New Name");
    expect(updated.website).toBe("https://new.example");
  });
});
