import { describe, it, expect } from "vitest";
import { EgressDlpInterceptor } from "./egress-dlp-interceptor";

describe("QA-142: EgressDlpInterceptor Regression Suite", () => {
  it("allows clean egress payloads without modifications", () => {
    const cleanPayload = JSON.stringify({
      event: "checkout.completed",
      customerId: "cus_991823",
      amountCents: 4900
    });

    const result = EgressDlpInterceptor.inspectAndSanitize(cleanPayload, "api.segment.io");
    expect(result.allowed).toBe(true);
    expect(result.actionTaken).toBe("ALLOW");
    expect(result.violationsDetected.length).toBe(0);
    expect(result.sanitizedPayload).toBe(cleanPayload);
  });

  it("redacts SSN and AWS keys when in REDACT mode", () => {
    const payload = "Customer 123-45-6789 used credentials with key AKIAIOSFODNN7EXAMPLE to login.";
    const result = EgressDlpInterceptor.inspectAndSanitize(payload, "api.mixpanel.com", "REDACT");

    expect(result.allowed).toBe(true);
    expect(result.actionTaken).toBe("MASK_AND_FORWARD");
    expect(result.violationsDetected.length).toBe(2);
    expect(result.sanitizedPayload).toContain("[REDACTED_SSN]");
    expect(result.sanitizedPayload).toContain("AKIA[REDACTED_AWS_KEY]");
    expect(result.sanitizedPayload).not.toContain("123-45-6789");
  });

  it("immediately blocks egress when private key block is found", () => {
    const payload = `
      -----BEGIN RSA PRIVATE KEY-----
      MIIEowIBAAKCAQEA0Y1+abcdef
      -----END RSA PRIVATE KEY-----
    `;
    const result = EgressDlpInterceptor.inspectAndSanitize(payload, "api.openai.com");

    expect(result.allowed).toBe(false);
    expect(result.actionTaken).toBe("BLOCK_AND_ALERT");
    expect(result.violationsDetected[0].type).toBe("PRIVATE_KEY_BLOCK");
  });
});
