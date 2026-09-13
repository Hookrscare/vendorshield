import { describe, it, expect } from "vitest";
import {
  MultiTenantDpaChangeNotificationWebhookEngine,
  DpaMaterialChange,
  TenantWebhookEndpoint
} from "./multi-tenant-dpa-change-notification-webhook-engine";

describe("QA-112: MultiTenantDpaChangeNotificationWebhookEngine", () => {
  const change: DpaMaterialChange = {
    changeId: "dpa-chg-2026-09",
    category: "SUB_PROCESSOR_ADDITION",
    description: "Addition of Supabase Europe GmbH as auxiliary database sub-processor",
    effectiveDate: "2026-10-15T00:00:00Z",
    priorNoticeDays: 30
  };

  const tenants: TenantWebhookEndpoint[] = [
    {
      tenantId: "tenant_acme_corp",
      endpointUrl: "https://api.acme.com/webhooks/security",
      signingSecret: "whsec_acme_super_secret_12345",
      active: true,
      contactEmail: "dpo@acme.com"
    },
    {
      tenantId: "tenant_globex_intl",
      endpointUrl: "https://hooks.globex.com/dpa",
      signingSecret: "whsec_globex_secret_67890",
      active: true,
      contactEmail: "legal@globex.com"
    },
    {
      tenantId: "tenant_inactive",
      endpointUrl: "https://inactive.example.com",
      signingSecret: "whsec_none",
      active: false,
      contactEmail: "old@example.com"
    }
  ];

  it("successfully dispatches signed HMAC webhooks to active tenants", () => {
    const dispatches = MultiTenantDpaChangeNotificationWebhookEngine.dispatchDpaChangeNotifications(
      change,
      tenants
    );

    expect(dispatches).toHaveLength(2); // Only active tenants
    const acmeDispatch = dispatches.find((d) => d.tenantId === "tenant_acme_corp");
    expect(acmeDispatch).toBeDefined();
    expect(acmeDispatch?.status).toBe("DELIVERED");
    expect(acmeDispatch?.signatureHeader).toContain("v1=");
    expect(acmeDispatch?.auditDigest).toHaveLength(64);

    // Verify cryptographic signature validation
    const payloadStr = JSON.stringify(acmeDispatch?.payload);
    const isValid = MultiTenantDpaChangeNotificationWebhookEngine.verifyWebhookSignature(
      payloadStr,
      acmeDispatch!.signatureHeader,
      "whsec_acme_super_secret_12345"
    );
    expect(isValid).toBe(true);
  });

  it("flags failed transmissions as QUEUED_FOR_RETRY", () => {
    const failures = new Set(["tenant_globex_intl"]);
    const dispatches = MultiTenantDpaChangeNotificationWebhookEngine.dispatchDpaChangeNotifications(
      change,
      tenants,
      failures
    );

    const globex = dispatches.find((d) => d.tenantId === "tenant_globex_intl");
    expect(globex?.status).toBe("QUEUED_FOR_RETRY");
  });

  it("validates mandatory notice days and required fields", () => {
    expect(() =>
      MultiTenantDpaChangeNotificationWebhookEngine.dispatchDpaChangeNotifications(
        { ...change, priorNoticeDays: 7 },
        tenants
      )
    ).toThrow("Prior notice days cannot be less than 14");

    expect(() =>
      MultiTenantDpaChangeNotificationWebhookEngine.dispatchDpaChangeNotifications(
        { ...change, changeId: "" },
        tenants
      )
    ).toThrow("DPA material change must have a valid changeId and category.");
  });
});
