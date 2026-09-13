/**
 * QA-185: Automated Cross-Border DPA Standard Contractual Clauses (SCC) Module IV Multi-Tier Flow-Down Verifier.
 * Part of VendorShield B2B SOC 2 & GDPR Sub-Processor Trust Hub.
 * 
 * 1. Validates multi-tier sub-processor contract chains against EU SCC Module IV (Processor-to-Controller).
 * 2. Enforces mandatory flow-down clauses: incident SLA alignment, audit rights, data deletion, TIA annexes.
 * 3. Detects SLA latency mismatch cascades (e.g. Tier-1 promises 24h breach notice, but Tier-2 grants 72h).
 * 4. Emits cryptographic SHA-256 compliance verification digests.
 */

import { createHash } from "crypto";

export interface SubProcessorContractNode {
  tierLevel: number;                // 1 (primary processor), 2 (sub-processor), 3 (sub-sub-processor)
  entityName: string;
  jurisdictionCountryCode: string;  // e.g. "US", "DE", "IN"
  sccModuleAdopted: "MODULE_1" | "MODULE_2" | "MODULE_3" | "MODULE_4";
  breachNotificationSlaHours: number; // e.g. 24, 48, 72
  auditRightsGranted: boolean;
  dataDeletionWarranty: boolean;
  tiaConducted: boolean;
  encryptionKeyManagedOutsideThirdCountry: boolean;
}

export interface FlowDownViolation {
  tierLevel: number;
  entityName: string;
  clauseId: string;
  description: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM";
}

export interface SccModule4VerificationResult {
  chainIdentifier: string;
  isFullyCompliant: boolean;
  totalTiersInspected: number;
  upstreamControllerBreachSlaHours: number;
  violations: FlowDownViolation[];
  governingLaw: string;
  attestationDigest: string;
}

export class CrossBorderDpaSccModule4FlowDownVerifier {
  public static verifyContractChain(
    chainIdentifier: string,
    upstreamControllerBreachSlaHours: number,
    chainNodes: SubProcessorContractNode[],
    governingLaw: string = "GDPR_EU_2021_914_MODULE_4"
  ): SccModule4VerificationResult {
    if (!chainNodes || chainNodes.length === 0) {
      throw new Error("Sub-processor contract chain must contain at least one node.");
    }

    const violations: FlowDownViolation[] = [];
    let parentSla = upstreamControllerBreachSlaHours;

    // Sort nodes by tierLevel ascending
    const sortedNodes = [...chainNodes].sort((a, b) => a.tierLevel - b.tierLevel);

    for (const node of sortedNodes) {
      // 1. Check Module adoption
      if (node.sccModuleAdopted !== "MODULE_4") {
        violations.push({
          tierLevel: node.tierLevel,
          entityName: node.entityName,
          clauseId: "CLAUSE_1_MODULE_MISMATCH",
          description: `Entity adopted ${node.sccModuleAdopted} instead of mandatory MODULE_4 for Processor-to-Controller cross-border flow.`,
          severity: "CRITICAL"
        });
      }

      // 2. Check SLA cascade: downstream SLA must be <= upstream promised SLA
      if (node.breachNotificationSlaHours > parentSla) {
        violations.push({
          tierLevel: node.tierLevel,
          entityName: node.entityName,
          clauseId: "CLAUSE_8_BREACH_SLA_GAP",
          description: `Downstream SLA (${node.breachNotificationSlaHours}h) exceeds upstream contractual SLA limit (${parentSla}h).`,
          severity: "HIGH"
        });
      }

      // 3. Check mandatory audit rights
      if (!node.auditRightsGranted) {
        violations.push({
          tierLevel: node.tierLevel,
          entityName: node.entityName,
          clauseId: "CLAUSE_8_AUDIT_RIGHTS",
          description: "Contract lacks mandatory flow-down supervisory audit and inspection rights.",
          severity: "HIGH"
        });
      }

      // 4. Check data deletion warranty
      if (!node.dataDeletionWarranty) {
        violations.push({
          tierLevel: node.tierLevel,
          entityName: node.entityName,
          clauseId: "CLAUSE_16_TERMINATION_DELETION",
          description: "Missing enforceable post-termination data deletion or return warranty.",
          severity: "HIGH"
        });
      }

      // 5. Check TIA for non-adequacy jurisdictions
      const euAdequate = ["DE", "FR", "NL", "IE", "AT", "ES", "IT", "SE", "CH", "GB", "JP", "KR", "CA"];
      if (!euAdequate.includes(node.jurisdictionCountryCode.toUpperCase()) && !node.tiaConducted) {
        violations.push({
          tierLevel: node.tierLevel,
          entityName: node.entityName,
          clauseId: "CLAUSE_14_TIA_MANDATE",
          description: `Third-country jurisdiction (${node.jurisdictionCountryCode}) requires a documented Transfer Impact Assessment.`,
          severity: "CRITICAL"
        });
      }

      parentSla = Math.min(parentSla, node.breachNotificationSlaHours);
    }

    const isFullyCompliant = violations.length === 0;

    const digestRaw = `${chainIdentifier}:${isFullyCompliant}:${violations.length}:${governingLaw}`;
    const digest = createHash("sha256").update(digestRaw).digest("hex");

    return {
      chainIdentifier,
      isFullyCompliant,
      totalTiersInspected: sortedNodes.length,
      upstreamControllerBreachSlaHours,
      violations,
      governingLaw,
      attestationDigest: digest
    };
  }
}
