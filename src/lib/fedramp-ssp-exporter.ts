/**
 * QA-134: Real-Time FedRAMP Continuous Monitoring System Security Plan (SSP) Exporter.
 * Part of VendorShield B2B SOC 2 & GDPR Sub-Processor Trust Hub.
 * Transforms sub-processor telemetry, vulnerability records, and security controls into
 * standardized FedRAMP (NIST SP 800-53 Rev 5) System Security Plan Control Implementation
 * Summaries (CIS), Plan of Action & Milestones (POA&M), and ConMon monthly packages.
 */

import { createHmac } from "crypto";

export type FedRAMPImpactLevel = "LOW" | "MODERATE" | "HIGH";

export interface FedRAMPControlSummary {
  controlId: string; // e.g. "AC-2", "AU-6", "SC-8", "SI-4"
  family: string;
  title: string;
  implementationStatus: "IMPLEMENTED" | "PLANNED" | "PARTIALLY_IMPLEMENTED" | "NOT_APPLICABLE";
  responsibleRole: string;
  parameterValue?: string;
  summaryDescription: string;
}

export interface POAMItem {
  poamId: string;
  weaknessName: string;
  sourceOfWeakness: "SOC2_DEFICIENCY" | "VULNERABILITY_SCAN" | "PEN_TEST" | "CONMON_AUDIT";
  nistControl: string;
  riskRating: "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
  scheduledCompletionDateIso: string;
  mitigationStrategy: string;
  daysRemaining: number;
}

export interface VendorSubProcessorTelemetry {
  vendorId: string;
  vendorName: string;
  fedRAMPAuthorized: boolean;
  fedRAMPId?: string;
  soc2Type2Active: boolean;
  tlsVersion: string;
  mfaEnforced: boolean;
  auditLogRetentionDays: number;
  openCvesCount: number;
  highSeverityCvesCount: number;
}

export interface FedRAMPConMonReport {
  systemName: string;
  impactLevel: FedRAMPImpactLevel;
  conmonReportingPeriod: string; // e.g. "2026-09"
  overallStatus: "COMPLIANT" | "ACTION_REQUIRED" | "NON_COMPLIANT";
  evaluatedSubProcessorsCount: number;
  fedRampAuthorizedSubProcessorsCount: number;
  nistControls: FedRAMPControlSummary[];
  activePoamCount: number;
  poamItems: POAMItem[];
  conmonPackageHashSha256: string;
  generatedAtIso: string;
}

export class FedRAMPConMonSSPExporter {
  private readonly secretKey: string;

  constructor(secretKey: string = "fedramp-default-secret-2026") {
    this.secretKey = secretKey;
  }

  public evaluateSubProcessorControls(
    vendors: VendorSubProcessorTelemetry[],
    targetImpactLevel: FedRAMPImpactLevel
  ): FedRAMPControlSummary[] {
    const allMfa = vendors.every((v) => v.mfaEnforced);
    const minRetention = Math.min(...vendors.map((v) => v.auditLogRetentionDays), 90);
    const modernTls = vendors.every((v) => ["TLS_1_2", "TLS_1_3"].includes(v.tlsVersion.replace(".", "_")));
    const noHighCves = vendors.every((v) => v.highSeverityCvesCount === 0);

    return [
      {
        controlId: "AC-2",
        family: "Access Control",
        title: "Account Management & Least Privilege",
        implementationStatus: allMfa ? "IMPLEMENTED" : "PARTIALLY_IMPLEMENTED",
        responsibleRole: "Enterprise Security Ops",
        parameterValue: "Role-Based Access Control + Mandatory IdP MFA",
        summaryDescription: allMfa
          ? "All sub-processors enforce SSO/MFA and strict credential lifecycle management."
          : "Remediation underway for non-MFA sub-processor accounts."
      },
      {
        controlId: "AU-6",
        family: "Audit and Accountability",
        title: "Audit Record Review, Analysis, and Reporting",
        implementationStatus: minRetention >= (targetImpactLevel === "HIGH" ? 365 : 90) ? "IMPLEMENTED" : "PARTIALLY_IMPLEMENTED",
        responsibleRole: "Compliance & SecOps",
        parameterValue: `${minRetention} Days Immutable SIEM Forwarding`,
        summaryDescription: `Immutable audit logs forwarded to cold storage with minimum ${minRetention} days retention.`
      },
      {
        controlId: "SC-8",
        family: "System and Communications Protection",
        title: "Transmission Confidentiality and Integrity",
        implementationStatus: modernTls ? "IMPLEMENTED" : "PARTIALLY_IMPLEMENTED",
        responsibleRole: "Infrastructure Engineering",
        parameterValue: "TLS 1.2+ mandatory cipher suites",
        summaryDescription: "Sub-processor REST and gRPC transit strictly secured via enforced TLS."
      },
      {
        controlId: "SI-4",
        family: "System and Information Integrity",
        title: "Information System Monitoring & Vulnerability Response",
        implementationStatus: noHighCves ? "IMPLEMENTED" : "PARTIALLY_IMPLEMENTED",
        responsibleRole: "Vulnerability Management",
        summaryDescription: noHighCves
          ? "Continuous automated scanning confirmed zero active critical/high CVEs across vendors."
          : "Identified active CVEs triaged and cataloged in POA&M with 30-day SLA."
      }
    ];
  }

  public generateConMonPackage(
    systemName: string,
    period: string,
    impactLevel: FedRAMPImpactLevel,
    vendors: VendorSubProcessorTelemetry[],
    openPoamItems: POAMItem[] = []
  ): FedRAMPConMonReport {
    const controls = this.evaluateSubProcessorControls(vendors, impactLevel);
    const partiallyImplemented = controls.filter((c) => c.implementationStatus !== "IMPLEMENTED");
    const criticalPoams = openPoamItems.filter((p) => ["HIGH", "CRITICAL"].includes(p.riskRating));

    let overallStatus: "COMPLIANT" | "ACTION_REQUIRED" | "NON_COMPLIANT";
    if (criticalPoams.length > 0) {
      overallStatus = "NON_COMPLIANT";
    } else if (partiallyImplemented.length > 0 || openPoamItems.length > 0) {
      overallStatus = "ACTION_REQUIRED";
    } else {
      overallStatus = "COMPLIANT";
    }

    const fedRampAuthorizedCount = vendors.filter((v) => v.fedRAMPAuthorized).length;

    const payloadToSign = `${systemName}:${period}:${impactLevel}:${overallStatus}:${controls.length}:${openPoamItems.length}`;
    const hash = createHmac("sha256", this.secretKey).update(payloadToSign).digest("hex");

    return {
      systemName,
      impactLevel,
      conmonReportingPeriod: period,
      overallStatus,
      evaluatedSubProcessorsCount: vendors.length,
      fedRampAuthorizedSubProcessorsCount: fedRampAuthorizedCount,
      nistControls: controls,
      activePoamCount: openPoamItems.length,
      poamItems: openPoamItems,
      conmonPackageHashSha256: hash,
      generatedAtIso: new Date().toISOString()
    };
  }
}
