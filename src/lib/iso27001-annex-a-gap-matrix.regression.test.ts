/**
 * Regression Test Suite for QA-173: Enterprise ISO 27001:2022 Annex A Control Mapping & Gap Assessment Matrix.
 * Part of VendorShield B2B SOC 2 & GDPR Sub-Processor Trust Hub.
 */

import { describe, it, expect } from "vitest";
import {
  Iso27001AnnexAGapMatrix,
  type IsoControlAssessment
} from "./iso27001-annex-a-gap-matrix";

describe("QA-173: ISO 27001:2022 Annex A Gap Assessment Matrix", () => {
  it("certifies compliant vendor with full implementation", () => {
    const controls: IsoControlAssessment[] = [
      { controlId: "A.5.15", theme: "ORGANIZATIONAL", title: "Access control", isImplemented: true, isMandatoryForTier1: true },
      { controlId: "A.6.04", theme: "PEOPLE", title: "Disciplinary process", isImplemented: true, isMandatoryForTier1: false },
      { controlId: "A.7.02", theme: "PHYSICAL", title: "Physical entry", isImplemented: true, isMandatoryForTier1: false },
      { controlId: "A.8.28", theme: "TECHNOLOGICAL", title: "Secure coding", isImplemented: true, isMandatoryForTier1: true }
    ];

    const res = Iso27001AnnexAGapMatrix.evaluateVendorControls("VEN-DATADOG-01", "Datadog", controls);

    expect(res.certificationReadiness).toBe("CERTIFICATION_READY");
    expect(res.readinessPercentage).toBe(100.0);
    expect(res.criticalTier1Gaps).toHaveLength(0);
    expect(res.assessmentDigest).toHaveLength(64);
  });

  it("flags remediation required when mandatory Tier 1 controls are missing", () => {
    const controls: IsoControlAssessment[] = [
      { controlId: "A.5.15", theme: "ORGANIZATIONAL", title: "Access control", isImplemented: true, isMandatoryForTier1: true },
      { controlId: "A.8.28", theme: "TECHNOLOGICAL", title: "Secure coding", isImplemented: false, isMandatoryForTier1: true }, // missing
      { controlId: "A.8.16", theme: "TECHNOLOGICAL", title: "Monitoring activities", isImplemented: true, isMandatoryForTier1: true }
    ];

    const res = Iso27001AnnexAGapMatrix.evaluateVendorControls("VEN-AI-STARTUP", "FastAI", controls);

    expect(res.certificationReadiness).toBe("REMEDIATION_REQUIRED_FOR_TIER1");
    expect(res.criticalTier1Gaps).toContain("A.8.28: Secure coding");
    expect(res.implementedCount).toBe(2);
    expect(res.gapCount).toBe(1);
  });

  it("throws error for empty control list", () => {
    expect(() => {
      Iso27001AnnexAGapMatrix.evaluateVendorControls("VEN-EMPTY", "Empty", []);
    }).toThrow("at least one control assessment");
  });
});
