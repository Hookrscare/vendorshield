/**
 * SNAP-79: Automated High-Speed Catenary Pantograph Contact Force & Arc Erosion Tracker
 *
 * Complies with EN 50367 and EN 50318 standards for pantograph-catenary interaction.
 * Monitors dynamic contact force Fm, contact wire uplift, optical arcing duration (NQ percentage),
 * cumulative electrical arc erosion energy, and modulates active pantograph pneumatic actuators
 * to prevent dewirement hazards and excessive contact strip wear.
 */

export interface PantographTelemetryFrame {
  timestampMs: number;
  trainSpeedKmh: number;
  contactForceN: number; // Dynamic contact force (EN 50367 target: ~70N to 200N depending on speed)
  contactLossDetected: boolean;
  arcOpticalIntensityLumens?: number; // Photodiode arc sensor
  arcVoltageDropV?: number;
  tractionCurrentA?: number;
  catenaryHeightM?: number; // Catenary height (nominal ~ 5.3m)
}

export interface CatenaryInteractionMetrics {
  meanContactForceN: number;
  stdDevContactForceN: number;
  maxStatisticalForceN: number; // Fm + 3*sigma
  minStatisticalForceN: number; // Fm - 3*sigma
  arcingPercentageNQ: number; // EN 50318 percentage of time arcing occurs
  cumulativeArcEnergyJoules: number;
  estimatedStripWearMm: number;
  targetBellowsPressureBar: number;
  interactionStatus: 'OPTIMAL' | 'ELEVATED_WEAR' | 'EXCESSIVE_ARCING' | 'DEWIRED_RISK';
  activeAlerts: string[];
}

export class CatenaryPantographArcTracker {
  private nominalContactForceN: number;
  private maxAllowedForceN: number;
  private minAllowedForceN: number;
  private arcWearRateMmPerKj: number;

  constructor(
    nominalContactForceN: number = 120.0,
    maxAllowedForceN: number = 250.0,
    minAllowedForceN: number = 20.0,
    arcWearRateMmPerKj: number = 0.0045
  ) {
    this.nominalContactForceN = nominalContactForceN;
    this.maxAllowedForceN = maxAllowedForceN;
    this.minAllowedForceN = minAllowedForceN;
    this.arcWearRateMmPerKj = arcWearRateMmPerKj;
  }

  /**
   * Evaluates a sequence of high-speed pantograph interaction telemetry frames.
   */
  public evaluateInteraction(frames: PantographTelemetryFrame[]): CatenaryInteractionMetrics {
    if (!frames || frames.length === 0) {
      return {
        meanContactForceN: 0,
        stdDevContactForceN: 0,
        maxStatisticalForceN: 0,
        minStatisticalForceN: 0,
        arcingPercentageNQ: 0,
        cumulativeArcEnergyJoules: 0,
        estimatedStripWearMm: 0,
        targetBellowsPressureBar: 3.5,
        interactionStatus: 'OPTIMAL',
        activeAlerts: ['NO_TELEMETRY_DATA']
      };
    }

    const n = frames.length;
    const forces = frames.map(f => f.contactForceN);
    const sumForce = forces.reduce((acc, val) => acc + val, 0);
    const meanForce = sumForce / n;

    const variance = forces.reduce((acc, val) => acc + Math.pow(val - meanForce, 2), 0) / n;
    const stdDev = Math.sqrt(variance);

    const maxStat = meanForce + 3 * stdDev;
    const minStat = meanForce - 3 * stdDev;

    let arcingCount = 0;
    let totalArcEnergyJ = 0;

    for (let i = 0; i < n; i++) {
      const f = frames[i];
      const isArcing = f.contactLossDetected || (f.arcOpticalIntensityLumens && f.arcOpticalIntensityLumens > 500);
      if (isArcing) {
        arcingCount++;
        const vDrop = f.arcVoltageDropV ?? 25.0; // Typical pantograph arc drop: 20-30V
        const current = f.tractionCurrentA ?? 400.0;
        const dtSeconds = i > 0 ? (f.timestampMs - frames[i - 1].timestampMs) / 1000.0 : 0.01;
        totalArcEnergyJ += vDrop * current * Math.max(0.001, dtSeconds);
      }
    }

    const arcingPercentageNQ = (arcingCount / n) * 100.0;
    const totalKj = totalArcEnergyJ / 1000.0;
    const estimatedStripWearMm = totalKj * this.arcWearRateMmPerKj;

    // Closed-loop pneumatic actuator adjustment (nominal 3.5 bar bellows pressure)
    // If mean contact force is below target, increase pressure; if above, vent
    const forceDelta = this.nominalContactForceN - meanForce;
    const pressureAdjustment = forceDelta * 0.008; // ~0.08 bar per 10N delta
    const targetBellowsPressureBar = Math.min(6.0, Math.max(2.0, 3.5 + pressureAdjustment));

    const activeAlerts: string[] = [];
    let interactionStatus: 'OPTIMAL' | 'ELEVATED_WEAR' | 'EXCESSIVE_ARCING' | 'DEWIRED_RISK' = 'OPTIMAL';

    if (minStat <= this.minAllowedForceN || arcingPercentageNQ > 1.0) {
      interactionStatus = 'DEWIRED_RISK';
      activeAlerts.push(`CRITICAL: Contact separation detected! Arcing ratio NQ = ${arcingPercentageNQ.toFixed(2)}% (EN 50318 limit: 0.2%)`);
    } else if (arcingPercentageNQ > 0.2) {
      interactionStatus = 'EXCESSIVE_ARCING';
      activeAlerts.push(`WARNING: High arcing rate NQ = ${arcingPercentageNQ.toFixed(2)}%`);
    } else if (maxStat > this.maxAllowedForceN) {
      interactionStatus = 'ELEVATED_WEAR';
      activeAlerts.push(`WARNING: Peak contact force ${maxStat.toFixed(1)}N exceeds safety threshold ${this.maxAllowedForceN}N`);
    }

    return {
      meanContactForceN: Math.round(meanForce * 100) / 100,
      stdDevContactForceN: Math.round(stdDev * 100) / 100,
      maxStatisticalForceN: Math.round(maxStat * 100) / 100,
      minStatisticalForceN: Math.round(minStat * 100) / 100,
      arcingPercentageNQ: Math.round(arcingPercentageNQ * 100) / 100,
      cumulativeArcEnergyJoules: Math.round(totalArcEnergyJ * 100) / 100,
      estimatedStripWearMm: Math.round(estimatedStripWearMm * 1000) / 1000,
      targetBellowsPressureBar: Math.round(targetBellowsPressureBar * 100) / 100,
      interactionStatus,
      activeAlerts
    };
  }
}
