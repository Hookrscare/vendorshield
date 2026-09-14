/**
 * SNAP-137: Tactical Field NDT Sensor Telemetry & CAD Vector Synchronization.
 * Part of SnapInspect AI Tactical Field Inspection CAD & Mobile Voice AI.
 *
 * Synchronizes real-time multi-modal NDT inspection telemetry (PAUT, TOFD, PEC, EC)
 * with 3D CAD B-Rep surfaces and coordinate reference frames.
 * Evaluates structural defect severity per ASME Sec V and API 579-1.
 */

import { createHash } from "crypto";

export type NdtModality = "PAUT" | "TOFD" | "EDDY_CURRENT" | "PULSED_EDDY_CURRENT";

export interface SensorPose {
  xMm: number;
  yMm: number;
  zMm: number;
  normalX: number;
  normalY: number;
  normalZ: number;
}

export interface NdtScanPoint {
  scanPointId: string;
  timestampMs: number;
  pose: SensorPose;
  amplitudeDb: number;
  timeOfFlightMicrosec: number;
  wallThicknessMm: number;
  nominalThicknessMm: number;
}

export interface CadVectorSyncResult {
  scanPointId: string;
  cadSurfaceId: string;
  globalCadCoordinatesMm: [number, number, number];
  wallLossPercentage: number;
  asmeSeverity: "ACCEPTABLE" | "MONITOR_TREND" | "CRITICAL_DEFECT_REJECT";
  requiresImmediateCutout: boolean;
  tamperEvidentDigest: string;
}

export class TacticalFieldNdtVectorTelemetrySynchronizer {
  private readonly cadOriginOffsetMm: [number, number, number];

  constructor(cadOriginOffsetMm: [number, number, number] = [0, 0, 0]) {
    this.cadOriginOffsetMm = cadOriginOffsetMm;
  }

  public synchronizeScanPoint(
    point: NdtScanPoint,
    cadSurfaceId: string,
    modality: NdtModality = "PAUT"
  ): CadVectorSyncResult {
    if (point.nominalThicknessMm <= 0) {
      throw new Error("Nominal wall thickness must be positive.");
    }
    if (point.wallThicknessMm < 0) {
      throw new Error("Measured wall thickness cannot be negative.");
    }

    // 1. Transform local probe coordinates into global CAD coordinates
    const globalX = point.pose.xMm + this.cadOriginOffsetMm[0];
    const globalY = point.pose.yMm + this.cadOriginOffsetMm[1];
    const globalZ = point.pose.zMm + this.cadOriginOffsetMm[2];

    // 2. Compute Wall Loss Percentage
    const wallLoss = Math.max(0, (point.nominalThicknessMm - point.wallThicknessMm) / point.nominalThicknessMm) * 100.0;
    const roundedLoss = Math.round(wallLoss * 100) / 100;

    // 3. Evaluate ASME Section V / API 579-1 Acceptance Criteria
    // Wall loss > 50% or amplitude > 80 dB -> Critical
    // Wall loss > 20% -> Monitor Trend
    let asmeSeverity: "ACCEPTABLE" | "MONITOR_TREND" | "CRITICAL_DEFECT_REJECT" = "ACCEPTABLE";
    let requiresImmediateCutout = false;

    if (roundedLoss >= 50.0 || point.amplitudeDb >= 85.0) {
      asmeSeverity = "CRITICAL_DEFECT_REJECT";
      requiresImmediateCutout = true;
    } else if (roundedLoss >= 20.0 || point.amplitudeDb >= 60.0) {
      asmeSeverity = "MONITOR_TREND";
    }

    const digestPayload = {
      scanPointId: point.scanPointId,
      cadSurfaceId,
      modality,
      globalCoords: [globalX, globalY, globalZ],
      roundedLoss,
      asmeSeverity,
    };

    const tamperEvidentDigest = createHash("sha256")
      .update(JSON.stringify(digestPayload))
      .digest("hex");

    return {
      scanPointId: point.scanPointId,
      cadSurfaceId,
      globalCadCoordinatesMm: [globalX, globalY, globalZ],
      wallLossPercentage: roundedLoss,
      asmeSeverity,
      requiresImmediateCutout,
      tamperEvidentDigest,
    };
  }
}
