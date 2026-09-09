/**
 * QA-139: Automated Continuous SOC 2 Trust Services Criteria Control Monitor.
 * Provides real-time automated telemetry evaluation, control drift detection,
 * hash-linked evidence chains, and audit-ready attestation reports for SOC 2 Type II.
 */

import { createHash } from "crypto";

export type TrustServicesCategory =
  | "CC6.1_LOGICAL_ACCESS"
  | "CC6.6_BOUNDARY_PROTECTION"
  | "CC6.7_ENCRYPTION_TRANSIT_REST"
  | "CC7.1_VULNERABILITY_MANAGEMENT"
  | "CC8.1_CHANGE_MANAGEMENT"
  | "A1.2_BACKUP_AND_RECOVERY";

export type ControlState = "EFFECTIVE" | "DEGRADED" | "FAILED" | "DRIFT_DETECTED";

export interface ControlEvidenceSample {
  controlId: string;
  category: TrustServicesCategory;
  testedAtIso: string;
  observedMetric: number;
  expectedThreshold: number;
  isHigherBetter: boolean;
  rawTelemetrySnippet?: Record<string, unknown>;
  evidenceHash?: string;
  passed?: boolean;
}

export interface ControlEvaluation {
  controlId: string;
  category: TrustServicesCategory;
  state: ControlState;
  samplesCount: number;
  passRatePct: number;
  driftPct: number;
  lastEvaluatedIso: string;
  remediationAdvice?: string;
}

export interface ControlMonitoringReport {
  reportId: string;
  tenantId: string;
  generatedAtIso: string;
  overallComplianceScorePct: number;
  auditStatus: "COMPLIANT" | "ACTION_REQUIRED" | "NON_COMPLIANT";
  evaluatedControls: ControlEvaluation[];
  evidenceFingerprint: string;
  attestationSignature: string;
}

export class Soc2ContinuousControlMonitor {
  private hmacSecret: string;

  constructor(hmacSecret = "soc2-monitor-default-salt-2026") {
    this.hmacSecret = hmacSecret;
  }

  /**
   * Evaluates a single evidence sample against expected thresholds.
   */
  public evaluateSingleSample(sample: ControlEvidenceSample): { passed: boolean; evidenceHash: string } {
    let passed = false;
    if (sample.isHigherBetter) {
      passed = sample.observedMetric >= sample.expectedThreshold;
    } else {
      passed = sample.observedMetric <= sample.expectedThreshold;
    }

    const payload = JSON.stringify({
      cid: sample.controlId,
      cat: sample.category,
      time: sample.testedAtIso,
      metric: sample.observedMetric,
      threshold: sample.expectedThreshold,
      passed,
      raw: sample.rawTelemetrySnippet || {}
    });

    const hash = createHash("sha256").update(payload).digest("hex");
    return { passed, evidenceHash: hash };
  }

