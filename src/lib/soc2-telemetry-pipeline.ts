/**
 * QA-132: Sub-Processor SOC 2 Continuous Evidence Telemetry Pipeline.
 * Part of VendorShield B2B SOC 2 & GDPR Sub-Processor Trust Hub.
 * Collects, verifies, and packages automated Trust Services Criteria (TSC)
 * telemetry evidence (MFA, WAF, Vulnerabilities, CI/CD, Audit Logging).
 */

import { createHash } from 'crypto';

export type TscControlId = 'CC6.1' | 'CC6.6' | 'CC6.8' | 'CC7.2' | 'CC8.1';

export type ControlStatus = 'COMPLIANT' | 'DEFICIENT' | 'NON_COMPLIANT';

export interface EvidenceTelemetryItem {
  controlId: TscControlId;
  vendorId: string;
  category: string;
  sourceSystem: 'OKTA' | 'AWS_SECURITY_HUB' | 'GITHUB' | 'DATADOG' | 'CLOUDFLARE';
  rawMetricValue: number | boolean | string;
  isCompliant: boolean;
  timestamp: string;
  evidenceDetails: string;
}

export interface ControlAssessment {
  controlId: TscControlId;
  title: string;
  status: ControlStatus;
  evidenceItemsCount: number;
  failingItemsCount: number;
  evidenceHash: string;
}

export interface Soc2TelemetryReport {
  vendorId: string;
  generatedAt: string;
  overallStatus: 'PASS' | 'AT_RISK' | 'FAIL';
  compliancePercentage: number;
  controls: Record<TscControlId, ControlAssessment>;
  immutableManifestHash: string;
}

const TSC_METADATA: Record<TscControlId, string> = {
  'CC6.1': 'Logical Access & Multi-Factor Authentication Enforcement',
  'CC6.6': 'Perimeter & Cloud Network Boundary Defense',
  'CC6.8': 'Vulnerability Management & Host Antivirus Protection',
  'CC7.2': 'Continuous Security Event Monitoring & Anomaly Detection',
  'CC8.1': 'Software Change Authorization & Automated CI/CD Testing',
};

export class Soc2TelemetryPipeline {
  private evidenceStore: EvidenceTelemetryItem[] = [];

  public ingestTelemetry(item: EvidenceTelemetryItem): void {
    this.evidenceStore.push(item);
  }

  public ingestBatch(items: EvidenceTelemetryItem[]): void {
    this.evidenceStore.push(...items);
  }

  public generateReport(vendorId: string): Soc2TelemetryReport {
    const vendorItems = this.evidenceStore.filter((i) => i.vendorId === vendorId);
    const controls: Partial<Record<TscControlId, ControlAssessment>> = {};

    const controlKeys: TscControlId[] = ['CC6.1', 'CC6.6', 'CC6.8', 'CC7.2', 'CC8.1'];

    let totalPassed = 0;

    for (const ctrl of controlKeys) {
      const relevant = vendorItems.filter((i) => i.controlId === ctrl);
      const failing = relevant.filter((i) => !i.isCompliant);

      let status: ControlStatus = 'COMPLIANT';
      if (relevant.length === 0 || failing.length === relevant.length) {
        status = 'NON_COMPLIANT';
      } else if (failing.length > 0) {
        status = 'DEFICIENT';
      }

      if (status === 'COMPLIANT') {
        totalPassed += 1;
      }

      const evidenceContent = relevant.map((r) => `${r.timestamp}:${r.sourceSystem}:${r.isCompliant}`).join('|');
      const evidenceHash = createHash('sha256').update(evidenceContent || 'NO_DATA').digest('hex');

      controls[ctrl] = {
        controlId: ctrl,
        title: TSC_METADATA[ctrl],
        status,
        evidenceItemsCount: relevant.length,
        failingItemsCount: failing.length,
        evidenceHash,
      };
    }

    const compliancePct = Math.round((totalPassed / controlKeys.length) * 100);
    const overallStatus = compliancePct >= 80 ? 'PASS' : compliancePct >= 50 ? 'AT_RISK' : 'FAIL';

    const manifestPayload = `${vendorId}:${compliancePct}:${Object.values(controls)
      .map((c) => c?.evidenceHash)
      .join(',')}`;
    const immutableManifestHash = createHash('sha256').update(manifestPayload).digest('hex');

    return {
      vendorId,
      generatedAt: new Date().toISOString(),
      overallStatus,
      compliancePercentage: compliancePct,
      controls: controls as Record<TscControlId, ControlAssessment>,
      immutableManifestHash,
    };
  }
}
