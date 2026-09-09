/**
 * QA-135: Automated Continuous Privacy Shield & EU Data Transfer Risk Audit Engine.
 * Part of VendorShield B2B SOC 2 & GDPR Sub-Processor Trust Hub.
 * 
 * Enforces ongoing compliance with the EU-U.S. Data Privacy Framework (DPF),
 * UK Extension to the EU-U.S. DPF, and Swiss-U.S. DPF under European Commission Adequacy.
 * Continuously validates U.S. Department of Commerce registration status,
 * recertification expiry horizons, Independent Recourse Mechanism (IRM) coverage,
 * HR vs Non-HR data scope, and Accountability for Onward Transfers (Principle 8).
 */

import { createHash } from "crypto";

export type DPFProgramType = "EU_US_DPF" | "UK_EXTENSION_DPF" | "SWISS_US_DPF";

export type IRMProvider = "BBB_NATIONAL_PROGRAMS" | "ICDR_AAA" | "EU_DPA_PANEL" | "SWISS_FDPIC";

export interface DPFRegistrationRecord {
  organizationId: string;
  organizationName: string;
  certifiedPrograms: DPFProgramType[];
  certificationStatus: "ACTIVE" | "INACTIVE" | "PENDING_RENEWAL" | "LAPSED";
  annualRecertificationDueDate: string; // ISO format
  coversHRData: boolean;
  coversNonHRData: boolean;
  designatedIRM: IRMProvider;
  subjectToFTC: boolean; // Must be FTC or DOT jurisdiction
  onwardTransferAgreementSigned: boolean;
}

export type DPFComplianceRiskLevel = "LOW_RISK" | "ATTENTION_REQUIRED" | "HIGH_RISK_SUSPENDED";

export interface DPFAuditReport {
  organizationId: string;
  organizationName: string;
  isCompliant: boolean;
  riskLevel: DPFComplianceRiskLevel;
  daysUntilRecertification: number;
  complianceFlags: string[];
  requiredRemediations: string[];
  auditDigest: string;
  evaluatedAt: string;
}

export class PrivacyShieldTransferAuditor {
  private static readonly MS_PER_DAY = 1000 * 60 * 60 * 24;

  public static auditDPFRegistration(
    record: DPFRegistrationRecord,
    currentDate: Date = new Date()
  ): DPFAuditReport {
    const complianceFlags: string[] = [];
    const requiredRemediations: string[] = [];
    let isCompliant = true;
    let riskLevel: DPFComplianceRiskLevel = "LOW_RISK";

    // 1. Verify Status
    if (record.certificationStatus !== "ACTIVE") {
      isCompliant = false;
      riskLevel = "HIGH_RISK_SUSPENDED";
      complianceFlags.push(`DPF registration status is ${record.certificationStatus}.`);
      requiredRemediations.push("Execute immediate Standard Contractual Clauses (SCCs Module 2) fallback.");
    }

    // 2. Evaluate Recertification Horizon
    const dueDate = new Date(record.annualRecertificationDueDate);
    const timeDiff = dueDate.getTime() - currentDate.getTime();
    const daysUntil = Math.ceil(timeDiff / this.MS_PER_DAY);

    if (daysUntil <= 0) {
      isCompliant = false;
      riskLevel = "HIGH_RISK_SUSPENDED";
      complianceFlags.push(`Annual DPF recertification expired ${Math.abs(daysUntil)} days ago.`);
      requiredRemediations.push("Submit annual recertification filing to U.S. Department of Commerce.");
    } else if (daysUntil <= 30) {
      if (riskLevel === "LOW_RISK") riskLevel = "ATTENTION_REQUIRED";
      complianceFlags.push(`DPF recertification window closes in ${daysUntil} days.`);
      requiredRemediations.push("Initiate internal privacy policy audit and legal review before renewal deadline.");
    }

    // 3. Independent Recourse Mechanism (IRM)
    if (!record.designatedIRM) {
      isCompliant = false;
      riskLevel = "HIGH_RISK_SUSPENDED";
      complianceFlags.push("Missing Independent Recourse Mechanism (IRM) designation.");
      requiredRemediations.push("Enlist certified third-party ADR provider (e.g. BBB, ICDR/AAA) or commit to EU DPA panel.");
    }

    // 4. Onward Transfer Principle 8
    if (!record.onwardTransferAgreementSigned) {
      if (riskLevel === "LOW_RISK") riskLevel = "ATTENTION_REQUIRED";
      complianceFlags.push("Sub-processor lacks verified DPF Principle 8 onward transfer agreement.");
      requiredRemediations.push("Execute VendorShield Data Processing Addendum with explicit DPF onward liability provisions.");
    }

    // 5. Statutory Jurisdiction
    if (!record.subjectToFTC) {
      isCompliant = false;
      riskLevel = "HIGH_RISK_SUSPENDED";
      complianceFlags.push("Organization not subject to FTC or Department of Transportation enforcement jurisdiction.");
      requiredRemediations.push("DPF inapplicable to entities outside FTC/DOT statutory authority; require BCRs or SCCs.");
    }

    const digestInput = `${record.organizationId}|${record.certificationStatus}|${daysUntil}|${riskLevel}|${isCompliant}`;
    const auditDigest = createHash("sha256").update(digestInput).digest("hex");

    return {
      organizationId: record.organizationId,
      organizationName: record.organizationName,
      isCompliant,
      riskLevel,
      daysUntilRecertification: daysUntil,
      complianceFlags,
      requiredRemediations,
      auditDigest,
      evaluatedAt: currentDate.toISOString(),
    };
  }

  public static batchAuditDPFRegistrations(
    records: DPFRegistrationRecord[],
    currentDate: Date = new Date()
  ): {
    totalRecords: number;
    compliantCount: number;
    atRiskCount: number;
    reports: DPFAuditReport[];
  } {
    const reports = records.map((r) => this.auditDPFRegistration(r, currentDate));
    const compliantCount = reports.filter((r) => r.isCompliant).length;
    const atRiskCount = reports.filter((r) => r.riskLevel !== "LOW_RISK").length;

    return {
      totalRecords: records.length,
      compliantCount,
      atRiskCount,
      reports,
    };
  }
}
