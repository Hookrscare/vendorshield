import { describe, it, expect } from "vitest";
import {
  calculateGapDays,
  assessAuditGap,
  computeBridgeLetterSeal,
  generateBridgeLetter
} from "./soc2-bridge-letter";

describe("QA-124: Automated Vendor SOC 2 Bridge Letter & Gap Assessment Generator", () => {
  it("calculates gap days accurately across months", () => {
    const gap = calculateGapDays("2026-06-30T00:00:00.000Z", "2026-08-15T00:00:00.000Z");
    expect(gap).toBe(46);
  });

  it("evaluates a standard <= 30-day gap as LOW_NORMAL risk", () => {
    const assessment = assessAuditGap("2026-08-01T00:00:00.000Z", "2026-08-20T00:00:00.000Z", {
      hasInfrastructureChanges: false,
      hasKeyPersonnelTurnover: false,
      hasSecurityIncidentsInGapPeriod: false,
      hasSubProcessorChanges: false,
      managementStatement: "All controls operated continuously."
    });

    expect(assessment.gapDays).toBe(19);
    expect(assessment.riskLevel).toBe("LOW_NORMAL");
    expect(assessment.acceptableUnderAicpa).toBe(true);
    expect(assessment.requiresCompensatingControls).toBe(false);
  });

  it("evaluates a > 120-day gap as CRITICAL_EXPIRED unacceptable under AICPA guidelines", () => {
    const assessment = assessAuditGap("2026-01-01T00:00:00.000Z", "2026-06-01T00:00:00.000Z", {
      hasInfrastructureChanges: false,
      hasKeyPersonnelTurnover: false,
      hasSecurityIncidentsInGapPeriod: false,
      hasSubProcessorChanges: false,
      managementStatement: "Controls operated as usual."
    });

    expect(assessment.gapDays).toBeGreaterThan(120);
    expect(assessment.riskLevel).toBe("CRITICAL_EXPIRED");
    expect(assessment.acceptableUnderAicpa).toBe(false);
    expect(assessment.requiresCompensatingControls).toBe(true);
  });

  it("flags unresolved security incidents during gap period as CRITICAL", () => {
    const assessment = assessAuditGap("2026-08-01T00:00:00.000Z", "2026-08-15T00:00:00.000Z", {
      hasInfrastructureChanges: false,
      hasKeyPersonnelTurnover: false,
      hasSecurityIncidentsInGapPeriod: true,
      incidentDetails: "DDoS mitigation incident on US-East-1 cluster",
      hasSubProcessorChanges: false,
      managementStatement: "Incident resolved within 4 hours."
    });

    expect(assessment.riskLevel).toBe("CRITICAL_EXPIRED");
    expect(assessment.findings.some(f => f.includes("Unresolved security incident"))).toBe(true);
  });

  it("synthesizes full Markdown bridge letter with executive signatory and cryptographic seal", () => {
    const letter = generateBridgeLetter({
      vendorId: "VND-CLOUDFLARE",
      vendorName: "Cloudflare, Inc.",
      auditStandard: "SOC_2_TYPE_II",
      auditorFirmName: "Ernst & Young LLP",
      priorReportEndDateIso: "2026-06-30T00:00:00.000Z",
      newAuditTargetDateIso: "2026-10-15T00:00:00.000Z",
      letterIssuedDateIso: "2026-08-15T00:00:00.000Z",
      signatory: {
        name: "Jane Doe",
        title: "Chief Information Security Officer",
        email: "jane.doe@cloudflare.com",
        organization: "Cloudflare, Inc."
      },
      materialChanges: {
        hasInfrastructureChanges: false,
        hasKeyPersonnelTurnover: false,
        hasSecurityIncidentsInGapPeriod: false,
        hasSubProcessorChanges: false,
        managementStatement: "All controls in the scope of the SOC 2 Type II report operated without material modification."
      }
    });

    expect(letter.letterId).toMatch(/^BRG-[A-F0-9]{12}$/);
    expect(letter.gapDays).toBe(46);
    expect(letter.riskLevel).toBe("MODERATE_REVIEW");
    expect(letter.cryptographicSeal).toMatch(/^BRIDGE-SEAL-[a-f0-9]{64}$/);
    expect(letter.letterMarkdown).toContain("Letter of Attestation (Bridge Letter)");
    expect(letter.letterMarkdown).toContain("Ernst & Young LLP");
    expect(letter.letterMarkdown).toContain("Jane Doe");
  });
});
