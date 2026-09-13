import { describe, it, expect } from "vitest";
import {
  VendorSlaBreachEscalationEngine,
  VendorSlaTerms,
  VendorPerformancePeriod
} from "./vendor-sla-breach-escalation-engine";

describe("VendorSlaBreachEscalationEngine (QA-184)", () => {
  const terms: VendorSlaTerms = {
    vendorId: "VEND-AWS-DATABASE-01",
    vendorName: "Aurora Enterprise DB",
    contractMonthlySpendUsd: 20000.0,
    contractualUptimePct: 99.95,
    maxP1MttrMinutes: 45,
    securityNoticeMaxHours: 24
  };

  it("passes without penalties when vendor exceeds all SLAs", () => {
    const perf: VendorPerformancePeriod = {
      actualUptimePct: 99.99,
      actualP1MttrMinutes: 20,
      actualSecurityNoticeHours: 4
    };

    const res = VendorSlaBreachEscalationEngine.evaluateSla(terms, perf);

    expect(res.isBreached).toBe(false);
    expect(res.totalServiceCreditUsd).toBe(0);
    expect(res.escalationTier).toBe("NONE");
    expect(res.breachReasons).toHaveLength(0);
    expect(res.verificationDigest).toHaveLength(64);
  });

  it("triggers financial penalty and Tier 2 escalation for moderate uptime and MTTR breach", () => {
    const perf: VendorPerformancePeriod = {
      actualUptimePct: 98.50, // Deficit = 1.45% => 25% credit
      actualP1MttrMinutes: 75, // Breach => 15% credit
      actualSecurityNoticeHours: 12
    };

    const res = VendorSlaBreachEscalationEngine.evaluateSla(terms, perf);

    expect(res.isBreached).toBe(true);
    // 25% + 15% = 40% of $20,000 = $8,000
    expect(res.totalServiceCreditUsd).toBe(8000.0);
    expect(res.escalationTier).toBe("TIER_2_VP_ENGINEERING");
    expect(res.breachReasons).toHaveLength(2);
  });

  it("triggers CISO/Legal Tier 3 escalation when regulatory security notice deadline is breached", () => {
    const perf: VendorPerformancePeriod = {
      actualUptimePct: 99.99,
      actualP1MttrMinutes: 15,
      actualSecurityNoticeHours: 48 // Exceeded 24h
    };

    const res = VendorSlaBreachEscalationEngine.evaluateSla(terms, perf);

    expect(res.isBreached).toBe(true);
    expect(res.escalationTier).toBe("TIER_3_CISO_LEGAL_CONTRACT_TERMINATION");
    expect(res.breachReasons[0]).toContain("regulatory deadline");
  });

  it("rejects invalid input terms", () => {
    expect(() => {
      VendorSlaBreachEscalationEngine.evaluateSla(
        { ...terms, contractMonthlySpendUsd: -100 },
        { actualUptimePct: 99.0, actualP1MttrMinutes: 10, actualSecurityNoticeHours: 5 }
      );
    }).toThrow("Invalid vendor SLA terms.");
  });
});
