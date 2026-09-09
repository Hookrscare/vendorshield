import { describe, it, expect } from "vitest";
import {
  GdprArticle28WorkflowEngine,
  Article28FlowDownObligations
} from "./gdpr-article28-workflow";

describe("QA-135: Automated GDPR Article 28 Sub-Processor Authorization Workflow Engine", () => {
  const compliantFlowDown: Article28FlowDownObligations = {
    equivalentDataProtectionGuarantees: true,
    confidentialityCommitment: true,
    technicalOrganizationalMeasuresArt32: true,
    subSubProcessorRestriction: true,
    auditAndInspectionAssistance: true,
    deletionOrReturnAtTermination: true,
  };

  it("should initiate sub-processor engagement and calculate 30-day objection window", () => {
    const noticeTime = "2026-09-01T00:00:00.000Z";
    const eng = GdprArticle28WorkflowEngine.initiateEngagement({
      engagementId: "ENG-2026-001",
      tenantId: "tenant-acme",
      controllerName: "Acme Corp",
      processorName: "VendorShield Cloud",
      subProcessorName: "FastCDN Global Inc",
      subProcessorJurisdiction: "EU (Germany)",
      processingActivityScope: "Edge static asset caching and TLS termination",
      noticeIssuedAtIso: noticeTime,
      objectionWindowDays: 30,
      flowDownObligations: compliantFlowDown,
    });

    expect(eng.status).toBe("PENDING_NOTICE_WINDOW");
    expect(eng.objectionDeadlineIso).toBe("2026-10-01T00:00:00.000Z");
    expect(eng.auditDigestSha256).toHaveLength(64);
  });

  it("should register controller objection, handle resolution, and finalize authorization", () => {
    let eng = GdprArticle28WorkflowEngine.initiateEngagement({
      engagementId: "ENG-2026-002",
      tenantId: "tenant-globex",
      controllerName: "Globex Industries",
      processorName: "VendorShield Cloud",
      subProcessorName: "AnalyticsSub LLC",
      subProcessorJurisdiction: "US",
      processingActivityScope: "Telemetry aggregation",
      noticeIssuedAtIso: "2026-08-01T00:00:00.000Z",
      objectionWindowDays: 30,
      flowDownObligations: compliantFlowDown,
    });

    // 1. Controller files objection
    eng = GdprArticle28WorkflowEngine.registerObjection(eng, {
      objectionId: "OBJ-001",
      raisedByEmail: "dpo@globex.com",
      grounds: "Concern regarding US cross-border data transfer risk",
    });

    expect(eng.status).toBe("OBJECTION_RAISED");
    expect(eng.objections).toHaveLength(1);

    // Cannot finalize with open objection
    expect(() =>
      GdprArticle28WorkflowEngine.finalizeAuthorization(eng, "2026-09-05T00:00:00.000Z")
    ).toThrow(/Unresolved controller objections/);

    // 2. Resolve objection with SCC and supplementary encryption
    eng = GdprArticle28WorkflowEngine.resolveObjection(
      eng,
      "OBJ-001",
      "Executed EU SCC Module 3 with bring-your-own KMS client-side encryption."
    );

    expect(eng.status).toBe("PENDING_NOTICE_WINDOW");

    // 3. Finalize authorization past deadline
    eng = GdprArticle28WorkflowEngine.finalizeAuthorization(eng, "2026-09-05T00:00:00.000Z");
    expect(eng.status).toBe("AUTHORIZED_ACTIVE");

    // 4. Generate Certificate
    const cert = GdprArticle28WorkflowEngine.generateCertificate(eng, "2026-09-05T12:00:00.000Z");
    expect(cert.certificateId).toMatch(/^CERT-GDPR28-[A-F0-9]{12}$/);
    expect(cert.certificateHashSha256).toHaveLength(64);
    expect(cert.flowDownFullyCompliant).toBe(true);
    expect(cert.status).toBe("AUTHORIZED_ACTIVE");
  });

  it("should prevent authorization if flow-down obligations are missing", () => {
    const nonCompliantFlowDown: Article28FlowDownObligations = {
      ...compliantFlowDown,
      auditAndInspectionAssistance: false,
    };

    const eng = GdprArticle28WorkflowEngine.initiateEngagement({
      engagementId: "ENG-2026-003",
      tenantId: "tenant-fail",
      controllerName: "FailSafe Inc",
      processorName: "VendorShield Cloud",
      subProcessorName: "NonCompliant Provider",
      subProcessorJurisdiction: "CH",
      processingActivityScope: "Storage",
      noticeIssuedAtIso: "2026-07-01T00:00:00.000Z",
      objectionWindowDays: 14,
      flowDownObligations: nonCompliantFlowDown,
    });

    expect(() =>
      GdprArticle28WorkflowEngine.finalizeAuthorization(eng, "2026-07-20T00:00:00.000Z")
    ).toThrow(/flow-down obligations not fully satisfied/);
  });
});
