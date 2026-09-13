/**
 * QA-178: Cross-Border Cloud Data Residency Sovereign Encryption Key Custody Evaluator.
 * Part of VendorShield B2B SOC 2 & GDPR Sub-Processor Trust Hub.
 *
 * Evaluates third-party vendor cross-border data flows and cryptographic sovereignty:
 * - Sovereign Key Custody Models (HYOK, BYOK, Dedicated HSM FIPS 140-3, Provider Managed)
 * - Multi-Jurisdictional Cross-Border Transfer Mechanisms (GDPR Art. 44-49, Schrems II, DPF, SCCs)
 * - Extraterritorial Jurisdiction & Subpoena Conflict Risk (CLOUD Act, FISA 702 vs EU Art. 48)
 * - Quantitative Sovereign Custody & Residency Compliance Score (0 - 100)
 * - Cryptographic SHA-256 verification audit ledger
 */

import { createHash } from "crypto";

export type KeyCustodyModel = 
  | "HYOK"                  // Hold Your Own Key (External On-Prem/Sovereign HSM)
  | "BYOK"                  // Bring Your Own Key (Cloud KMS with Customer-Controlled Root Key)
  | "DEDICATED_CLOUD_HSM"   // FIPS 140-3 Level 3 Hardware Security Module dedicated to tenant
  | "SHARED_CLOUD_KMS"      // Provider-managed multi-tenant KMS
  | "UNENCRYPTED_OR_STATIC"; // Static or non-rotated vendor-managed keys

export type Jurisdiction =
  | "EU"       // European Union (GDPR Adequacy)
  | "EEA"      // European Economic Area
  | "CH"       // Switzerland (FADP)
  | "UK"       // United Kingdom (UK GDPR)
  | "US"       // United States (State Privacy + CLOUD Act exposure)
  | "CA"       // Canada (PIPEDA)
  | "AU"       // Australia (Privacy Act)
  | "JP"       // Japan (APPI Adequacy)
  | "OTHER";

export type TransferMechanism =
  | "ADEQUACY_DECISION"             // Official adequacy finding (e.g. EU to UK, CH, JP)
  | "DATA_PRIVACY_FRAMEWORK_EU_US"  // EU-US Data Privacy Framework (DPF) certified
  | "STANDARD_CONTRACTUAL_CLAUSES"  // EU SCCs (Modules 1-4) with TIA (Transfer Impact Assessment)
  | "BINDING_CORPORATE_RULES"       // Approved BCRs
  | "DEROGATION_EXPLICIT_CONSENT"   // GDPR Art. 49 Derogation
  | "NONE_OR_UNAUTHORIZED";

export type SovereigntyStatus = 
  | "SOVEREIGN_SECURE"
  | "COMPLIANT_WITH_SAFEGUARDS"
  | "CONDITIONAL_REVIEW_REQUIRED"
  | "NON_COMPLIANT_HIGH_RISK";

export interface VendorResidencyProfile {
  vendorId: string;
  vendorName: string;
  dataOriginJurisdiction: Jurisdiction;
  primaryStorageJurisdiction: Jurisdiction;
  replicationJurisdictions: Jurisdiction[];
  transferMechanism: TransferMechanism;
  keyCustodyModel: KeyCustodyModel;
  fipsLevel: 2 | 3 | 4 | 0;
  keyRotationIntervalDays: number;
  subjectToCloudAct: boolean;
  zeroKnowledgeArchitecture: boolean;
  endToEndEncrypted: boolean;
}

export interface ResidencyAssessment {
  vendorId: string;
  vendorName: string;
  sovereigntyStatus: SovereigntyStatus;
  sovereigntyScore: number;
  crossBorderFlowAllowed: boolean;
  extraterritorialSubpoenaExposure: boolean;
  keyCustodyStrength: "SOVEREIGN" | "STRONG" | "MODERATE" | "DEFICIENT";
  findings: string[];
  mitigationRecommendations: string[];
  evaluatedAtIso: string;
  auditHashSha256: string;
}

