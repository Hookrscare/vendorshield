import { describe, it, expect } from "vitest";
import {
  CtemContinuousThreatExposureScorer,
  ThreatExposureFinding
} from "./ctem-continuous-threat-exposure-scorer";

describe("CtemContinuousThreatExposureScorer", () => {
  it("escalates actively exploited CISA KEV vulnerability on Tier 1 crown jewel asset to CRITICAL", () => {
    const finding: ThreatExposureFinding = {
      cveId: "CVE-2026-9999",
      assetId: "PROD-AUTH-VAULT-01",
      assetCriticality: "TIER_1_CROWN_JEWEL",
      cvssBaseScore: 9.8,
      epssProbability: 0.92,
      isCisaKevListed: true,
      isInternetExposed: true,
      compensatingControlActive: false
    };

    const result = CtemContinuousThreatExposureScorer.calculateExposure(finding);
    expect(result.riskTier).toBe("CRITICAL");
    expect(result.compositeExposureScore).toBe(100.0);
    expect(result.remediationSlaHours).toBe(24);
    expect(result.currentCtemStage).toBe("MOBILIZATION");
    expect(result.ctemAttestationDigest).toHaveLength(64);
  });

  it("reduces score appropriately with compensating controls active on internal asset", () => {
    const finding: ThreatExposureFinding = {
      cveId: "CVE-2026-1234",
      assetId: "INTERNAL-ANALYTICS-WORKER",
      assetCriticality: "TIER_3_INTERNAL",
      cvssBaseScore: 6.5,
      epssProbability: 0.05,
      isCisaKevListed: false,
      isInternetExposed: false,
      compensatingControlActive: true // Discount applied
    };

    const result = CtemContinuousThreatExposureScorer.calculateExposure(finding);
    expect(result.riskTier).toBe("LOW");
    expect(result.compositeExposureScore).toBeLessThan(35.0);
    expect(result.remediationSlaHours).toBe(2160);
  });

  it("validates input boundary ranges", () => {
    expect(() => {
      CtemContinuousThreatExposureScorer.calculateExposure({
        cveId: "",
        assetId: "AST-1",
        assetCriticality: "TIER_4_DEV_TEST",
        cvssBaseScore: 5.0,
        epssProbability: 0.1,
        isCisaKevListed: false,
        isInternetExposed: false,
        compensatingControlActive: false
      });
    }).toThrow();

    expect(() => {
      CtemContinuousThreatExposureScorer.calculateExposure({
        cveId: "CVE-1",
        assetId: "AST-1",
        assetCriticality: "TIER_4_DEV_TEST",
        cvssBaseScore: 11.0, // Invalid CVSS
        epssProbability: 0.1,
        isCisaKevListed: false,
        isInternetExposed: false,
        compensatingControlActive: false
      });
    }).toThrow();
  });
});
