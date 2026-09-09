/**
 * QA-142: Real-Time B2B Sub-Processor Egress Traffic DLP Interceptor.
 * Part of VendorShield B2B SOC 2 & GDPR Sub-Processor Trust Hub.
 *
 * Inspects outgoing HTTP payload payloads to third-party sub-processors.
 * Detects and redacts unmasked PII, PCI PANs, API secrets, and private keys
 * to prevent upstream vendor data contamination and breach exposure.
 */

export type DlpViolationType =
  | "CREDIT_CARD_PAN"
  | "US_SSN"
  | "AWS_ACCESS_KEY"
  | "BEARER_JWT"
  | "PRIVATE_KEY_BLOCK";

export interface DlpInspectionResult {
  allowed: boolean;
  actionTaken: "ALLOW" | "MASK_AND_FORWARD" | "BLOCK_AND_ALERT";
  sanitizedPayload: string;
  violationsDetected: {
    type: DlpViolationType;
    matchCount: number;
  }[];
  destinationSubProcessor: string;
}

export class EgressDlpInterceptor {
  private static readonly AWS_KEY_REGEX = /AKIA[0-9A-Z]{16}/g;
  private static readonly SSN_REGEX = /\b\d{3}-\d{2}-\d{4}\b/g;
  private static readonly JWT_REGEX = /\beyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*\b/g;
  private static readonly PRIVATE_KEY_REGEX = /-----BEGIN [A-Z ]+PRIVATE KEY-----[^-]+-----END [A-Z ]+PRIVATE KEY-----/gs;
  private static readonly CARD_CANDIDATE_REGEX = /\b(?:\d[ -]*?){13,19}\b/g;

  /**
   * Luhn algorithm validation for credit card numbers.
   */
  public static isValidLuhn(candidate: string): boolean {
    const digits = candidate.replace(/\D/g, "");
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

  public static inspectAndSanitize(
    payload: string,
    subProcessorHost: string,
    enforcementMode: "BLOCK" | "REDACT" = "REDACT"
  ): DlpInspectionResult {
    let sanitized = payload;
    const violations: { type: DlpViolationType; matchCount: number }[] = [];

    // 1. Private Keys -> Critical blocker
    const privKeys = payload.match(this.PRIVATE_KEY_REGEX);
    if (privKeys && privKeys.length > 0) {
      violations.push({ type: "PRIVATE_KEY_BLOCK", matchCount: privKeys.length });
      return {
        allowed: false,
        actionTaken: "BLOCK_AND_ALERT",
        sanitizedPayload: "[REDACTED: PRIVATE KEY DETECTED - EGRESS BLOCKED]",
        violationsDetected: violations,
        destinationSubProcessor: subProcessorHost
      };
    }

    // 2. AWS Access Keys
    const awsKeys = sanitized.match(this.AWS_KEY_REGEX);
    if (awsKeys && awsKeys.length > 0) {
      violations.push({ type: "AWS_ACCESS_KEY", matchCount: awsKeys.length });
      sanitized = sanitized.replace(this.AWS_KEY_REGEX, "AKIA[REDACTED_AWS_KEY]");
    }

    // 3. SSNs
    const ssns = sanitized.match(this.SSN_REGEX);
    if (ssns && ssns.length > 0) {
      violations.push({ type: "US_SSN", matchCount: ssns.length });
      sanitized = sanitized.replace(this.SSN_REGEX, "[REDACTED_SSN]");
    }

    // 4. JWTs
    const jwts = sanitized.match(this.JWT_REGEX);
    if (jwts && jwts.length > 0) {
      violations.push({ type: "BEARER_JWT", matchCount: jwts.length });
      sanitized = sanitized.replace(this.JWT_REGEX, "[REDACTED_JWT_TOKEN]");
    }

    // 5. Credit Cards (verified via Luhn)
    const cardCandidates = sanitized.match(this.CARD_CANDIDATE_REGEX);
    if (cardCandidates) {
      let luhnMatches = 0;
      for (const c of cardCandidates) {
        if (this.isValidLuhn(c)) {
          luhnMatches++;
          sanitized = sanitized.replace(c, "[REDACTED_PCI_PAN]");
        }
      }
      if (luhnMatches > 0) {
        violations.push({ type: "CREDIT_CARD_PAN", matchCount: luhnMatches });
      }
    }

    if (violations.length === 0) {
      return {
        allowed: true,
        actionTaken: "ALLOW",
        sanitizedPayload: payload,
        violationsDetected: [],
        destinationSubProcessor: subProcessorHost
      };
    }

    if (enforcementMode === "BLOCK") {
      return {
        allowed: false,
        actionTaken: "BLOCK_AND_ALERT",
        sanitizedPayload: "[BLOCKED: SENSITIVE DATA DETECTED]",
        violationsDetected: violations,
        destinationSubProcessor: subProcessorHost
      };
    }

    return {
      allowed: true,
      actionTaken: "MASK_AND_FORWARD",
      sanitizedPayload: sanitized,
      violationsDetected: violations,
      destinationSubProcessor: subProcessorHost
    };
  }
}
