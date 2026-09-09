/**
 * SNAP-32: Drone Orthophoto Building Facade Window Caulking Deterioration Scanner.
 * Part of SnapInspect AI Tactical Field Inspection CAD & Mobile AI.
 *
 * Implements ASTM C1193 Standard Guide for Use of Joint Sealants inspection rules.
 * Scans drone high-resolution facade orthomosaics along window perimeter fenestrations
 * and expansion joints to detect sealant failure modes, water ingress vulnerability,
 * and linear footage needing immediate remediation.
 */

export type SealantFailureMode =
  | "ADHESIVE_DETACHMENT"  // Loss of bond between sealant and substrate
  | "COHESIVE_TEAR"        // Internal rupture/splitting of the sealant body
  | "UV_CRAZING"           // Superficial micro-fracturing from solar exposure
  | "REVERSION_SOFTENING"  // Chemical reversion/loss of recovery elasticity
  | "NOMINAL_HEALTHY";

export interface FacadeJointSegment {
  jointId: string;
  floorLevel: number;
  facadeOrientation: "NORTH" | "SOUTH" | "EAST" | "WEST";
  lengthLinearFeet: number;
  detectedFailureMode: SealantFailureMode;
  crackWidthMm: number;
  adhesionLossPercent: number; // 0 - 100%
  uvExposureYears: number;
}

export interface FacadeCaulkingAuditReport {
  totalLinearFeetScanned: number;
  totalDefectiveFeet: number;
  defectivePercentage: number;
  deteriorationIndex: number; // 0 (pristine) - 100 (complete failure)
  waterIngressRiskLevel: "LOW" | "MODERATE" | "CRITICAL_LEAK_RISK";
  breakdownByFailureMode: Record<SealantFailureMode, number>; // linear feet per mode
  remediationUrgencySummary: string;
}

export class FacadeCaulkingScanner {
  public static scanJointSegments(segments: FacadeJointSegment[]): FacadeCaulkingAuditReport {
    if (!segments || segments.length === 0) {
      throw new Error("No facade joint segments provided for caulking scan.");
    }

    let totalFeet = 0;
    let defectiveFeet = 0;
    let weightedDeterioration = 0;

    const breakdown: Record<SealantFailureMode, number> = {
      "ADHESIVE_DETACHMENT": 0,
      "COHESIVE_TEAR": 0,
      "UV_CRAZING": 0,
      "REVERSION_SOFTENING": 0,
      "NOMINAL_HEALTHY": 0
    };

    for (const seg of segments) {
      totalFeet += seg.lengthLinearFeet;
      breakdown[seg.detectedFailureMode] = (breakdown[seg.detectedFailureMode] || 0) + seg.lengthLinearFeet;

      let severityMultiplier = 0.0;
      switch (seg.detectedFailureMode) {
        case "COHESIVE_TEAR":
          severityMultiplier = 1.0;
          defectiveFeet += seg.lengthLinearFeet;
          break;
        case "ADHESIVE_DETACHMENT":
          severityMultiplier = 0.9;
          defectiveFeet += seg.lengthLinearFeet;
          break;
        case "REVERSION_SOFTENING":
          severityMultiplier = 0.7;
          defectiveFeet += seg.lengthLinearFeet;
          break;
        case "UV_CRAZING":
          severityMultiplier = 0.3;
          if (seg.crackWidthMm > 1.5) {
            defectiveFeet += seg.lengthLinearFeet;
          }
          break;
        case "NOMINAL_HEALTHY":
        default:
          severityMultiplier = 0.0;
          break;
      }

      weightedDeterioration += seg.lengthLinearFeet * severityMultiplier;
    }

    const defectivePercentage = totalFeet > 0 ? (defectiveFeet / totalFeet) * 100 : 0;
    const deteriorationIndex = totalFeet > 0 ? Math.round((weightedDeterioration / totalFeet) * 100) : 0;

    let riskLevel: "LOW" | "MODERATE" | "CRITICAL_LEAK_RISK";
    let summary: string;

    if (deteriorationIndex >= 50 || defectivePercentage >= 40) {
      riskLevel = "CRITICAL_LEAK_RISK";
      summary = `Urgent facade recaulking required: ${Math.round(defectiveFeet)} linear feet defective (${Math.round(defectivePercentage)}% of envelope). High risk of wind-driven rain penetration.`;
    } else if (deteriorationIndex >= 20 || defectivePercentage >= 15) {
      riskLevel = "MODERATE";
      summary = `Localized caulking replacement recommended: ${Math.round(defectiveFeet)} linear feet failing. Monitor during wet weather.`;
    } else {
      riskLevel = "LOW";
      summary = `Envelope caulking in sound condition. Minor cosmetic crazing observed on ${Math.round(breakdown["UV_CRAZING"])} linear feet.`;
    }

    return {
      totalLinearFeetScanned: Math.round(totalFeet),
      totalDefectiveFeet: Math.round(defectiveFeet),
      defectivePercentage: Math.round(defectivePercentage * 10) / 10,
      deteriorationIndex,
      waterIngressRiskLevel: riskLevel,
      breakdownByFailureMode: breakdown,
      remediationUrgencySummary: summary
    };
  }
}
