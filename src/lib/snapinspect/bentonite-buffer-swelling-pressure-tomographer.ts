/**
 * SNAP-71: Deep Geological Nuclear Waste Repository Bentonite Buffer Swelling Pressure Tomographer
 * 
 * Part of SnapInspect AI Tactical Field Inspection CAD & Mobile Voice AI.
 * Analyzes multi-sensor spatial tomography across compacted MX-80 bentonite engineered barrier blocks
 * surrounding spent nuclear fuel canisters in Deep Geological Repositories (DGR, e.g., KBS-3).
 * Evaluates swelling pressure development, hydration saturation fronts, void piping risk, and canister shear stress.
 */

import { createHash } from 'crypto';

export interface BentoniteBufferSpec {
  canisterId: string;
  depositionHoleId: string;
  bufferMaterial: 'MX_80_SODIUM_BENTONITE' | 'DEPONIT_CA_N_CALCIUM_BENTONITE';
  targetDryDensityKgM3: number; // typically 1550 - 1700 kg/m^3
  minSafeSwellingPressureMpa: number; // typically 5.0 MPa (microbial prevention / self-healing)
  maxAllowableSwellingPressureMpa: number; // typically 15.0 MPa (rock fracturing / canister pinch limit)
}

export interface TomographicSensorMeasurement {
  sensorId: string;
  radialDistanceMeters: number; // radius from canister centerline (0.55 - 0.95 m)
  azimuthAngleDegrees: number; // 0 - 360 deg
  elevationMeters: number; // 0.0 - 6.0 m along deposition hole
  measuredSwellingPressureMpa: number;
  waterContentPercent: number; // gravimetric water content w (typically 12 - 25%)
  electricalResistivityOhmM: number;
}

export interface BufferAnomalyFinding {
  anomalyType: 'INSUFFICIENT_SWELLING_PRESSURE' | 'EXCESSIVE_ROCK_OVERSTRESS' | 'AZIMUTHAL_SHEAR_ASYMMETRY' | 'EROSION_PIPING_CHANNEL';
  severity: 'ACCEPTABLE' | 'ELEVATED_WATCH' | 'CRITICAL_INTERVENTION';
  elevationMeters: number;
  azimuthAngleDegrees: number;
  description: string;
}

export interface BentoniteTomographyAssessment {
  canisterId: string;
  depositionHoleId: string;
  meanSwellingPressureMpa: number;
  peakSwellingPressureMpa: number;
  minSwellingPressureMpa: number;
  swellingPressureAsymmetryRatio: number; // peak / min ratio
  meanDegreeOfSaturationPercent: number;
  isBufferBarrierCertified: boolean;
  totalAnomaliesDetected: number;
  anomalies: BufferAnomalyFinding[];
  cryptographicAuditDigest: string;
}

export class BentoniteBufferSwellingPressureTomographer {
  private static readonly SOLID_GRAIN_DENSITY_KG_M3 = 2780.0; // Grain density of MX-80 montmorillonite
  private static readonly WATER_DENSITY_KG_M3 = 1000.0;

