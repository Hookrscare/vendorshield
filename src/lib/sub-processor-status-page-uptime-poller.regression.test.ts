import { describe, it, expect } from "vitest";
import {
  SubProcessorStatusPageUptimePoller,
  SubProcessorFeedPayload
} from "./sub-processor-status-page-uptime-poller";

describe("QA-113: SubProcessorStatusPageUptimePoller", () => {
  it("evaluates a fully operational vendor with 100% uptime", () => {
    const payload: SubProcessorFeedPayload = {
      vendorId: "vend_stripe_01",
      vendorName: "Stripe Payments",
      statusPageUrl: "https://status.stripe.com",
      components: [
        {
          componentId: "api",
          name: "API Services",
          status: "OPERATIONAL",
          updatedAtIso: "2026-09-13T12:00:00Z"
        },
        {
          componentId: "webhooks",
          name: "Webhook Delivery",
          status: "OPERATIONAL",
          updatedAtIso: "2026-09-13T12:00:00Z"
        }
      ],
      recentIncidents: [],
      monitoredWindowDays: 30,
      contractualSlaPercentage: 99.9
    };

    const result = SubProcessorStatusPageUptimePoller.evaluateVendorUptime(payload);

    expect(result.overallHealth).toBe("OPERATIONAL");
    expect(result.calculatedUptimePercentage).toBe(100);
    expect(result.isSlaViolated).toBe(false);
    expect(result.requiresDpoEscalation).toBe(false);
    expect(result.activeOutageCount).toBe(0);
    expect(result.criticalComponentsDown).toHaveLength(0);
    expect(result.tamperEvidentDigest).toHaveLength(64);
  });

  it("detects SLA violation and triggers DPO escalation on major outage", () => {
    const payload: SubProcessorFeedPayload = {
      vendorId: "vend_aws_s3",
      vendorName: "AWS S3 US-East-1",
      statusPageUrl: "https://health.aws.amazon.com",
      components: [
        {
          componentId: "s3-standard",
          name: "S3 Object Storage",
          status: "MAJOR_OUTAGE",
          updatedAtIso: "2026-09-13T19:00:00Z"
        }
      ],
      recentIncidents: [
        {
          incidentId: "inc_001",
          title: "Elevated Error Rates in US-EAST-1",
          impact: "critical",
          status: "investigating",
          startedAtIso: "2026-09-13T18:00:00Z",
          outageDurationMinutes: 120
        }
      ],
      monitoredWindowDays: 30,
      contractualSlaPercentage: 99.99
    };

    const result = SubProcessorStatusPageUptimePoller.evaluateVendorUptime(payload);

    expect(result.overallHealth).toBe("MAJOR_OUTAGE");
    expect(result.activeOutageCount).toBe(1);
    expect(result.criticalComponentsDown).toContain("S3 Object Storage");
    expect(result.requiresDpoEscalation).toBe(true);
  });

  it("validates input URLs and mandatory vendor identifiers", () => {
    expect(() => {
      SubProcessorStatusPageUptimePoller.evaluateVendorUptime({
        vendorId: "",
        vendorName: "Test",
        statusPageUrl: "https://status.test.com",
        components: [],
        recentIncidents: []
      });
    }).toThrow("vendorId and vendorName are required");

    expect(() => {
      SubProcessorStatusPageUptimePoller.evaluateVendorUptime({
        vendorId: "v1",
        vendorName: "Insecure Vendor",
        statusPageUrl: "http://insecure.test.com",
        components: [],
        recentIncidents: []
      });
    }).toThrow("Must be a secure HTTPS URL");
  });
});
