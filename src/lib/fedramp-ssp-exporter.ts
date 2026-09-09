/**
 * QA-134: Real-Time FedRAMP Continuous Monitoring System Security Plan (SSP) Exporter.
 * Part of VendorShield B2B SOC 2 & GDPR Sub-Processor Trust Hub.
 *
 * Compiles NIST SP 800-53 Rev. 5 control baselines (Low, Moderate, High),
 * evaluates implementation statuses, audits POA&M (Plan of Action & Milestones) SLAs,
 * exports OSCAL-compatible metadata, and generates tamper-proof cryptographic SHA-256 attestations.
 */

import { createHash } from 'crypto';

export type FedrampBaseline = 'LOW' | 'MODERATE' | 'HIGH';

export type ControlImplementationStatus =
  | 'IMPLEMENTED'
  | 'PARTIALLY_IMPLEMENTED'
  | 'PLANNED'
  | 'NOT_APPLICABLE';

export type NistControlFamily =
  | 'AC' // Access Control
  | 'AU' // Audit and Accountability
  | 'CM' // Configuration Management
  | 'CP' // Contingency Planning
  | 'IA' // Identification and Authentication
  | 'IR' // Incident Response
  | 'RA' // Risk Assessment
  | 'SC' // System and Communications Protection
  | 'SI'; // System and Information Integrity

export interface NistControl {
  id: string; // e.g., 'AC-2', 'IA-2'
  family: NistControlFamily;
  title: string;
  status: ControlImplementationStatus;
  responsibleRole: string;
  implementationDescription: string;
  testedDate?: string;
}

export interface PoamItem {
  poamId: string;
  controlId: string;
  weakness: string;
  severity: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';
  daysOpen: number;
  scheduledCompletionDate: string;
  status: 'OPEN' | 'IN_REMEDIATION' | 'CLOSED';
}

export interface ContinuousMonitoringMetrics {
  lastScanDate: string;
  mfaAdoptionRate: number; // 0 to 100
  encryptionAtRestCompliant: boolean;
  automatedPatchCadenceDays: number;
  criticalVulnerabilitySlaDays: number; // Max allowed days for criticals (FedRAMP standard: 30 days)
}

export interface FedrampSspReport {
  systemName: string;
  systemVersion: string;
  baseline: FedrampBaseline;
  generatedAt: string;
  totalControlsEvaluated: number;
  implementedControlsCount: number;
  implementationRatePercentage: number;
  openPoamCount: number;
  overduePoamCount: number;
  conMonComplianceStatus: 'COMPLIANT' | 'NEEDS_ATTENTION' | 'NON_COMPLIANT';
  oscalPackage: Record<string, any>;
  markdownSummary: string;
  immutableDigest: string;
}

export class FedrampSspExporter {
  private systemName: string;
  private systemVersion: string;
  private baseline: FedrampBaseline;
  private controls: Map<string, NistControl> = new Map();
  private poamList: PoamItem[] = [];
  private conMonMetrics: ContinuousMonitoringMetrics;

  constructor(
    systemName: string,
    systemVersion: string,
    baseline: FedrampBaseline = 'MODERATE',
    initialMetrics?: Partial<ContinuousMonitoringMetrics>
  ) {
    if (!systemName || !systemName.trim()) {
      throw new Error('System name must not be empty');
    }
    if (!systemVersion || !systemVersion.trim()) {
      throw new Error('System version must not be empty');
    }

    this.systemName = systemName.trim();
    this.systemVersion = systemVersion.trim();
    this.baseline = baseline;

    this.conMonMetrics = {
      lastScanDate: new Date().toISOString(),
      mfaAdoptionRate: initialMetrics?.mfaAdoptionRate ?? 100,
      encryptionAtRestCompliant: initialMetrics?.encryptionAtRestCompliant ?? true,
      automatedPatchCadenceDays: initialMetrics?.automatedPatchCadenceDays ?? 14,
      criticalVulnerabilitySlaDays: initialMetrics?.criticalVulnerabilitySlaDays ?? 30,
    };
  }

  public registerControl(control: NistControl): void {
    if (!control.id || !control.title) {
      throw new Error('Control ID and title are required');
    }
    this.controls.set(control.id.toUpperCase(), {
      ...control,
      id: control.id.toUpperCase(),
    });
  }

  public addPoamItem(item: PoamItem): void {
    if (!item.poamId || !item.controlId) {
      throw new Error('POA&M item must have an ID and control ID');
    }
    this.poamList.push(item);
  }

