import { describe, it, expect } from "vitest";
import {
  VendorContractSLAEscalator,
  VendorContractSLAConfig,
  VendorTelemetryEvent
} from "./vendor-contract-sla-escalator";

describe("QA-148: Real-Time B2B Vendor Contract SLA Breach & Escalation Automation", () => {
  const baseConfig: VendorContractSLAConfig = {
    vendorId: "vnd_stripe_compliance_001",
    vendorName: "CloudPayments Global",
    contractId: "CTR-2026-B2B-900",
    monthlyServiceFeeUsd: 10000,
    uptimeThresholdPct: 99.95,
    p1MaxResponseMinutes: 15,
    p2MaxResponseMinutes: 60,
    criticalCveMaxDays: 7,
    breachNoticeMaxHours: 24
  };

  it("evaluates healthy telemetry without any breaches or penalty credits", () => {
    const escalator = new VendorContractSLAEscalator(baseConfig);
    const telemetry: VendorTelemetryEvent[] = [
      { metricType: "SYSTEM_UPTIME", observedValue: 99.99, timestampIso: new Date().toISOString() },
      { metricType: "P1_INCIDENT_RESPONSE_MINUTES", observedValue: 8, timestampIso: new Date().toISOString() },
      { metricType: "CRITICAL_CVE_REMEDIATION_DAYS", observedValue: 3, timestampIso: new Date().toISOString() }
    ];

    const result = escalator.evaluateTelemetry(telemetry);
    expect(result.hasBreaches).toBe(false);
    expect(result.totalBreachesCount).toBe(0);
    expect(result.totalPenaltyCreditsUsd).toBe(0);
    expect(result.effectiveMonthlyFeeAfterCreditUsd).toBe(10000);
    expect(result.highestEscalationTier).toBe("NONE");
    expect(result.auditCertificate.integrityHashSha256).toBeDefined();
  });

  it("detects uptime degradation and escalates appropriately", () => {
    const escalator = new VendorContractSLAEscalator(baseConfig);
    const telemetry: VendorTelemetryEvent[] = [
      { metricType: "SYSTEM_UPTIME", observedValue: 98.50, timestampIso: new Date().toISOString() }
    ];

    const result = escalator.evaluateTelemetry(telemetry);
    expect(result.hasBreaches).toBe(true);
    expect(result.totalBreachesCount).toBe(1);
    expect(result.breaches[0].severity).toBe("CRITICAL");
    expect(result.breaches[0].penaltyCreditPercentage).toBe(50);
    expect(result.totalPenaltyCreditsUsd).toBe(5000);
    expect(result.effectiveMonthlyFeeAfterCreditUsd).toBe(5000);
    expect(result.highestEscalationTier).toBe("TIER_3_LEGAL_TERMINATION_WARNING");
  });

  it("handles security breach notification SLA violation with full 100% credit and tier 3 legal escalation", () => {
    const escalator = new VendorContractSLAEscalator(baseConfig);
    const telemetry: VendorTelemetryEvent[] = [
      {
        metricType: "SECURITY_BREACH_NOTIFICATION_HOURS",
        observedValue: 48, // 48h > 24h contract limit
        timestampIso: new Date().toISOString(),
        incidentSummary: "Exfiltrated S3 bucket discovered 48h after breach"
      }
    ];

    const result = escalator.evaluateTelemetry(telemetry);
    expect(result.hasBreaches).toBe(true);
    expect(result.totalPenaltyCreditsUsd).toBe(10000); // 100% cap
    expect(result.effectiveMonthlyFeeAfterCreditUsd).toBe(0);
    expect(result.highestEscalationTier).toBe("TIER_3_LEGAL_TERMINATION_WARNING");
    expect(result.auditCertificate.certificateId).toContain("CTR-2026-B2B-900");
  });

  it("caps penalty credits at 100% of the monthly fee across multiple simultaneous breaches", () => {
    const escalator = new VendorContractSLAEscalator(baseConfig);
    const telemetry: VendorTelemetryEvent[] = [
      { metricType: "SYSTEM_UPTIME", observedValue: 98.0, timestampIso: new Date().toISOString() }, // 50% = $5,000
      { metricType: "P1_INCIDENT_RESPONSE_MINUTES", observedValue: 45, timestampIso: new Date().toISOString() }, // 20% = $2,000
      { metricType: "SECURITY_BREACH_NOTIFICATION_HOURS", observedValue: 72, timestampIso: new Date().toISOString() } // 100% = $10,000
    ];

    const result = escalator.evaluateTelemetry(telemetry);
    expect(result.totalBreachesCount).toBe(3);
    expect(result.totalPenaltyCreditsUsd).toBe(10000); // Capped at $10,000
    expect(result.effectiveMonthlyFeeAfterCreditUsd).toBe(0);
  });
});
