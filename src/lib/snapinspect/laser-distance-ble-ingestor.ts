/**
 * SNAP-35: High-Precision Laser Distance Meter Bluetooth Telemetry Stream Ingestor.
 * Part of SnapInspect AI Tactical Field Inspection CAD & Mobile Voice AI.
 *
 * Ingests and decodes Bluetooth Low Energy (BLE) telemetry frames from handheld laser distance meters
 * (Leica DISTO, Bosch GLM, Stabila), performs live unit conversions, reconciles measurements against
 * CAD drawing polygon segments, and accumulates 3D room dimensional bounding boxes.
 */

export type MeasurementUnit = "METERS" | "MILLIMETERS" | "FEET_DECIMAL" | "FEET_INCHES";

export interface BleRawTelemetryPacket {
  deviceMac: string;
  manufacturer: "LEICA_DISTO" | "BOSCH_GLM" | "GENERIC_GATT";
  rawBytes: number[]; // e.g. [0x01, 0x00, 0x12, 0x34]
  timestampMs: number;
}

export interface DecodedLaserMeasurement {
  deviceMac: string;
  distanceMeters: number;
  distanceFeet: number;
  inclinationDeg?: number;
  signalStrengthRssi?: number;
  timestampMs: number;
  measurementQuality: "EXCELLENT" | "NOMINAL" | "LOW_SIGNAL_WARNING";
}

export interface RoomEnclosureMetrics {
  lengthMeters: number;
  widthMeters: number;
  heightMeters: number;
  floorAreaSqMeters: number;
  floorAreaSqFt: number;
  wallAreaSqMeters: number;
  roomVolumeCubicMeters: number;
}

export class LaserDistanceBleIngestor {
  public static readonly FEET_PER_METER = 3.28084;
  public static readonly SQFT_PER_SQM = 10.7639;

  /**
   * Decodes raw BLE GATT byte payload according to manufacturer spec.
   */
  public decodePacket(packet: BleRawTelemetryPacket, rssi: number = -65): DecodedLaserMeasurement {
    let distanceMeters = 0.0;
    let inclinationDeg: number | undefined = undefined;

    if (packet.manufacturer === "BOSCH_GLM") {
      // Bosch GLM format: 4 bytes distance (unsigned int32 little-endian in mm)
      if (packet.rawBytes.length >= 4) {
        const mm = (packet.rawBytes[0]) |
                    (packet.rawBytes[1] << 8) |
                    (packet.rawBytes[2] << 16) |
                    (packet.rawBytes[3] << 24);
        distanceMeters = mm / 1000.0;
      }
      if (packet.rawBytes.length >= 6) {
        // Optional 2 bytes tilt angle (int16 in 0.1 deg)
        const rawTilt = (packet.rawBytes[4]) | (packet.rawBytes[5] << 8);
        const signedTilt = rawTilt > 32767 ? rawTilt - 65536 : rawTilt;
        inclinationDeg = signedTilt / 10.0;
      }
    } else if (packet.manufacturer === "LEICA_DISTO") {
      // Leica DISTO format: IEEE 754 32-bit float in meters
      if (packet.rawBytes.length >= 4) {
        const buffer = new ArrayBuffer(4);
        const view = new DataView(buffer);
        for (let i = 0; i < 4; i++) {
          view.setUint8(i, packet.rawBytes[i]);
        }
        distanceMeters = view.getFloat32(0, true); // little-endian
      }
    } else {
      // Generic GATT distance characteristic (0x2A56): 16-bit unsigned in cm
      if (packet.rawBytes.length >= 2) {
        const cm = (packet.rawBytes[0]) | (packet.rawBytes[1] << 8);
        distanceMeters = cm / 100.0;
      }
    }

    // Quality check
    let quality: "EXCELLENT" | "NOMINAL" | "LOW_SIGNAL_WARNING" = "EXCELLENT";
    if (rssi < -85) {
      quality = "LOW_SIGNAL_WARNING";
    } else if (rssi < -75) {
      quality = "NOMINAL";
    }

    return {
      deviceMac: packet.deviceMac,
      distanceMeters: Math.round(distanceMeters * 1000) / 1000,
      distanceFeet: Math.round(distanceMeters * LaserDistanceBleIngestor.FEET_PER_METER * 1000) / 1000,
      inclinationDeg,
      signalStrengthRssi: rssi,
      timestampMs: packet.timestampMs,
      measurementQuality: quality
    };
  }

  /**
   * Reconciles a laser distance measurement against an expected CAD wall segment.
   * Checks whether the measurement falls within tolerance (default +/- 0.05m = 5cm).
   */
  public reconcileCadWallSegment(
    measuredMeters: number,
    cadNominalMeters: number,
    toleranceMeters: number = 0.05
  ): { status: "MATCH" | "OUT_OF_TOLERANCE"; deltaMeters: number; deltaPercent: number } {
    const deltaMeters = Math.round((measuredMeters - cadNominalMeters) * 1000) / 1000;
    const absDelta = Math.abs(deltaMeters);
    const deltaPercent = cadNominalMeters > 0 ? Math.round((absDelta / cadNominalMeters) * 10000) / 100 : 0;

    return {
      status: absDelta <= toleranceMeters ? "MATCH" : "OUT_OF_TOLERANCE",
      deltaMeters,
      deltaPercent
    };
  }

  /**
   * Computes rectangular room boundary metrics from 3 orthogonal laser measurements.
   */
  public computeRoomMetrics(lengthM: number, widthM: number, heightM: number): RoomEnclosureMetrics {
    const floorAreaSqM = Math.round(lengthM * widthM * 100) / 100;
    const floorAreaSqFt = Math.round(floorAreaSqM * LaserDistanceBleIngestor.SQFT_PER_SQM * 100) / 100;
    const wallAreaSqM = Math.round(2 * (lengthM + widthM) * heightM * 100) / 100;
    const volumeCubicM = Math.round(lengthM * widthM * heightM * 100) / 100;

    return {
      lengthMeters: lengthM,
      widthMeters: widthM,
      heightMeters: heightM,
      floorAreaSqMeters: floorAreaSqM,
      floorAreaSqFt: floorAreaSqFt,
      wallAreaSqMeters: wallAreaSqM,
      roomVolumeCubicMeters: volumeCubicM
    };
  }
}
