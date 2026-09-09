/**
 * QA-135: Automated GDPR Article 28 Sub-Processor Authorization Workflow Engine.
 * Part of VendorShield B2B SOC 2 & GDPR Sub-Processor Trust Hub.
 * Enforces GDPR Article 28(2) & 28(4) statutory sub-processor authorization workflows:
 * - Manages Specific vs Prior General Written Authorization agreements.
 * - Enforces statutory Controller Objection Notification windows (e.g., 30-day prior notice).
 * - Tracks objections, mitigations, and controller approval states.
 * - Audits mandatory Article 28(3) contractual flow-down obligations (data security, confidentiality, audits).
 * - Produces tamper-evident SHA-256 Article 28 compliance certificates.
 */

import { createHash } from "crypto";

export type AuthorizationModel = "SPECIFIC_WRITTEN_AUTH" | "GENERAL_WRITTEN_AUTH";

export type EngagementStatus =
  | "PENDING_NOTICE_WINDOW"
  | "AUTHORIZED_ACTIVE"
  | "OBJECTION_RAISED"
  | "REJECTED"
  | "DECOMMISSIONED";

export interface Article28FlowDownObligations {
  equivalentDataProtectionGuarantees: boolean;
  confidentialityCommitment: boolean;
  technicalOrganizationalMeasuresArt32: boolean;
  subSubProcessorRestriction: boolean;
  auditAndInspectionAssistance: boolean;
  deletionOrReturnAtTermination: boolean;
}

export interface ControllerObjection {
  objectionId: string;
  raisedAtIso: string;
  raisedByEmail: string;
  grounds: string;
  status: "OPEN" | "RESOLVED_WITH_MITIGATION" | "UPHELD_ENGAGEMENT_ABORTED";
  mitigationNotes?: string;
  resolvedAtIso?: string;
}

export interface Article28Engagement {
  engagementId: string;
  tenantId: string;
  controllerName: string;
  processorName: string;
  subProcessorName: string;
  subProcessorJurisdiction: string;
  processingActivityScope: string;
  authorizationModel: AuthorizationModel;
  noticeIssuedAtIso: string;
  objectionWindowDays: number;
  objectionDeadlineIso: string;
  flowDownObligations: Article28FlowDownObligations;
  status: EngagementStatus;
  objections: ControllerObjection[];
  auditDigestSha256?: string;
}

export interface Article28ComplianceCertificate {
  certificateId: string;
  engagementId: string;
  tenantId: string;
  subProcessorName: string;
  status: EngagementStatus;
  authorizationModel: AuthorizationModel;
  flowDownFullyCompliant: boolean;
  activeObjectionsCount: number;
  issuedAtIso: string;
  certificateHashSha256: string;
}

export class GdprArticle28WorkflowEngine {
  public static computeHash(content: string): string {
    return createHash("sha256").update(content).digest("hex");
  }

  public static initiateEngagement(params: {
    engagementId: string;
    tenantId: string;
    controllerName: string;
    processorName: string;
    subProcessorName: string;
    subProcessorJurisdiction: string;
    processingActivityScope: string;
    authorizationModel?: AuthorizationModel;
    objectionWindowDays?: number;
    noticeIssuedAtIso?: string;
    flowDownObligations: Article28FlowDownObligations;
  }): Article28Engagement {
    const noticeIssuedAt = params.noticeIssuedAtIso || new Date().toISOString();
    const windowDays = params.objectionWindowDays ?? 30;
    const deadlineDate = new Date(new Date(noticeIssuedAt).getTime() + windowDays * 86400000);

    const model = params.authorizationModel || "GENERAL_WRITTEN_AUTH";

    const engagement: Article28Engagement = {
      engagementId: params.engagementId,
      tenantId: params.tenantId,
      controllerName: params.controllerName,
      processorName: params.processorName,
      subProcessorName: params.subProcessorName,
      subProcessorJurisdiction: params.subProcessorJurisdiction,
      processingActivityScope: params.processingActivityScope,
      authorizationModel: model,
      noticeIssuedAtIso: noticeIssuedAt,
      objectionWindowDays: windowDays,
      objectionDeadlineIso: deadlineDate.toISOString(),
      flowDownObligations: params.flowDownObligations,
      status: "PENDING_NOTICE_WINDOW",
      objections: [],
    };

    engagement.auditDigestSha256 = this.computeEngagementDigest(engagement);
    return engagement;
  }

  public static isFlowDownCompliant(obligations: Article28FlowDownObligations): boolean {
    return (
      obligations.equivalentDataProtectionGuarantees &&
      obligations.confidentialityCommitment &&
      obligations.technicalOrganizationalMeasuresArt32 &&
      obligations.subSubProcessorRestriction &&
      obligations.auditAndInspectionAssistance &&
      obligations.deletionOrReturnAtTermination
    );
  }

