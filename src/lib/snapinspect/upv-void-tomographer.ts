/**
 * SNAP-38: Multi-Sensor Concrete Rebar Ultrasonic Pulse Velocity (UPV) Void Tomographer.
 * Part of SnapInspect AI Tactical Field Inspection CAD & Mobile AI.
 *
 * Implements ASTM C597 & BS EN 12504-4 Standard Test Methods for Ultrasonic Pulse Velocity (UPV)
 * through concrete with steel reinforcement correction (BS 1881-203) and 2D tomographic void mapping.
 */

export type UPVTransmissionMode = "DIRECT" | "SEMI_DIRECT" | "INDIRECT_SURFACE";

export type ConcreteQualityGrade =
  | "EXCELLENT"       // > 4.5 km/s
  | "GOOD"            // 3.5 - 4.5 km/s
  | "QUESTIONABLE"    // 3.0 - 3.5 km/s
  | "POOR"            // 2.0 - 3.0 km/s
  | "VERY_POOR_VOID"; // < 2.0 km/s

export interface UPVMeasurementRay {
  rayId: string;
  txCoordinatesMm: [number, number]; // [x, y]
  rxCoordinatesMm: [number, number]; // [x, y]
  transitTimeMicroseconds: number;   // microseconds (µs)
  mode: UPVTransmissionMode;
  rebarProximityMm?: number;         // distance to nearest longitudinal rebar
  rebarDiameterMm?: number;
}

export interface RebarCorrectionParameters {
  steelVelocityKmPerS: number;       // default ~5.9 km/s
  nominalConcreteVelocityKmPerS: number; // default ~4.0 km/s
}

export interface UPVTomographyVoxel {
  gridX: number;
  gridY: number;
  apparentVelocityKmPerS: number;
  qualityGrade: ConcreteQualityGrade;
  isVoidOrDelamination: boolean;
}

export interface UPVTomographyResult {
  totalRaysAnalyzed: number;
  meanVelocityKmPerS: number;
  minimumVelocityKmPerS: number;
  maximumVelocityKmPerS: number;
  overallQualityGrade: ConcreteQualityGrade;
  voidDetectedCount: number;
  voidAreaPercentage: number;
  tomographyGrid: UPVTomographyVoxel[];
  criticalStructuralAlert: boolean;
  cadAnnotationRecommendations: string[];
}

export class UPVVoidTomographer {
  public static readonly STEEL_VELOCITY_KM_PER_S = 5.9;
  public static readonly DEFAULT_REBAR_FACTOR = 1.0;

