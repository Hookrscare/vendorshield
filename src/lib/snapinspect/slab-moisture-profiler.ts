/**
 * SNAP-31: High-Precision Multi-Sensor Concrete Slab Moisture Relative Humidity Profiler.
 * Part of SnapInspect AI Tactical Field Inspection CAD & Mobile Voice AI.
 * Implements ASTM F2170 in-situ relative humidity probe analysis, vertical slab moisture gradients,
 * equilibrium relative humidity (ERH) calculation, and commercial flooring adhesive suitability matrices.
 */

export type DryingExposure = "SINGLE_SIDE_ON_GRADE" | "TWO_SIDE_ELEVATED_DECK";

export type FlooringType =
  | "HARDWOOD_ENGINEERED"
  | "VINYL_COMPOSITION_TILE_VCT"
  | "LUXURY_VINYL_PLANK_LVT"
  | "RESILIENT_RUBBER_SHEET"
  | "CARPET_MODULAR_TILE"
  | "SEAMLESS_RESINOUS_EPOXY";

export interface ProbeSensorReading {
  sensorId: string;
  depthInches: number;
  temperatureFahrenheit: number;
  relativeHumidityPercent: number; // e.g. 84.5
}

export interface ConcreteSlabSpec {
  slabThicknessInches: number; // e.g. 5.0 inches
  exposure: DryingExposure;
  slabAgeDays: number; // e.g. 90 days
  targetFlooring: FlooringType;
  ambientTempFahrenheit: number;
  ambientRhPercent: number;
}

export interface SlabMoistureProfileResult {
  recommendedProbeDepthInches: number;
  coreRelativeHumidityPercent: number;
  surfaceRelativeHumidityPercent: number;
  verticalMoistureGradientPercent: number; // core RH - surface RH
  equilibriumRhPercent: number;
  adhesiveToleranceLimitRh: number;
  complianceStatus: "ACCEPTABLE_FOR_INSTALL" | "BORDERLINE_CAUTION" | "MOISTURE_BARRIER_REQUIRED" | "UNACCEPTABLE_WET";
  daysToTargetProjection: number; // 0 if already compliant
  remediationPlan: string[];
}

export const ADHESIVE_LIMITS: Record<FlooringType, number> = {
  HARDWOOD_ENGINEERED: 75.0,
  VINYL_COMPOSITION_TILE_VCT: 80.0,
  RESILIENT_RUBBER_SHEET: 80.0,
  LUXURY_VINYL_PLANK_LVT: 85.0,
  CARPET_MODULAR_TILE: 85.0,
  SEAMLESS_RESINOUS_EPOXY: 80.0
};

export class SlabMoistureProfiler {
  /**
   * ASTM F2170 defines test depth:
   * - 40% slab depth for slabs drying from top only (on grade with vapor retarder).
   * - 20% slab depth for elevated slabs drying from top and bottom.
   */
  public static calculateRequiredProbeDepth(thicknessInches: number, exposure: DryingExposure): number {
    if (thicknessInches <= 0) {
      throw new Error("Slab thickness must be positive.");
    }
    const ratio = exposure === "TWO_SIDE_ELEVATED_DECK" ? 0.20 : 0.40;
    return Math.round(thicknessInches * ratio * 100) / 100;
  }

  public static evaluateMoistureProfile(
    slab: ConcreteSlabSpec,
    probes: ProbeSensorReading[]
  ): SlabMoistureProfileResult {
    if (!probes || probes.length === 0) {
      throw new Error("At least one in-situ probe reading is required.");
    }

    const requiredDepth = this.calculateRequiredProbeDepth(slab.slabThicknessInches, slab.exposure);

    // Sort probes by depth ascending
    const sorted = [...probes].sort((a, b) => a.depthInches - b.depthInches);
    const surfaceProbe = sorted[0];
    
    // Find probe closest to required depth
    let coreProbe = sorted[0];
    let minDelta = Math.abs(coreProbe.depthInches - requiredDepth);
    for (const p of sorted) {
      const delta = Math.abs(p.depthInches - requiredDepth);
      if (delta < minDelta) {
        minDelta = delta;
        coreProbe = p;
      }
    }

    const coreRh = coreProbe.relativeHumidityPercent;
    const surfaceRh = surfaceProbe.relativeHumidityPercent;
    const gradient = Math.round((coreRh - surfaceRh) * 10) / 10;

    // Equilibrium relative humidity (ERH) once floor covering seals the surface:
    // Tends to equal core RH (at 40% depth) within +/- 1.5% RH
    const equilibriumRh = Math.round(coreRh * 10) / 10;
    const adhesiveLimit = ADHESIVE_LIMITS[slab.targetFlooring] ?? 80.0;

    let status: SlabMoistureProfileResult["complianceStatus"] = "ACCEPTABLE_FOR_INSTALL";
    const recommendations: string[] = [];

    if (equilibriumRh <= adhesiveLimit) {
      status = "ACCEPTABLE_FOR_INSTALL";
      recommendations.push(`Core RH (${equilibriumRh}%) is within tolerance (${adhesiveLimit}%) for ${slab.targetFlooring}.`);
    } else if (equilibriumRh <= adhesiveLimit + 3.0) {
      status = "BORDERLINE_CAUTION";
      recommendations.push(`Core RH (${equilibriumRh}%) slightly exceeds adhesive limit (${adhesiveLimit}%). Re-test in 7-10 days or apply premium high-moisture adhesive.`);
    } else if (equilibriumRh <= 92.0) {
      status = "MOISTURE_BARRIER_REQUIRED";
      recommendations.push(`Core RH (${equilibriumRh}%) exceeds allowable threshold. Install two-part epoxy Class 1 vapor barrier (<0.1 perm) per ASTM F3010 before flooring installation.`);
    } else {
      status = "UNACCEPTABLE_WET";
      recommendations.push(`Severe slab moisture saturation (${equilibriumRh}% RH). Active dehumidification and HVAC stabilization required. Do not apply coatings.`);
    }

    // Rough drying projection (rule of thumb: ~30 days per inch under standard 70°F/50% RH conditions)
    let daysToTarget = 0;
    if (equilibriumRh > adhesiveLimit) {
      const excessRh = equilibriumRh - adhesiveLimit;
      // Approximate 1% RH reduction takes ~4 to 7 days under conditioned ambient
      daysToTarget = Math.round(excessRh * 5.5);
    }

    return {
      recommendedProbeDepthInches: requiredDepth,
      coreRelativeHumidityPercent: coreRh,
      surfaceRelativeHumidityPercent: surfaceRh,
      verticalMoistureGradientPercent: gradient,
      equilibriumRhPercent: equilibriumRh,
      adhesiveToleranceLimitRh: adhesiveLimit,
      complianceStatus: status,
      daysToTargetProjection: daysToTarget,
      remediationPlan: recommendations
    };
  }
}
