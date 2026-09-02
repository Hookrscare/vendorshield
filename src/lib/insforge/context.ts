import { createInsForgeServerClient } from "@/lib/insforge/server";
import { OrganizationRole } from "@/lib/insforge/database.types";

export interface TenantAuthContext {
  user: {
    id: string;
    email?: string;
  };
  organization: {
    id: string;
    name: string;
    slug: string;
  };
  role: OrganizationRole;
  client: Awaited<ReturnType<typeof createInsForgeServerClient>>;
}

export type ResolveTenantResult =
  | { success: true; context: TenantAuthContext }
  | { success: false; status: 401 | 403 | 503; error: string };

export async function resolveTenantContext(
  _request?: unknown
): Promise<ResolveTenantResult> {
  try {
    const client = await createInsForgeServerClient();
    const { data: authData, error: authError } = await client.auth.getCurrentUser();
    const user = authData?.user;

    if (authError || !user) {
      return {
        success: false,
        status: 401,
        error: "Authentication required",
      };
    }

    const membershipQuery = await client.database
      .from("organization_members")
      .select("organization_id, role, organizations(id, name, slug)")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (membershipQuery.error) {
      return {
        success: false,
        status: 503,
        error: "Unable to verify organization access",
      };
    }

    if (!membershipQuery.data) {
      return {
        success: false,
        status: 403,
        error: "No organization membership found",
      };
    }

    const orgRecord = membershipQuery.data.organizations as
      | { id: string; name: string; slug: string }
      | Array<{ id: string; name: string; slug: string }>
      | null;

    const org = Array.isArray(orgRecord) ? orgRecord[0] : orgRecord;

    return {
      success: true,
      context: {
        user: {
          id: user.id,
          email: user.email,
        },
        organization: {
          id: org?.id || membershipQuery.data.organization_id,
          name: org?.name || "Organization",
          slug: org?.slug || "",
        },
        role: membershipQuery.data.role as OrganizationRole,
        client,
      },
    };
  } catch {
    return {
      success: false,
      status: 503,
      error: "Unable to verify organization access",
    };
  }
}
