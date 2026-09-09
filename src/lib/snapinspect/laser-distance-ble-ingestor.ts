/**
 * SNAP-35: High-Precision Laser Distance Meter Bluetooth Telemetry Stream Ingestor.
 * Part of SnapInspect AI Tactical Field Inspection CAD & Mobile Voice AI.
 *
 * Ingests and decodes Bluetooth Low Energy (BLE GATT) telemetry streams from commercial
 * laser distance meters (e.g., Leica DISTO, Bosch GLM, Stabila LD).
 * Supports distance parsing, inclination / tilt angles, indirect Pythagorean elevation,
 * unit normalization, and CAD room boundary coordinate binding.
 */

import crypto from "crypto";

export type LaserMeasurementUnit = "METERS" | "MILLIMETERS" | "FEET" | "INCHES";

export interface BleGattPacket {
  deviceUuid: string;
  manufacturer: "LEICA" | "BOSCH" | "HILTI" | "GENERIC_GATT";
  rawBytes: Uint8Array;
  rssi: number;
  timestampMs: number;
}

export interface DecodedLaserMeasurement {
  deviceUuid: string;
  manufacturer: string;
  distanceMeters: number;
  distanceMillimeters: number;
  distanceFeet: number;
  inclinationDegrees?: number;
  indirectHeightMeters?: number; // Computed via sin(inclination) * distance
  batteryPercent: number;
  status: "OK" | "BEAM_INTERRUPTED" | "TARGET_TOO_DARK" | "OUT_OF_RANGE" | "HARDWARE_FAULT";
  telemetryHash: string;
}

export class LaserDistanceBleIngestor {
  /**
   * Decodes a raw BLE characteristic byte payload into structured laser telemetry.
   */
  public static decodePacket(packet: BleGattPacket): DecodedLaserMeasurement {
    const { rawBytes, manufacturer, deviceUuid } = packet;

    if (rawBytes.length < 4) {
      return {
        deviceUuid,
        manufacturer,
        distanceMeters: 0,
        distanceMillimeters: 0,
        distanceFeet: 0,
        batteryPercent: 0,
        status: "BEAM_INTERRUPTED",
        telemetryHash: this.computeHash(deviceUuid, 0, "BEAM_INTERRUPTED", packet.timestampMs),
      };
    }

    const view = new DataView(rawBytes.buffer, rawBytes.byteOffset, rawBytes.byteLength);

    let rawDistanceMm = 0;
    let inclinationDeg: number | undefined = undefined;
    let batteryPercent = 100;
    let status: DecodedLaserMeasurement["status"] = "OK";

    if (manufacturer === "BOSCH") {
      // Bosch GLM format: [Header (1B), Status (1B), DistInt32LE (4B), AngleInt16LE (2B), Battery (1B)]
      const statusCode = view.getUint8(1);
      if (statusCode === 0x00) {
        status = "OK";
      } else if (statusCode === 0x01) {
        status = "TARGET_TOO_DARK";
      } else if (statusCode === 0x02) {
        status = "OUT_OF_RANGE";
      } else {
        status = "HARDWARE_FAULT";
      }

      if (rawBytes.length >= 6) {
        rawDistanceMm = view.getInt32(2, true);
      }
      if (rawBytes.length >= 8) {
        // Angle stored in tenths of a degree
        inclinationDeg = Math.round((view.getInt16(6, true) / 10.0) * 10) / 10;
      }
      if (rawBytes.length >= 9) {
        batteryPercent = Math.min(100, Math.max(0, view.getUint8(8)));
      }
    } else {
      // Standard / Leica GATT Format: [Flags (1B), DistUint24LE or Uint32LE (4B), InclinationInt16LE (2B)]
      const flags = view.getUint8(0);
      const isFault = (flags & 0x80) !== 0;

      if (isFault) {
        status = "OUT_OF_RANGE";
      } else {
        status = "OK";
        rawDistanceMm = view.getUint32(1, true);
      }

      if (rawBytes.length >= 7) {
        inclinationDeg = Math.round((view.getInt16(5, true) / 10.0) * 10) / 10;
      }
    }

    const distanceMeters = Math.round((rawDistanceMm / 1000.0) * 1000) / 1000;
    const distanceFeet = Math.round((distanceMeters * 3.28084) * 100) / 100;

    let indirectHeightMeters: number | undefined = undefined;
    if (inclinationDeg !== undefined && status === "OK") {
      const rad = (inclinationDeg * Math.PI) / 180.0;
      indirectHeightMeters = Math.round(Math.abs(Math.sin(rad) * distanceMeters) * 1000) / 1000;
    }

    const telemetryHash = this.computeHash(deviceUuid, distanceMeters, status, packet.timestampMs);

    return {
      deviceUuid,
      manufacturer,
      distanceMeters,
      distanceMillimeters: rawDistanceMm,
      distanceFeet,
      inclinationDegrees: inclinationDeg,
      indirectHeightMeters,
      batteryPercent,
      status,
      telemetryHash,
    };
  }

  /**
   * Binds a measurement to a 2D/3D CAD vector line segment, updating target endpoint.
   */
  public static bindToCadSegment(
    startPoint: { x: number; y: number },
    measurement: DecodedLaserMeasurement,
    bearingDegrees: number = 0.0
  ): { endPoint: { x: number; y: number }; lengthMeters: number; elevationDeltaMeters: number } {
    const rad = (bearingDegrees * Math.PI) / 180.0;
    const horizontalDistance = measurement.distanceMeters;

    const endX = Math.round((startPoint.x + Math.cos(rad) * horizontalDistance) * 1000) / 1000;
    const endY = Math.round((startPoint.y + Math.sin(rad) * horizontalDistance) * 1000) / 1000;

    return {
      endPoint: { x: endX, y: endY },
      lengthMeters: horizontalDistance,
      elevationDeltaMeters: measurement.indirectHeightMeters ?? 0.0,
    };
  }

  private static computeHash(deviceUuid: string, distanceM: number, status: string, timestampMs: number): string {
    const payload = `${deviceUuid}:${distanceM}:${status}:${timestampMs}`;
    return crypto.createHash("sha256").update(payload).digest("hex");
  }
}