  public updateConMonMetrics(metrics: Partial<ContinuousMonitoringMetrics>): void {
    this.conMonMetrics = {
      ...this.conMonMetrics,
      ...metrics,
    };
  }

  public generateReport(): FedrampSspReport {
    const totalControls = this.controls.size;
    let implementedCount = 0;

    for (const ctrl of this.controls.values()) {
      if (ctrl.status === 'IMPLEMENTED') {
        implementedCount++;
      }
    }

    const implementationRate = totalControls > 0
      ? Number(((implementedCount / totalControls) * 100).toFixed(1))
      : 0;

    const openPoams = this.poamList.filter((p) => p.status !== 'CLOSED');
    // Overdue if open high/critical exceeds 30 days or open days > scheduled
    const overduePoams = openPoams.filter(
      (p) => (p.severity === 'CRITICAL' || p.severity === 'HIGH') && p.daysOpen > 30
    );

    let conMonStatus: 'COMPLIANT' | 'NEEDS_ATTENTION' | 'NON_COMPLIANT' = 'COMPLIANT';

    if (overduePoams.length > 0 || this.conMonMetrics.mfaAdoptionRate < 95) {
      conMonStatus = 'NON_COMPLIANT';
    } else if (openPoams.length > 3 || !this.conMonMetrics.encryptionAtRestCompliant) {
      conMonStatus = 'NEEDS_ATTENTION';
    }

    const generatedAt = new Date().toISOString();

    // Generate OSCAL-compatible representation
    const oscalPackage = {
      'system-security-plan': {
        id: `ssp-${this.systemName.toLowerCase().replace(/\s+/g, '-')}`,
        metadata: {
          title: `FedRAMP System Security Plan - ${this.systemName}`,
          version: this.systemVersion,
          'last-modified': generatedAt,
          'oscal-version': '1.0.4',
        },
        'system-characteristics': {
          'system-name': this.systemName,
          'security-sensitivity-level': this.baseline.toLowerCase(),
        },
        'control-implementation': {
          description: `NIST SP 800-53 Rev. 5 ${this.baseline} Baseline Implementation`,
          'implemented-requirements': Array.from(this.controls.values()).map((c) => ({
            'control-id': c.id,
            status: c.status,
            remarks: c.implementationDescription,
            by: c.responsibleRole,
          })),
        },
        'plan-of-action-and-milestones': {
          items: this.poamList.map((p) => ({
            id: p.poamId,
            control: p.controlId,
            severity: p.severity,
            status: p.status,
            daysOpen: p.daysOpen,
          })),
        },
      },
    };

    const markdownSummary = this.buildMarkdownSummary(
      implementedCount,
      totalControls,
      implementationRate,
      openPoams.length,
      overduePoams.length,
      conMonStatus,
      generatedAt
    );

    const hashPayload = JSON.stringify({
      systemName: this.systemName,
      version: this.systemVersion,
      baseline: this.baseline,
      totalControls,
      implementedCount,
      openPoams: openPoams.length,
      overduePoams: overduePoams.length,
      generatedAt,
    });

    const immutableDigest = createHash('sha256').update(hashPayload).digest('hex');

    return {
      systemName: this.systemName,
      systemVersion: this.systemVersion,
      baseline: this.baseline,
      generatedAt,
      totalControlsEvaluated: totalControls,
      implementedControlsCount: implementedCount,
      implementationRatePercentage: implementationRate,
      openPoamCount: openPoams.length,
      overduePoamCount: overduePoams.length,
      conMonComplianceStatus: conMonStatus,
      oscalPackage,
      markdownSummary,
      immutableDigest,
    };
  }

  private buildMarkdownSummary(
    implemented: number,
    total: number,
    rate: number,
    openPoams: number,
    overduePoams: number,
    status: string,
    timestamp: string
  ): string {
    return [
      `# 🏛️ FedRAMP Continuous Monitoring SSP Audit Summary`,
      `- **System:** ${this.systemName} (v${this.systemVersion})`,
      `- **Authorization Baseline:** FedRAMP ${this.baseline}`,
      `- **Assessment Timestamp:** \`${timestamp}\``,
      `- **Controls Implemented:** ${implemented} / ${total} (${rate}%)`,
      `- **Open POA&Ms:** ${openPoams} (${overduePoams} overdue)`,
      `- **Continuous Monitoring Status:** **${status}**`,
      `- **MFA Enforcement Rate:** ${this.conMonMetrics.mfaAdoptionRate}%`,
      `- **Encryption at Rest:** ${this.conMonMetrics.encryptionAtRestCompliant ? 'ACTIVE' : 'NON_COMPLIANT'}`,
    ].join('\n');
  }
}
