/**
 * QA-117: Automated Vendor Risk Re-Assessment Scheduling Engine
 * Part of VendorShield B2B Enterprise Compliance & Vendor Risk Platform.
 *
 * Implements an event-driven re-assessment trigger pipeline evaluating external
 * threat intelligence, CVE alerts, and certification lapses to compute expedited
 * emergency re-assessment deadlines (satisfying SOC 2 CC9.2 and GDPR Article 28).
 */

import { createHmac, createHash } from "crypto";

export type TriggerEventType =
  | "CVE_CRITICAL_DISCLOSED"
  | "SUBPROCESSOR_DATA_BREACH"
  | "SOC2_ATTESTATION_LAPSED"
  | "SLA_BREACH_AVAILABILITY"
  | "OWNERSHIP_CHANGE_MNA";

export interface RiskTriggerEvent {
  eventId: string;
  vendorId: string;
  eventType: TriggerEventType;
  severity: "CRITICAL" | "HIGH" | "MEDIUM";
  details: string;
  detectedAtIso: string;
}

export interface ExpeditedReassessmentWorkflow {
  workflowId: string;
  vendorId: string;
  urgencyLevel: "EMERGENCY_72HR" | "EXPEDITED_14DAY" | "STANDARD_30DAY";
  daysUntilDeadline: number;
  deadlineIso: string;
  requiredQuestionnaires: ("SIG_CORE" | "CAIQ_LITE" | "VSA_STANDARD")[];
  escalationRequired: boolean;
  tamperProofAuditDigest: string;
}

export class DynamicTriggerVendorReassessmentPipeline {
  private hmacSecret: string;

  constructor(hmacSecret: string = "vendorshield_trigger_reassessment_secret") {
    this.hmacSecret = hmacSecret;
  }

  public evaluateTriggers(
    vendorId: string,
    triggers: RiskTriggerEvent[],
    baseDate: Date = new Date()
  ): ExpeditedReassessmentWorkflow {
    if (!vendorId || !vendorId.trim()) {
      throw new Error("vendorId cannot be empty.");
    }
    if (!triggers || triggers.length === 0) {
      throw new Error("triggers list cannot be empty.");
    }

    let hasCritical = false;
    let hasHigh = false;

    for (const t of triggers) {
      if (t.severity === "CRITICAL") hasCritical = true;
      if (t.severity === "HIGH") hasHigh = true;
    }

    let urgencyLevel: "EMERGENCY_72HR" | "EXPEDITED_14DAY" | "STANDARD_30DAY";
    let daysUntilDeadline: number;
    let questionnaires: ("SIG_CORE" | "CAIQ_LITE" | "VSA_STANDARD")[];
    let escalationRequired = false;

    if (hasCritical) {
      urgencyLevel = "EMERGENCY_72HR";
      daysUntilDeadline = 3;
      questionnaires = ["SIG_CORE", "VSA_STANDARD"];
      escalationRequired = true;
    } else if (hasHigh) {
      urgencyLevel = "EXPEDITED_14DAY";
      daysUntilDeadline = 14;
      questionnaires = ["CAIQ_LITE", "VSA_STANDARD"];
      escalationRequired = false;
    } else {
      urgencyLevel = "STANDARD_30DAY";
      daysUntilDeadline = 30;
      questionnaires = ["CAIQ_LITE"];
      escalationRequired = false;
    }

    const deadline = new Date(baseDate.getTime() + daysUntilDeadline * 86400000);
    const deadlineIso = deadline.toISOString();

    const digest = createHmac("sha256", this.hmacSecret)
      .update(`${vendorId}:${urgencyLevel}:${deadlineIso}:${triggers.length}`)
      .digest("hex");

    const workflowId = `wf_reassess_${createHash("sha256").update(digest).digest("hex").slice(0, 16)}`;

    return {
      workflowId,
      vendorId,
      urgencyLevel,
      daysUntilDeadline,
      deadlineIso,
      requiredQuestionnaires: questionnaires,
      escalationRequired,
      tamperProofAuditDigest: digest
    };
  }
}
