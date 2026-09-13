/**
 * QA-196: Continuous Threat Exposure Management (CTEM) Risk Scorer.
 * Part of VendorShield Third-Party Governance & Compliance Platform.
 *
 * Implements the Gartner Continuous Threat Exposure Management (CTEM) framework:
 * - 5 Stages: Scoping, Discovery, Prioritization, Validation, Mobilization
 * - Contextual Risk Scoring: Combines CVSS, EPSS probability, CISA KEV inclusion, and Asset Criticality
 * - Prescribes automated remediation SLA horizons (24h, 7d, 30d, 90d)
 * - Emits cryptographic SHA-256 risk attestation digests
 */

import { createHash } from "crypto";

export type AssetCriticalityTier = "TIER_1_CROWN_JEWEL" | "TIER_2_BUSINESS_CRITICAL" | "TIER_3_INTERNAL" | "TIER_4_DEV_TEST";
export type CtemStage = "SCOPING" | "DISCOVERY" | "PRIORITIZATION" | "VALIDATION" | "MOBILIZATION";

export interface ThreatExposureFinding {
  cveId: string; // e.g., "CVE-2026-2143"
  assetId: string;
  assetCriticality: AssetCriticalityTier;
  cvssBaseScore: number; // 0.0 - 10.0
  epssProbability: number; // 0.0 - 1.0
  isCisaKevListed: boolean;
  isInternetExposed: boolean;
  compensatingControlActive: boolean;
}

export interface CtemScoringResult {
  cveId: string;
  assetId: string;
  compositeExposureScore: number; // 0.0 - 100.0
  riskTier: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  remediationSlaHours: number;
  currentCtemStage: CtemStage;
  recommendedMobilizationAction: string;
  ctemAttestationDigest: string;
}

export class CtemContinuousThreatExposureScorer {
  public static calculateExposure(finding: ThreatExposureFinding): CtemScoringResult {
    if (!finding.cveId || !finding.assetId) {
      throw new Error("cveId and assetId are required.");
    }
    if (finding.cvssBaseScore < 0.0 || finding.cvssBaseScore > 10.0) {
      throw new Error("cvssBaseScore must be between 0.0 and 10.0.");
    }
    if (finding.epssProbability < 0.0 || finding.epssProbability > 1.0) {
      throw new Error("epssProbability must be between 0.0 and 1.0.");
    }

    // Asset multiplier
    const assetMultipliers: Record<AssetCriticalityTier, number> = {
      TIER_1_CROWN_JEWEL: 1.5,
      TIER_2_BUSINESS_CRITICAL: 1.25,
      TIER_3_INTERNAL: 0.9,
      TIER_4_DEV_TEST: 0.5
    };
    const multiplier = assetMultipliers[finding.assetCriticality] || 1.0;

    // Base score contribution (CVSS * 5 -> up to 50 pts)
    let score = finding.cvssBaseScore * 5.0;

    // EPSS contribution (EPSS * 25 -> up to 25 pts)
    score += finding.epssProbability * 25.0;

    // CISA KEV active exploitation boost
    if (finding.isCisaKevListed) {
      score += 20.0;
    }

    // Internet facing boost
    if (finding.isInternetExposed) {
      score += 10.0;
    }

    // Scale by asset criticality
    score = score * multiplier;

    // Compensating control discount
    if (finding.compensatingControlActive) {
      score *= 0.65;
    }

    // Bound score between 0.0 and 100.0
    const compositeScore = Number(Math.min(100.0, Math.max(0.0, score)).toFixed(1));

    // Determine Risk Tier and Remediation SLA
    let riskTier: CtemScoringResult["riskTier"] = "LOW";
    let slaHours = 2160; // 90 days
    let stage: CtemStage = "VALIDATION";
    let action = "Log finding in threat register and patch during routine maintenance cycle.";

    if (compositeScore >= 80.0) {
      riskTier = "CRITICAL";
      slaHours = 24; // 24 hours
      stage = "MOBILIZATION";
      action = "IMMEDIATE MOBILIZATION: Engage SecOps on-call, deploy virtual patch or isolate asset within 24 hours.";
    } else if (compositeScore >= 60.0) {
      riskTier = "HIGH";
      slaHours = 168; // 7 days
      stage = "MOBILIZATION";
      action = "HIGH EXPOSURE: Schedule high-priority remediation sprint within 7 days.";
    } else if (compositeScore >= 35.0) {
      riskTier = "MEDIUM";
      slaHours = 720; // 30 days
      stage = "PRIORITIZATION";
      action = "MEDIUM EXPOSURE: Prioritize fix in upcoming release sprint (30-day window).";
    }

    const digestPayload = `${finding.cveId}:${finding.assetId}:${compositeScore}:${riskTier}:${slaHours}`;
    const ctemAttestationDigest = createHash("sha256").update(digestPayload).digest("hex");

    return {
      cveId: finding.cveId,
      assetId: finding.assetId,
      compositeExposureScore: compositeScore,
      riskTier,
      remediationSlaHours: slaHours,
      currentCtemStage: stage,
      recommendedMobilizationAction: action,
      ctemAttestationDigest
    };
  }
}
