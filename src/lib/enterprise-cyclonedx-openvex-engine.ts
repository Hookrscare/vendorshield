import { createHash } from 'crypto';

export type VexStatus = 'not_affected' | 'affected' | 'fixed' | 'under_investigation';

export type VexJustification =
  | 'component_not_present'
  | 'vulnerable_code_not_present'
  | 'vulnerable_code_cannot_be_controlled_by_adversary'
  | 'vulnerable_code_not_in_execute_path'
  | 'inline_mitigations_already_exist';

export interface SbomComponent {
  name: string;
  version: string;
  purl: string;
  type: 'library' | 'framework' | 'application' | 'container' | 'operating-system';
  sha256?: string;
}

export interface VexStatement {
  vulnerability: string; // e.g. "CVE-2026-44120"
  status: VexStatus;
  justification?: VexJustification;
  impact_statement?: string;
  action_statement?: string;
  timestamp: string;
}

export interface CycloneDxDocument {
  bomFormat: 'CycloneDX';
  specVersion: '1.5';
  serialNumber: string;
  version: number;
  metadata: {
    timestamp: string;
    component: {
      name: string;
      version: string;
      type: string;
    };
  };
  components: SbomComponent[];
}

export interface OpenVexDocument {
  '@context': string;
  '@id': string;
  author: string;
  timestamp: string;
  version: number;
  statements: Array<VexStatement & { products: string[] }>;
  documentDigestSha256?: string;
}

export class EnterpriseCycloneDxOpenVexEngine {
  /**
   * Generates a valid CycloneDX 1.5 specification document.
   */
  public static generateCycloneDxSbom(
    appName: string,
    appVersion: string,
    components: SbomComponent[]
  ): CycloneDxDocument {
    const timestamp = new Date().toISOString();
    const hash = createHash('sha256')
      .update(`${appName}:${appVersion}:${timestamp}:${components.length}`)
      .digest('hex');
    const serialNumber = `urn:uuid:${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-8${hash.slice(17, 20)}-${hash.slice(20, 32)}`;

    return {
      bomFormat: 'CycloneDX',
      specVersion: '1.5',
      serialNumber,
      version: 1,
      metadata: {
        timestamp,
        component: {
          name: appName,
          version: appVersion,
          type: 'application',
        },
      },
      components,
    };
  }

  /**
   * Generates an OpenVEX exploitability exchange statement document matching CycloneDX purls.
   */
  public static generateOpenVexDocument(
    author: string,
    statements: Array<{
      vulnerability: string;
      purl: string;
      status: VexStatus;
      justification?: VexJustification;
      impact_statement?: string;
      action_statement?: string;
    }>
  ): OpenVexDocument {
    const timestamp = new Date().toISOString();
    const vexStatements = statements.map((stmt) => ({
      vulnerability: stmt.vulnerability,
      products: [stmt.purl],
      status: stmt.status,
      justification: stmt.justification,
      impact_statement: stmt.impact_statement,
      action_statement: stmt.action_statement,
      timestamp,
    }));

    const rawPayload = JSON.stringify({ author, timestamp, vexStatements });
    const digest = createHash('sha256').update(rawPayload).digest('hex');

    return {
      '@context': 'https://openvex.dev/ns/v0.2.0',
      '@id': `https://vendorshield.internal/vex/${digest.slice(0, 16)}`,
      author,
      timestamp,
      version: 1,
      statements: vexStatements,
      documentDigestSha256: digest,
    };
  }

  /**
   * Reconciles an SBOM with a VEX document to determine actionable CISO risk score.
   */
  public static evaluateRiskPosture(
    sbom: CycloneDxDocument,
    vex: OpenVexDocument
  ): {
    totalComponents: number;
    totalVulnerabilitiesTracked: number;
    activeAffectedCount: number;
    notAffectedCount: number;
    isCompliantForEnterpriseDelivery: boolean;
  } {
    const knownPurls = new Set(sbom.components.map((c) => c.purl));
    let activeAffected = 0;
    let notAffected = 0;

    for (const stmt of vex.statements) {
      const touchesOurProducts = stmt.products.some((p) => knownPurls.has(p));
      if (!touchesOurProducts) continue;

      if (stmt.status === 'affected') {
        activeAffected++;
      } else if (stmt.status === 'not_affected' || stmt.status === 'fixed') {
        notAffected++;
      }
    }

    return {
      totalComponents: sbom.components.length,
      totalVulnerabilitiesTracked: vex.statements.length,
      activeAffectedCount: activeAffected,
      notAffectedCount: notAffected,
      isCompliantForEnterpriseDelivery: activeAffected === 0,
    };
  }
}
