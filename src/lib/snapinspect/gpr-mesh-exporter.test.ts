import { describe, it, expect } from "vitest";
import {
  GprMeshExporter,
  GprSurveyVolume,
  RebarDetection3D,
  SubsurfaceVoid3D
} from "./gpr-mesh-exporter";

describe("SNAP-42: GPR Multi-Layer Concrete Rebar & Void Mesh Exporter Tests", () => {
  it("processes compliant rebar grid and generates OBJ, SVG, and GeoJSON", () => {
    const rebars: RebarDetection3D[] = [
      {
        id: "reb-01",
        start: { xCm: 10, yCm: 0, zDepthCm: 5.0 },
        end: { xCm: 10, yCm: 100, zDepthCm: 5.0 },
        diameterMm: 16,
        layer: "TOP_MAT_LONGITUDINAL",
        corrosionSeverityPercent: 0
      },
      {
        id: "reb-02",
        start: { xCm: 30, yCm: 0, zDepthCm: 5.2 },
        end: { xCm: 30, yCm: 100, zDepthCm: 5.2 },
        diameterMm: 16,
        layer: "TOP_MAT_LONGITUDINAL",
        corrosionSeverityPercent: 5
      }
    ];

    const voids: SubsurfaceVoid3D[] = [
      {
        id: "void-01",
        center: { xCm: 20, yCm: 50, zDepthCm: 8.0 },
        widthCm: 8,
        lengthCm: 10,
        heightCm: 4,
        confidence: 0.95
      }
    ];

    const volume: GprSurveyVolume = {
      surveyId: "SRV-CONCRETE-001",
      slabWidthCm: 100,
      slabLengthCm: 100,
      slabThicknessCm: 25,
      minSpecifiedCoverCm: 3.8, // ACI 318 requirement: 3.8 cm (1.5 in)
      rebars,
      voids
    };

    const result = GprMeshExporter.processAndExport(volume);

    expect(result.surveyId).toBe("SRV-CONCRETE-001");
    expect(result.totalRebars).toBe(2);
    expect(result.totalVoids).toBe(1);
    expect(result.topCoverMinCm).toBe(5.0);
    expect(result.aciCoverCompliant).toBe(true);
    expect(result.coverDeficientRebarIds).toHaveLength(0);

    // Verify Wavefront OBJ mesh
    expect(result.objMesh).toContain("o ConcreteSlab");
    expect(result.objMesh).toContain("o Rebar_reb-01");
    expect(result.objMesh).toContain("l 9 10");

    // Verify CAD SVG section
    expect(result.cadSvgSection).toContain("<svg");
    expect(result.cadSvgSection).toContain("<circle");
    expect(result.cadSvgSection).toContain("#10b981"); // Compliant green

    // Verify GeoJSON
    expect(result.geoJson.type).toBe("FeatureCollection");
    expect(result.geoJson.features).toHaveLength(3);
    expect(result.geoJson.properties.aciCoverCompliant).toBe(true);
  });

  it("detects ACI 318 cover depth deficiencies when rebar is too shallow", () => {
    const rebars: RebarDetection3D[] = [
      {
        id: "reb-shallow",
        start: { xCm: 15, yCm: 0, zDepthCm: 2.1 }, // 2.1 cm < 3.8 cm requirement
        end: { xCm: 15, yCm: 100, zDepthCm: 2.1 },
        diameterMm: 16,
        layer: "TOP_MAT_LONGITUDINAL",
        corrosionSeverityPercent: 12
      }
    ];

    const volume: GprSurveyVolume = {
      surveyId: "SRV-DEFICIENT-002",
      slabWidthCm: 80,
      slabLengthCm: 100,
      slabThicknessCm: 20,
      minSpecifiedCoverCm: 3.8,
      rebars,
      voids: []
    };

    const result = GprMeshExporter.processAndExport(volume);

    expect(result.aciCoverCompliant).toBe(false);
    expect(result.coverDeficientRebarIds).toEqual(["reb-shallow"]);
    expect(result.cadSvgSection).toContain("#ef4444"); // Red deficient warning
  });
});