  public static registerObjection(
    engagement: Article28Engagement,
    objection: {
      objectionId: string;
      raisedByEmail: string;
      grounds: string;
      raisedAtIso?: string;
    }
  ): Article28Engagement {
    const updated = { ...engagement };
    const newObjection: ControllerObjection = {
      objectionId: objection.objectionId,
      raisedAtIso: objection.raisedAtIso || new Date().toISOString(),
      raisedByEmail: objection.raisedByEmail,
      grounds: objection.grounds,
      status: "OPEN",
    };

    updated.objections = [...updated.objections, newObjection];
    updated.status = "OBJECTION_RAISED";
    updated.auditDigestSha256 = this.computeEngagementDigest(updated);
    return updated;
  }

  public static resolveObjection(
    engagement: Article28Engagement,
    objectionId: string,
    mitigationNotes: string,
    upheldAndAborted: boolean = false
  ): Article28Engagement {
    const updated = { ...engagement };
    updated.objections = updated.objections.map((obj) => {
      if (obj.objectionId === objectionId) {
        return {
          ...obj,
          status: upheldAndAborted ? "UPHELD_ENGAGEMENT_ABORTED" : "RESOLVED_WITH_MITIGATION",
          mitigationNotes,
          resolvedAtIso: new Date().toISOString(),
        };
      }
      return obj;
    });

    const hasOpenObjections = updated.objections.some((o) => o.status === "OPEN");
    const hasAborted = updated.objections.some((o) => o.status === "UPHELD_ENGAGEMENT_ABORTED");

    if (hasAborted) {
      updated.status = "REJECTED";
    } else if (hasOpenObjections) {
      updated.status = "OBJECTION_RAISED";
    } else {
      updated.status = "PENDING_NOTICE_WINDOW";
    }

    updated.auditDigestSha256 = this.computeEngagementDigest(updated);
    return updated;
  }

  public static finalizeAuthorization(
    engagement: Article28Engagement,
    currentIsoTime: string
  ): Article28Engagement {
    const updated = { ...engagement };

    if (!this.isFlowDownCompliant(updated.flowDownObligations)) {
      throw new Error("Cannot authorize sub-processor: Article 28(4) flow-down obligations not fully satisfied.");
    }

    const hasOpenObjections = updated.objections.some((o) => o.status === "OPEN");
    if (hasOpenObjections) {
      throw new Error("Cannot authorize sub-processor: Unresolved controller objections remain pending.");
    }

    const hasAborted = updated.objections.some((o) => o.status === "UPHELD_ENGAGEMENT_ABORTED");
    if (hasAborted) {
      throw new Error("Cannot authorize sub-processor: Controller objection was upheld; engagement was aborted.");
    }

    const isPastDeadline = new Date(currentIsoTime) >= new Date(updated.objectionDeadlineIso);

    if (updated.authorizationModel === "GENERAL_WRITTEN_AUTH" && !isPastDeadline) {
      throw new Error("Cannot finalize general authorization prior to objection window expiration.");
    }

    updated.status = "AUTHORIZED_ACTIVE";
    updated.auditDigestSha256 = this.computeEngagementDigest(updated);
    return updated;
  }

  public static generateCertificate(
    engagement: Article28Engagement,
    issuedAtIso?: string
  ): Article28ComplianceCertificate {
    const issuedAt = issuedAtIso || new Date().toISOString();
    const flowDownOk = this.isFlowDownCompliant(engagement.flowDownObligations);
    const activeObjections = engagement.objections.filter((o) => o.status === "OPEN").length;

    const certId = `CERT-GDPR28-${createHash("sha256")
      .update(`${engagement.engagementId}:${issuedAt}`)
      .digest("hex")
      .substring(0, 12)
      .toUpperCase()}`;

    const rawPayload = `${certId}:${engagement.engagementId}:${engagement.tenantId}:${engagement.status}:${flowDownOk}:${activeObjections}:${issuedAt}`;
    const certHash = this.computeHash(rawPayload);

    return {
      certificateId: certId,
      engagementId: engagement.engagementId,
      tenantId: engagement.tenantId,
      subProcessorName: engagement.subProcessorName,
      status: engagement.status,
      authorizationModel: engagement.authorizationModel,
      flowDownFullyCompliant: flowDownOk,
      activeObjectionsCount: activeObjections,
      issuedAtIso: issuedAt,
      certificateHashSha256: certHash,
    };
  }

  private static computeEngagementDigest(eng: Article28Engagement): string {
    const raw = `${eng.engagementId}:${eng.tenantId}:${eng.subProcessorName}:${eng.status}:${eng.objections.length}:${eng.noticeIssuedAtIso}:${eng.objectionDeadlineIso}`;
    return this.computeHash(raw);
  }
}
