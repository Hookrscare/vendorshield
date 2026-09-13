/**
 * QA-170: Automated Multi-Tenant GDPR Article 28 Standard Contractual Clauses (SCC) Sub-Processor Transfer Impact Assessment (TIA) Engine.
 * Part of VendorShield B2B SOC 2 & GDPR Sub-Processor Trust Hub.
 * 
 * Conducts automated Schrems II Transfer Impact Assessments for cross-border personal data transfers:
 * 1. Evaluates destination jurisdiction adequacy status (EEA, Adequacy Decision, or Third Country).
 * 2. Assesses local foreign surveillance laws (e.g. US FISA 702 / EO 14086 vs Non-Adequate countries).
 * 3. Mandates supplementary technical measures (e.g. Bring-Your-Own-Key client-side envelope encryption).
 * 4. Issues legal transfer ratings and cryptographic TIA audit seals.
 */

import { createHash } from "crypto";

export type DestinationJurisdiction = "EEA" | "EU_ADEQUACY_DECISION" | "USA_DPF_CERTIFIED" | "THIRD_COUNTRY_UNREGULATED";

export interface SubProcessorProfile {
  vendorId: string;
  vendorName: string;
  dataHostingCountry: string;
  jurisdictionCategory: DestinationJurisdiction;
  hasSccAgreement: boolean;
  hasClientSideEncryption: boolean; // supplementary technical measure
  processesSensitiveSpecialCategoryData: boolean;
}

export interface TiaAssessmentVerdict {
  vendorId: string;
  transferAllowed: boolean;
  riskRating: "LOW_ADEQUATE" | "MEDIUM_SUPPLEMENTARY_REQUIRED" | "HIGH_TRANSFER_PROHIBITED";
  rationale: string;
  tiaAuditDigest: string;
}

export class GdprSubprocessorTiaEngine {
  public static evaluateSubProcessor(profile: SubProcessorProfile): TiaAssessmentVerdict {
    let transferAllowed = false;
    let riskRating: "LOW_ADEQUATE" | "MEDIUM_SUPPLEMENTARY_REQUIRED" | "HIGH_TRANSFER_PROHIBITED";
    let rationale = "";

    if (profile.jurisdictionCategory === "EEA" || profile.jurisdictionCategory === "EU_ADEQUACY_DECISION") {
      transferAllowed = true;
      riskRating = "LOW_ADEQUATE";
      rationale = "Destination country enjoys full EEA membership or European Commission adequacy decision.";
    } else if (profile.jurisdictionCategory === "USA_DPF_CERTIFIED") {
      if (profile.hasSccAgreement) {
        transferAllowed = true;
        riskRating = "LOW_ADEQUATE";
        rationale = "Transfer covered under EU-US Data Privacy Framework (DPF) supplemented by Article 28 SCCs.";
      } else {
        transferAllowed = false;
        riskRating = "HIGH_TRANSFER_PROHIBITED";
        rationale = "DPF certified vendor lacks executed Standard Contractual Clauses (SCCs).";
      }
    } else {
      // THIRD_COUNTRY_UNREGULATED
      if (profile.hasSccAgreement && profile.hasClientSideEncryption && !profile.processesSensitiveSpecialCategoryData) {
        transferAllowed = true;
        riskRating = "MEDIUM_SUPPLEMENTARY_REQUIRED";
        rationale = "Transfer permitted under SCCs with client-side envelope encryption supplementary measures.";
      } else {
        transferAllowed = false;
        riskRating = "HIGH_TRANSFER_PROHIBITED";
        rationale = "Third country transfer lacks mandatory supplementary encryption or involves unprotectable sensitive data.";
      }
    }

    const raw = `${profile.vendorId}:${profile.jurisdictionCategory}:${transferAllowed}:${riskRating}`;
    const digest = createHash("sha256").update(raw).digest("hex");

    return {
      vendorId: profile.vendorId,
      transferAllowed,
      riskRating,
      rationale,
      tiaAuditDigest: digest
    };
  }
}
