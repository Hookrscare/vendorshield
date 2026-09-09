/**
 * QA-139: Automated Continuous SOC 2 Trust Services Criteria Control Monitor.
 * Part of VendorShield B2B SOC 2 & GDPR Sub-Processor Trust Hub.
 * Evaluates AICPA Trust Services Criteria (TSC) common controls across CC1-CC9,
 * monitors evidence freshness SLAs, detects control drift, and generates continuous compliance posture alerts.
 */

export type CommonCriteriaCategory =
  | "CC1_CONTROL_ENVIRONMENT"
  | "CC2_COMMUNICATION_INFO"
  | "CC3_RISK_ASSESSMENT"
  | "CC4_MONITORING_ACTIVITIES"
  | "CC5_CONTROL_ACTIVITIES"
  | "CC6_LOGICAL_PHYSICAL_ACCESS"
  | "CC7_SYSTEM_OPERATIONS"
  | "CC8_CHANGE_MANAGEMENT"
  | "CC9_RISK_MITIGATION";

export interface ControlDefinition {
  controlId: string; // e.g. "CC6.1"
  category: CommonCriteriaCategory;
  title: string;
  description: string;
  evidenceFreshnessMaxHours: number; // e.g. 24 hours for daily checks
  enforcementLevel: "MANDATORY" | "RECOMMENDED";
}

export interface ControlTelemetrySignal {
  signalId: string;
  controlId: string;
  vendorId: string;
  collectedAtIso: string;
  status: "PASS" | "FAIL" | "WARNING";
  telemetrySource: "IAM" | "SIEM" | "CI_CD" | "VULN_SCAN" | "KMS" | "BACKUP";
  payloadHash?: string;
  details?: Record<string, any>;
}

export interface ControlEvaluationResult {
  controlId: string;
  category: CommonCriteriaCategory;
  title: string;
  isCompliant: boolean;
  driftDetected: boolean;
  freshnessStatus: "FRESH" | "STALE" | "EXPIRED" | "NO_EVIDENCE";
  lastCollectedAtIso: string | null;
  activeSignalsCount: number;
  failingSignalsCount: number;
  remediationRecommendation: string | null;
}

export interface PortfolioSoc2ControlReport {
  vendorId: string;
  evaluatedAtIso: string;
  overallComplianceScore: number; // 0 to 100
  totalControlsMonitored: number;
  compliantControlsCount: number;
  driftedControlsCount: number;
  failingControlsCount: number;
  auditReadinessStatus: "AUDIT_READY" | "REMEDIATION_REQUIRED" | "NON_COMPLIANT";
  evaluations: Record<string, ControlEvaluationResult>;
}

export const BASELINE_TSC_CONTROLS: ControlDefinition[] = [
  {
    controlId: "CC1.1",
    category: "CC1_CONTROL_ENVIRONMENT",
    title: "Commitment to Integrity and Ethical Values",
    description: "Annual security awareness training and code of conduct attestation.",
    evidenceFreshnessMaxHours: 720, // 30 days
    enforcementLevel: "MANDATORY"
  },
  {
    controlId: "CC6.1",
    category: "CC6_LOGICAL_PHYSICAL_ACCESS",
    title: "Logical Access Security Infrastructure & MFA Enforcement",
    description: "Continuous enforcement of multi-factor authentication across all privileged access.",
    evidenceFreshnessMaxHours: 24, // daily check
    enforcementLevel: "MANDATORY"
  },
  {
    controlId: "CC6.6",
    category: "CC6_LOGICAL_PHYSICAL_ACCESS",
    title: "Boundary Protection and Network Encryption",
    description: "TLS 1.3 in-transit and KMS envelope encryption at rest across all sub-processor databases.",
    evidenceFreshnessMaxHours: 48,
    enforcementLevel: "MANDATORY"
  },
  {
    controlId: "CC7.1",
    category: "CC7_SYSTEM_OPERATIONS",
    title: "Vulnerability Management & Threat Detection",
    description: "Automated container scanning and dynamic application security testing.",
    evidenceFreshnessMaxHours: 72,
    enforcementLevel: "MANDATORY"
  },
  {
    controlId: "CC8.1",
    category: "CC8_CHANGE_MANAGEMENT",
    title: "Branch Protection & Peer-Reviewed Code Deployments",
    description: "Cryptographic branch protection requiring multi-agent approval and automated CI testing.",
    evidenceFreshnessMaxHours: 24,
    enforcementLevel: "MANDATORY"
  }
];

