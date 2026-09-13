import { describe, it, expect } from "vitest";
import {
  SubProcessorMultiRegionIncidentAnalyzer,
  VendorStatusSample
} from "./sub-processor-multi-region-incident-analyzer";

describe("QA-113: SubProcessorMultiRegionIncidentAnalyzer", () => {
  it("detects fully operational status across all vendors", () => {
    const samples: VendorStatusSample[] = [
      {
        vendorSlug: "aws",
        vendorName: "Amazon Web Services",
        region: "us-east-1",
        status: "OPERATIONAL",
        latencyMs: 45,
        timestamp: "2026-09-13T23:00:00Z"
      },
      {
        vendorSlug: "stripe",
        vendorName: "Stripe",
        region: "global",
        status: "OPERATIONAL",
        latencyMs: 65,
        timestamp: "2026-09-13T23:00:00Z"
      }
    ];

    const res = SubProcessorMultiRegionIncidentAnalyzer.assessCorrelatedIncidents(samples);
    expect(res.overallSystemHealthScore).toBe(100);
    expect(res.correlatedCascadeDetected).toBe(false);
    expect(res.customerSlaBreachRisk).toBe("NONE");
    expect(res.verificationDigest).toHaveLength(64);
  });

  it("identifies upstream AWS cascade when multiple dependent vendors degrade", () => {
    const samples: VendorStatusSample[] = [
      {
        vendorSlug: "aws-us-east-1",
        vendorName: "AWS Northern Virginia",
        region: "us-east-1",
        status: "DEGRADED",
        latencyMs: 450,
        incidentSummary: "Elevated error rates in EC2 and DynamoDB",
        timestamp: "2026-09-13T23:00:00Z"
      },
      {
        vendorSlug: "supabase",
        vendorName: "Supabase",
        region: "us-east-1",
        status: "DEGRADED",
        latencyMs: 380,
        incidentSummary: "Database connection timeouts",
        timestamp: "2026-09-13T23:00:00Z"
      },
      {
        vendorSlug: "resend",
        vendorName: "Resend",
        region: "us-east-1",
        status: "OPERATIONAL",
        latencyMs: 80,
        timestamp: "2026-09-13T23:00:00Z"
      },
      {
        vendorSlug: "datadog",
        vendorName: "Datadog",
        region: "us-east-1",
        status: "OPERATIONAL",
        latencyMs: 60,
        timestamp: "2026-09-13T23:00:00Z"
      }
    ];

    const res = SubProcessorMultiRegionIncidentAnalyzer.assessCorrelatedIncidents(samples);
    expect(res.correlatedCascadeDetected).toBe(true);
    expect(res.primarySuspectedSource).toBe("UPSTREAM_HYPERSCALER_AWS_OUTAGE");
    expect(res.affectedVendors).toEqual(["aws-us-east-1", "supabase"]);
    expect(res.customerSlaBreachRisk).toBe("ELEVATED");
  });

  it("identifies major outage causing CRITICAL_SLA_BREACH", () => {
    const samples: VendorStatusSample[] = [
      {
        vendorSlug: "stripe",
        vendorName: "Stripe",
        region: "global",
        status: "MAJOR_OUTAGE",
        latencyMs: 2500,
        timestamp: "2026-09-13T23:00:00Z"
      }
    ];

    const res = SubProcessorMultiRegionIncidentAnalyzer.assessCorrelatedIncidents(samples);
    expect(res.customerSlaBreachRisk).toBe("CRITICAL_SLA_BREACH");
  });

  it("throws error on empty samples", () => {
    expect(() =>
      SubProcessorMultiRegionIncidentAnalyzer.assessCorrelatedIncidents([])
    ).toThrow("Status samples list cannot be empty.");
  });
});
