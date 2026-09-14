/**
 * csl-sonic-logging-analyzer.ts
 * SNAP-83: Bored Concrete Pier Cross-Hole Sonic Logging (CSL) Arrival Time Velocity Analyzer.
 * Part of SnapInspect AI Tactical Field Inspection CAD & 3D Diagnostics.
 *
 * Deep foundation drilled shaft NDT sonic logging (ASTM D6760):
 * 1. Analyzes ultrasonic First Arrival Time (FAT) across water-filled access tube profiles.
 * 2. Computes compressional sonic wave velocity: Vp = (Tube Distance / FAT).
 * 3. Evaluates relative energy loss (dB) and velocity reduction against sound concrete baselines.
 * 4. Flags structural anomalies: necking, soil inclusions, honeycombing, and soft shaft toe voids.
 */

export interface CslLogSample {
  shaftId: string;
  tubePair: string;
  tubeSpacingMeters: number;          // e.g. 1.2 m
  firstArrivalTimeMicroseconds: number; // e.g. 300 µs
  signalEnergyDb: number;             // e.g. 88 dB
  baselineVelocityMps: number;        // e.g. 4000 m/s
  baselineEnergyDb: number;           // e.g. 90 dB
}

export interface CslAnalysisVerdict {
  shaftId: string;
  tubePair: string;
  measuredVelocityMps: number;
  velocityReductionPercent: number;
  energyLossDb: number;
  status: 'DRILLED_SHAFT_INTEGRITY_SOUND' | 'ANOMALY_MODERATE_CONCRETE_DEFECT' | 'CRITICAL_SHAFT_VOID_FLAW_DETECTED';
  isAcceptable: boolean;
  geotechnicalNotes: string;
}

export class CslSonicLoggingAnalyzer {
  public static analyzeLog(sample: CslLogSample): CslAnalysisVerdict {
    // 1. Calculate measured wave velocity: V = L / FAT (convert µs to seconds: L * 1e6 / FAT)
    const measuredVelocity = Math.round(
      (sample.tubeSpacingMeters * 1_000_000) / sample.firstArrivalTimeMicroseconds
    );

    // 2. Velocity reduction percentage
    const velReduction = Math.max(
      0,
      ((sample.baselineVelocityMps - measuredVelocity) / sample.baselineVelocityMps) * 100
    );
    const velReductionRound = Math.round(velReduction * 10) / 10;

    // 3. Energy attenuation in dB
    const energyLoss = Math.max(0, sample.baselineEnergyDb - sample.signalEnergyDb);
    const energyLossRound = Math.round(energyLoss * 10) / 10;

    // 4. ASTM D6760 Classification
    if (velReductionRound > 20.0 || energyLossRound > 9.0) {
      return {
        shaftId: sample.shaftId,
        tubePair: sample.tubePair,
        measuredVelocityMps: measuredVelocity,
        velocityReductionPercent: velReductionRound,
        energyLossDb: energyLossRound,
        status: 'CRITICAL_SHAFT_VOID_FLAW_DETECTED',
        isAcceptable: false,
        geotechnicalNotes: `CRITICAL FLAW (ASTM D6760): Severe velocity reduction of ${velReductionRound}% (velocity ${measuredVelocity} m/s) and ${energyLossRound} dB energy attenuation. Probable soil necking or grout void.`
      };
    }

    if (velReductionRound > 10.0 || energyLossRound > 6.0) {
      return {
        shaftId: sample.shaftId,
        tubePair: sample.tubePair,
        measuredVelocityMps: measuredVelocity,
        velocityReductionPercent: velReductionRound,
        energyLossDb: energyLossRound,
        status: 'ANOMALY_MODERATE_CONCRETE_DEFECT',
        isAcceptable: true,
        geotechnicalNotes: `MODERATE DEFECT: Velocity drop of ${velReductionRound}% indicates localized honeycombing or lower concrete density. Core drilling or tomographic imaging recommended.`
      };
    }

    return {
      shaftId: sample.shaftId,
      tubePair: sample.tubePair,
      measuredVelocityMps: measuredVelocity,
      velocityReductionPercent: velReductionRound,
      energyLossDb: energyLossRound,
      status: 'DRILLED_SHAFT_INTEGRITY_SOUND',
      isAcceptable: true,
      geotechnicalNotes: `SOUND SHAFT: High sonic velocity (${measuredVelocity} m/s, ${velReductionRound}% change) and solid wave transmission indicate sound, homogeneous concrete.`
    };
  }
}
