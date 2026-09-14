import { describe, it, expect } from "vitest";
import {
  DynamicTriggerVendorReassessmentPipeline,
  RiskTriggerEvent
} from "./dynamic-trigger-vendor-reassessment-pipeline";

describe("QA-117: DynamicTriggerVendorReassessmentPipeline", () => {
  const pipeline = new DynamicTriggerVendorReassessmentPipeline();
  const fixedDate = new Date("2026-09-14T00:00:00.000Z");

  it("schedules emergency 72-hour re-assessment upon critical breach or zero-day", () => {
    const triggers: RiskTriggerEvent[] = [
      {
        eventId: "trig-001",
        vendorId: "vendor-auth-provider",
        eventType: "SUBPROCESSOR_DATA_BREACH",
        severity: "CRITICAL",
        details: "Customer credential leak identified on breach telemetry feed",
        detectedAtIso: "2026-09-13T23:50:00.000Z"
      }
    ];

    const wf = pipeline.evaluateTriggers("vendor-auth-provider", triggers, fixedDate);

    expect(wf.urgencyLevel).toBe("EMERGENCY_72HR");
    expect(wf.daysUntilDeadline).toBe(3);
    expect(wf.escalationRequired).toBe(true);
    expect(wf.requiredQuestionnaires).toContain("SIG_CORE");
    expect(wf.deadlineIso).toBe("2026-09-17T00:00:00.000Z");
    expect(wf.tamperProofAuditDigest).toHaveLength(64);
  });

  it("schedules expedited 14-day workflow for high severity SLA or cert lapse", () => {
    const triggers: RiskTriggerEvent[] = [
      {
        eventId: "trig-002",
        vendorId: "vendor-cdn-cache",
        eventType: "SOC2_ATTESTATION_LAPSED",
        severity: "HIGH",
        details: "SOC 2 Type II report expired without renewed bridge letter",
        detectedAtIso: "2026-09-13T12:00:00.000Z"
      }
    ];

    const wf = pipeline.evaluateTriggers("vendor-cdn-cache", triggers, fixedDate);

    expect(wf.urgencyLevel).toBe("EXPEDITED_14DAY");
    expect(wf.daysUntilDeadline).toBe(14);
    expect(wf.escalationRequired).toBe(false);
    expect(wf.requiredQuestionnaires).toContain("CAIQ_LITE");
    expect(wf.deadlineIso).toBe("2026-09-28T00:00:00.000Z");
  });

  it("validates empty inputs", () => {
    expect(() => pipeline.evaluateTriggers("", [], fixedDate)).toThrow("vendorId cannot be empty.");
    expect(() => pipeline.evaluateTriggers("vendor-1", [], fixedDate)).toThrow("triggers list cannot be empty.");
  });
});
