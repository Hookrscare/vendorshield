/**
 * SNAP-145: Tactical Field NDT Phased Array Focal Law & CAD Refraction Calibrator.
 * Part of SnapInspect AI Tactical Field Inspection CAD & Mobile Voice AI Suite.
 * 
 * Computes phased-array ultrasonic testing (PAUT) element delay laws, Snell's law
 * interface refraction, ASME Sec V shear wave inspection windows, and acoustic
 * beam focal spot geometry aligned with 3D CAD coordinate systems.
 */

import { createHash } from "crypto";

export interface PhasedArrayProbeConfig {
  elementCount: number; // e.g. 16, 32, 64
  pitchMm: number; // Center-to-center element spacing
  frequencyMhz: number; // e.g. 2.25, 5.0, 7.5 MHz
  wedgeAngleDeg: number; // Wedge roof angle (e.g. 36 deg for shear wave in steel)
  wedgeVelocityMPerSec: number; // Rexolite = 2330 m/s
  wedgeHeightAtFirstElementMm: number;
}

export interface InspectionMaterialSpec {
  materialName: string;
  longitudinalVelocityMPerSec: number; // Carbon steel ~ 5920 m/s
  shearVelocityMPerSec: number; // Carbon steel ~ 3240 m/s
  densityGPerCm3: number; // Carbon steel ~ 7.85 g/cm3
}

export interface FocalTargetCAD {
  focalDepthMm: number; // Perpendicular depth into specimen
  steerAngleDeg: number; // Desired refracted angle in material (e.g. 45, 60, 70 deg)
  cadSurfaceNormal: [number, number, number];
}

export interface ElementDelayLaw {
  elementIndex: number;
  elementPositionMm: number;
  timeOfFlightNs: number;
  relativeDelayNs: number;
  hardwareTickDelay: number; // Hardware ticks at 100MHz (10ns resolution)
}

export interface FocalLawCalibrationReport {
  probeConfig: PhasedArrayProbeConfig;
  material: InspectionMaterialSpec;
  target: FocalTargetCAD;
  incidentAngleDeg: number;
  firstCriticalAngleDeg: number;
  secondCriticalAngleDeg: number;
  isShearWaveInspectionValid: boolean;
  nearFieldDistanceMm: number;
  beamDivergenceDeg: number;
  elementDelays: ElementDelayLaw[];
  maxDelaySpanNs: number;
  asmeCalibrationAttestation: string;
}

export const MATERIAL_PRESETS: Record<string, InspectionMaterialSpec> = {
  CARBON_STEEL: {
    materialName: "Carbon Steel (ASTM A36/A516)",
    longitudinalVelocityMPerSec: 5920,
    shearVelocityMPerSec: 3240,
    densityGPerCm3: 7.85,
  },
  AUSTENITIC_STAINLESS_STEEL: {
    materialName: "Austenitic Stainless Steel (316L)",
    longitudinalVelocityMPerSec: 5740,
    shearVelocityMPerSec: 3120,
    densityGPerCm3: 8.0,
  },
  INCONEL_625: {
    materialName: "Inconel 625 Cladding",
    longitudinalVelocityMPerSec: 5820,
    shearVelocityMPerSec: 3050,
    densityGPerCm3: 8.44,
  },
  ALUMINUM_6061: {
    materialName: "Aluminum 6061-T6",
    longitudinalVelocityMPerSec: 6320,
    shearVelocityMPerSec: 3130,
    densityGPerCm3: 2.7,
  },
};

export class TacticalNdtPhasedArrayFocalLawCadCalibrator {
  /**
   * Calculates the first and second critical angles (in degrees) for a wedge/material interface.
   */
  public static calculateCriticalAngles(
    wedgeVelocity: number,
    materialLongitudinalVel: number,
    materialShearVel: number
  ): { firstCriticalAngleDeg: number; secondCriticalAngleDeg: number } {
    const firstCritRad = Math.asin(Math.min(1.0, wedgeVelocity / materialLongitudinalVel));
    const secondCritRad = Math.asin(Math.min(1.0, wedgeVelocity / materialShearVel));

    return {
      firstCriticalAngleDeg: (firstCritRad * 180) / Math.PI,
      secondCriticalAngleDeg: (secondCritRad * 180) / Math.PI,
    };
  }

  /**
   * Calculates the required wedge incident angle given a desired refracted angle in the material using Snell's law.
   */
  public static calculateIncidentAngle(
    steerAngleDeg: number,
    wedgeVelocity: number,
    materialWaveVelocity: number
  ): number {
    const steerRad = (steerAngleDeg * Math.PI) / 180;
    const sinIncident = (wedgeVelocity / materialWaveVelocity) * Math.sin(steerRad);
    if (sinIncident > 1.0 || sinIncident < -1.0) {
      throw new Error(`Total internal reflection: refracted angle ${steerAngleDeg}° cannot be achieved.`);
    }
    return (Math.asin(sinIncident) * 180) / Math.PI;
  }

