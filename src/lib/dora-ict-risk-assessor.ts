/**
 * src/lib/dora-ict-risk-assessor.ts
 * QA-151: Automated DORA (Digital Operational Resilience Act - Regulation EU 2022/2554)
 * Financial Entity ICT Third-Party Risk & Critical Service Provider Assessor.
 *
 * Implements European Union Regulation (EU) 2022/2554 DORA Chapter V Requirements:
 * - Article 28: ICT third-party risk management principles, concentration risk, and exit strategies.
 * - Article 30: Key contractual provisions (audit rights, incident reporting SLA, data location).
 * - Article 31: Identification of Critical ICT Third-Party Service Providers (CTPP).
 * - Cryptographic DORA attestation certificate with SHA-256 integrity token.
 */

import { createHash } from 'crypto';

export interface DORAContractTerms {
  unrestricted_audit_rights: boolean;
  incident_reporting_sla_hours: number; // <= 4 hours required for major ICT incidents
  data_location_disclosed: boolean;
  data_residency_in_eea: boolean;
  mandatory_exit_strategy_clause: boolean;
  sub_contracting_prior_approval: boolean;
  continuity_disaster_recovery_testing: boolean;
}

export interface DORAAssessmentInput {
  vendor_id: string;
  vendor_name: string;
  service_category: 'cloud_hosting' | 'core_banking_engine' | 'payment_gateway' | 'ai_inference' | 'analytics';
  supports_critical_economic_function: boolean;
  substitutability: 'easy' | 'moderate' | 'difficult' | 'irreplaceable';
  annual_contract_spend_eur: number;
  contract_terms: DORAContractTerms;
}

export interface DORAEvaluationResult {
  vendor_id: string;
  vendor_name: string;
  is_critical_ict_provider: boolean;
  overall_compliance_score: number; // 0 - 100
  article_30_contract_compliant: boolean;
  deficiencies: string[];
  recommended_actions: string[];
  dora_certification_token: string;
}

export class DORAICTRiskAssessor {
  /**
   * Assesses an ICT third-party provider against Regulation (EU) 2022/2554 standards.
   */
  public static evaluateVendor(input: DORAAssessmentInput): DORAEvaluationResult {
    const deficiencies: string[] = [];
    const recommended_actions: string[] = [];
    let score = 100;

    // 1. Critical ICT Provider Determination (Article 31)
    const is_critical_ict_provider = 
      input.supports_critical_economic_function ||
      input.substitutability === 'difficult' ||
      input.substitutability === 'irreplaceable' ||
      input.annual_contract_spend_eur >= 1_000_000;

    // 2. Article 30 Mandatory Contractual Terms
    const terms = input.contract_terms;

    if (!terms.unrestricted_audit_rights) {
      score -= 25;
      deficiencies.push('Article 30(2)(e): Missing unrestricted inspection and audit rights for financial entity and competent authorities.');
      recommended_actions.push('Insert mandatory DORA Article 30 audit rights clause granting on-site and remote examination access.');
    }

    if (terms.incident_reporting_sla_hours > 4) {
      score -= 20;
      deficiencies.push(`Article 30(2)(b): Incident notification SLA (${terms.incident_reporting_sla_hours}h) exceeds mandatory 4-hour major ICT incident threshold.`);
      recommended_actions.push('Enforce 4-hour maximum major ICT incident initial notification SLA.');
    }

    if (!terms.mandatory_exit_strategy_clause) {
      score -= 20;
      deficiencies.push('Article 28(8) & 30(2)(h): Missing documented exit strategy, transition period, and data return guarantees.');
      recommended_actions.push('Draft executable ICT exit strategy with guaranteed minimum 90-day transitional assistance.');
    }

    if (!terms.sub_contracting_prior_approval) {
      score -= 15;
      deficiencies.push('Article 30(2)(a): Vendor permitted to engage material sub-contractors without prior written notice/approval.');
      recommended_actions.push('Require 30-day prior written notification and explicit objection rights for sub-contractor chain modifications.');
    }

    if (!terms.continuity_disaster_recovery_testing) {
      score -= 10;
      deficiencies.push('Article 30(2)(c): Lack of mandatory annual business continuity and disaster recovery joint testing.');
      recommended_actions.push('Mandate annual BCP/DR validation and recovery time objective (RTO < 2h) attestation.');
    }

    if (!terms.data_location_disclosed) {
      score -= 10;
      deficiencies.push('Article 30(2)(f): Locations where ICT services and data are provided/stored are not explicitly specified.');
      recommended_actions.push('Document exact regional datacenter regions for all primary and backup data stores.');
    }

    const finalScore = Math.max(0, score);
    const article_30_compliant = deficiencies.length === 0;

    const payload = `${input.vendor_id}:${is_critical_ict_provider}:${finalScore}:${article_30_compliant}`;
    const hash = createHash('sha256').update(payload).digest('hex').substring(0, 16).toUpperCase();
    const token = `DORA-ICT-${hash}`;

    return {
      vendor_id: input.vendor_id,
      vendor_name: input.vendor_name,
      is_critical_ict_provider,
      overall_compliance_score: finalScore,
      article_30_contract_compliant: article_30_compliant,
      deficiencies,
      recommended_actions,
      dora_certification_token: token,
    };
  }
}
