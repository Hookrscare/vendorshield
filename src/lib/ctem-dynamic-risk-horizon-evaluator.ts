/**
 * QA-199: Continuous Threat Exposure Management (CTEM) Dynamic Risk Horizon Evaluator.
 * Part of VendorShield B2B SOC 2 & GDPR Sub-Processor Trust Hub.
 *
 * Implements Gartner CTEM five-stage cycle:
 * 1. Scoping: Critical sub-processor assets and cross-tenant API boundaries
 * 2. Discovery: Attack surfaces, active CVE vulnerability exposures, EPSS exploit probabilities
 * 3. Prioritization: Business impact scoring, compensating control offsets
 * 4. Validation: Exploitability attestation and security posture verification
 * 5. Mobilization: Automated SLA-bound remediation ticketing and audit telemetry.
 */

import { createHash } from "crypto";

export interface SubProcessorAssetExposure {
  subProcessorId: string;
  subProcessorName: string;
  serviceTier: "TIER_1_CRITICAL" | "TIER_2_SIGNIFICANT" | "TIER_3_LOW";
  activeCveId?: string;
  cvssBaseScore?: number; // 0.0 - 10.0
  epssExploitProbability?: number; // 0.0 - 1.0
  cisaKevListed: boolean;
  hasCompensatingZeroTrustMtls: boolean;
  hasCompensatingWafDDoS: boolean;
  daysExposed: number;
}

export interface CtemEvaluationReport {
  subProcessorId: string;
  subProcessorName: string;
  dynamicRiskScore: number; // 0 (pristine) - 100 (critical imminent exposure)
  exposureTier: "LOW" | "ELEVATED" | "HIGH" | "CRITICAL";
  remediationSlaHours: number;
  compensatingControlsActive: boolean;
  recommendedRemediationAction: string;
  ctemStage: "VALIDATION" | "MOBILIZATION";
  complianceAttestationToken: string;
}

export class CtemDynamicRiskHorizonEvaluator {
  public static evaluateAssetExposure(exposure: SubProcessorAssetExposure): CtemEvaluationReport {
    if (!exposure.subProcessorId || !exposure.subProcessorName) {
      throw new Error("subProcessorId and subProcessorName are required.");
    }

    if (exposure.daysExposed < 0) {
      throw new Error("daysExposed cannot be negative.");
    }

    let baseRisk = 10.0;

    // Service tier baseline weighting
    if (exposure.serviceTier === "TIER_1_CRITICAL") {
      baseRisk += 30.0;
    } else if (exposure.serviceTier === "TIER_2_SIGNIFICANT") {
      baseRisk += 15.0;
    } else {
      baseRisk += 5.0;
    }

    // CVE severity component
    if (exposure.cvssBaseScore && exposure.cvssBaseScore > 0) {
      baseRisk += Math.min(10.0, exposure.cvssBaseScore) * 3.5;
    }

    // EPSS probability component
    if (exposure.epssExploitProbability && exposure.epssExploitProbability > 0) {
      baseRisk += Math.min(1.0, exposure.epssExploitProbability) * 20.0;
    }

    // CISA Known Exploited Vulnerabilities (KEV) active weaponization spike
    if (exposure.cisaKevListed) {
      baseRisk += 25.0;
    }

    // Exposure aging penalty
    if (exposure.daysExposed > 30) {
      baseRisk += 10.0;
    }

    // Compensating control discounts
    let compensatingControlsApplied = false;
    if (exposure.hasCompensatingZeroTrustMtls) {
      baseRisk -= 18.0;
      compensatingControlsApplied = true;
    }
    if (exposure.hasCompensatingWafDDoS) {
      baseRisk -= 12.0;
      compensatingControlsApplied = true;
    }

    // Clamp risk score to [0, 100]
    const dynamicRiskScore = Math.max(0.0, Math.min(100.0, Math.round(baseRisk * 10) / 10));

    // Determine exposure tier and remediation SLA
    let exposureTier: "LOW" | "ELEVATED" | "HIGH" | "CRITICAL" = "LOW";
    let remediationSlaHours = 720; // 30 days
    let recommendedAction = "Maintain standard periodic vulnerability scanning and dependency audits.";

    if (dynamicRiskScore >= 80.0) {
      exposureTier = "CRITICAL";
      remediationSlaHours = 24; // 24 hours
      recommendedAction = "Immediate emergency hotfix or sub-processor traffic quarantine required.";
    } else if (dynamicRiskScore >= 60.0) {
      exposureTier = "HIGH";
      remediationSlaHours = 72; // 3 days
      recommendedAction = "Apply vendor patch and verify zero-trust microsegmentation rules.";
    } else if (dynamicRiskScore >= 40.0) {
      exposureTier = "ELEVATED";
      remediationSlaHours = 168; // 7 days
      recommendedAction = "Schedule prioritized patch deployment during next release window.";
    }

    const ctemStage = dynamicRiskScore >= 60.0 ? "MOBILIZATION" : "VALIDATION";

    const payload = `${exposure.subProcessorId}:${dynamicRiskScore}:${exposureTier}:${remediationSlaHours}:${ctemStage}`;
    const token = createHash("sha256").update(payload).digest("hex");

    return {
      subProcessorId: exposure.subProcessorId,
      subProcessorName: exposure.subProcessorName,
      dynamicRiskScore,
      exposureTier,
      remediationSlaHours,
      compensatingControlsActive: compensatingControlsApplied,
      recommendedRemediationAction: recommendedAction,
      ctemStage,
      complianceAttestationToken: token
    };
  }
}
