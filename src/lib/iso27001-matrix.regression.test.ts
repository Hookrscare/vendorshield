import { describe, it, expect } from "vitest";
import {
  Iso27001ComplianceEngine,
  ISO_27001_ANNEX_A_CONTROLS,
  VendorControlAssessment
} from "./iso27001-matrix";

describe("QA-127: ISO 27001 Annex A Security Control Mapping & Compliance Matrix", () => {
  it("initializes with standard ISO 27001 Annex A controls and SOC 2 mappings", () => {
    const engine = new Iso27001ComplianceEngine();
    const accessCtrl = engine.getControl("A.5.15");
    expect(accessCtrl).toBeDefined();
    expect(accessCtrl?.title).toBe("Access control");
    expect(accessCtrl?.theme).toBe("A.5_ORGANIZATIONAL");
    expect(accessCtrl?.soc2Mapping).toContain("CC6.1");

    const vulnCtrl = engine.getControl("A.8.8");
    expect(vulnCtrl).toBeDefined();
    expect(vulnCtrl?.soc2Mapping).toContain("CC7.1");
  });

  it("evaluates a fully compliant vendor with 100% coverage score and valid cryptographic seal", () => {
    const engine = new Iso27001ComplianceEngine();
    const assessments: VendorControlAssessment[] = ISO_27001_ANNEX_A_CONTROLS.map((ctrl) => ({
      controlId: ctrl.controlId,
      status: "IMPLEMENTED",
      evidenceReference: `https://vault.vendorshield.internal/evidence/${ctrl.controlId}.pdf`
    }));

    const report = engine.evaluateCompliance("vnd_aws_cloud", "Amazon Web Services", assessments);
    expect(report.compliancePercentage).toBe(100);
    expect(report.criticalGaps.length).toBe(0);
    expect(report.implementedCount).toBe(ISO_27001_ANNEX_A_CONTROLS.length);
    expect(report.missingCount).toBe(0);
    expect(report.statementOfApplicabilityDigest).toMatch(/^[a-f0-9]{64}$/);
    expect(report.cryptographicSeal).toContain("VS-ISO27001-SOA-");
  });

  it("accurately handles partial implementations, unaddressed gaps, and justified exclusions", () => {
    const engine = new Iso27001ComplianceEngine();
    const assessments: VendorControlAssessment[] = [
      { controlId: "A.5.1", status: "IMPLEMENTED" },
      { controlId: "A.5.15", status: "PARTIALLY_IMPLEMENTED" },
      {
        controlId: "A.7.1",
        status: "EXCLUDED",
        exclusionJustification: "100% remote cloud-native organization with no physical datacenters"
      }
    ];

    const report = engine.evaluateCompliance("vnd_saas_startup", "Acme SaaS", assessments);
    expect(report.excludedCount).toBe(1);
    expect(report.partialCount).toBe(1);
    expect(report.implementedCount).toBe(1);
    expect(report.missingCount).toBeGreaterThan(0);
    expect(report.criticalGaps.some((g) => g.includes("A.5.15"))).toBe(true);
    expect(report.remediations.length).toBeGreaterThan(0);
    expect(report.compliancePercentage).toBeLessThan(100);
  });
});
