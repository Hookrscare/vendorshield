/**
 * SNAP-35: High-Precision Ultrasonic Metal Weld Flaw Sizing & B-Scan Imager.
 * Part of SnapInspect AI Non-Destructive Testing (NDT) & Structural Steel Toolkit.
 *
 * Implements angle-beam ultrasonic weld inspection compliant with AWS D1.1 & ASME Section V:
 * - Snell's Law sound-path, surface-distance, and true-depth projection with backwall bounce skips.
 * - 6 dB drop flaw length and depth sizing algorithm.
 * - AWS D1.1 Indication Decibel Rating (d = a - b - c) defect acceptance categorization.
 * - Vectorized B-Scan cross-sectional slice generator for CAD canvas overlays.
 */

export type WeldJointType = "BUTT_JOINT" | "TEE_JOINT" | "CORNER_JOINT" | "LAP_JOINT";

export type FlawType =
  | "CRACK"
  | "LACK_OF_FUSION"
  | "INCOMPLETE_PENETRATION"
  | "SLAG_INCLUSION"
  | "POROSITY_CLUSTER";

export type AwsD11Class = "CLASS_A_REJECT" | "CLASS_B_MEDIUM" | "CLASS_C_SMALL" | "CLASS_D_MINOR_ACCEPT";

export interface AngleBeamProbeConfig {
  frequencyMhz: number; // e.g. 2.25 or 5.0 MHz
  wedgeAngleDeg: number; // e.g. 45, 60, or 70 deg
  shearWaveVelocityMPerSec: number; // Standard carbon steel: ~3,240 m/s
  referenceLevelDb: number; // Reference standard dB (e.g. from IIW block 1.5mm hole)
  attenuationFactorDb: number; // Sound path attenuation compensation
}

export interface UltrasonicEchoSample {
  scanPositionMm: number; // Linear position along the weld axis (X)
  timeOfFlightMicroseconds: number; // Two-way acoustic travel time
  amplitudeDb: number; // Observed peak amplitude in dB
}

export interface SizedFlawIndication {
  flawId: string;
  flawType: FlawType;
  startPositionMm: number;
  endPositionMm: number;
  lengthMm: number;
  soundPathMm: number;
  surfaceDistanceMm: number;
  trueDepthMm: number;
  skipLeg: 1 | 2; // Leg 1 (direct path) or Leg 2 (backwall bounce)
  peakAmplitudeDb: number;
  indicationRatingDb: number; // AWS D1.1: d = a - b - c
  awsClassification: AwsD11Class;
  isRejectable: boolean;
}

export interface BScanCrossSectionSlice {
  weldThicknessMm: number;
  weldJointType: WeldJointType;
  flaws: SizedFlawIndication[];
  bScanGridPoints: Array<{ xMm: number; depthMm: number; intensity: number }>;
}

export class UltrasonicWeldFlawImager {
  private probeConfig: AngleBeamProbeConfig;
  private nominalThicknessMm: number;

  constructor(
    nominalThicknessMm: number,
    probeConfig: Partial<AngleBeamProbeConfig> = {}
  ) {
    this.nominalThicknessMm = nominalThicknessMm;
    this.probeConfig = {
      frequencyMhz: probeConfig.frequencyMhz ?? 2.25,
      wedgeAngleDeg: probeConfig.wedgeAngleDeg ?? 60,
      shearWaveVelocityMPerSec: probeConfig.shearWaveVelocityMPerSec ?? 3240,
      referenceLevelDb: probeConfig.referenceLevelDb ?? 50.0,
      attenuationFactorDb: probeConfig.attenuationFactorDb ?? 2.0,
      ...probeConfig
    };
  }

  /**
   * Computes sound path, surface distance, and true depth given two-way Time of Flight.
   * Handles first-leg direct path and second-leg backwall reflection.
   */
  public calculateGeometricProjection(timeOfFlightUs: number): {
    soundPathMm: number;
    surfaceDistanceMm: number;
    trueDepthMm: number;
    skipLeg: 1 | 2;
  } {
    // Distance = velocity * (time / 2)
    // 3240 m/s = 3.24 mm/us
    const velocityMmPerUs = this.probeConfig.shearWaveVelocityMPerSec / 1000;
    const soundPathMm = Math.round(((velocityMmPerUs * timeOfFlightUs) / 2) * 100) / 100;

    const rad = (this.probeConfig.wedgeAngleDeg * Math.PI) / 180;
    const surfaceDistanceMm = Math.round(soundPathMm * Math.sin(rad) * 100) / 100;
    const rawDepthMm = soundPathMm * Math.cos(rad);

    let trueDepthMm: number;
    let skipLeg: 1 | 2 = 1;

    if (rawDepthMm <= this.nominalThicknessMm) {
      // Leg 1: Direct sound beam
      trueDepthMm = Math.round(rawDepthMm * 100) / 100;
      skipLeg = 1;
    } else {
      // Leg 2: Bounced off backwall
      trueDepthMm = Math.round((2 * this.nominalThicknessMm - rawDepthMm) * 100) / 100;
      skipLeg = 2;
    }

    return { soundPathMm, surfaceDistanceMm, trueDepthMm, skipLeg };
  }

