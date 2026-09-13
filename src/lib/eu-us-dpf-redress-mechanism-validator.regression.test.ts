import { describe, it, expect } from "vitest";
import {
  EuUsDpfRedressMechanismValidator,
  VendorDpfAttestation,
} from "./eu-us-dpf-redress-mechanism-validator";

describe("QA-187: EuUsDpfRedressMechanismValidator", () => {
  it("validates a compliant US vendor with active DPF certification and recourse provider", () => {
    const attestation: VendorDpfAttestation = {
      vendorId: "vnd-aws-us",
      vendorName: "Amazon Web Services, Inc.",
      dpfParticipantStatus: "ACTIVE",
      recourseMechanismProvider: "EU_DPA_PANEL",
      coversHumanResourcesData: true,
      coversNonHumanResourcesData: true,
      annualRecertificationDate: "2026-03-15",
      complaintsContactEmail: "privacy@aws.amazon.com",
    };

    const result = EuUsDpfRedressMechanismValidator.validateVendorDpfCompliance(
      attestation,
      "2026-09-13"
    );

    expect(result.isCompliantForEuTransfers).toBe(true);
    expect(result.compliancePosture).toBe("CERTIFIED_VALID_RECOURSE");
    expect(result.recourseProvider).toBe("EU_DPA_PANEL");
    expect(result.verificationDigest).toHaveLength(64);
  });

  it("identifies missing independent recourse mechanism", () => {
    const attestation: VendorDpfAttestation = {
      vendorId: "vnd-saas-corp",
      vendorName: "Unregistered SaaS Corp",
      dpfParticipantStatus: "ACTIVE",
      recourseMechanismProvider: "NONE",
      coversHumanResourcesData: false,
      coversNonHumanResourcesData: true,
      annualRecertificationDate: "2026-01-10",
      complaintsContactEmail: "contact@saascorp.com",
    };

    const result = EuUsDpfRedressMechanismValidator.validateVendorDpfCompliance(
      attestation,
      "2026-09-13"
    );

    expect(result.isCompliantForEuTransfers).toBe(false);
    expect(result.compliancePosture).toBe("MISSING_INDEPENDENT_RECOURSE");
  });

  it("identifies expired or revoked DPF status", () => {
    const attestation: VendorDpfAttestation = {
      vendorId: "vnd-expired-corp",
      vendorName: "Expired SaaS Corp",
      dpfParticipantStatus: "REVOKED",
      recourseMechanismProvider: "ICDR_AAA",
      coversHumanResourcesData: false,
      coversNonHumanResourcesData: true,
      annualRecertificationDate: "2024-01-01",
      complaintsContactEmail: "contact@expired.com",
    };

    const result = EuUsDpfRedressMechanismValidator.validateVendorDpfCompliance(
      attestation,
      "2026-09-13"
    );

    expect(result.isCompliantForEuTransfers).toBe(false);
    expect(result.compliancePosture).toBe("EXPIRED_OR_REVOKED");
  });
});