  /**
   * Analyzes historical samples for a control to detect performance drift.
   */
  public analyzeControlHistory(controlId: string, samples: ControlEvidenceSample[]): ControlEvaluation {
    const relevant = samples
      .filter((s) => s.controlId === controlId)
      .sort((a, b) => new Date(a.testedAtIso).getTime() - new Date(b.testedAtIso).getTime());

    if (relevant.length === 0) {
      throw new Error(`No telemetry samples found for control ${controlId}`);
    }

    const category = relevant[0].category;
    let passedCount = 0;
    const evaluatedSamples = relevant.map((s) => {
      const res = this.evaluateSingleSample(s);
      if (res.passed) passedCount++;
      return { ...s, passed: res.passed, evidenceHash: res.evidenceHash };
    });

    const passRatePct = Math.round((passedCount / relevant.length) * 100);
    const lastSample = evaluatedSamples[evaluatedSamples.length - 1];

    // Compute metric drift: compare first baseline with last sample
    const firstMetric = relevant[0].observedMetric;
    const lastMetric = lastSample.observedMetric;
    const isHigherBetter = relevant[0].isHigherBetter;

    let driftPct = 0;
    if (firstMetric !== 0) {
      driftPct = Math.round(((lastMetric - firstMetric) / Math.abs(firstMetric)) * 100);
    }

    let state: ControlState = "EFFECTIVE";
    let remediationAdvice: string | undefined;

    if (!lastSample.passed) {
      state = "FAILED";
      remediationAdvice = `Critical: Current metric ${lastMetric} violates threshold ${lastSample.expectedThreshold}.`;
    } else if (passRatePct < 85) {
      state = "DEGRADED";
      remediationAdvice = `Warning: Pass rate ${passRatePct}% is below continuous audit SLA (85%).`;
    } else if (isHigherBetter && driftPct < -15) {
      state = "DRIFT_DETECTED";
      remediationAdvice = `Drift notice: Performance degraded by ${Math.abs(driftPct)}% from baseline.`;
    } else if (!isHigherBetter && driftPct > 15) {
      state = "DRIFT_DETECTED";
      remediationAdvice = `Drift notice: Risk metric climbed by ${driftPct}% from baseline.`;
    }

    return {
      controlId,
      category,
      state,
      samplesCount: relevant.length,
      passRatePct,
      driftPct,
      lastEvaluatedIso: lastSample.testedAtIso,
      remediationAdvice
    };
  }

  /**
   * Generates a comprehensive SOC 2 continuous control monitoring report.
   */
  public generateReport(tenantId: string, samples: ControlEvidenceSample[]): ControlMonitoringReport {
    const controlIds = Array.from(new Set(samples.map((s) => s.controlId)));
    const evaluations: ControlEvaluation[] = controlIds.map((cid) =>
      this.analyzeControlHistory(cid, samples)
    );

    const totalControls = evaluations.length;
    const effectiveCount = evaluations.filter((e) => e.state === "EFFECTIVE").length;
    const failedCount = evaluations.filter((e) => e.state === "FAILED").length;
    
    const overallScore = totalControls > 0 ? Math.round((effectiveCount / totalControls) * 100) : 0;

    let auditStatus: "COMPLIANT" | "ACTION_REQUIRED" | "NON_COMPLIANT" = "COMPLIANT";
    if (failedCount > 0) {
      auditStatus = "NON_COMPLIANT";
    } else if (overallScore < 90 || evaluations.some((e) => e.state === "DEGRADED" || e.state === "DRIFT_DETECTED")) {
      auditStatus = "ACTION_REQUIRED";
    }

    const reportId = `soc2-rep-${tenantId.toLowerCase()}-${Date.now()}`;
    const generatedAtIso = new Date().toISOString();

    // Cumulative SHA-256 fingerprint over all control evaluations
    const fingerprint = createHash("sha256")
      .update(JSON.stringify(evaluations))
      .digest("hex");

    const attestationPayload = `${reportId}:${tenantId}:${overallScore}:${auditStatus}:${fingerprint}`;
    const attestationSignature = createHash("sha256")
      .update(`${attestationPayload}:${this.hmacSecret}`)
      .digest("hex");

    return {
      reportId,
      tenantId,
      generatedAtIso,
      overallComplianceScorePct: overallScore,
      auditStatus,
      evaluatedControls: evaluations,
      evidenceFingerprint: fingerprint,
      attestationSignature
    };
  }

  /**
   * Verifies cryptographic attestation integrity.
   */
  public verifyReportAttestation(report: ControlMonitoringReport): boolean {
    const computedFingerprint = createHash("sha256")
      .update(JSON.stringify(report.evaluatedControls))
      .digest("hex");

    if (computedFingerprint !== report.evidenceFingerprint) {
      return false;
    }

    const payload = `${report.reportId}:${report.tenantId}:${report.overallComplianceScorePct}:${report.auditStatus}:${computedFingerprint}`;
    const expectedSig = createHash("sha256")
      .update(`${payload}:${this.hmacSecret}`)
      .digest("hex");

    return expectedSig === report.attestationSignature;
  }
}
