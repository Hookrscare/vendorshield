/**
 * SNAP-51: LiDAR Point Cloud Concrete Spalling Volume & Rebar Exposure Estimator
 * 
 * Analyzes high-density 3D LiDAR point cloud scans of concrete structures.
 * 1. Fits a local plane to find nominal concrete cover.
 * 2. Identifies spalled depression regions with depths > threshold.
 * 3. Integrates numerical void volume (m^3 and Liters) using voxel binning.
 * 4. Detects exposed rebar reinforcement based on depth and intensity reflectance.
 * 5. Recommends structural repair classification (Cosmetic, Structural Patch, Full Jacketing).
 */

export interface Point3D {
  x: number;
  y: number;
  z: number;
  intensity?: number; // LiDAR return intensity (0..255), exposed oxidized/clean steel shows distinct reflectance
}

export interface SpallingAnalysisConfig {
  spallingDepthThresholdMm: number; // typically 15mm
  rebarDepthThresholdMm: number;    // nominal cover depth, e.g. 35mm
  rebarIntensityThreshold: number;  // return intensity indicative of steel
  voxelSizeMm: number;              // discrete integration grid resolution, e.g. 10mm
}

export type RepairClassification = 'COSMETIC_SURFACE_PATCH' | 'STRUCTURAL_MORTAR_REPAIR' | 'FULL_SECTION_JACKETING';

export interface SpallingInspectionResult {
  totalPointsAnalyzed: number;
  spalledPointsCount: number;
  spalledAreaM2: number;
  estimatedVoidVolumeLiters: number;
  maxSpallDepthMm: number;
  rebarExposed: boolean;
  exposedRebarLengthEstM: number;
  repairClassification: RepairClassification;
  recommendedMortarVolumeLiters: number; // Volume with 15% wastage allowance
}

export class ConcreteSpallingRebarEstimator {
  private config: SpallingAnalysisConfig;

  constructor(config: Partial<SpallingAnalysisConfig> = {}) {
    this.config = {
      spallingDepthThresholdMm: config.spallingDepthThresholdMm ?? 15,
      rebarDepthThresholdMm: config.rebarDepthThresholdMm ?? 35,
      rebarIntensityThreshold: config.rebarIntensityThreshold ?? 180,
      voxelSizeMm: config.voxelSizeMm ?? 10,
    };
  }

  /**
   * Assumes nominal wall plane is normalized at Z = 0 (or baseline reference plane).
   * Negative Z indicates depth deviation into the concrete face (spall void).
   */
  public analyzePointcloud(points: Point3D[]): SpallingInspectionResult {
    if (!points || points.length === 0) {
      return {
        totalPointsAnalyzed: 0,
        spalledPointsCount: 0,
        spalledAreaM2: 0,
        estimatedVoidVolumeLiters: 0,
        maxSpallDepthMm: 0,
        rebarExposed: false,
        exposedRebarLengthEstM: 0,
        repairClassification: 'COSMETIC_SURFACE_PATCH',
        recommendedMortarVolumeLiters: 0,
      };
    }

    const { spallingDepthThresholdMm, rebarDepthThresholdMm, rebarIntensityThreshold, voxelSizeMm } = this.config;

    // Voxel grid for area and volume integration
    // Key: "voxelX:voxelY" -> max depth in voxel
    const voxelMap = new Map<string, { maxDepthMm: number; hasRebar: boolean }>();

    let maxDepthMm = 0;
    let spalledPointsCount = 0;
    let exposedRebarPoints = 0;

    for (const pt of points) {
      // Depth deviation into surface: positive inward depth
      const depthMm = -pt.z * 1000; // convert meters to mm if coordinates are in meters

      if (depthMm >= spallingDepthThresholdMm) {
        spalledPointsCount++;
        if (depthMm > maxDepthMm) {
          maxDepthMm = depthMm;
        }

        const vx = Math.floor((pt.x * 1000) / voxelSizeMm);
        const vy = Math.floor((pt.y * 1000) / voxelSizeMm);
        const key = `${vx}:${vy}`;

        const isRebar = depthMm >= rebarDepthThresholdMm && (pt.intensity ?? 0) >= rebarIntensityThreshold;
        if (isRebar) {
          exposedRebarPoints++;
        }

        const existing = voxelMap.get(key);
        if (!existing) {
          voxelMap.set(key, { maxDepthMm: depthMm, hasRebar: isRebar });
        } else {
          existing.maxDepthMm = Math.max(existing.maxDepthMm, depthMm);
          if (isRebar) existing.hasRebar = true;
        }
      }
    }

    // Integrate area and volume across occupied voxels
    const voxelAreaM2 = (voxelSizeMm / 1000) * (voxelSizeMm / 1000);
    const spalledAreaM2 = Number((voxelMap.size * voxelAreaM2).toFixed(4));

    let totalVolumeM3 = 0;
    let rebarVoxels = 0;

    for (const voxel of voxelMap.values()) {
      const depthM = voxel.maxDepthMm / 1000;
      totalVolumeM3 += voxelAreaM2 * depthM;
      if (voxel.hasRebar) rebarVoxels++;
    }

    const estimatedVoidVolumeLiters = Number((totalVolumeM3 * 1000).toFixed(2));
    const rebarExposed = exposedRebarPoints > 0;
    const exposedRebarLengthEstM = Number((rebarVoxels * (voxelSizeMm / 1000)).toFixed(2));

    // Determine repair classification
    let repairClassification: RepairClassification = 'COSMETIC_SURFACE_PATCH';
    if (rebarExposed || maxDepthMm > 50 || estimatedVoidVolumeLiters > 25) {
      repairClassification = maxDepthMm > 80 || estimatedVoidVolumeLiters > 100
        ? 'FULL_SECTION_JACKETING'
        : 'STRUCTURAL_MORTAR_REPAIR';
    }

    const recommendedMortarVolumeLiters = Number((estimatedVoidVolumeLiters * 1.15).toFixed(2));

    return {
      totalPointsAnalyzed: points.length,
      spalledPointsCount,
      spalledAreaM2,
      estimatedVoidVolumeLiters,
      maxSpallDepthMm: Number(maxDepthMm.toFixed(1)),
      rebarExposed,
      exposedRebarLengthEstM,
      repairClassification,
      recommendedMortarVolumeLiters,
    };
  }
}
