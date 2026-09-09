import { describe, it, expect } from "vitest";
import {
  VendorSoc2AttestationPipeline,
  ControlTelemetry
} from "./vendor-soc2-attestation-pipeline";

describe("QA-150: VendorSoc2AttestationPipeline Regression Suite", () => {
  it("certifies 100% compliant vendor telemetry stream", () => {
    const telemetry: ControlTelemetry[] = [
      {
        controlId: "CC6.1",
        controlName: "Logical Access Controls & MFA Enforcement",
        metricValue: 100,
        targetThreshold: 100,
        comparisonOperator: "EQ",
        evidenceSource: "Okta SCIM API"
      },
      {
        controlId: "CC6.6",
        controlName: "Boundary Protection & Web Application Firewall",
        metricValue: 100,
        targetThreshold: 100,
        comparisonOperator: "EQ",
        evidenceSource: "Cloudflare WAF Logs"
      },
      {
        controlId: "A1.2",
        controlName: "Service Availability & Uptime SLA",
        metricValue: 99.99,
        targetThreshold: 99.9,
        comparisonOperator: "GTE",
        evidenceSource: "Datadog Monitors"
      },
      {
        controlId: "CC7.1",
        controlName: "Unpatched Critical Vulnerability Count",
        metricValue: 0,
        targetThreshold: 0,
        comparisonOperator: "LTE",
        evidenceSource: "Snyk / Prisma Cloud"
      }
    ];

    const certificate = VendorSoc2AttestationPipeline.generateAttestation(
      "vend_auth0_01",
      "Auth0 Identity Services",
      telemetry
    );

    expect(certificate.overallStatus).toBe("CERTIFIED");
    expect(certificate.compliancePercentage).toBe(100);
    expect(certificate.certificateHashSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(certificate.evaluations.every((e) => e.compliant)).toBe(true);
  });

  it("assigns CONDITIONAL status for partial compliance", () => {
    const telemetry: ControlTelemetry[] = [
      {
        controlId: "CC6.1",
        controlName: "MFA Enforcement",
        metricValue: 100,
        targetThreshold: 100,
        comparisonOperator: "EQ",
        evidenceSource: "Okta"
      },
      {
        controlId: "CC7.1",
        controlName: "Unpatched Critical CVEs",
        metricValue: 1, // Failing threshold of 0
        targetThreshold: 0,
        comparisonOperator: "LTE",
        evidenceSource: "Snyk"
      },
      {
        controlId: "A1.2",
        controlName: "Uptime",
        metricValue: 99.95,
        targetThreshold: 99.9,
        comparisonOperator: "GTE",
        evidenceSource: "Datadog"
      },
      {
        controlId: "C1.1",
        controlName: "TLS 1.3 Strict Transport Security",
        metricValue: 100,
        targetThreshold: 100,
        comparisonOperator: "EQ",
        evidenceSource: "Qualys SSL Labs"
      },
      {
        controlId: "CC8.1",
        controlName: "Automated Pull Request Branch Protection",
        metricValue: 100,
        targetThreshold: 100,
        comparisonOperator: "EQ",
        evidenceSource: "GitHub Audit"
      }
    ];

    const cert = VendorSoc2AttestationPipeline.generateAttestation("vend_stripe_02", "Stripe Inc", telemetry);
    expect(cert.overallStatus).toBe("CONDITIONAL");
    expect(cert.compliancePercentage).toBe(80);
    expect(cert.evaluations.find((e) => e.controlId === "CC7.1")?.compliant).toBe(false);
  });

  it("revokes status when compliance drops below 80%", () => {
    const telemetry: ControlTelemetry[] = [
      {
        controlId: "CC6.1",
        controlName: "MFA Enforcement",
        metricValue: 65, // Fail
        targetThreshold: 100,
        comparisonOperator: "EQ",
        evidenceSource: "Okta"
      },
      {
        controlId: "CC7.1",
        controlName: "Critical CVEs",
        metricValue: 4, // Fail
        targetThreshold: 0,
        comparisonOperator: "LTE",
        evidenceSource: "Snyk"
      }
    ];

    const cert = VendorSoc2AttestationPipeline.generateAttestation("vend_legacy_09", "Legacy Co", telemetry);
    expect(cert.overallStatus).toBe("REVOKED");
    expect(cert.compliancePercentage).toBe(0);
  });
});
