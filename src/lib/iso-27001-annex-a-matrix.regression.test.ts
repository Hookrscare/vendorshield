import { describe, it, expect } from "vitest";
import {
  Iso27001AnnexAMatrix,
  VendorIsoGapAssessmentRequest,
  AnnexAControl
} from "./iso-27001-annex-a-matrix";

describe("QA-173: Enterprise ISO 27001:2022 Annex A Control Mapping & Gap Assessment Matrix", () => {
  const sampleControls: AnnexAControl[] = [
    {
      controlId: "A.5.19",
      title: "Information security in supplier relationships",
      theme: "ORGANIZATIONAL",
      status: "IMPLEMENTED",
      evidenceRef: "DOC-SEC-POL-04",
      lastAssessedIsoDate: "2026-09-01"
    },
    {
      controlId: "A.5.23",
      title: "Information security for cloud services",
      theme: "ORGANIZATIONAL",
      status: "IMPLEMENTED",
      evidenceRef: "DOC-CLOUD-SEC-01",
      lastAssessedIsoDate: "2026-09-01"
    },
    {
      controlId: "A.6.7",
      title: "Remote working",
      theme: "PEOPLE",
      status: "IMPLEMENTED",
      evidenceRef: "DOC-REMOTE-POL-02",
      lastAssessedIsoDate: "2026-09-01"
    },
    {
      controlId: "A.7.1",
      title: "Physical security perimeters",
      theme: "PHYSICAL",
      status: "EXCLUDED_JUSTIFIED",
      justificationForExclusion: "100% remote-first SaaS with no physical corporate offices or physical data centers (AWS hosted).",
      lastAssessedIsoDate: "2026-09-01"
    },
    {
      controlId: "A.8.8",
      title: "Management of technical vulnerabilities",
      theme: "TECHNOLOGICAL",
      status: "IMPLEMENTED",
      evidenceRef: "PENTEST-2026-Q2-CERT",
      lastAssessedIsoDate: "2026-09-01"
    },
    {
      controlId: "A.8.28",
      title: "Secure coding",
      theme: "TECHNOLOGICAL",
      status: "IMPLEMENTED",
      evidenceRef: "SAST-DAST-CI-PIPELINE",
      lastAssessedIsoDate: "2026-09-01"
    }
  ];

  it("evaluates a compliant vendor with 100% applicable score as AUDIT_READY", () => {
    const req: VendorIsoGapAssessmentRequest = {
      vendorId: "VEND-SECURE-001",
      vendorName: "CloudScale Systems",
      hasValidIso27001Certificate: true,
      certExpirationDate: "2027-10-15",
      controls: sampleControls
    };

    const report = Iso27001AnnexAMatrix.evaluateVendor(req);
    expect(report.overallScorePercent).toBe(100.0);
    expect(report.certificationReadiness).toBe("AUDIT_READY");
    expect(report.criticalGaps).toHaveLength(0);
    expect(report.statementOfApplicabilitySummary.totalApplicable).toBe(5);
    expect(report.statementOfApplicabilitySummary.totalJustifiedExclusions).toBe(1);
    expect(report.auditorVerificationTokenSha256).toHaveLength(64);
  });

  it("identifies critical gaps in technological controls and adjusts readiness", () => {
    const controlsWithGaps: AnnexAControl[] = [
      ...sampleControls,
      {
        controlId: "A.8.24",
        title: "Use of cryptography",
        theme: "TECHNOLOGICAL",
        status: "NOT_IMPLEMENTED",
        lastAssessedIsoDate: "2026-09-01"
      }
    ];

    const req: VendorIsoGapAssessmentRequest = {
      vendorId: "VEND-GAP-002",
      vendorName: "Legacy Data Corp",
      hasValidIso27001Certificate: false,
      controls: controlsWithGaps
    };

    const report = Iso27001AnnexAMatrix.evaluateVendor(req);
    expect(report.overallScorePercent).toBeLessThan(100.0);
    expect(report.criticalGaps.length).toBeGreaterThan(0);
    expect(report.criticalGaps[0]).toContain("A.8.24");
  });

  it("throws when an excluded control lacks justification", () => {
    const invalidControls: AnnexAControl[] = [
      {
        controlId: "A.7.2",
        title: "Physical entry",
        theme: "PHYSICAL",
        status: "EXCLUDED_JUSTIFIED",
        justificationForExclusion: "",
        lastAssessedIsoDate: "2026-09-01"
      }
    ];

    expect(() => {
      Iso27001AnnexAMatrix.evaluateVendor({
        vendorId: "VEND-ERR",
        vendorName: "Bad Justification Corp",
        hasValidIso27001Certificate: false,
        controls: invalidControls
      });
    }).toThrow("lacks a justification");
  });
});
