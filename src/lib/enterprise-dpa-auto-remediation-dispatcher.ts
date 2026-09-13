/**
 * QA-160: Enterprise DPA Auto-Remediation & Real-Time Legal Injunction Dispatcher
 * 
 * Detects vendor Data Processing Agreement (DPA) violations, triggers contractual
 * fallback clauses (GDPR Art. 28, EU-SCC Modules 2/3), and auto-dispatches legal injunctions.
 */

import { createHash } from 'crypto';

export type DpaViolationType =
  | 'UNAUTHORIZED_FOURTH_PARTY'
  | 'CROSS_BORDER_ADEQUACY_BREACH'
  | 'SECURITY_SLA_DOWNGRADE'
  | 'UNAUTHORIZED_DATA_RETENTION';

export type RemediationStage = 'CURE_DEMAND' | 'FALLBACK_SCC' | 'INJUNCTION_DISPATCH';

export interface DpaViolationReport {
  vendorId: string;
  vendorName: string;
  contractId: string;
  violationType: DpaViolationType;
  jurisdiction: 'EU' | 'US' | 'UK' | 'GLOBAL';
  detectedAtIso: string;
  details: string;
}

export interface RemediationAction {
  actionId: string;
  vendorId: string;
  contractId: string;
  stage: RemediationStage;
  effectiveClause: string;
  requiresDataQuarantine: boolean;
  injunctionPayload?: {
    legalNoticeText: string;
    cryptographicAttestationSha256: string;
    dispatchedToLegalContact: string;
  };
}

export class EnterpriseDpaAutoRemediationDispatcher {
  /**
   * Evaluates violation report and generates deterministic legal remediation instructions.
   */
  public remediateViolation(
    report: DpaViolationReport,
    contactEmail: string = 'legal@vendor.internal'
  ): RemediationAction {
    const actionId = `REM-${createHash('sha256').update(report.vendorId + report.violationType + report.detectedAtIso).digest('hex').substring(0, 12).toUpperCase()}`;

    let stage: RemediationStage = 'CURE_DEMAND';
    let effectiveClause = 'GDPR Art. 28(3)(h) Audit and Inspection Cure Right';
    let requiresDataQuarantine = false;

    if (report.violationType === 'CROSS_BORDER_ADEQUACY_BREACH') {
      stage = 'FALLBACK_SCC';
      effectiveClause = 'EU Standard Contractual Clauses (SCC) Module 2 Controller-to-Processor Clause 14';
      requiresDataQuarantine = true;
    } else if (report.violationType === 'UNAUTHORIZED_DATA_RETENTION') {
      stage = 'INJUNCTION_DISPATCH';
      effectiveClause = 'Emergency Data Deletion and Destruction Injunction (CCPA 1798.105 / GDPR Art. 17)';
      requiresDataQuarantine = true;
    } else if (report.violationType === 'UNAUTHORIZED_FOURTH_PARTY') {
      stage = 'CURE_DEMAND';
      effectiveClause = 'GDPR Art. 28(2) Prior Specific or General Written Authorization Notice';
      requiresDataQuarantine = false;
    } else {
      stage = 'CURE_DEMAND';
      effectiveClause = 'SOC 2 CC6.8 Baseline Security Controls Remediation';
    }

    let injunctionPayload;
    if (stage === 'INJUNCTION_DISPATCH' || stage === 'FALLBACK_SCC') {
      const noticeText = `FORMAL NOTICE OF REMEDIATION AND CEASE: Under contract ${report.contractId}, vendor ${report.vendorName} is found in ${report.violationType}. Fallback clause ${effectiveClause} is immediately enforced.`;
      const attestation = createHash('sha256').update(actionId + noticeText).digest('hex');
      injunctionPayload = {
        legalNoticeText: noticeText,
        cryptographicAttestationSha256: attestation,
        dispatchedToLegalContact: contactEmail,
      };
    }

    return {
      actionId,
      vendorId: report.vendorId,
      contractId: report.contractId,
      stage,
      effectiveClause,
      requiresDataQuarantine,
      injunctionPayload,
    };
  }
}
