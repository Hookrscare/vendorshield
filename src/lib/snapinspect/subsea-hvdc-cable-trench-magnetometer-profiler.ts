/**
 * src/lib/snapinspect/subsea-hvdc-cable-trench-magnetometer-profiler.ts
 * SNAP-63: Subsea High-Voltage Direct Current (HVDC) Cable Trench Depth-of-Burial Magnetometer Profiler.
 * 
 * Part of SnapInspect AI Tactical Field & Offshore Subsea Infrastructure Inspection.
 * 
 * Implements magnetic anomaly inversion and bathymetric trench profiling for subsea
 * HVDC power transmission cables and offshore wind inter-array cables:
 * - Uses tri-axial fluxgate magnetic gradiometer array measurements (nT).
 * - Applies Biot-Savart magnetic field decay: B = (mu_0 * I) / (2 * pi * r).
 * - Estimates cable Depth of Burial (DOB) relative to seabed mudline.
 * - Detects exposed free-spans, anchor snag/trawl strike hazards, and sediment scouring.
 * - Evaluates compliance against maritime safety clearance criteria (e.g. DNV-RP-F107).
 */

export interface MagnetometerReading {
  sensorId: string;
  chainageMeters: number;         // Along-cable route distance (KP / Kilometer Point)
  lateralOffsetMeters: number;    // Transverse distance from survey vehicle centerline
  altitudeAboveSeabedMeters: number;
  totalMagneticIntensityNanoTesla: number; // TMI reading (nT)
  backgroundEarthFieldNanoTesla: number;  // Regional baseline geomagnetic field (nT)
}

export interface CableBurialProfilePoint {
  chainageMeters: number;
  estimatedDepthOfBurialMeters: number; // Positive = below seabed, negative = exposed / suspended
  sensorDistanceMeters: number;
  magneticAnomalyNanoTesla: number;
  cableCurrentAmperes: number;
  exposureStatus: "SAFE_BURIAL" | "SHALLOW_BURIAL_RISK" | "EXPOSED_SEABED" | "FREE_SPAN_HAZARD";
  marineRiskLevel: "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
  recommendedMitigation: string;
}

export interface HvdcSurveySummary {
  surveyId: string;
  totalSurveyLengthMeters: number;
  meanDepthOfBurialMeters: number;
  minDepthOfBurialMeters: number;
  maxDepthOfBurialMeters: number;
  exposedSectionLengthMeters: number;
  shallowRiskLengthMeters: number;
  compliancePercentage: number;
  profilePoints: CableBurialProfilePoint[];
  criticalAlertCount: number;
  surveyPassStatus: "PASS" | "CONDITIONAL_APPROVAL" | "FAIL_REQUIRES_REMEDIATION";
}

export class SubseaHvdcCableTrenchMagnetometerProfiler {
  // Magnetic permeability of free space / seawater mu_0 = 4*pi * 10^-7 H/m = 1.25663706e-6
  private static readonly MU_0 = 4 * Math.PI * 1e-7;
  // Default target minimum depth of burial (meters) under maritime regulations
  private readonly targetMinDobMeters: number;

  constructor(targetMinDobMeters: number = 1.5) {
    this.targetMinDobMeters = Math.max(0.5, targetMinDobMeters);
  }

  /**
   * Inverts magnetic field anomaly to compute distance from sensor to cable center.
   * Based on Biot-Savart: B = (mu_0 * I) / (2 * pi * r)
   * => r = (mu_0 * I) / (2 * pi * B)
   * Where B is in Tesla, so B_Tesla = B_nT * 1e-9.
   */
  public invertCableDistance(
    magneticAnomalyNanoTesla: number,
    cableCurrentAmperes: number
  ): number {
    const anomalyAbs = Math.abs(magneticAnomalyNanoTesla);
    if (anomalyAbs < 0.1 || cableCurrentAmperes <= 0) {
      return 100.0; // Weak/undetectable anomaly, assumed far
    }

    const anomalyTesla = anomalyAbs * 1e-9;
    const distanceMeters = (SubseaHvdcCableTrenchMagnetometerProfiler.MU_0 * cableCurrentAmperes) / (2 * Math.PI * anomalyTesla);
    return Math.max(0.01, distanceMeters);
  }

  /**
   * Evaluates Depth of Burial (DOB) from sensor altitude and inverted distance:
   * DOB = r_sensor_to_cable - sensor_altitude_above_seabed
   */
  public calculateDepthOfBurial(
    sensorDistanceMeters: number,
    sensorAltitudeAboveSeabedMeters: number
  ): number {
    return sensorDistanceMeters - sensorAltitudeAboveSeabedMeters;
  }

