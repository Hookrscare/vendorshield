/**
 * QA-181: Multi-Region Vendor Cloud Egress Data Sovereign Boundary Auditor
 * Compliance & Infrastructure Sovereignty Engine for VendorShield.
 *
 * Audits multi-cloud vendor telemetry (AWS VPC Flow, GCP Packet Mirror, Azure VNet Flow)
 * against international data residency mandates (GDPR Chap V, Swiss FADP, CCPA/CPRA, HIPAA, FedRAMP).
 */

export type CloudProvider = 'AWS' | 'GCP' | 'AZURE' | 'ORACLE' | 'CLOUDFLARE';

export type SovereignRegion = 
  | 'EU_EEA'
  | 'US_COMMERCIAL'
  | 'US_GOVCLOUD'
  | 'UK_SOVEREIGN'
  | 'SWISS_CONFEDERATION'
  | 'APAC_SINGAPORE'
  | 'APAC_AUSTRALIA'
  | 'NON_ADEQUATE_OFFSHORE';

export type DataClassification = 
  | 'PUBLIC_UNRESTRICTED'
  | 'INTERNAL_BUSINESS'
  | 'CONFIDENTIAL_PII'
  | 'FINANCIAL_PCI'
  | 'HEALTHCARE_PHI'
  | 'CRITICAL_INFRASTRUCTURE_FEDRAMP';

export interface CloudEgressTelemetry {
  telemetryId: string;
  vendorId: string;
  provider: CloudProvider;
  sourceRegion: SovereignRegion;
  destinationRegion: SovereignRegion;
  destinationEndpoint: string;
  dataClassification: DataClassification;
  egressVolumeMegabytes: number;
  transitEncryption: 'TLS_1_3' | 'TLS_1_2' | 'IPSEC_TUNNEL' | 'UNENCRYPTED';
  hasStandardContractualClauses: boolean;
  hasAdequacyDecision: boolean;
  hasDataPrivacyFrameworkCert: boolean; // EU-US DPF
  timestampIso: string;
}

export interface EgressViolation {
  violationCode: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  regulatoryReference: string;
  remediationAction: string;
}

export interface SovereignEgressAuditResult {
  telemetryId: string;
  vendorId: string;
  isPermitted: boolean;
  sovereigntyRiskScore: number; // 0 (safest) to 100 (severe violation)
  violations: EgressViolation[];
  auditHash: string;
  recommendedDisposition: 'ALLOW' | 'THROTTLE_AND_QUARANTINE' | 'BLOCK_AND_ISOLATE_IMMEDIATELY';
}

export class MultiRegionVendorCloudEgressAuditor {
  private mutualAdequacyZones: Set<string> = new Set([
    'EU_EEA->EU_EEA',
    'EU_EEA->SWISS_CONFEDERATION',
    'SWISS_CONFEDERATION->EU_EEA',
    'EU_EEA->UK_SOVEREIGN',
    'UK_SOVEREIGN->EU_EEA',
    'US_COMMERCIAL->US_COMMERCIAL',
    'US_GOVCLOUD->US_GOVCLOUD',
    'APAC_SINGAPORE->APAC_SINGAPORE',
    'APAC_AUSTRALIA->APAC_AUSTRALIA'
  ]);

