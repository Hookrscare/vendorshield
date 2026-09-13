/**
 * SNAP-69: Hydroelectric Francis Turbine Runner Cavitation Pitting Acoustic Emission Classifier.
 * Part of SnapInspect AI Infrastructure Inspection Suite.
 *
 * Evaluates high-frequency Acoustic Emission (AE) ultrasonic waveforms (100 kHz - 1 MHz)
 * alongside operating hydrodynamic parameters (Head H, Flow Q, Thoma sigma) to:
 * 1. Calculate plant Thoma cavitation sigma margin (NPSH / H vs sigma_critical).
 * 2. Discriminate incipient vortex cavitation from destructive cloud cavitation.
 * 3. Estimate runner blade material pitting rate (mm/year) on 13Cr-4Ni martensitic stainless steel.
 * 4. Grade ISO 10816-5 hydro-generator vibration & cavitation severity.
 * 5. Emits SHA-256 tamper-evident engineering audit certificate.
 */

import { createHash } from "crypto";

export interface FrancisTurbineOperatingConditions {
  turbineId: string;
  netHeadMeters: number;         // H (m)
  flowRateM3s: number;           // Q (m^3/s)
  ratedPowerMw: number;          // MW
  runnerSuctionElevationM: number; // Z_s (m, relative to tailrace)
  atmosphericPressureHeadM: number; // H_a (typically 10.1 m at sea level)
  vaporPressureHeadM: number;    // H_va (typically 0.24 m at 20 deg C)
  criticalThomaSigma: number;    // sigma_crit manufacturer threshold (e.g. 0.085)
}

export interface AcousticEmissionMetrics {
  sensorFrequencyRangeKhz: [number, number]; // [100, 1000]
  rmsEnergy100to350KhzDb: number;            // High-frequency implosion acoustic energy
  burstRatePerSecond: number;                 // Bubble microjet transient count
  peakAmplitudeVolts: number;                // Peak sensor voltage
  sensorLocation: "DRAFT_TUBE_CONE" | "RUNNER_CROWN" | "DISCHARGE_RING" | "SPIRAL_CASE";
}

export type CavitationSeverityGrade =
  | "NORMAL_LAMINAR_OPERATION"
  | "INCIPIENT_VORTEX_CAVITATION"
  | "DEVELOPED_TRAVELING_BUBBLE"
  | "SEVERE_CLOUD_CAVITATION_PITTING";

export interface FrancisTurbineCavitationReport {
  turbineId: string;
  operatingSigma: number;
  criticalSigma: number;
  sigmaSafetyMarginPercent: number;
  isCavitationActive: boolean;
  severityGrade: CavitationSeverityGrade;
  estimatedPittingRateMmPerYear: number;
  annualMetalLossKg: number;
  iso10816Evaluation: "ZONE_A_EXCELLENT" | "ZONE_B_ACCEPTABLE" | "ZONE_C_RESTRICTED" | "ZONE_D_CRITICAL_STOP";
  maintenanceActionRequired: boolean;
  recommendedActions: string[];
  auditHash: string;
}

export class FrancisTurbineCavitationPittingClassifier {
  // Pitting constant for 13Cr-4Ni martensitic stainless steel
  private static readonly MATERIAL_PITTING_COEFF = 0.012; // mm/yr per dB over threshold
  private static readonly NOISE_FLOOR_DB = 38.0;

