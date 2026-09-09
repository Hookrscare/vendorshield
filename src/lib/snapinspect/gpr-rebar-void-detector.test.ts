import { describe, it, expect } from "vitest";
import { GprRebarVoidDetector, GprHyperbolaVertex } from "./gpr-rebar-void-detector";

describe("SNAP-33: GprRebarVoidDetector Vitest Suite", () => {
  it("calculates accurate depth from travel time", () => {
    // er = 9.0 -> v = 30 / sqrt(9) = 10 cm/ns.
    // 2-way time = 2 ns -> depth = (10 * 2) / 2 = 10 cm.
    const depth = GprRebarVoidDetector.travelTimeToDepthCm(2.0, 9.0);
    expect(depth).toBe(10.0);
  });

  it("identifies rebar grid, voids, and safe core drilling windows", () => {
    const vertices: GprHyperbolaVertex[] = [
      {
        id: "rb_01",
        horizontalPositionCm: 30,
        twoWayTravelTimeNs: 1.5,
        amplitude: 0.9,
        phasePolarity: "METALLIC_REFLECTION"
      },
      {
        id: "void_01",
        horizontalPositionCm: 80,
        twoWayTravelTimeNs: 2.0,
        amplitude: -0.8,
        phasePolarity: "NEGATIVE_AIR_VOID"
      }
    ];

    const result = GprRebarVoidDetector.analyzeProfile(vertices, 150, 7.0, 5.0);
    expect(result.estimatedRebarCount).toBe(1);
    expect(result.detectedVoidsCount).toBe(1);
    expect(result.safeCoreDrillingZones.length).toBeGreaterThan(0);
    expect(result.criticalCollisionWarning).toBe(false);
  });
});
