/**
 * SNAP-20: Automated Roof Pitch & Shingle Wind Uplift Resistance Calculator.
 * Part of SnapInspect AI Tactical Field Inspection CAD & Mobile Voice AI.
 * Computes roof pitch ratios (rise/run), slope angles in degrees, ASCE 7-22 design
 * wind uplift pressures across roof zones (Field, Perimeter, Corner), and validates
 * asphalt shingle wind ratings (ASTM D3161 Class F, ASTM D7158 Class H) against fastener schedules.
 */

export type RoofZone = "ZONE_1_FIELD" | "ZONE_2_PERIMETER" | "ZONE_3_CORNER";

export type ShingleRatingClass =
  | "ASTM_D3161_CLASS_A" // Up to 60 mph
  | "ASTM_D3161_CLASS_D" // Up to 90 mph
  | "ASTM_D3161_CLASS_F" // Up to 110 mph
  | "ASTM_D7158_CLASS_D" // Up to 90 mph
  | "ASTM_D7158_CLASS_G" // Up to 120 mph
  | "ASTM_D7158_CLASS_H"; // Up to 150 mph

export type FastenerSchedule = "STANDARD_4_NAIL" | "HIGH_WIND_6_NAIL" | "ENHANCED_STARTER_STRIP_6_NAIL";

export interface RoofPitchInput {
  riseInches: number;
  runInches: number; // typically 12 for standard pitch notation
}

export interface WindUpliftParameters {
  basicWindSpeedMph: number; // ASCE 7-22 3-second gust design wind speed
  exposureCategory: "B" | "C" | "D"; // B = Suburban/Wooded, C = Open terrain, D = Coastal
  meanRoofHeightFeet: number;
  topographicFactorKzt?: number; // default 1.0
  directionalityKd?: number; // default 0.85 for components/cladding
}

export interface ZonePressureResult {
  zone: RoofZone;
  externalPressureCoefficientGCp: number;
  designUpliftPoundPerSquareFoot: number; // psf
  upliftPascals: number;
}

export interface ShingleUpliftAssessment {
  pitchRatio: string; // e.g. "6:12"
  slopeDegrees: number;
  velocityPressureQzPsf: number;
  zonePressures: ZonePressureResult[];
  maxDesignUpliftPsf: number;
  shingleRating: ShingleRatingClass;
  maxRatedWindMph: number;
  fastenerSchedule: FastenerSchedule;
  safetyFactor: number;
  isCompliant: boolean;
  actionSummary: string;
  recommendedFastenerSchedule: FastenerSchedule;
}

export class RoofPitchUpliftCalculator {
  /**
   * Converts rise and run to pitch ratio and slope degrees.
   */
  public static calculateSlope(pitch: RoofPitchInput): { pitchRatio: string; slopeDegrees: number } {
    const rise = Math.max(0, pitch.riseInches);
    const run = Math.max(0.1, pitch.runInches);
    const slopeRad = Math.atan(rise / run);
    const slopeDegrees = Math.round((slopeRad * (180 / Math.PI)) * 100) / 100;
    const normalizedRise = Math.round((rise / run) * 12 * 10) / 10;
    const pitchRatio = `${normalizedRise}:12`;

    return { pitchRatio, slopeDegrees };
  }

  /**
   * Calculates ASCE 7 velocity pressure qz (psf).
   * qz = 0.00256 * Kz * Kzt * Kd * Ke * V^2
   */
  public static calculateVelocityPressure(params: WindUpliftParameters): number {
    const V = params.basicWindSpeedMph;
    const Kzt = params.topographicFactorKzt ?? 1.0;
    const Kd = params.directionalityKd ?? 0.85;
    const Ke = 1.0; // Ground elevation factor (sea level)

    // Velocity pressure coefficient Kz estimation based on height and exposure
    let Kz = 0.85;
    const h = params.meanRoofHeightFeet;
    if (params.exposureCategory === "B") {
      Kz = h <= 15 ? 0.57 : 0.57 + (h - 15) * 0.01;
    } else if (params.exposureCategory === "C") {
      Kz = h <= 15 ? 0.85 : 0.85 + (h - 15) * 0.008;
    } else if (params.exposureCategory === "D") {
      Kz = h <= 15 ? 1.03 : 1.03 + (h - 15) * 0.007;
    }

    const qz = 0.00256 * Kz * Kzt * Kd * Ke * (V * V);
    return Math.round(qz * 100) / 100;
  }

