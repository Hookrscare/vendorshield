import { describe, it, expect } from 'vitest';
import {
  Iso42001AimsAuditor,
  AimsAuditInput,
  AnnexAControlState,
} from './iso42001-aims-auditor';

describe('ISO/IEC 42001:2023 AIMS Auditor (QA-152)', () => {
  const sampleAnnexAControls: AnnexAControlState[] = [
    {
      controlId: 'A.2.1',
      name: 'AI Policy Alignment',
      category: 'Policies',
      implemented: true,
      evidenceProvided: true,
    },
    {
      controlId: 'A.3.1',
      name: 'AI Governance Committee Roles',
      category: 'Governance',
      implemented: true,
      evidenceProvided: true,
    },
    {
      controlId: 'A.6.2',
      name: 'Model Lifecycle Validation & Drift Telemetry',
      category: 'Lifecycle',
      implemented: true,
      evidenceProvided: true,
    },
    {
      controlId: 'A.7.1',
      name: 'Training Data Provenance & Lineage Tracking',
      category: 'Data',
      implemented: true,
      evidenceProvided: true,
    },
    {
      controlId: 'A.10.1',
      name: 'Third-Party AI Supplier Due Diligence',
      category: 'Suppliers',
      implemented: true,
      evidenceProvided: true,
    },
  ];

  it('evaluates fully compliant organization as CERTIFICATION_READY with Stage 1 & Stage 2 clearance', () => {
    const input: AimsAuditInput = {
      organizationName: 'Acme AI Systems',
      aiScopeDescription: 'Enterprise Generative AI Copilot and Multi-Modal Document Extraction Pipelines',
      hasFormalAiPolicy: true,
      hasAiGovernanceCommittee: true,
      hasDocumentedRiskAssessment: true,
      hasModelInventory: true,
      hasDataProvenanceTracking: true,
      hasContinuousModelMonitoring: true,
      hasAiIncidentResponsePlan: true,
      hasHumanInTheLoopOversight: true,
      hasThirdPartyAiSupplierReview: true,
      annexAControls: sampleAnnexAControls,
    };

    const result = Iso42001AimsAuditor.audit(input);

    expect(result.readinessScore).toBe(100);
    expect(result.certificationStatus).toBe('CERTIFICATION_READY');
    expect(result.stage1Readiness).toBe(true);
    expect(result.stage2Readiness).toBe(true);
    expect(result.correctiveActionPlan.length).toBe(0);
  });

  it('identifies critical P0 gaps when risk assessment and human oversight are missing', () => {
    const input: AimsAuditInput = {
      organizationName: 'StartUp Alpha',
      aiScopeDescription: 'Unscoped chatbot',
      hasFormalAiPolicy: false,
      hasAiGovernanceCommittee: false,
      hasDocumentedRiskAssessment: false,
      hasModelInventory: false,
      hasDataProvenanceTracking: false,
      hasContinuousModelMonitoring: false,
      hasAiIncidentResponsePlan: false,
      hasHumanInTheLoopOversight: false,
      hasThirdPartyAiSupplierReview: false,
      annexAControls: sampleAnnexAControls.map(c => ({ ...c, implemented: false })),
    };

    const result = Iso42001AimsAuditor.audit(input);

    expect(result.certificationStatus).toBe('NON_COMPLIANT');
    expect(result.stage1Readiness).toBe(false);
    expect(result.stage2Readiness).toBe(false);
    const criticalActions = result.correctiveActionPlan.filter(a => a.priority === 'P0_CRITICAL');
    expect(criticalActions.length).toBeGreaterThanOrEqual(3);
  });

  it('correctly audits partial Annex A implementation where evidence is pending', () => {
    const partialControls: AnnexAControlState[] = [
      {
        controlId: 'A.2.1',
        name: 'AI Policy',
        category: 'Policies',
        implemented: true,
        evidenceProvided: true,
      },
      {
        controlId: 'A.7.1',
        name: 'Data Provenance',
        category: 'Data',
        implemented: true,
        evidenceProvided: false, // missing evidence
      },
    ];

    const input: AimsAuditInput = {
      organizationName: 'MidCorp Labs',
      aiScopeDescription: 'Customer Service Retrieval-Augmented LLM Agent',
      hasFormalAiPolicy: true,
      hasAiGovernanceCommittee: true,
      hasDocumentedRiskAssessment: true,
      hasModelInventory: true,
      hasDataProvenanceTracking: true,
      hasContinuousModelMonitoring: true,
      hasAiIncidentResponsePlan: true,
      hasHumanInTheLoopOversight: true,
      hasThirdPartyAiSupplierReview: true,
      annexAControls: partialControls,
    };

    const result = Iso42001AimsAuditor.audit(input);
    expect(result.annexAImplementationRate).toBe(50);
    const lowAction = result.correctiveActionPlan.find(a => a.clauseOrControl === 'Control A.7.1');
    expect(lowAction).toBeDefined();
    expect(lowAction?.priority).toBe('P3_LOW');
  });
});