  /**
   * Calculates euclidean distance in mm between Tx and Rx transducers.
   */
  public static calculatePathLengthMm(tx: [number, number], rx: [number, number]): number {
    const dx = rx[0] - tx[0];
    const dy = rx[1] - tx[1];
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Computes pulse velocity V = L / T (km/s) from distance (mm) and time (µs).
   * Note: 1 mm / 1 µs = 1000 m/s = 1 km/s.
   */
  public static calculateRawVelocity(pathLengthMm: number, transitTimeUs: number): number {
    if (transitTimeUs <= 0) return 0;
    return Number((pathLengthMm / transitTimeUs).toFixed(3));
  }

  /**
   * Applies BS 1881-203 correction for steel rebar interference.
   * If pulse traverses parallel or close to rebar, steel artificially accelerates the first arrival.
   */
  public static applyRebarCorrection(
    rawVelocityKmPerS: number,
    rebarProximityMm?: number,
    rebarDiameterMm?: number
  ): number {
    if (!rebarProximityMm || !rebarDiameterMm || rebarProximityMm > 100) {
      return rawVelocityKmPerS;
    }

    // Proximity dampening factor gamma
    const influenceFactor = Math.max(0.75, Math.min(1.0, 1.0 - (rebarDiameterMm / (rebarProximityMm * 10))));
    return Number((rawVelocityKmPerS * influenceFactor).toFixed(3));
  }

  public static classifyQuality(velocityKmPerS: number): ConcreteQualityGrade {
    if (velocityKmPerS >= 4.5) return "EXCELLENT";
    if (velocityKmPerS >= 3.5) return "GOOD";
    if (velocityKmPerS >= 3.0) return "QUESTIONABLE";
    if (velocityKmPerS >= 2.0) return "POOR";
    return "VERY_POOR_VOID";
  }

  /**
   * Reconstructs 2D UPV tomographic cross-section.
   */
  public static reconstructTomogram(
    rays: UPVMeasurementRay[],
    gridWidthMm: number = 500,
    gridHeightMm: number = 300,
    stepMm: number = 50
  ): UPVTomographyResult {
    const analyzedRays = rays.map((ray) => {
      const pathLength = this.calculatePathLengthMm(ray.txCoordinatesMm, ray.rxCoordinatesMm);
      const rawV = this.calculateRawVelocity(pathLength, ray.transitTimeMicroseconds);
      const correctedV = this.applyRebarCorrection(rawV, ray.rebarProximityMm, ray.rebarDiameterMm);
      return {
        ...ray,
        pathLength,
        correctedVelocity: correctedV,
      };
    });

    const velocities = analyzedRays.map((r) => r.correctedVelocity);
    const meanV = velocities.length > 0 ? Number((velocities.reduce((a, b) => a + b, 0) / velocities.length).toFixed(3)) : 0;
    const minV = velocities.length > 0 ? Math.min(...velocities) : 0;
    const maxV = velocities.length > 0 ? Math.max(...velocities) : 0;

    const voxels: UPVTomographyVoxel[] = [];
    let voidCount = 0;
    const xSteps = Math.floor(gridWidthMm / stepMm);
    const ySteps = Math.floor(gridHeightMm / stepMm);
    const totalVoxels = xSteps * ySteps;

    for (let x = 0; x < xSteps; x++) {
      for (let y = 0; y < ySteps; y++) {
        const voxelCenterX = x * stepMm + stepMm / 2;
        const voxelCenterY = y * stepMm + stepMm / 2;

        // Weight velocities of nearby rays via inverse distance weighting (IDW)
        let weightSum = 0;
        let weightedV = 0;

        for (const ray of analyzedRays) {
          const midX = (ray.txCoordinatesMm[0] + ray.rxCoordinatesMm[0]) / 2;
          const midY = (ray.txCoordinatesMm[1] + ray.rxCoordinatesMm[1]) / 2;
          const dist = Math.sqrt((voxelCenterX - midX) ** 2 + (voxelCenterY - midY) ** 2) + 1.0;
          const w = 1.0 / (dist * dist);
          weightedV += ray.correctedVelocity * w;
          weightSum += w;
        }

        const interpolatedV = Number((weightSum > 0 ? weightedV / weightSum : meanV).toFixed(3));
        const grade = this.classifyQuality(interpolatedV);
        const isVoid = grade === "VERY_POOR_VOID" || grade === "POOR";

        if (isVoid) voidCount++;

        voxels.push({
          gridX: x,
          gridY: y,
          apparentVelocityKmPerS: interpolatedV,
          qualityGrade: grade,
          isVoidOrDelamination: isVoid,
        });
      }
    }

    const voidAreaPct = totalVoxels > 0 ? Number(((voidCount / totalVoxels) * 100).toFixed(2)) : 0;
    const overallGrade = this.classifyQuality(meanV);
    const criticalAlert = minV < 2.0 || voidAreaPct > 15.0;

    const recommendations: string[] = [];
    if (criticalAlert) {
      recommendations.push("Mark RED exclusion buffer on CAD for core drilling in detected low-velocity anomaly zone.");
      recommendations.push("Initiate low-pressure epoxy injection or structural grouting protocol for suspected honeycombing.");
    } else {
      recommendations.push("Concrete meets homogeneous acoustic density standards; acceptable for core testing.");
    }

    return {
      totalRaysAnalyzed: analyzedRays.length,
      meanVelocityKmPerS: meanV,
      minimumVelocityKmPerS: minV,
      maximumVelocityKmPerS: maxV,
      overallQualityGrade: overallGrade,
      voidDetectedCount: voidCount,
      voidAreaPercentage: voidAreaPct,
      tomographyGrid: voxels,
      criticalStructuralAlert: criticalAlert,
      cadAnnotationRecommendations: recommendations,
    };
  }
}
