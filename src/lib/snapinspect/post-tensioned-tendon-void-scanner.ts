/**
 * SNAP-43: Post-Tensioned Concrete Tendon Duct Grouting Void Radar Scanner.
 * Part of SnapInspect AI Tactical Field Inspection Engine.
 *
 * Evaluates Ground Penetrating Radar (GPR) and Impact-Echo (IE) scan data
 * along post-tensioned tendon ducts to detect air voids and water accumulation.
 * Follows PTI / ASBI Post-Tensioning Grouting Guidelines.
 */

export interface DuctScanPoint {
  positionMeters: number;
  relativePermittivity: number; // ~1.0 = air, ~8.0 = sound grout, ~81.0 = water
  reflectionAmplitudeMv: number;
  echoFrequencyKhz: number;
}

export interface VoidSegment {
  startPositionMeters: number;
  endPositionMeters: number;
  lengthMeters: number;
  voidType: "AIR_VOID" | "WATER_FILLED_VOID";
  severityClass: "CLASS_1_NEGLIGIBLE" | "CLASS_2_MODERATE" | "CLASS_3_CRITICAL";
}

export interface TendonVoidAssessment {
  ductId: string;
  totalLengthMeters: number;
  totalVoidLengthMeters: number;
  voidPercentage: number;
  overallCondition: "SATISFACTORY" | "MODERATE_DEFECT" | "CRITICAL_COLLAPSE_RISK";
  voidSegments: VoidSegment[];
  recommendedAction: string;
}

export class PostTensionedTendonVoidScanner {
  /**
   * Scans an array of duct measurement points along its profile.
   */
  public static analyzeDuct(ductId: string, scanPoints: DuctScanPoint[]): TendonVoidAssessment {
    if (scanPoints.length === 0) {
      return {
        ductId,
        totalLengthMeters: 0,
        totalVoidLengthMeters: 0,
        voidPercentage: 0,
        overallCondition: "SATISFACTORY",
        voidSegments: [],
        recommendedAction: "No scan points provided"
      };
    }

    const sorted = [...scanPoints].sort((a, b) => a.positionMeters - b.positionMeters);
    const totalLength = sorted[sorted.length - 1].positionMeters - sorted[0].positionMeters;

    const voidSegments: VoidSegment[] = [];
    let currentVoidStart: number | null = null;
    let currentVoidType: "AIR_VOID" | "WATER_FILLED_VOID" = "AIR_VOID";

    for (let i = 0; i < sorted.length; i++) {
      const pt = sorted[i];
      const isAirVoid = pt.relativePermittivity < 3.0 && Math.abs(pt.reflectionAmplitudeMv) > 50;
      const isWaterVoid = pt.relativePermittivity > 40.0;

      if (isAirVoid || isWaterVoid) {
        if (currentVoidStart === null) {
          currentVoidStart = pt.positionMeters;
          currentVoidType = isWaterVoid ? "WATER_FILLED_VOID" : "AIR_VOID";
        }
      } else {
        if (currentVoidStart !== null) {
          const segLength = pt.positionMeters - currentVoidStart;
          if (segLength > 0.1) {
            voidSegments.push({
              startPositionMeters: Math.round(currentVoidStart * 100) / 100,
              endPositionMeters: Math.round(pt.positionMeters * 100) / 100,
              lengthMeters: Math.round(segLength * 100) / 100,
              voidType: currentVoidType,
              severityClass: segLength > 1.0 ? "CLASS_3_CRITICAL" : (segLength > 0.4 ? "CLASS_2_MODERATE" : "CLASS_1_NEGLIGIBLE")
            });
          }
          currentVoidStart = null;
        }
      }
    }

    if (currentVoidStart !== null) {
      const endPos = sorted[sorted.length - 1].positionMeters;
      const segLength = endPos - currentVoidStart;
      if (segLength > 0.1) {
        voidSegments.push({
          startPositionMeters: Math.round(currentVoidStart * 100) / 100,
          endPositionMeters: Math.round(endPos * 100) / 100,
          lengthMeters: Math.round(segLength * 100) / 100,
          voidType: currentVoidType,
          severityClass: segLength > 1.0 ? "CLASS_3_CRITICAL" : (segLength > 0.4 ? "CLASS_2_MODERATE" : "CLASS_1_NEGLIGIBLE")
        });
      }
    }

    const totalVoidLength = voidSegments.reduce((sum, s) => sum + s.lengthMeters, 0);
    const voidPercentage = totalLength > 0 ? (totalVoidLength / totalLength) * 100 : 0;

    let overallCondition: "SATISFACTORY" | "MODERATE_DEFECT" | "CRITICAL_COLLAPSE_RISK" = "SATISFACTORY";
    let recommendedAction = "Duct exhibits satisfactory continuous grout encasement. Regular inspection cycle.";

    if (voidPercentage > 20.0 || voidSegments.some((s) => s.severityClass === "CLASS_3_CRITICAL" || s.voidType === "WATER_FILLED_VOID")) {
      overallCondition = "CRITICAL_COLLAPSE_RISK";
      recommendedAction = "IMMEDIATE REMEDIATION: Critical void / water detected. Initiate vacuum grouting injection to halt tendon corrosion.";
    } else if (voidPercentage > 5.0 || voidSegments.length > 0) {
      overallCondition = "MODERATE_DEFECT";
      recommendedAction = "Monitor void progression; schedule endoscopic borescopic inspection during next maintenance window.";
    }

    return {
      ductId,
      totalLengthMeters: Math.round(totalLength * 100) / 100,
      totalVoidLengthMeters: Math.round(totalVoidLength * 100) / 100,
      voidPercentage: Math.round(voidPercentage * 10) / 10,
      overallCondition,
      voidSegments,
      recommendedAction
    };
  }
}
