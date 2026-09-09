/**
 * QA-142: Real-Time B2B Sub-Processor Egress Traffic DLP Interceptor.
 * Part of VendorShield B2B SOC 2 & GDPR Sub-Processor Trust Hub.
 * Inspects outbound API and egress network payloads to sub-processors, matches sensitive PII/secrets,
 * validates destination vendor authorization tiers, executes zero-knowledge masking, and enforces DLP policies.
 */

import { createHash } from "crypto";

export type SensitiveDataType =
  | "CREDIT_CARD_PAN"
  | "SOCIAL_SECURITY_NUMBER"
  | "API_SECRET_KEY"
  | "JWT_BEARER_TOKEN"
  | "EMAIL_ADDRESS"
  | "PHONE_NUMBER";

export type DlpAction = "ALLOW" | "REDACT_IN_PLACE" | "BLOCK_EGRESS";

export interface SubProcessorVendorPolicy {
  vendorId: string;
  vendorName: string;
  authorizedDataTypes: SensitiveDataType[];
  requiresStrictRedaction: boolean;
  blockUnapprovedData: boolean;
}

export interface DlpInspectionRequest {
  requestId: string;
  destinationVendorId: string;
  destinationUrl: string;
  payloadText: string;
}

export interface DlpDetectionMatch {
  type: SensitiveDataType;
  matchedString: string;
  isAuthorizedForVendor: boolean;
}

export interface DlpInspectionResult {
  requestId: string;
  destinationVendorId: string;
  action: DlpAction;
  isAllowed: boolean;
  detectedMatches: DlpDetectionMatch[];
  sanitizedPayloadText: string;
  auditDigestSha256: string;
}

export class EgressDlpInterceptor {
  // Luhn algorithm for valid credit cards
  private static validateLuhn(ccNumber: string): boolean {
    const digits = ccNumber.replace(/\D/g, "");
    if (digits.length < 13 || digits.length > 19) return false;
    let sum = 0;
    let shouldDouble = false;
    for (let i = digits.length - 1; i >= 0; i--) {
      let digit = parseInt(digits.charAt(i), 10);
      if (shouldDouble) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
      shouldDouble = !shouldDouble;
    }
    return sum % 10 === 0;
  }

  public static inspectPayload(
    request: DlpInspectionRequest,
    vendorPolicy: SubProcessorVendorPolicy
  ): DlpInspectionResult {
    let sanitized = request.payloadText;
    const matches: DlpDetectionMatch[] = [];

    // 1. Credit Card Detection (13-19 digits with separators, Luhn verified)
    const ccRegex = /\b(?:\d[ -]*?){13,19}\b/g;
    let ccMatch;
    while ((ccMatch = ccRegex.exec(request.payloadText)) !== null) {
      const candidate = ccMatch[0];
      const digitsOnly = candidate.replace(/\D/g, "");
      if (this.validateLuhn(digitsOnly)) {
        const authorized = vendorPolicy.authorizedDataTypes.includes("CREDIT_CARD_PAN");
        matches.push({ type: "CREDIT_CARD_PAN", matchedString: candidate, isAuthorizedForVendor: authorized });
        if (!authorized || vendorPolicy.requiresStrictRedaction) {
          const last4 = digitsOnly.slice(-4);
          sanitized = sanitized.replace(candidate, `[REDACTED_CARD_...${last4}]`);
        }
      }
    }

    // 2. SSN Detection (###-##-####)
    const ssnRegex = /\b\d{3}-\d{2}-\d{4}\b/g;
    let ssnMatch;
    while ((ssnMatch = ssnRegex.exec(request.payloadText)) !== null) {
      const candidate = ssnMatch[0];
      const authorized = vendorPolicy.authorizedDataTypes.includes("SOCIAL_SECURITY_NUMBER");
      matches.push({ type: "SOCIAL_SECURITY_NUMBER", matchedString: candidate, isAuthorizedForVendor: authorized });
      if (!authorized || vendorPolicy.requiresStrictRedaction) {
        sanitized = sanitized.replace(candidate, "[REDACTED_SSN_****]");
      }
    }

    // 3. API Secret Keys (e.g. sk_live_..., sk_mock_..., ghp_..., eyJ...)
    const keyRegex = /\b(?:sk_(?:live|test|mock)_[a-zA-Z0-9]{20,}|ghp_[a-zA-Z0-9]{20,}|AIza[0-9A-Za-z-_]{35})\b/g;
    let keyMatch;
    while ((keyMatch = keyRegex.exec(request.payloadText)) !== null) {
      const candidate = keyMatch[0];
      const authorized = vendorPolicy.authorizedDataTypes.includes("API_SECRET_KEY");
      matches.push({ type: "API_SECRET_KEY", matchedString: candidate, isAuthorizedForVendor: authorized });
      sanitized = sanitized.replace(candidate, "[REDACTED_API_SECRET_KEY]");
    }

    // Policy Decision
    const unauthorizedMatches = matches.filter((m) => !m.isAuthorizedForVendor);
    let action: DlpAction = "ALLOW";

    if (unauthorizedMatches.length > 0) {
      if (vendorPolicy.blockUnapprovedData) {
        action = "BLOCK_EGRESS";
      } else {
        action = "REDACT_IN_PLACE";
      }
    } else if (matches.length > 0 && vendorPolicy.requiresStrictRedaction) {
      action = "REDACT_IN_PLACE";
    }

    const digest = createHash("sha256")
      .update(JSON.stringify({ requestId: request.requestId, action, matchesCount: matches.length }))
      .digest("hex");

    return {
      requestId: request.requestId,
      destinationVendorId: vendorPolicy.vendorId,
      action,
      isAllowed: action !== "BLOCK_EGRESS",
      detectedMatches: matches,
      sanitizedPayloadText: action === "BLOCK_EGRESS" ? "" : sanitized,
      auditDigestSha256: digest,
    };
  }
}
