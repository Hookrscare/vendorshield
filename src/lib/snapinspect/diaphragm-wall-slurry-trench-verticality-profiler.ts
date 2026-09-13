/**
 * diaphragm-wall-slurry-trench-verticality-profiler.ts
 * SNAP-60: Deep Foundation Diaphragm Wall Slurry Trench Ultrasonic Hydrophone Verticality Profiler.
 * Part of SnapInspect AI Tactical Field Inspection CAD & Mobile Voice AI.
 *
 * Implements ultrasonic caliper profiling for deep foundation diaphragm (slurry) walls:
 * 1. Converts ultrasonic pulse two-way travel times (North, South, East, West) to radial trench clearances.
 * 2. Compensates for bentonite / polymer slurry sonic velocity shifts as a function of slurry density and sand content.
 * 3. Computes trench verticality drift (dX, dY), inclination angle, and total deviation ratio.
 * 4. Flags structural non-compliance against EN 1538 / ASTM D6760 (e.g., > 1:200 or 0.5% verticality drift)
 *    and detects localized soil collapse (over-break) or trench necking.
 */

export interface SlurryProperties {
  slurryType: 'BENTONITE' | 'POLYMER' | 'WATER';
  densityGPerCm3: number; // e.g., 1.05 to 1.25 g/cm3
  sandContentPercent: number; // e.g., 0.5% to 4.0%
}

export interface UltrasonicProbeReading {
  depthMeters: number;
  travelTimeMicrosecondsNorth: number;
  travelTimeMicrosecondsSouth: number;
  travelTimeMicrosecondsEast: number;
  travelTimeMicrosecondsWest: number;
}

export interface DepthProfileSlice {
  depthMeters: number;
  widthNsMeters: number;
  widthEwMeters: number;
  centerDriftXNorthMeters: number;
  centerDriftYEastMeters: number;
  driftRadiusMeters: number;
  verticalityDeviationPercent: number;
  isWithinTolerance: boolean;
  anomaly?: 'OVER_EXCAVATION' | 'NECKING_CONSTRICTION' | 'VERTICALITY_EXCEEDED';
}

export interface TrenchAssessmentResult {
  nominalWidthMeters: number;
  maxDepthMeters: number;
  maxVerticalityPercent: number;
  maxDriftRadiusMeters: number;
  en1538Compliant: boolean;
  slices: DepthProfileSlice[];
  recommendations: string[];
}

export class DiaphragmWallSlurryTrenchVerticalityProfiler {
  /**
   * Calculates slurry acoustic velocity (m/s) based on slurry composition.
   * Pure water base ~ 1480 m/s at 20C. Bentonite density and sand increase acoustic stiffness.
   */
  public static calculateSlurryAcousticVelocity(slurry: SlurryProperties): number {
    let baseVelocity = 1482.0; // m/s
    if (slurry.slurryType === 'BENTONITE') {
      // Density factor: each 0.1 g/cm3 above water adds ~ 35 m/s
      const excessDensity = Math.max(0, slurry.densityGPerCm3 - 1.0);
      baseVelocity += excessDensity * 350.0;
      // Sand factor: suspended granular quartz increases acoustic velocity
      baseVelocity += slurry.sandContentPercent * 12.0;
    } else if (slurry.slurryType === 'POLYMER') {
      baseVelocity += (slurry.densityGPerCm3 - 1.0) * 180.0;
    }
    return Math.round(baseVelocity * 10) / 10;
  }

  /**
   * Evaluates ultrasonic hydrophone logs across depth profile.
   */
  public static profileTrench(
    nominalWidthNsMeters: number,
    nominalWidthEwMeters: number,
    slurry: SlurryProperties,
    probeReadings: UltrasonicProbeReading[],
    maxAllowableVerticalityPercent: number = 0.5 // Standard EN 1538 1:200 limit = 0.5%
  ): TrenchAssessmentResult {
    const sonicSpeed = this.calculateSlurryAcousticVelocity(slurry);
    const slices: DepthProfileSlice[] = [];
    const recommendations: string[] = [];

    let maxVerticality = 0.0;
    let maxDrift = 0.0;
    let maxDepth = 0.0;
    let overallCompliant = true;

    for (const r of probeReadings) {
      if (r.depthMeters > maxDepth) maxDepth = r.depthMeters;

      // Two-way travel time: distance = (time_seconds * velocity) / 2
      const distN = ((r.travelTimeMicrosecondsNorth * 1e-6) * sonicSpeed) / 2.0;
      const distS = ((r.travelTimeMicrosecondsSouth * 1e-6) * sonicSpeed) / 2.0;
      const distE = ((r.travelTimeMicrosecondsEast * 1e-6) * sonicSpeed) / 2.0;
      const distW = ((r.travelTimeMicrosecondsWest * 1e-6) * sonicSpeed) / 2.0;

      const widthNs = Math.round((distN + distS) * 1000) / 1000;
      const widthEw = Math.round((distE + distW) * 1000) / 1000;

      // Probe centerline drift from nominal trench axis
      const driftX = Math.round(((distN - distS) / 2.0) * 1000) / 1000;
      const driftY = Math.round(((distE - distW) / 2.0) * 1000) / 1000;
      const driftRadius = Math.round(Math.sqrt(driftX * driftX + driftY * driftY) * 1000) / 1000;

      const vertPercent = r.depthMeters > 0
        ? Math.round((driftRadius / r.depthMeters) * 10000) / 100
        : 0.0;

      if (driftRadius > maxDrift) maxDrift = driftRadius;
      if (vertPercent > maxVerticality) maxVerticality = vertPercent;

      const isWithinTolerance = vertPercent <= maxAllowableVerticalityPercent;
      let anomaly: DepthProfileSlice['anomaly'];

      if (!isWithinTolerance) {
        overallCompliant = false;
        anomaly = 'VERTICALITY_EXCEEDED';
      } else if (widthNs < nominalWidthNsMeters * 0.90) {
        anomaly = 'NECKING_CONSTRICTION';
      } else if (widthNs > nominalWidthNsMeters * 1.25) {
        anomaly = 'OVER_EXCAVATION';
      }

      slices.push({
        depthMeters: r.depthMeters,
        widthNsMeters: widthNs,
        widthEwMeters: widthEw,
        centerDriftXNorthMeters: driftX,
        centerDriftYEastMeters: driftY,
        driftRadiusMeters: driftRadius,
        verticalityDeviationPercent: vertPercent,
        isWithinTolerance,
        anomaly
      });
    }

    if (!overallCompliant) {
      recommendations.push(`CORRECTIVE_CHISELING_REQUIRED: Trench verticality ${maxVerticality}% exceeds EN 1538 limit (${maxAllowableVerticalityPercent}%).`);
    }

    const neckingSlices = slices.filter(s => s.anomaly === 'NECKING_CONSTRICTION');
    if (neckingSlices.length > 0) {
      recommendations.push(`DESAND_AND_REAM: Slurry trench necking observed at depths: ${neckingSlices.map(s => s.depthMeters + 'm').join(', ')}.`);
    }

    if (recommendations.length === 0) {
      recommendations.push('TRENCH_GEOMETRY_OPTIMAL: Within EN 1538 verticality tolerance and nominal cross-section.');
    }

    return {
      nominalWidthMeters: nominalWidthNsMeters,
      maxDepthMeters: maxDepth,
      maxVerticalityPercent: maxVerticality,
      maxDriftRadiusMeters: maxDrift,
      en1538Compliant: overallCompliant,
      slices,
      recommendations
    };
  }
}
