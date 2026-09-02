import {
  VendorRow,
  CompanySettingsRow,
  AuditEventRow,
  OrganizationRow,
} from "@/lib/insforge/database.types";
import { TenantAuthContext } from "@/lib/insforge/context";
import {
  SubProcessorVendor,
  CompanySettings,
  AuditLog,
  Category,
  DPAStatus,
  RiskLevel,
  SecurityCertification,
} from "@/lib/types";
import { db } from "@/lib/db";
import { createInsForgeServerClient } from "@/lib/insforge/server";

export interface CreateVendorInput {
  name: string;
  slug?: string;
  description?: string;
  category: Category;
  website?: string;
  logoUrl?: string;
  dataProcessed?: string[] | string;
  dataLocation?: string;
  dpaUrl?: string;
  dpaStatus?: DPAStatus;
  certifications?: SecurityCertification[];
  riskLevel?: RiskLevel;
  lastReviewedDate?: string;
  nextReviewDate?: string;
  notes?: string;
  isPublic?: boolean;
}

export interface UpdateVendorInput {
  name?: string;
  slug?: string;
  description?: string;
  category?: Category;
  website?: string;
  logoUrl?: string;
  dataProcessed?: string[] | string;
  dataLocation?: string;
  dpaUrl?: string;
  dpaStatus?: DPAStatus;
  certifications?: SecurityCertification[];
  riskLevel?: RiskLevel;
  lastReviewedDate?: string;
  nextReviewDate?: string;
  notes?: string;
  isPublic?: boolean;
}

export interface UpdateCompanyInput {
  name?: string;
  website?: string;
  privacyEmail?: string;
  dpoName?: string;
  notificationEmail?: string;
  theme?: "light" | "dark" | "system";
  autoSyncPublicPage?: boolean;
  lastAuditDate?: string;
}

export class AuthorizationError extends Error {
  constructor(message: string, public status: number = 403) {
    super(message);
    this.name = "AuthorizationError";
  }
}

export class NotFoundError extends Error {
  constructor(message: string = "Resource not found") {
    super(message);
    this.name = "NotFoundError";
  }
}

function sanitizeSlug(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function mapVendorRowToSubProcessorVendor(row: VendorRow): SubProcessorVendor {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description || "",
    category: row.category as Category,
    website: row.website || "",
    logoUrl: row.logo_url || undefined,
    dataProcessed: Array.isArray(row.data_processed) ? row.data_processed : [],
    dataLocation: row.data_location || "United States",
    dpaUrl: row.dpa_url || "",
    dpaStatus: (row.dpa_status as DPAStatus) || "Missing",
    certifications: (Array.isArray(row.certifications)
      ? row.certifications
      : []) as SecurityCertification[],
    riskLevel: (row.risk_level as RiskLevel) || "Low",
    lastReviewedDate: row.last_reviewed_date || "",
    nextReviewDate: row.next_review_date || "",
    notes: row.notes || "",
    isPublic: row.is_public ?? true,
    addedAt: row.created_at || new Date().toISOString(),
  };
}

export function mapCompanySettingsRow(
  row: CompanySettingsRow | null,
  orgName: string,
  orgSlug: string
): CompanySettings {
  return {
    name: orgName,
    slug: orgSlug,
    website: row?.website || "",
    logoUrl: row?.logo_url || undefined,
    privacyEmail: row?.privacy_email || "",
    dpoName: row?.dpo_name || "",
    lastAuditDate: row?.last_audit_date || "",
    autoSyncPublicPage: row?.auto_sync_public_page ?? true,
    theme: row?.theme || "system",
    notificationEmail: row?.notification_email || "",
  };
}

