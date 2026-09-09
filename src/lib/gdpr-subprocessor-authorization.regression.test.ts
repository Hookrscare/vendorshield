import { describe, it, expect } from "vitest";
import {
  GDPRSubprocessorAuthorizationEngine,
  SubprocessorProposal,
  ControllerObjection,
} from "./gdpr-subprocessor-authorization";

describe("QA-135: GDPRSubprocessorAuthorizationEngine (Article 28 Mandates)", () => {
  const validProposal: SubprocessorProposal = {
    subprocessorId: "subproc-vector-01",
    name: "Pinecone Systems Inc.",
    serviceCategory: "Vector Database Storage",
    dataHostingCountry: "Germany",
    dataTransferMechanism: "INTRA_EEA",
    flowDownDpaSigned: true,
    noticeIssuedAtIso: "2026-08-01T00:00:00.000Z",
    objectionWindowDays: 30,
  };

  it("successfully initiates general written authorization with a 30-day objection window", () => {
    const record = GDPRSubprocessorAuthorizationEngine.createEngagement(
      "GENERAL_WRITTEN",
      validProposal
    );

    expect(record.status).toBe("OBJECTION_PERIOD_ACTIVE");
    expect(record.isCompliantWithArticle28).toBe(true);
    expect(record.objectionWindowExpiresAtIso).toBe("2026-08-31T00:00:00.000Z");
    expect(record.auditDigestSha256).toBeDefined();
  });

  it("blocks sub-processor engagement when Article 28(4) flow-down DPA is not executed", () => {
    const nonCompliantProposal: SubprocessorProposal = {
      ...validProposal,
      flowDownDpaSigned: false,
    };

    const record = GDPRSubprocessorAuthorizationEngine.createEngagement(
      "GENERAL_WRITTEN",
      nonCompliantProposal
    );

    expect(record.status).toBe("BLOCKED_NON_COMPLIANT");
    expect(record.isCompliantWithArticle28).toBe(false);
    expect(record.complianceNotes).toContain("Article 28(4) flow-down DPA not executed");
  });

  it("handles controller objections and successfully moves to approved once resolved", () => {
    let record = GDPRSubprocessorAuthorizationEngine.createEngagement(
      "GENERAL_WRITTEN",
      validProposal
    );

    const objection: ControllerObjection = {
      controllerId: "ctrl-fintech-corp",
      controllerName: "Fintech Corp EU",
      grounds: "Require confirmation of customer data segregation at rest",
      filedAtIso: "2026-08-10T12:00:00.000Z",
      resolved: false,
    };

    record = GDPRSubprocessorAuthorizationEngine.fileObjection(record, objection);
    expect(record.status).toBe("OBJECTION_FILED");
    expect(record.objections.length).toBe(1);

    // Attempting authorization while objection is pending should maintain objection status
    record = GDPRSubprocessorAuthorizationEngine.finalizeAuthorization(record, "2026-09-01T00:00:00.000Z");
    expect(record.status).toBe("OBJECTION_FILED");

    // Resolve objection with documentation
    record = GDPRSubprocessorAuthorizationEngine.resolveObjection(
      record,
      "ctrl-fintech-corp",
      "Provided SOC 2 Type II and VPC tenant isolation architecture diagram"
    );
    expect(record.status).toBe("OBJECTION_RESOLVED");

    // Finalize after 30-day objection window passed
    record = GDPRSubprocessorAuthorizationEngine.finalizeAuthorization(record, "2026-09-01T00:00:00.000Z");
    expect(record.status).toBe("APPROVED_ACTIVE");
    expect(record.isCompliantWithArticle28).toBe(true);
  });
});
