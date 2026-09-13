/**
 * vendor-soc2-trust-matrix.ts
 * QA-183: Automated Vendor SOC 2 Trust Services Criteria Coverage Matrix Generator.
 * Part of VendorShield B2B SOC 2 & GDPR Sub-Processor Trust Hub.
 *
 * Enterprise SOC 2 Type II compliance audit analyzer:
 * 1. Evaluates coverage across the 5 AICPA Trust Services Criteria (Security, Availability, Confidentiality, Processing Integrity, Privacy).
 * 2. Tallies auditor exceptions and qualified opinion notes.
 * 3. Extracts Complementary User Entity Controls (CUECs) requiring client enforcement.
 * 4. Computes composite Trust Posture Index (0 - 100) and certification standing.
 */

export type TrustCategory = 'SECURITY' | 'AVAILABILITY' | 'CONFIDENTIALITY' | 'PROCESSING_INTEGRITY' | 'PRIVACY';

export interface Soc2AuditControl {
  controlId: string;
  category: TrustCategory;
  description: string;
  testedWithoutException: boolean;
  exceptionDetails?: string;
}

export interface VendorSoc2AuditSubmission {
  vendorId: string;
  vendorName: string;
  auditPeriodEnd: string;          // ISO Date YYYY-MM-DD
  auditingFirm: string;            // e.g. "PwC", "EY", "A-LIGN"
  inScopeCategories: TrustCategory[];
  controls: Soc2AuditControl[];
  complementaryUserEntityControls: string[]; // CUECs
}

export interface Soc2TrustMatrixReport {
  vendorId: string;
  vendorName: string;
  trustPostureScore: number;       // 0 - 100
  categoryCoverage: Record<TrustCategory, { inScope: boolean; controlCount: number; exceptionCount: number }>;
  totalAuditedControls: number;
  totalExceptions: number;
  unresolvedCuecsCount: number;
  certificationStatus: 'CERTIFIED_EXEMPLARY' | 'CERTIFIED_WITH_EXCEPTIONS' | 'INSUFFICIENT_COVERAGE';
  auditRecommendation: string;
}

export class VendorSoc2TrustMatrix {
  private static readonly ALL_CATEGORIES: TrustCategory[] = [
    'SECURITY',
    'AVAILABILITY',
    'CONFIDENTIALITY',
    'PROCESSING_INTEGRITY',
    'PRIVACY'
  ];

  public static generateMatrix(submission: VendorSoc2AuditSubmission): Soc2TrustMatrixReport {
    const coverage: Soc2TrustMatrixReport['categoryCoverage'] = {
      SECURITY: { inScope: false, controlCount: 0, exceptionCount: 0 },
      AVAILABILITY: { inScope: false, controlCount: 0, exceptionCount: 0 },
      CONFIDENTIALITY: { inScope: false, controlCount: 0, exceptionCount: 0 },
      PROCESSING_INTEGRITY: { inScope: false, controlCount: 0, exceptionCount: 0 },
      PRIVACY: { inScope: false, controlCount: 0, exceptionCount: 0 }
    };

    for (const cat of submission.inScopeCategories) {
      coverage[cat].inScope = true;
    }

    let totalExceptions = 0;
    for (const ctrl of submission.controls) {
      coverage[ctrl.category].controlCount++;
      if (!ctrl.testedWithoutException) {
        coverage[ctrl.category].exceptionCount++;
        totalExceptions++;
      }
    }

    // Base score from category breadth (Mandatory Security = 40 pts, other 4 categories = 15 pts each)
    let score = 0;
    if (coverage.SECURITY.inScope) score += 40;
    if (coverage.AVAILABILITY.inScope) score += 15;
    if (coverage.CONFIDENTIALITY.inScope) score += 15;
    if (coverage.PROCESSING_INTEGRITY.inScope) score += 15;
    if (coverage.PRIVACY.inScope) score += 15;

    // Penalty for exceptions: -10 pts per auditor exception
    score -= totalExceptions * 10;
    score = Math.max(0, Math.min(100, score));

    let status: Soc2TrustMatrixReport['certificationStatus'] = 'CERTIFIED_EXEMPLARY';
    let recommendation = 'Vendor demonstrates comprehensive SOC 2 Type II controls without exceptions.';

    if (!coverage.SECURITY.inScope || score < 50) {
      status = 'INSUFFICIENT_COVERAGE';
      recommendation = 'CRITICAL: Security criteria omitted or score below acceptable enterprise baseline. High third-party risk.';
    } else if (totalExceptions > 0) {
      status = 'CERTIFIED_WITH_EXCEPTIONS';
      recommendation = `Vendor certified with ${totalExceptions} control exception(s). Obtain formal management remediation response.`;
    }

    return {
      vendorId: submission.vendorId,
      vendorName: submission.vendorName,
      trustPostureScore: score,
      categoryCoverage: coverage,
      totalAuditedControls: submission.controls.length,
      totalExceptions,
      unresolvedCuecsCount: submission.complementaryUserEntityControls.length,
      certificationStatus: status,
      auditRecommendation: recommendation
    };
  }
}
