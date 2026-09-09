import { describe, it, expect } from "vitest";
import {
  PunchListDispatcher,
  FieldDefectInput,
} from "./punchlist-dispatcher";

describe("SNAP-28: Multi-Trade Subcontractor Punch-List Task Assignment Push Notification Dispatcher", () => {
  it("creates punch-list items with trade-specific routing and correct SLA deadlines", () => {
    const defect: FieldDefectInput = {
      defectId: "def-roof-01",
      title: "Punctured TPO Membrane Seam at Parapet Wall",
      description: "Water pooling detected under flashing adjacent to drain #2.",
      trade: "ROOFING",
      severity: "CRITICAL",
      floorplanCadCoordinates: { x: 124.5, y: 88.0, floor: "Roof" },
      photoUrl: "https://snapinspect.local/photos/tpo-tear.jpg",
      assignedSubcontractorId: "sub-apex-roofing",
    };

    const item = PunchListDispatcher.createPunchListItem(defect);
    expect(item.trade).toBe("ROOFING");
    expect(item.severity).toBe("CRITICAL");
    expect(item.slaHours).toBe(24);
    expect(item.subcontractorId).toBe("sub-apex-roofing");
    expect(item.status).toBe("ASSIGNED");

    // Due date should be 24h ahead
    const assignedEpoch = new Date(item.assignedAtIso).getTime();
    const dueEpoch = new Date(item.dueAtIso).getTime();
    expect(dueEpoch - assignedEpoch).toBe(24 * 3600 * 1000);
  });

  it("generates formatted Web Push notification payload for subcontractors", () => {
    const defect: FieldDefectInput = {
      defectId: "def-elec-02",
      title: "Exposed Romex 12/2 in Utility Room",
      description: "Junction box missing cover plate near panel B.",
      trade: "ELECTRICAL",
      severity: "MAJOR",
    };

    const item = PunchListDispatcher.createPunchListItem(defect);
    const push = PunchListDispatcher.generateWebPushPayload(item, "450 Industrial Blvd");

    expect(push.title).toContain("URGENT");
    expect(push.title).toContain("Exposed Romex");
    expect(push.body).toContain("[ELECTRICAL]");
    expect(push.body).toContain("450 Industrial Blvd");
    expect(push.data.punchId).toBe(item.punchId);
  });

  it("evaluates overdue items and escalates SLA breach", () => {
    const defect: FieldDefectInput = {
      defectId: "def-hvac-03",
      title: "Condensate Drain Line Air Lock",
      description: "Primary drip pan overflowing.",
      trade: "HVAC",
      severity: "CRITICAL",
    };

    // Created 30 hours ago (exceeding 24h SLA)
    const pastDate = new Date(Date.now() - 30 * 3600 * 1000);
    const item = PunchListDispatcher.createPunchListItem(defect, pastDate);

    const status = PunchListDispatcher.evaluateSlaStatus(item, new Date());
    expect(status).toBe("ESCALATED_OVERDUE");
  });

  it("dispatches batch punch-list items across multiple trades", () => {
    const defects: FieldDefectInput[] = [
      {
        defectId: "d1",
        title: "Drywall Tape Bubble in Office 201",
        description: "Ceiling seam separation.",
        trade: "FINISH_DRYWALL",
        severity: "COSMETIC",
      },
      {
        defectId: "d2",
        title: "Main Water Shutoff Valve Seepage",
        description: "Gate valve packing nut loose.",
        trade: "PLUMBING",
        severity: "CRITICAL",
      },
    ];

    const result = PunchListDispatcher.batchDispatch(defects, "Commercial Center A");
    expect(result.items.length).toBe(2);
    expect(result.pushNotifications.length).toBe(2);
    expect(result.items[0].slaHours).toBe(336); // Cosmetic 14 days
    expect(result.items[1].slaHours).toBe(24);  // Critical 24h
  });
});
