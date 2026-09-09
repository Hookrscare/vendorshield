import { describe, it, expect } from "vitest";
import {
  Soc2ContinuousControlMonitor,
  ControlTelemetrySignal,
  BASELINE_TSC_CONTROLS
} from "./soc2-control-monitor";

describe("QA-139: Soc2ContinuousControlMonitor Regression Suite", () => {
  const monitor = new Soc2ContinuousControlMonitor();
  const baseDate = new Date("2026-09-09T00:00:00.000Z");

  it("evaluates all baseline controls as compliant when fresh passing telemetry exists", () => {
    const signals: ControlTelemetrySignal[] = BASELINE_TSC_CONTROLS.map((ctrl, i) => ({
      signalId: `sig-${i}`,
      controlId: ctrl.controlId,
      vendorId: "vnd-acme",
      collectedAtIso: "2026-09-08T23:30:00.000Z", // 30 mins ago
      status: "PASS",
      telemetrySource: "CI_CD"
    }));

    const report = monitor.evaluateControls("vnd-acme", signals, baseDate.toISOString());

    expect(report.overallComplianceScore).toBe(100);
    expect(report.compliantControlsCount).toBe(BASELINE_TSC_CONTROLS.length);
    expect(report.auditReadinessStatus).toBe("AUDIT_READY");
    expect(report.evaluations["CC6.1"].isCompliant).toBe(true);
    expect(report.evaluations["CC6.1"].freshnessStatus).toBe("FRESH");
  });

  it("detects stale/expired telemetry drift when evidence exceeds SLA freshness", () => {
    const signals: ControlTelemetrySignal[] = [
      {
        signalId: "sig-stale",
        controlId: "CC6.1", // requires 24h freshness
        vendorId: "vnd-acme",
        collectedAtIso: "2026-09-07T00:00:00.000Z", // 48 hours ago
        status: "PASS",
        telemetrySource: "IAM"
      }
    ];

    const report = monitor.evaluateControls("vnd-acme", signals, baseDate.toISOString());

    const cc61 = report.evaluations["CC6.1"];
    expect(cc61.isCompliant).toBe(false);
    expect(cc61.driftDetected).toBe(true);
    expect(cc61.freshnessStatus).toBe("STALE");
    expect(cc61.remediationRecommendation).toContain("exceeds SLA limit");
  });

  it("flags failing telemetry signals and downgrades audit readiness score", () => {
    const signals: ControlTelemetrySignal[] = [
      {
        signalId: "sig-fail",
        controlId: "CC7.1",
        vendorId: "vnd-acme",
        collectedAtIso: "2026-09-08T23:00:00.000Z",
        status: "FAIL",
        telemetrySource: "VULN_SCAN"
      }
    ];

    const report = monitor.evaluateControls("vnd-acme", signals, baseDate.toISOString());

    const cc71 = report.evaluations["CC7.1"];
    expect(cc71.isCompliant).toBe(false);
    expect(cc71.failingSignalsCount).toBe(1);
    expect(cc71.remediationRecommendation).toContain("failing telemetry signals");
    expect(report.auditReadinessStatus).toBe("NON_COMPLIANT");
  });
});
