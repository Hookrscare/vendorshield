/**
 * src/lib/snapinspect/cavern-shotcrete-spalling-ultrasonic-profiler.ts
 * Part of SnapInspect AI Tactical Field Inspection & Geotechnical NDT Suite.
 *
 * SNAP-71: Deep Underground Cavern Shotcrete Spalling Ultrasonic Resonance Profiler.
 * 1. Evaluates acoustic impact-echo and ultrasonic resonance frequencies (f0) across cavern shotcrete liners.
 * 2. Compares apparent flexural resonant thickness against nominal liner thickness to detect interfacial debonding.
 * 3. Measures acoustic spectral damping ratio (zeta) to differentiate solid rock coupling from detached drum ringing.
 * 4. Yields geotechnical spalling risk tiers, automated remediation protocols, and SHA-256 inspection seals.
 */

import { createHash } from "crypto";

export interface ShotcreteLinerSpec {
  cavernSectionId: string;
  designShotcreteThicknessMm: number;  // e.g. 150 mm
  shotcreteCompressiveStrengthMpa: number; // e.g. 40 MPa
  nominalCompressionWaveVelocityMps: number; // e.g. 3800 m/s
  criticalDebondingThicknessRatioThreshold: number; // e.g. 1.25
}

export interface UltrasonicResonanceScan {
  sensorPointId: string;
  dominantResonanceFrequencyKhz: number; // f0 in kHz (e.g. 12.6 kHz)
  spectralPeakAmplitudeDb: number;
  acousticDampingRatioZeta: number;      // e.g. 0.02 (ringing) vs 0.12 (coupled)
}

export interface ShotcreteDebondingReport {
  cavernSectionId: string;
  sensorPointId: string;
  apparentVibratingThicknessMm: number;
  thicknessRatioToDesign: number;
  isInterfacialDebondingDetected: boolean;
  spallingRiskLevel: "SECURE_ROCK_BONDING" | "EARLY_INTERFACIAL_DELAMINATION" | "CRITICAL_SPALLING_ROCKBURST_IMMINENT";
  geotechnicalRemediationAction: string;
  inspectionAuditHash: string;
}

export class CavernShotcreteSpallingUltrasonicProfiler {
  /**
   * Evaluates ultrasonic resonance signals to determine shotcrete-rock interfacial integrity.
   */
  public static evaluateResonance(
    spec: ShotcreteLinerSpec,
    scan: UltrasonicResonanceScan
  ): ShotcreteDebondingReport {
    if (scan.dominantResonanceFrequencyKhz <= 0) {
      throw new Error("Resonance frequency must be strictly positive.");
    }

    // Impact-echo / flexural resonance thickness equation:
    // T_apparent = Cp / (2 * f0)
    // where Cp is P-wave velocity in m/s, f0 in Hz (kHz * 1000)
    const freqHz = scan.dominantResonanceFrequencyKhz * 1000.0;
    const apparentThicknessM = spec.nominalCompressionWaveVelocityMps / (2.0 * freqHz);
    const apparentThicknessMm = Math.round(apparentThicknessM * 1000.0 * 10.0) / 10.0;

    const thicknessRatio = Math.round((apparentThicknessMm / spec.designShotcreteThicknessMm) * 100) / 100;

    // A debonded shotcrete shell rings at its isolated single-layer thickness with low damping (zeta < 0.04).
    // Well-bonded shotcrete exhibits either high apparent thickness (> 1.5x) or high damping (zeta > 0.08)
    const isDebonded = (
      Math.abs(apparentThicknessMm - spec.designShotcreteThicknessMm) <= 25.0 &&
      scan.acousticDampingRatioZeta < 0.05
    );

    let riskLevel: "SECURE_ROCK_BONDING" | "EARLY_INTERFACIAL_DELAMINATION" | "CRITICAL_SPALLING_ROCKBURST_IMMINENT";
    let remediation: string;

    if (isDebonded && scan.acousticDampingRatioZeta <= 0.025) {
      riskLevel = "CRITICAL_SPALLING_ROCKBURST_IMMINENT";
      remediation = "EMERGENCY: Complete interfacial detachment detected. Evacuate zone; deploy robotic steel mesh & post-grout rock bolts immediately.";
    } else if (isDebonded || scan.acousticDampingRatioZeta < 0.06) {
      riskLevel = "EARLY_INTERFACIAL_DELAMINATION";
      remediation = "WARNING: Partial micro-void delamination at rock-shotcrete interface. Install telltale extensometers and schedule pressure grouting.";
    } else {
      riskLevel = "SECURE_ROCK_BONDING";
      remediation = "NORMAL: Robust acoustic energy transfer into competent host rock mass. Maintain standard quarterly NDT inspection cycle.";
    }

    const digest = createHash("sha256")
      .update(`${spec.cavernSectionId}:${scan.sensorPointId}:${apparentThicknessMm}:${riskLevel}`)
      .digest("hex");

    return {
      cavernSectionId: spec.cavernSectionId,
      sensorPointId: scan.sensorPointId,
      apparentVibratingThicknessMm: apparentThicknessMm,
      thicknessRatioToDesign: thicknessRatio,
      isInterfacialDebondingDetected: isDebonded,
      spallingRiskLevel: riskLevel,
      geotechnicalRemediationAction: remediation,
      inspectionAuditHash: digest
    };
  }
}
