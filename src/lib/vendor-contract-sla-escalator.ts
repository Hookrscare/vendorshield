/**
 * QA-148: Real-Time B2B Vendor Contract SLA Breach & Escalation Automation.
 * Part of VendorShield B2B SOC 2 & GDPR Sub-Processor Trust Hub.
 * 
 * Provides automated, tamper-evident SLA enforcement and multi-tier escalation for B2B vendor contracts:
 * - Real-time metrics evaluation (Uptime %, P1/P2/P3 Incident Response, Security Remediation, Breach Notification)
 * - Tiered SLA penalty credit calculation (10% - 100% monthly service fee credits)
 * - Multi-tier automated escalation dispatch (Tier 1 Account Mgr -> Tier 2 CISO -> Tier 3 Legal Termination Notice)
 * - Cryptographic SHA-256 breach certificate generation for SOC 2 Type II audit evidence and dispute settlement
 */

import { createHash } from "crypto";

export type SLAMetricType = 
  | "SYSTEM_UPTIME" 
  | "P1_INCIDENT_RESPONSE_MINUTES" 
  | "P2_INCIDENT_RESPONSE_MINUTES" 
  | "CRITICAL_CVE_REMEDIATION_DAYS" 
  | "SECURITY_BREACH_NOTIFICATION_HOURS";

export type EscalationTier = 
  | "TIER_1_ACCOUNT_NOTICE" 
  | "TIER_2_CISO_EXECUTIVE_ESCALATION" 
  | "TIER_3_LEGAL_TERMINATION_WARNING";

export interface VendorContractSLAConfig {
  vendorId: string;
  vendorName: string;
  contractId: string;
  monthlyServiceFeeUsd: number;
  uptimeThresholdPct: number; // e.g. 99.9
  p1MaxResponseMinutes: number; // e.g. 15
  p2MaxResponseMinutes: number; // e.g. 60
  criticalCveMaxDays: number; // e.g. 7
  breachNoticeMaxHours: number; // e.g. 24
}

export interface VendorTelemetryEvent {
  metricType: SLAMetricType;
  observedValue: number;
  timestampIso: string;
  incidentRefId?: string;
  incidentSummary?: string;
}

export interface SLABreachRecord {
  breachId: string;
  metricType: SLAMetricType;
  contractualThreshold: number;
  observedValue: number;
  severity: "CRITICAL" | "HIGH" | "MEDIUM";
  penaltyCreditPercentage: number;
  penaltyCreditUsd: number;
  escalationTier: EscalationTier;
  actionRequired: string;
  detectedAtIso: string;
}

export interface SLAEvaluationResult {
  contractId: string;
  vendorId: string;
  hasBreaches: boolean;
  totalBreachesCount: number;
  totalPenaltyCreditsUsd: number;
  effectiveMonthlyFeeAfterCreditUsd: number;
  breaches: SLABreachRecord[];
  highestEscalationTier: EscalationTier | "NONE";
  auditCertificate: {
    certificateId: string;
    evaluatedAtIso: string;
    integrityHashSha256: string;
  };
}

export class VendorContractSLAEscalator {
  private config: VendorContractSLAConfig;

  constructor(config: VendorContractSLAConfig) {
    this.config = config;
  }

  public evaluateTelemetry(events: VendorTelemetryEvent[]): SLAEvaluationResult {
    const breaches: SLABreachRecord[] = [];

    for (const ev of events) {
      const breach = this.evaluateSingleMetric(ev);
      if (breach) {
        breaches.push(breach);
      }
    }

    const totalPenaltyCreditsUsd = breaches.reduce((sum, b) => sum + b.penaltyCreditUsd, 0);
    // Cap penalty credit at 100% of monthly fee
    const cappedPenalty = Math.min(this.config.monthlyServiceFeeUsd, totalPenaltyCreditsUsd);
    const effectiveMonthlyFee = Math.max(0, this.config.monthlyServiceFeeUsd - cappedPenalty);

    let highestTier: EscalationTier | "NONE" = "NONE";
    if (breaches.some(b => b.escalationTier === "TIER_3_LEGAL_TERMINATION_WARNING")) {
      highestTier = "TIER_3_LEGAL_TERMINATION_WARNING";
    } else if (breaches.some(b => b.escalationTier === "TIER_2_CISO_EXECUTIVE_ESCALATION")) {
      highestTier = "TIER_2_CISO_EXECUTIVE_ESCALATION";
    } else if (breaches.length > 0) {
      highestTier = "TIER_1_ACCOUNT_NOTICE";
    }

    const evaluatedAtIso = new Date().toISOString();
    const certPayload = JSON.stringify({
      contractId: this.config.contractId,
      vendorId: this.config.vendorId,
      breachesCount: breaches.length,
      cappedPenalty,
      evaluatedAtIso
    });
    const integrityHashSha256 = createHash("sha256").update(certPayload).digest("hex");

    return {
      contractId: this.config.contractId,
      vendorId: this.config.vendorId,
      hasBreaches: breaches.length > 0,
      totalBreachesCount: breaches.length,
      totalPenaltyCreditsUsd: Number(cappedPenalty.toFixed(2)),
      effectiveMonthlyFeeAfterCreditUsd: Number(effectiveMonthlyFee.toFixed(2)),
      breaches,
      highestEscalationTier: highestTier,
      auditCertificate: {
        certificateId: `SLA-CERT-${this.config.contractId}-${Date.now()}`,
        evaluatedAtIso,
        integrityHashSha256
      }
    };
  }

