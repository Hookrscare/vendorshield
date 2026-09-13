/**
 * SNAP-63: Subsea High-Voltage Direct Current (HVDC) Cable Trench Depth-of-Burial Magnetometer Profiler
 * 
 * Analyzes subsea ROV multi-axis fluxgate magnetometer array telemetry, solving Biot-Savart magnetic
 * inverse equations to compute cable Depth of Burial (DoB), lateral offset, and seabed exposure hazards.
 */

export interface MagnetometerReading {
  chainageKilometers: number;
  rovAltitudeMeters: number; // Height of ROV above seabed
  magneticFieldCenterNt: number; // nanoTesla
  magneticFieldLeftNt: number;
  magneticFieldRightNt: number;
}

export interface CableBurialSpec {
  cableCurrentAmps: number;
  nominalBurialDepthMeters: number; // e.g. 1.5m
  minPermittedBurialDepthMeters: number; // e.g. 1.0m
}

export interface BurialProfilePoint {
  chainageKilometers: number;
  depthOfBurialMeters: number;
  lateralOffsetMeters: number;
  isExposedOnSeabed: boolean;
  isUnderBuriedHazard: boolean;
  burialStatus: 'COMPLIANT' | 'SHALLOW_BURIAL_RISK' | 'EXPOSED_FREE_SPAN';
}

export interface SubseaBurialSurveySummary {
  surveyLengthKm: number;
  averageBurialDepthMeters: number;
  minBurialDepthMeters: number;
  exposedSectionCount: number;
  shallowRiskSectionCount: number;
  overallCompliancePass: boolean;
  profilePoints: BurialProfilePoint[];
}

export class SubseaHvdcCableBurialProfiler {
  private mu0 = 4 * Math.PI * 1e-7; // Permeability of vacuum (H/m)

  /**
   * Evaluates magnetic survey points to calculate subsea cable depth of burial.
   */
  public evaluateBurialSurvey(
    readings: MagnetometerReading[],
    spec: CableBurialSpec
  ): SubseaBurialSurveySummary {
    if (readings.length === 0) {
      throw new Error('Survey readings cannot be empty.');
    }

    let exposedCount = 0;
    let shallowCount = 0;
    let sumDoB = 0;
    let minDoB = Infinity;

    const profilePoints: BurialProfilePoint[] = readings.map((r) => {
      // Biot-Savart Law: B = (mu0 * I) / (2 * pi * r_total)
      // r_total = (mu0 * I) / (2 * pi * B)
      // B converted from nT to Tesla (1 nT = 1e-9 T)
      const bTesla = Math.max(r.magneticFieldCenterNt * 1e-9, 1e-12);
      const totalRadialDistanceM = (this.mu0 * spec.cableCurrentAmps) / (2 * Math.PI * bTesla);

      // Total distance r = sqrt(dx^2 + dy^2)
      // Estimate lateral offset from left vs right magnetic gradient
      const gradient = (r.magneticFieldLeftNt - r.magneticFieldRightNt) / Math.max(r.magneticFieldCenterNt, 1.0);
      const lateralOffsetM = gradient * 0.75; // Sensor baseline scale

      // Vertical distance from sensor to cable: dy = sqrt(r^2 - dx^2)
      const verticalDistanceM = Math.sqrt(Math.max(0.01, Math.pow(totalRadialDistanceM, 2) - Math.pow(lateralOffsetM, 2)));

      // Depth of Burial: DoB = verticalDistance - rovAltitude
      const dob = verticalDistanceM - r.rovAltitudeMeters;
      sumDoB += dob;
      if (dob < minDoB) {
        minDoB = dob;
      }

      const isExposed = dob <= 0.05; // Cable at or above mudline
      const isUnderBuried = dob < spec.minPermittedBurialDepthMeters && !isExposed;

      let status: BurialProfilePoint['burialStatus'] = 'COMPLIANT';
      if (isExposed) {
        status = 'EXPOSED_FREE_SPAN';
        exposedCount++;
      } else if (isUnderBuried) {
        status = 'SHALLOW_BURIAL_RISK';
        shallowCount++;
      }

      return {
        chainageKilometers: Number(r.chainageKilometers.toFixed(3)),
        depthOfBurialMeters: Number(dob.toFixed(2)),
        lateralOffsetMeters: Number(lateralOffsetM.toFixed(2)),
        isExposedOnSeabed: isExposed,
        isUnderBuriedHazard: isUnderBuried,
        burialStatus: status,
      };
    });

    const surveySpanKm = readings[readings.length - 1].chainageKilometers - readings[0].chainageKilometers;
    const avgDoB = sumDoB / readings.length;

    return {
      surveyLengthKm: Number(surveySpanKm.toFixed(3)),
      averageBurialDepthMeters: Number(avgDoB.toFixed(2)),
      minBurialDepthMeters: Number(minDoB.toFixed(2)),
      exposedSectionCount: exposedCount,
      shallowRiskSectionCount: shallowCount,
      overallCompliancePass: exposedCount === 0 && shallowCount === 0,
      profilePoints,
    };
  }
}
