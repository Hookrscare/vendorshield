/**
 * src/lib/nis2-supply-chain-risk-assessor.ts
 * QA-150: Automated EU NIS2 Directive Critical Entity Supply Chain Cybersecurity Risk Assessor.
 * Part of VendorShield B2B SOC 2 & EU Cybersecurity Trust Hub.
 *
 * Implements European Union Directive (EU) 2022/2555 (NIS2 Directive) Article 21:
 * - Evaluates direct supplier cybersecurity posture for Essential Entities (EE) and Important Entities (IE).
 * - Audits the 10 mandatory technical, operational, and organizational risk management measures.
 * - Enforces 24-hour incident early warning SLA, vulnerability disclosure, and MFA/cryptography controls.
 * - Computes potential regulatory fine exposure (€10M / 2% global turnover).
 * - Emits cryptographic NIS2 Article 21 compliance attestation tokens.
 */

import { createHash } from 'crypto';

export type NIS2EntityCategory = 'ESSENTIAL_ENTITY' | 'IMPORTANT_ENTITY';

export interface NIS2SupplierPosture {
  vendorId: string;
  vendorName: string;
  annualTurnoverEur: number;
  entityCategory: NIS2EntityCategory;
  sector: 'ENERGY' | 'TRANSPORT' | 'BANKING' | 'HEALTH' | 'DIGITAL_INFRASTRUCTURE' | 'ICT_SERVICE_MANAGEMENT_B2B' | 'DIGITAL_PROVIDER';
  
  // Mandatory Article 21(2) Measures
  hasRiskAnalysisPolicy: boolean;
  hasIncidentHandling24hSla: boolean; // Early warning notification within 24h
  hasBusinessContinuityDrPlan: boolean;
  hasCoordinatedVulnerabilityDisclosure: boolean; // ISO/IEC 29147 CVD
  hasCyberHygieneAndTraining: boolean;
  hasEncryptionAndPki: boolean; // TLS 1.3 / AES-256
  hasAccessControlAndAssetManagement: boolean;
  hasPhishingResistantMfa: boolean;
  hasSecuredVoiceVideoComms: boolean;
}

export interface NIS2AssessmentReport {
  vendorId: string;
  vendorName: string;
  entityCategory: NIS2EntityCategory;
  complianceScore: number; // 0 - 100
  isCompliant: boolean;
  maxRegulatoryFineEur: number;
  executiveLiabilityWarning: boolean;
  deficientArticles: string[];
  attestationToken: string;
}

export class NIS2SupplyChainRiskAssessor {
  /**
   * Assesses a vendor under EU NIS2 Directive Article 21 minimum baseline requirements.
   */
  public assessVendor(posture: NIS2SupplierPosture): NIS2AssessmentReport {
    const deficientArticles: string[] = [];
    let score = 0;

    // Article 21(2)(a): Risk analysis policies
    if (posture.hasRiskAnalysisPolicy) {
      score += 10;
    } else {
      deficientArticles.push('Article 21(2)(a): Missing cybersecurity risk analysis policies');
    }

    // Article 21(2)(b): Incident handling & 24h early warning
    if (posture.hasIncidentHandling24hSla) {
      score += 15;
    } else {
      deficientArticles.push('Article 21(2)(b): Missing 24-hour incident early warning capability');
    }

    // Article 21(2)(c): Business continuity & DR
    if (posture.hasBusinessContinuityDrPlan) {
      score += 10;
    } else {
      deficientArticles.push('Article 21(2)(c): Inadequate business continuity and disaster recovery plan');
    }

    // Article 21(2)(d): Supply chain security & CVD
    if (posture.hasCoordinatedVulnerabilityDisclosure) {
      score += 15;
    } else {
      deficientArticles.push('Article 21(2)(d): Lack of coordinated vulnerability disclosure policy');
    }

    // Article 21(2)(e): Cyber hygiene & training
    if (posture.hasCyberHygieneAndTraining) {
      score += 10;
    } else {
      deficientArticles.push('Article 21(2)(e): Inadequate employee cyber hygiene training');
    }

    // Article 21(2)(f): Encryption & PKI
    if (posture.hasEncryptionAndPki) {
      score += 10;
    } else {
      deficientArticles.push('Article 21(2)(f): Absence of robust cryptographic and encryption policies');
    }

    // Article 21(2)(g): Access control & asset management
    if (posture.hasAccessControlAndAssetManagement) {
      score += 10;
    } else {
      deficientArticles.push('Article 21(2)(g): Weak access control policies or unmapped asset management');
    }

    // Article 21(2)(h): Multi-factor authentication
    if (posture.hasPhishingResistantMfa) {
      score += 15;
    } else {
      deficientArticles.push('Article 21(2)(h): Missing phishing-resistant multi-factor authentication');
    }

    // Article 21(2)(i): Secured communications
    if (posture.hasSecuredVoiceVideoComms) {
      score += 5;
    } else {
      deficientArticles.push('Article 21(2)(i): Unencrypted voice or emergency communication channels');
    }

    // Penalty exposure under Article 34
    // Essential: Max €10M or 2% of annual turnover, whichever is higher
    // Important: Max €7M or 1.4% of annual turnover, whichever is higher
    let maxFineEur = 0;
    if (posture.entityCategory === 'ESSENTIAL_ENTITY') {
      maxFineEur = Math.max(10_000_000, posture.annualTurnoverEur * 0.02);
    } else {
      maxFineEur = Math.max(7_000_000, posture.annualTurnoverEur * 0.014);
    }

    const isCompliant = score >= 85 && deficientArticles.length === 0;
    const executiveLiability = !isCompliant && (posture.entityCategory === 'ESSENTIAL_ENTITY');

    const payload = `${posture.vendorId}:${score}:${isCompliant}:${maxFineEur}:${deficientArticles.length}`;
    const hash = createHash('sha256').update(payload).digest('hex').substring(0, 16).toUpperCase();

    return {
      vendorId: posture.vendorId,
      vendorName: posture.vendorName,
      entityCategory: posture.entityCategory,
      complianceScore: score,
      isCompliant,
      maxRegulatoryFineEur: Math.round(maxFineEur),
      executiveLiabilityWarning: executiveLiability,
      deficientArticles,
      attestationToken: `NIS2-ART21-${hash}`
    };
  }
}