  /**
   * Classifies exposure and risk based on calculated DOB.
   */
  public classifyBurialPoint(
    chainageMeters: number,
    dobMeters: number,
    sensorDistanceMeters: number,
    anomalyNanoTesla: number,
    cableCurrentAmperes: number
  ): CableBurialProfilePoint {
    let exposureStatus: CableBurialProfilePoint["exposureStatus"];
    let marineRiskLevel: CableBurialProfilePoint["marineRiskLevel"];
    let recommendedMitigation: string;

    if (dobMeters < -0.1) {
      exposureStatus = "FREE_SPAN_HAZARD";
      marineRiskLevel = "CRITICAL";
      recommendedMitigation = `Deploy ROV rock-placement or grout mattress urgently; cable is suspended ${Math.abs(dobMeters).toFixed(2)}m above seabed.`;
    } else if (dobMeters <= 0.05) {
      exposureStatus = "EXPOSED_SEABED";
      marineRiskLevel = "HIGH";
      recommendedMitigation = "Schedule rock berm dumping or post-lay trenching jet-sled to cover exposed cable.";
    } else if (dobMeters < this.targetMinDobMeters) {
      exposureStatus = "SHALLOW_BURIAL_RISK";
      marineRiskLevel = "MODERATE";
      recommendedMitigation = `Trench cover depth (${dobMeters.toFixed(2)}m) is below target ${this.targetMinDobMeters}m threshold; monitor during heavy maritime traffic.`;
    } else {
      exposureStatus = "SAFE_BURIAL";
      marineRiskLevel = "LOW";
      recommendedMitigation = "Burial meets DNV / maritime clearance specifications. No immediate intervention required.";
    }

    return {
      chainageMeters,
      estimatedDepthOfBurialMeters: parseFloat(dobMeters.toFixed(3)),
      sensorDistanceMeters: parseFloat(sensorDistanceMeters.toFixed(3)),
      magneticAnomalyNanoTesla: parseFloat(anomalyNanoTesla.toFixed(1)),
      cableCurrentAmperes,
      exposureStatus,
      marineRiskLevel,
      recommendedMitigation
    };
  }

  /**
   * Analyzes an entire survey track from ROV/AUV magnetometer readings.
   */
  public analyzeSurveyTrack(
    surveyId: string,
    readings: MagnetometerReading[],
    cableCurrentAmperes: number
  ): HvdcSurveySummary {
    if (!readings || readings.length === 0) {
      throw new Error("Readings list cannot be empty for HVDC survey track.");
    }

    const sortedReadings = [...readings].sort((a, b) => a.chainageMeters - b.chainageMeters);
    const profilePoints: CableBurialProfilePoint[] = [];

    let totalLength = 0;
    if (sortedReadings.length > 1) {
      totalLength = sortedReadings[sortedReadings.length - 1].chainageMeters - sortedReadings[0].chainageMeters;
    }

    let exposedCount = 0;
    let shallowRiskCount = 0;
    let criticalCount = 0;
    let sumDob = 0;
    let minDob = Infinity;
    let maxDob = -Infinity;

    for (const r of sortedReadings) {
      const anomaly = r.totalMagneticIntensityNanoTesla - r.backgroundEarthFieldNanoTesla;
      const sensorDist = this.invertCableDistance(anomaly, cableCurrentAmperes);
      const dob = this.calculateDepthOfBurial(sensorDist, r.altitudeAboveSeabedMeters);

      const point = this.classifyBurialPoint(
        r.chainageMeters,
        dob,
        sensorDist,
        anomaly,
        cableCurrentAmperes
      );

      profilePoints.push(point);

      sumDob += dob;
      if (dob < minDob) minDob = dob;
      if (dob > maxDob) maxDob = dob;

      if (point.exposureStatus === "FREE_SPAN_HAZARD" || point.exposureStatus === "EXPOSED_SEABED") {
        exposedCount++;
      } else if (point.exposureStatus === "SHALLOW_BURIAL_RISK") {
        shallowRiskCount++;
      }

      if (point.marineRiskLevel === "CRITICAL" || point.marineRiskLevel === "HIGH") {
        criticalCount++;
      }
    }

    const n = sortedReadings.length;
    const meanDob = sumDob / n;
    const stepMeters = totalLength > 0 ? totalLength / (n - 1) : 1.0;
    const exposedLength = exposedCount * stepMeters;
    const shallowLength = shallowRiskCount * stepMeters;
    const compliantCount = n - (exposedCount + shallowRiskCount);
    const compliancePct = Math.max(0, Math.min(100, (compliantCount / n) * 100));

    let status: HvdcSurveySummary["surveyPassStatus"] = "PASS";
    if (exposedCount > 0 || criticalCount > 0) {
      status = "FAIL_REQUIRES_REMEDIATION";
    } else if (compliancePct < 90.0) {
      status = "CONDITIONAL_APPROVAL";
    }

    return {
      surveyId,
      totalSurveyLengthMeters: parseFloat(totalLength.toFixed(2)),
      meanDepthOfBurialMeters: parseFloat(meanDob.toFixed(3)),
      minDepthOfBurialMeters: parseFloat(minDob.toFixed(3)),
      maxDepthOfBurialMeters: parseFloat(maxDob.toFixed(3)),
      exposedSectionLengthMeters: parseFloat(exposedLength.toFixed(2)),
      shallowRiskLengthMeters: parseFloat(shallowLength.toFixed(2)),
      compliancePercentage: parseFloat(compliancePct.toFixed(1)),
      profilePoints,
      criticalAlertCount: criticalCount,
      surveyPassStatus: status
    };
  }
}
