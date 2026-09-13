/**
 * SNAP-60: Deep Foundation Diaphragm Wall Slurry Trench Ultrasonic Hydrophone Verticality Profiler
 * 
 * Analyzes ultrasonic echo sounding telemetry in bentonite slurry filled diaphragm trenches,
 * computing panel verticality deviations, trench necking/bulging, and construction tolerance compliance.
 */

export interface UltrasonicDepthEcho {
  depthMeters: number;
  timeOfFlightLeftMicroseconds: number;
  timeOfFlightRightMicroseconds: number;
  timeOfFlightFrontMicroseconds: number;
  timeOfFlightBackMicroseconds: number;
}

export interface SlurryProperties {
  acousticVelocityMetersPerSecond: number; // typically 1480 - 1580 m/s
  designThicknessMeters: number; // trench width, e.g. 0.8m - 1.5m
  maxAllowedVerticalityDeviationPct: number; // typically 0.33% (1:300) or 0.5%
}

export interface TrenchDepthProfile {
  depthMeters: number;
  actualWidthMeters: number;
  widthDeviationMm: number;
  transverseOffsetMm: number;
  longitudinalOffsetMm: number;
  verticalityDeviationPct: number;
  isWithinVerticalityTolerance: boolean;
  anomalyClassification: 'NORMAL' | 'BULGING_CAVING' | 'NECKING_CONSTRICTION' | 'VERTICALITY_OUT_OF_TOLERANCE';
}

export interface DiaphragmWallInspectionSummary {
  maxDepthMeters: number;
  averageWidthMeters: number;
  maxVerticalityDeviationPct: number;
  overallCompliancePass: boolean;
  criticalAnomaliesCount: number;
  depthProfiles: TrenchDepthProfile[];
}

export class SlurryTrenchVerticalityProfiler {
  /**
   * Evaluates depth-wise ultrasonic echograms to profile trench verticality and geometry.
   */
  public evaluateTrenchProfile(
    echoes: UltrasonicDepthEcho[],
    slurry: SlurryProperties
  ): DiaphragmWallInspectionSummary {
    if (echoes.length === 0) {
      throw new Error('Depth echo telemetry cannot be empty.');
    }

    const v = slurry.acousticVelocityMetersPerSecond;
    let criticalCount = 0;
    let maxVertDevPct = 0;
    let sumWidth = 0;

    const depthProfiles: TrenchDepthProfile[] = echoes.map((echo) => {
      // Distance from probe center to wall: d = (v * t) / 2
      const distLeft = (v * (echo.timeOfFlightLeftMicroseconds * 1e-6)) / 2;
      const distRight = (v * (echo.timeOfFlightRightMicroseconds * 1e-6)) / 2;
      const distFront = (v * (echo.timeOfFlightFrontMicroseconds * 1e-6)) / 2;
      const distBack = (v * (echo.timeOfFlightBackMicroseconds * 1e-6)) / 2;

      const actualWidth = distLeft + distRight;
      sumWidth += actualWidth;
      const widthDeviationMm = (actualWidth - slurry.designThicknessMeters) * 1000;

      // Transverse eccentricity (left vs right offset)
      const transverseOffsetMm = ((distRight - distLeft) / 2) * 1000;
      // Longitudinal eccentricity (front vs back offset)
      const longitudinalOffsetMm = ((distFront - distBack) / 2) * 1000;

      const totalOffsetMeters = Math.sqrt(
        Math.pow(transverseOffsetMm * 1e-3, 2) + Math.pow(longitudinalOffsetMm * 1e-3, 2)
      );

      // Verticality inclination deviation as percentage: (offset / depth) * 100
      const vertDevPct = echo.depthMeters > 0 ? (totalOffsetMeters / echo.depthMeters) * 100 : 0.0;
      if (vertDevPct > maxVertDevPct) {
        maxVertDevPct = vertDevPct;
      }

      const isCompliant = vertDevPct <= slurry.maxAllowedVerticalityDeviationPct;

      let anomaly: TrenchDepthProfile['anomalyClassification'] = 'NORMAL';
      if (!isCompliant) {
        anomaly = 'VERTICALITY_OUT_OF_TOLERANCE';
        criticalCount++;
      } else if (widthDeviationMm > 150) {
        // Severe caving/over-excavation (>150mm wider)
        anomaly = 'BULGING_CAVING';
        criticalCount++;
      } else if (widthDeviationMm < -100) {
        // Inadequate trench width (<100mm narrower)
        anomaly = 'NECKING_CONSTRICTION';
        criticalCount++;
      }

      return {
        depthMeters: echo.depthMeters,
        actualWidthMeters: Number(actualWidth.toFixed(3)),
        widthDeviationMm: Number(widthDeviationMm.toFixed(1)),
        transverseOffsetMm: Number(transverseOffsetMm.toFixed(1)),
        longitudinalOffsetMm: Number(longitudinalOffsetMm.toFixed(1)),
        verticalityDeviationPct: Number(vertDevPct.toFixed(3)),
        isWithinVerticalityTolerance: isCompliant,
        anomalyClassification: anomaly,
      };
    });

    const maxDepth = Math.max(...echoes.map((e) => e.depthMeters));
    const avgWidth = sumWidth / echoes.length;
    const overallPass = criticalCount === 0;

    return {
      maxDepthMeters: maxDepth,
      averageWidthMeters: Number(avgWidth.toFixed(3)),
      maxVerticalityDeviationPct: Number(maxVertDevPct.toFixed(3)),
      overallCompliancePass: overallPass,
      criticalAnomaliesCount: criticalCount,
      depthProfiles,
    };
  }
}
