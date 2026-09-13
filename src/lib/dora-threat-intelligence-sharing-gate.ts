/**
 * QA-187: Real-Time DORA Digital Operational Resilience Act Threat Intelligence Sharing Gate.
 * Part of VendorShield B2B Trust & Enterprise Security Platform.
 * 
 * Enforces EU DORA Article 45 cyber threat intelligence sharing protocols,
 * TLP (Traffic Light Protocol 2.0) access gating, and PII anonymization.
 */

import { createHash } from "crypto";

export type TlpLevel = "TLP:RED" | "TLP:AMBER+STRICT" | "TLP:AMBER" | "TLP:GREEN" | "TLP:CLEAR";

export interface CyberThreatIndicator {
  indicatorId: string;
  threatType: "RANSOMWARE_C2" | "SUPPLY_CHAIN_BACKDOOR" | "ZERO_DAY_EXPLOIT" | "CREDENTIAL_STUFFING";
  tlpLevel: TlpLevel;
  rawIndicatorIoc: string; // IP, domain, hash, or description
  sharingPartnerId: string;
  isFinancialSectorCriticalEntity: boolean;
}

export interface DoraThreatSharingResult {
  indicatorId: string;
  isEligibleForDoraSharing: boolean;
  sanitizedIoc: string;
  effectiveTlp: TlpLevel;
  auditTrailDigest: string;
}

export class DoraThreatIntelligenceSharingGate {
  private static readonly RESTRICTED_PATTERNS = [
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, // Email PII
    /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13})\b/g // Credit card
  ];

  public static sanitizeAndGateIndicator(
    threat: CyberThreatIndicator
  ): DoraThreatSharingResult {
    if (!threat.indicatorId || !threat.rawIndicatorIoc) {
      throw new Error("Invalid indicator: indicatorId and rawIndicatorIoc required.");
    }

    // 1. DORA Art. 45 eligibility gating
    // TLP:RED cannot be shared externally beyond the incident response core team
    const isEligible = threat.tlpLevel !== "TLP:RED" && threat.isFinancialSectorCriticalEntity;

    // 2. Anonymize/redact any accidental PII in the IOC description
    let sanitized = threat.rawIndicatorIoc;
    for (const pattern of this.RESTRICTED_PATTERNS) {
      sanitized = sanitized.replace(pattern, "[REDACTED_PII]");
    }

    const raw = `${threat.indicatorId}:${threat.tlpLevel}:${isEligible}:${sanitized}`;
    const digest = createHash("sha256").update(raw).digest("hex");

    return {
      indicatorId: threat.indicatorId,
      isEligibleForDoraSharing: isEligible,
      sanitizedIoc: sanitized,
      effectiveTlp: threat.tlpLevel,
      auditTrailDigest: digest
    };
  }
}
