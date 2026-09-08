/**
 * QA-128: Automated Vendor DPA Contract Expiration & Auto-Renewal Alert Engine.
 * Part of VendorShield B2B SOC 2 & GDPR Sub-Processor Trust Hub.
 * Monitors vendor DPAs, calculates notice period deadlines for auto-renewals,
 * categorizes renewal urgency, and dispatches legal/compliance notifications.
 */

import { createHash } from "crypto";

export type VendorRiskTier = "TIER_1_CRITICAL" | "TIER_2_HIGH" | "TIER_3_MODERATE" | "TIER_4_LOW";

export type DpaAlertSeverity = "CRITICAL_EXPIRED" | "URGENT_NOTICE_WINDOW" | "UPCOMING_EXPIRATION" | "COMPLIANT";

export interface VendorContract {
  vendorId: string;
  vendorName: string;
  dpaSignedDate: string; // ISO date YYYY-MM-DD
  expirationDate: string; // ISO date YYYY-MM-DD
  autoRenews: boolean;
  noticePeriodDays: number; // E.g., 30, 60, 90 days prior to expiration
  riskTier: VendorRiskTier;
  legalContactEmail: string;
}

export interface ContractEvaluationResult {
  vendorId: string;
  vendorName: string;
  daysUntilExpiration: number;
  daysUntilNoticeDeadline: number;
  severity: DpaAlertSeverity;
  alertRequired: boolean;
  actionSummary: string;
}

export interface DpaAuditReport {
  evaluatedAt: string;
  totalContracts: number;
  criticalExpiredCount: number;
  urgentNoticeWindowCount: number;
  upcomingCount: number;
  compliantCount: number;
  evaluations: ContractEvaluationResult[];
  auditDigestSha256: string;
}

export class DpaRenewalAlertEngine {
  /**
   * Evaluates a single vendor contract against a reference date.
   */
  public static evaluateContract(
    contract: VendorContract,
    referenceDate: Date = new Date()
  ): ContractEvaluationResult {
    const expDate = new Date(contract.expirationDate);
    const msPerDay = 1000 * 60 * 60 * 24;

    const diffDays = Math.ceil((expDate.getTime() - referenceDate.getTime()) / msPerDay);
    const noticeDeadlineDays = diffDays - (contract.autoRenews ? contract.noticePeriodDays : 0);

    let severity: DpaAlertSeverity = "COMPLIANT";
    let alertRequired = false;
    let actionSummary = "Contract is currently in good standing.";

    if (diffDays < 0) {
      severity = "CRITICAL_EXPIRED";
      alertRequired = true;
      actionSummary = `DPA expired ${Math.abs(diffDays)} days ago. Immediate freeze or extension required.`;
    } else if (contract.autoRenews && noticeDeadlineDays <= 0) {
      severity = "URGENT_NOTICE_WINDOW";
      alertRequired = true;
      actionSummary = `Auto-renewal notice period deadline reached (${Math.abs(noticeDeadlineDays)} days past notice window). Vendor will lock in for renewal.`;
    } else if (contract.autoRenews && noticeDeadlineDays <= 30) {
      severity = "URGENT_NOTICE_WINDOW";
      alertRequired = true;
      actionSummary = `Notice deadline expires in ${noticeDeadlineDays} days before auto-renewal locks in. Legal review needed.`;
    } else if (diffDays <= 60) {
      severity = "UPCOMING_EXPIRATION";
      alertRequired = true;
      actionSummary = `DPA expires in ${diffDays} days. Initiate security reassessment and renewal terms.`;
    }

    return {
      vendorId: contract.vendorId,
      vendorName: contract.vendorName,
      daysUntilExpiration: diffDays,
      daysUntilNoticeDeadline: noticeDeadlineDays,
      severity,
      alertRequired,
      actionSummary
    };
  }

  /**
   * Evaluates an entire fleet of vendor contracts and outputs a signed audit report.
   */
  public static evaluatePortfolio(
    contracts: VendorContract[],
    referenceDate: Date = new Date()
  ): DpaAuditReport {
    const evaluations = contracts.map(c => this.evaluateContract(c, referenceDate));

    let criticalExpired = 0;
    let urgentNotice = 0;
    let upcoming = 0;
    let compliant = 0;

    for (const res of evaluations) {
      if (res.severity === "CRITICAL_EXPIRED") criticalExpired++;
      else if (res.severity === "URGENT_NOTICE_WINDOW") urgentNotice++;
      else if (res.severity === "UPCOMING_EXPIRATION") upcoming++;
      else compliant++;
    }

    const evaluatedAt = referenceDate.toISOString();
    const digestPayload = JSON.stringify({ evaluatedAt, evaluations });
    const auditDigestSha256 = createHash("sha256").update(digestPayload).digest("hex");

    return {
      evaluatedAt,
      totalContracts: contracts.length,
      criticalExpiredCount: criticalExpired,
      urgentNoticeWindowCount: urgentNotice,
      upcomingCount: upcoming,
      compliantCount: compliant,
      evaluations,
      auditDigestSha256
    };
  }
}
