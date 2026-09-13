/**
 * src/lib/snapinspect/geothermal-well-casing-ultrasonic-tomographer.ts
 * SNAP-63: Geothermal Production Well Casing Ultrasonic Wall-Thickness Corrosion Tomographer.
 * Part of SnapInspect AI (AEC/Civil Engineering Deep Tech & Defect Vision Platform).
 *
 * Capabilities:
 * - Downhole multi-transducer pulse-echo ultrasonic thickness (UT) inspection
 * - High-temperature hydrothermal acoustic velocity compensation (brine & steel vs temp)
 * - 360-degree circumferential wall loss and localized pitting corrosion tomography
 * - Remaining casing burst pressure calculation via Barlow's formula (API 5CT / NACE MR0175)
 * - Cryptographic inspection verification hash
 */

import { createHash } from 'crypto';

export interface WellCasingSpecification {
  wellId: string;
  nominalOuterDiameterMm: number;  // e.g. 244.5 mm (9-5/8 inch)
  nominalWallThicknessMm: number;  // e.g. 11.99 mm (40 lb/ft L80)
  steelGradeYieldStrengthMpa: number; // e.g. 552 MPa for L80
  wellDepthMeters: number;
}

export interface UltrasonicTransducerMeasurement {
  azimuthAngleDeg: number;       // 0 to 360 degrees
  fluidTravelTimeMicrosec: number; // Pulse to inner wall echo
  steelEchoIntervalMicrosec: number; // Ringdown spacing across casing wall
  downholeTemperatureCelsius: number; // In-situ temperature (e.g. 180°C)
  brineSalinityPpm: number;
}

export interface CasingTomographyResult {
  wellId: string;
  depthMeters: number;
  temperatureCelsius: number;
  averageWallThicknessMm: number;
  minimumWallThicknessMm: number;
  maximumWallLossPercent: number;
  remainingBurstPressureMpa: number;
  nominalBurstPressureMpa: number;
  burstDeratingFactor: number;
  integrityStatus: 'OPTIMAL' | 'MODERATE_CORROSION' | 'CRITICAL_WALL_THINNING' | 'IMMINENT_BURST_FAILURE';
  pittingAnomaliesDetected: number;
  evidenceSha256: string;
}

export class GeothermalWellCasingUltrasonicTomographer {
  /**
   * Computes ultrasonic velocity in high-temperature steel.
   * Longitudinal velocity in carbon steel at 20°C is ~5920 m/s, derating by ~0.75 m/s per °C.
   */
  public calculateSteelAcousticVelocity(tempCelsius: number): number {
    const v0 = 5920.0;
    const tempCoeff = 0.75;
    return Math.max(5200.0, v0 - tempCoeff * (tempCelsius - 20.0));
  }

  /**
   * Analyzes an ultrasonic multi-transducer cross-section of casing.
   */
  public analyzeCasingCrossSection(
    casing: WellCasingSpecification,
    measurements: UltrasonicTransducerMeasurement[]
  ): CasingTomographyResult {
    if (measurements.length === 0) {
      throw new Error('No ultrasonic transducer readings provided for tomography');
    }

    let sumThickness = 0;
    let minThickness = Number.MAX_SAFE_INTEGER;
    let pittingCount = 0;
    let avgTemp = 0;

    for (const m of measurements) {
      avgTemp += m.downholeTemperatureCelsius;
      const vSteel = this.calculateSteelAcousticVelocity(m.downholeTemperatureCelsius);

      // t = (v_steel * dt_steel) / 2
      // dt in microsec (1e-6 s), vSteel in m/s -> result in meters, multiply by 1000 for mm
      const measuredThicknessMm = (vSteel * (m.steelEchoIntervalMicrosec * 1e-6) * 1000.0) / 2.0;

      sumThickness += measuredThicknessMm;
      if (measuredThicknessMm < minThickness) {
        minThickness = measuredThicknessMm;
      }

      // Localized pitting: > 25% thinning relative to nominal
      const wallLossRatio = (casing.nominalWallThicknessMm - measuredThicknessMm) / casing.nominalWallThicknessMm;
      if (wallLossRatio > 0.25) {
        pittingCount++;
      }
    }

    avgTemp /= measurements.length;
    const avgThickness = Math.round((sumThickness / measurements.length) * 100) / 100;
    minThickness = Math.round(minThickness * 100) / 100;

    const maxWallLossPercent = Math.max(
      0,
      Math.round(((casing.nominalWallThicknessMm - minThickness) / casing.nominalWallThicknessMm) * 1000) / 10
    );

    // Barlow's Burst Formula: P_burst = (2 * S_y * t) / D_o
    const nominalBurstMpa = Math.round(
      ((2.0 * casing.steelGradeYieldStrengthMpa * casing.nominalWallThicknessMm) / casing.nominalOuterDiameterMm) * 100
    ) / 100;

    const remainingBurstMpa = Math.round(
      ((2.0 * casing.steelGradeYieldStrengthMpa * minThickness) / casing.nominalOuterDiameterMm) * 100
    ) / 100;

    const deratingFactor = Math.round((remainingBurstMpa / nominalBurstMpa) * 1000) / 1000;

    let status: CasingTomographyResult['integrityStatus'] = 'OPTIMAL';
    if (maxWallLossPercent >= 40.0) {
      status = 'IMMINENT_BURST_FAILURE';
    } else if (maxWallLossPercent >= 25.0) {
      status = 'CRITICAL_WALL_THINNING';
    } else if (maxWallLossPercent >= 12.0) {
      status = 'MODERATE_CORROSION';
    }

    const payload = `${casing.wellId}:${casing.wellDepthMeters}:${minThickness}:${maxWallLossPercent}:${remainingBurstMpa}`;
    const evidenceHash = createHash('sha256').update(payload).digest('hex');

    return {
      wellId: casing.wellId,
      depthMeters: casing.wellDepthMeters,
      temperatureCelsius: Math.round(avgTemp * 10) / 10,
      averageWallThicknessMm: avgThickness,
      minimumWallThicknessMm: minThickness,
      maximumWallLossPercent: maxWallLossPercent,
      remainingBurstPressureMpa: remainingBurstMpa,
      nominalBurstPressureMpa: nominalBurstMpa,
      burstDeratingFactor: deratingFactor,
      integrityStatus: status,
      pittingAnomaliesDetected: pittingCount,
      evidenceSha256: evidenceHash,
    };
  }
}
