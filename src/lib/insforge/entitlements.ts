import { createInsForgeServerClient } from "@/lib/insforge/server";
import { EntitlementRow } from "@/lib/insforge/database.types";

export interface OrganizationEntitlementSummary {
  isPaid: boolean;
  primaryPlan: string;
  planName: string;
  activeProducts: string[];
  maxVendors: number;
  hasAuditExportAccess: boolean;
  hasLiveEmbedAccess: boolean;
  currentPeriodEnd: string | null;
}

export const InsForgeEntitlements = {
  async getOrganizationEntitlements(
    organizationId: string
  ): Promise<OrganizationEntitlementSummary> {
    try {
      const client = await createInsForgeServerClient();
      const { data, error } = await client.database
        .from("entitlements")
        .select("product_key, status, current_period_end")
        .eq("organization_id", organizationId)
        .eq("status", "active");

      if (error || !data || data.length === 0) {
        return {
          isPaid: false,
          primaryPlan: "free",
          planName: "Free Community Tier",
          activeProducts: [],
          maxVendors: 15,
          hasAuditExportAccess: true,
          hasLiveEmbedAccess: true,
          currentPeriodEnd: null,
        };
      }

      const activeRows = data as unknown as Array<{
        product_key: string;
        status: string;
        current_period_end: string | null;
      }>;

      const activeProducts = activeRows.map((r) => r.product_key);
      const isGrowth = activeProducts.some((p) => p.includes("growth"));
      const isStartup = activeProducts.some((p) => p.includes("startup"));

      let primaryPlan = "free";
      let planName = "Free Community Tier";
      let maxVendors = 15;

      if (isGrowth) {
        primaryPlan = "growth";
        planName = "Growth Plan (SOC 2 Scale)";
        maxVendors = 1000;
      } else if (isStartup) {
        primaryPlan = "startup";
        planName = "Startup Plan";
        maxVendors = 50;
      } else if (activeProducts.length > 0) {
        primaryPlan = activeProducts[0];
        planName = "Active Paid Subscription";
        maxVendors = 100;
      }

      return {
        isPaid: true,
        primaryPlan,
        planName,
        activeProducts,
        maxVendors,
        hasAuditExportAccess: true,
        hasLiveEmbedAccess: true,
        currentPeriodEnd: activeRows[0]?.current_period_end || null,
      };
    } catch {
      return {
        isPaid: false,
        primaryPlan: "free",
        planName: "Free Community Tier",
        activeProducts: [],
        maxVendors: 15,
        hasAuditExportAccess: true,
        hasLiveEmbedAccess: true,
        currentPeriodEnd: null,
      };
    }
  },

  async recordStripeEventAndEntitlement(params: {
    eventId: string;
    eventType: string;
    organizationId?: string | null;
    productKey?: string | null;
    status?: string;
    customerId?: string | null;
    subscriptionId?: string | null;
    sessionId?: string | null;
    periodEnd?: string | null;
  }): Promise<{ success: boolean; deduplicated: boolean }> {
    try {
      const client = await createInsForgeServerClient();

      const { data, error } = await client.database.rpc(
        "record_stripe_event_and_entitlement",
        {
          p_event_id: params.eventId,
          p_event_type: params.eventType,
          p_org_id: params.organizationId || null,
          p_product_key: params.productKey || null,
          p_status: params.status || "active",
          p_customer_id: params.customerId || null,
          p_subscription_id: params.subscriptionId || null,
          p_session_id: params.sessionId || null,
          p_period_end: params.periodEnd || null,
        }
      );

      if (error) {
        // Fallback to direct table operations if RPC not yet migrated in test env
        const existingEvent = await client.database
          .from("stripe_events")
          .select("event_id")
          .eq("event_id", params.eventId)
          .limit(1)
          .maybeSingle();

        if (existingEvent.data) {
          return { success: true, deduplicated: true };
        }

        await client.database.from("stripe_events").insert([
          { event_id: params.eventId, event_type: params.eventType },
        ]);

        if (params.organizationId && params.productKey) {
          await client.database.from("entitlements").upsert([
            {
              organization_id: params.organizationId,
              product_key: params.productKey,
              status: params.status || "active",
              stripe_customer_id: params.customerId || null,
              stripe_subscription_id: params.subscriptionId || null,
              stripe_checkout_session_id: params.sessionId || null,
              current_period_end: params.periodEnd || null,
              updated_at: new Date().toISOString(),
            },
          ]);
        }

        return { success: true, deduplicated: false };
      }

      // data is true if newly processed, false if duplicate
      const isNew = Boolean(data);
      return { success: true, deduplicated: !isNew };
    } catch {
      return { success: false, deduplicated: false };
    }
  },
};
