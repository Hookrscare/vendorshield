/**
 * QA-141: Automated B2B Sub-Processor ISO 27701 Privacy Information Management System Auditor.
 * Part of VendorShield B2B SOC 2 & GDPR Sub-Processor Trust Hub.
 *
 * Implements ISO/IEC 27701:2019 PIMS guidance, auditing both Clause 7 (PII Controller)
 * and Clause 8 (PII Processor) controls across all registered third-party vendors and sub-processors.
 */

export interface PimsControlAuditItem {
  id: string; // e.g. "ISO-27701-8.2.1"
  clause: 7 | 8;
  name: string;
  category: "GOVERNANCE" | "CONSENT_PURPOSE" | "PROCESSOR_OBLIGATION" | "BREACH_SLA" | "DATA_DISPOSAL";
  isImplemented: boolean;
  telemetryFreshnessHours?: number;
  evidenceRef?: string;
  notes?: string;
}

export interface PimsVendorAssessment {
  vendorId: string;
  vendorName: string;
  role: "CONTROLLER" | "PROCESSOR" | "JOINT_CONTROLLER";
  controls: PimsControlAuditItem[];
}

export interface PimsAuditReport {
  vendorId: string;
  vendorName: string;
  role: string;
  overallMaturityScore: number; // 0 - 100
  totalControlsChecked: number;
  passedControlsCount: number;
  criticalGaps: string[];
  certificationReadiness: "READY" | "SUBSTANTIAL_CONFORMANCE" | "NON_COMPLIANT";
}

export class Iso27701PimsAuditor {
  public static readonly REQUIRED_PROCESSOR_CONTROLS = [
    "ISO-27701-8.2.1", // Customer Agreement Obligations
    "ISO-27701-8.2.3", // Sub-Processor Engagement Authorization
    "ISO-27701-8.3.1", // Temporary Files & Secure Deletion
    "ISO-27701-8.4.1", // Customer Breach Notification SLA (<= 48h)
    "ISO-27701-8.5.1"  // Data Subject Rights Assistance
  ];

  public static auditVendorPims(assessment: PimsVendorAssessment): PimsAuditReport {
    if (!assessment.vendorId || !assessment.controls || assessment.controls.length === 0) {
      throw new Error("Invalid assessment: vendorId and controls must be populated.");
    }

    const totalControls = assessment.controls.length;
    let passedCount = 0;
    const criticalGaps: string[] = [];

    for (const ctrl of assessment.controls) {
      if (ctrl.isImplemented) {
        // If telemetry is older than 90 days (2160 hours), consider control stale
        if (ctrl.telemetryFreshnessHours && ctrl.telemetryFreshnessHours > 2160) {
          criticalGaps.push(`Control ${ctrl.id} (${ctrl.name}) telemetry is stale (>90 days).`);
        } else {
          passedCount++;
        }
      } else {
        if (this.REQUIRED_PROCESSOR_CONTROLS.includes(ctrl.id)) {
          criticalGaps.push(`Mandatory Clause 8 control missing: ${ctrl.id} - ${ctrl.name}`);
        } else {
          criticalGaps.push(`Missing control: ${ctrl.id} - ${ctrl.name}`);
        }
      }
    }

    const maturityScore = Math.round((passedCount / totalControls) * 100);

    let readiness: "READY" | "SUBSTANTIAL_CONFORMANCE" | "NON_COMPLIANT";
    if (maturityScore >= 90 && criticalGaps.length === 0) {
      readiness = "READY";
    } else if (maturityScore >= 70) {
      readiness = "SUBSTANTIAL_CONFORMANCE";
    } else {
      readiness = "NON_COMPLIANT";
    }

    return {
      vendorId: assessment.vendorId,
      vendorName: assessment.vendorName,
      role: assessment.role,
      overallMaturityScore: maturityScore,
      totalControlsChecked: totalControls,
      passedControlsCount: passedCount,
      criticalGaps,
      certificationReadiness: readiness
    };
  }
}
