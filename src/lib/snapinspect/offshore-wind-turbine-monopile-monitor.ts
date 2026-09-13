/**
 * src/lib/snapinspect/offshore-wind-turbine-monopile-monitor.ts
 * SNAP-59: Offshore Wind Turbine Monopile Cyclic Fatigue & Hydrodynamic Scour Monitor.
 * Part of SnapInspect AI (Tactical Field Inspection CAD & Mobile Voice AI).
 *
 * Implements DNV-ST-0126 and DNV-RP-C203 offshore foundation structural assessment:
 * - Seabed mudline hydrodynamic equilibrium scour depth estimation (current + wave Keulegan-Carpenter)
 * - Cantilever natural eigenfrequency shift and 1P/3P turbine excitation frequency resonance check
 * - Palmgren-Miner cyclic stress fatigue damage accumulation using DNV SN curves
 * - Remedial underwater rock dumping / riprap ballast volume takeoff in m³
 * - Cryptographic SHA-256 structural inspection audit hash
 */

import { createHash } from 'crypto';

export interface MonopileDimensions {
  outerDiameterMeters: number;      // e.g. 7.5 m
  wallThicknessMm: number;          // e.g. 75 mm
  waterDepthMeters: number;         // e.g. 28.0 m
  embedmentDepthMeters: number;     // e.g. 35.0 m
  steelYieldStrengthMpa: number;    // e.g. 355 MPa (S355)
  topMassKg: number;                // RNA + tower mass, e.g. 800,000 kg
}

export interface MetoceanConditions {
  currentVelocityMps: number;       // Steady seabed tidal current, e.g. 1.2 m/s
  waveSignificantHeightMeters: number; // Hs, e.g. 4.5 m
  wavePeakPeriodSeconds: number;    // Tp, e.g. 8.5 s
  turbine1pFrequencyHz: number;     // 1P rotor rotation freq, e.g. 0.20 Hz (12 RPM)
  turbine3pFrequencyHz: number;     // 3P blade pass freq, e.g. 0.60 Hz
}

export interface CyclicStressBlock {
  stressRangeMpa: number;           // Delta sigma (MPa)
  cycleCount: number;               // Observed cycles n_i
}

export interface MonopileInspectionResult {
  equilibriumScourDepthMeters: number;
  measuredScourDepthMeters: number;
  scourSeverity: 'NEGLIGIBLE' | 'MODERATE' | 'CRITICAL_UNDERMINING';
  baselineNaturalFrequencyHz: number;
  currentNaturalFrequencyHz: number;
  frequencyDropPercent: number;
  resonanceRisk1pOr3p: boolean;
  cumulativeFatigueDamage: number;  // Palmgren-Miner D_f sum(n/N)
  fatigueExhaustionRisk: boolean;   // True if D_f >= 1.0 (or safety margin >= 0.8)
  remedialRiprapVolumeM3: number;   // Volumetric rock dump required
  inspectionAttestationHash: string;
}

export class OffshoreWindTurbineMonopileMonitor {
  private readonly steelModulusPa = 2.1e11; // 210 GPa
  private readonly steelDensityKgM3 = 7850;

  /**
   * Calculates equilibrium scour depth based on Sumer & Fredsoe hydrodynamic formulation.
   */
  public estimateEquilibriumScour(
    dim: MonopileDimensions,
    metocean: MetoceanConditions
  ): number {
    const D = dim.outerDiameterMeters;
    const U_c = metocean.currentVelocityMps;
    const H_s = metocean.waveSignificantHeightMeters;
    const T_p = metocean.wavePeakPeriodSeconds;

    // Current-only baseline scour: S_c = 1.3 * D
    const S_current = 1.3 * D;

    // Orbital wave velocity amplitude at seabed
    const k = (2 * Math.PI) / (Math.max(10, dim.waterDepthMeters * 2)); // Approximate wave number
    const sinhVal = Math.sinh(Math.min(50, k * dim.waterDepthMeters));
    const U_m = sinhVal > 0 ? (Math.PI * H_s) / (T_p * sinhVal) : 0.5;

    // Keulegan-Carpenter number KC = (U_m * T_p) / D
    const KC = (U_m * T_p) / D;

    // Scour reduction factor for combined wave-current
    let S_wave_current = S_current;
    if (KC < 6.0) {
      // Very small waves reduce scour compared to pure steady current
      S_wave_current = S_current * (0.5 + 0.08 * KC);
    } else {
      S_wave_current = S_current * (1.0 - Math.exp(-0.02 * (KC - 6.0)));
    }

    return Math.max(0.2, Math.min(S_current * 1.5, S_wave_current));
  }

  /**
   * Estimates first bending natural frequency of the monopile-tower cantilever.
   */
  public calculateNaturalFrequency(
    dim: MonopileDimensions,
    scourDepthMeters: number
  ): number {
    const D = dim.outerDiameterMeters;
    const t = dim.wallThicknessMm / 1000;
    const r_o = D / 2;
    const r_i = r_o - t;

    // Second moment of area I = (pi/4) * (r_o^4 - r_i^4)
    const I = (Math.PI / 4) * (Math.pow(r_o, 4) - Math.pow(r_i, 4));

    // Effective cantilever length: water depth + tower height (est 80m) + scour depth + point of fixity (approx 4 * D)
    const totalFreeLength = dim.waterDepthMeters + 85.0 + scourDepthMeters + (1.5 * D);

    // Cantilever stiffness k = (3 * E * I) / L^3
    const k_cantilever = (3 * this.steelModulusPa * I) / Math.pow(totalFreeLength, 3);

    // Distributed mass
    const crossSectionArea = Math.PI * (Math.pow(r_o, 2) - Math.pow(r_i, 2));
    const pileMassPerMeter = crossSectionArea * this.steelDensityKgM3;
    const effectivePileMass = totalFreeLength * pileMassPerMeter * 0.23;
    const totalDynamicMass = dim.topMassKg + effectivePileMass;

    // f_0 = (1 / 2*pi) * sqrt(k / m)
    const omega = Math.sqrt(k_cantilever / totalDynamicMass);
    return omega / (2 * Math.PI);
  }