  /**
   * Processes tomographic spatial sensor array and computes buffer barrier integrity.
   */
  public analyzeTomography(
    spec: BentoniteBufferSpec,
    sensors: TomographicSensorMeasurement[]
  ): BentoniteTomographyAssessment {
    if (!sensors || sensors.length === 0) {
      throw new Error('At least one tomographic sensor measurement is required.');
    }

    if (spec.minSafeSwellingPressureMpa <= 0 || spec.maxAllowableSwellingPressureMpa <= spec.minSafeSwellingPressureMpa) {
      throw new Error('Invalid swelling pressure thresholds.');
    }

    const pressures = sensors.map((s) => s.measuredSwellingPressureMpa);
    const sumPressure = pressures.reduce((acc, val) => acc + val, 0);
    const meanPressure = sumPressure / sensors.length;
    const minPressure = Math.min(...pressures);
    const peakPressure = Math.max(...pressures);
    const asymmetryRatio = minPressure > 0.001 ? peakPressure / minPressure : 99.0;

    const anomalies: BufferAnomalyFinding[] = [];

    // Calculate degree of saturation S_r = (w * rho_d) / (e * rho_w)
    // Void ratio e = (rho_s / rho_d) - 1
    const voidRatio = (BentoniteBufferSwellingPressureTomographer.SOLID_GRAIN_DENSITY_KG_M3 / spec.targetDryDensityKgM3) - 1.0;
    const saturations = sensors.map((s) => {
      const wFraction = s.waterContentPercent / 100.0;
      const sr = (wFraction * spec.targetDryDensityKgM3) / (voidRatio * BentoniteBufferSwellingPressureTomographer.WATER_DENSITY_KG_M3);
      return Math.min(100.0, Math.max(0.0, sr * 100.0));
    });
    const meanSaturation = saturations.reduce((acc, v) => acc + v, 0) / saturations.length;

    for (const s of sensors) {
      // 1. Under-pressure risk (< 5.0 MPa) allows microbial activity or fissures
      if (s.measuredSwellingPressureMpa < spec.minSafeSwellingPressureMpa) {
        anomalies.push({
          anomalyType: 'INSUFFICIENT_SWELLING_PRESSURE',
          severity: s.measuredSwellingPressureMpa < spec.minSafeSwellingPressureMpa * 0.6 ? 'CRITICAL_INTERVENTION' : 'ELEVATED_WATCH',
          elevationMeters: s.elevationMeters,
          azimuthAngleDegrees: s.azimuthAngleDegrees,
          description: `Swelling pressure ${s.measuredSwellingPressureMpa.toFixed(2)} MPa is below safety threshold ${spec.minSafeSwellingPressureMpa} MPa.`,
        });
      }

      // 2. Over-pressure risk (> 15.0 MPa) risks rock fracturing or canister collapse
      if (s.measuredSwellingPressureMpa > spec.maxAllowableSwellingPressureMpa) {
        anomalies.push({
          anomalyType: 'EXCESSIVE_ROCK_OVERSTRESS',
          severity: 'CRITICAL_INTERVENTION',
          elevationMeters: s.elevationMeters,
          azimuthAngleDegrees: s.azimuthAngleDegrees,
          description: `Swelling pressure ${s.measuredSwellingPressureMpa.toFixed(2)} MPa exceeds allowable rock limit ${spec.maxAllowableSwellingPressureMpa} MPa.`,
        });
      }

      // 3. Low resistivity + low pressure indicates piping / erosion washout
      if (s.electricalResistivityOhmM < 1.5 && s.measuredSwellingPressureMpa < spec.minSafeSwellingPressureMpa * 0.7) {
        anomalies.push({
          anomalyType: 'EROSION_PIPING_CHANNEL',
          severity: 'CRITICAL_INTERVENTION',
          elevationMeters: s.elevationMeters,
          azimuthAngleDegrees: s.azimuthAngleDegrees,
          description: `Low resistivity (${s.electricalResistivityOhmM.toFixed(1)} Ohm*m) and deficient swelling pressure indicate active groundwater piping channel.`,
        });
      }
    }

    // 4. Asymmetry check (ratio > 3.0 indicates uneven swelling causing canister tilting)
    if (asymmetryRatio > 3.0 && sensors.length >= 4) {
      anomalies.push({
        anomalyType: 'AZIMUTHAL_SHEAR_ASYMMETRY',
        severity: asymmetryRatio > 4.5 ? 'CRITICAL_INTERVENTION' : 'ELEVATED_WATCH',
        elevationMeters: meanPressure,
        azimuthAngleDegrees: 0,
        description: `Azimuthal swelling pressure asymmetry ratio ${asymmetryRatio.toFixed(2)} exceeds allowable limit (3.0).`,
      });
    }

    const hasCritical = anomalies.some((a) => a.severity === 'CRITICAL_INTERVENTION');
    const isCertified = !hasCritical && meanPressure >= spec.minSafeSwellingPressureMpa && meanPressure <= spec.maxAllowableSwellingPressureMpa;

    const rawPayload = `${spec.canisterId}:${spec.depositionHoleId}:${meanPressure.toFixed(3)}:${peakPressure.toFixed(3)}:${asymmetryRatio.toFixed(3)}:${isCertified}`;
    const digest = createHash('sha256').update(rawPayload).digest('hex');

    return {
      canisterId: spec.canisterId,
      depositionHoleId: spec.depositionHoleId,
      meanSwellingPressureMpa: Number(meanPressure.toFixed(2)),
      peakSwellingPressureMpa: Number(peakPressure.toFixed(2)),
      minSwellingPressureMpa: Number(minPressure.toFixed(2)),
      swellingPressureAsymmetryRatio: Number(asymmetryRatio.toFixed(2)),
      meanDegreeOfSaturationPercent: Number(meanSaturation.toFixed(1)),
      isBufferBarrierCertified: isCertified,
      totalAnomaliesDetected: anomalies.length,
      anomalies,
      cryptographicAuditDigest: digest,
    };
  }
}
