import { describe, it, expect } from "vitest";
import {
  MultiJurisdictionDpaSynchronizer,
  DpaContractClauses,
} from "./multi-jurisdiction-dpa-synchronizer";

describe("QA-185: MultiJurisdictionDpaSynchronizer Tests", () => {
  const synchronizer = new MultiJurisdictionDpaSynchronizer();

  const fullyCompliantContract: DpaContractClauses = {
    contractId: "DPA-GLOBAL-2026-001",
    vendorId: "vnd_aws_emea",
    vendorName: "Amazon Web Services EMEA SARL",
    effectiveDate: "2026-01-01",
    governingLawJurisdiction: "Ireland",
    hasSubprocessorPriorWrittenNoticeClause: true,
    subprocessorNoticePeriodDays: 30,
    hasDataBreachNotificationUnder72h: true,
    dataBreachNotificationWindowHours: 24,
    hasAuditRightsClause: true,
    hasPostTerminationDataReturnOrDeletion: true,
    executedSccModules: [
      "MODULE_2_CONTROLLER_TO_PROCESSOR",
      "MODULE_3_PROCESSOR_TO_PROCESSOR",
    ],
    hasUkInternationalDataTransferAddendum: true,
    hasSwissDataTransferRider: true,
    hasUsStateSpecificPrivacyRiders: true,
    technicalMeasures: {
      endToEndEncryptionInTransit: true,
      encryptionAtRestWithCustomerKey: true,
      foreignGovernmentSubpoenaNotificationCommitment: true,
      pseudonymizationEnabled: true,
      independentAnnualSoc2OrIso27001Audit: true,
    },
  };

  it("certifies a fully compliant multi-jurisdiction DPA with high score and zero critical deficiencies", () => {
    const res = synchronizer.assessDpaCompliance(fullyCompliantContract);

    expect(res.compositeSovereignRiskScore).toBe(100);
    expect(res.isApprovedForGlobalCrossBorderTransfer).toBe(true);
    expect(res.totalDeficienciesCount).toBe(0);
    expect(res.mandatoryAmendmentRiders).toHaveLength(0);
    expect(res.jurisdictionAssessments.EU_GDPR.isCompliant).toBe(true);
    expect(res.jurisdictionAssessments.UK_GDPR.isCompliant).toBe(true);
    expect(res.jurisdictionAssessments.SWISS_FADP.isCompliant).toBe(true);
    expect(res.jurisdictionAssessments.US_CALIFORNIA_CPRA.isCompliant).toBe(true);
    expect(res.auditAttestationDigest).toHaveLength(64);
  });

  it("detects missing EU SCCs, Schrems II measures, and UK addendum with remediation riders", () => {
    const nonCompliantContract: DpaContractClauses = {
      ...fullyCompliantContract,
      contractId: "DPA-LEGACY-2023-999",
      executedSccModules: [],
      hasUkInternationalDataTransferAddendum: false,
      hasSwissDataTransferRider: false,
      hasUsStateSpecificPrivacyRiders: false,
      dataBreachNotificationWindowHours: 96, // Exceeds 72h statutory window
      technicalMeasures: {
        ...fullyCompliantContract.technicalMeasures,
        foreignGovernmentSubpoenaNotificationCommitment: false,
      },
    };

    const res = synchronizer.assessDpaCompliance(nonCompliantContract);

    expect(res.compositeSovereignRiskScore).toBeLessThan(60);
    expect(res.isApprovedForGlobalCrossBorderTransfer).toBe(false);
    expect(res.jurisdictionAssessments.EU_GDPR.riskRating).toBe("CRITICAL");
    expect(res.jurisdictionAssessments.UK_GDPR.riskRating).toBe("HIGH");
    expect(res.mandatoryAmendmentRiders).toContain("EU-COMMISSION-STANDARD-CONTRACTUAL-CLAUSES-2021-914");
    expect(res.mandatoryAmendmentRiders).toContain("ICO-UK-INTERNATIONAL-DATA-TRANSFER-ADDENDUM");
    expect(res.mandatoryAmendmentRiders).toContain("SCHREMS-II-SUPPLEMENTARY-MEASURES-AGREEMENT");
  });

  it("validates input validation requirement for contract and vendor ID", () => {
    expect(() => {
      synchronizer.assessDpaCompliance({
        ...fullyCompliantContract,
        contractId: "",
      });
    }).toThrow("Contract ID and Vendor ID are required");
  });
});
