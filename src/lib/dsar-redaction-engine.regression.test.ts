import { describe, it, expect } from "vitest";
import {
  intakeDsarRequest,
  calculateStatutoryDeadline,
  redactPiiForExport,
  updateSubProcessorProgress,
  computeDsarReceipt
} from "./dsar-redaction-engine";

describe("QA-123: Automated Multi-Jurisdiction Data Subject Access Request (DSAR) Intake & Redaction Engine", () => {
  it("registers a GDPR Right of Access request with statutory 30-day deadline and cryptographic receipt", () => {
    const record = intakeDsarRequest({
      tenantId: "TENANT-ACME",
      dataSubjectEmail: "sarah.connor@example.com",
      dataSubjectName: "Sarah Connor",
      requestType: "RIGHT_OF_ACCESS",
      jurisdiction: "EU_GDPR",
      submissionDateIso: "2026-09-01T12:00:00.000Z",
      subProcessorsInScope: ["AWS_EMEA", "DATADOG", "STRIPE"]
    });

    expect(record.requestId).toMatch(/^DSAR-[A-F0-9]{10}$/);
    expect(record.status).toBe("SUBMITTED");
    expect(record.statutoryDeadlineIso).toBe("2026-10-01T12:00:00.000Z"); // Exactly 30 days
    expect(record.cryptographicReceipt).toMatch(/^DSAR-RCPT-[A-F0-9]{24}$/);
    expect(record.subProcessorStatus["AWS_EMEA"]).toBe("PENDING");
  });

  it("calculates statutory deadline for California CCPA (45 days) and extensions correctly", () => {
    const ccpaDeadline = calculateStatutoryDeadline("2026-09-01T00:00:00.000Z", "CALIFORNIA_CCPA", false);
    expect(ccpaDeadline).toBe("2026-10-16T00:00:00.000Z"); // 45 days

    const extendedGdpr = calculateStatutoryDeadline("2026-09-01T00:00:00.000Z", "EU_GDPR", true);
    expect(extendedGdpr).toBe("2026-11-30T00:00:00.000Z"); // 30 + 60 = 90 days
  });

  it("redacts third-party emails, payment card numbers, SSNs, IPs, and API keys while preserving requester email", () => {
    const rawDocument = `
      User Account Report:
      Subject: sarah.connor@example.com
      Referred by colleague: bob.builder@thirdparty.org
      Billing Card: 4111111111111234
      Tax ID / SSN: 123-45-6789
      Login IP: 198.51.100.42
      Internal Session: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.t-ID
    `;

    const result = redactPiiForExport(rawDocument, "sarah.connor@example.com");

    expect(result.redactedText).toContain("sarah.connor@example.com"); // Preserved
    expect(result.redactedText).not.toContain("bob.builder@thirdparty.org"); // Redacted
    expect(result.redactedText).toContain("b***@thirdparty.org");
    expect(result.redactedText).not.toContain("4111111111111234");
    expect(result.redactedText).toContain("[REDACTED_PAYMENT_CARD]");
    expect(result.redactedText).not.toContain("123-45-6789");
    expect(result.redactedText).toContain("[REDACTED_SSN]");
    expect(result.redactedText).not.toContain("198.51.100.42");
    expect(result.redactedText).toContain("[REDACTED_IP]");
    expect(result.redactedText).toContain("[REDACTED_CREDENTIALS]");

    expect(result.categoriesFound).toContain("CREDIT_CARD");
    expect(result.categoriesFound).toContain("GOVERNMENT_ID_SSN");
    expect(result.categoriesFound).toContain("THIRD_PARTY_EMAIL");
    expect(result.categoriesFound).toContain("IP_ADDRESS");
  });

  it("orchestrates sub-processor fulfillment and transitions status to FULFILLED when all complete", () => {
    const initial = intakeDsarRequest({
      tenantId: "TENANT-ACME",
      dataSubjectEmail: "john@example.com",
      dataSubjectName: "John Doe",
      requestType: "RIGHT_TO_ERASURE",
      jurisdiction: "EU_GDPR",
      submissionDateIso: "2026-09-01T12:00:00.000Z",
      subProcessorsInScope: ["AWS", "STRIPE"]
    });

    const step1 = updateSubProcessorProgress(initial, "AWS", "COMPLETED");
    expect(step1.status).toBe("DISPATCHED_TO_SUBPROCESSORS");
    expect(step1.subProcessorStatus["AWS"]).toBe("COMPLETED");
    expect(step1.subProcessorStatus["STRIPE"]).toBe("PENDING");

    const step2 = updateSubProcessorProgress(step1, "STRIPE", "COMPLETED");
    expect(step2.status).toBe("FULFILLED");
    expect(step2.auditTrail.length).toBe(3);
  });
});
