/**
 * QA-182: Enterprise Third-Party Vendor DORA Operational Resilience Gap Evaluator
 * 
 * Assesses critical ICT third-party vendors against European Digital Operational Resilience Act (DORA)
 * Articles 11, 26, 28-30 mandates: RTO/RPO limits, Threat-Led Penetration Testing (TLPT),
 * multi-region failover drill currency, and exit strategy feasibility.
 */

export interface VendorDoraProfile {
  vendorId: string;
  vendorName: string;
  isCriticalIctProvider: boolean; // DORA CTPP designation
  recoveryTimeObjectiveMinutes: number; // RTO
  recoveryPointObjectiveMinutes: number; // RPO
  lastLiveFailoverDrillDaysAgo: number;
  lastThreatLedPenTestMonthsAgo: number;
  hasDocumentedTransitionAndExitStrategy: boolean;
  subcontractorChainAudited: boolean;
}

export interface DoraGapAnalysisResult {
  vendorId: string;
  isDoraCompliant: boolean;
  readinessScoreOutOf100: number;
  identifiedGaps: string[];
  remediationRequirements: string[];
}

export class DoraOperationalResilienceEvaluator {
  /**
   * Evaluates third-party ICT vendor readiness against DORA operational resilience mandates.
   */
  public evaluateVendor(profile: VendorDoraProfile): DoraGapAnalysisResult {
    const gaps: string[] = [];
    const remediation: string[] = [];
    let score = 100;

    // 1. RTO Evaluation (Critical ICT threshold: <= 60 mins)
    const maxRto = profile.isCriticalIctProvider ? 60 : 240;
    if (profile.recoveryTimeObjectiveMinutes > maxRto) {
      gaps.push(`RTO_EXCEEDS_THRESHOLD: ${profile.recoveryTimeObjectiveMinutes}m > ${maxRto}m`);
      remediation.push('Deploy hot standby multi-region replication to reduce RTO.');
      score -= 20;
    }

    // 2. RPO Evaluation (Critical ICT threshold: <= 15 mins)
    const maxRpo = profile.isCriticalIctProvider ? 15 : 60;
    if (profile.recoveryPointObjectiveMinutes > maxRpo) {
      gaps.push(`RPO_EXCEEDS_THRESHOLD: ${profile.recoveryPointObjectiveMinutes}m > ${maxRpo}m`);
      remediation.push('Enable continuous synchronous data replication to limit potential data loss.');
      score -= 20;
    }

    // 3. Live Disaster Recovery Drill Currency (Annual requirement: <= 365 days)
    if (profile.lastLiveFailoverDrillDaysAgo > 365) {
      gaps.push(`DR_DRILL_STALE: Last failover drill was ${profile.lastLiveFailoverDrillDaysAgo} days ago (limit: 365 days)`);
      remediation.push('Execute full-scope live production multi-region failover drill.');
      score -= 20;
    }

    // 4. Threat-Led Penetration Testing (TLPT) currency (Every 36 months for CTPP under DORA Art. 26)
    if (profile.isCriticalIctProvider && profile.lastThreatLedPenTestMonthsAgo > 36) {
      gaps.push(`TLPT_EXPIRED: Last TIBER-EU penetration test was ${profile.lastThreatLedPenTestMonthsAgo} months ago (limit: 36 months)`);
      remediation.push('Commission independent TIBER-EU certified Threat-Led Penetration Test.');
      score -= 15;
    }

    // 5. Exit Strategy (DORA Art. 28)
    if (!profile.hasDocumentedTransitionAndExitStrategy) {
      gaps.push('MISSING_EXIT_STRATEGY: Lack of contractually guaranteed transition and exit assistance');
      remediation.push('Draft comprehensive exit plan ensuring data portability and alternative provider transition.');
      score -= 15;
    }

    // 6. Subcontractor Supply Chain Audit (DORA Art. 30)
    if (!profile.subcontractorChainAudited) {
      gaps.push('UNAUDITED_SUBCONTRACTOR_CHAIN: Critical fourth-party dependencies unmapped');
      remediation.push('Conduct full tier-4 subprocessor mapping and SOC 2 Type II review.');
      score -= 10;
    }

    const finalScore = Math.max(0, score);
    const isDoraCompliant = gaps.length === 0;

    return {
      vendorId: profile.vendorId,
      isDoraCompliant,
      readinessScoreOutOf100: finalScore,
      identifiedGaps: gaps,
      remediationRequirements: remediation,
    };
  }
}
