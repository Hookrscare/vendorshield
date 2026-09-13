import { describe, it, expect } from "vitest";
import {
  FedRampHighBaselineArtifactGenerator,
  FedRampControlImplementation
} from "./fedramp-high-baseline-artifact-generator";

describe("FedRampHighBaselineArtifactGenerator", () => {
  it("validates 100% compliant FedRAMP High baseline configuration", () => {
    const controls: FedRampControlImplementation[] = [
      {
        controlId: "AC-2",
        family: "Access Control",
        status: "IMPLEMENTED",
        implementationSummary: "Automated account management with IdP SCIM integration and hardware MFA.",
        responsibleRole: "SecOps Lead",
        fipsValidated: true,
        hardwareMfaEnforced: true
      },
      {
        controlId: "IA-2",
        family: "Identification and Authentication",
        status: "IMPLEMENTED",
        implementationSummary: "FIDO2 / WebAuthn phishing-resistant hardware tokens mandatory.",
        responsibleRole: "Identity Architect",
        fipsValidated: true,
        hardwareMfaEnforced: true
      },
      {
        controlId: "SC-13",
        family: "System and Communications Protection",
        status: "IMPLEMENTED",
        implementationSummary: "FIPS 140-3 validated cryptographic modules for all TLS 1.3 and envelope encryption.",
        responsibleRole: "Infra Lead",
        fipsValidated: true,
        hardwareMfaEnforced: true
      },
      {
        controlId: "CA-7",
        family: "Security Assessment and Authorization",
        status: "IMPLEMENTED",
        implementationSummary: "Continuous automated posture monitoring with hourly telemetry attestation.",
        responsibleRole: "Compliance Officer",
        fipsValidated: true,
        hardwareMfaEnforced: true
      }
    ];

    const result = FedRampHighBaselineArtifactGenerator.evaluateHighBaseline("GovCloud-Core", controls);

    expect(result.highReadinessScorePct).toBe(100.0);
    expect(result.isReadyFor3PaoAudit).toBe(true);
    expect(result.criticalDeficiencies).toHaveLength(0);
    expect(result.oscalSspPackageDigest).toHaveLength(64);
  });

  it("flags missing FIPS validation and non-hardware MFA deficiencies", () => {
    const controls: FedRampControlImplementation[] = [
      {
        controlId: "SC-13",
        family: "System and Communications Protection",
        status: "IMPLEMENTED",
        implementationSummary: "Standard open-source crypto without FIPS 140-3 cert.",
        responsibleRole: "Dev",
        fipsValidated: false, // Deficiency!
        hardwareMfaEnforced: false
      },
      {
        controlId: "IA-2",
        family: "Identification and Authentication",
        status: "PARTIALLY_IMPLEMENTED", // Deficiency!
        implementationSummary: "SMS OTP auth in use.",
        responsibleRole: "Dev",
        fipsValidated: false,
        hardwareMfaEnforced: false // Deficiency!
      }
    ];

    const result = FedRampHighBaselineArtifactGenerator.evaluateHighBaseline("GovCloud-Deficient", controls);

    expect(result.isReadyFor3PaoAudit).toBe(false);
    expect(result.criticalDeficiencies.length).toBeGreaterThanOrEqual(3);
  });

  it("throws error on missing system name or empty controls", () => {
    expect(() => {
      FedRampHighBaselineArtifactGenerator.evaluateHighBaseline("", []);
    }).toThrow();
  });
});
