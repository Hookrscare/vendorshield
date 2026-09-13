/**
 * QA-111: Enterprise B2B Compliance Attestation & Vendor Governance Hardening.
 * Part of VendorShield B2B Trust & Enterprise Security Platform.
 * 
 * Verifies third-party vendor attestation artifacts (SOC 2 Type II, ISO 27001, pen-tests, encryption)
 * and assesses organizational supply-chain governance posture.
 */

import { createHash } from "crypto";

export interface VendorAttestationEvidence {
  vendorId: string;
  vendorName: string;
  soc2ReportAgeDays: number;
  soc2ReportCleanOpinion: boolean;
  penTestAgeDays: number;
  encryptionAtRestEnforced: boolean;
  encryptionInTransitTls13: boolean;
  dpaSigned: boolean;
}

export interface GovernanceEvaluationResult {
  vendorId: string;
  trustScore: number; // 0 to 100
  governancePosture: 
    | "FULL_COMPLIANT_ENTERPRISE_READY"
    | "CONDITIONAL_PROVISIONAL_AUDIT_REQUIRED"
    | "HIGH_RISK_GOVERNANCE_BLOCKED";
  remediationRequirements: string[];
  verificationDigest: string;
}

export class ComplianceAttestationGovernanceEngine {
  public static evaluateVendorGovernance(
    evidence: VendorAttestationEvidence
  ): GovernanceEvaluationResult {
    if (!evidence.vendorId || !evidence.vendorName) {
      throw new Error("vendorId and vendorName must be specified.");
    }
    if (evidence.soc2ReportAgeDays < 0 || evidence.penTestAgeDays < 0) {
      throw new Error("Report ages cannot be negative.");
    }

    let score = 0;
    const remediations: string[] = [];

    // 1. SOC 2 Type II evaluation (Max 40 pts)
    if (evidence.soc2ReportCleanOpinion && evidence.soc2ReportAgeDays <= 365) {
      score += 40;
    } else if (evidence.soc2ReportCleanOpinion && evidence.soc2ReportAgeDays <= 450) {
      score += 20;
      remediations.append?.("SOC 2 Type II report renewal required within 90 days.") ||
        remediations.push("SOC 2 Type II report renewal required within 90 days.");
    } else {
      remediations.push("Missing or expired/qualified SOC 2 Type II attestation.");
    }

    // 2. Penetration testing recency (Max 20 pts)
    if (evidence.penTestAgeDays <= 180) {
      score += 20;
    } else if (evidence.penTestAgeDays <= 365) {
      score += 10;
      remediations.push("Annual external penetration test due for renewal.");
    } else {
      remediations.push("Penetration test exceeds 365-day threshold.");
    }

    // 3. Cryptographic controls (Max 25 pts)
    if (evidence.encryptionAtRestEnforced && evidence.encryptionInTransitTls13) {
      score += 25;
    } else {
      if (!evidence.encryptionAtRestEnforced) {
        remediations.push("AES-256 data-at-rest encryption not verified.");
      }
      if (!evidence.encryptionInTransitTls13) {
        remediations.push("TLS 1.3 in-transit encryption enforcement missing.");
      }
    }

    // 4. Data Processing Agreement (Max 15 pts)
    if (evidence.dpaSigned) {
      score += 15;
    } else {
      remediations.push("Countersigned GDPR/CCPA Data Processing Agreement (DPA) required.");
    }

    let posture: GovernanceEvaluationResult["governancePosture"];
    if (score >= 85) {
      posture = "FULL_COMPLIANT_ENTERPRISE_READY";
    } else if (score >= 60) {
      posture = "CONDITIONAL_PROVISIONAL_AUDIT_REQUIRED";
    } else {
      posture = "HIGH_RISK_GOVERNANCE_BLOCKED";
    }

    const raw = `${evidence.vendorId}:${score}:${posture}:${remediations.length}`;
    const digest = createHash("sha256").update(raw).digest("hex");

    return {
      vendorId: evidence.vendorId,
      trustScore: score,
      governancePosture: posture,
      remediationRequirements: remediations,
      verificationDigest: digest
    };
  }
}