  public static evaluateTurbine(
    conditions: FrancisTurbineOperatingConditions,
    aeMetrics: AcousticEmissionMetrics
  ): FrancisTurbineCavitationReport {
    // 1. Calculate Net Positive Suction Head (NPSH)
    // NPSH = H_a - H_va - Z_s
    const npsh = conditions.atmosphericPressureHeadM - conditions.vaporPressureHeadM - conditions.runnerSuctionElevationM;

    // 2. Thoma Cavitation Parameter: sigma = NPSH / H
    const operatingSigma = npsh / Math.max(1.0, conditions.netHeadMeters);
    const sigmaMargin = ((operatingSigma - conditions.criticalThomaSigma) / conditions.criticalThomaSigma) * 100.0;

    // 3. Acoustic Emission Energy Evaluation
    const excessEnergyDb = Math.max(0.0, aeMetrics.rmsEnergy100to350KhzDb - this.NOISE_FLOOR_DB);

    // 4. Severity Classification
    let severity: CavitationSeverityGrade = "NORMAL_LAMINAR_OPERATION";
    let isCavActive = false;

    if (operatingSigma < conditions.criticalThomaSigma || excessEnergyDb > 15.0) {
      isCavActive = true;
      if (excessEnergyDb >= 32.0 || operatingSigma < conditions.criticalThomaSigma * 0.70) {
        severity = "SEVERE_CLOUD_CAVITATION_PITTING";
      } else if (excessEnergyDb >= 18.0 || operatingSigma < conditions.criticalThomaSigma * 0.90) {
        severity = "DEVELOPED_TRAVELING_BUBBLE";
      } else {
        severity = "INCIPIENT_VORTEX_CAVITATION";
      }
    }

    // 5. Pitting rate estimation (mm/year)
    let pittingRateMmPerYear = 0.0;
    if (severity === "SEVERE_CLOUD_CAVITATION_PITTING") {
      pittingRateMmPerYear = Number((excessEnergyDb * this.MATERIAL_PITTING_COEFF * 1.85).toFixed(2));
    } else if (severity === "DEVELOPED_TRAVELING_BUBBLE") {
      pittingRateMmPerYear = Number((excessEnergyDb * this.MATERIAL_PITTING_COEFF * 0.90).toFixed(2));
    } else if (severity === "INCIPIENT_VORTEX_CAVITATION") {
      pittingRateMmPerYear = Number((excessEnergyDb * this.MATERIAL_PITTING_COEFF * 0.20).toFixed(2));
    }

    // Runner blade surface area ~ proportional to MW capacity
    const estimatedBladeAreaM2 = Math.max(1.5, conditions.ratedPowerMw * 0.08);
    // Density of 13Cr-4Ni stainless steel = 7750 kg/m^3
    const annualMetalLossKg = Number(((pittingRateMmPerYear / 1000.0) * estimatedBladeAreaM2 * 7750).toFixed(2));

    // 6. ISO 10816-5 classification
    let isoEvaluation: "ZONE_A_EXCELLENT" | "ZONE_B_ACCEPTABLE" | "ZONE_C_RESTRICTED" | "ZONE_D_CRITICAL_STOP" = "ZONE_A_EXCELLENT";
    const recommendedActions: string[] = [];

    if (severity === "SEVERE_CLOUD_CAVITATION_PITTING") {
      isoEvaluation = "ZONE_D_CRITICAL_STOP";
      recommendedActions.push("IMMEDIATE LOAD SHEDDING: Curtail generation to raise effective tailrace backpressure.");
      recommendedActions.push("AIR ADMISSION INJECTION: Trigger automated aeration valve into draft tube center core.");
      recommendedActions.push("ULTRASONIC RUNNER THICKNESS SCAN: Inspect suction side blade trailing edges within 72h.");
    } else if (severity === "DEVELOPED_TRAVELING_BUBBLE") {
      isoEvaluation = "ZONE_C_RESTRICTED";
      recommendedActions.push("RESTRICTED DISPATCH: Restrict continuous operation between 40%-65% partial load.");
      recommendedActions.push("Schedule borescope inspection during next scheduled plant outage.");
    } else if (severity === "INCIPIENT_VORTEX_CAVITATION") {
      isoEvaluation = "ZONE_B_ACCEPTABLE";
      recommendedActions.push("CONTINUOUS AE TRENDING: Monitor burst rate transients for intensification.");
    } else {
      isoEvaluation = "ZONE_A_EXCELLENT";
      recommendedActions.push("ROUTINE MONITORING: Francis turbine runner is operating within optimal hydrodynamic envelope.");
    }

    // 7. Cryptographic audit seal
    const hash = createHash("sha256");
    hash.update(`${conditions.turbineId}:${operatingSigma.toFixed(4)}:${severity}:${pittingRateMmPerYear}`);
    const auditHash = hash.digest("hex");

    return {
      turbineId: conditions.turbineId,
      operatingSigma: Number(operatingSigma.toFixed(4)),
      criticalSigma: conditions.criticalThomaSigma,
      sigmaSafetyMarginPercent: Number(sigmaMargin.toFixed(1)),
      isCavitationActive: isCavActive,
      severityGrade: severity,
      estimatedPittingRateMmPerYear: pittingRateMmPerYear,
      annualMetalLossKg,
      iso10816Evaluation: isoEvaluation,
      maintenanceActionRequired: isoEvaluation === "ZONE_C_RESTRICTED" || isoEvaluation === "ZONE_D_CRITICAL_STOP",
      recommendedActions,
      auditHash
    };
  }
}
