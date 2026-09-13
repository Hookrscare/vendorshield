/**
 * SNAP-51: LiDAR Point Cloud Concrete Spalling Volume & Rebar Exposure Estimator
 * 
 * Analyzes dense 3D point cloud scans of structural concrete elements to calculate
 * spall defect cavity depth, surface area, volumetric loss, and exposed rebar severity (ACI 562).
 */

export interface Point3D {
  x: number; // in mm
  y: number; // in mm
  z: number; // depth/elevation in mm
  intensity?: number; // LiDAR return reflectivity [0 - 255]
}

export type SpallUrgencyRating = 'COSMETIC' | 'MODERATE_STRUCTURAL' | 'CRITICAL_EMERGENCY';

export interface SpallAnalysisResult {
  totalPointsScanned: number;
  spalledPointsCount: number;
  maxSpallDepthMm: number;
  meanSpallDepthMm: number;
  estimatedSurfaceAreaCm2: number;
  estimatedVolumeLossCm3: number;
  rebarExposedFlag: boolean;
  exposedRebarLengthMm: number;
  urgencyRating: SpallUrgencyRating;
  repairRecommended: string;
}

export class LidarConcreteSpallingEstimator {
  private readonly depressionThresholdMm: number;
  private readonly pointSpacingGridMm: number;

  constructor(depressionThresholdMm: number = 15.0, pointSpacingGridMm: number = 10.0) {
    this.depressionThresholdMm = depressionThresholdMm;
    this.pointSpacingGridMm = pointSpacingGridMm;
  }

  /**
   * Evaluates point cloud against a nominal plane depth (z_ref)
   */
  public estimateSpallDamage(
    points: Point3D[],
    zRefMm: number = 0.0,
    rebarDepthMm: number = 35.0
  ): SpallAnalysisResult {
    if (points.length === 0) {
      throw new Error('Point cloud cannot be empty.');
    }

    const spalledPoints: { point: Point3D; depth: number }[] = [];
    let maxDepth = 0.0;
    let sumDepth = 0.0;
    let rebarPointsCount = 0;

    for (const p of points) {
      const depth = p.z - zRefMm; // positive indicates cavity inward from face
      if (depth >= this.depressionThresholdMm) {
        spalledPoints.push({ point: p, depth });
        sumDepth += depth;
        if (depth > maxDepth) {
          maxDepth = depth;
        }

        // Rebar exposed check: depth reaches or exceeds cover depth
        // and optionally high metallic LiDAR return intensity (> 200)
        if (depth >= rebarDepthMm) {
          rebarPointsCount++;
        }
      }
    }

    if (spalledPoints.length === 0) {
      return {
        totalPointsScanned: points.length,
        spalledPointsCount: 0,
        maxSpallDepthMm: 0.0,
        meanSpallDepthMm: 0.0,
        estimatedSurfaceAreaCm2: 0.0,
        estimatedVolumeLossCm3: 0.0,
        rebarExposedFlag: false,
        exposedRebarLengthMm: 0.0,
        urgencyRating: 'COSMETIC',
        repairRecommended: 'No action required. Surface within nominal tolerance.',
      };
    }

    const meanDepth = sumDepth / spalledPoints.length;
    // Each grid point represents (pointSpacingGridMm)^2 of area
    const unitAreaMm2 = Math.pow(this.pointSpacingGridMm, 2);
    const surfaceAreaMm2 = spalledPoints.length * unitAreaMm2;
    const surfaceAreaCm2 = surfaceAreaMm2 / 100.0;

    // Volume = Area * Mean Depth
    const volumeMm3 = surfaceAreaMm2 * meanDepth;
    const volumeLossCm3 = volumeMm3 / 1000.0;

    const rebarExposed = rebarPointsCount > 0;
    const exposedRebarLengthMm = rebarExposed ? Math.max(10.0, rebarPointsCount * this.pointSpacingGridMm * 0.5) : 0.0;

    let urgencyRating: SpallUrgencyRating = 'COSMETIC';
    let repairRecommended = 'Surface patching and weatherproofing.';

    if (maxDepth >= 50.0 || (rebarExposed && exposedRebarLengthMm > 100.0)) {
      urgencyRating = 'CRITICAL_EMERGENCY';
      repairRecommended = 'Immediate structural shoring, cathodic protection, and structural polymer concrete jacketing.';
    } else if (maxDepth >= 25.0 || rebarExposed) {
      urgencyRating = 'MODERATE_STRUCTURAL';
      repairRecommended = 'Chipping to sound concrete, rebar rust removal/zinc primer, and polymer repair mortar.';
    }

    return {
      totalPointsScanned: points.length,
      spalledPointsCount: spalledPoints.length,
      maxSpallDepthMm: Number(maxDepth.toFixed(1)),
      meanSpallDepthMm: Number(meanDepth.toFixed(1)),
      estimatedSurfaceAreaCm2: Number(surfaceAreaCm2.toFixed(1)),
      estimatedVolumeLossCm3: Number(volumeLossCm3.toFixed(1)),
      rebarExposedFlag: rebarExposed,
      exposedRebarLengthMm: Number(exposedRebarLengthMm.toFixed(1)),
      urgencyRating,
      repairRecommended,
    };
  }
}
