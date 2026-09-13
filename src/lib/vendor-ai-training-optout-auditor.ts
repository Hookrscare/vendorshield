/**
 * src/lib/vendor-ai-training-optout-auditor.ts
 * QA-172: Enterprise Vendor AI Model Training Opt-Out & Zero Data Retention (ZDR) Auditor.
 * 
 * Part of VendorShield B2B Enterprise Compliance & Trust Hub.
 * Validates contractual zero-data-retention (ZDR) policies, customer prompt IP leakage prevention,
 * and model training opt-outs across third-party generative AI and LLM sub-processors under SOC 2 CC6.1
 * and EU AI Act Article 53 compliance frameworks.
 */

import { createHash } from 'crypto';

export type AiModelProvider = 
  | 'OPENAI'
  | 'ANTHROPIC'
  | 'AWS_BEDROCK'
  | 'AZURE_OPENAI'
  | 'GOOGLE_VERTEX'
  | 'CUSTOM_SELF_HOSTED'
  | 'UNVERIFIED_THIRD_PARTY';

export interface VendorAiPolicyConfig {
  vendorId: string;
  vendorName: string;
  provider: AiModelProvider;
  zeroDataRetentionEnforced: boolean;
  modelTrainingOptOutEnforced: boolean;
  contractualDpaAddendumActive: boolean;
  dpaAddendumExpirationDate: string; // ISO date string (YYYY-MM-DD)
  telemetryLoggingExcluded: boolean;
  tlsVersion: 'TLS_1_3' | 'TLS_1_2' | 'TLS_1_1' | 'INSECURE';
  verifiedHeaderEnforcement: boolean;
}

export interface VendorAiAuditResult {
  vendorId: string;
  vendorName: string;
  provider: AiModelProvider;
  complianceScore: number; // 0 - 100
  isCompliant: boolean;
  riskTier: 'NEGLIGIBLE_RISK' | 'ELEVATED_RISK' | 'CRITICAL_IP_LEAK_RISK';
  auditFindings: string[];
  recommendations: string[];
  auditProofTokenSha256: string;
}

export interface PortfolioAiComplianceReport {
  totalAudited: number;
  fullyCompliantCount: number;
  criticalRiskCount: number;
  meanComplianceScore: number;
  overallPortfolioStatus: 'PASS' | 'CONDITIONAL_APPROVAL' | 'FAIL_NON_COMPLIANT';
  vendorAudits: VendorAiAuditResult[];
  auditTimestamp: string;
}

