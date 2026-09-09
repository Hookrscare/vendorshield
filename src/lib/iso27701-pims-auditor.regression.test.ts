import { describe, it, expect } from "vitest";
import { Iso27701PimsAuditor, PimsVendorAssessment } from "./iso27701-pims-auditor";

describe("QA-141: Iso27701PimsAuditor Regression Suite", () => {
  it("evaluates a fully certified PII processor with 100% maturity score", () => {
    const assessment: PimsVendorAssessment = {
      vendorId: "v_aws_subprocessor",
      vendorName: "Amazon Web Services EMEA",
      role: "PROCESSOR",
      controls: [
        {
          id: "ISO-27701-8.2.1",
          clause: 8,
          name: "Customer Agreement Obligations",
          category: "PROCESSOR_OBLIGATION",
          isImplemented: true,
          telemetryFreshnessHours: 24
        },
        {
          id: "ISO-27701-8.2.3",
          clause: 8,
          name: "Sub-Processor Engagement Authorization",
          category: "PROCESSOR_OBLIGATION",
          isImplemented: true,
          telemetryFreshnessHours: 48
        },
        {
          id: "ISO-27701-8.4.1",
          clause: 8,
          name: "Customer Breach Notification SLA (<= 48h)",
          category: "BREACH_SLA",
          isImplemented: true,
          telemetryFreshnessHours: 12
        }
      ]
    };

    const report = Iso27701PimsAuditor.auditVendorPims(assessment);
    expect(report.overallMaturityScore).toBe(100);
    expect(report.certificationReadiness).toBe("READY");
    expect(report.criticalGaps.length).toBe(0);
  });

  it("flags critical gaps when mandatory processor controls are missing", () => {
    const assessment: PimsVendorAssessment = {
      vendorId: "v_unverified_analytics",
      vendorName: "Shadow Analytics Inc",
      role: "PROCESSOR",
      controls: [
        {
          id: "ISO-27701-8.2.1",
          clause: 8,
          name: "Customer Agreement Obligations",
          category: "PROCESSOR_OBLIGATION",
          isImplemented: false
        },
        {
          id: "ISO-27701-8.4.1",
          clause: 8,
          name: "Customer Breach Notification SLA",
          category: "BREACH_SLA",
          isImplemented: false
        }
      ]
    };

    const report = Iso27701PimsAuditor.auditVendorPims(assessment);
    expect(report.overallMaturityScore).toBe(0);
    expect(report.certificationReadiness).toBe("NON_COMPLIANT");
    expect(report.criticalGaps.length).toBe(2);
  });
});
