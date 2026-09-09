/**
 * QA-135: Automated Continuous Privacy Shield & EU Data Transfer Risk Audit Engine Regression Tests.
 * Part of VendorShield B2B SOC 2 & GDPR Sub-Processor Trust Hub.
 */

import { describe, it, expect } from "vitest";
import {
  PrivacyShieldTransferAuditor,
  DPFRegistrationRecord,
} from "./privacy-shield-transfer-auditor";

describe("QA-135: PrivacyShieldTransferAuditor", () => {
  const referenceDate = new Date("2026-09-09T08:00:00Z");

  it("passes active, fully compliant DPF registration with low risk rating", () => {
    const record: DPFRegistrationRecord = {
      organizationId: "ORG-001-AWS",
      organizationName: "Amazon Web Services, Inc.",
      certifiedPrograms: ["EU_US_DPF", "UK_EXTENSION_DPF", "SWISS_US_DPF"],
      certificationStatus: "ACTIVE",
      annualRecertificationDueDate: "2027-04-15T00:00:00Z", // ~218 days
      coversHRData: true,
      coversNonHRData: true,
      designatedIRM: "BBB_NATIONAL_PROGRAMS",
      subjectToFTC: true,
      onwardTransferAgreementSigned: true,
    };

    const audit = PrivacyShieldTransferAuditor.auditDPFRegistration(record, referenceDate);
    expect(audit.isCompliant).toBe(true);
    expect(audit.riskLevel).toBe("LOW_RISK");
    expect(audit.daysUntilRecertification).toBeGreaterThan(30);
    expect(audit.complianceFlags).toHaveLength(0);
    expect(audit.auditDigest).toHaveLength(64);
  });

  it("flags attention required when recertification is within 30 days or onward agreement unsigned", () => {
    const record: DPFRegistrationRecord = {
      organizationId: "ORG-002-DATADOG",
      organizationName: "Datadog Inc.",
      certifiedPrograms: ["EU_US_DPF"],
      certificationStatus: "ACTIVE",
      annualRecertificationDueDate: "2026-09-25T00:00:00Z", // 16 days
      coversHRData: false,
      coversNonHRData: true,
      designatedIRM: "ICDR_AAA",
      subjectToFTC: true,
      onwardTransferAgreementSigned: false, // Unsigned
    };

    const audit = PrivacyShieldTransferAuditor.auditDPFRegistration(record, referenceDate);
    expect(audit.isCompliant).toBe(true);
    expect(audit.riskLevel).toBe("ATTENTION_REQUIRED");
    expect(audit.complianceFlags.some((f) => f.includes("closes in"))).toBe(true);
    expect(audit.complianceFlags.some((f) => f.includes("onward transfer"))).toBe(true);
  });

  it("marks lapsed or non-FTC entities as high risk suspended requiring SCC fallback", () => {
    const record: DPFRegistrationRecord = {
      organizationId: "ORG-003-BANK",
      organizationName: "Unregulated Third-Party Corp",
      certifiedPrograms: ["EU_US_DPF"],
      certificationStatus: "LAPSED",
      annualRecertificationDueDate: "2026-08-01T00:00:00Z", // -39 days
      coversHRData: false,
      coversNonHRData: true,
      designatedIRM: "EU_DPA_PANEL",
      subjectToFTC: false, // Not FTC
      onwardTransferAgreementSigned: false,
    };

    const audit = PrivacyShieldTransferAuditor.auditDPFRegistration(record, referenceDate);
    expect(audit.isCompliant).toBe(false);
    expect(audit.riskLevel).toBe("HIGH_RISK_SUSPENDED");
    expect(audit.requiredRemediations.some((r) => r.includes("Standard Contractual Clauses"))).toBe(true);
  });

  it("correctly aggregates batch audit metrics across multiple vendors", () => {
    const records: DPFRegistrationRecord[] = [
      {
        organizationId: "ORG-A",
        organizationName: "A Corp",
        certifiedPrograms: ["EU_US_DPF"],
        certificationStatus: "ACTIVE",
        annualRecertificationDueDate: "2027-01-01T00:00:00Z",
        coversHRData: true,
        coversNonHRData: true,
        designatedIRM: "BBB_NATIONAL_PROGRAMS",
        subjectToFTC: true,
        onwardTransferAgreementSigned: true,
      },
      {
        organizationId: "ORG-B",
        organizationName: "B Corp",
        certifiedPrograms: ["EU_US_DPF"],
        certificationStatus: "LAPSED",
        annualRecertificationDueDate: "2026-01-01T00:00:00Z",
        coversHRData: false,
        coversNonHRData: true,
        designatedIRM: "ICDR_AAA",
        subjectToFTC: true,
        onwardTransferAgreementSigned: false,
      },
    ];

    const batch = PrivacyShieldTransferAuditor.batchAuditDPFRegistrations(records, referenceDate);
    expect(batch.totalRecords).toBe(2);
    expect(batch.compliantCount).toBe(1);
    expect(batch.atRiskCount).toBe(1);
  });
});
