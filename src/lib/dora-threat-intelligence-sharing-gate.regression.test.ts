import { describe, it, expect } from "vitest";
import {
  DoraThreatIntelligenceSharingGate,
  CyberThreatIndicator,
} from "./dora-threat-intelligence-sharing-gate";

describe("QA-187 / QA-188: DoraThreatIntelligenceSharingGate", () => {
  it("blocks external sharing for TLP:RED indicators per DORA Article 45", () => {
    const threat: CyberThreatIndicator = {
      indicatorId: "IOC-2026-001",
      threatType: "RANSOMWARE_C2",
      tlpLevel: "TLP:RED",
      rawIndicatorIoc: "198.51.100.42:8443",
      sharingPartnerId: "EU-BANK-88",
      isFinancialSectorCriticalEntity: true,
    };

    const res = DoraThreatIntelligenceSharingGate.sanitizeAndGateIndicator(threat);

    expect(res.indicatorId).toBe("IOC-2026-001");
    expect(res.isEligibleForDoraSharing).toBe(false);
    expect(res.sanitizedIoc).toBe("198.51.100.42:8443");
    expect(res.effectiveTlp).toBe("TLP:RED");
    expect(res.auditTrailDigest).toHaveLength(64);
  });

  it("permits TLP:AMBER indicators for financial sector critical entities and redacts email PII", () => {
    const threat: CyberThreatIndicator = {
      indicatorId: "IOC-2026-002",
      threatType: "SUPPLY_CHAIN_BACKDOOR",
      tlpLevel: "TLP:AMBER",
      rawIndicatorIoc: "Malicious payload observed in npm package by security-lead@compromised-vendor.eu targeting registry",
      sharingPartnerId: "FIN-CERT-12",
      isFinancialSectorCriticalEntity: true,
    };

    const res = DoraThreatIntelligenceSharingGate.sanitizeAndGateIndicator(threat);

    expect(res.isEligibleForDoraSharing).toBe(true);
    expect(res.sanitizedIoc).toContain("[REDACTED_PII]");
    expect(res.sanitizedIoc).not.toContain("security-lead@compromised-vendor.eu");
    expect(res.effectiveTlp).toBe("TLP:AMBER");
  });

  it("rejects invalid indicator inputs without required fields", () => {
    expect(() =>
      DoraThreatIntelligenceSharingGate.sanitizeAndGateIndicator({
        indicatorId: "",
        threatType: "ZERO_DAY_EXPLOIT",
        tlpLevel: "TLP:CLEAR",
        rawIndicatorIoc: "",
        sharingPartnerId: "P1",
        isFinancialSectorCriticalEntity: true,
      })
    ).toThrow("Invalid indicator: indicatorId and rawIndicatorIoc required.");
  });
});
