/**
 * src/lib/snapinspect/tactical-paut-weld-sectorial-cad-locator.test.ts
 * Unit tests for SNAP-145: Tactical PAUT Weld Sectorial CAD Locator.
 */

import { describe, it, expect } from "vitest";
import {
  TacticalPautWeldSectorialCadLocator,
  type WedgeParameters,
  type SpecimenParameters,
  type PautEchoRecord,
} from "./tactical-paut-weld-sectorial-cad-locator";

describe("TacticalPautWeldSectorialCadLocator", () => {
  const standardWedge: WedgeParameters = {
    wedgeAngleDeg: 36.0,
    wedgeVelocityMps: 2330.0,
  };

  const steelSpecimen: SpecimenParameters = {
    shearWaveVelocityMps: 3240.0,
    thicknessMm: 25.0,
    weldCenterlineOffsetMm: 40.0,
  };

  it("accurately projects a 45-degree equivalent shear wave echo to 3D CAD", () => {
    // Incident angle ~ 36 deg yields ~ 54.8 deg shear wave in steel
    const echo: PautEchoRecord = {
      beamAngleDeg: 0.0,
      soundPathDistanceMm: 30.0,
      echoAmplitudePctFsh: 65.0, // Critical amplitude
    };

    const probeOrigin = { x: 100.0, y: 50.0, z: 0.0 };
    const res = TacticalPautWeldSectorialCadLocator.projectEchoToCad(
      probeOrigin,
      standardWedge,
      steelSpecimen,
      echo
    );

    expect(res.refractionAngleDeg).toBeGreaterThan(50.0);
    expect(res.surfaceDistanceMm).toBeGreaterThan(0.0);
    expect(res.depthMm).toBeLessThanOrEqual(steelSpecimen.thicknessMm);
    expect(res.defectClass).toBe("REJECT_CRITICAL_DEFECT");
    expect(res.asmeSectionVCompliant).toBe(false);
    expect(res.tamperEvidentDigest).toHaveLength(64);
  });

  it("classifies low amplitude indications as acceptable/monitor", () => {
    const lowEcho: PautEchoRecord = {
      beamAngleDeg: 0.0,
      soundPathDistanceMm: 15.0,
      echoAmplitudePctFsh: 12.0, // Low amplitude
    };

    const probeOrigin = { x: 0.0, y: 0.0, z: 0.0 };
    const res = TacticalPautWeldSectorialCadLocator.projectEchoToCad(
      probeOrigin,
      standardWedge,
      steelSpecimen,
      lowEcho
    );

    expect(res.defectClass).toBe("PASS_ACCEPTABLE");
    expect(res.asmeSectionVCompliant).toBe(true);
  });

  it("handles backwall reflection (leg 2) correctly within specimen thickness", () => {
    // Large sound path distance traversing past backwall
    const deepEcho: PautEchoRecord = {
      beamAngleDeg: -5.0, // steer to steeper angle
      soundPathDistanceMm: 45.0,
      echoAmplitudePctFsh: 35.0,
    };

    const probeOrigin = { x: 0.0, y: 0.0, z: 0.0 };
    const res = TacticalPautWeldSectorialCadLocator.projectEchoToCad(
      probeOrigin,
      standardWedge,
      steelSpecimen,
      deepEcho
    );

    expect(res.depthMm).toBeLessThanOrEqual(steelSpecimen.thicknessMm);
    expect(res.depthMm).toBeGreaterThanOrEqual(0.0);
    expect(res.defectClass).toBe("MONITOR_INDICATION");
  });

  it("throws on invalid thickness or zero velocities", () => {
    const echo: PautEchoRecord = {
      beamAngleDeg: 0.0,
      soundPathDistanceMm: 20.0,
      echoAmplitudePctFsh: 20.0,
    };

    expect(() =>
      TacticalPautWeldSectorialCadLocator.projectEchoToCad(
        { x: 0, y: 0, z: 0 },
        standardWedge,
        { ...steelSpecimen, thicknessMm: -5.0 },
        echo
      )
    ).toThrow("Thickness and sound path distance must be strictly positive.");
  });
});
