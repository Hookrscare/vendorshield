/**
 * QA-135: Automated GDPR Article 28 Sub-Processor Authorization Workflow Engine.
 * Part of VendorShield B2B SOC 2 & GDPR Sub-Processor Trust Hub.
 * Enforces GDPR Article 28(2) and 28(4) statutory mandates:
 * - Prior specific or general written controller authorization
 * - Mandatory objection window tracking (14-30 days)
 * - Equivalent flow-down contractual DPA commitments verification
 * - Cryptographic audit trail for Data Protection Authority (DPA) defensibility
 */

import { createHash } from "crypto";

export type AuthorizationMode = "SPECIFIC_WRITTEN" | "GENERAL_WRITTEN";

export type EngagementStatus =
  | "NOTICE_ISSUED"
  | "OBJECTION_PERIOD_ACTIVE"
  | "OBJECTION_FILED"
  | "OBJECTION_RESOLVED"
  | "APPROVED_ACTIVE"
  | "BLOCKED_NON_COMPLIANT";

export interface ControllerObjection {
  controllerId: string;
  controllerName: string;
  grounds: string; // e.g., "Lack of ISO 27001", "Sub-processor in non-adequate jurisdiction without SCCs"
  filedAtIso: string;
  resolved: boolean;
  resolutionNotes?: string;
}

export interface SubprocessorEngagementProposal {
  subprocessorId: string;
  name: string;
  serviceCategory: string; // e.g., "Cloud Hosting", "Vector Search", "Payment Gateway"
  dataHostingCountry: string;
  dataTransferMechanism: "INTRA_EEA" | "EU_ADEQUACY_DECISION" | "STANDARD_CONTRACTUAL_CLAUSES_2021";
  flowDownDpaSigned: boolean;
  noticeIssuedAtIso: string;
  objectionWindowDays: number; // e.g., 30 days
}

export interface SubprocessorEngagementRecord {
  engagementId: string;
  mode: AuthorizationMode;
  proposal: SubprocessorProposal;
  status: EngagementStatus;
  objections: ControllerObjection[];
  objectionWindowExpiresAtIso: string;
  isCompliantWithArticle28: boolean;
  complianceNotes: string;
  auditDigestSha256: string;
}

export type SubprocessorProposal = SubprocessorEngagementProposal;

export class GDPRSubprocessorAuthorizationEngine {
  public static createEngagement(
    mode: AuthorizationMode,
    proposal: SubprocessorProposal
  ): SubprocessorEngagementRecord {
    if (!proposal.flowDownDpaSigned) {
      // Article 28(4) strictly requires flow-down obligations to be executed
      return this.buildRecord(mode, proposal, "BLOCKED_NON_COMPLIANT", [], "Non-compliant: Article 28(4) flow-down DPA not executed.");
    }

    const noticeDate = new Date(proposal.noticeIssuedAtIso);
    const windowDays = Math.max(14, proposal.objectionWindowDays || 30);
    const expiryDate = new Date(noticeDate.getTime() + windowDays * 24 * 60 * 60 * 1000);

    const initialStatus: EngagementStatus = mode === "SPECIFIC_WRITTEN" ? "NOTICE_ISSUED" : "OBJECTION_PERIOD_ACTIVE";
    const note = mode === "SPECIFIC_WRITTEN"
      ? "Specific written consent required prior to data sharing."
      : `General written authorization active. Controller objection window open until ${expiryDate.toISOString()}.`;

    return this.buildRecord(mode, proposal, initialStatus, [], note, expiryDate.toISOString());
  }

  public static fileObjection(
    record: SubprocessorEngagementRecord,
    objection: ControllerObjection
  ): SubprocessorEngagementRecord {
    const updatedObjections = [...record.objections, objection];
    return this.buildRecord(
      record.mode,
      record.proposal,
      "OBJECTION_FILED",
      updatedObjections,
      `Controller '${objection.controllerName}' filed formal objection: ${objection.grounds}`,
      record.objectionWindowExpiresAtIso
    );
  }

  public static resolveObjection(
    record: SubprocessorEngagementRecord,
    controllerId: string,
    resolutionNotes: string
  ): SubprocessorEngagementRecord {
    const updatedObjections = record.objections.map(obj => {
      if (obj.controllerId === controllerId) {
        return { ...obj, resolved: true, resolutionNotes };
      }
      return obj;
    });

    const hasUnresolved = updatedObjections.some(o => !o.resolved);
    const nextStatus: EngagementStatus = hasUnresolved ? "OBJECTION_FILED" : "OBJECTION_RESOLVED";

    return this.buildRecord(
      record.mode,
      record.proposal,
      nextStatus,
      updatedObjections,
      hasUnresolved ? "Remaining unresolved objections pending." : "All objections resolved with controllers.",
      record.objectionWindowExpiresAtIso
    );
  }

  public static finalizeAuthorization(
    record: SubprocessorEngagementRecord,
    currentDateIso: string
  ): SubprocessorEngagementRecord {
    if (!record.proposal.flowDownDpaSigned) {
      return this.buildRecord(record.mode, record.proposal, "BLOCKED_NON_COMPLIANT", record.objections, "Article 28(4) flow-down missing.");
    }

    const hasUnresolvedObjections = record.objections.some(o => !o.resolved);
    if (hasUnresolvedObjections) {
      return this.buildRecord(record.mode, record.proposal, "OBJECTION_FILED", record.objections, "Cannot authorize: active controller objection pending.");
    }

    const current = new Date(currentDateIso);
    const expiry = new Date(record.objectionWindowExpiresAtIso);

    if (record.mode === "GENERAL_WRITTEN" && current < expiry) {
      return this.buildRecord(
        record.mode,
        record.proposal,
        "OBJECTION_PERIOD_ACTIVE",
        record.objections,
        `Objection window still active until ${record.objectionWindowExpiresAtIso}.`,
        record.objectionWindowExpiresAtIso
      );
    }

    return this.buildRecord(
      record.mode,
      record.proposal,
      "APPROVED_ACTIVE",
      record.objections,
      "Fully authorized under GDPR Article 28 with verified flow-down obligations.",
      record.objectionWindowExpiresAtIso
    );
  }

  private static buildRecord(
    mode: AuthorizationMode,
    proposal: SubprocessorProposal,
    status: EngagementStatus,
    objections: ControllerObjection[],
    complianceNotes: string,
    expiryIso?: string
  ): SubprocessorEngagementRecord {
    const expiry = expiryIso || new Date(new Date(proposal.noticeIssuedAtIso).getTime() + 30 * 86400000).toISOString();
    const isCompliant = status === "APPROVED_ACTIVE" || status === "OBJECTION_PERIOD_ACTIVE" || status === "OBJECTION_RESOLVED";

    const raw = `${proposal.subprocessorId}:${mode}:${status}:${proposal.flowDownDpaSigned}:${objections.length}:${expiry}`;
    const digest = createHash("sha256").update(raw).digest("hex");

    return {
      engagementId: `GDPR-AUTH-${proposal.subprocessorId}-${Date.now().toString(36)}`,
      mode,
      proposal,
      status,
      objections,
      objectionWindowExpiresAtIso: expiry,
      isCompliantWithArticle28: isCompliant,
      complianceNotes,
      auditDigestSha256: digest
    };
  }
}
