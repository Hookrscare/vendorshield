import { describe, it, expect, vi } from "vitest";
import {
  parseStatusPayload,
  pollVendorStatus,
  pollSubProcessorRoster,
  KNOWN_STATUS_PAGES,
} from "./status-poller";

describe("QA-113: Automated Sub-Processor Status Page Uptime Poller", () => {
  it("parses Statuspage.io JSON payload correctly", () => {
    const operationalJson = {
      status: { indicator: "none", description: "All Systems Operational" },
    };
    expect(parseStatusPayload(operationalJson).status).toBe("operational");

    const minorJson = {
      status: { indicator: "minor", description: "Elevated API Latency" },
    };
    const minorResult = parseStatusPayload(minorJson);
    expect(minorResult.status).toBe("degraded_performance");
    expect(minorResult.incidentTitle).toBe("Elevated API Latency");

    const criticalJson = {
      status: { indicator: "critical", description: "Database Connectivity Outage" },
    };
    expect(parseStatusPayload(criticalJson).status).toBe("major_outage");
  });

  it("parses raw HTML status fallback content", () => {
    expect(parseStatusPayload("<div>All Systems Operational</div>").status).toBe("operational");
    expect(parseStatusPayload("<div>Notice: Major service outage in US-East</div>").status).toBe(
      "major_outage"
    );
  });

  it("polls single vendor status with latency timing", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({
        status: { indicator: "none", description: "All Systems Operational" },
      }),
    });

    const result = await pollVendorStatus("openai", "OpenAI", undefined, mockFetch as any);

    expect(result.vendorSlug).toBe("openai");
    expect(result.status).toBe("operational");
    expect(result.statusPageUrl).toBe(KNOWN_STATUS_PAGES["openai"]);
    expect(result.responseTimeMs).toBeGreaterThanOrEqual(0);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("handles vendor status page 500 error gracefully", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      statusText: "Service Unavailable",
      headers: new Headers(),
    });

    const result = await pollVendorStatus("broken-vendor", "Broken Vendor", undefined, mockFetch as any);
    expect(result.status).toBe("major_outage");
    expect(result.error).toContain("HTTP 503");
  });

  it("aggregates status across vendor roster", async () => {
    const mockFetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("openai")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers({ "content-type": "application/json" }),
          json: async () => ({ status: { indicator: "none" } }),
        });
      }
      if (url.includes("anthropic")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers({ "content-type": "application/json" }),
          json: async () => ({ status: { indicator: "minor", description: "Degraded inference" } }),
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "text/html" }),
        text: async () => "All Systems Operational",
      });
    });

    const roster = [
      { slug: "openai", name: "OpenAI" },
      { slug: "anthropic", name: "Anthropic" },
      { slug: "stripe", name: "Stripe" },
    ];

    const summary = await pollSubProcessorRoster(roster, mockFetch as any);

    expect(summary.checkedCount).toBe(3);
    expect(summary.operationalCount).toBe(2);
    expect(summary.degradedCount).toBe(1);
    expect(summary.outageCount).toBe(0);
    expect(summary.results).toHaveLength(3);
  });
});
