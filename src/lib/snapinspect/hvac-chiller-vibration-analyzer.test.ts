/**
 * Unit tests for SNAP-36: Automated HVAC Chiller Vibration Spectral Harmonics Analyzer.
 */

import { describe, it, expect } from "vitest";
import {
  HvacChillerVibrationAnalyzer,
  ChillerVibrationTelemetry
} from "./hvac-chiller-vibration-analyzer";

describe("HvacChillerVibrationAnalyzer", () => {
  const analyzer = new HvacChillerVibrationAnalyzer();

  it("classifies healthy new chiller as ISO Zone A Good", () => {
    const telemetry: ChillerVibrationTelemetry = {
      equipmentId: "CHILLER-01-CENTRIFUGAL",
      nominalRpm: 3600,
      overallVelocityRmsMmS: 1.4,
      peakAccelerationG: 0.25,
      spectralPeaks: [
        { frequencyHz: 60.0, amplitudeMmS: 0.9, orderRelativeRpm: 1.0 }
      ]
    };

    const res = analyzer.evaluateVibration(telemetry);
    expect(res.isoZone).toBe("ZONE_A_GOOD");
    expect(res.primaryFault).toBe("NORMAL_OPERATION");
    expect(res.isOperable).toBe(true);
    expect(res.recommendedMaintenanceAction).toBe("CONTINUE_NORMAL_ROUTINE_MONITORING");
    expect(res.attestationToken).toHaveLength(64);
  });

  it("detects 2X RPM shaft misalignment in ISO Zone C Alert", () => {
    const telemetry: ChillerVibrationTelemetry = {
      equipmentId: "CHILLER-02-SCREW-COMPRESSOR",
      nominalRpm: 1800,
      overallVelocityRmsMmS: 5.8, // Zone C: 4.5 - 7.1 mm/s
      peakAccelerationG: 1.2,
      spectralPeaks: [
        { frequencyHz: 30.0, amplitudeMmS: 1.2, orderRelativeRpm: 1.0 },
        { frequencyHz: 60.0, amplitudeMmS: 4.8, orderRelativeRpm: 2.0 }, // 2x dominant misalignment
        { frequencyHz: 90.0, amplitudeMmS: 0.5, orderRelativeRpm: 3.0 }
      ]
    };

    const res = analyzer.evaluateVibration(telemetry);
    expect(res.isoZone).toBe("ZONE_C_ALERT");
    expect(res.primaryFault).toBe("MISALIGNMENT_2X");
    expect(res.isOperable).toBe(true);
    expect(res.recommendedMaintenanceAction).toContain("SCHEDULE_MAINTENANCE_WINDOW");
  });

  it("detects catastrophic 1X unbalance in ISO Zone D Danger requiring immediate shutdown", () => {
    const telemetry: ChillerVibrationTelemetry = {
      equipmentId: "COOLING-TOWER-FAN-04",
      nominalRpm: 900,
      overallVelocityRmsMmS: 9.6, // Zone D: > 7.1 mm/s
      peakAccelerationG: 3.5,
      spectralPeaks: [
        { frequencyHz: 15.0, amplitudeMmS: 8.9, orderRelativeRpm: 1.0 } // Severe 1x unbalance
      ]
    };

    const res = analyzer.evaluateVibration(telemetry);
    expect(res.isoZone).toBe("ZONE_D_DANGER");
    expect(res.primaryFault).toBe("UNBALANCE_1X");
    expect(res.isOperable).toBe(false);
    expect(res.recommendedMaintenanceAction).toContain("IMMEDIATE_SHUTDOWN");
  });

  it("detects mechanical looseness with 3X harmonics in Zone C", () => {
    const telemetry: ChillerVibrationTelemetry = {
      equipmentId: "PUMP-CHILLED-WATER-02",
      nominalRpm: 1750,
      overallVelocityRmsMmS: 4.9,
      peakAccelerationG: 0.8,
      spectralPeaks: [
        { frequencyHz: 87.5, amplitudeMmS: 3.8, orderRelativeRpm: 3.0 }
      ]
    };

    const res = analyzer.evaluateVibration(telemetry);
    expect(res.isoZone).toBe("ZONE_C_ALERT");
    expect(res.primaryFault).toBe("MECHANICAL_LOOSENESS");
  });
});
