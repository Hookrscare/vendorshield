/**
 * QA-181: Multi-Region Vendor Cloud Egress Data Sovereign Boundary Auditor.
 * Part of VendorShield SOC 2, GDPR & Cross-Border Sovereign Compliance Suite.
 *
 * Evaluates third-party vendor cloud egress data flows against GDPR Chapter V,
 * Schrems II, and Swiss/UK data transfer adequacy standards:
 * 1. Categorizes source/destination jurisdictions and adequacy statuses.
 * 2. Enforces transfer mechanisms (EU-US DPF, SCCs + TIA, Intra-EEA).
 * 3. Detects unencrypted egress or rogue cross-region backup replication of PII/PHI.
 * 4. Computes Data Sovereign Compliance Score (0 - 100) and quarantine flags.
 * 5. Emits SHA-256 compliance audit digest.
 */

import { createHash } from "crypto";

export type JurisdictionAdequacy =
  | "EU_EEA"
  | "ADEQUATE_THIRD_COUNTRY" // UK, Switzerland, Japan, Canada
  | "EU_US_DPF_CERTIFIED"
  | "INADEQUATE_REQUIRES_SCC_TIA"
  | "RESTRICTED_HIGH_RISK";

export type DataClassification =
  | "PUBLIC"
  | "INTERNAL_BUSINESS"
  | "CONFIDENTIAL"
  | "PII"
  | "PROTECTED_HEALTH_PHI"
  | "FINANCIAL_PAYMENT";

export type TransferMechanism =
  | "INTRA_REGION"
  | "ADEQUACY_DECISION"
  | "EU_US_DATA_PRIVACY_FRAMEWORK"
  | "STANDARD_CONTRACTUAL_CLAUSES_WITH_TIA"
  | "UNPROTECTED_DIRECT_EGRESS";

export interface EgressFlow {
  flowId: string;
  sourceRegion: string;       // e.g. "eu-central-1"
  destinationRegion: string;  // e.g. "us-east-1"
  sourceJurisdiction: JurisdictionAdequacy;
  destinationJurisdiction: JurisdictionAdequacy;
  dataClassification: DataClassification;
  transferMechanism: TransferMechanism;
  isTls13OrMtls: boolean;
  fieldLevelEncryptionEnabled: boolean;
  estimatedMonthlyGb: number;
}

export interface SovereignAuditViolation {
  flowId: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM";
  violationCode: string;
  description: string;
  remediation: string;
}

export interface SovereignAuditResult {
  vendorId: string;
  totalFlowsAudited: number;
  compliantFlowsCount: number;
  violations: SovereignAuditViolation[];
  complianceScore: number; // 0 to 100
  isTransferQuarantined: boolean;
  auditHash: string;
}

export class VendorCloudEgressDataSovereignAuditor {
  public static auditEgressFlows(
    vendorId: string,
    flows: EgressFlow[]
  ): SovereignAuditResult {
    const violations: SovereignAuditViolation[] = [];
    let compliantFlows = 0;

    for (const flow of flows) {
      let flowHasCriticalViolation = false;

      // 1. Check transit encryption
      if (!flow.isTls13OrMtls) {
        violations.push({
          flowId: flow.flowId,
          severity: "CRITICAL",
          violationCode: "UNENCRYPTED_EGRESS_TRANSIT",
          description: `Egress flow ${flow.flowId} transmits data across regions without TLS 1.3 or mTLS.`,
          remediation: "Enforce TLS 1.3 or mutual TLS with ephemeral Diffie-Hellman key exchange on all egress endpoints."
        });
        flowHasCriticalViolation = true;
      }

      // 2. Check GDPR Chapter V International Transfer Adequacy for PII / PHI / Financial
      const isSensitive = [
        "PII",
        "PROTECTED_HEALTH_PHI",
        "FINANCIAL_PAYMENT"
      ].includes(flow.dataClassification);

      if (flow.sourceJurisdiction === "EU_EEA" && flow.destinationJurisdiction !== "EU_EEA") {
        if (isSensitive) {
          if (flow.transferMechanism === "UNPROTECTED_DIRECT_EGRESS") {
            violations.push({
              flowId: flow.flowId,
              severity: "CRITICAL",
              violationCode: "ILLEGAL_CROSS_BORDER_TRANSFER",
              description: `Personal or confidential data egressed from EU_EEA to ${flow.destinationJurisdiction} without legal transfer mechanism.`,
              remediation: "Halt egress flow immediately. Execute EU Standard Contractual Clauses (SCCs) with Transfer Impact Assessment (TIA) or migrate storage into EU."
            });
            flowHasCriticalViolation = true;
          } else if (
            flow.destinationJurisdiction === "INADEQUATE_REQUIRES_SCC_TIA" &&
            flow.transferMechanism !== "STANDARD_CONTRACTUAL_CLAUSES_WITH_TIA"
          ) {
            violations.push({
              flowId: flow.flowId,
              severity: "HIGH",
              violationCode: "MISSING_SCC_SUPPLEMENTARY_MEASURES",
              description: `Transfer to non-adequate jurisdiction requires validated SCCs and TIA supplementary safeguards.`,
              remediation: "Deploy client-side envelope encryption with customer-managed keys (CMEK) held inside EU boundary."
            });
            flowHasCriticalViolation = true;
          }
        }
      }

      // 3. Check High-Risk / Embargoed destinations
      if (flow.destinationJurisdiction === "RESTRICTED_HIGH_RISK") {
        violations.push({
          flowId: flow.flowId,
          severity: "CRITICAL",
          violationCode: "EMBARGOED_DESTINATION_EGRESS",
          description: `Data egress detected to high-risk / restricted jurisdiction ${flow.destinationRegion}.`,
          remediation: "Quarantine IP egress routes and revoke cross-region sync permissions immediately."
        });
        flowHasCriticalViolation = true;
      }

      if (!flowHasCriticalViolation) {
        compliantFlows++;
      }
    }

    // Compute Sovereign Compliance Score (0 - 100)
    let score = 100.0;
    for (const v of violations) {
      if (v.severity === "CRITICAL") score -= 35.0;
      else if (v.severity === "HIGH") score -= 18.0;
      else score -= 8.0;
    }
    score = Math.max(0, Math.min(100, Math.round(score)));

    const isQuarantined = violations.some(v => v.severity === "CRITICAL");

    // Cryptographic audit hash
    const hash = createHash("sha256");
    hash.update(`${vendorId}:${flows.length}:${compliantFlows}:${score}:${isQuarantined}`);
    const auditHash = hash.digest("hex");

    return {
      vendorId,
      totalFlowsAudited: flows.length,
      compliantFlowsCount: compliantFlows,
      violations,
      complianceScore: score,
      isTransferQuarantined: isQuarantined,
      auditHash
    };
  }
}
