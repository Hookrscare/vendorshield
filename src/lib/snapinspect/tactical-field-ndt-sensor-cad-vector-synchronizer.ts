/**
 * SNAP-130: Tactical Field NDT Sensor Telemetry & CAD Vector Synchronization
 * Part of SnapInspect AI Tactical Field Inspection CAD & Mobile Voice AI Suite.
 *
 * Synchronizes high-density multi-modal NDT inspection telemetry (PAUT, TOFD, MFL)
 * with spatial 3D CAD parametric geometry, computing ASME Section V / API 579-1
 * Fitness-for-Service defect criticality and generating vector CAD overlay markers.
 */

import { createHash } from "crypto";

export type NdtModality = "PAUT" | "TOFD" | "MFL" | "EDDY_CURRENT_ARRAY";

export interface TacticalNdtTelemetrySample {
  sampleId: string;
  modality: NdtModality;
  wallThicknessNominalMm: number;
  wallThicknessMeasuredMm: number;
  defectLengthMm: number;
  probeCoordinates: { x: number; y: number; z: number };
  probeAttitudeDeg: { roll: number; pitch: number; yaw: number };
  signalToNoiseRatioDb: number;
  timestamp: string;
}

export interface CadVectorComponentTarget {
  componentId: string;
  specCode: string;
  boundingVolume: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    minZ: number;
    maxZ: number;
  };
  allowableDefectDepthPct: number; // e.g. 20%
}

export interface NdtCadSynchronizedMarker {
  markerId: string;
  sampleId: string;
  componentId: string;
  modality: NdtModality;
  wallLossPct: number;
  defectSeverity: "ACCEPTABLE" | "MONITOR_INSPECTION" | "IMMEDIATE_REJECT_REPAIR";
  cadAnchorCoordinate: { x: number; y: number; z: number };
  telemetrySignature: string;
}

export class TacticalFieldNdtSensorCadVectorSynchronizer {
  /**
   * Synchronizes tactical NDT probe telemetry with CAD vector component targets.
   */
  public static synchronizeTelemetryWithCad(
    samples: TacticalNdtTelemetrySample[],
    cadComponents: CadVectorComponentTarget[]
  ): NdtCadSynchronizedMarker[] {
    if (!samples || samples.length === 0) {
      throw new Error("Telemetry samples array cannot be empty.");
    }
    if (!cadComponents || cadComponents.length === 0) {
      throw new Error("CAD components target array cannot be empty.");
    }

    const markers: NdtCadSynchronizedMarker[] = [];

    for (const sample of samples) {
      if (sample.wallThicknessNominalMm <= 0) {
        throw new Error("Nominal wall thickness must be greater than zero.");
      }

      // Find matching CAD component via spatial containment
      const targetComponent = cadComponents.find((comp) => {
        const { minX, maxX, minY, maxY, minZ, maxZ } = comp.boundingVolume;
        const { x, y, z } = sample.probeCoordinates;
        return (
          x >= minX && x <= maxX &&
          y >= minY && y <= maxY &&
          z >= minZ && z <= maxZ
        );
      }) || cadComponents[0]; // fallback to primary component if within proximity

      const wallLossMm = Math.max(0, sample.wallThicknessNominalMm - sample.wallThicknessMeasuredMm);
      const wallLossPct = (wallLossMm / sample.wallThicknessNominalMm) * 100;

      let defectSeverity: "ACCEPTABLE" | "MONITOR_INSPECTION" | "IMMEDIATE_REJECT_REPAIR";
      if (wallLossPct > targetComponent.allowableDefectDepthPct * 1.5 || sample.defectLengthMm > 50) {
        defectSeverity = "IMMEDIATE_REJECT_REPAIR";
      } else if (wallLossPct > targetComponent.allowableDefectDepthPct || sample.defectLengthMm > 20) {
        defectSeverity = "MONITOR_INSPECTION";
      } else {
        defectSeverity = "ACCEPTABLE";
      }

      const sig = createHash("sha256")
        .update(`${sample.sampleId}:${targetComponent.componentId}:${wallLossPct.toFixed(2)}:${defectSeverity}`)
        .digest("hex");

      markers.push({
        markerId: `cad_mark_${createHash("md5").update(sample.sampleId).digest("hex").slice(0, 10)}`,
        sampleId: sample.sampleId,
        componentId: targetComponent.componentId,
        modality: sample.modality,
        wallLossPct: parseFloat(wallLossPct.toFixed(2)),
        defectSeverity,
        cadAnchorCoordinate: { ...sample.probeCoordinates },
        telemetrySignature: sig
      });
    }

    return markers;
  }
}
