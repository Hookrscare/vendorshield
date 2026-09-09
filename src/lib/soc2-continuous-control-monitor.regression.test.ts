/**
 * QA-139: Automated Continuous SOC 2 Trust Services Criteria Control Monitor Regression Tests.
 */

import { describe, it, expect } from "vitest";
import {
  Soc2ContinuousControlMonitor,
  ControlEvidenceSample
} from "./soc2-continuous-control-monitor";

describe("QA-139: SOC 2 Continuous Control Monitor", () => {
  const monitor = new Soc2ContinuousControlMonitor("test-secret-key-1234");

  it("evaluates healthy controls and generates compliant attestation", () => {
    const samples: ControlEvidenceSample[] = [
      {
        controlId: "CTRL-CC6.1-MFA",
        category: "CC6.1_LOGICAL_ACCESS",
        testedAtIso: "2026-09-08T10:00:00Z",
        observedMetric: 100,
        expectedThreshold: 100,
        isHigherBetter: true
      },
      {
        controlId: "CTRL-CC6.6-TLS",
        category: "CC6.6_BOUNDARY_PROTECTION",
        testedAtIso: "2026-09-08T10:00:00Z",
        observedMetric: 1.3,
        expectedThreshold: 1.2,
        isHigherBetter: true
      },
      {
        controlId: "CTRL-CC7.1-VULN",
        category: "CC7.1_VULNERABILITY_MANAGEMENT",
        testedAtIso: "2026-09-08T10:00:00Z",
        observedMetric: 0,
        expectedThreshold: 0,
        isHigherBetter: false
      }
    ];

    const report = monitor.generateReport("TENANT-ACME", samples);
    expect(report.overallComplianceScorePct).toBe(100);
    expect(report.auditStatus).toBe("COMPLIANT");
    expect(report.evaluatedControls).toHaveLength(3);
    expect(monitor.verifyReportAttestation(report)).toBe(true);
  });

  it("flags degraded controls and negative drift when metric drops", () => {
    const samples: ControlEvidenceSample[] = [
      {
        controlId: "CTRL-CC6.1-MFA",
        category: "CC6.1_LOGICAL_ACCESS",
        testedAtIso: "2026-09-01T00:00:00Z",
        observedMetric: 100,
        expectedThreshold: 95,
        isHigherBetter: true
      },
      {
        controlId: "CTRL-CC6.1-MFA",
        category: "CC6.1_LOGICAL_ACCESS",
        testedAtIso: "2026-09-08T00:00:00Z",
        observedMetric: 80,
        expectedThreshold: 95,
        isHigherBetter: true
      }
    ];

    const evalResult = monitor.analyzeControlHistory("CTRL-CC6.1-MFA", samples);
    expect(evalResult.state).toBe("FAILED");
    expect(evalResult.passRatePct).toBe(50);
    expect(evalResult.remediationAdvice).toContain("violates threshold");
  });

  it("detects drift when metric is technically passing but shows performance decay", () => {
    const samples: ControlEvidenceSample[] = [
      {
        controlId: "CTRL-CC8.1-REVIEW-TIME",
        category: "CC8.1_CHANGE_MANAGEMENT",
        testedAtIso: "2026-09-01T00:00:00Z",
        observedMetric: 2, // 2 hours
        expectedThreshold: 24,
        isHigherBetter: false
      },
      {
        controlId: "CTRL-CC8.1-REVIEW-TIME",
        category: "CC8.1_CHANGE_MANAGEMENT",
        testedAtIso: "2026-09-08T00:00:00Z",
        observedMetric: 12, // 12 hours (passing < 24, but 500% increase!)
        expectedThreshold: 24,
        isHigherBetter: false
      }
    ];

    const evalResult = monitor.analyzeControlHistory("CTRL-CC8.1-REVIEW-TIME", samples);
    expect(evalResult.state).toBe("DRIFT_DETECTED");
    expect(evalResult.driftPct).toBe(500);
  });

  it("detects tampering when attestation report is modified", () => {
    const samples: ControlEvidenceSample[] = [
      {
        controlId: "CTRL-CC6.7-ENC",
        category: "CC6.7_ENCRYPTION_TRANSIT_REST",
        testedAtIso: "2026-09-08T00:00:00Z",
        observedMetric: 256,
        expectedThreshold: 256,
        isHigherBetter: true
      }
    ];

    const report = monitor.generateReport("TENANT-TAMPER", samples);
    expect(monitor.verifyReportAttestation(report)).toBe(true);

    // Tamper with score
    report.overallComplianceScorePct = 50;
    expect(monitor.verifyReportAttestation(report)).toBe(false);
  });
});
