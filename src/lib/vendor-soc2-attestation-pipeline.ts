/**
 * QA-150: Automated Vendor SOC 2 Trust Services Criteria Continuous Attestation Pipeline.
 * Part of VendorShield B2B SOC 2 & GDPR Sub-Processor Trust Hub.
 *
 * Ingests live operational telemetry feeds across Security (CC), Availability (A),
 * Confidentiality (C), and Privacy (P) controls.
 * Validates against AICPA Trust Services Criteria (2017/2022 revised criteria)
 * and generates cryptographically verifiable continuous compliance certificates.
 */

import { createHash } from "crypto";

export interface ControlTelemetry {
  controlId: string; // e.g. "CC6.1", "CC6.6", "A1.2", "C1.1"
  controlName: string;
  metricValue: number; // e.g. 100 (% MFA), 99.98 (% uptime), 0 (critical unpatched CVEs)
  targetThreshold: number;
  comparisonOperator: "GTE" | "LTE" | "EQ";
  evidenceSource: string;
}

export interface AttestationEvaluation {
  controlId: string;
  controlName: string;
  compliant: boolean;
  score: number;
  reason: string;
}

export interface AttestationCertificate {
  vendorId: string;
  vendorName: string;
  attestationTimestamp: string;
  overallStatus: "CERTIFIED" | "CONDITIONAL" | "REVOKED";
  compliancePercentage: number;
  evaluations: AttestationEvaluation[];
  certificateHashSha256: string;
}

export class VendorSoc2AttestationPipeline {
  /**
   * Evaluates individual control telemetry against criteria.
   */
  public static evaluateControl(telemetry: ControlTelemetry): AttestationEvaluation {
    let compliant = false;

    switch (telemetry.comparisonOperator) {
      case "GTE":
        compliant = telemetry.metricValue >= telemetry.targetThreshold;
        break;
      case "LTE":
        compliant = telemetry.metricValue <= telemetry.targetThreshold;
        break;
      case "EQ":
        compliant = telemetry.metricValue === telemetry.targetThreshold;
        break;
    }

    const score = compliant ? 100 : Math.max(0, 100 - Math.abs(telemetry.metricValue - telemetry.targetThreshold) * 10);
    const reason = compliant
      ? `Control ${telemetry.controlId} satisfied: metric ${telemetry.metricValue} meets ${telemetry.comparisonOperator} ${telemetry.targetThreshold}`
      : `Non-compliance in ${telemetry.controlId}: metric ${telemetry.metricValue} failed ${telemetry.comparisonOperator} ${telemetry.targetThreshold} (${telemetry.evidenceSource})`;

    return {
      controlId: telemetry.controlId,
      controlName: telemetry.controlName,
      compliant,
      score,
      reason
    };
  }

  /**
   * Evaluates entire telemetry suite and mints attestation certificate.
   */
  public static generateAttestation(
    vendorId: string,
    vendorName: string,
    telemetryStream: ControlTelemetry[]
  ): AttestationCertificate {
    const evaluations = telemetryStream.map((t) => this.evaluateControl(t));
    const passedCount = evaluations.filter((e) => e.compliant).length;
    const compliancePercentage = telemetryStream.length > 0
      ? (passedCount / telemetryStream.length) * 100
      : 0;

    let overallStatus: "CERTIFIED" | "CONDITIONAL" | "REVOKED" = "REVOKED";
    if (compliancePercentage === 100) {
      overallStatus = "CERTIFIED";
    } else if (compliancePercentage >= 80) {
      overallStatus = "CONDITIONAL";
    }

    const timestamp = new Date().toISOString();
    const digestPayload = JSON.stringify({
      vendorId,
      vendorName,
      timestamp,
      compliancePercentage,
      evaluations
    });

    const certificateHashSha256 = createHash("sha256").update(digestPayload).digest("hex");

    return {
      vendorId,
      vendorName,
      attestationTimestamp: timestamp,
      overallStatus,
      compliancePercentage: Math.round(compliancePercentage * 10) / 10,
      evaluations,
      certificateHashSha256
    };
  }
}