export function mapAuditEventRow(row: AuditEventRow): AuditLog {
  const detailsObj = (row.details || {}) as Record<string, unknown>;
  const vendorName = (detailsObj.name as string) || "System";
  let action: AuditLog["action"] = "UPDATED";
  if (row.action.includes("ADDED") || row.action.includes("CREATED")) {
    action = "ADDED";
  } else if (row.action.includes("DELETED")) {
    action = "DELETED";
  } else if (row.action.includes("STATUS")) {
    action = "STATUS_CHANGE";
  } else if (row.action.includes("EXPORT")) {
    action = "EXPORTED";
  }

  let detailsText = "";
  if (row.action === "VENDOR_ADDED") {
    detailsText = `Added ${vendorName} (${detailsObj.category || "Vendor"}) to register`;
  } else if (row.action === "VENDOR_UPDATED") {
    detailsText = `Updated compliance record for ${vendorName}`;
  } else if (row.action === "VENDOR_DELETED") {
    detailsText = `Deleted ${vendorName} from register`;
  } else if (row.action === "COMPANY_SETTINGS_UPDATED") {
    detailsText = "Updated company privacy and compliance configuration";
  } else if (row.action === "ORGANIZATION_CREATED") {
    detailsText = `Created organization: ${detailsObj.name || "Organization"}`;
  } else {
    detailsText = `${row.action}: ${JSON.stringify(detailsObj)}`;
  }

  return {
    id: row.id,
    timestamp: row.created_at,
    action,
    vendorName,
    details: detailsText,
    actor: (detailsObj.actor_email as string) || "Authorized User",
  };
}

const VENDOR_COLUMNS =
  "id, organization_id, name, slug, description, category, website, logo_url, data_processed, data_location, dpa_url, dpa_status, certifications, risk_level, last_reviewed_date, next_review_date, notes, is_public, created_by, created_at, updated_at";

const COMPANY_COLUMNS =
  "organization_id, website, logo_url, privacy_email, dpo_name, notification_email, last_audit_date, auto_sync_public_page, theme, created_at, updated_at";

const AUDIT_COLUMNS =
  "id, organization_id, actor_user_id, action, entity_type, entity_id, details, created_at";

