import { describe, it, expect, vi, beforeEach } from "vitest";
import { InsForgeEntitlements } from "./entitlements";
import * as serverModule from "./server";

describe("InsForgeEntitlements (QA-107)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns default free tier for organizations without active subscriptions", async () => {
    vi.spyOn(serverModule, "createInsForgeServerClient").mockResolvedValue({
      database: {
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockImplementation((col: string) => {
            if (col === "status") {
              return Promise.resolve({ data: [], error: null });
            }
            return {
              eq: vi.fn().mockResolvedValue({ data: [], error: null }),
            };
          }),
        })),
      },
    } as any);

    const entitlements = await InsForgeEntitlements.getOrganizationEntitlements("org-free");
    expect(entitlements.isPaid).toBe(false);
    expect(entitlements.primaryPlan).toBe("free");
    expect(entitlements.maxVendors).toBe(15);
  });

  it("identifies growth tier and expands vendor allowances", async () => {
    vi.spyOn(serverModule, "createInsForgeServerClient").mockResolvedValue({
      database: {
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockImplementation((col: string, val: string) => {
            if (col === "status") {
              return Promise.resolve({
                data: [
                  {
                    product_key: "vendorshield-growth",
                    status: "active",
                    current_period_end: "2027-01-01T00:00:00Z",
                  },
                ],
                error: null,
              });
            }
            return {
              eq: vi.fn().mockResolvedValue({
                data: [
                  {
                    product_key: "vendorshield-growth",
                    status: "active",
                    current_period_end: "2027-01-01T00:00:00Z",
                  },
                ],
                error: null,
              }),
            };
          }),
        })),
      },
    } as any);

    const entitlements = await InsForgeEntitlements.getOrganizationEntitlements("org-growth");
    expect(entitlements.isPaid).toBe(true);
    expect(entitlements.primaryPlan).toBe("growth");
    expect(entitlements.maxVendors).toBe(1000);
  });

  it("records new stripe event and provisions entitlement atomically via RPC", async () => {
    const rpcMock = vi.fn().mockResolvedValue({ data: true, error: null });
    vi.spyOn(serverModule, "createInsForgeServerClient").mockResolvedValue({
      database: {
        rpc: rpcMock,
      },
    } as any);

    const result = await InsForgeEntitlements.recordStripeEventAndEntitlement({
      eventId: "evt_test_123",
      eventType: "checkout.session.completed",
      organizationId: "org-1",
      productKey: "vendorshield-startup",
      status: "active",
      customerId: "cus_123",
    });

    expect(result.success).toBe(true);
    expect(result.deduplicated).toBe(false);
    expect(rpcMock).toHaveBeenCalledWith(
      "record_stripe_event_and_entitlement",
      expect.objectContaining({
        p_event_id: "evt_test_123",
        p_org_id: "org-1",
        p_product_key: "vendorshield-startup",
      })
    );
  });

  it("handles duplicate event delivery as deduplicated without error", async () => {
    // Return data: false when event is already recorded
    const rpcMock = vi.fn().mockResolvedValue({ data: false, error: null });
    vi.spyOn(serverModule, "createInsForgeServerClient").mockResolvedValue({
      database: {
        rpc: rpcMock,
      },
    } as any);

    const result = await InsForgeEntitlements.recordStripeEventAndEntitlement({
      eventId: "evt_test_duplicate",
      eventType: "checkout.session.completed",
      organizationId: "org-1",
      productKey: "vendorshield-startup",
    });

    expect(result.success).toBe(true);
    expect(result.deduplicated).toBe(true);
  });
});
