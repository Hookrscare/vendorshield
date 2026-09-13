import { describe, it, expect } from 'vitest';
import {
  EnterpriseCycloneDxOpenVexEngine,
  SbomComponent,
} from './enterprise-cyclonedx-openvex-engine';

describe('EnterpriseCycloneDxOpenVexEngine (QA-166)', () => {
  const sampleComponents: SbomComponent[] = [
    {
      name: 'fast-json-patch',
      version: '3.1.1',
      purl: 'pkg:npm/fast-json-patch@3.1.1',
      type: 'library',
      sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    },
    {
      name: 'jose',
      version: '5.2.0',
      purl: 'pkg:npm/jose@5.2.0',
      type: 'library',
      sha256: 'a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e',
    },
  ];

  it('generates a compliant CycloneDX 1.5 JSON SBOM document', () => {
    const sbom = EnterpriseCycloneDxOpenVexEngine.generateCycloneDxSbom(
      'VendorShield Trust Hub',
      '2.14.0',
      sampleComponents
    );

    expect(sbom.bomFormat).toBe('CycloneDX');
    expect(sbom.specVersion).toBe('1.5');
    expect(sbom.serialNumber).toMatch(/^urn:uuid:[a-f0-9-]+$/);
    expect(sbom.components.length).toBe(2);
    expect(sbom.components[0].purl).toBe('pkg:npm/fast-json-patch@3.1.1');
  });

  it('generates OpenVEX exploitability document with SHA-256 digest', () => {
    const vex = EnterpriseCycloneDxOpenVexEngine.generateOpenVexDocument(
      'VendorShield Security Response Team',
      [
        {
          vulnerability: 'CVE-2026-10992',
          purl: 'pkg:npm/fast-json-patch@3.1.1',
          status: 'not_affected',
          justification: 'vulnerable_code_not_in_execute_path',
          impact_statement: 'Fast JSON patch is only used for server-side trusted configuration diffs without user prototype pollution vector.',
        },
      ]
    );

    expect(vex['@context']).toBe('https://openvex.dev/ns/v0.2.0');
    expect(vex.statements.length).toBe(1);
    expect(vex.statements[0].status).toBe('not_affected');
    expect(vex.statements[0].justification).toBe('vulnerable_code_not_in_execute_path');
    expect(vex.documentDigestSha256).toBeDefined();
    expect(vex.documentDigestSha256?.length).toBe(64);
  });

  it('correctly evaluates enterprise risk posture when all CVEs are mitigated via VEX', () => {
    const sbom = EnterpriseCycloneDxOpenVexEngine.generateCycloneDxSbom(
      'VendorShield Trust Hub',
      '2.14.0',
      sampleComponents
    );

    const vex = EnterpriseCycloneDxOpenVexEngine.generateOpenVexDocument(
      'VendorShield Security Operations',
      [
        {
          vulnerability: 'CVE-2026-10992',
          purl: 'pkg:npm/fast-json-patch@3.1.1',
          status: 'not_affected',
          justification: 'inline_mitigations_already_exist',
        },
      ]
    );

    const posture = EnterpriseCycloneDxOpenVexEngine.evaluateRiskPosture(sbom, vex);
    expect(posture.totalComponents).toBe(2);
    expect(posture.totalVulnerabilitiesTracked).toBe(1);
    expect(posture.activeAffectedCount).toBe(0);
    expect(posture.notAffectedCount).toBe(1);
    expect(posture.isCompliantForEnterpriseDelivery).toBe(true);
  });

  it('flags non-compliance if an unmitigated affected vulnerability touches an SBOM component', () => {
    const sbom = EnterpriseCycloneDxOpenVexEngine.generateCycloneDxSbom(
      'VendorShield Trust Hub',
      '2.14.0',
      sampleComponents
    );

    const vex = EnterpriseCycloneDxOpenVexEngine.generateOpenVexDocument(
      'VendorShield Security Operations',
      [
        {
          vulnerability: 'CVE-2026-99999',
          purl: 'pkg:npm/jose@5.2.0',
          status: 'affected',
          action_statement: 'Patching release scheduled within 24h SLA window.',
        },
      ]
    );

    const posture = EnterpriseCycloneDxOpenVexEngine.evaluateRiskPosture(sbom, vex);
    expect(posture.activeAffectedCount).toBe(1);
    expect(posture.isCompliantForEnterpriseDelivery).toBe(false);
  });
});
