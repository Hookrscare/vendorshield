import { describe, it, expect } from "vitest";
import {
  TRADE_TEMPLATES,
  getDefectClausesForTrade,
  findDefectClauseById,
} from "./templates";

describe("SNAP-02: Commercial Roofing & HVAC Defect Clause Library", () => {
  it("includes specialized commercial roofing defect clauses", () => {
    const clauses = getDefectClausesForTrade("commercial_roof");
    expect(clauses.length).toBeGreaterThanOrEqual(4);

    const ponding = clauses.find((c) => c.id === "comm-roof-ponding");
    expect(ponding).toBeDefined();
    expect(ponding?.title).toContain("Ponding Beyond 48-Hour Threshold");
    expect(ponding?.severity).toBe("Moderate / Maintenance");
    expect(ponding?.typicalCostRange).toBeDefined();

    const tpo = clauses.find((c) => c.id === "comm-roof-tpo-weld");
    expect(tpo).toBeDefined();
    expect(tpo?.severity).toBe("Urgent Repair");
    expect(tpo?.actionRecommended).toContain("hot-air");
  });

  it("includes commercial HVAC mechanical defect clauses", () => {
    const clauses = getDefectClausesForTrade("hvac");
    expect(clauses.length).toBeGreaterThanOrEqual(4);

    const heatEx = clauses.find((c) => c.id === "hvac-heat-exchanger-crack");
    expect(heatEx).toBeDefined();
    expect(heatEx?.severity).toBe("Safety Hazard");
    expect(heatEx?.actionRecommended).toContain("red-tag");

    const compressor = clauses.find((c) => c.id === "hvac-compressor-short-cycle");
    expect(compressor).toBeDefined();
    expect(compressor?.severity).toBe("Urgent Repair");
  });

  it("finds defect clauses by global ID", () => {
    const found = findDefectClauseById("res-elec-gfci");
    expect(found).toBeDefined();
    expect(found?.title).toContain("Missing GFCI Protection");
    expect(found?.severity).toBe("Safety Hazard");

    const missing = findDefectClauseById("non-existent-id");
    expect(missing).toBeUndefined();
  });
});
