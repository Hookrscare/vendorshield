/**
 * QA-165: Regression tests for MultiCloudKmsHsmRotationPipeline.
 * Part of VendorShield B2B SOC 2 & GDPR Sub-Processor Trust Hub.
 */

import { describe, it, expect } from "vitest";
import {
  MultiCloudKmsHsmRotationPipeline,
  HsmClusterNode,
  KeyRotationTarget,
  QuorumOfficerSignature,
} from "./multi-cloud-kms-hsm-rotation-pipeline";

describe("QA-165: MultiCloudKmsHsmRotationPipeline", () => {
  const sampleNodes: HsmClusterNode[] = [
    {
      nodeId: "node-aws-east",
      provider: "AWS",
      region: "us-east-1",
      hsmSerial: "HSM-AWS-9901-L3",
      complianceLevel: "FIPS_140_3_L3",
      firmwareVersion: "3.4.1",
      isOnline: true,
    },
    {
      nodeId: "node-gcp-central",
      provider: "GCP",
      region: "us-central1",
      hsmSerial: "HSM-GCP-8802-L3",
      complianceLevel: "FIPS_140_3_L3",
      firmwareVersion: "2.1.0",
      isOnline: true,
    },
    {
      nodeId: "node-azure-eu",
      provider: "AZURE",
      region: "westeurope",
      hsmSerial: "HSM-AZ-7703-L2",
      complianceLevel: "FIPS_140_2_L3",
      firmwareVersion: "1.9.4",
      isOnline: false,
    },
  ];

  it("evaluates officer quorum correctly and rejects when deficit exists", () => {
    const pipeline = new MultiCloudKmsHsmRotationPipeline(sampleNodes, 2);

    const insufficientSigs: QuorumOfficerSignature[] = [
      {
        officerId: "ciso-01",
        officerRole: "CISO",
        signatureHex: "abcdef1234567890abcdef1234567890",
        timestamp: Date.now(),
      },
    ];

    const target: KeyRotationTarget = {
      keyAlias: "db-field-encryption-master-key",
      currentVersion: 3,
      algorithm: "AES-256-GCM",
      primaryRegion: "us-east-1",
      replicaRegions: ["us-central1"],
      totalDeksToRewrap: 120,
    };

    const result = pipeline.executeKeyRotation(target, insufficientSigs);
    expect(result.status).toBe("FAILED_QUORUM_DEFICIT");
    expect(result.quorumAchieved).toBe(false);
    expect(result.newVersion).toBe(3);
  });

  it("successfully executes rotation, replicates across regions, and emits audit certificate", () => {
    const pipeline = new MultiCloudKmsHsmRotationPipeline(sampleNodes, 2);

    const validSigs: QuorumOfficerSignature[] = [
      {
        officerId: "ciso-01",
        officerRole: "CISO",
        signatureHex: "abcdef1234567890abcdef1234567890",
        timestamp: Date.now(),
      },
      {
        officerId: "sec-ops-02",
        officerRole: "SEC_OPS_LEAD",
        signatureHex: "fedcba0987654321fedcba0987654321",
        timestamp: Date.now(),
      },
    ];

    const target: KeyRotationTarget = {
      keyAlias: "db-field-encryption-master-key",
      currentVersion: 3,
      algorithm: "AES-256-GCM",
      primaryRegion: "us-east-1",
      replicaRegions: ["us-central1", "westeurope"],
      totalDeksToRewrap: 250,
    };

    const result = pipeline.executeKeyRotation(target, validSigs);
    expect(result.status).toBe("SUCCESS");
    expect(result.quorumAchieved).toBe(true);
    expect(result.oldVersion).toBe(3);
    expect(result.newVersion).toBe(4);
    expect(result.reWrappedDekCount).toBe(250);
    expect(result.replicatedRegions).toContain("us-central1");
    // westeurope is offline, should not be included
    expect(result.replicatedRegions).not.toContain("westeurope");
    expect(result.auditCertificateHash).toHaveLength(64);
  });

  it("correctly audits FIPS 140-3 L3 compliance levels", () => {
    const pipeline = new MultiCloudKmsHsmRotationPipeline(sampleNodes, 2);

    const awsCheck = pipeline.verifyHsmCompliance("node-aws-east");
    expect(awsCheck.compliant).toBe(true);
    expect(awsCheck.level).toBe("FIPS_140_3_L3");

    const azCheck = pipeline.verifyHsmCompliance("node-azure-eu");
    expect(azCheck.compliant).toBe(false); // FIPS_140_2_L3 is previous gen
  });
});