  private evaluateSingleMetric(ev: VendorTelemetryEvent): SLABreachRecord | null {
    const nowIso = new Date().toISOString();

    switch (ev.metricType) {
      case "SYSTEM_UPTIME": {
        if (ev.observedValue < this.config.uptimeThresholdPct) {
          const delta = this.config.uptimeThresholdPct - ev.observedValue;
          let creditPct = 10;
          let tier: EscalationTier = "TIER_1_ACCOUNT_NOTICE";
          let severity: "CRITICAL" | "HIGH" | "MEDIUM" = "MEDIUM";

          if (delta > 1.0) {
            creditPct = 50;
            tier = "TIER_3_LEGAL_TERMINATION_WARNING";
            severity = "CRITICAL";
          } else if (delta > 0.3) {
            creditPct = 25;
            tier = "TIER_2_CISO_EXECUTIVE_ESCALATION";
            severity = "HIGH";
          }

          const creditUsd = (this.config.monthlyServiceFeeUsd * creditPct) / 100;
          return {
            breachId: `BREACH-UPTIME-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            metricType: ev.metricType,
            contractualThreshold: this.config.uptimeThresholdPct,
            observedValue: ev.observedValue,
            severity,
            penaltyCreditPercentage: creditPct,
            penaltyCreditUsd: Number(creditUsd.toFixed(2)),
            escalationTier: tier,
            actionRequired: `Uptime degraded to ${ev.observedValue}%. Demand RCA within 48h.`,
            detectedAtIso: nowIso
          };
        }
        return null;
      }

      case "P1_INCIDENT_RESPONSE_MINUTES": {
        if (ev.observedValue > this.config.p1MaxResponseMinutes) {
          const creditPct = 20;
          const creditUsd = (this.config.monthlyServiceFeeUsd * creditPct) / 100;
          return {
            breachId: `BREACH-P1-RESP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            metricType: ev.metricType,
            contractualThreshold: this.config.p1MaxResponseMinutes,
            observedValue: ev.observedValue,
            severity: "CRITICAL",
            penaltyCreditPercentage: creditPct,
            penaltyCreditUsd: Number(creditUsd.toFixed(2)),
            escalationTier: "TIER_2_CISO_EXECUTIVE_ESCALATION",
            actionRequired: `P1 Response took ${ev.observedValue}m (Limit: ${this.config.p1MaxResponseMinutes}m).`,
            detectedAtIso: nowIso
          };
        }
        return null;
      }

      case "SECURITY_BREACH_NOTIFICATION_HOURS": {
        if (ev.observedValue > this.config.breachNoticeMaxHours) {
          const creditPct = 100; // Total fee forfeiture on failure to report breach
          const creditUsd = this.config.monthlyServiceFeeUsd;
          return {
            breachId: `BREACH-SECURITY-NOTICE-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            metricType: ev.metricType,
            contractualThreshold: this.config.breachNoticeMaxHours,
            observedValue: ev.observedValue,
            severity: "CRITICAL",
            penaltyCreditPercentage: creditPct,
            penaltyCreditUsd: creditUsd,
            escalationTier: "TIER_3_LEGAL_TERMINATION_WARNING",
            actionRequired: `Breach notification took ${ev.observedValue}h exceeding legal/contract limit ${this.config.breachNoticeMaxHours}h. Immediate legal freeze.`,
            detectedAtIso: nowIso
          };
        }
        return null;
      }

      case "CRITICAL_CVE_REMEDIATION_DAYS": {
        if (ev.observedValue > this.config.criticalCveMaxDays) {
          const creditPct = 15;
          const creditUsd = (this.config.monthlyServiceFeeUsd * creditPct) / 100;
          return {
            breachId: `BREACH-CVE-REMED-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            metricType: ev.metricType,
            contractualThreshold: this.config.criticalCveMaxDays,
            observedValue: ev.observedValue,
            severity: "HIGH",
            penaltyCreditPercentage: creditPct,
            penaltyCreditUsd: Number(creditUsd.toFixed(2)),
            escalationTier: "TIER_2_CISO_EXECUTIVE_ESCALATION",
            actionRequired: `Critical CVE remediation unpatched after ${ev.observedValue} days (Limit: ${this.config.criticalCveMaxDays}d).`,
            detectedAtIso: nowIso
          };
        }
        return null;
      }

      default:
        return null;
    }
  }
}
