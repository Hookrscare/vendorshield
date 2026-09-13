/**
 * QA-168: Enterprise Post-Quantum Cryptography (PQC) Migration Readiness Evaluator
 * 
 * Audits vendor and sub-processor cryptographic inventory against NIST FIPS 203 (ML-KEM)
 * and FIPS 204 (ML-DSA) standards to mitigate "Store Now, Decrypt Later" (SNDL) threats.
 */

export type AlgorithmQuantumClass =
  | 'QUANTUM_VULNERABLE'
  | 'QUANTUM_RESISTANT_SYMMETRIC'
  | 'HYBRID_TRANSITIONAL'
  | 'POST_QUANTUM_STANDARDIZED';

export interface CryptographicAssetInventory {
  assetId: string;
  subprocessorId: string;
  algorithmName: string;
  keyLengthBits: number;
  purpose: 'DATA_IN_TRANSIT_KEY_EXCHANGE' | 'DIGITAL_SIGNATURE_AUTH' | 'DATA_AT_REST_ENCRYPTION';
  dataClassification: 'PUBLIC' | 'CONFIDENTIAL' | 'HIGHLY_SENSITIVE_PII' | 'REGULATORY_RESTRICTED';
}

export interface PqcVendorReadinessAssessment {
  subprocessorId: string;
  totalAssetsAudited: number;
  quantumVulnerableCount: number;
  hybridCount: number;
  fullyPqcCount: number;
  readinessScore: number; // 0 to 100
  sndlExposureRisk: 'LOW' | 'MODERATE' | 'CRITICAL_HIGH';
  cnsa2ComplianceEligible: boolean;
  requiredRemediations: string[];
}

export class PqcMigrationReadinessEvaluator {
  private static readonly VULNERABLE_PREFIXES = ['RSA', 'ECDSA', 'ECDH', 'ED25519', 'SECP', 'DH'];
  private static readonly HYBRID_PATTERNS = ['KYBER', 'ML-KEM', 'X25519KYBER'];
  private static readonly STANDARDIZED_PQC = ['ML-KEM-768', 'ML-KEM-1024', 'ML-DSA-65', 'ML-DSA-87', 'SLH-DSA'];

  public classifyAlgorithm(algorithmName: string, keyLengthBits: number): AlgorithmQuantumClass {
    const upper = algorithmName.toUpperCase();

    for (const pqc of PqcMigrationReadinessEvaluator.STANDARDIZED_PQC) {
      if (upper === pqc) return 'POST_QUANTUM_STANDARDIZED';
    }

    if (upper.includes('KYBER') || upper.includes('ML-KEM') || upper.includes('DILITHIUM')) {
      return 'HYBRID_TRANSITIONAL';
    }

    if (upper.startsWith('AES') || upper.includes('CHACHA20')) {
      return keyLengthBits >= 256 ? 'QUANTUM_RESISTANT_SYMMETRIC' : 'QUANTUM_VULNERABLE';
    }

    for (const vuln of PqcMigrationReadinessEvaluator.VULNERABLE_PREFIXES) {
      if (upper.startsWith(vuln)) return 'QUANTUM_VULNERABLE';
    }

    return 'QUANTUM_VULNERABLE';
  }

  public evaluateSubprocessor(
    subprocessorId: string,
    assets: CryptographicAssetInventory[]
  ): PqcVendorReadinessAssessment {
    if (assets.length === 0) {
      throw new Error('Asset inventory cannot be empty for PQC evaluation.');
    }

    let vuln = 0;
    let hybrid = 0;
    let pqc = 0;
    let sensitiveSndlExposed = false;

    for (const a of assets) {
      const qClass = this.classifyAlgorithm(a.algorithmName, a.keyLengthBits);
      if (qClass === 'QUANTUM_VULNERABLE') {
        vuln++;
        if (a.dataClassification === 'HIGHLY_SENSITIVE_PII' || a.dataClassification === 'REGULATORY_RESTRICTED') {
          if (a.purpose === 'DATA_IN_TRANSIT_KEY_EXCHANGE') {
            sensitiveSndlExposed = true;
          }
        }
      } else if (qClass === 'HYBRID_TRANSITIONAL') {
        hybrid++;
      } else {
        pqc++;
      }
    }

    // Readiness score calculation: 100 * (pqc + 0.6 * hybrid) / total
    const weightedPoints = (pqc * 1.0) + (hybrid * 0.6);
    const score = Math.min(100, Math.round((weightedPoints / assets.length) * 100));

    let sndlRisk: 'LOW' | 'MODERATE' | 'CRITICAL_HIGH' = 'LOW';
    if (sensitiveSndlExposed) {
      sndlRisk = 'CRITICAL_HIGH';
    } else if (vuln > 0) {
      sndlRisk = 'MODERATE';
    }

    const cnsa2Eligible = score >= 80 && !sensitiveSndlExposed;
    const remediations: string[] = [];

    if (sensitiveSndlExposed) {
      remediations.push('URGENT: Deploy X25519Kyber768 or ML-KEM-768 for TLS 1.3 key exchange on sensitive PII transit routes.');
    }
    if (vuln > 0) {
      remediations.push('Transition remaining RSA/ECDSA signing certs to NIST FIPS 204 ML-DSA before 2030 CNSA 2.0 deadline.');
    }
    if (remediations.length === 0) {
      remediations.push('Maintain continuous cryptographic agility and monitor quantum cryptanalysis research.');
    }

    return {
      subprocessorId,
      totalAssetsAudited: assets.length,
      quantumVulnerableCount: vuln,
      hybridCount: hybrid,
      fullyPqcCount: pqc,
      readinessScore: score,
      sndlExposureRisk: sndlRisk,
      cnsa2ComplianceEligible: cnsa2Eligible,
      requiredRemediations: remediations,
    };
  }
}
