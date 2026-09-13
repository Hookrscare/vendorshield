import { describe, it, expect } from "vitest";
import { VendorPciDssScopeTokenizationAuditor } from "./vendor-pci-dss-scope-tokenization-auditor";

describe("VendorPciDssScopeTokenizationAuditor (QA-179)", () => {
  it("qualifies hosted iframe + network tokenization as SAQ A scope reduced with 85% savings", () => {
    const res = VendorPciDssScopeTokenizationAuditor.auditVendor({
      vendorId: "vnd-stripe-prod",
      vendorName: "Stripe Hosted Elements",
      architecture: "HOSTED_IFRAME_ELEMENTS",
      usesNetworkTokenization: true,
      cleartextPanStorageDetected: false,
      tlsVersion: "1.3",
      keyRotationDays: 90
    });

    expect(res.pciScopeClassification).toBe("SAQ_A_SCOPE_REDUCED");
    expect(res.isCompliantPciV4).toBe(true);
    expect(res.scopeReductionSavingsEstimatedPct).toBe(85);
    expect(res.riskFlags).toHaveLength(0);
    expect(res.auditAttestationHash).toHaveLength(64);
  });

  it("flags cleartext PAN storage as full SAQ D scope and critical compliance breach", () => {
    const res = VendorPciDssScopeTokenizationAuditor.auditVendor({
      vendorId: "vnd-legacy-pay",
      vendorName: "Legacy Payment Gateway",
      architecture: "DIRECT_REST_API",
      usesNetworkTokenization: false,
      cleartextPanStorageDetected: true,
      tlsVersion: "1.2",
      keyRotationDays: 180
    });

    expect(res.pciScopeClassification).toBe("SAQ_D_FULL_CDE_IN_SCOPE");
    expect(res.isCompliantPciV4).toBe(false);
    expect(res.riskFlags).toContain("CRITICAL_CLEARTEXT_PAN_STORAGE_PROHIBITED");
    expect(res.scopeReductionSavingsEstimatedPct).toBe(0);
  });

  it("identifies deprecated TLS and excessive key rotation intervals", () => {
    const res = VendorPciDssScopeTokenizationAuditor.auditVendor({
      vendorId: "vnd-outdated",
      vendorName: "Outdated Processor",
      architecture: "HOSTED_IFRAME_ELEMENTS",
      usesNetworkTokenization: false,
      cleartextPanStorageDetected: false,
      tlsVersion: "1.0",
      keyRotationDays: 500
    });

    expect(res.isCompliantPciV4).toBe(false);
    expect(res.riskFlags).toContain("DEPRECATED_INSECURE_TLS_CIPHER");
    expect(res.riskFlags).toContain("ENCRYPTION_KEY_ROTATION_EXCEEDS_ANNUAL_LIMIT");
  });
});
