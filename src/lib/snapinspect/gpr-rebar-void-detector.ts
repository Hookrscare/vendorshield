/**
 * SNAP-33: Automated Ground Penetrating Radar (GPR) Concrete Rebar Void Detector.
 * Part of SnapInspect AI Tactical Field Inspection CAD & Mobile AI.
 *
 * Implements ASTM D6432 Standard Guide for Using GPR for Subsurface Investigation.
 * Analyzes concrete B-scan profiles to detect rebar grids, cover depth, subsurface air voids,
 * and safe core drilling exclusion zones.
 */

export interface GprHyperbolaVertex {
  id: string;
  horizontalPositionCm: number;
  twoWayTravelTimeNs: number; // nanoseconds
  amplitude: number;          // normalized -1.0 to +1.0
  phasePolarity: "POSITIVE_DIELECTRIC" | "NEGATIVE_AIR_VOID" | "METALLIC_REFLECTION";
}

export interface GprScanParameters {
  relativePermittivity: number; // typically 6.0 - 9.0 for cured concrete
  speedOfLightMPerNs?: number;  // ~0.30 m/ns in vacuum
}

export interface RebarVoidAnalysisResult {
  totalReflectionsDetected: number;
  estimatedRebarCount: number;
  averageRebarCoverDepthCm: number;
  detectedVoidsCount: number;
  safeCoreDrillingZones: {
    startPositionCm: number;
    endPositionCm: number;
    clearanceMarginCm: number;
  }[];
  criticalCollisionWarning: boolean;
}

export class GprRebarVoidDetector {
  public static readonly DEFAULT_PERMITTIVITY = 7.0;
  public static readonly C_VACUUM_CM_PER_NS = 30.0; // 30 cm/ns

  /**
   * Calculates propagation velocity v = c / sqrt(er) in cm/ns.
   */
  public static calculateVelocity(er: number = this.DEFAULT_PERMITTIVITY): number {
    return this.C_VACUUM_CM_PER_NS / Math.sqrt(er);
  }

  /**
   * Converts two-way travel time (ns) to depth (cm): depth = (v * t) / 2
   */
  public static travelTimeToDepthCm(timeNs: number, er: number = this.DEFAULT_PERMITTIVITY): number {
    const v = this.calculateVelocity(er);
    return (v * timeNs) / 2.0;
  }

  public static analyzeProfile(
    vertices: GprHyperbolaVertex[],
    slabWidthCm: number,
    er: number = this.DEFAULT_PERMITTIVITY,
    minDrillClearanceCm: number = 8.0
  ): RebarVoidAnalysisResult {
    let rebarCount = 0;
    let totalCoverDepth = 0;
    let voidCount = 0;
    const rebarPositions: number[] = [];

    for (const v of vertices) {
      const depth = this.travelTimeToDepthCm(v.twoWayTravelTimeNs, er);

      if (v.phasePolarity === "METALLIC_REFLECTION" || (v.amplitude > 0.6 && v.phasePolarity !== "NEGATIVE_AIR_VOID")) {
        rebarCount++;
        totalCoverDepth += depth;
        rebarPositions.push(v.horizontalPositionCm);
      } else if (v.phasePolarity === "NEGATIVE_AIR_VOID" || v.amplitude < -0.4) {
        voidCount++;
        // Air voids also must be avoided for anchor drilling
        rebarPositions.push(v.horizontalPositionCm);
      }
    }

    const avgDepth = rebarCount > 0 ? Math.round((totalCoverDepth / rebarCount) * 10) / 10 : 0;
    rebarPositions.sort((a, b) => a - b);

    // Compute safe drilling windows between rebar/voids
    const safeZones: { startPositionCm: number; endPositionCm: number; clearanceMarginCm: number }[] = [];
    let currentStart = 0;

    for (const pos of rebarPositions) {
      const safeEnd = pos - minDrillClearanceCm;
      if (safeEnd - currentStart >= minDrillClearanceCm * 2) {
        safeZones.push({
          startPositionCm: Math.round(currentStart),
          endPositionCm: Math.round(safeEnd),
          clearanceMarginCm: Math.round(safeEnd - currentStart)
        });
      }
      currentStart = pos + minDrillClearanceCm;
    }

    if (slabWidthCm - currentStart >= minDrillClearanceCm * 2) {
      safeZones.push({
        startPositionCm: Math.round(currentStart),
        endPositionCm: Math.round(slabWidthCm),
        clearanceMarginCm: Math.round(slabWidthCm - currentStart)
      });
    }

    return {
      totalReflectionsDetected: vertices.length,
      estimatedRebarCount: rebarCount,
      averageRebarCoverDepthCm: avgDepth,
      detectedVoidsCount: voidCount,
      safeCoreDrillingZones: safeZones,
      criticalCollisionWarning: safeZones.length === 0 && vertices.length > 0
    };
  }
}
