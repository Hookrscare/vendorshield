/**
 * src/lib/iso-27001-annex-a-matrix.ts
 * QA-173: Enterprise ISO/IEC 27001:2022 Annex A Control Mapping & Gap Assessment Matrix.
 * 
 * Part of VendorShield B2B Enterprise Compliance & Trust Hub.
 * Implements automated mapping across the 93 controls of ISO/IEC 27001:2022 four revised themes:
 * - Clause 5: Organizational Controls (37 controls)
 * - Clause 6: People Controls (8 controls)
 * - Clause 7: Physical Controls (14 controls)
 * - Clause 8: Technological Controls (34 controls)
 * 
 * Generates automated Statement of Applicability (SoA), evaluates vendor compliance gaps,
 * and synthesizes cryptographic audit tokens for Lead Auditor verification.
 */

import { createHash } from "crypto";

export type AnnexATheme = "ORGANIZATIONAL" | "PEOPLE" | "PHYSICAL" | "TECHNOLOGICAL";

export type ControlImplementationStatus = 
  | "IMPLEMENTED"
  | "IN_PROGRESS"
  | "PLANNED"
  | "EXCLUDED_JUSTIFIED"
  | "NOT_IMPLEMENTED";

export interface AnnexAControl {
  controlId: string; // e.g. "A.5.19", "A.8.8", "A.8.28"
  title: string;
  theme: AnnexATheme;
  status: ControlImplementationStatus;
  evidenceRef?: string;
  justificationForExclusion?: string;
  lastAssessedIsoDate: string;
}

export interface VendorIsoGapAssessmentRequest {
  vendorId: string;
  vendorName: string;
  hasValidIso27001Certificate: boolean;
  certExpirationDate?: string;
  controls: AnnexAControl[];
}

export interface IsoThemeScore {
  theme: AnnexATheme;
  totalControls: number;
  implementedCount: number;
  excludedCount: number;
  gapCount: number;
  conformancePercent: number;
}

export interface Iso27001AssessmentReport {
  vendorId: string;
  vendorName: string;
  overallScorePercent: number; // 0 - 100
  certificationReadiness: "AUDIT_READY" | "ACCEPTABLE_RESIDUAL_RISK" | "CRITICAL_GAPS_CERTIFICATION_BLOCKED";
  themeBreakdown: Record<AnnexATheme, IsoThemeScore>;
  criticalGaps: string[];
  statementOfApplicabilitySummary: {
    totalApplicable: number;
    totalImplemented: number;
    totalJustifiedExclusions: number;
  };
  auditorVerificationTokenSha256: string;
}

export class Iso27001AnnexAMatrix {
  public static evaluateVendor(request: VendorIsoGapAssessmentRequest): Iso27001AssessmentReport {
    if (!request.vendorId || !request.vendorName) {
      throw new Error("Vendor ID and Name are required.");
    }
    if (!request.controls || request.controls.length === 0) {
      throw new Error("Assessment must contain at least one Annex A control.");
    }

    const themes: AnnexATheme[] = ["ORGANIZATIONAL", "PEOPLE", "PHYSICAL", "TECHNOLOGICAL"];
    const themeScores: Record<AnnexATheme, IsoThemeScore> = {
      ORGANIZATIONAL: { theme: "ORGANIZATIONAL", totalControls: 0, implementedCount: 0, excludedCount: 0, gapCount: 0, conformancePercent: 0 },
      PEOPLE: { theme: "PEOPLE", totalControls: 0, implementedCount: 0, excludedCount: 0, gapCount: 0, conformancePercent: 0 },
      PHYSICAL: { theme: "PHYSICAL", totalControls: 0, implementedCount: 0, excludedCount: 0, gapCount: 0, conformancePercent: 0 },
      TECHNOLOGICAL: { theme: "TECHNOLOGICAL", totalControls: 0, implementedCount: 0, excludedCount: 0, gapCount: 0, conformancePercent: 0 }
    };

    const criticalGaps: string[] = [];
    let totalImplemented = 0;
    let totalExcluded = 0;

    for (const ctrl of request.controls) {
      const bucket = themeScores[ctrl.theme];
      if (!bucket) continue;

      bucket.totalControls++;

      if (ctrl.status === "IMPLEMENTED") {
        bucket.implementedCount++;
        totalImplemented++;
      } else if (ctrl.status === "EXCLUDED_JUSTIFIED") {
        if (!ctrl.justificationForExclusion || ctrl.justificationForExclusion.trim().length === 0) {
          throw new Error(`Control ${ctrl.controlId} is marked EXCLUDED_JUSTIFIED but lacks a justification.`);
        }
        bucket.excludedCount++;
        totalExcluded++;
      } else {
        bucket.gapCount++;
        criticalGaps.push(`${ctrl.controlId} (${ctrl.title}): Status is ${ctrl.status}`);
      }
    }

    // Compute theme percentages
    for (const t of themes) {
      const b = themeScores[t];
      const applicable = b.totalControls - b.excludedCount;
      b.conformancePercent = applicable > 0 ? Math.round((b.implementedCount / applicable) * 1000) / 10 : 100.0;
    }

    const totalControlsCount = request.controls.length;
    const applicableTotal = totalControlsCount - totalExcluded;
    const overallScore = applicableTotal > 0 ? Math.round((totalImplemented / applicableTotal) * 1000) / 10 : 100.0;

    let readiness: Iso27001AssessmentReport["certificationReadiness"];
    if (overallScore >= 90.0 && (!criticalGaps.some(g => g.includes("A.8.28") || g.includes("A.5.19")))) {
      readiness = "AUDIT_READY";
    } else if (overallScore >= 75.0) {
      readiness = "ACCEPTABLE_RESIDUAL_RISK";
    } else {
      readiness = "CRITICAL_GAPS_CERTIFICATION_BLOCKED";
    }

    const payload = JSON.stringify({
      vendorId: request.vendorId,
      score: overallScore,
      readiness,
      totalImplemented,
      totalExcluded,
      gapsCount: criticalGaps.length
    });
    const token = createHash("sha256").update(payload).digest("hex");

    return {
      vendorId: request.vendorId,
      vendorName: request.vendorName,
      overallScorePercent: overallScore,
      certificationReadiness: readiness,
      themeBreakdown: themeScores,
      criticalGaps,
      statementOfApplicabilitySummary: {
        totalApplicable: applicableTotal,
        totalImplemented,
        totalJustifiedExclusions: totalExcluded
      },
      auditorVerificationTokenSha256: token
    };
  }
}
