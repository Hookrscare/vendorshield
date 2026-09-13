/**
 * Unit Test Suite for SNAP-61: Offshore Monopile Wind Turbine Scour Hole Bathymetric Acoustic Sonar Tomographer.
 * Part of SnapInspect AI Tactical Field Inspection CAD & Mobile Voice AI.
 */

import { describe, it, expect } from "vitest";
import {
  OffshoreMonopileScourTomographer,
  type MonopileScourSurveyRequest
} from "./offshore-monopile-scour-tomographer";

describe("SNAP-61: Offshore Monopile Scour Tomographer", () => {
  it("classifies seabed with negligible scour", () => {
    const request: MonopileScourSurveyRequest = {
      turbineId: "WTG-NORTH-SEA-A01",
      pileDiameterMeters: 8.0,
      nominalSeabedDepthMeters: 30.0,
      soundings: [
        { azimuthDeg: 0, distanceFromPileEdgeMeters: 2.0, measuredSeabedDepthMeters: 30.2 },
        { azimuthDeg: 90, distanceFromPileEdgeMeters: 2.0, measuredSeabedDepthMeters: 30.3 },
        { azimuthDeg: 180, distanceFromPileEdgeMeters: 2.0, measuredSeabedDepthMeters: 30.1 },
        { azimuthDeg: 270, distanceFromPileEdgeMeters: 2.0, measuredSeabedDepthMeters: 30.4 }
      ]
    };

    const res = OffshoreMonopileScourTomographer.analyzeScour(request);

    expect(res.riskRating).toBe("NEGLIGIBLE_SCOUR");
    expect(res.scourRatio).toBeLessThan(0.10);
    expect(res.surveyDigest).toHaveLength(64);
  });

  it("triggers critical rock armor requirement for deep scour hole", () => {
    const request: MonopileScourSurveyRequest = {
      turbineId: "WTG-BALTIC-B14",
      pileDiameterMeters: 8.0,
      nominalSeabedDepthMeters: 25.0,
      soundings: [
        { azimuthDeg: 0, distanceFromPileEdgeMeters: 3.0, measuredSeabedDepthMeters: 36.0 }, // 11m scour! (S/D = 1.375)
        { azimuthDeg: 90, distanceFromPileEdgeMeters: 5.0, measuredSeabedDepthMeters: 32.0 },
        { azimuthDeg: 180, distanceFromPileEdgeMeters: 4.0, measuredSeabedDepthMeters: 30.0 },
        { azimuthDeg: 270, distanceFromPileEdgeMeters: 3.0, measuredSeabedDepthMeters: 35.5 }
      ]
    };

    const res = OffshoreMonopileScourTomographer.analyzeScour(request);

    expect(res.riskRating).toBe("CRITICAL_ROCK_ARMOR_REQUIRED");
    expect(res.maxScourDepthMeters).toBe(11.0);
    expect(res.scourRatio).toBeGreaterThan(1.2);
  });

  it("validates input arguments", () => {
    expect(() => {
      OffshoreMonopileScourTomographer.analyzeScour({
        turbineId: "BAD",
        pileDiameterMeters: -5,
        nominalSeabedDepthMeters: 30,
        soundings: []
      });
    }).toThrow("must be positive");
  });
});
