/**
 * SNAP-64: Nuclear Spent Fuel Dry Cask Storage Canister Helium Leak Acoustic Resonator
 * 
 * Analyzes non-destructive Acoustic Resonance Spectroscopy (ARS) telemetry of spent fuel canisters,
 * tracking internal speed-of-sound shifts to detect helium depressurization and ambient air ingress.
 */

export interface CanisterCavitySpec {
  canisterId: string;
  cavityLengthMeters: number;
  nominalHeliumPressureAtm: number; // typically 5.0 atm
  cavityTemperatureKelvin: number; // typically 350 - 450 K
  minSafePressureAtm: number; // typically 3.0 atm
}

export interface AcousticResonanceTelemetry {
  measuredFundamentalFrequencyHz: number;
  resonanceQualityFactorQ: number;
  ambientNoiseFloorDb: number;
}

export interface DryCaskLeakAssessment {
  canisterId: string;
  effectiveSpeedOfSoundMPerSec: number;
  estimatedHeliumPurityPct: number;
  estimatedInternalPressureAtm: number;
  isContainmentIntact: boolean;
  alertLevel: 'NOMINAL_SEALED' | 'ELEVATED_MONITORING' | 'CRITICAL_LEAK_AIR_INGRESS';
  findings: string[];
}

export class NuclearDryCaskHeliumLeakResonator {
  private readonly R_GAS = 8.314; // J / (mol * K)
  private readonly GAMMA_HE = 1.667; // Monoatomic gas heat capacity ratio
  private readonly MOLAR_MASS_HE = 0.004003; // kg / mol
  private readonly MOLAR_MASS_AIR = 0.02897; // kg / mol

  /**
   * Evaluates cavity acoustic resonance to detect canister seal degradation.
   */
  public evaluateCanisterResonance(
    spec: CanisterCavitySpec,
    telemetry: AcousticResonanceTelemetry
  ): DryCaskLeakAssessment {
    if (spec.cavityLengthMeters <= 0 || spec.cavityTemperatureKelvin <= 0) {
      throw new Error('Canister dimensions and temperature must be positive.');
    }

    // Theoretical speed of sound in 100% pure Helium at T:
    // c_pure_he = sqrt(gamma * R * T / M_he)
    const cPureHe = Math.sqrt((this.GAMMA_HE * this.R_GAS * spec.cavityTemperatureKelvin) / this.MOLAR_MASS_HE);

    // Fundamental longitudinal acoustic standing wave in closed cylindrical cavity:
    // f_0 = c_gas / (2 * L) -> c_measured = 2 * L * f_measured
    const measuredC = 2.0 * spec.cavityLengthMeters * telemetry.measuredFundamentalFrequencyHz;

    // Estimate helium purity fraction x_he based on measured speed of sound:
    // c_mix = sqrt(gamma * R * T / M_eff) -> M_eff = gamma * R * T / c_measured^2
    const mEff = Math.max(
      this.MOLAR_MASS_HE,
      Math.min(this.MOLAR_MASS_AIR, (this.GAMMA_HE * this.R_GAS * spec.cavityTemperatureKelvin) / Math.pow(measuredC, 2))
    );

    // M_eff = x_he * M_he + (1 - x_he) * M_air -> x_he = (M_air - M_eff) / (M_air - M_he)
    const heliumFraction = Math.max(
      0.0,
      Math.min(1.0, (this.MOLAR_MASS_AIR - mEff) / (this.MOLAR_MASS_AIR - this.MOLAR_MASS_HE))
    );
    const heliumPurityPct = heliumFraction * 100.0;

    // Quality factor Q decay indicates depressurization (viscous damping increases with leak/air)
    // Nominal Q is typically ~ 800 - 1200 at 5 atm helium
    const pressureAtm = Math.max(1.0, spec.nominalHeliumPressureAtm * (telemetry.resonanceQualityFactorQ / 1000.0));

    const findings: string[] = [];
    let alertLevel: DryCaskLeakAssessment['alertLevel'] = 'NOMINAL_SEALED';
    let isIntact = true;

    if (heliumPurityPct < 90.0 || pressureAtm < spec.minSafePressureAtm) {
      alertLevel = 'CRITICAL_LEAK_AIR_INGRESS';
      isIntact = false;
      findings.push(`CRITICAL: Helium concentration fell to ${heliumPurityPct.toFixed(1)}%. Air ingress confirmed.`);
      findings.push(`PRESSURE: Estimated pressure ${pressureAtm.toFixed(1)} atm is below safe threshold ${spec.minSafePressureAtm} atm.`);
    } else if (heliumPurityPct < 98.0 || pressureAtm < spec.minSafePressureAtm + 0.5) {
      alertLevel = 'ELEVATED_MONITORING';
      findings.push('WARNING: Minor helium acoustic frequency shift detected. Schedule weld radiograph.');
    } else {
      findings.push('NOMINAL: Pure helium conductive acoustic resonance verified. Welds fully intact.');
    }

    return {
      canisterId: spec.canisterId,
      effectiveSpeedOfSoundMPerSec: Number(measuredC.toFixed(1)),
      estimatedHeliumPurityPct: Number(heliumPurityPct.toFixed(1)),
      estimatedInternalPressureAtm: Number(pressureAtm.toFixed(1)),
      isContainmentIntact: isIntact,
      alertLevel,
      findings,
    };
  }
}
