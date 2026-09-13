/**
 * src/lib/snapinspect/prestressed-tendon-wire-break-localizer.ts
 * SNAP-62: Prestressed Concrete Bridge Tendon Acoustic Emission Wire-Break Localizer.
 *
 * Part of SnapInspect AI Civil Structural Health Monitoring (SHM) Suite.
 * Localizes high-tensile strand wire breaks in post-tensioned box girder bridges:
 * - 1D Acoustic Waveguide Time Difference of Arrival (TDOA) linear localization
 * - Elastic stress wave velocity calibration in high-tensile steel (5000 - 5200 m/s)
 * - Frequency & energy discrimination: distinguishes brittle wire breaks (fast rise time, high MARSE energy)
 *   from vehicular traffic noise or concrete micro-cracking
 * - Cumulative wire break loss tracking and remaining tendon structural capacity estimation
 */

export interface AeSensor {
  id: string;
  positionMeters: number; // linear stationing along tendon duct
  sensitivityDbae: number;
}

export interface AeWaveformHit {
  sensorId: string;
  arrivalTimestampMicroseconds: number;
  peakAmplitudeDbae: number;
  riseTimeMicroseconds: number;
  durationMicroseconds: number;
  energyEu: number; // Energy Units (MARSE)
  peakFrequencyKhz: number;
}

export interface WireBreakEvent {
  eventId: string;
  isConfirmedWireBreak: boolean;
  estimatedPositionMeters: number;
  confidenceScore: number; // 0.0 - 1.0
  releasingEnergyJ: number;
  participatingSensors: string[];
  notes: string[];
}

export interface TendonHealthAssessment {
  tendonId: string;
  totalStrands: number;
  wiresPerStrand: number;
  totalWires: number;
  detectedWireBreaks: number;
  strandLossPercentage: number;
  remainingPrestressCapacityKn: number;
  nominalPrestressCapacityKn: number;
  alertLevel: 'NORMAL' | 'ELEVATED' | 'CRITICAL_TENDON_REPLACEMENT';
  events: WireBreakEvent[];
}

export class PrestressedTendonWireBreakLocalizer {
  public static readonly STEEL_ACOUSTIC_VELOCITY_M_PER_S = 5100; // ~5.1 m/ms

  /**
   * Evaluates acoustic emission hits across a sensor array along a tendon.
   */
  public static localizeBreak(
    sensors: AeSensor[],
    hits: AeWaveformHit[],
    eventId: string
  ): WireBreakEvent {
    if (hits.length < 2) {
      throw new Error('At least two sensor hits are required for 1D waveguide TDOA localization.');
    }

    const sensorMap = new Map<string, AeSensor>();
    for (const s of sensors) {
      sensorMap.set(s.id, s);
    }

    // Sort hits chronologically by arrival time
    const sortedHits = [...hits].sort(
      (a, b) => a.arrivalTimestampMicroseconds - b.arrivalTimestampMicroseconds
    );

    const hit1 = sortedHits[0];
    const hit2 = sortedHits[1];

    const sensor1 = sensorMap.get(hit1.sensorId);
    const sensor2 = sensorMap.get(hit2.sensorId);

    if (!sensor1 || !sensor2) {
      throw new Error('Hit referenced sensor not found in sensor array.');
    }

    // Check wire break waveform discrimination:
    // 1. High amplitude (>65 dBAE)
    // 2. Fast rise time (<50 microseconds)
    // 3. High frequency content (>80 kHz)
    // 4. High energy (>500 EU)
    const notes: string[] = [];
    let discriminationScore = 0;

    for (const hit of [hit1, hit2]) {
      if (hit.peakAmplitudeDbae >= 68) discriminationScore += 0.25;
      if (hit.riseTimeMicroseconds <= 45) discriminationScore += 0.25;
      if (hit.peakFrequencyKhz >= 90) discriminationScore += 0.25;
      if (hit.energyEu >= 450) discriminationScore += 0.25;
    }
    const confidence = Math.min(1.0, discriminationScore / 2);
    const isWireBreak = confidence >= 0.70;

    if (!isWireBreak) {
      notes.push('Event rejected or low confidence: Waveform resembles ambient traffic or thermal slip.');
    } else {
      notes.push('CONFIRMED_WIRE_BREAK: High energy, impulsive rise time matched steel snap signature.');
    }

    // TDOA Calculation:
    // x1 and x2 are sensor positions. Assume x1 < x2.
    const x1 = Math.min(sensor1.positionMeters, sensor2.positionMeters);
    const x2 = Math.max(sensor1.positionMeters, sensor2.positionMeters);
    const d = x2 - x1;

    // delta_t in seconds = (t2 - t1) * 1e-6
    const dtSeconds =
      (hit2.arrivalTimestampMicroseconds - hit1.arrivalTimestampMicroseconds) * 1e-6;

    // Linear 1D localization:
    // If sensor 1 was hit first, break is closer to sensor 1:
    // x_break = x1 + (d - c * dt) / 2
    const c = this.STEEL_ACOUSTIC_VELOCITY_M_PER_S;
    const deltaDistance = c * dtSeconds;
    let localOffset = (d - deltaDistance) / 2;

    // Boundary check
    localOffset = Math.max(0, Math.min(d, localOffset));
    const estimatedPos = Math.round((x1 + localOffset) * 100) / 100;

    return {
      eventId,
      isConfirmedWireBreak: isWireBreak,
      estimatedPositionMeters: estimatedPos,
      confidenceScore: Math.round(confidence * 100) / 100,
      releasingEnergyJ: Math.round(hit1.energyEu * 0.08 * 10) / 10,
      participatingSensors: [hit1.sensorId, hit2.sensorId],
      notes
    };
  }

  /**
   * Computes cumulative tendon structural capacity reduction.
   */
  public static assessTendonIntegrity(
    tendonId: string,
    totalStrands: number,
    wiresPerStrand: number = 7, // 7-wire strand standard ASTM A416
    nominalCapacityKn: number = 2600, // standard 12-strand tendon ~2600 kN
    events: WireBreakEvent[]
  ): TendonHealthAssessment {
    const totalWires = totalStrands * wiresPerStrand;
    const confirmedBreaks = events.filter(e => e.isConfirmedWireBreak).length;
    const lossPercentage = Math.round((confirmedBreaks / totalWires) * 1000) / 10;

    const remainingCapacity = Math.round(nominalCapacityKn * (1 - lossPercentage / 100));

    let alertLevel: 'NORMAL' | 'ELEVATED' | 'CRITICAL_TENDON_REPLACEMENT' = 'NORMAL';
    if (lossPercentage >= 15.0) {
      alertLevel = 'CRITICAL_TENDON_REPLACEMENT';
    } else if (lossPercentage >= 5.0) {
      alertLevel = 'ELEVATED';
    }

    return {
      tendonId,
      totalStrands,
      wiresPerStrand,
      totalWires,
      detectedWireBreaks: confirmedBreaks,
      strandLossPercentage: lossPercentage,
      remainingPrestressCapacityKn: remainingCapacity,
      nominalPrestressCapacityKn: nominalCapacityKn,
      alertLevel,
      events
    };
  }
}
