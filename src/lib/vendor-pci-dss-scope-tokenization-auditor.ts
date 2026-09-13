/**
 * QA-179: Automated Vendor PCI-DSS 4.0 Scope Reduction & Network Tokenization Auditor.
 * Part of VendorShield B2B SOC 2 & GDPR Sub-Processor Trust Hub.
 * 
 * Audits third-party vendor payment integrations against PCI-DSS v4.0 scope requirements:
 * 1. Validates payment form architecture (Hosted Fields / iFrame / Direct API).
 * 2. Evaluates Network Tokenization vs Cleartext PAN exposure.
 * 3. Classifies PCI-DSS SAQ Scope (SAQ A vs SAQ A-EP vs SAQ D).
 * 4. Checks TLS version, key rotation, and generates an audit integrity hash.
 */

import { createHash } from "crypto";

export type PaymentArchitecture = "HOSTED_IFRAME_ELEMENTS" | "REDIRECT_HOSTED_CHECKOUT" | "DIRECT_REST_API";

export interface VendorPaymentAuditInput {
  vendorId: string;
  vendorName: string;
  architecture: PaymentArchitecture;
  usesNetworkTokenization: boolean;
  cleartextPanStorageDetected: boolean;
  tlsVersion: "1.3" | "1.2" | "1.1" | "1.0";
  keyRotationDays: number;
}

export interface PciDssAuditResult {
  vendorId: string;
  pciScopeClassification: "SAQ_A_SCOPE_REDUCED" | "SAQ_A_EP_PARTIAL_SCOPE" | "SAQ_D_FULL_CDE_IN_SCOPE";
  isCompliantPciV4: boolean;
  riskFlags: string[];
  scopeReductionSavingsEstimatedPct: number;
  auditAttestationHash: string;
}

export class VendorPciDssScopeTokenizationAuditor {
  public static auditVendor(input: VendorPaymentAuditInput): PciDssAuditResult {
    if (!input.vendorId || !input.vendorName) {
      throw new Error("Vendor ID and Name must not be empty.");
    }

    const riskFlags: string[] = [];

    if (input.cleartextPanStorageDetected) {
      riskFlags.push("CRITICAL_CLEARTEXT_PAN_STORAGE_PROHIBITED");
    }

    if (input.tlsVersion === "1.0" || input.tlsVersion === "1.1") {
      riskFlags.push("DEPRECATED_INSECURE_TLS_CIPHER");
    }

    if (input.keyRotationDays > 365) {
      riskFlags.push("ENCRYPTION_KEY_ROTATION_EXCEEDS_ANNUAL_LIMIT");
    }

    let pciScope: "SAQ_A_SCOPE_REDUCED" | "SAQ_A_EP_PARTIAL_SCOPE" | "SAQ_D_FULL_CDE_IN_SCOPE";
    let savingsPct = 0;

    if (input.cleartextPanStorageDetected || input.architecture === "DIRECT_REST_API") {
      pciScope = "SAQ_D_FULL_CDE_IN_SCOPE";
      savingsPct = 0;
    } else if (input.architecture === "HOSTED_IFRAME_ELEMENTS" || input.architecture === "REDIRECT_HOSTED_CHECKOUT") {
      if (input.usesNetworkTokenization) {
        pciScope = "SAQ_A_SCOPE_REDUCED";
        savingsPct = 85;
      } else {
        pciScope = "SAQ_A_EP_PARTIAL_SCOPE";
        savingsPct = 40;
      }
    } else {
      pciScope = "SAQ_D_FULL_CDE_IN_SCOPE";
      savingsPct = 0;
    }

    const isCompliant = riskFlags.length === 0;

    const raw = `${input.vendorId}:${pciScope}:${isCompliant}:${savingsPct}:${riskFlags.join(",")}`;
    const hash = createHash("sha256").update(raw).digest("hex");

    return {
      vendorId: input.vendorId,
      pciScopeClassification: pciScope,
      isCompliantPciV4: isCompliant,
      riskFlags,
      scopeReductionSavingsEstimatedPct: savingsPct,
      auditAttestationHash: hash
    };
  }
}