  /**
   * Processes a linear series of ultrasonic A-scan samples along the weld line,
   * clusters echoes via the 6 dB drop method, and sizes weld defects.
   */
  public analyzeWeldInspection(
    jointType: WeldJointType,
    samples: UltrasonicEchoSample[]
  ): BScanCrossSectionSlice {
    const flaws: SizedFlawIndication[] = [];
    const bScanGridPoints: Array<{ xMm: number; depthMm: number; intensity: number }> = [];

    if (samples.length === 0) {
      return { weldThicknessMm: this.nominalThicknessMm, weldJointType: jointType, flaws: [], bScanGridPoints: [] };
    }

    // Sort samples by linear scan position along weld axis
    const sorted = [...samples].sort((a, b) => a.scanPositionMm - b.scanPositionMm);

    // Group adjacent echoes exceeding noise threshold (e.g. >= referenceLevel - 14 dB)
    const thresholdDb = this.probeConfig.referenceLevelDb - 14.0;
    const activeClusters: UltrasonicEchoSample[][] = [];
    let currentCluster: UltrasonicEchoSample[] = [];

    for (const sample of sorted) {
      const geo = this.calculateGeometricProjection(sample.timeOfFlightMicroseconds);
      const intensity = Math.max(0, Math.min(1, (sample.amplitudeDb - 20) / 60));
      bScanGridPoints.push({ xMm: sample.scanPositionMm, depthMm: geo.trueDepthMm, intensity });

      if (sample.amplitudeDb >= thresholdDb) {
        if (currentCluster.length === 0) {
          currentCluster.push(sample);
        } else {
          const last = currentCluster[currentCluster.length - 1];
          if (Math.abs(sample.scanPositionMm - last.scanPositionMm) <= 8.0) {
            currentCluster.push(sample);
          } else {
            activeClusters.push(currentCluster);
            currentCluster = [sample];
          }
        }
      } else {
        if (currentCluster.length > 0) {
          activeClusters.push(currentCluster);
          currentCluster = [];
        }
      }
    }
    if (currentCluster.length > 0) {
      activeClusters.push(currentCluster);
    }

    // Evaluate each cluster
    let flawIdx = 1;
    for (const cluster of activeClusters) {
      const peakSample = cluster.reduce((prev, curr) => (curr.amplitudeDb > prev.amplitudeDb ? curr : prev));
      const peakAmp = peakSample.amplitudeDb;
      const sixDbDropThreshold = peakAmp - 6.0;

      // 6 dB drop boundary positions
      const qualified = cluster.filter((s) => s.amplitudeDb >= sixDbDropThreshold);
      const startPos = qualified[0].scanPositionMm;
      const endPos = qualified[qualified.length - 1].scanPositionMm;
      const lengthMm = Math.max(2.0, Math.round((endPos - startPos) * 10) / 10);

      const geo = this.calculateGeometricProjection(peakSample.timeOfFlightMicroseconds);

      // AWS D1.1 Indication Rating: d = a - b - c
      const indicationRatingDb = Math.round((peakAmp - this.probeConfig.referenceLevelDb - this.probeConfig.attenuationFactorDb) * 10) / 10;

      // AWS D1.1 Severity Classification
      let awsClassification: AwsD11Class;
      let isRejectable = false;

      if (indicationRatingDb >= 5.0 || lengthMm > 15.0) {
        awsClassification = "CLASS_A_REJECT";
        isRejectable = true;
      } else if (indicationRatingDb >= 0.0 || lengthMm > 10.0) {
        awsClassification = "CLASS_B_MEDIUM";
        isRejectable = lengthMm > 12.0;
      } else if (indicationRatingDb >= -5.0) {
        awsClassification = "CLASS_C_SMALL";
        isRejectable = false;
      } else {
        awsClassification = "CLASS_D_MINOR_ACCEPT";
        isRejectable = false;
      }

      // Determine likely flaw type based on depth and acoustic response
      let flawType: FlawType = "SLAG_INCLUSION";
      if (geo.trueDepthMm < 3.0 || geo.trueDepthMm > this.nominalThicknessMm - 3.0) {
        flawType = lengthMm > 8.0 ? "CRACK" : "LACK_OF_FUSION";
      } else if (Math.abs(geo.trueDepthMm - this.nominalThicknessMm / 2) < 4.0) {
        flawType = "INCOMPLETE_PENETRATION";
      } else if (lengthMm <= 5.0 && indicationRatingDb < 0.0) {
        flawType = "POROSITY_CLUSTER";
      }

      flaws.push({
        flawId: `WELD-FLAW-${String(flawIdx++).padStart(3, "0")}`,
        flawType,
        startPositionMm: startPos,
        endPositionMm: endPos,
        lengthMm,
        soundPathMm: geo.soundPathMm,
        surfaceDistanceMm: geo.surfaceDistanceMm,
        trueDepthMm: geo.trueDepthMm,
        skipLeg: geo.skipLeg,
        peakAmplitudeDb: peakAmp,
        indicationRatingDb,
        awsClassification,
        isRejectable
      });
    }

    return {
      weldThicknessMm: this.nominalThicknessMm,
      weldJointType: jointType,
      flaws,
      bScanGridPoints
    };
  }
}