  /**
   * Palmgren-Miner rule for cumulative fatigue using DNV-RP-C203 Curve D in seawater with cathodic protection.
   * log10(N) = log10(a_bar) - m * log10(Delta sigma)
   * For Curve D: log10(a_bar) = 12.164, m = 3.0 (for N <= 10^7)
   */
  public calculateCumulativeFatigue(stressBlocks: CyclicStressBlock[]): number {
    const log10_a1 = 12.164;
    const m1 = 3.0;
    const a1 = Math.pow(10, log10_a1);

    let cumulativeDamage = 0.0;

    for (const block of stressBlocks) {
      if (block.stressRangeMpa <= 0) continue;
      // Allowable cycles N
      const N_allowable = a1 * Math.pow(block.stressRangeMpa, -m1);
      if (N_allowable > 0) {
        cumulativeDamage += block.cycleCount / N_allowable;
      }
    }

    return cumulativeDamage;
  }

  /**
   * Calculates required rock dump / riprap remediation volume in m³.
   * Inverted conical scour hole with slope angle ~ 30 degrees (friction angle).
   */
  public calculateRemedialRiprapVolume(
    outerDiameterMeters: number,
    scourDepthMeters: number,
    slopeAngleDegrees = 30
  ): number {
    if (scourDepthMeters <= 0.2) return 0.0;

    const slopeRad = (slopeAngleDegrees * Math.PI) / 180;
    const topRadius = (outerDiameterMeters / 2) + (scourDepthMeters / Math.tan(slopeRad));
    const bottomRadius = outerDiameterMeters / 2;

    // Volume of conical frustum V = (pi * h / 3) * (R^2 + R*r + r^2)
    const totalFrustumVolume = (Math.PI * scourDepthMeters / 3) * (
      Math.pow(topRadius, 2) + (topRadius * bottomRadius) + Math.pow(bottomRadius, 2)
    );

    // Subtract the monopile volume occupying that center cylinder
    const pileCylinderVolume = Math.PI * Math.pow(bottomRadius, 2) * scourDepthMeters;
    const voidVolume = Math.max(0, totalFrustumVolume - pileCylinderVolume);

    // Multiply by 1.25 for compaction and void-ratio ballast allowance
    return Math.round(voidVolume * 1.25 * 10) / 10;
  }

  public assessMonopileHealth(
    dim: MonopileDimensions,
    metocean: MetoceanConditions,
    measuredScourDepthMeters: number,
    cyclicStressHistory: CyclicStressBlock[]
  ): MonopileInspectionResult {
    const equilibriumScour = this.estimateEquilibriumScour(dim, metocean);

    let scourSeverity: MonopileInspectionResult['scourSeverity'] = 'NEGLIGIBLE';
    if (measuredScourDepthMeters > 0.5 * dim.outerDiameterMeters) {
      scourSeverity = 'CRITICAL_UNDERMINING';
    } else if (measuredScourDepthMeters > 0.2 * dim.outerDiameterMeters) {
      scourSeverity = 'MODERATE';
    }

    const baselineFreq = this.calculateNaturalFrequency(dim, 0.0);
    const currentFreq = this.calculateNaturalFrequency(dim, measuredScourDepthMeters);
    const dropPercent = Math.max(0, ((baselineFreq - currentFreq) / baselineFreq) * 100);

    // Check if current frequency is dangerously close (within 5%) to 1P or 3P
    const closeTo1P = Math.abs(currentFreq - metocean.turbine1pFrequencyHz) / metocean.turbine1pFrequencyHz < 0.05;
    const closeTo3P = Math.abs(currentFreq - metocean.turbine3pFrequencyHz) / metocean.turbine3pFrequencyHz < 0.05;
    const resonanceRisk = closeTo1P || closeTo3P;

    const cumulativeFatigue = this.calculateCumulativeFatigue(cyclicStressHistory);
    const fatigueExhaustionRisk = cumulativeFatigue >= 0.8; // Standard offshore safety factor threshold

    const remedialRiprapVolumeM3 = this.calculateRemedialRiprapVolume(
      dim.outerDiameterMeters,
      measuredScourDepthMeters
    );

    const hashRaw = `${dim.outerDiameterMeters}:${measuredScourDepthMeters}:${dropPercent.toFixed(2)}:${cumulativeFatigue.toFixed(4)}:${remedialRiprapVolumeM3}`;
    const attestationHash = createHash('sha256').update(hashRaw).digest('hex');

    return {
      equilibriumScourDepthMeters: Math.round(equilibriumScour * 100) / 100,
      measuredScourDepthMeters,
      scourSeverity,
      baselineNaturalFrequencyHz: Math.round(baselineFreq * 1000) / 1000,
      currentNaturalFrequencyHz: Math.round(currentFreq * 1000) / 1000,
      frequencyDropPercent: Math.round(dropPercent * 100) / 100,
      resonanceRisk1pOr3p: resonanceRisk,
      cumulativeFatigueDamage: Math.round(cumulativeFatigue * 10000) / 10000,
      fatigueExhaustionRisk,
      remedialRiprapVolumeM3,
      inspectionAttestationHash: attestationHash
    };
  }
}
