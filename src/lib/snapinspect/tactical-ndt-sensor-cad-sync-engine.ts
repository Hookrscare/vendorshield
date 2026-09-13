/**
 * SNAP-109: Tactical Field NDT Sensor Telemetry & CAD Vector Synchronization.
 * Part of SnapInspect AI Tactical Field Inspection Suite.
 * 
 * Synchronizes ultrasonic, eddy-current, and electromagnetic NDT sensor telemetry
 * directly with CAD vector floorplans and BIM structural elements.
 */

import { createHash } from "crypto";

export interface NdtSensorReading {
  sensorId: string;
  sensorType: "ULTRASONIC_THICKNESS" | "EDDY_CURRENT_CRACK" | "REBOUND_HAMMER";
  measuredValueMm: number;
  nominalValueMm: number;
  spatialCoord: { x: number; y: number; z: number }; // mm
  timestampMs: number;
}

export interface CadStructuralElement {
  elementId: string;
  layer: string;
  boundingBox: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  };
}

export interface NdtCadSyncResult {
  sensorId: string;
  matchedElementId: string | null;
  corrosionLossPct: number;
  criticalityLevel: "NORMAL" | "WARNING_MONITORING" | "CRITICAL_STRUCTURAL_DEFECT";
  cadSnappedCoord: { x: number; y: number; z: number };
  syncDigest: string;
}

export class TacticalNdtSensorCadSyncEngine {
  public static syncReadingWithCad(
    reading: NdtSensorReading,
    elements: CadStructuralElement[]
  ): NdtCadSyncResult {
    if (!reading.sensorId || reading.nominalValueMm <= 0) {
      throw new Error("Invalid NDT reading: sensorId and positive nominalValue required.");
    }

    // 1. Calculate structural degradation / metal loss percentage
    const lossMm = Math.max(0, reading.nominalValueMm - reading.measuredValueMm);
    const lossPct = Number(((lossMm / reading.nominalValueMm) * 100.0).toFixed(2));

    let criticality: NdtCadSyncResult["criticalityLevel"] = "NORMAL";
    if (lossPct >= 25.0) {
      criticality = "CRITICAL_STRUCTURAL_DEFECT";
    } else if (lossPct >= 10.0) {
      criticality = "WARNING_MONITORING";
    }

    // 2. Snap to nearest CAD structural element within 2D bounding boxes
    let matchedId: string | null = null;
    let snappedCoord = { ...reading.spatialCoord };

    for (const el of elements) {
      const { minX, maxX, minY, maxY } = el.boundingBox;
      if (
        reading.spatialCoord.x >= minX - 100 &&
        reading.spatialCoord.x <= maxX + 100 &&
        reading.spatialCoord.y >= minY - 100 &&
        reading.spatialCoord.y <= maxY + 100
      ) {
        matchedId = el.elementId;
        // Clamp snapped coordinates within element bounds
        snappedCoord.x = Math.max(minX, Math.min(maxX, reading.spatialCoord.x));
        snappedCoord.y = Math.max(minY, Math.min(maxY, reading.spatialCoord.y));
        break;
      }
    }

    const raw = `${reading.sensorId}:${matchedId}:${lossPct}:${criticality}`;
    const digest = createHash("sha256").update(raw).digest("hex");

    return {
      sensorId: reading.sensorId,
      matchedElementId: matchedId,
      corrosionLossPct: lossPct,
      criticalityLevel: criticality,
      cadSnappedCoord: snappedCoord,
      syncDigest: digest
    };
  }
}
