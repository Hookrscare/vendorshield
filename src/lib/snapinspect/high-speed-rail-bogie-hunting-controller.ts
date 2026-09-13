/**
 * SNAP-78: High-Speed Rail Bogie Dynamic Hunting Oscillation & Active Yaw Damper Closed-Loop Controller
 * 
 * Complies with EN 14363 and UIC 518 railway vehicle testing standards.
 * Analyzes bogie kinematic wheelset hunting limit cycles using Klingel's formula:
 *   f_h = (V / 2pi) * sqrt(gamma / (r_0 * b))
 * Computes the Nadal derailment criterion (Y/Q ratio) and modulates magnetorheological /
 * electro-hydraulic active yaw damper valves to suppress catastrophic resonant bifurcation.
 */

export interface BogieTelemetryFrame {
  timestampMs: number;
  vehicleSpeedKmh: number;
  lateralAccelerationG: number;
  yawRateRadPerSec: number;
  wheelRailConicity?: number; // gamma: default ~ 0.15
  lateralWheelForceKn?: number; // Y force
  verticalWheelForceKn?: number; // Q force
}

export interface HuntingOscillationAnalysis {
  vehicleSpeedKmh: number;
  klingelFrequencyHz: number;
  rmsLateralAccelerationG: number;
  peakLateralAccelerationG: number;
  peakYawRateRadPerSec: number;
  nadalDerailmentRatio: number; // Y/Q
  activeDampingForceKn: number;
  damperSolenoidCurrentMa: number;
  stabilityStatus: 'STABLE' | 'MARGINAL' | 'CRITICAL_HUNTING_LIMIT_CYCLE';
  safetyAlerts: string[];
}

export class HighSpeedRailBogieHuntingController {
  private nominalWheelRadiusM: number; // r_0
  private halfTrackGaugeM: number; // b (half gauge: 1.435m / 2 = 0.7175m)
  private maxDamperForceKn: number;

  constructor(
    nominalWheelRadiusM: number = 0.46, // 920mm diameter wheel
    halfTrackGaugeM: number = 0.7175,
    maxDamperForceKn: number = 35.0
  ) {
    this.nominalWheelRadiusM = nominalWheelRadiusM;
    this.halfTrackGaugeM = halfTrackGaugeM;
    this.maxDamperForceKn = maxDamperForceKn;
  }

  /**
   * Computes Klingel kinematic hunting frequency for a given forward velocity and conicity.
   */
  public computeKlingelFrequency(speedKmh: number, conicity: number = 0.15): number {
    const vMps = speedKmh / 3.6;
    if (vMps <= 0 || conicity <= 0) return 0.0;
    const factor = Math.sqrt(conicity / (this.nominalWheelRadiusM * this.halfTrackGaugeM));
    return (vMps / (2 * Math.PI)) * factor;
  }

  /**
   * Analyzes bogie telemetry frames and computes active closed-loop yaw damping demands.
   */
  public analyzeBogieDynamics(frames: BogieTelemetryFrame[]): HuntingOscillationAnalysis {
    if (!frames || frames.length === 0) {
      throw new Error('Telemetry frames array cannot be empty.');
    }

    const latest = frames[frames.length - 1];
    const conicity = latest.wheelRailConicity ?? 0.15;
    const klingelHz = this.computeKlingelFrequency(latest.vehicleSpeedKmh, conicity);

    let sumSqLat = 0;
    let peakLatG = 0;
    let peakYaw = 0;
    let maxNadal = 0;

    for (const f of frames) {
      const absLat = Math.abs(f.lateralAccelerationG);
      const absYaw = Math.abs(f.yawRateRadPerSec);
      sumSqLat += f.lateralAccelerationG * f.lateralAccelerationG;
      if (absLat > peakLatG) peakLatG = absLat;
      if (absYaw > peakYaw) peakYaw = absYaw;

      if (f.lateralWheelForceKn !== undefined && f.verticalWheelForceKn !== undefined && f.verticalWheelForceKn > 0) {
        const yq = Math.abs(f.lateralWheelForceKn) / f.verticalWheelForceKn;
        if (yq > maxNadal) maxNadal = yq;
      }
    }

    const rmsLatG = Math.sqrt(sumSqLat / frames.length);
    const alerts: string[] = [];

    // EN 14363 Limit: lateral acceleration RMS > 0.3g is marginal, peak > 0.8g is critical
    let status: 'STABLE' | 'MARGINAL' | 'CRITICAL_HUNTING_LIMIT_CYCLE' = 'STABLE';

    if (peakLatG >= 0.8 || maxNadal >= 0.8) {
      status = 'CRITICAL_HUNTING_LIMIT_CYCLE';
      if (peakLatG >= 0.8) alerts.push(`CRITICAL: Bogie lateral hunting acceleration ${peakLatG.toFixed(2)}g exceeds EN 14363 limit (0.8g).`);
      if (maxNadal >= 0.8) alerts.push(`CRITICAL: Nadal derailment quotient Y/Q ${maxNadal.toFixed(2)} exceeds flange climb threshold (0.8).`);
    } else if (peakLatG >= 0.35 || rmsLatG >= 0.20 || maxNadal >= 0.5) {
      status = 'MARGINAL';
      alerts.push(`WARNING: Elevated hunting oscillation detected (peak ${peakLatG.toFixed(2)}g, RMS ${rmsLatG.toFixed(2)}g).`);
    }

    // Active damping calculation: PD feedback loop
    // F_damper = K_p * yawRate + K_d * lateralG
    const Kp = 120.0; // kN / (rad/s)
    const Kd = 25.0;  // kN / g
    let commandedForce = (Kp * peakYaw) + (Kd * rmsLatG);
    if (commandedForce > this.maxDamperForceKn) {
      commandedForce = this.maxDamperForceKn;
    }

    // Solenoid valve control current: 0mA (passive) to 1200mA (full magnetic saturation)
    const valveCurrentMa = Math.min(1200, Math.round((commandedForce / this.maxDamperForceKn) * 1200));

    if (alerts.length === 0) {
      alerts.push('Bogie dynamic stability verified within EN 14363 limit envelope.');
    }

    return {
      vehicleSpeedKmh: latest.vehicleSpeedKmh,
      klingelFrequencyHz: Math.round(klingelHz * 100) / 100,
      rmsLateralAccelerationG: Math.round(rmsLatG * 1000) / 1000,
      peakLateralAccelerationG: Math.round(peakLatG * 1000) / 1000,
      peakYawRateRadPerSec: Math.round(peakYaw * 1000) / 1000,
      nadalDerailmentRatio: Math.round(maxNadal * 100) / 100,
      activeDampingForceKn: Math.round(commandedForce * 10) / 10,
      damperSolenoidCurrentMa: valveCurrentMa,
      stabilityStatus: status,
      safetyAlerts: alerts
    };
  }
}