export class CrossBorderResidencyEvaluator {
  /**
   * Assesses vendor residency and encryption custody posture.
   */
  public evaluateVendor(profile: VendorResidencyProfile): ResidencyAssessment {
    const findings: string[] = [];
    const recommendations: string[] = [];
    let score = 100;

    // 1. Cross-Border Flow and Legal Transfer Feasibility
    const isCrossBorder = profile.dataOriginJurisdiction !== profile.primaryStorageJurisdiction ||
      profile.replicationJurisdictions.some(j => j !== profile.dataOriginJurisdiction);

    let crossBorderFlowAllowed = true;

    if (isCrossBorder) {
      if (profile.dataOriginJurisdiction === "EU" || profile.dataOriginJurisdiction === "EEA" || profile.dataOriginJurisdiction === "CH") {
        if (profile.transferMechanism === "NONE_OR_UNAUTHORIZED") {
          findings.push("Cross-border transfer from EU/EEA/CH lacks lawful transfer mechanism (GDPR Chapter V violation).");
          recommendations.push("Execute Standard Contractual Clauses (SCCs) and complete Transfer Impact Assessment (TIA).");
          score -= 40;
          crossBorderFlowAllowed = false;
        } else if (profile.transferMechanism === "DATA_PRIVACY_FRAMEWORK_EU_US") {
          if (profile.primaryStorageJurisdiction !== "US" && !profile.replicationJurisdictions.includes("US")) {
            findings.push("EU-US DPF specified but target hosting jurisdiction is not US.");
          }
        }
      }
    }

    // 2. Extraterritorial Jurisdiction & CLOUD Act / FISA 702 Exposure
    let extraterritorialExposure = false;
    if (profile.subjectToCloudAct && (profile.dataOriginJurisdiction === "EU" || profile.dataOriginJurisdiction === "CH")) {
      extraterritorialExposure = true;
      findings.push("Sub-processor is subject to US CLOUD Act and/or FISA 702 extraterritorial data demands.");
      
      // If HYOK or zero knowledge is present, risk is substantially mitigated
      if (profile.keyCustodyModel === "HYOK" || profile.zeroKnowledgeArchitecture) {
        findings.push("Sovereign HYOK / zero-knowledge encryption key custody prevents unauthorized cleartext disclosure under third-party warrants.");
        score -= 5;
      } else if (profile.keyCustodyModel === "BYOK") {
        recommendations.push("Upgrade from BYOK to external HYOK or hold encryption root keys outside US legal reach to prevent compelled key surrender.");
        score -= 15;
      } else {
        findings.push("Shared cloud KMS allows potential extraterritorial compelled disclosure without customer notice.");
        recommendations.push("Implement client-side envelope encryption with sovereign key custody.");
        score -= 30;
      }
    }

    // 3. Key Custody Evaluation
    let keyCustodyStrength: "SOVEREIGN" | "STRONG" | "MODERATE" | "DEFICIENT";
    switch (profile.keyCustodyModel) {
      case "HYOK":
        keyCustodyStrength = "SOVEREIGN";
        break;
      case "DEDICATED_CLOUD_HSM":
        keyCustodyStrength = profile.fipsLevel >= 3 ? "SOVEREIGN" : "STRONG";
        if (profile.fipsLevel < 3) score -= 5;
        break;
      case "BYOK":
        keyCustodyStrength = "STRONG";
        score -= 10;
        break;
      case "SHARED_CLOUD_KMS":
        keyCustodyStrength = "MODERATE";
        score -= 25;
        recommendations.push("Transition to BYOK or dedicated HSM to eliminate multi-tenant cryptographic compromise risks.");
        break;
      case "UNENCRYPTED_OR_STATIC":
      default:
        keyCustodyStrength = "DEFICIENT";
        score -= 50;
        findings.push("Encryption keys are static or vendor-managed without programmatic envelope encryption.");
        recommendations.push("Mandate automated annual or quarterly KMS key rotation and AES-256-GCM encryption.");
        crossBorderFlowAllowed = false;
        break;
    }

    // Key rotation cadence check
    if (profile.keyRotationIntervalDays > 365) {
      findings.push(`Key rotation interval (${profile.keyRotationIntervalDays} days) exceeds compliance baseline (365 days max).`);
      recommendations.push("Reduce cryptographic key rotation interval to 90 or 365 days max.");
      score -= 10;
    }

    // Clamp score
    const finalScore = Math.max(0, Math.min(100, score));

    // Determine Sovereignty Status
    let sovereigntyStatus: SovereigntyStatus;
    if (finalScore >= 85 && crossBorderFlowAllowed && !extraterritorialExposure) {
      sovereigntyStatus = "SOVEREIGN_SECURE";
    } else if (finalScore >= 70 && crossBorderFlowAllowed) {
      sovereigntyStatus = "COMPLIANT_WITH_SAFEGUARDS";
    } else if (finalScore >= 50) {
      sovereigntyStatus = "CONDITIONAL_REVIEW_REQUIRED";
    } else {
      sovereigntyStatus = "NON_COMPLIANT_HIGH_RISK";
    }

    const evaluatedAtIso = new Date().toISOString();
    const auditPayload = {
      vendorId: profile.vendorId,
      status: sovereigntyStatus,
      score: finalScore,
      custody: keyCustodyStrength,
      allowed: crossBorderFlowAllowed,
      evaluatedAtIso
    };
    const auditHashSha256 = createHash("sha256")
      .update(JSON.stringify(auditPayload))
      .digest("hex");

    return {
      vendorId: profile.vendorId,
      vendorName: profile.vendorName,
      sovereigntyStatus,
      sovereigntyScore: finalScore,
      crossBorderFlowAllowed,
      extraterritorialSubpoenaExposure: extraterritorialExposure,
      keyCustodyStrength,
      findings,
      mitigationRecommendations: recommendations,
      evaluatedAtIso,
      auditHashSha256
    };
  }
}
