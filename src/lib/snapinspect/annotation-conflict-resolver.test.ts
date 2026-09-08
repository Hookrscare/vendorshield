import { describe, it, expect } from "vitest";
import {
  AnnotationConflictResolver,
  InspectionAnnotation
} from "./annotation-conflict-resolver";

describe("SNAP-18: Multi-Inspector Real-Time Annotation Sync Conflict Resolver", () => {
  const baseAnnotation: InspectionAnnotation = {
    id: "pin_fl_101",
    floorplanId: "fp_roof_deck",
    trade: "commercial_roof",
    x: 150,
    y: 200,
    title: "Membrane Blister",
    description: "EPDM blister observed near south parapet wall.",
    severity: "MODERATE",
    photoUris: ["https://storage.internal/photos/blister1.jpg"],
    tags: ["roofing", "blister"],
    inspectorId: "insp_lead",
    inspectorName: "Sarah Lead",
    lamportClock: 10,
    updatedAtIso: "2026-09-08T14:00:00.000Z"
  };

  it("resolves severity conflict by conservative safety-first rule (highest severity wins)", () => {
    const local: InspectionAnnotation = {
      ...baseAnnotation,
      severity: "MODERATE",
      lamportClock: 12
    };

    const remote: InspectionAnnotation = {
      ...baseAnnotation,
      severity: "CRITICAL",
      inspectorName: "Alex Structural",
      lamportClock: 11
    };

    const result = AnnotationConflictResolver.resolve(baseAnnotation, local, remote, "CONSERVATIVE_SAFETY_FIRST");
    expect(result.hadConflict).toBe(true);
    expect(result.merged.severity).toBe("CRITICAL");
    expect(result.conflicts.some((c) => c.field === "severity")).toBe(true);
  });

  it("preserves all photo attachments via union merge", () => {
    const local: InspectionAnnotation = {
      ...baseAnnotation,
      photoUris: ["https://storage.internal/photos/blister1.jpg", "https://storage.internal/photos/macro_tear.jpg"],
      lamportClock: 11
    };

    const remote: InspectionAnnotation = {
      ...baseAnnotation,
      photoUris: ["https://storage.internal/photos/blister1.jpg", "https://storage.internal/photos/thermal_flir.jpg"],
      lamportClock: 12
    };

    const result = AnnotationConflictResolver.resolve(baseAnnotation, local, remote);
    expect(result.merged.photoUris).toContain("https://storage.internal/photos/blister1.jpg");
    expect(result.merged.photoUris).toContain("https://storage.internal/photos/macro_tear.jpg");
    expect(result.merged.photoUris).toContain("https://storage.internal/photos/thermal_flir.jpg");
    expect(result.merged.photoUris.length).toBe(3);
  });

  it("handles tombstone deletion and prevents accidental resurrection unless timestamp strictly advances", () => {
    const localDeleted: InspectionAnnotation = {
      ...baseAnnotation,
      isDeleted: true,
      lamportClock: 15
    };

    const remoteModified: InspectionAnnotation = {
      ...baseAnnotation,
      description: "Minor edit to notes",
      lamportClock: 14
    };

    const result = AnnotationConflictResolver.resolve(baseAnnotation, localDeleted, remoteModified);
    expect(result.hadConflict).toBe(true);
    expect(result.merged.isDeleted).toBe(true);
  });

  it("merges distinct notes from multiple inspectors cleanly", () => {
    const local: InspectionAnnotation = {
      ...baseAnnotation,
      description: "Moisture detected with dielectric probe (18%).",
      inspectorName: "Sarah Lead",
      lamportClock: 14
    };

    const remote: InspectionAnnotation = {
      ...baseAnnotation,
      description: "Flashing seal unbonded along 4ft run.",
      inspectorName: "Alex Structural",
      lamportClock: 14
    };

    const result = AnnotationConflictResolver.resolve(baseAnnotation, local, remote);
    expect(result.merged.description).toContain("Moisture detected");
    expect(result.merged.description).toContain("Flashing seal unbonded");
    expect(result.merged.description).toContain("Alex Structural");
  });
});
