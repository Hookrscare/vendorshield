import { describe, it, expect } from "vitest";
import {
  CtemDynamicRiskHorizonEvaluator,
  SubProcessorAssetExposure
} from "./ctem-dynamic-risk-horizon-evaluator";

describe("QA-199: Continuous Threat Exposure Management (CTEM) Dynamic Risk Horizon Evaluator", () => {
  it("evaluates a critical zero-day exposure requiring immediate emergency mobilization", () => {
    const criticalExposure: SubProcessorAssetExposure = {
      subProcessorId: "SUB-AWS-RDS-01",
      subProcessorName: "AWS Relational Database Service",
      serviceTier: "TIER_1_CRITICAL",
      activeCveId: "CVE-2026-9999",
      cvssBaseScore: 9.8,
      epssExploitProbability: 0.85,
      cisaKevListed: true,
      hasCompensatingZeroTrustMtls: false,
      hasCompensatingWafDDoS: false,
      daysExposed: 12
    };

    const result = CtemDynamicRiskHorizonEvaluator.evaluateAssetExposure(criticalExposure);

    expect(result.exposureTier).toBe("CRITICAL");
    expect(result.dynamicRiskScore).toBeGreaterThanOrEqual(80.0);
    expect(result.remediationSlaHours).toBe(24);
    expect(result.ctemStage).toBe("MOBILIZATION");
    expect(result.compensatingControlsActive).toBe(false);
    expect(result.complianceAttestationToken).toHaveLength(64);
  });

  it("applies compensating controls to offset moderate risk exposures", () => {
    const mitigatedExposure: SubProcessorAssetExposure = {
      subProcessorId: "SUB-STRIPE-01",
      subProcessorName: "Stripe Payment Gateway",
      serviceTier: "TIER_2_SIGNIFICANT",
      activeCveId: "CVE-2026-1122",
      cvssBaseScore: 6.5,
      epssExploitProbability: 0.15,
      cisaKevListed: false,
      hasCompensatingZeroTrustMtls: true,
      hasCompensatingWafDDoS: true,
      daysExposed: 5
    };

    const result = CtemDynamicRiskHorizonEvaluator.evaluateAssetExposure(mitigatedExposure);

    expect(result.compensatingControlsActive).toBe(true);
    expect(result.exposureTier).toMatch(/LOW|ELEVATED/);
    expect(result.dynamicRiskScore).toBeLessThan(50.0);
    expect(result.ctemStage).toBe("VALIDATION");
  });

  it("throws validation error on invalid asset exposure parameters", () => {
    expect(() => {
      CtemDynamicRiskHorizonEvaluator.evaluateAssetExposure({
        subProcessorId: "",
        subProcessorName: "Test Subprocessor",
        serviceTier: "TIER_3_LOW",
        cisaKevListed: false,
        hasCompensatingZeroTrustMtls: false,
        hasCompensatingWafDDoS: false,
        daysExposed: 0
      });
    }).toThrow("subProcessorId and subProcessorName are required.");

    expect(() => {
      CtemDynamicRiskHorizonEvaluator.evaluateAssetExposure({
        subProcessorId: "SUB-01",
        subProcessorName: "Test Subprocessor",
        serviceTier: "TIER_3_LOW",
        cisaKevListed: false,
        hasCompensatingZeroTrustMtls: false,
        hasCompensatingWafDDoS: false,
        daysExposed: -5
      });
    }).toThrow("daysExposed cannot be negative.");
  });
});
