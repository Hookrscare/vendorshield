import { describe, it, expect } from "vitest";
import {
  MultiCloudKmsCustodyVerifier,
  HsmCustodyRecord,
  HardwareAttestationDocument,
  ZeroKnowledgeCustodyProof,
  CustodyOfficerSignoff
} from "./kms-hsm-custody-verifier";

describe("QA-154: MultiCloudKmsCustodyVerifier", () => {
  const verifier = new MultiCloudKmsCustodyVerifier();
  const futureIso = new Date(Date.now() + 86400000 * 30).toISOString();
  const nowSeconds = Math.floor(Date.now() / 1000);

  const mockAttestationDoc: HardwareAttestationDocument = {
    provider: "AWS_KMS",
    hsmModuleId: "hsm-nitro-us-east-1a-098",
    firmwareVersion: "nitro-fw-2026.04.1",
    fipsLevel: "FIPS_140_3_L3",
    pcrValues: {
      PCR0: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      PCR1: "ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb",
      PCR2: "3e23e8160039594a33894f6564e1b1348bbd7a0088d42c4acb73eee793566165"
    },
    rootCaThumbprintSha256: "aws-nitro-enclaves-root-ca-sha256-standard",
    signatureHex: "abcdef0123456789abcdef0123456789abcdef0123456789",
    issuedAtIso: new Date(Date.now() - 86400000).toISOString(),
    expiresAtIso: futureIso
  };

  const mockZkProof: ZeroKnowledgeCustodyProof = {
    proofType: "SCHNORR_POK",
    keyCommitmentHash: "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
    subprocessorId: "subproc-vector-db-cloud",
    epochTimestamp: nowSeconds,
    hsmNonce: "random-cryptographic-nonce-entropy-998822",
    proofPayload: {
      a: "point-a-curve25519-coordinate-hex",
      z: "scalar-response-z-zkp-valid"
    }
  };

  const mockSignoffs: CustodyOfficerSignoff[] = [
    {
      officerId: "officer-alice-ciso",
      role: "CISO",
      publicKeyFingerprint: "fp-ciso-99812",
      signedAtIso: new Date().toISOString(),
      signatureSha256: "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945"
    },
    {
      officerId: "officer-bob-crypto",
      role: "CRYPTO_OFFICER",
      publicKeyFingerprint: "fp-crypto-44211",
      signedAtIso: new Date().toISOString(),
      signatureSha256: "7d793037a0760186574b0282f2f435e70ec0150c005ba6786497f54006793f71"
    }
  ];

  it("should verify compliant AWS KMS Nitro enclave key custody record with 100% score", () => {
    const record: HsmCustodyRecord = {
      keyId: "arn:aws:kms:us-east-1:112233445566:key/mrk-99182a",
      provider: "AWS_KMS",
      subprocessorName: "VectorStore AI Inc",
      attestationDoc: mockAttestationDoc,
      zkpProof: mockZkProof,
      quorumSignoffs: mockSignoffs,
      requiredQuorumThreshold: 2
    };

    const result = verifier.auditCustodyRecords([record]);

    expect(result.verified).toBe(true);
    expect(result.score).toBe(100);
    expect(result.custodyTier).toBe("CERTIFIED_SOVEREIGN");
    expect(result.manifest.hardwareRootsVerified).toBe(true);
    expect(result.manifest.zkpCryptographicGuaranteesMet).toBe(true);
    expect(result.manifest.quorumThresholdsSatisfied).toBe(true);
    expect(result.manifest.tamperEvidentDigestSha256).toBeDefined();
  });

  it("should detect and fail expired hardware attestation documents", () => {
    const expiredRecord: HsmCustodyRecord = {
      keyId: "arn:aws:kms:us-east-1:112233445566:key/mrk-expired",
      provider: "AWS_KMS",
      subprocessorName: "Legacy Storage Corp",
      attestationDoc: {
        ...mockAttestationDoc,
        expiresAtIso: new Date(Date.now() - 3600000).toISOString()
      },
      zkpProof: mockZkProof,
      quorumSignoffs: mockSignoffs,
      requiredQuorumThreshold: 2
    };

    const result = verifier.auditCustodyRecords([expiredRecord]);

    expect(result.verified).toBe(false);
    expect(result.score).toBe(0);
    expect(result.custodyTier).toBe("FAILED");
    expect(result.findings.some(f => f.includes("expired"))).toBe(true);
  });

  it("should detect replayed or outdated zero-knowledge custody proofs", () => {
    const replayedRecord: HsmCustodyRecord = {
      keyId: "projects/my-proj/locations/global/keyRings/ring/cryptoKeys/key-replay",
      provider: "GCP_CLOUD_KMS",
      subprocessorName: "Model Inference LLC",
      attestationDoc: {
        ...mockAttestationDoc,
        provider: "GCP_CLOUD_KMS",
        rootCaThumbprintSha256: "google-cloud-hsm-root-ca-cavp-certified"
      },
      zkpProof: {
        ...mockZkProof,
        epochTimestamp: nowSeconds - 7200 // 2 hours old, max allowed is 1 hour
      },
      quorumSignoffs: mockSignoffs,
      requiredQuorumThreshold: 2
    };

    const result = verifier.auditCustodyRecords([replayedRecord]);

    expect(result.verified).toBe(false);
    expect(result.findings.some(f => f.includes("ZK Proof expired or replayed"))).toBe(true);
  });

  it("should fail when dual-custody officer threshold or role requirements are violated", () => {
    const insufficientQuorumRecord: HsmCustodyRecord = {
      keyId: "azure-managed-hsm/keys/custody-key-1",
      provider: "AZURE_KEY_VAULT",
      subprocessorName: "Cloud CRM Platform",
      attestationDoc: {
        ...mockAttestationDoc,
        provider: "AZURE_KEY_VAULT",
        rootCaThumbprintSha256: "azure-managed-hsm-security-domain-ca"
      },
      zkpProof: mockZkProof,
      quorumSignoffs: [
        {
          officerId: "dev-dan",
          role: "DEVSECOPS_LEAD", // Missing CISO or CRYPTO_OFFICER
          publicKeyFingerprint: "fp-dev-dan",
          signedAtIso: new Date().toISOString(),
          signatureSha256: "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890"
        }
      ],
      requiredQuorumThreshold: 2
    };

    const result = verifier.auditCustodyRecords([insufficientQuorumRecord]);

    expect(result.verified).toBe(false);
    expect(result.findings.some(f => f.includes("Quorum threshold not met"))).toBe(true);
  });
});
