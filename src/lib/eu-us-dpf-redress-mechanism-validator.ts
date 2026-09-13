/**
 * QA-187: Cross-Border EU-US Data Privacy Framework (DPF) Redress Mechanism Validator.
 * Part of VendorShield B2B Trust & Enterprise Security Platform.
 * 
 * Validates US vendor participation in the EU-US Data Privacy Framework,
 * independent recourse mechanisms, and GDPR Chapter V international transfer compliance.
 */

import { createHash } from "crypto";

export interface VendorDpfAttestation {
  vendorId: string;
  vendorName: string;
  dpfParticipantStatus: "ACTIVE" | "INACTIVE" | "REVOKED";
  recourseMechanismProvider: "BBB_NATIONAL_PROGRAMS" | "ICDR_AAA" | "JAMS" | "EU_DPA_PANEL" | "NONE";
  coversHumanResourcesData: boolean;
  coversNonHumanResourcesData: boolean;
  annualRecertificationDate: string; // YYYY-MM-DD
  complaintsContactEmail: string;
}

export interface DpfValidationResult {
  vendorId: string;
  isCompliantForEuTransfers: boolean;
  recourseProvider: string;
  compliancePosture: "CERTIFIED_VALID_RECOURSE" | "MISSING_INDEPENDENT_RECOURSE" | "EXPIRED_OR_REVOKED";
  verificationDigest: string;
}

export class EuUsDpfRedressMechanismValidator {
  public static validateVendorDpfCompliance(
    attestation: VendorDpfAttestation,
    currentDateStr: string = "2026-09-13"
  ): DpfValidationResult {
    if (!attestation.vendorId || !attestation.vendorName) {
      throw new Error("vendorId and vendorName are required.");
    }

    const isActive = attestation.dpfParticipantStatus === "ACTIVE";
    const hasValidRecourse = attestation.recourseMechanismProvider !== "NONE";

    // Check if certification is expired (> 365 days)
    const recertDate = new Date(attestation.annualRecertificationDate).getTime();
    const curDate = new Date(currentDateStr).getTime();
    const isRecertCurrent = !isNaN(recertDate) && (curDate - recertDate) <= 365 * 86400 * 1000;

    let posture: DpfValidationResult["compliancePosture"] = "EXPIRED_OR_REVOKED";
    let isCompliant = false;

    if (isActive && isRecertCurrent) {
      if (hasValidRecourse) {
        posture = "CERTIFIED_VALID_RECOURSE";
        isCompliant = true;
      } else {
        posture = "MISSING_INDEPENDENT_RECOURSE";
      }
    }

    const raw = `${attestation.vendorId}:${attestation.dpfParticipantStatus}:${posture}:${isCompliant}`;
    const digest = createHash("sha256").update(raw).digest("hex");

    return {
      vendorId: attestation.vendorId,
      isCompliantForEuTransfers: isCompliant,
      recourseProvider: attestation.recourseMechanismProvider,
      compliancePosture: posture,
      verificationDigest: digest
    };
  }
}
