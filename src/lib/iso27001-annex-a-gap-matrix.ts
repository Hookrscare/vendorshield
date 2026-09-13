/**
 * QA-173: Enterprise ISO 27001:2022 Annex A Control Mapping & Gap Assessment Matrix.
 * Part of VendorShield B2B SOC 2 & GDPR Sub-Processor Trust Hub.
 * 
 * Maps vendor controls across the 4 modernized ISO 27001:2022 Annex A themes:
 * 1. Clause 5: Organizational Controls (37 controls)
 * 2. Clause 6: People Controls (8 controls)
 * 3. Clause 7: Physical Controls (14 controls)
 * 4. Clause 8: Technological Controls (34 controls, total 93 controls)
 * 
 * Computes implementation coverage, flags critical gaps (e.g. 8.28 secure coding, 8.16 monitoring),
 * and issues cryptographic gap assessment attestation certificates.
 */

import { createHash } from "crypto";

export type IsoTheme = "ORGANIZATIONAL" | "PEOPLE" | "PHYSICAL" | "TECHNOLOGICAL";

export interface IsoControlAssessment {
  controlId: string; // e.g. "A.5.15", "A.8.28"
  theme: IsoTheme;
  title: string;
  isImplemented: boolean;
  compensatingControlDescription?: string;
  isMandatoryForTier1: boolean;
}

export interface IsoAssessmentReport {
  vendorId: string;
  vendorName: string;
  totalControlsEvaluated: number;
  implementedCount: number;
  gapCount: number;
  readinessPercentage: number;
  criticalTier1Gaps: string[];
  certificationReadiness: "CERTIFICATION_READY" | "REMEDIATION_REQUIRED_FOR_TIER1" | "SUBSTANTIAL_GAPS";
  assessmentDigest: string;
}

export class Iso27001AnnexAGapMatrix {
  public static evaluateVendorControls(
    vendorId: string,
    vendorName: string,
    assessments: IsoControlAssessment[]
  ): IsoAssessmentReport {
    if (!assessments || assessments.length === 0) {
      throw new Error("Must provide at least one control assessment.");
    }

    let implementedCount = 0;
    const criticalGaps: string[] = [];

    for (const c of assessments) {
      if (c.isImplemented || (c.compensatingControlDescription && c.compensatingControlDescription.trim().length > 10)) {
        implementedCount++;
      } else {
        if (c.isMandatoryForTier1) {
          criticalGaps.push(`${c.controlId}: ${c.title}`);
        }
      }
    }

    const total = assessments.length;
    const gapCount = total - implementedCount;
    const readinessPercentage = Math.round((implementedCount / total) * 1000) / 10;

    let readiness: "CERTIFICATION_READY" | "REMEDIATION_REQUIRED_FOR_TIER1" | "SUBSTANTIAL_GAPS";
    if (criticalGaps.length === 0 && readinessPercentage >= 90.0) {
      readiness = "CERTIFICATION_READY";
    } else if (criticalGaps.length > 0) {
      readiness = "REMEDIATION_REQUIRED_FOR_TIER1";
    } else {
      readiness = "SUBSTANTIAL_GAPS";
    }

    const raw = `${vendorId}:${readinessPercentage}:${criticalGaps.length}:${readiness}`;
    const digest = createHash("sha256").update(raw).digest("hex");

    return {
      vendorId,
      vendorName,
      totalControlsEvaluated: total,
      implementedCount,
      gapCount,
      readinessPercentage,
      criticalTier1Gaps: criticalGaps,
      certificationReadiness: readiness,
      assessmentDigest: digest
    };
  }
}
