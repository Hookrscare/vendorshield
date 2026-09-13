/**
 * Regression Test Suite for QA-163: Automated B2B Sub-Processor Cross-Border Schrems II Supplementary Measures Auditor.
 * Part of VendorShield B2B SOC 2 & GDPR Sub-Processor Trust Hub.
 */

import { describe, it, expect } from "vitest";
import {
  SchremsIiSupplementaryMeasuresAuditor,
  type SubProcessorSchremsAuditRequest
} from "./schrems-ii-supplementary-measures-auditor";

describe("QA-163: Schrems II Supplementary Measures Auditor", () => {
  it("authenticates a fully compliant sub-processor with sovereign EU key custody", () => {
    const request: SubProcessorSchremsAuditRequest = {
      subProcessorId: "SUBPROC-AWS-FRA",
      vendorName: "Amazon Web Services EMEA SARL",
      countryOfIncorporation: "LU",
      destinationDataCenterCountry: "DE",
      transfersPersonalData: true,
      technical: {
        isEncryptionAtRestEnabled: true,
        isEncryptionInTransitEnabled: true,
        areEncryptionKeysHeldInEu: true,
        isZeroKnowledgeArchitecture: true
      },
      contractual: {
        hasStandardContractualClausesModule2or3: true,
        hasGovernmentSubpoenaChallengeClause: true,
        hasPromptCustomerNotificationWarranty: true,
        hasAuditRightsGranted: true
      },
      organizational: {
        hasRegularTransparencyReports: true,
        hasDocumentedInternalDataMinimizationPolicy: true,
        hasDesignatedEuDataProtectionOfficer: true
      }
    };

    const verdict = SchremsIiSupplementaryMeasuresAuditor.auditSubProcessor(request);

    expect(verdict.isCompliant).toBe(true);
    expect(verdict.verdictStatus).toBe("SCHREMS_II_COMPLIANT");
    expect(verdict.compositeScore).toBeGreaterThanOrEqual(80);
    expect(verdict.identifiedGaps).toHaveLength(0);
    expect(verdict.sha256CertificateHash).toHaveLength(64);
  });

  it("flags deficient supplementary measures when US cloud provider lacks EU key custody", () => {
    const request: SubProcessorSchremsAuditRequest = {
      subProcessorId: "SUBPROC-US-SAAS",
      vendorName: "Legacy Analytics Inc",
      countryOfIncorporation: "US",
      destinationDataCenterCountry: "US",
      transfersPersonalData: true,
      technical: {
        isEncryptionAtRestEnabled: true,
        isEncryptionInTransitEnabled: true,
        areEncryptionKeysHeldInEu: false, // Deficient!
        isZeroKnowledgeArchitecture: false
      },
      contractual: {
        hasStandardContractualClausesModule2or3: true,
        hasGovernmentSubpoenaChallengeClause: false, // Deficient!
        hasPromptCustomerNotificationWarranty: true,
        hasAuditRightsGranted: false
      },
      organizational: {
        hasRegularTransparencyReports: true,
        hasDocumentedInternalDataMinimizationPolicy: false,
        hasDesignatedEuDataProtectionOfficer: false
      }
    };

    const verdict = SchremsIiSupplementaryMeasuresAuditor.auditSubProcessor(request);

    expect(verdict.isCompliant).toBe(false);
    expect(verdict.verdictStatus).toBe("SUPPLEMENTARY_MEASURES_DEFICIENT");
    expect(verdict.identifiedGaps).toContain("KMS encryption keys are not exclusively sovereign to the EU/EEA");
  });

  it("categorizes as high risk when SCCs are completely missing", () => {
    const request: SubProcessorSchremsAuditRequest = {
      subProcessorId: "SUBPROC-ROGUE",
      vendorName: "Uncertified Offshore Host",
      countryOfIncorporation: "US",
      destinationDataCenterCountry: "US",
      transfersPersonalData: true,
      technical: {
        isEncryptionAtRestEnabled: false,
        isEncryptionInTransitEnabled: true,
        areEncryptionKeysHeldInEu: false,
        isZeroKnowledgeArchitecture: false
      },
      contractual: {
        hasStandardContractualClausesModule2or3: false,
        hasGovernmentSubpoenaChallengeClause: false,
        hasPromptCustomerNotificationWarranty: false,
        hasAuditRightsGranted: false
      },
      organizational: {
        hasRegularTransparencyReports: false,
        hasDocumentedInternalDataMinimizationPolicy: false,
        hasDesignatedEuDataProtectionOfficer: false
      }
    };

    const verdict = SchremsIiSupplementaryMeasuresAuditor.auditSubProcessor(request);

    expect(verdict.isCompliant).toBe(false);
    expect(verdict.verdictStatus).toBe("HIGH_RISK_THIRD_COUNTRY_EXPOSURE");
    expect(verdict.compositeScore).toBeLessThan(50);
  });
});
