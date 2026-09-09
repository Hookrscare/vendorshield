import { describe, it, expect } from "vitest";
import {
  resolveJurisdiction,
  evaluateTransferImpactAssessment,
  generateSCCAnnexSpecification,
  batchEvaluateTIARoster,
  type TIAAssessmentInput
} from "./transfer-impact-assessment";

describe("QA-119: GDPR SCC Transfer Impact Assessment (TIA) Engine", () => {
  const baseTechnical = {
    encryptionInTransitTls13: true,
    encryptionAtRestAes256: true,
    keysHeldExclusivelyInEea: true,
    pseudonymizationPriorToTransfer: false,
    zeroKnowledgeOrClientSideEncryption: false
  };

  const baseContractual = {
    clause14LawfulAccessNotification: true,
    challengeUnlawfulGovtRequests: true,
    transparencyReportsPublished: true,
    annualThirdPartyAuditRights: true,
    subProcessorPriorNoticeDays: 30
  };

  it("resolves jurisdictions and adequacy decisions accurately", () => {
    expect(resolveJurisdiction("DE")).toBe("EEA_INTERNAL");
    expect(resolveJurisdiction("FR")).toBe("EEA_INTERNAL");
    expect(resolveJurisdiction("GB")).toBe("ADEQUATE_COUNTRY");
    expect(resolveJurisdiction("JP")).toBe("ADEQUATE_COUNTRY");
    expect(resolveJurisdiction("US", true)).toBe("US_DPF_CERTIFIED");
    expect(resolveJurisdiction("US", false)).toBe("US_NON_DPF");
    expect(resolveJurisdiction("CN")).toBe("THIRD_COUNTRY_HIGH_SURVEILLANCE");
    expect(resolveJurisdiction("IN")).toBe("THIRD_COUNTRY_MODERATE_RISK");
  });

  it("evaluates EEA-internal or Adequacy country transfers as PERMITTED_ADEQUACY", () => {
    const input: TIAAssessmentInput = {
      assessmentId: "TIA-001",
      vendorId: "vnd-de-cloud",
      vendorName: "Hetzner Cloud GmbH",
      module: "MODULE_2_C2P",
      destinationCountryIso: "DE",
      sensitivityLevel: "CONFIDENTIAL_CUSTOMER_PII",
      estimatedDataSubjectCount: 15000,
      technicalSafeguards: baseTechnical,
      contractualSafeguards: baseContractual,
      dataCategoriesTransferred: ["User authentication credentials", "Billing records"]
    };

    const result = evaluateTransferImpactAssessment(input);
    expect(result.jurisdiction).toBe("EEA_INTERNAL");
    expect(result.eligibility).toBe("PERMITTED_ADEQUACY");
    expect(result.surveillanceRiskScore).toBe(0);
    expect(result.riskTier).toBe("LOW");
    expect(result.requiredAnnexes).toContain("ANNEX_I_PARTIES");
    expect(result.requiredAnnexes).toContain("ANNEX_II_TOMS");
    expect(result.requiredAnnexes).toContain("ANNEX_III_SUBPROCESSORS");
  });

  it("evaluates US DPF certified vendor as PERMITTED_ADEQUACY", () => {
    const input: TIAAssessmentInput = {
      assessmentId: "TIA-002",
      vendorId: "vnd-stripe",
      vendorName: "Stripe Inc.",
      module: "MODULE_2_C2P",
      destinationCountryIso: "US",
      isEuUsDpfCertified: true,
      sensitivityLevel: "CONFIDENTIAL_CUSTOMER_PII",
      estimatedDataSubjectCount: 20000,
      technicalSafeguards: baseTechnical,
      contractualSafeguards: baseContractual,
      dataCategoriesTransferred: ["Payment tokens", "Billing addresses"]
    };

    const result = evaluateTransferImpactAssessment(input);
    expect(result.jurisdiction).toBe("US_DPF_CERTIFIED");
    expect(result.eligibility).toBe("PERMITTED_ADEQUACY");
    expect(result.riskTier).toBe("LOW");
  });

  it("evaluates US non-DPF vendor with robust technical safeguards as PERMITTED_SCC_WITH_SAFEGUARDS", () => {
    const input: TIAAssessmentInput = {
      assessmentId: "TIA-003",
      vendorId: "vnd-snowflake-us",
      vendorName: "Snowflake US Inc.",
      module: "MODULE_2_C2P",
      destinationCountryIso: "US",
      isEuUsDpfCertified: false,
      sensitivityLevel: "CONFIDENTIAL_CUSTOMER_PII",
      estimatedDataSubjectCount: 40000,
      technicalSafeguards: {
        ...baseTechnical,
        keysHeldExclusivelyInEea: true,
        pseudonymizationPriorToTransfer: true
      },
      contractualSafeguards: baseContractual,
      dataCategoriesTransferred: ["Telemetry analytics"]
    };

    const result = evaluateTransferImpactAssessment(input);
    expect(result.jurisdiction).toBe("US_NON_DPF");
    expect(result.eligibility).toBe("PERMITTED_SCC_WITH_SAFEGUARDS");
    expect(result.riskTier).toMatch(/LOW|MEDIUM/);
    expect(result.findings.some(f => f.includes("keys held exclusively within EEA"))).toBe(true);
  });

  it("prohibits transfers to high surveillance jurisdictions without client-side zero-knowledge encryption", () => {
    const input: TIAAssessmentInput = {
      assessmentId: "TIA-004",
      vendorId: "vnd-overseas-surv",
      vendorName: "Overseas Analytics Ltd",
      module: "MODULE_2_C2P",
      destinationCountryIso: "CN",
      sensitivityLevel: "SPECIAL_CATEGORY_ART_9",
      estimatedDataSubjectCount: 80000,
      technicalSafeguards: {
        encryptionInTransitTls13: true,
        encryptionAtRestAes256: true,
        keysHeldExclusivelyInEea: false,
        pseudonymizationPriorToTransfer: false,
        zeroKnowledgeOrClientSideEncryption: false
      },
      contractualSafeguards: {
        clause14LawfulAccessNotification: false,
        challengeUnlawfulGovtRequests: false,
        transparencyReportsPublished: false,
        annualThirdPartyAuditRights: false,
        subProcessorPriorNoticeDays: 0
      },
      dataCategoriesTransferred: ["Health biometric data"]
    };

    const result = evaluateTransferImpactAssessment(input);
    expect(result.jurisdiction).toBe("THIRD_COUNTRY_HIGH_SURVEILLANCE");
    expect(result.eligibility).toBe("PROHIBITED_HIGH_RISK");
    expect(result.riskTier).toBe("CRITICAL");
    expect(result.mandatoryRemediations.some(r => r.includes("Transfer prohibited"))).toBe(true);
  });

  it("generates comprehensive SCC Annex I, II, and III packages", () => {
    const input: TIAAssessmentInput = {
      assessmentId: "TIA-005",
      vendorId: "vnd-cloud-db",
      vendorName: "CloudScale DB Inc.",
      module: "MODULE_2_C2P",
      destinationCountryIso: "US",
      isEuUsDpfCertified: true,
      sensitivityLevel: "STANDARD_BUSINESS_CONTACT",
      estimatedDataSubjectCount: 5000,
      technicalSafeguards: baseTechnical,
      contractualSafeguards: baseContractual,
      dataCategoriesTransferred: ["Names", "Corporate email addresses"]
    };

    const res = evaluateTransferImpactAssessment(input);
    const annexes = generateSCCAnnexSpecification(input, res);

    expect(annexes.assessmentId).toBe("TIA-005");
    expect(annexes.module).toBe("MODULE_2_C2P");
    expect(annexes.annexI.dataImporter).toContain("CloudScale DB Inc.");
    expect(annexes.annexI.categoriesOfData).toEqual(["Names", "Corporate email addresses"]);
    expect(annexes.annexII.technicalMeasures.length).toBeGreaterThanOrEqual(2);
    expect(annexes.annexIII).toBeDefined();
    expect(annexes.annexIII?.advanceNoticeDays).toBe(30);
  });

  it("batches evaluations and flags critical vendors", () => {
    const inputs: TIAAssessmentInput[] = [
      {
        assessmentId: "TIA-006A",
        vendorId: "vnd-ok",
        vendorName: "Permitted Vendor",
        module: "MODULE_2_C2P",
        destinationCountryIso: "GB",
        sensitivityLevel: "PUBLIC_OR_AGGREGATE",
        estimatedDataSubjectCount: 1000,
        technicalSafeguards: baseTechnical,
        contractualSafeguards: baseContractual,
        dataCategoriesTransferred: ["Public blogs"]
      },
      {
        assessmentId: "TIA-006B",
        vendorId: "vnd-blocked",
        vendorName: "Forbidden Surveillance Vendor",
        module: "MODULE_2_C2P",
        destinationCountryIso: "RU",
        sensitivityLevel: "SPECIAL_CATEGORY_ART_9",
        estimatedDataSubjectCount: 100000,
        technicalSafeguards: {
          encryptionInTransitTls13: false,
          encryptionAtRestAes256: false,
          keysHeldExclusivelyInEea: false,
          pseudonymizationPriorToTransfer: false,
          zeroKnowledgeOrClientSideEncryption: false
        },
        contractualSafeguards: {
          clause14LawfulAccessNotification: false,
          challengeUnlawfulGovtRequests: false,
          transparencyReportsPublished: false,
          annualThirdPartyAuditRights: false,
          subProcessorPriorNoticeDays: 0
        },
        dataCategoriesTransferred: ["Biometrics"]
      }
    ];

    const roster = batchEvaluateTIARoster(inputs);
    expect(roster.totalAssessments).toBe(2);
    expect(roster.permittedCount).toBe(1);
    expect(roster.prohibitedCount).toBe(1);
    expect(roster.criticalVendors).toContain("Forbidden Surveillance Vendor");
  });
});
