/**
 * QA-194: ISO/IEC 42001 Artificial Intelligence Management System (AIMS) Control Verifier.
 * Part of VendorShield B2B Enterprise Compliance & Trust Platform.
 *
 * Implements automated verification for ISO/IEC 42001:2023 international standard for AIMS:
 * - Clause 5 & Annex A.5: AI Governance & Ethical Policies
 * - Annex A.6: Internal Organization & Roles/Responsibilities
 * - Annex A.7: Resources for AI Systems (Data Governance & Computing)
 * - Annex A.8: AI System Lifecycle Processes (Continuous Validation)
 * - Annex A.9: Third-Party AI Suppliers & Vendor Risk
 * - Annex A.10: AI System Impact Assessment & Societal Fairness
 */

import { createHash } from "crypto";

export type AimsControlCategory =
  | "A_5_AI_POLICY"
  | "A_6_INTERNAL_ORG"
  | "A_7_RESOURCES_DATA"
  | "A_8_LIFECYCLE_MGMT"
  | "A_9_THIRD_PARTY_AI"
  | "A_10_IMPACT_ASSESSMENT";

export interface AimsControlEvaluation {
  controlCategory: AimsControlCategory;
  controlId: string;
  isImplemented: boolean;
  hasAutomatedMonitoring: boolean;
  evidenceRefUri: string;
}

export interface EnterpriseAimsProfile {
  organizationId: string;
  scopeOfCertification: string;
  controls: AimsControlEvaluation[];
  hasExternalAuditorAttestation: boolean;
}

export interface AimsVerificationResult {
  organizationId: string;
  isCertificationReady: boolean;
  overallMaturityScore: number; // 0 to 100
  evaluatedControlsCount: number;
  implementedControlsCount: number;
  missingControls: string[];
  complianceTier: "CERTIFIABLE" | "SUBSTANTIAL_CONFORMANCE" | "SIGNIFICANT_GAPS" | "NON_COMPLIANT";
  attestationDigest: string;
  timestamp: string;
}

export class Iso42001AimsControlVerifier {
  private static readonly MANDATORY_CONTROL_CATEGORIES: AimsControlCategory[] = [
    "A_5_AI_POLICY",
    "A_6_INTERNAL_ORG",
    "A_7_RESOURCES_DATA",
    "A_8_LIFECYCLE_MGMT",
    "A_9_THIRD_PARTY_AI",
    "A_10_IMPACT_ASSESSMENT"
  ];

  public static verifyAimsCompliance(profile: EnterpriseAimsProfile): AimsVerificationResult {
    if (!profile.organizationId || !profile.scopeOfCertification) {
      throw new Error("Invalid profile: organizationId and scopeOfCertification are required.");
    }
    if (!profile.controls || profile.controls.length === 0) {
      throw new Error("Invalid profile: controls array cannot be empty.");
    }

    const missingControls: string[] = [];
    const implementedCategorySet = new Set<AimsControlCategory>();

    let totalPoints = 0;
    const maxPoints = profile.controls.length * 10;

    for (const ctrl of profile.controls) {
      if (ctrl.isImplemented) {
        implementedCategorySet.add(ctrl.controlCategory);
        totalPoints += 7;
        if (ctrl.hasAutomatedMonitoring) {
          totalPoints += 3; // Bonus for automated telemetry
        }
      } else {
        missingControls.push(`${ctrl.controlCategory}: ${ctrl.controlId}`);
      }
    }

    // Check coverage across all mandatory ISO 42001 Annex A domains
    for (const category of this.MANDATORY_CONTROL_CATEGORIES) {
      if (!implementedCategorySet.has(category)) {
        missingControls.push(`CRITICAL_OMISSION: Missing all controls in domain ${category}`);
      }
    }

    const overallMaturityScore = Math.min(100, Math.round((totalPoints / maxPoints) * 100));

    let complianceTier: AimsVerificationResult["complianceTier"] = "NON_COMPLIANT";
    if (overallMaturityScore >= 90 && implementedCategorySet.size === this.MANDATORY_CONTROL_CATEGORIES.length) {
      complianceTier = "CERTIFIABLE";
    } else if (overallMaturityScore >= 75) {
      complianceTier = "SUBSTANTIAL_CONFORMANCE";
    } else if (overallMaturityScore >= 50) {
      complianceTier = "SIGNIFICANT_GAPS";
    }

    const isCertificationReady = complianceTier === "CERTIFIABLE" && missingControls.length === 0;

    const rawDigest = `${profile.organizationId}:${overallMaturityScore}:${complianceTier}:${isCertificationReady}:${profile.hasExternalAuditorAttestation}`;
    const attestationDigest = createHash("sha256").update(rawDigest).digest("hex");

    return {
      organizationId: profile.organizationId,
      isCertificationReady,
      overallMaturityScore,
      evaluatedControlsCount: profile.controls.length,
      implementedControlsCount: profile.controls.filter(c => c.isImplemented).length,
      missingControls,
      complianceTier,
      attestationDigest,
      timestamp: new Date().toISOString()
    };
  }
}
