/**
 * bentonite-buffer-swelling-tomographer.ts
 * SNAP-71: Deep Geological Nuclear Waste Repository Bentonite Buffer Swelling Pressure Tomographer.
 * Part of SnapInspect AI Tactical Field Inspection CAD & NDT Diagnostics.
 *
 * Engineered Barrier System (EBS) multi-sensor tomographic diagnostics for deep geological repositories:
 * 1. Evaluates multi-channel circumferential (0°, 90°, 180°, 270°) and axial radial swelling pressure (MPa).
 * 2. Models saturated MX-80 / Ca-bentonite swelling equilibrium against target safety envelope (5.0 - 12.0 MPa).
 * 3. Quantifies asymmetric swelling anisotropy ratio (P_max / P_min) to detect uneven groundwater hydration or piping erosion.
 * 4. Assesses compliance with IAEA Safety Standards Series (SSR-5) for geological disposal facilities.
 */

export interface BentoniteSensorReading {
  sensorId: string;
  depthMeters: number;
  azimuthDegrees: number; // 0 to 360
  swellingPressureMpa: number;
  relativeHumidityPercent: number;
  temperatureCelsius: number;
}

export interface EngineeredBarrierProfile {
  canisterId: string;
  hostRockFormation: 'CRYSTALLINE_GRANITE' | 'OPALINUS_CLAY' | 'BEDDED_SALT';
  targetDryDensityKgM3: number; // e.g. 1600 - 1750 kg/m3 for MX-80
  installationDateIso: string;
  sensorReadings: BentoniteSensorReading[];
}

export type BufferSealingIntegrity =
  | 'OPTIMAL_SEALING'
  | 'UNDER_CONSOLIDATED_EROSION_RISK'
  | 'EXCESSIVE_LITHIC_OVERSTRESS'
  | 'ASYMMETRIC_SHEAR_ANISOTROPY';

export interface SwellingTomographyAssessment {
  canisterId: string;
  meanSwellingPressureMpa: number;
  minSwellingPressureMpa: number;
  maxSwellingPressureMpa: number;
  anisotropyRatio: number;
  meanSaturationEstimate: number; // 0.0 to 1.0
  integrityStatus: BufferSealingIntegrity;
  iaeaSsr5Compliant: boolean;
  microbialInhibitionEffective: boolean;
  recommendedAction: string;
}

export class BentoniteBufferSwellingTomographer {
  // Regulatory & Geotechnical Thresholds (IAEA SSR-5 / SKB TR-10-47)
  public static readonly MIN_SAFE_SWELLING_PRESSURE_MPA = 5.0; // Ensures hydraulic sealing & suppresses sulfate-reducing bacteria
  public static readonly MAX_SAFE_SWELLING_PRESSURE_MPA = 12.0; // Avoids host rock fracturing or canister shear buckling
  public static readonly MAX_PERMISSIBLE_ANISOTROPY_RATIO = 1.35; // Maximum allowable P_max / P_min across circumferential sectors

  public static analyzeProfile(profile: EngineeredBarrierProfile): SwellingTomographyAssessment {
    const readings = profile.sensorReadings;
    if (!readings || readings.length === 0) {
      throw new Error(`Profile for canister ${profile.canisterId} contains no sensor telemetry.`);
    }

    let sumPressure = 0.0;
    let minP = Infinity;
    let maxP = -Infinity;
    let sumHumidity = 0.0;

    for (const r of readings) {
      sumPressure += r.swellingPressureMpa;
      if (r.swellingPressureMpa < minP) minP = r.swellingPressureMpa;
      if (r.swellingPressureMpa > maxP) maxP = r.swellingPressureMpa;
      sumHumidity += r.relativeHumidityPercent;
    }

    const meanP = Math.round((sumPressure / readings.length) * 100) / 100;
    const meanHumidity = sumHumidity / readings.length;
    const saturationEstimate = Math.min(1.0, Math.round((meanHumidity / 100.0) * 100) / 100);

    const safeMin = minP <= 0 ? 0.001 : minP;
    const anisotropyRatio = Math.round((maxP / safeMin) * 100) / 100;

    let status: BufferSealingIntegrity = 'OPTIMAL_SEALING';
    let iaeaCompliant = true;
    let microbialInhibition = true;
    let recommendedAction = 'Maintain passive long-term acoustic & piezometric tomography monitoring.';

    if (meanP < this.MIN_SAFE_SWELLING_PRESSURE_MPA) {
      status = 'UNDER_CONSOLIDATED_EROSION_RISK';
      iaeaCompliant = false;
      microbialInhibition = false;
      recommendedAction =
        'CRITICAL: Swelling pressure below 5.0 MPa threshold. Inspect for groundwater piping erosion or incomplete bentonite block hydration.';
    } else if (meanP > this.MAX_SAFE_SWELLING_PRESSURE_MPA) {
      status = 'EXCESSIVE_LITHIC_OVERSTRESS';
      iaeaCompliant = false;
      recommendedAction =
        'WARNING: Excessive swelling pressure exceeds 12.0 MPa host rock stress limit. Verify canister mechanical strain gauge telemetry.';
    } else if (anisotropyRatio > this.MAX_PERMISSIBLE_ANISOTROPY_RATIO) {
      status = 'ASYMMETRIC_SHEAR_ANISOTROPY';
      iaeaCompliant = false;
      recommendedAction =
        'ATTENTION: Differential circumferential pressure exceeds 1.35 anisotropy limit. Assess potential differential bending moments on disposal canister.';
    }

    return {
      canisterId: profile.canisterId,
      meanSwellingPressureMpa: meanP,
      minSwellingPressureMpa: Math.round(minP * 100) / 100,
      maxSwellingPressureMpa: Math.round(maxP * 100) / 100,
      anisotropyRatio,
      meanSaturationEstimate: saturationEstimate,
      integrityStatus: status,
      iaeaSsr5Compliant: iaeaCompliant,
      microbialInhibitionEffective: microbialInhibition,
      recommendedAction,
    };
  }
}
