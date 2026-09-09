/**
 * Unit tests for SNAP-35: High-Precision Laser Distance Meter Bluetooth Telemetry Stream Ingestor.
 * Part of SnapInspect AI Tactical Field Inspection CAD & Mobile Voice AI.
 */

import { describe, it, expect } from "vitest";
import { LaserDistanceBleIngestor, BleRawTelemetryPacket } from "./laser-distance-ble-ingestor";

describe("LaserDistanceBleIngestor (SNAP-35)", () => {
  const ingestor = new LaserDistanceBleIngestor();

  it("decodes Bosch GLM packet (mm representation + tilt angle)", () => {
    // 3,450 mm = 0x0D7A -> [0x7A, 0x0D, 0x00, 0x00]
    // 15.5 deg tilt = 155 = 0x009B -> [0x9B, 0x00]
    const packet: BleRawTelemetryPacket = {
      deviceMac: "AA:BB:CC:DD:EE:01",
      manufacturer: "BOSCH_GLM",
      rawBytes: [0x7A, 0x0D, 0x00, 0x00, 0x9B, 0x00],
      timestampMs: 1725840000000
    };

    const decoded = ingestor.decodePacket(packet, -60);
    expect(decoded.deviceMac).toBe("AA:BB:CC:DD:EE:01");
    expect(decoded.distanceMeters).toBe(3.45);
    expect(decoded.distanceFeet).toBeCloseTo(11.319, 2);
    expect(decoded.inclinationDeg).toBe(15.5);
    expect(decoded.measurementQuality).toBe("EXCELLENT");
  });

  it("decodes Generic GATT characteristic (cm representation)", () => {
    // 425 cm = 4.25m = 0x01A9 -> [0xA9, 0x01]
    const packet: BleRawTelemetryPacket = {
      deviceMac: "AA:BB:CC:DD:EE:02",
      manufacturer: "GENERIC_GATT",
      rawBytes: [0xA9, 0x01],
      timestampMs: 1725840000000
    };

    const decoded = ingestor.decodePacket(packet, -88);
    expect(decoded.distanceMeters).toBe(4.25);
    expect(decoded.measurementQuality).toBe("LOW_SIGNAL_WARNING");
  });

  it("reconciles laser measurement against CAD segment within tolerance", () => {
    const res = ingestor.reconcileCadWallSegment(5.02, 5.00, 0.05);
    expect(res.status).toBe("MATCH");
    expect(res.deltaMeters).toBe(0.02);

    const outOfTolerance = ingestor.reconcileCadWallSegment(5.25, 5.00, 0.05);
    expect(outOfTolerance.status).toBe("OUT_OF_TOLERANCE");
    expect(outOfTolerance.deltaMeters).toBe(0.25);
  });

  it("computes 3D room enclosure area and volume metrics", () => {
    const metrics = ingestor.computeRoomMetrics(6.0, 4.0, 3.0);
    expect(metrics.floorAreaSqMeters).toBe(24.0);
    expect(metrics.floorAreaSqFt).toBeCloseTo(258.33, 1);
    expect(metrics.wallAreaSqMeters).toBe(60.0);
    expect(metrics.roomVolumeCubicMeters).toBe(72.0);
  });
});
