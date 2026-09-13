/**
 * Regression Test Suite for QA-189: Automated Third-Party Vendor Data Processing Security Risk Scorer.
 * Part of VendorShield B2B SOC 2 & GDPR Sub-Processor Trust Hub.
 */

import { describe, it, expect } from "vitest";
import {
  ThirdPartyVendorDataProcessingSecurityRiskScorer,
  VendorProcessingProfile
} from "./automated-third-party-vendor-data-processing-security-risk-scorer";

describe("QA-189: Automated Third-Party Vendor Data Processing Security Risk Scorer", () => {
  const scorer = new ThirdPartyVendorDataProcessingSecurityRiskScorer("test-secret-key-189");

  it("determines appropriate risk tiers across score spectrum", () => {
    expect(ThirdPartyVendorDataProcessingSecurityRiskScorer.determineRiskLevel(15)).toBe("LOW");
    expect(ThirdPartyVendorDataProcessingSecurityRiskScorer.determineRiskLevel(35)).toBe("MEDIUM");
    expect(ThirdPartyVendorDataProcessingSecurityRiskScorer.determineRiskLevel(60)).toBe("HIGH");
    expect(ThirdPartyVendorDataProcessingSecurityRiskScorer.determineRiskLevel(90)).toBe("CRITICAL");
  });

  it("approves secure, certified vendor with signed DPA and modern safeguards", () => {
    const profile: VendorProcessingProfile = {
      vendorId: "v-datacenter-01",
      vendorName: "EuroSecure Cloud GmbH",
      primaryJurisdiction: "DE",
      dataSensitivity: "CONFIDENTIAL_PII",
      monthlyRecordVolume: 50_000,
      contractualDpa: {
        dpaSigned: true,
        gdprArticle28Compliant: true,
        subprocessorNotificationDays: 30,
        breachNotificationSlaHours: 24,
        auditRightsGranted: true,
        transferMechanism: "SCC_2021"
      },
      safeguards: {
        tlsVersion: "1.3",
        mTLSEnforced: true,
        encryptionAtRest: "AES-256-GCM-CMEK",
        keyRotationDays: 90,
        ephemeralAccessOnly: true,
        mfaEnforced: true,
        soc2TypeIIValid: true,
        iso27001Valid: true
      }
    };

    const result = scorer.scoreVendor(profile);

    expect(result.compositeRiskScore).toBeLessThan(50);
    expect(result.riskLevel).toBe("LOW");
    expect(result.approvedForProcessing).toBe(true);
    expect(result.attestationSignature).toBeDefined();
    expect(result.attestationSignature.length).toBe(64);
  });

  it("rejects uncertified vendor lacking signed DPA and encryption at rest", () => {
    const profile: VendorProcessingProfile = {
      vendorId: "v-shadow-99",
      vendorName: "Legacy Analytics Inc",
      primaryJurisdiction: "US",
      dataSensitivity: "RESTRICTED_PHI",
      monthlyRecordVolume: 2_500_000,
      contractualDpa: {
        dpaSigned: false,
        gdprArticle28Compliant: false,
        subprocessorNotificationDays: 0,
        breachNotificationSlaHours: 120,
        auditRightsGranted: false,
        transferMechanism: "NONE"
      },
      safeguards: {
        tlsVersion: "1.2",
        mTLSEnforced: false,
        encryptionAtRest: "NONE",
        keyRotationDays: 365,
        ephemeralAccessOnly: false,
        mfaEnforced: false,
        soc2TypeIIValid: false,
        iso27001Valid: false
      }
    };

    const result = scorer.scoreVendor(profile);

    expect(result.compositeRiskScore).toBeGreaterThanOrEqual(75);
    expect(result.riskLevel).toBe("CRITICAL");
    expect(result.approvedForProcessing).toBe(false);
    expect(result.findings).toContain("DPA is unsigned or missing");
    expect(result.findings).toContain("Data is stored unencrypted at rest");
    expect(result.findings).toContain("Vendor possesses neither valid SOC 2 Type II nor ISO 27001 certification");
    expect(result.remediationPlan.length).toBeGreaterThan(0);
  });
});