export const InsForgeRepository = {
  async getVendors(
    context: TenantAuthContext,
    filters?: { category?: string; dpaStatus?: string; search?: string; limit?: number }
  ): Promise<SubProcessorVendor[]> {
    let query = context.client.database
      .from("vendors")
      .select(VENDOR_COLUMNS)
      .eq("organization_id", context.organization.id)
      .order("name", { ascending: true })
      .limit(Math.min(filters?.limit || 100, 200));

    if (filters?.category && filters.category !== "All") {
      query = query.eq("category", filters.category);
    }

    if (filters?.dpaStatus && filters.dpaStatus !== "All") {
      query = query.eq("dpa_status", filters.dpaStatus);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`Failed to load vendors: ${error.message}`);
    }

    let results = (data as unknown as VendorRow[]).map(mapVendorRowToSubProcessorVendor);

    if (filters?.search) {
      const q = filters.search.toLowerCase();
      results = results.filter(
        (v) =>
          v.name.toLowerCase().includes(q) ||
          v.description.toLowerCase().includes(q) ||
          v.dataProcessed.some((dp) => dp.toLowerCase().includes(q))
      );
    }

    return results;
  },

  async getVendorById(
    context: TenantAuthContext,
    vendorId: string
  ): Promise<SubProcessorVendor | null> {
    const { data, error } = await context.client.database
      .from("vendors")
      .select(VENDOR_COLUMNS)
      .eq("id", vendorId)
      .eq("organization_id", context.organization.id)
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return mapVendorRowToSubProcessorVendor(data as unknown as VendorRow);
  },

  async createVendor(
    context: TenantAuthContext,
    input: CreateVendorInput
  ): Promise<SubProcessorVendor> {
    if (context.role === "viewer") {
      throw new AuthorizationError("Viewers are not permitted to add vendors", 403);
    }

    if (!input.name || !input.category) {
      throw new Error("Name and Category are required");
    }

    const slug = sanitizeSlug(input.slug || input.name);
    const dataProcessed = Array.isArray(input.dataProcessed)
      ? input.dataProcessed
      : typeof input.dataProcessed === "string"
      ? (input.dataProcessed as string).split(",").map((s) => s.trim())
      : [];

    const insertPayload = {
      organization_id: context.organization.id,
      name: input.name.trim(),
      slug: slug || "vendor",
      description: input.description?.trim() || "",
      category: input.category,
      website: input.website?.trim() || "",
      logo_url: input.logoUrl || null,
      data_processed: dataProcessed,
      data_location: input.dataLocation || "United States",
      dpa_url: input.dpaUrl?.trim() || "",
      dpa_status: input.dpaStatus || "Missing",
      certifications: Array.isArray(input.certifications) ? input.certifications : [],
      risk_level: input.riskLevel || "Low",
      last_reviewed_date:
        input.lastReviewedDate || new Date().toISOString().split("T")[0],
      next_review_date:
        input.nextReviewDate ||
        new Date(Date.now() + 365 * 86400000).toISOString().split("T")[0],
      notes: input.notes?.trim() || "",
      is_public: input.isPublic !== undefined ? input.isPublic : true,
      created_by: context.user.id,
    };

    const { data, error } = await context.client.database
      .from("vendors")
      .insert([insertPayload])
      .select(VENDOR_COLUMNS)
      .single();

    if (error || !data) {
      throw new Error(`Failed to create vendor: ${error?.message || "Unknown error"}`);
    }

    return mapVendorRowToSubProcessorVendor(data as unknown as VendorRow);
  },

  async updateVendor(
    context: TenantAuthContext,
    vendorId: string,
    input: UpdateVendorInput
  ): Promise<SubProcessorVendor | null> {
    if (context.role === "viewer") {
      throw new AuthorizationError("Viewers are not permitted to update vendors", 403);
    }

    const updatePayload: Record<string, unknown> = {};

    if (input.name !== undefined) updatePayload.name = input.name.trim();
    if (input.slug !== undefined) updatePayload.slug = sanitizeSlug(input.slug);
    if (input.description !== undefined) updatePayload.description = input.description.trim();
    if (input.category !== undefined) updatePayload.category = input.category;
    if (input.website !== undefined) updatePayload.website = input.website.trim();
    if (input.logoUrl !== undefined) updatePayload.logo_url = input.logoUrl || null;
    if (input.dataProcessed !== undefined) {
      updatePayload.data_processed = Array.isArray(input.dataProcessed)
        ? input.dataProcessed
        : typeof input.dataProcessed === "string"
        ? (input.dataProcessed as string).split(",").map((s) => s.trim())
        : [];
    }
    if (input.dataLocation !== undefined) updatePayload.data_location = input.dataLocation;
    if (input.dpaUrl !== undefined) updatePayload.dpa_url = input.dpaUrl.trim();
    if (input.dpaStatus !== undefined) updatePayload.dpa_status = input.dpaStatus;
    if (input.certifications !== undefined) {
      updatePayload.certifications = Array.isArray(input.certifications)
        ? input.certifications
        : [];
    }
    if (input.riskLevel !== undefined) updatePayload.risk_level = input.riskLevel;
    if (input.lastReviewedDate !== undefined) {
      updatePayload.last_reviewed_date = input.lastReviewedDate;
    }
    if (input.nextReviewDate !== undefined) {
      updatePayload.next_review_date = input.nextReviewDate;
    }
    if (input.notes !== undefined) updatePayload.notes = input.notes.trim();
    if (input.isPublic !== undefined) updatePayload.is_public = input.isPublic;

    const { data, error } = await context.client.database
      .from("vendors")
      .update(updatePayload)
      .eq("id", vendorId)
      .eq("organization_id", context.organization.id)
      .select(VENDOR_COLUMNS)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return mapVendorRowToSubProcessorVendor(data as unknown as VendorRow);
  },

  async deleteVendor(context: TenantAuthContext, vendorId: string): Promise<boolean> {
    if (context.role !== "owner" && context.role !== "admin") {
      throw new AuthorizationError(
        "Only organization owners and admins can delete vendors",
        403
      );
    }

    const { data, error } = await context.client.database
      .from("vendors")
      .delete()
      .eq("id", vendorId)
      .eq("organization_id", context.organization.id)
      .select("id")
      .maybeSingle();

    if (error || !data) {
      return false;
    }

    return true;
  },

  async getCompanySettings(
    context: TenantAuthContext
  ): Promise<{ company: CompanySettings; logs: AuditLog[] }> {
    const [settingsRes, logsRes] = await Promise.all([
      context.client.database
        .from("company_settings")
        .select(COMPANY_COLUMNS)
        .eq("organization_id", context.organization.id)
        .limit(1)
        .maybeSingle(),
      context.client.database
        .from("audit_events")
        .select(AUDIT_COLUMNS)
        .eq("organization_id", context.organization.id)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    const company = mapCompanySettingsRow(
      settingsRes.data as unknown as CompanySettingsRow | null,
      context.organization.name,
      context.organization.slug
    );

    const logs = (logsRes.data as unknown as AuditEventRow[] || []).map(mapAuditEventRow);

    return { company, logs };
  },

  async updateCompanySettings(
    context: TenantAuthContext,
    input: UpdateCompanyInput
  ): Promise<CompanySettings> {
    if (context.role !== "owner" && context.role !== "admin") {
      throw new AuthorizationError(
        "Only organization owners and admins can update company settings",
        403
      );
    }

    if (input.name && input.name.trim()) {
      const trimmedName = input.name.trim();
      await context.client.database
        .from("organizations")
        .update({ name: trimmedName })
        .eq("id", context.organization.id);
      context.organization.name = trimmedName;
    }

    const settingsUpdate: Record<string, unknown> = {};
    if (input.website !== undefined) settingsUpdate.website = input.website.trim();
    if (input.privacyEmail !== undefined) {
      settingsUpdate.privacy_email = input.privacyEmail.trim();
    }
    if (input.dpoName !== undefined) settingsUpdate.dpo_name = input.dpoName.trim();
    if (input.notificationEmail !== undefined) {
      settingsUpdate.notification_email = input.notificationEmail.trim();
    }
    if (input.theme !== undefined) settingsUpdate.theme = input.theme;
    if (input.autoSyncPublicPage !== undefined) {
      settingsUpdate.auto_sync_public_page = input.autoSyncPublicPage;
    }
    if (input.lastAuditDate !== undefined) {
      settingsUpdate.last_audit_date = input.lastAuditDate;
    }

    const { data, error } = await context.client.database
      .from("company_settings")
      .update(settingsUpdate)
      .eq("organization_id", context.organization.id)
      .select(COMPANY_COLUMNS)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to update company settings: ${error.message}`);
    }

    return mapCompanySettingsRow(
      data as unknown as CompanySettingsRow | null,
      context.organization.name,
      context.organization.slug
    );
  },

  async getPublicCompanyAndVendors(slug: string): Promise<{
    company: {
      name: string;
      slug: string;
      website: string;
      privacyEmail: string;
      dpoName: string;
      lastAuditDate: string;
    };
    vendors: SubProcessorVendor[];
    totalCount: number;
    lastUpdated: string;
  } | null> {
    const normalizedSlug = slug.toLowerCase().trim();

    // Preserve the anonymous fictional ACME demo
    if (normalizedSlug === "demo" || normalizedSlug === "acme" || normalizedSlug === "acme-saas") {
      const demoCompany = db.getCompany();
      const demoVendors = db.getVendors().filter((v) => v.isPublic);
      return {
        company: {
          name: demoCompany.name,
          slug: demoCompany.slug,
          website: demoCompany.website,
          privacyEmail: demoCompany.privacyEmail,
          dpoName: demoCompany.dpoName,
          lastAuditDate: demoCompany.lastAuditDate,
        },
        vendors: demoVendors,
        totalCount: demoVendors.length,
        lastUpdated: new Date().toISOString(),
      };
    }

    // Server-side lookup for real organizations
    const client = await createInsForgeServerClient();
    const orgQuery = await client.database
      .from("organizations")
      .select("id, name, slug")
      .eq("slug", normalizedSlug)
      .limit(1)
      .maybeSingle();

    if (orgQuery.error || !orgQuery.data) {
      return null;
    }

    const org = orgQuery.data as unknown as OrganizationRow;

    const [settingsRes, vendorsRes] = await Promise.all([
      client.database
        .from("company_settings")
        .select(COMPANY_COLUMNS)
        .eq("organization_id", org.id)
        .limit(1)
        .maybeSingle(),
      client.database
        .from("vendors")
        .select(VENDOR_COLUMNS)
        .eq("organization_id", org.id)
        .eq("is_public", true)
        .order("name", { ascending: true })
        .limit(200),
    ]);

    const settings = settingsRes.data as unknown as CompanySettingsRow | null;
    const vendorRows = (vendorsRes.data as unknown as VendorRow[]) || [];
    const vendors = vendorRows.map(mapVendorRowToSubProcessorVendor);

    return {
      company: {
        name: org.name,
        slug: org.slug,
        website: settings?.website || "",
        privacyEmail: settings?.privacy_email || "",
        dpoName: settings?.dpo_name || "",
        lastAuditDate: settings?.last_audit_date || "",
      },
      vendors,
      totalCount: vendors.length,
      lastUpdated: new Date().toISOString(),
    };
  },
};
