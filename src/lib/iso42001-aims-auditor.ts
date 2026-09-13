/**
 * ISO/IEC 42001:2023 Artificial Intelligence Management System (AIMS) Auditor
 * Evaluates organizational readiness, Clause 4-10 management system alignment,
 * Annex A AI control implementation, and generates automated Corrective Action Plans (CAP).
 */

export type AimsCertificationStatus =
  | 'CERTIFICATION_READY'
  | 'SUBSTANTIAL_ALIGNMENT'
  | 'MAJOR_NON_CONFORMITIES'
  | 'NON_COMPLIANT';

export type ActionPriority = 'P0_CRITICAL' | 'P1_HIGH' | 'P2_MEDIUM' | 'P3_LOW';

export interface AnnexAControlState {
  controlId: string;
  name: string;
  category: 'Policies' | 'Governance' | 'Resources' | 'Impact' | 'Lifecycle' | 'Data' | 'Transparency' | 'Operations' | 'Suppliers';
  implemented: boolean;
  evidenceProvided: boolean;
  notes?: string;
}

export interface AimsAuditInput {
  organizationName: string;
  aiScopeDescription: string;
  hasFormalAiPolicy: boolean;
  hasAiGovernanceCommittee: boolean;
  hasDocumentedRiskAssessment: boolean;
  hasModelInventory: boolean;
  hasDataProvenanceTracking: boolean;
  hasContinuousModelMonitoring: boolean;
  hasAiIncidentResponsePlan: boolean;
  hasHumanInTheLoopOversight: boolean;
  hasThirdPartyAiSupplierReview: boolean;
  annexAControls: AnnexAControlState[];
}

export interface CorrectiveActionItem {
  id: string;
  clauseOrControl: string;
  description: string;
  priority: ActionPriority;
  remediationRecommendation: string;
}

export interface AimsAuditResult {
  organizationName: string;
  readinessScore: number; // 0 - 100
  certificationStatus: AimsCertificationStatus;
  clauseScores: {
    clause4_Context: number;
    clause5_Leadership: number;
    clause6_Planning: number;
    clause7_Support: number;
    clause8_Operation: number;
    clause9_Evaluation: number;
    clause10_Improvement: number;
  };
  annexAImplementationRate: number; // 0 - 100
  totalControlsEvaluated: number;
  implementedControlsCount: number;
  correctiveActionPlan: CorrectiveActionItem[];
  stage1Readiness: boolean;
  stage2Readiness: boolean;
  auditedAt: string;
}

