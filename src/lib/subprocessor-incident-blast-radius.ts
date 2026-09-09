/**
 * QA-144: Continuous Sub-Processor Incident Blast Radius & Impact Analyzer.
 * Part of VendorShield B2B SOC 2 & GDPR Sub-Processor Trust Hub.
 *
 * Evaluates the downstream blast radius, regulatory notification deadlines (GDPR Art 33 72h, SEC Form 8-K 4-day),
 * affected tenant data classifications, and operational severity of sub-processor breaches or outages.
 */

import crypto from "crypto";

export type DataClassification = "PUBLIC" | "INTERNAL" | "CONFIDENTIAL" | "PII" | "PHI" | "PCI_DSS";

export interface SubProcessorProfile {
  id: string;
  name: string;
  category: "CLOUD_INFRASTRUCTURE" | "PAYMENT_GATEWAY" | "AI_LLM" | "COMMUNICATIONS" | "ANALYTICS";
  dataClassificationsHandled: DataClassification[];
  isSinglePointOfFailure: boolean;
  dpaSigned: boolean;
  slaUptimePercent: number;
}

export interface TenantDependency {
  tenantId: string;
  tenantName: string;
  tier: "FREE" | "PRO" | "ENTERPRISE";
  activeSubProcessors: string[]; // SubProcessor IDs
  hasPhiData: boolean;
  hasPciData: boolean;
}

export interface IncidentAlert {
  incidentId: string;
  subProcessorId: string;
  incidentType: "DATA_BREACH" | "CRITICAL_OUTAGE" | "RANSOMWARE" | "UNAUTHORIZED_ACCESS";
  reportedAtIso: string;
  isConfirmedDataExfiltration: boolean;
  description: string;
}

export interface BlastRadiusAssessment {
  incidentId: string;
  subProcessorId: string;
  subProcessorName: string;
  totalAffectedTenants: number;
  affectedEnterpriseTenants: number;
  compromisedDataClasses: DataClassification[];
  severityScore: number; // 0 - 100
  regulatoryObligations: {
    gdprArticle33BreachNotificationRequired: boolean;
    gdprNotificationDeadlineIso: string | null;
    secForm8KMaterialDisclosureRequired: boolean;
    hipaaBreachNotificationRequired: boolean;
  };
  remediationActionItems: string[];
  auditDossierSha256: string;
}

export class SubProcessorIncidentBlastRadiusAnalyzer {
  private subProcessors = new Map<string, SubProcessorProfile>();
  private tenantDependencies: TenantDependency[] = [];

  public registerSubProcessor(profile: SubProcessorProfile): void {
    this.subProcessors.set(profile.id, profile);
  }

  public registerTenants(tenants: TenantDependency[]): void {
    this.tenantDependencies = tenants;
  }

  public analyzeIncidentBlastRadius(incident: IncidentAlert): BlastRadiusAssessment {
    const subProcessor = this.subProcessors.get(incident.subProcessorId);
    const subProcName = subProcessor ? subProcessor.name : incident.subProcessorId;
    const handledClasses = subProcessor ? subProcessor.dataClassificationsHandled : [];

    // Find affected tenants
    const affected = this.tenantDependencies.filter(t =>
      t.activeSubProcessors.includes(incident.subProcessorId)
    );

    const enterpriseCount = affected.filter(t => t.tier === "ENTERPRISE").length;
    const hasPhiAffected = affected.some(t => t.hasPhiData) || handledClasses.includes("PHI");
    const hasPciAffected = affected.some(t => t.hasPciData) || handledClasses.includes("PCI_DSS");
    const hasPiiAffected = handledClasses.includes("PII");

    // Severity calculation
    let severity = 20;
    if (incident.isConfirmedDataExfiltration) severity += 40;
    if (incident.incidentType === "DATA_BREACH") severity += 20;
    if (incident.incidentType === "RANSOMWARE") severity += 25;
    if (subProcessor?.isSinglePointOfFailure) severity += 15;
    if (enterpriseCount > 0) severity += Math.min(15, enterpriseCount * 3);
    severity = Math.min(100, severity);

    // GDPR Art 33: 72 hours from reported time if PII/breach
    let gdprDeadline: string | null = null;
    const isGdprTriggered = (incident.incidentType === "DATA_BREACH" || incident.isConfirmedDataExfiltration) && hasPiiAffected;
    if (isGdprTriggered) {
      const repTime = new Date(incident.reportedAtIso).getTime();
      const deadline = new Date(repTime + 72 * 3600 * 1000);
      gdprDeadline = deadline.toISOString();
    }

    const secRequired = severity >= 75 && enterpriseCount > 0;
    const hipaaRequired = hasPhiAffected && incident.isConfirmedDataExfiltration;

    const actions: string[] = [];
    if (subProcessor?.isSinglePointOfFailure) {
      actions.push("Activate disaster recovery failover to secondary provider");
    }
    if (isGdprTriggered) {
      actions.push("Initiate GDPR Article 33 DPA 72-hour supervisory authority briefing");
    }
    if (enterpriseCount > 0) {
      actions.push(`Dispatch CISO urgent security notices to ${enterpriseCount} enterprise tenant accounts`);
    }
    if (incident.isConfirmedDataExfiltration) {
      actions.push("Rotate all shared API keys, webhooks, and mutual TLS certificates with sub-processor");
    }

    const payload = JSON.stringify({
      incidentId: incident.incidentId,
      subProcessorId: incident.subProcessorId,
      severity,
      affectedTenants: affected.length,
      timestamp: incident.reportedAtIso
    });
    const digest = crypto.createHash("sha256").update(payload).digest("hex");

    return {
      incidentId: incident.incidentId,
      subProcessorId: incident.subProcessorId,
      subProcessorName: subProcName,
      totalAffectedTenants: affected.length,
      affectedEnterpriseTenants: enterpriseCount,
      compromisedDataClasses: handledClasses,
      severityScore: severity,
      regulatoryObligations: {
        gdprArticle33BreachNotificationRequired: isGdprTriggered,
        gdprNotificationDeadlineIso: gdprDeadline,
        secForm8KMaterialDisclosureRequired: secRequired,
        hipaaBreachNotificationRequired: hipaaRequired
      },
      remediationActionItems: actions,
      auditDossierSha256: digest
    };
  }
}
