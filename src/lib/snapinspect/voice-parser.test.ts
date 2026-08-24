import { describe, expect, it } from "vitest";
import { parseInspectorVoiceTranscript } from "./voice-parser";

describe("parseInspectorVoiceTranscript", () => {
  it("classifies an electrical safety defect and extracts its location", () => {
    const result = parseInspectorVoiceTranscript(
      "Safety hazard: double tap breaker in the garage panel estimated 450 dollars"
    );

    expect(result.severity).toBe("Safety Hazard");
    expect(result.category).toBe("Electrical Subpanels & Wiring");
    expect(result.title).toBe("Double-Tapped Breaker / Neutral Bus Bar");
    expect(result.location).toBe("Garage / Main Service Location");
    expect(result.estimatedCost).toBe("$450 - $608");
  });

  it("uses the commercial roof category for a membrane finding", () => {
    const result = parseInspectorVoiceTranscript(
      "Urgent ponding on the southwest roof membrane",
      "commercial_roof"
    );

    expect(result.severity).toBe("Urgent Repair");
    expect(result.category).toBe("Membrane Surface & Seam Integrity");
    expect(result.title).toBe("Commercial Membrane Water Ponding & Stagnation");
    expect(result.location).toBe("Southwest Roof Elevation");
  });

  it("keeps a useful default classification for a general observation", () => {
    const result = parseInspectorVoiceTranscript("normal wear observed near entry");

    expect(result.severity).toBe("Moderate / Maintenance");
    expect(result.category).toBe("General Observation");
    expect(result.actionRecommended).toBe(
      "Recommend evaluation by licensed trade contractor."
    );
  });

  it("normalizes the description with capitalization and punctuation", () => {
    const result = parseInspectorVoiceTranscript("minor paint scuff");

    expect(result.description).toBe("Minor paint scuff.");
    expect(result.rawTranscript).toBe("minor paint scuff");
  });
});