export class Soc2ContinuousControlMonitor {
  private controls: Map<string, ControlDefinition>;

  constructor(customControls: ControlDefinition[] = BASELINE_TSC_CONTROLS) {
    this.controls = new Map();
    for (const ctrl of customControls) {
      this.controls.set(ctrl.controlId, ctrl);
    }
  }

  public evaluateControls(
    vendorId: string,
    telemetryStream: ControlTelemetrySignal[],
    evaluationTimeIso: string = new Date().toISOString()
  ): PortfolioSoc2ControlReport {
    const evalEpoch = new Date(evaluationTimeIso).getTime();
    const signalsByControl = new Map<string, ControlTelemetrySignal[]>();

    for (const signal of telemetryStream) {
      const existing = signalsByControl.get(signal.controlId) || [];
      existing.push(signal);
      signalsByControl.set(signal.controlId, existing);
    }

    const evaluations: Record<string, ControlEvaluationResult> = {};
    let compliantCount = 0;
    let driftedCount = 0;
    let failingCount = 0;

    for (const [controlId, def] of this.controls.entries()) {
      const signals = signalsByControl.get(controlId) || [];
      if (signals.length === 0) {
        evaluations[controlId] = {
          controlId,
          category: def.category,
          title: def.title,
          isCompliant: false,
          driftDetected: false,
          freshnessStatus: "NO_EVIDENCE",
          lastCollectedAtIso: null,
          activeSignalsCount: 0,
          failingSignalsCount: 0,
          remediationRecommendation: `Collect automated telemetry evidence for ${def.title} immediately.`
        };
        failingCount++;
        continue;
      }

      // Sort newest first
      signals.sort((a, b) => new Date(b.collectedAtIso).getTime() - new Date(a.collectedAtIso).getTime());
      const latestSignal = signals[0];
      const latestEpoch = new Date(latestSignal.collectedAtIso).getTime();
      const ageHours = (evalEpoch - latestEpoch) / (1000 * 60 * 60);

      let freshness: "FRESH" | "STALE" | "EXPIRED" = "FRESH";
      if (ageHours > def.evidenceFreshnessMaxHours * 2) {
        freshness = "EXPIRED";
      } else if (ageHours > def.evidenceFreshnessMaxHours) {
        freshness = "STALE";
      }

      const failingSignals = signals.filter(s => s.status === "FAIL");
      const warningSignals = signals.filter(s => s.status === "WARNING");
      const isFailing = failingSignals.length > 0 || latestSignal.status === "FAIL";
      const driftDetected = freshness !== "FRESH" || warningSignals.length > 0;

      const isCompliant = !isFailing && freshness === "FRESH";

      let recommendation: string | null = null;
      if (isFailing) {
        recommendation = `Investigate ${failingSignals.length} failing telemetry signals for ${controlId}.`;
      } else if (freshness !== "FRESH") {
        recommendation = `Evidence telemetry age (${Math.round(ageHours)}h) exceeds SLA limit (${def.evidenceFreshnessMaxHours}h). Refresh collector.`;
      }

      evaluations[controlId] = {
        controlId,
        category: def.category,
        title: def.title,
        isCompliant,
        driftDetected,
        freshnessStatus: freshness,
        lastCollectedAtIso: latestSignal.collectedAtIso,
        activeSignalsCount: signals.length,
        failingSignalsCount: failingSignals.length,
        remediationRecommendation: recommendation
      };

      if (isCompliant) {
        compliantCount++;
      } else if (driftDetected && !isFailing) {
        driftedCount++;
      } else {
        failingCount++;
      }
    }

    const total = this.controls.size;
    const score = total > 0 ? Math.round((compliantCount / total) * 100) : 0;

    let auditReadinessStatus: "AUDIT_READY" | "REMEDIATION_REQUIRED" | "NON_COMPLIANT" = "NON_COMPLIANT";
    if (score >= 90) {
      auditReadinessStatus = "AUDIT_READY";
    } else if (score >= 60) {
      auditReadinessStatus = "REMEDIATION_REQUIRED";
    }

    return {
      vendorId,
      evaluatedAtIso: evaluationTimeIso,
      overallComplianceScore: score,
      totalControlsMonitored: total,
      compliantControlsCount: compliantCount,
      driftedControlsCount: driftedCount,
      failingControlsCount: failingCount,
      auditReadinessStatus,
      evaluations
    };
  }
}
