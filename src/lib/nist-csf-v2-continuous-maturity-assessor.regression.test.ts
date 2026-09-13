import { describe, it, expect } from "vitest";
import {
  NistCsfV2ContinuousMaturityAssessor,
  NistCsfSubcategoryTelemetry
} from "./nist-csf-v2-continuous-maturity-assessor";

describe("NistCsfV2ContinuousMaturityAssessor (QA-192)", () => {
  it("computes TIER_4_ADAPTIVE when all controls across all 6 NIST CSF 2.0 functions are implemented", () => {
    const telemetry: NistCsfSubcategoryTelemetry[] = [
      {
        subcategoryId: "GV.OC-01",
        csfFunction: "GOVERN",
        title: "Organizational context understood",
        isImplemented: true,
        cloudProvider: "MULTI_CLOUD",
        automatedTelemetryEvidenceUri: "s3://compliance/gv-oc-01.json",
        severityIfDeficient: "HIGH"
      },
      {
        subcategoryId: "GV.SC-01",
        csfFunction: "GOVERN",
        title: "Cyber supply chain risk management program established",
        isImplemented: true,
        cloudProvider: "MULTI_CLOUD",
        automatedTelemetryEvidenceUri: "s3://compliance/gv-sc-01.json",
        severityIfDeficient: "CRITICAL"
      },
      {
        subcategoryId: "ID.AM-01",
        csfFunction: "IDENTIFY",
        title: "Inventories of hardware managed",
        isImplemented: true,
        cloudProvider: "AWS",
        automatedTelemetryEvidenceUri: "s3://compliance/id-am-01.json",
        severityIfDeficient: "MEDIUM"
      },
      {
        subcategoryId: "PR.AA-01",
        csfFunction: "PROTECT",
        title: "Identities and credentials asserted",
        isImplemented: true,
        cloudProvider: "GCP",
        automatedTelemetryEvidenceUri: "gs://compliance/pr-aa-01.json",
        severityIfDeficient: "CRITICAL"
      },
      {
        subcategoryId: "DE.CM-01",
        csfFunction: "DETECT",
        title: "Networks and environments monitored",
        isImplemented: true,
        cloudProvider: "AZURE",
        automatedTelemetryEvidenceUri: "azure://compliance/de-cm-01.json",
        severityIfDeficient: "HIGH"
      },
      {
        subcategoryId: "RS.MA-01",
        csfFunction: "RESPOND",
        title: "Incident response plan executed",
        isImplemented: true,
        cloudProvider: "MULTI_CLOUD",
        automatedTelemetryEvidenceUri: "s3://compliance/rs-ma-01.json",
        severityIfDeficient: "HIGH"
      },
      {
        subcategoryId: "RC.RP-01",
        csfFunction: "RECOVER",
        title: "Recovery plan executed",
        isImplemented: true,
        cloudProvider: "AWS",
        automatedTelemetryEvidenceUri: "s3://compliance/rc-rp-01.json",
        severityIfDeficient: "MEDIUM"
      }
    ];

    const report = NistCsfV2ContinuousMaturityAssessor.evaluatePosture(telemetry);

    expect(report.overallMaturityTier).toBe("TIER_4_ADAPTIVE");
    expect(report.compliancePercentage).toBe(100);
    expect(report.criticalGaps.length).toBe(0);
    expect(report.supplyChainCompliant).toBe(true);
    expect(report.auditSignature).toBeDefined();
    expect(report.functionBreakdown.GOVERN.complianceRate).toBe(100);
  });

  it("flags critical supply chain gap and downgrades tier when GV.SC is missing", () => {
    const telemetry: NistCsfSubcategoryTelemetry[] = [
      {
        subcategoryId: "GV.SC-01",
        csfFunction: "GOVERN",
        title: "Cyber supply chain risk management program established",
        isImplemented: false,
        cloudProvider: "MULTI_CLOUD",
        automatedTelemetryEvidenceUri: "s3://compliance/gv-sc-01.json",
        severityIfDeficient: "CRITICAL"
      },
      {
        subcategoryId: "PR.AA-01",
        csfFunction: "PROTECT",
        title: "Identities and credentials asserted",
        isImplemented: true,
        cloudProvider: "GCP",
        automatedTelemetryEvidenceUri: "gs://compliance/pr-aa-01.json",
        severityIfDeficient: "CRITICAL"
      }
    ];

    const report = NistCsfV2ContinuousMaturityAssessor.evaluatePosture(telemetry);

    expect(report.overallMaturityTier).toBe("TIER_1_PARTIAL");
    expect(report.compliancePercentage).toBe(50);
    expect(report.supplyChainCompliant).toBe(false);
    expect(report.criticalGaps[0]).toContain("GV.SC-01");
  });

  it("throws on empty telemetry array", () => {
    expect(() => NistCsfV2ContinuousMaturityAssessor.evaluatePosture([])).toThrow(
      "Telemetry array must contain at least one subcategory control."
    );
  });
});
