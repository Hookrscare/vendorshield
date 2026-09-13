/**
 * Regression Test Suite for QA-170: Automated Multi-Tenant GDPR Article 28 Standard Contractual Clauses (SCC) Sub-Processor Transfer Impact Assessment (TIA) Engine.
 * Part of VendorShield B2B SOC 2 & GDPR Sub-Processor Trust Hub.
 */

import { describe, it, expect } from "vitest";
import { GdprSubprocessorTiaEngine, type SubProcessorProfile } from "./gdpr-subprocessor-tia-engine";

describe("QA-170: GDPR Sub-Processor TIA Engine", () => {
  it("approves EEA based vendor with low risk rating", () => {
    const profile: SubProcessorProfile = {
      vendorId: "VENDOR_GERMANY_01",
      vendorName: "Hetzner Online GmbH",
      dataHostingCountry: "DE",
      jurisdictionCategory: "EEA",
      hasSccAgreement: true,
      hasClientSideEncryption: false,
      processesSensitiveSpecialCategoryData: false
    };

    const res = GdprSubprocessorTiaEngine.evaluateSubProcessor(profile);

    expect(res.transferAllowed).toBe(true);
    expect(res.riskRating).toBe("LOW_ADEQUATE");
    expect(res.tiaAuditDigest).toHaveLength(64);
  });

  it("permits third country transfer only when supplementary encryption and SCCs are present", () => {
    const profile: SubProcessorProfile = {
      vendorId: "VENDOR_INDIA_DEV_OPS",
      vendorName: "Bangalore Cloud Ops",
      dataHostingCountry: "IN",
      jurisdictionCategory: "THIRD_COUNTRY_UNREGULATED",
      hasSccAgreement: true,
      hasClientSideEncryption: true,
      processesSensitiveSpecialCategoryData: false
    };

    const res = GdprSubprocessorTiaEngine.evaluateSubProcessor(profile);

    expect(res.transferAllowed).toBe(true);
    expect(res.riskRating).toBe("MEDIUM_SUPPLEMENTARY_REQUIRED");
  });

  it("prohibits third country transfer when supplementary encryption is missing", () => {
    const profile: SubProcessorProfile = {
      vendorId: "VENDOR_THIRD_COUNTRY_UNSAFE",
      vendorName: "Global Raw Storage",
      dataHostingCountry: "XYZ",
      jurisdictionCategory: "THIRD_COUNTRY_UNREGULATED",
      hasSccAgreement: true,
      hasClientSideEncryption: false, // missing
      processesSensitiveSpecialCategoryData: false
    };

    const res = GdprSubprocessorTiaEngine.evaluateSubProcessor(profile);

    expect(res.transferAllowed).toBe(false);
    expect(res.riskRating).toBe("HIGH_TRANSFER_PROHIBITED");
  });
});
