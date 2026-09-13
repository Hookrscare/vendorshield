import { describe, it, expect } from "vitest";
import {
  HydrogenPipelineEmbrittlementAcousticSensor,
  HydrogenAcousticEmissionBurst
} from "./hydrogen-pipeline-embrittlement-acoustic-sensor";

describe("HydrogenPipelineEmbrittlementAcousticSensor", () => {
  it("detects rapid tensile cleavage HIC requiring critical pipeline shutdown", () => {
    const burst: HydrogenAcousticEmissionBurst = {
      sensorId: "AE-H2-SECTOR-09",
      pipelineSteelGrade: "API_5L_X70",
      operatingPressureBar: 700.0,
      riseTimeMicroseconds: 8.0, // Very fast rise time
      peakAmplitudeDecibels: 85.0, // High amplitude burst
      energyMarseCounts: 4800,
      burstDurationMicroseconds: 120.0,
      countsToPeak: 12
    };

    const result = HydrogenPipelineEmbrittlementAcousticSensor.evaluateAcousticEmission(burst);
    expect(result.crackMode).toBe("TENSILE_CLEAVAGE_HIC");
    expect(result.pipelineSafetyStatus).toBe("CRITICAL_SHUTDOWN_REQUIRED");
    expect(result.embrittlementSeverityIndex).toBeGreaterThanOrEqual(0.70);
    expect(result.mitigationRecommendation).toContain("EMERGENCY");
    expect(result.acousticAttestationDigest).toHaveLength(64);
  });

  it("classifies mild flow turbulence as safe background emission", () => {
    const burst: HydrogenAcousticEmissionBurst = {
      sensorId: "AE-H2-SECTOR-01",
      pipelineSteelGrade: "API_5L_X65",
      operatingPressureBar: 350.0,
      riseTimeMicroseconds: 150.0, // Slow rise time
      peakAmplitudeDecibels: 42.0, // Low amplitude
      energyMarseCounts: 250,
      burstDurationMicroseconds: 500.0,
      countsToPeak: 45
    };

    const result = HydrogenPipelineEmbrittlementAcousticSensor.evaluateAcousticEmission(burst);
    expect(result.crackMode).toBe("BACKGROUND_FLOW_NOISE");
    expect(result.pipelineSafetyStatus).toBe("SAFE");
    expect(result.embrittlementSeverityIndex).toBeLessThan(0.20);
  });

  it("validates burst parameters boundary conditions", () => {
    expect(() => {
      HydrogenPipelineEmbrittlementAcousticSensor.evaluateAcousticEmission({
        sensorId: "",
        pipelineSteelGrade: "API_5L_X52",
        operatingPressureBar: 500,
        riseTimeMicroseconds: 10,
        peakAmplitudeDecibels: 50,
        energyMarseCounts: 100,
        burstDurationMicroseconds: 50,
        countsToPeak: 5
      });
    }).toThrow();

    expect(() => {
      HydrogenPipelineEmbrittlementAcousticSensor.evaluateAcousticEmission({
        sensorId: "AE-1",
        pipelineSteelGrade: "API_5L_X52",
        operatingPressureBar: 1500, // Exceeds max
        riseTimeMicroseconds: 10,
        peakAmplitudeDecibels: 50,
        energyMarseCounts: 100,
        burstDurationMicroseconds: 50,
        countsToPeak: 5
      });
    }).toThrow();
  });
});
