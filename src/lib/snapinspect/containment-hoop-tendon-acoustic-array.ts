/**
 * src/lib/snapinspect/containment-hoop-tendon-acoustic-array.ts
 * Part of SnapInspect AI Tactical Field Inspection CAD & Mobile Voice AI.
 *
 * SNAP-73: Pre-Stressed Containment Vessel Hoop Tendon Acoustic Emission Array.
 * Ingests multi-channel ultrasonic acoustic emission (AE) telemetry from piezoelectric
 * sensors affixed along pre-stressed concrete containment vessels.
 * Identifies sudden high-energy wire ruptures vs benign concrete micro-fretting,
 * evaluates Kaiser Effect and Felicity Ratio, and computes tendon degradation alerts.
 */

export interface AcousticEmissionEvent {
  channelId: string;
  timestampUs: number;
  peakAmplitudeDb: number; // 0 to 120 dB AE
  riseTimeUs: number;      // microseconds
  durationUs: number;      // microseconds
  energyEu: number;        // energy units (V^2 * s or MARSE)
  frequencyCentroidKhz: number; // 50 to 400 kHz
}

export type TendonDamageState =
  | 'INTACT_TENDON_GRID'
  | 'SUSPECT_FRICTION_FRETTING'
  | 'PROGRESSIVE_GROUT_DELAMINATION'
  | 'CRITICAL_HOOP_TENDON_WIRE_RUPTURE';

export interface TendonArrayAnalysisInput {
  vesselId: string;
  hoopElevationMeters: number;
  designPrestressMpa: number;
  currentAppliedLoadRatio: number; // e.g. 1.0 = 100% design pressure
  previousMaxLoadRatio: number;
  events: AcousticEmissionEvent[];
}

export interface TendonArrayAnalysisResult {
  vesselId: string;
  analyzedEventsCount: number;
  wireBreakEventsCount: number;
  averageFelicityRatio: number;
  kaiserEffectViolated: boolean;
  maxEnergyEu: number;
  damageState: TendonDamageState;
  structuralIntegrityScore: number; // 0.0 to 1.0
  recommendedAction: string;
}

export class ContainmentHoopTendonAcousticArray {
  public static analyzeAcousticEmissions(
    input: TendonArrayAnalysisInput
  ): TendonArrayAnalysisResult {
    let wireBreakCount = 0;
    let frettingCount = 0;
    let maxEnergy = 0;

    for (const ev of input.events) {
      if (ev.energyEu > maxEnergy) {
        maxEnergy = ev.energyEu;
      }

      // Wire break signature: High energy (>5000 eu), high amplitude (>80 dB), short rise time (<25 µs)
      if (ev.peakAmplitudeDb >= 80 && ev.riseTimeUs <= 25 && ev.energyEu >= 5000) {
        wireBreakCount++;
      } else if (ev.peakAmplitudeDb >= 45 && ev.riseTimeUs > 50 && ev.energyEu < 2000) {
        frettingCount++;
      }
    }

    // Felicity ratio calculation: ratio of load at which significant AE begins vs previous maximum load
    // If AE occurred well below previous max load (ratio < 0.90), structural damage/loss of prestress has occurred
    let felicityRatio = 1.0;
    let kaiserViolated = false;

    if (input.events.length > 0 && input.previousMaxLoadRatio > 0) {
      // Approximate load at onset of current activity
      const loadAtOnset = input.currentAppliedLoadRatio * 0.92;
      felicityRatio = Math.min(1.0, loadAtOnset / input.previousMaxLoadRatio);
      if (loadAtOnset < input.previousMaxLoadRatio && input.events.length > 5) {
        kaiserViolated = true;
      }
    }

    let damageState: TendonDamageState = 'INTACT_TENDON_GRID';
    let integrityScore = 1.0;
    let recommendedAction = 'Maintain routine baseline continuous passive acoustic monitoring.';

    if (wireBreakCount > 0) {
      damageState = 'CRITICAL_HOOP_TENDON_WIRE_RUPTURE';
      integrityScore = Math.max(0.1, 0.65 - wireBreakCount * 0.15);
      recommendedAction = 'EMERGENCY: Immediate containment depressurization and robotic endoscope inspection of tendon sheath.';
    } else if (kaiserViolated && felicityRatio < 0.85) {
      damageState = 'PROGRESSIVE_GROUT_DELAMINATION';
      integrityScore = 0.72;
      recommendedAction = 'Schedule ultrasonic phased-array concrete inspection and reduce proof test pressure gradient.';
    } else if (frettingCount > 10) {
      damageState = 'SUSPECT_FRICTION_FRETTING';
      integrityScore = 0.88;
      recommendedAction = 'Increase sensor sampling frequency and inspect anchoring wedges for unbonded slippage.';
    }

    return {
      vesselId: input.vesselId,
      analyzedEventsCount: input.events.length,
      wireBreakEventsCount: wireBreakCount,
      averageFelicityRatio: parseFloat(felicityRatio.toFixed(3)),
      kaiserEffectViolated: kaiserViolated,
      maxEnergyEu: maxEnergy,
      damageState,
      structuralIntegrityScore: parseFloat(integrityScore.toFixed(3)),
      recommendedAction
    };
  }
}
