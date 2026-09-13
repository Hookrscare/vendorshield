/**
 * Regression tests for QA-178: Cross-Border Cloud Data Residency Sovereign Encryption Key Custody Evaluator.
 */

import { describe, it, expect } from "vitest";
import {
  CrossBorderResidencyEvaluator,
  type VendorResidencyProfile
} from "./cross-border-cloud-data-residency-evaluator";

describe("CrossBorderResidencyEvaluator (QA-178)", () => {
  const evaluator = new CrossBorderResidencyEvaluator();

  it("evaluates a fully sovereign HYOK setup in EU with no extraterritorial exposure", () => {
    const profile: VendorResidencyProfile = {
      vendorId: "VEND-SOV-01",
      vendorName: "Sovereign Cloud SAS",
      dataOriginJurisdiction: "EU",
      primaryStorageJurisdiction: "EU",
      replicationJurisdictions: ["EU"],
      transferMechanism: "ADEQUACY_DECISION",
      keyCustodyModel: "HYOK",
      fipsLevel: 4,
      keyRotationIntervalDays: 90,
      subjectToCloudAct: false,
      zeroKnowledgeArchitecture: true,
      endToEndEncrypted: true
    };

    const res = evaluator.evaluateVendor(profile);
    expect(res.sovereigntyStatus).toBe("SOVEREIGN_SECURE");
    expect(res.sovereigntyScore).toBe(100);
    expect(res.crossBorderFlowAllowed).toBe(true);
    expect(res.keyCustodyStrength).toBe("SOVEREIGN");
    expect(res.auditHashSha256).toHaveLength(64);
  });

  it("flags EU vendor with unauthorized cross-border transfer as NON_COMPLIANT_HIGH_RISK", () => {
    const profile: VendorResidencyProfile = {
      vendorId: "VEND-ROGUE-02",
      vendorName: "Shadow Cloud Ltd",
      dataOriginJurisdiction: "EU",
      primaryStorageJurisdiction: "US",
      replicationJurisdictions: ["OTHER"],
      transferMechanism: "NONE_OR_UNAUTHORIZED",
      keyCustodyModel: "SHARED_CLOUD_KMS",
      fipsLevel: 2,
      keyRotationIntervalDays: 400,
      subjectToCloudAct: true,
      zeroKnowledgeArchitecture: false,
      endToEndEncrypted: false
    };

    const res = evaluator.evaluateVendor(profile);
    expect(res.sovereigntyStatus).toBe("NON_COMPLIANT_HIGH_RISK");
    expect(res.crossBorderFlowAllowed).toBe(false);
    expect(res.extraterritorialSubpoenaExposure).toBe(true);
    expect(res.findings.some(f => f.includes("GDPR Chapter V"))).toBe(true);
  });

  it("evaluates BYOK with US CLOUD Act subject as COMPLIANT_WITH_SAFEGUARDS", () => {
    const profile: VendorResidencyProfile = {
      vendorId: "VEND-CORP-03",
      vendorName: "Enterprise Datacenter Inc",
      dataOriginJurisdiction: "EU",
      primaryStorageJurisdiction: "US",
      replicationJurisdictions: ["EU", "US"],
      transferMechanism: "DATA_PRIVACY_FRAMEWORK_EU_US",
      keyCustodyModel: "BYOK",
      fipsLevel: 3,
      keyRotationIntervalDays: 180,
      subjectToCloudAct: true,
      zeroKnowledgeArchitecture: false,
      endToEndEncrypted: true
    };

    const res = evaluator.evaluateVendor(profile);
    expect(res.crossBorderFlowAllowed).toBe(true);
    expect(res.keyCustodyStrength).toBe("STRONG");
    expect(res.sovereigntyScore).toBeGreaterThanOrEqual(70);
    expect(res.mitigationRecommendations.length).toBeGreaterThan(0);
  });
});
