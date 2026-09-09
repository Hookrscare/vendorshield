import { describe, it, expect } from "vitest";
import {
  EgressDlpInterceptor,
  SubProcessorVendorPolicy,
  DlpInspectionRequest,
} from "./egress-dlp-interceptor";

describe("QA-142: Real-Time B2B Sub-Processor Egress Traffic DLP Interceptor", () => {
  const stripePolicy: SubProcessorVendorPolicy = {
    vendorId: "vendor-stripe",
    vendorName: "Stripe Inc",
    authorizedDataTypes: ["CREDIT_CARD_PAN"],
    requiresStrictRedaction: false,
    blockUnapprovedData: true,
  };

  const openAiPolicy: SubProcessorVendorPolicy = {
    vendorId: "vendor-openai",
    vendorName: "OpenAI LLC",
    authorizedDataTypes: [], // Zero PII/Card allowed
    requiresStrictRedaction: false,
    blockUnapprovedData: true,
  };

  it("allows authorized card data to Stripe without blocking", () => {
    // Valid sample Luhn test card (Visa test prefix)
    const req: DlpInspectionRequest = {
      requestId: "req-01",
      destinationVendorId: "vendor-stripe",
      destinationUrl: "https://api.stripe.com/v1/tokens",
      payloadText: "Processing card: 4242-4242-4242-4242 for checkout session.",
    };

    const res = EgressDlpInterceptor.inspectPayload(req, stripePolicy);
    expect(res.action).toBe("ALLOW");
    expect(res.isAllowed).toBe(true);
    expect(res.detectedMatches.length).toBe(1);
    expect(res.detectedMatches[0].type).toBe("CREDIT_CARD_PAN");
    expect(res.detectedMatches[0].isAuthorizedForVendor).toBe(true);
  });

  it("blocks unauthorized SSN egress to external AI model endpoints", () => {
    const req: DlpInspectionRequest = {
      requestId: "req-02",
      destinationVendorId: "vendor-openai",
      destinationUrl: "https://api.openai.com/v1/chat/completions",
      payloadText: "Customer SSN is 012-34-5678. Summarize credit report.",
    };

    const res = EgressDlpInterceptor.inspectPayload(req, openAiPolicy);
    expect(res.action).toBe("BLOCK_EGRESS");
    expect(res.isAllowed).toBe(false);
    expect(res.sanitizedPayloadText).toBe("");
    expect(res.detectedMatches.some((m) => m.type === "SOCIAL_SECURITY_NUMBER")).toBe(true);
  });

  it("redacts sensitive leaked API keys in transit", () => {
    const policyWithRedaction: SubProcessorVendorPolicy = {
      vendorId: "vendor-analytics",
      vendorName: "DataDog",
      authorizedDataTypes: [],
      requiresStrictRedaction: true,
      blockUnapprovedData: false, // Redact instead of hard block
    };

    const req: DlpInspectionRequest = {
      requestId: "req-03",
      destinationVendorId: "vendor-analytics",
      destinationUrl: "https://http-intake.logs.datadoghq.com",
      payloadText: "Encountered auth failure using key sk_mock_abcdef123456789012345678 in container.",
    };

    const res = EgressDlpInterceptor.inspectPayload(req, policyWithRedaction);
    expect(res.action).toBe("REDACT_IN_PLACE");
    expect(res.isAllowed).toBe(true);
    expect(res.sanitizedPayloadText).toContain("[REDACTED_API_SECRET_KEY]");
    expect(res.sanitizedPayloadText).not.toContain("sk_mock_abcdef123456789012345678");
  });
});
