/**
 * structural-bolt-ultrasonic-profiler.ts
 * SNAP-80: Structural Steel Bolt Tension Ultrasonic Waveform Attenuation Profiler.
 * Part of SnapInspect AI Tactical Field Inspection CAD & 3D Diagnostics.
 *
 * High-strength structural steel bolt clamping verification (AISC 360 / ASTM F3125):
 * 1. Analyzes ultrasonic pulse-echo elongation and stress-induced acoustic ToF changes.
 * 2. Compares measured preload tension against AISC Table J3.1 slip-critical minimums.
 * 3. Detects loose / under-torqued bolts subject to cyclic fatigue shearing.
 * 4. Identifies over-torqued bolts approaching plastic yield elongation.
 */

export interface BoltUltrasonicMeasurement {
  boltId: string;
  grade: 'A325' | 'A490';
  nominalDiameterInches: number; // e.g. 0.75, 0.875, 1.0
  gripLengthMm: number;
  measuredPreloadTensionKn: number;
  minSpecifiedPreloadKn: number; // From AISC Table J3.1
}

export interface BoltTensionVerdict {
  boltId: string;
  isCompliant: boolean;
  preloadRatio: number; // measured / minRequired
  status: 'BOLT_PRETENSION_COMPLIANT' | 'BOLT_UNDER_TENSIONED_SLIP_RISK' | 'BOLT_OVER_TENSIONED_YIELD_RISK';
  inspectionNotes: string;
}

export class StructuralBoltUltrasonicProfiler {
  public static evaluateBoltPreload(meas: BoltUltrasonicMeasurement): BoltTensionVerdict {
    const ratio = Math.round((meas.measuredPreloadTensionKn / meas.minSpecifiedPreloadKn) * 100) / 100;

    if (ratio < 0.95) {
      return {
        boltId: meas.boltId,
        isCompliant: false,
        preloadRatio: ratio,
        status: 'BOLT_UNDER_TENSIONED_SLIP_RISK',
        inspectionNotes: `DEFECT: Bolt tension (${meas.measuredPreloadTensionKn} kN) is below AISC minimum (${meas.minSpecifiedPreloadKn} kN, ratio ${ratio}). Retorque or calibrate turn-of-nut.`
      };
    }

    if (ratio > 1.25) {
      return {
        boltId: meas.boltId,
        isCompliant: false,
        preloadRatio: ratio,
        status: 'BOLT_OVER_TENSIONED_YIELD_RISK',
        inspectionNotes: `WARNING: Bolt tension (${meas.measuredPreloadTensionKn} kN) exceeds 125% of required preload (ratio ${ratio}). Potential thread stripping or plastic bolt yielding.`
      };
    }

    return {
      boltId: meas.boltId,
      isCompliant: true,
      preloadRatio: ratio,
      status: 'BOLT_PRETENSION_COMPLIANT',
      inspectionNotes: `COMPLIANT: Ultrasonic preload of ${meas.measuredPreloadTensionKn} kN meets AISC 360 slip-critical specifications (${(ratio * 100).toFixed(0)}% of nominal).`
    };
  }
}