  public auditEgressFlow(flow: CloudEgressTelemetry): SovereignEgressAuditResult {
    const violations: EgressViolation[] = [];
    let riskScore = 0;

    // 1. Encryption in transit verification
    if (flow.transitEncryption === 'UNENCRYPTED') {
      violations.push({
        violationCode: 'EGRESS_UNENCRYPTED_PLAINTEXT',
        severity: 'CRITICAL',
        description: 'Cross-boundary egress detected without transport encryption.',
        regulatoryReference: 'GDPR Art. 32(1)(a) & SOC 2 CC6.6',
        remediationAction: 'Immediately terminate connection and enforce mutual TLS 1.3 or IPsec VPN.'
      });
      riskScore += 50;
    } else if (flow.transitEncryption === 'TLS_1_2' && flow.dataClassification === 'CRITICAL_INFRASTRUCTURE_FEDRAMP') {
      violations.push({
        violationCode: 'EGRESS_DEPRECATED_CIPHER_SUITE',
        severity: 'MEDIUM',
        description: 'Federal telemetry egress requires TLS 1.3 with approved HSM suites.',
        regulatoryReference: 'NIST SP 800-52 Rev 2',
        remediationAction: 'Upgrade egress proxy endpoints to TLS 1.3 cipher suites.'
      });
      riskScore += 15;
    }

    // 2. Sovereign Regional Boundary Check
    const flowPair = `${flow.sourceRegion}->${flow.destinationRegion}`;
    const isDirectAdequacy = this.mutualAdequacyZones.has(flowPair);

    const isSensitive = [
      'CONFIDENTIAL_PII',
      'FINANCIAL_PCI',
      'HEALTHCARE_PHI',
      'CRITICAL_INFRASTRUCTURE_FEDRAMP'
    ].includes(flow.dataClassification);

    if (flow.sourceRegion === 'US_GOVCLOUD' && flow.destinationRegion !== 'US_GOVCLOUD') {
      violations.push({
        violationCode: 'FEDRAMP_HIGH_BOUNDARY_BREACH',
        severity: 'CRITICAL',
        description: 'FedRAMP High workload egressed outside US Sovereign GovCloud enclave.',
        regulatoryReference: 'FedRAMP Rev 5 AC-4 / SC-7',
        remediationAction: 'Sever external routing gateway and alert CISO response team.'
      });
      riskScore += 60;
    }

    if (flow.sourceRegion === 'EU_EEA' && !isDirectAdequacy) {
      if (flow.destinationRegion === 'US_COMMERCIAL') {
        if (!flow.hasDataPrivacyFrameworkCert && !flow.hasStandardContractualClauses) {
          violations.push({
            violationCode: 'GDPR_CHAPTER_V_DISALLOWED_US_EGRESS',
            severity: 'HIGH',
            description: 'EU personal data egressed to US without DPF certification or Standard Contractual Clauses.',
            regulatoryReference: 'GDPR Articles 44-46 & Schrems II',
            remediationAction: 'Block egress until vendor validates DPF certification or SCC Module 2 execution.'
          });
          riskScore += 45;
        }
      } else if (flow.destinationRegion === 'NON_ADEQUATE_OFFSHORE') {
        violations.push({
          violationCode: 'NON_ADEQUATE_JURISDICTION_TRANSFER',
          severity: 'CRITICAL',
          description: 'Personal data egressed to non-adequate third-country offshore zone.',
          regulatoryReference: 'GDPR Article 45 Adequacy List',
          remediationAction: 'Execute immediate cloud firewall drop rule.'
        });
        riskScore += 55;
      }
    }

    if (flow.dataClassification === 'HEALTHCARE_PHI' && flow.destinationRegion === 'NON_ADEQUATE_OFFSHORE') {
      violations.push({
        violationCode: 'HIPAA_CROSS_BORDER_EXFILTRATION_RISK',
        severity: 'CRITICAL',
        description: 'Uncovered PHI transferred outside governed HIPAA business associate boundaries.',
        regulatoryReference: 'HIPAA Security Rule 45 CFR Part 164',
        remediationAction: 'Quarantine vendor credential keys and isolate outbound security groups.'
      });
      riskScore += 50;
    }

    riskScore = Math.min(100, riskScore);
    const isPermitted = violations.filter(v => v.severity === 'CRITICAL' || v.severity === 'HIGH').length === 0;

    let disposition: 'ALLOW' | 'THROTTLE_AND_QUARANTINE' | 'BLOCK_AND_ISOLATE_IMMEDIATELY' = 'ALLOW';
    if (!isPermitted) {
      disposition = riskScore >= 50 ? 'BLOCK_AND_ISOLATE_IMMEDIATELY' : 'THROTTLE_AND_QUARANTINE';
    }

    const auditHash = this.computeAuditHash(flow, violations, riskScore);

    return {
      telemetryId: flow.telemetryId,
      vendorId: flow.vendorId,
      isPermitted,
      sovereigntyRiskScore: riskScore,
      violations,
      auditHash,
      recommendedDisposition: disposition
    };
  }

  private computeAuditHash(flow: CloudEgressTelemetry, violations: EgressViolation[], score: number): string {
    const raw = `${flow.telemetryId}|${flow.vendorId}|${flow.sourceRegion}|${flow.destinationRegion}|${score}|${violations.length}`;
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      const ch = raw.charCodeAt(i);
      hash = (hash << 5) - hash + ch;
      hash |= 0;
    }
    return Math.abs(hash).toString(16).padStart(16, '0');
  }
}
