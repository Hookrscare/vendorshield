import { describe, it, expect } from "vitest";
import { ThermalEnvelopeInsulationScanner, ThermalZoneSample, BuildingThermalParameters } from "./thermal-envelope-insulation-scanner";

describe("SNAP-34: ThermalEnvelopeInsulationScanner Vitest Suite", () => {
  it("validates ASTM C1060 temperature delta requirement", () => {
    const params: BuildingThermalParameters = {
      indoorTempC: 21.0,
      outdoorAmbientTempC: 15.0 // Delta = 6°C < 10°C minimum
    };
    const res = ThermalEnvelopeInsulationScanner.auditEnvelope([], params);
    expect(res.isInspectionValid).toBe(false);
    expect(res.temperatureDifferentialC).toBe(6.0);
    expect(res.recommendations[0]).toContain("below ASTM C1060 minimum threshold");
  });

  it("identifies thermal bridges and missing insulation under winter heating conditions", () => {
    const params: BuildingThermalParameters = {
      indoorTempC: 22.0,
      outdoorAmbientTempC: 2.0 // Delta = 20°C >= 10°C minimum -> Valid!
    };

    const samples: ThermalZoneSample[] = [
      { zoneId: "wall_bay_01", surfaceTempC: 4.0, areaSqMeters: 5 },  // +2°C above ambient -> normal
      { zoneId: "wall_bay_02", surfaceTempC: 7.0, areaSqMeters: 5 },  // +5°C above ambient (25% delta) -> thermal bridge
      { zoneId: "wall_bay_03", surfaceTempC: 12.0, areaSqMeters: 5 }  // +10°C above ambient (50% delta) -> missing insulation
    ];

    const res = ThermalEnvelopeInsulationScanner.auditEnvelope(samples, params);
    expect(res.isInspectionValid).toBe(true);
    expect(res.thermalBridgeZones).toContain("wall_bay_02");
    expect(res.missingInsulationZones).toContain("wall_bay_03");
    expect(res.heatLossSeverityScore).toBeGreaterThan(30);
  });
});