  /**
   * Computes the phased-array focal law delay distribution and ASME validation.
   */
  public static computeFocalLaw(
    probe: PhasedArrayProbeConfig,
    material: InspectionMaterialSpec,
    target: FocalTargetCAD
  ): FocalLawCalibrationReport {
    if (probe.elementCount < 2) {
      throw new Error("Phased array probe must contain at least 2 elements.");
    }
    if (target.focalDepthMm <= 0) {
      throw new Error("Focal depth must be strictly positive.");
    }

    const { firstCriticalAngleDeg, secondCriticalAngleDeg } = this.calculateCriticalAngles(
      probe.wedgeVelocityMPerSec,
      material.longitudinalVelocityMPerSec,
      material.shearVelocityMPerSec
    );

    // Calculate incident angle for the desired refracted shear wave
    const incidentAngleDeg = this.calculateIncidentAngle(
      target.steerAngleDeg,
      probe.wedgeVelocityMPerSec,
      material.shearVelocityMPerSec
    );

    // ASME Sec V shear wave window: incident angle must be between 1st and 2nd critical angles
    const isShearWaveInspectionValid =
      incidentAngleDeg > firstCriticalAngleDeg && incidentAngleDeg < secondCriticalAngleDeg;

    // Active aperture width D = (N - 1) * pitch
    const activeApertureMm = (probe.elementCount - 1) * probe.pitchMm;
    const wavelengthMm = (material.shearVelocityMPerSec / (probe.frequencyMhz * 1e6)) * 1000;

    // Near-field length: N0 = (D^2 * f) / (4 * c) = D^2 / (4 * lambda)
    const nearFieldDistanceMm = (Math.pow(activeApertureMm, 2)) / (4 * wavelengthMm);

    // Beam divergence angle: sin(gamma) = 1.22 * lambda / D
    const sinDivergence = Math.min(1.0, (1.22 * wavelengthMm) / activeApertureMm);
    const beamDivergenceDeg = (Math.asin(sinDivergence) * 180) / Math.PI;

    // Element delay computation
    // For each element n, calculate propagation time to focal point (xf, zf) in CAD frame
    const steerRad = (target.steerAngleDeg * Math.PI) / 180;
    const xFocal = target.focalDepthMm * Math.tan(steerRad);
    const zFocal = target.focalDepthMm;

    const rawTofsNs: number[] = [];
    const elementPositions: number[] = [];

    for (let i = 0; i < probe.elementCount; i++) {
      const xElem = (i - (probe.elementCount - 1) / 2) * probe.pitchMm;
      elementPositions.push(xElem);

      // Distance from element to virtual focal spot in material
      const distMm = Math.hypot(xFocal - xElem, zFocal);
      // Time of flight in nanoseconds: (distMm / vel_m_per_s) * 1e6
      const tofNs = (distMm / material.shearVelocityMPerSec) * 1e6;
      rawTofsNs.push(tofNs);
    }

    const minTof = Math.min(...rawTofsNs);
    const maxTof = Math.max(...rawTofsNs);
    const maxDelaySpanNs = maxTof - minTof;

    const elementDelays: ElementDelayLaw[] = rawTofsNs.map((tof, idx) => {
      const relativeDelayNs = maxTof - tof; // Reverse delay for focusing at target
      return {
        elementIndex: idx,
        elementPositionMm: elementPositions[idx],
        timeOfFlightNs: Math.round(tof * 10) / 10,
        relativeDelayNs: Math.round(relativeDelayNs * 10) / 10,
        hardwareTickDelay: Math.round(relativeDelayNs / 10), // 100 MHz clock (10 ns per tick)
      };
    });

    const attestationPayload = `${probe.elementCount}:${probe.pitchMm}:${material.materialName}:${target.focalDepthMm}:${target.steerAngleDeg}:${maxDelaySpanNs.toFixed(2)}`;
    const asmeCalibrationAttestation = createHash("sha256").update(attestationPayload).digest("hex");

    return {
      probeConfig: probe,
      material,
      target,
      incidentAngleDeg: Math.round(incidentAngleDeg * 100) / 100,
      firstCriticalAngleDeg: Math.round(firstCriticalAngleDeg * 100) / 100,
      secondCriticalAngleDeg: Math.round(secondCriticalAngleDeg * 100) / 100,
      isShearWaveInspectionValid,
      nearFieldDistanceMm: Math.round(nearFieldDistanceMm * 100) / 100,
      beamDivergenceDeg: Math.round(beamDivergenceDeg * 100) / 100,
      elementDelays,
      maxDelaySpanNs: Math.round(maxDelaySpanNs * 10) / 10,
      asmeCalibrationAttestation,
    };
  }
}
