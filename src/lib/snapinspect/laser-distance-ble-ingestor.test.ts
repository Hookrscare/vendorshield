import { describe, it, expect } from "vitest";
import {
  LaserDistanceBleIngestor,
  type BleGattPacket,
} from "./laser-distance-ble-ingestor";

describe("SNAP-35: High-Precision Laser Distance Meter Bluetooth Telemetry Stream Ingestor", () => {
  it("should decode a valid Bosch GLM packet with distance and tilt angle", () => {
    // 10 bytes: [Header(0xAA), Status(0x00=OK), DistInt32LE(4520mm = 4.520m), AngleInt16LE(300 = 30.0 deg), Battery(88%)]
    const buffer = new Uint8Array(9);
    const view = new DataView(buffer.buffer);
    view.setUint8(0, 0xaa);
    view.setUint8(1, 0x00); // OK
    view.setInt32(2, 4520, true); // 4520 mm
    view.setInt16(6, 300, true); // 30.0 degrees inclination
    view.setUint8(8, 88); // 88% battery

    const packet: BleGattPacket = {
      deviceUuid: "BOSCH-GLM50C-8821",
      manufacturer: "BOSCH",
      rawBytes: buffer,
      rssi: -62,
      timestampMs: 1725840000000,
    };

    const measurement = LaserDistanceBleIngestor.decodePacket(packet);

    expect(measurement.status).toBe("OK");
    expect(measurement.distanceMeters).toBe(4.52);
    expect(measurement.distanceMillimeters).toBe(4520);
    expect(measurement.inclinationDegrees).toBe(30.0);
    // sin(30 deg) * 4.52m = 0.5 * 4.52 = 2.26m
    expect(measurement.indirectHeightMeters).toBe(2.26);
    expect(measurement.batteryPercent).toBe(88);
    expect(measurement.telemetryHash).toHaveLength(64);
  });

  it("should handle error status code from device", () => {
    const buffer = new Uint8Array(9);
    const view = new DataView(buffer.buffer);
    view.setUint8(0, 0xaa);
    view.setUint8(1, 0x01); // TARGET_TOO_DARK
    view.setInt32(2, 0, true);

    const packet: BleGattPacket = {
      deviceUuid: "BOSCH-GLM50C-8821",
      manufacturer: "BOSCH",
      rawBytes: buffer,
      rssi: -80,
      timestampMs: 1725840001000,
    };

    const measurement = LaserDistanceBleIngestor.decodePacket(packet);
    expect(measurement.status).toBe("TARGET_TOO_DARK");
    expect(measurement.distanceMeters).toBe(0);
  });

  it("should bind measurement to CAD wall vector correctly", () => {
    const measurement = {
      deviceUuid: "LEICA-DISTO-D2",
      manufacturer: "LEICA",
      distanceMeters: 5.0,
      distanceMillimeters: 5000,
      distanceFeet: 16.4,
      batteryPercent: 95,
      status: "OK" as const,
      telemetryHash: "hash-123",
      indirectHeightMeters: 2.5,
    };

    const cadSegment = LaserDistanceBleIngestor.bindToCadSegment(
      { x: 10.0, y: 10.0 },
      measurement,
      90.0 // straight North along Y axis
    );

    // cos(90) = 0, sin(90) = 1 -> endPoint: (10.0, 15.0)
    expect(cadSegment.endPoint.x).toBe(10.0);
    expect(cadSegment.endPoint.y).toBe(15.0);
    expect(cadSegment.lengthMeters).toBe(5.0);
    expect(cadSegment.elevationDeltaMeters).toBe(2.5);
  });
});
