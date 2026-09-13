import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import {
  AiModelProvenanceSignatureVerifier,
  AiModelArtifactTelemetry
} from './ai-model-provenance-signature-verifier';

describe('QA-191: AI Supply Chain Model Provenance Verifier', () => {
  const dummyWeights = Buffer.from('safetensors_binary_header_tensor_data_12345');
  const validSha256 = crypto.createHash('sha256').update(dummyWeights).digest('hex');

  it('approves cryptographically signed SafeTensors model artifact', () => {
    const artifact: AiModelArtifactTelemetry = {
      modelId: 'mistral-7b-instruct-v0.3',
      vendorName: 'Mistral AI',
      artifactFileName: 'model.safetensors',
      format: 'safetensors',
      fileContent: dummyWeights,
      expectedSha256: validSha256,
      cosignSignaturePresent: true,
      publisherIdentityVerified: true
    };

    const res = AiModelProvenanceSignatureVerifier.verifyModelArtifact(artifact);

    expect(res.isApproved).toBe(true);
    expect(res.complianceStatus).toBe('MODEL_PROVENANCE_CRYPTOGRAPHICALLY_VERIFIED');
    expect(res.riskRating).toBe('LOW');
  });

  it('rejects dangerous Python pickle format with critical rating', () => {
    const artifact: AiModelArtifactTelemetry = {
      modelId: 'legacy-bert-ner',
      vendorName: 'LegacyNLP Corp',
      artifactFileName: 'pytorch_model.bin',
      format: 'pickle_bin',
      fileContent: dummyWeights,
      expectedSha256: validSha256,
      cosignSignaturePresent: true,
      publisherIdentityVerified: true
    };

    const res = AiModelProvenanceSignatureVerifier.verifyModelArtifact(artifact);

    expect(res.isApproved).toBe(false);
    expect(res.complianceStatus).toBe('INSECURE_PICKLE_FORMAT_REJECTED');
    expect(res.riskRating).toBe('CRITICAL');
  });

  it('detects tampered model weights with SHA-256 mismatch', () => {
    const artifact: AiModelArtifactTelemetry = {
      modelId: 'llama-3-8b',
      vendorName: 'Meta AI',
      artifactFileName: 'consolidated.00.safetensors',
      format: 'safetensors',
      fileContent: dummyWeights,
      expectedSha256: 'deadbeef1234567890abcdefdeadbeef1234567890abcdefdeadbeef12345678', // Incorrect hash
      cosignSignaturePresent: true,
      publisherIdentityVerified: true
    };

    const res = AiModelProvenanceSignatureVerifier.verifyModelArtifact(artifact);

    expect(res.isApproved).toBe(false);
    expect(res.complianceStatus).toBe('COMPROMISED_CHECKSUM_MISMATCH');
    expect(res.riskRating).toBe('CRITICAL');
  });
});
