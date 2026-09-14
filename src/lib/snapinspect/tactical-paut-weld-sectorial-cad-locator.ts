/**
 * src/lib/snapinspect/tactical-paut-weld-sectorial-cad-locator.ts
 * SNAP-145: Tactical Field NDT Sensor Telemetry & CAD Vector Synchronization.
 * Part of SnapInspect AI Tactical Field Inspection CAD & Mobile Voice AI Suite.
 *
 * Implements Phased Array Ultrasonic Testing (PAUT) sectorial scan raytracing,
 * acoustic refraction angle computation (Snell's Law), and 3D CAD weld defect projection.
 */

import { createHash } from "crypto";

export interface WedgeParameters {
  wedgeAngleDeg: number;
  wedgeVelocityMps: number; // e.g. Rexolite ~2330 m/s
}

export interface SpecimenParameters {
  shearWaveVelocityMps: number; // e.g. Carbon steel shear ~3240 m/s
  thicknessMm: number;
  weldCenterlineOffsetMm: number;
}

export interface PautEchoRecord {
  beamAngleDeg: number; // Incident electronic steering angle
  soundPathDistanceMm: number;
  echoAmplitudePctFsh: number; // % Full Screen Height
}

export interface WeldDefectCadCoordinate {
  refractionAngleDeg: number;
  surfaceDistanceMm: number;
  depthMm: number;
  cadX: number;
  cadY: number;
  cadZ: number;
  defectClass: "PASS_ACCEPTABLE" | "MONITOR_INDICATION" | "REJECT_CRITICAL_DEFECT";
  asmeSectionVCompliant: boolean;
  tamperEvidentDigest: string;
}

export class TacticalPautWeldSectorialCadLocator {
  /**
   * Projects a PAUT sectorial scan echo into true 3D CAD weld coordinates.
   */
  public static projectEchoToCad(
    probeOriginCad: { x: number; y: number; z: number },
    wedge: WedgeParameters,
    specimen: SpecimenParameters,
    echo: PautEchoRecord
  ): WeldDefectCadCoordinate {
    if (specimen.thicknessMm <= 0 || echo.soundPathDistanceMm <= 0) {
      throw new Error("Thickness and sound path distance must be strictly positive.");
    }
    if (wedge.wedgeVelocityMps <= 0 || specimen.shearWaveVelocityMps <= 0) {
      throw new Error("Acoustic velocities must be strictly positive.");
    }

    // Snell's Law of refraction: sin(theta_2) / c_2 = sin(theta_1) / c_1
    // theta_1 = wedgeAngle + beamAngle
    const totalIncidentAngleRad = ((wedge.wedgeAngleDeg + echo.beamAngleDeg) * Math.PI) / 180.0;
    const sinRefraction = (Math.sin(totalIncidentAngleRad) * specimen.shearWaveVelocityMps) / wedge.wedgeVelocityMps;

    if (Math.abs(sinRefraction) > 1.0) {
      throw new Error("Total internal reflection encountered at wedge-specimen interface.");
    }

    const refractionAngleRad = Math.asin(sinRefraction);
    const refractionAngleDeg = (refractionAngleRad * 180.0) / Math.PI;

    // Geometric projection in specimen
    const surfaceDistanceMm = echo.soundPathDistanceMm * Math.sin(refractionAngleRad);
    let depthMm = echo.soundPathDistanceMm * Math.cos(refractionAngleRad);

    // Multi-skip beam leg handling (V-path reflection off backwall)
    let leg = 1;
    while (depthMm > specimen.thicknessMm) {
      depthMm = 2 * specimen.thicknessMm - depthMm;
      leg++;
    }

    // CAD coordinate alignment
    const cadX = probeOriginCad.x + surfaceDistanceMm;
    const cadY = probeOriginCad.y;
    const cadZ = probeOriginCad.z - Math.abs(depthMm);

    // Classification per ASME Sec V Art 4
    let defectClass: "PASS_ACCEPTABLE" | "MONITOR_INDICATION" | "REJECT_CRITICAL_DEFECT";
    if (echo.echoAmplitudePctFsh >= 50.0) {
      defectClass = "REJECT_CRITICAL_DEFECT";
    } else if (echo.echoAmplitudePctFsh >= 20.0) {
      defectClass = "MONITOR_INDICATION";
    } else {
      defectClass = "PASS_ACCEPTABLE";
    }

    const payload = `${refractionAngleDeg.toFixed(2)}:${surfaceDistanceMm.toFixed(2)}:${depthMm.toFixed(2)}:${defectClass}`;
    const tamperEvidentDigest = createHash("sha256").update(payload).digest("hex");

    return {
      refractionAngleDeg: Math.round(refractionAngleDeg * 100) / 100,
      surfaceDistanceMm: Math.round(surfaceDistanceMm * 100) / 100,
      depthMm: Math.round(depthMm * 100) / 100,
      cadX: Math.round(cadX * 100) / 100,
      cadY: Math.round(cadY * 100) / 100,
      cadZ: Math.round(cadZ * 100) / 100,
      defectClass,
      asmeSectionVCompliant: defectClass !== "REJECT_CRITICAL_DEFECT",
      tamperEvidentDigest,
    };
  }
}