export class Iso42001AimsAuditor {
  public static audit(input: AimsAuditInput): AimsAuditResult {
    const actions: CorrectiveActionItem[] = [];
    let actionCounter = 1;

    const addAction = (
      clauseOrControl: string,
      description: string,
      priority: ActionPriority,
      recommendation: string
    ) => {
      actions.push({
        id: `CAP-${String(actionCounter++).padStart(3, '0')}`,
        clauseOrControl,
        description,
        priority,
        remediationRecommendation: recommendation,
      });
    };

    // Clause 4: Context
    let c4 = 0;
    if (input.aiScopeDescription && input.aiScopeDescription.trim().length >= 20) {
      c4 += 50;
    } else {
      addAction(
        'Clause 4.3',
        'AI Scope statement is missing or insufficiently detailed.',
        'P1_HIGH',
        'Define a clear, bounded scope for the AI Management System including all in-scope model pipelines and business units.'
      );
    }
    if (input.hasModelInventory) {
      c4 += 50;
    } else {
      addAction(
        'Clause 4.1',
        'No centralized register of AI systems and algorithmic assets.',
        'P0_CRITICAL',
        'Establish an enterprise AI asset inventory tracking model versions, training sources, and deployment environments.'
      );
    }

    // Clause 5: Leadership
    let c5 = 0;
    if (input.hasFormalAiPolicy) {
      c5 += 50;
    } else {
      addAction(
        'Clause 5.2',
        'Formal AI ethics and governance policy is not formally documented.',
        'P0_CRITICAL',
        'Adopt and publish an executive-approved AI Policy detailing fairness, accountability, and regulatory compliance.'
      );
    }
    if (input.hasAiGovernanceCommittee) {
      c5 += 50;
    } else {
      addAction(
        'Clause 5.3',
        'No formal AI governance body or cross-functional oversight committee.',
        'P1_HIGH',
        'Charter an AI Ethics and Safety Committee with clear escalation pathways to the Board of Directors.'
      );
    }

    // Clause 6: Planning
    let c6 = 0;
    if (input.hasDocumentedRiskAssessment) {
      c6 += 100;
    } else {
      addAction(
        'Clause 6.1',
        'Documented AI risk assessment framework is missing.',
        'P0_CRITICAL',
        'Implement an algorithmic risk assessment matrix covering bias, hallucinations, privacy leaks, and safety failure modes.'
      );
    }

    // Clause 7: Support & Resources
    let c7 = input.hasDataProvenanceTracking ? 100 : 50;
    if (!input.hasDataProvenanceTracking) {
      addAction(
        'Clause 7.1',
        'Data provenance and resource traceability mechanisms are incomplete.',
        'P2_MEDIUM',
        'Maintain cryptographic hashes and lineage metadata for all fine-tuning and training datasets.'
      );
    }

    // Clause 8: Operation
    let c8 = 0;
    if (input.hasHumanInTheLoopOversight) c8 += 50;
    else {
      addAction(
        'Clause 8.1',
        'Operational human-in-the-loop (HITL) fail-safes are undefined.',
        'P0_CRITICAL',
        'Define explicit human override parameters and automated circuit breakers for high-consequence AI predictions.'
      );
    }
    if (input.hasThirdPartyAiSupplierReview) c8 += 50;
    else {
      addAction(
        'Clause 8.1 / A.10',
        'Third-party foundation model supplier risk due diligence is absent.',
        'P1_HIGH',
        'Conduct rigorous vendor audits on API providers (e.g., Anthropic, OpenAI) for data retention, training opt-out, and SOC 2 parity.'
      );
    }

    // Clause 9: Performance Evaluation
    let c9 = 0;
    if (input.hasContinuousModelMonitoring) {
      c9 += 100;
    } else {
      addAction(
        'Clause 9.1',
        'Automated real-time model drift and accuracy telemetry is missing.',
        'P1_HIGH',
        'Deploy continuous monitoring for input distribution shift, latency anomalies, and adversarial prompt spikes.'
      );
    }

    // Clause 10: Continual Improvement
    let c10 = 0;
    if (input.hasAiIncidentResponsePlan) {
      c10 += 100;
    } else {
      addAction(
        'Clause 10.2',
        'AI-specific incident response and disaster recovery plan is missing.',
        'P1_HIGH',
        'Formulate runbooks for model compromise, toxic output dissemination, and prompt-injection breaches.'
      );
    }

    // Annex A Controls Evaluation
    const totalControls = input.annexAControls.length;
    let implementedControls = 0;
    for (const ctrl of input.annexAControls) {
      if (ctrl.implemented && ctrl.evidenceProvided) {
        implementedControls++;
      } else if (!ctrl.implemented) {
        addAction(
          `Control ${ctrl.controlId}`,
          `Annex A Control ${ctrl.name} (${ctrl.category}) is not implemented.`,
          'P2_MEDIUM',
          `Implement control policies and operational safeguards for ${ctrl.name}.`
        );
      } else if (!ctrl.evidenceProvided) {
        addAction(
          `Control ${ctrl.controlId}`,
          `Evidence missing for implemented control: ${ctrl.name}.`,
          'P3_LOW',
          `Upload audit-ready evidentiary documentation for ${ctrl.name}.`
        );
      }
    }

    const annexARate = totalControls > 0 ? Math.round((implementedControls / totalControls) * 100) : 100;

    // Weighted Overall Score:
    // Management System Clauses (4-10): 60%
    // Annex A Controls: 40%
    const clausesAvg = (c4 + c5 + c6 + c7 + c8 + c9 + c10) / 7;
    const overallScore = Math.round(clausesAvg * 0.6 + annexARate * 0.4);

    let status: AimsCertificationStatus = 'NON_COMPLIANT';
    if (overallScore >= 90 && actions.every(a => a.priority !== 'P0_CRITICAL')) {
      status = 'CERTIFICATION_READY';
    } else if (overallScore >= 70 && actions.filter(a => a.priority === 'P0_CRITICAL').length <= 1) {
      status = 'SUBSTANTIAL_ALIGNMENT';
    } else if (overallScore >= 50) {
      status = 'MAJOR_NON_CONFORMITIES';
    } else {
      status = 'NON_COMPLIANT';
    }

    const stage1 = overallScore >= 70 && c4 >= 50 && c5 >= 50 && c6 >= 50;
    const stage2 = status === 'CERTIFICATION_READY';

    return {
      organizationName: input.organizationName,
      readinessScore: overallScore,
      certificationStatus: status,
      clauseScores: {
        clause4_Context: c4,
        clause5_Leadership: c5,
        clause6_Planning: c6,
        clause7_Support: c7,
        clause8_Operation: c8,
        clause9_Evaluation: c9,
        clause10_Improvement: c10,
      },
      annexAImplementationRate: annexARate,
      totalControlsEvaluated: totalControls,
      implementedControlsCount: implementedControls,
      correctiveActionPlan: actions,
      stage1Readiness: stage1,
      stage2Readiness: stage2,
      auditedAt: new Date().toISOString(),
    };
  }
}