export class VendorAiTrainingOptOutAuditor {
  /**
   * Evaluates an individual AI sub-processor against enterprise zero-data-retention
   * and training opt-out compliance requirements.
   */
  public auditVendorAiPolicy(config: VendorAiPolicyConfig, currentDateIso?: string): VendorAiAuditResult {
    const findings: string[] = [];
    const recommendations: string[] = [];
    let score = 100;

    const today = currentDateIso ? new Date(currentDateIso) : new Date();

    // 1. Zero Data Retention (ZDR) check (Weight: 30 pts)
    if (!config.zeroDataRetentionEnforced) {
      score -= 30;
      findings.push('CRITICAL: Vendor retains customer prompts and completion embeddings on disk.');
      recommendations.push('Execute enterprise zero-data-retention (ZDR) agreement with AI vendor.');
    }

    // 2. Explicit Model Training Opt-Out (Weight: 30 pts)
    if (!config.modelTrainingOptOutEnforced) {
      score -= 30;
      findings.push('CRITICAL: Customer data is eligible for foundation model training/fine-tuning.');
      recommendations.push('Mandate contractual model training opt-out verification under SOC 2 CC6.1.');
    }

    // 3. Contractual DPA Addendum & Expiration (Weight: 15 pts)
    if (!config.contractualDpaAddendumActive) {
      score -= 15;
      findings.push('WARNING: No active Data Processing Addendum (DPA) AI rider on file.');
      recommendations.push('Countersign updated GenAI DPA rider prior to production traffic.');
    } else {
      const expDate = new Date(config.dpaAddendumExpirationDate);
      if (expDate.getTime() < today.getTime()) {
        score -= 15;
        findings.push(`WARNING: DPA AI addendum expired on ${config.dpaAddendumExpirationDate}.`);
        recommendations.push('Renew expired DPA AI addendum immediately.');
      } else {
        const daysToExpiry = (expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
        if (daysToExpiry < 30) {
          findings.push(`NOTICE: DPA AI addendum expires in ${Math.ceil(daysToExpiry)} days.`);
        }
      }
    }

    // 4. Telemetry Logging Exclusion (Weight: 10 pts)
    if (!config.telemetryLoggingExcluded) {
      score -= 10;
      findings.push('WARNING: Telemetry logging includes customer prompt snippets.');
      recommendations.push('Configure vendor API to scrub prompt bodies from cloud observability traces.');
    }

    // 5. Header Enforcement (Weight: 10 pts)
    if (!config.verifiedHeaderEnforcement) {
      score -= 10;
      findings.push('WARNING: Automated client request headers (e.g. opt-out headers) not verified.');
      recommendations.push('Inject and verify programmatic opt-out request headers at API gateway.');
    }

    // 6. TLS Security (Weight: 5 pts)
    if (config.tlsVersion === 'TLS_1_1' || config.tlsVersion === 'INSECURE') {
      score -= 15;
      findings.push(`CRITICAL: Insecure TLS version (${config.tlsVersion}) in transit.`);
      recommendations.push('Enforce minimum TLS 1.2 or TLS 1.3 encryption on AI inference endpoints.');
    }

    score = Math.max(0, Math.min(100, score));

    // Risk tier classification
    let riskTier: 'NEGLIGIBLE_RISK' | 'ELEVATED_RISK' | 'CRITICAL_IP_LEAK_RISK';
    if (score >= 85 && config.zeroDataRetentionEnforced && config.modelTrainingOptOutEnforced) {
      riskTier = 'NEGLIGIBLE_RISK';
    } else if (score >= 60 && (config.zeroDataRetentionEnforced || config.modelTrainingOptOutEnforced)) {
      riskTier = 'ELEVATED_RISK';
    } else {
      riskTier = 'CRITICAL_IP_LEAK_RISK';
    }

    const isCompliant = score >= 80 && config.zeroDataRetentionEnforced && config.modelTrainingOptOutEnforced && config.contractualDpaAddendumActive;

    const payload = `${config.vendorId}:${config.provider}:${score}:${riskTier}:${today.toISOString()}`;
    const auditProofTokenSha256 = createHash('sha256').update(payload).digest('hex');

    return {
      vendorId: config.vendorId,
      vendorName: config.vendorName,
      provider: config.provider,
      complianceScore: score,
      isCompliant,
      riskTier,
      auditFindings: findings,
      recommendations,
      auditProofTokenSha256,
    };
  }

  /**
   * Audits an entire portfolio of vendor AI sub-processors and produces an executive summary.
   */
  public evaluatePortfolioCompliance(
    vendors: VendorAiPolicyConfig[],
    currentDateIso?: string
  ): PortfolioAiComplianceReport {
    const audits = vendors.map(v => this.auditVendorAiPolicy(v, currentDateIso));
    const total = audits.length;
    const compliant = audits.filter(a => a.isCompliant).length;
    const critical = audits.filter(a => a.riskTier === 'CRITICAL_IP_LEAK_RISK').length;

    const meanScore = total > 0 
      ? Math.round(audits.reduce((acc, a) => acc + a.complianceScore, 0) / total) 
      : 100;

    let overallStatus: 'PASS' | 'CONDITIONAL_APPROVAL' | 'FAIL_NON_COMPLIANT';
    if (critical === 0 && compliant === total) {
      overallStatus = 'PASS';
    } else if (critical === 0 && meanScore >= 75) {
      overallStatus = 'CONDITIONAL_APPROVAL';
    } else {
      overallStatus = 'FAIL_NON_COMPLIANT';
    }

    return {
      totalAudited: total,
      fullyCompliantCount: compliant,
      criticalRiskCount: critical,
      meanComplianceScore: meanScore,
      overallPortfolioStatus: overallStatus,
      vendorAudits: audits,
      auditTimestamp: (currentDateIso ? new Date(currentDateIso) : new Date()).toISOString(),
    };
  }
}