  /**
   * Maps shingle rating class to maximum certified wind speed (mph).
   */
  public static getShingleRatingMph(rating: ShingleRatingClass): number {
    switch (rating) {
      case "ASTM_D3161_CLASS_A": return 60;
      case "ASTM_D3161_CLASS_D":
      case "ASTM_D7158_CLASS_D": return 90;
      case "ASTM_D3161_CLASS_F": return 110;
      case "ASTM_D7158_CLASS_G": return 120;
      case "ASTM_D7158_CLASS_H": return 150;
      default: return 60;
    }
  }

  /**
   * Evaluates roof pitch, wind uplift across zones, and shingle/fastener resistance.
   */
  public static evaluateRoofUplift(
    pitch: RoofPitchInput,
    wind: WindUpliftParameters,
    shingleRating: ShingleRatingClass,
    fastener: FastenerSchedule
  ): ShingleUpliftAssessment {
    const { pitchRatio, slopeDegrees } = this.calculateSlope(pitch);
    const qz = this.calculateVelocityPressure(wind);

    // ASCE 7 Components & Cladding GCp coefficients for steep slope roofs (> 7 deg / > 1.5:12)
    // Field (Zone 1): -0.9, Perimeter (Zone 2): -1.7, Corner (Zone 3): -2.6
    const zoneCoeffs: { zone: RoofZone; gcp: number }[] = [
      { zone: "ZONE_1_FIELD", gcp: -0.9 },
      { zone: "ZONE_2_PERIMETER", gcp: -1.7 },
      { zone: "ZONE_3_CORNER", gcp: -2.6 }
    ];

    const zonePressures: ZonePressureResult[] = zoneCoeffs.map(z => {
      // p = qz * (GCp - GCpi), assuming GCpi = -0.18 for enclosed building suction
      const netCoeff = Math.abs(z.gcp - 0.18);
      const psf = Math.round(qz * netCoeff * 100) / 100;
      const pa = Math.round(psf * 47.8803);
      return {
        zone: z.zone,
        externalPressureCoefficientGCp: z.gcp,
        designUpliftPoundPerSquareFoot: psf,
        upliftPascals: pa
      };
    });

    const maxUpliftPsf = Math.max(...zonePressures.map(z => z.designUpliftPoundPerSquareFoot));
    const ratedMph = this.getShingleRatingMph(shingleRating);

    // Fastener resistance factor
    const fastenerCapacityMultiplier = fastener === "STANDARD_4_NAIL" ? 1.0 : (fastener === "HIGH_WIND_6_NAIL" ? 1.45 : 1.65);
    const effectiveResistantMph = ratedMph * Math.sqrt(fastenerCapacityMultiplier);

    const safetyFactor = Math.round((effectiveResistantMph / wind.basicWindSpeedMph) * 100) / 100;
    const isCompliant = safetyFactor >= 1.0;

    let recommendedFastener = fastener;
    if (wind.basicWindSpeedMph > 110 && fastener === "STANDARD_4_NAIL") {
      recommendedFastener = "HIGH_WIND_6_NAIL";
    }
    if (wind.basicWindSpeedMph > 130) {
      recommendedFastener = "ENHANCED_STARTER_STRIP_6_NAIL";
    }

    const actionSummary = isCompliant
      ? `Roof slope ${pitchRatio} (${slopeDegrees}°) meets wind uplift requirements with safety factor ${safetyFactor}.`
      : `Deficient wind resistance: design wind ${wind.basicWindSpeedMph} mph exceeds effective assembly capacity (${Math.round(effectiveResistantMph)} mph). Upgrade to ${recommendedFastener}.`;

    return {
      pitchRatio,
      slopeDegrees,
      velocityPressureQzPsf: qz,
      zonePressures,
      maxDesignUpliftPsf: maxUpliftPsf,
      shingleRating,
      maxRatedWindMph: ratedMph,
      fastenerSchedule: fastener,
      safetyFactor,
      isCompliant,
      actionSummary,
      recommendedFastenerSchedule: recommendedFastener
    };
  }
}
