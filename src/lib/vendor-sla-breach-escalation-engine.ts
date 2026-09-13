/**
 * QA-184: Real-Time Enterprise B2B Vendor Contract SLA Breach & Escalation Automation.
 * Part of VendorShield B2B SOC 2 & GDPR Sub-Processor Trust Hub.
 * 
 * Tracks real-time uptime percentages, MTTR, and security notification windows against contractual SLAs,
 * calculating financial service credit penalties and triggering tiered escalation workflows.
 */

import { createHash } from "crypto";

export interface VendorSlaTerms {
  vendorId: string;
  vendorName: string;
  contractMonthlySpendUsd: number;
  contractualUptimePct: number; // e.g. 99.9
  maxP1MttrMinutes: number; // e.g. 60
  securityNoticeMaxHours: number; // e.g. 24
}

export interface VendorPerformancePeriod {
  actualUptimePct: number;
  actualP1MttrMinutes: number;
  actualSecurityNoticeHours: number;
}

export interface SlaBreachAssessment {
  vendorId: string;
  isBreached: boolean;
  uptimePenaltyPct: number;
  mttrPenaltyPct: number;
  totalServiceCreditUsd: number;
  escalationTier: "NONE" | "TIER_1_ACCOUNT_MANAGER" | "TIER_2_VP_ENGINEERING" | "TIER_3_CISO_LEGAL_CONTRACT_TERMINATION";
  breachReasons: string[];
  verificationDigest: string;
}

export class VendorSlaBreachEscalationEngine {
  public static evaluateSla(
    terms: VendorSlaTerms,
    performance: VendorPerformancePeriod
  ): SlaBreachAssessment {
    if (!terms.vendorId || terms.contractMonthlySpendUsd <= 0) {
      throw new Error("Invalid vendor SLA terms.");
    }

    const breachReasons: string[] = [];
    let uptimeCreditPct = 0;
    let mttrCreditPct = 0;

    // Evaluate uptime SLA
    if (performance.actualUptimePct < terms.contractualUptimePct) {
      const deficit = terms.contractualUptimePct - performance.actualUptimePct;
      if (deficit > 5.0) {
        uptimeCreditPct = 50.0;
      } else if (deficit > 1.0) {
        uptimeCreditPct = 25.0;
      } else {
        uptimeCreditPct = 10.0;
      }
      breachReasons.push(
        `Uptime ${performance.actualUptimePct.toFixed(2)}% below contracted ${terms.contractualUptimePct.toFixed(2)}%`
      );
    }

    // Evaluate P1 MTTR SLA
    if (performance.actualP1MttrMinutes > terms.maxP1MttrMinutes) {
      mttrCreditPct = 15.0;
      breachReasons.push(
        `P1 MTTR ${performance.actualP1MttrMinutes}m exceeded ${terms.maxP1MttrMinutes}m SLA`
      );
    }

    // Evaluate Security Notice SLA
    const securityBreached = performance.actualSecurityNoticeHours > terms.securityNoticeMaxHours;
    if (securityBreached) {
      breachReasons.push(
        `Security incident notification ${performance.actualSecurityNoticeHours}h exceeded ${terms.securityNoticeMaxHours}h regulatory deadline`
      );
    }

    const totalCreditPct = Math.min(100.0, uptimeCreditPct + mttrCreditPct);
    const totalServiceCreditUsd = Number(
      ((terms.contractMonthlySpendUsd * totalCreditPct) / 100.0).toFixed(2)
    );

    const isBreached = breachReasons.length > 0;
    let escalationTier: SlaBreachAssessment["escalationTier"] = "NONE";

    if (securityBreached || totalCreditPct >= 50.0) {
      escalationTier = "TIER_3_CISO_LEGAL_CONTRACT_TERMINATION";
    } else if (totalCreditPct >= 25.0) {
      escalationTier = "TIER_2_VP_ENGINEERING";
    } else if (isBreached) {
      escalationTier = "TIER_1_ACCOUNT_MANAGER";
    }

    const raw = `${terms.vendorId}:${performance.actualUptimePct}:${totalServiceCreditUsd}:${escalationTier}`;
    const digest = createHash("sha256").update(raw).digest("hex");

    return {
      vendorId: terms.vendorId,
      isBreached,
      uptimePenaltyPct: uptimeCreditPct,
      mttrPenaltyPct: mttrCreditPct,
      totalServiceCreditUsd,
      escalationTier,
      breachReasons,
      verificationDigest: digest
    };
  }
}
