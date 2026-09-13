import { describe, it, expect } from "vitest";
import {
  CrossBorderDpaSccModule4FlowDownVerifier,
  SubProcessorContractNode
} from "./cross-border-dpa-scc-module4-flowdown-verifier";

describe("CrossBorderDpaSccModule4FlowDownVerifier", () => {
  it("verifies a fully compliant multi-tier sub-processor chain", () => {
    const chain: SubProcessorContractNode[] = [
      {
        tierLevel: 1,
        entityName: "EU Core Analytics Hub GmbH",
        jurisdictionCountryCode: "DE",
        sccModuleAdopted: "MODULE_4",
        breachNotificationSlaHours: 24,
        auditRightsGranted: true,
        dataDeletionWarranty: true,
        tiaConducted: true,
        encryptionKeyManagedOutsideThirdCountry: true
      },
      {
        tierLevel: 2,
        entityName: "US Vector Database Inc",
        jurisdictionCountryCode: "US",
        sccModuleAdopted: "MODULE_4",
        breachNotificationSlaHours: 12,
        auditRightsGranted: true,
        dataDeletionWarranty: true,
        tiaConducted: true,
        encryptionKeyManagedOutsideThirdCountry: true
      }
    ];

    const result = CrossBorderDpaSccModule4FlowDownVerifier.verifyContractChain(
      "CHAIN-COMPLIANT-001",
      48,
      chain
    );

    expect(result.isFullyCompliant).toBe(true);
    expect(result.violations).toHaveLength(0);
    expect(result.totalTiersInspected).toBe(2);
    expect(result.attestationDigest).toHaveLength(64);
  });

  it("detects SLA breach window gap and missing TIA", () => {
    const chain: SubProcessorContractNode[] = [
      {
        tierLevel: 1,
        entityName: "Tier-1 Cloud Provider",
        jurisdictionCountryCode: "IE",
        sccModuleAdopted: "MODULE_4",
        breachNotificationSlaHours: 24,
        auditRightsGranted: true,
        dataDeletionWarranty: true,
        tiaConducted: true,
        encryptionKeyManagedOutsideThirdCountry: true
      },
      {
        tierLevel: 2,
        entityName: "Third Country Search Indexer",
        jurisdictionCountryCode: "IN",
        sccModuleAdopted: "MODULE_4",
        breachNotificationSlaHours: 72, // Exceeds Tier 1 (24h)
        auditRightsGranted: true,
        dataDeletionWarranty: true,
        tiaConducted: false, // Missing TIA for non-adequacy country
        encryptionKeyManagedOutsideThirdCountry: false
      }
    ];

    const result = CrossBorderDpaSccModule4FlowDownVerifier.verifyContractChain(
      "CHAIN-NONCOMPLIANT-002",
      24,
      chain
    );

    expect(result.isFullyCompliant).toBe(false);
    expect(result.violations.some(v => v.clauseId === "CLAUSE_8_BREACH_SLA_GAP")).toBe(true);
    expect(result.violations.some(v => v.clauseId === "CLAUSE_14_TIA_MANDATE")).toBe(true);
  });

  it("flags module mismatch when Module 2 is erroneously used instead of Module 4", () => {
    const chain: SubProcessorContractNode[] = [
      {
        tierLevel: 1,
        entityName: "Processor Entity",
        jurisdictionCountryCode: "FR",
        sccModuleAdopted: "MODULE_2",
        breachNotificationSlaHours: 24,
        auditRightsGranted: false,
        dataDeletionWarranty: false,
        tiaConducted: true,
        encryptionKeyManagedOutsideThirdCountry: true
      }
    ];

    const result = CrossBorderDpaSccModule4FlowDownVerifier.verifyContractChain(
      "CHAIN-MODULE-ERR",
      48,
      chain
    );

    expect(result.isFullyCompliant).toBe(false);
    expect(result.violations.some(v => v.clauseId === "CLAUSE_1_MODULE_MISMATCH")).toBe(true);
    expect(result.violations.some(v => v.clauseId === "CLAUSE_8_AUDIT_RIGHTS")).toBe(true);
  });
});
