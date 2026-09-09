/**
 * Unit Regression Test Suite for QA-134: Real-Time FedRAMP Continuous Monitoring SSP Exporter.
 * Part of VendorShield B2B SOC 2 & GDPR Sub-Processor Trust Hub.
 */

import { describe, it, expect } from "vitest";
import {
  FedRAMPConMonSSPExporter,
  VendorSubProcessorTelemetry,
  POAMItem
} from "./fedramp-ssp-exporter";

describe("FedRAMPConMonSSPExporter", () => {
  const exporter = new FedRAMPConMonSSPExporter("test-fedramp-hmac-key");

  const compliantVendors: VendorSubProcessorTelemetry[] = [
    {
      vendorId: "v-aws-gov",
      vendorName: "Amazon Web Services GovCloud",
      fedRAMPAuthorized: true,
      fedRAMPId: "F1603077983",
      soc2Type2Active: true,
      tlsVersion: "TLS_1_3",
      mfaEnforced: true,
      auditLogRetentionDays: 365,
      openCvesCount: 0,
      highSeverityCvesCount: 0,
    },
    {
      vendorId: "v-okta",
      vendorName: "Okta Identity Cloud",
      fedRAMPAuthorized: true,
      fedRAMPId: "F1906107248",
      soc2Type2Active: true,
      tlsVersion: "TLS_1_3",
      mfaEnforced: true,
      auditLogRetentionDays: 180,
      openCvesCount: 0,
      highSeverityCvesCount: 0,
    }
  ];

  it("evaluates compliant sub-processors as fully implemented under FedRAMP MODERATE", () => {
    const report = exporter.generateConMonPackage(
      "VendorShield GovCloud SaaS",
      "2026-09",
      "MODERATE",
      compliantVendors,
      []
    );

    expect(report.overallStatus).toBe("COMPLIANT");
    expect(report.evaluatedSubProcessorsCount).toBe(2);
    expect(report.fedRampAuthorizedSubProcessorsCount).toBe(2);
    expect(report.activePoamCount).toBe(0);
    expect(report.nistControls.every((c) => c.implementationStatus === "IMPLEMENTED")).toBe(true);
    expect(report.conmonPackageHashSha256).toBeDefined();
    expect(report.conmonPackageHashSha256.length).toBe(64);
  });

  it("detects missing MFA and flags AC-2 as PARTIALLY_IMPLEMENTED with ACTION_REQUIRED status", () => {
    const nonCompliantVendors: VendorSubProcessorTelemetry[] = [
      ...compliantVendors,
      {
        vendorId: "v-legacy-crm",
        vendorName: "Legacy Marketing Automation",
        fedRAMPAuthorized: false,
        soc2Type2Active: false,
        tlsVersion: "TLS_1_2",
        mfaEnforced: false, // Breach of AC-2
        auditLogRetentionDays: 30,
        openCvesCount: 2,
        highSeverityCvesCount: 0,
      }
    ];

    const report = exporter.generateConMonPackage(
      "VendorShield GovCloud SaaS",
      "2026-09",
      "MODERATE",
      nonCompliantVendors,
      []
    );

    expect(report.overallStatus).toBe("ACTION_REQUIRED");
    const ac2 = report.nistControls.find((c) => c.controlId === "AC-2");
    expect(ac2?.implementationStatus).toBe("PARTIALLY_IMPLEMENTED");
  });

  it("escalates to NON_COMPLIANT when active critical/high POA&M weaknesses are unmitigated", () => {
    const openPoams: POAMItem[] = [
      {
        poamId: "POAM-2026-001",
        weaknessName: "Open Critical RCE Vulnerability in Sub-Processor Gateway",
        sourceOfWeakness: "VULNERABILITY_SCAN",
        nistControl: "SI-2",
        riskRating: "CRITICAL",
        scheduledCompletionDateIso: "2026-09-30T00:00:00Z",
        mitigationStrategy: "Apply patch v3.2.1 and rotate API tokens",
        daysRemaining: 14,
      }
    ];

    const report = exporter.generateConMonPackage(
      "VendorShield GovCloud SaaS",
      "2026-09",
      "HIGH",
      compliantVendors,
      openPoams
    );

    expect(report.overallStatus).toBe("NON_COMPLIANT");
    expect(report.activePoamCount).toBe(1);
    expect(report.poamItems[0].riskRating).toBe("CRITICAL");
  });
});
