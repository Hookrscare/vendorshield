/**
 * src/lib/nist-csf-governance-mapper.regression.test.ts
 * Regression tests for QA-137: Automated NIST CSF 2.0 Governance & Organizational Context Mapping Engine.
 */

import { describe, it, expect } from "vitest";
import { NistCsfGovernanceMapper, NistControlEvaluation } from "./nist-csf-governance-mapper";

describe("QA-137: NIST CSF 2.0 Governance & Organizational Context Mapping Engine", () => {
  const mapper = new NistCsfGovernanceMapper();

  it("evaluates Tier 4 (Adaptive) enterprise vendor with comprehensive 6-function coverage", () => {
    const controls: NistControlEvaluation[] = [
      { categoryCode: "GV.OC", function: "GOVERN", title: "Organizational Context", implemented: true, score: 0.95, evidenceRefs: ["SEC-POL-01"] },
      { categoryCode: "GV.SC", function: "GOVERN", title: "Cybersecurity Supply Chain Risk", implemented: true, score: 0.90, evidenceRefs: ["SCRM-DOC-02"] },
      { categoryCode: "ID.AM", function: "IDENTIFY", title: "Asset Management", implemented: true, score: 0.92, evidenceRefs: ["CMDB-01"] },
      { categoryCode: "PR.DS", function: "PROTECT", title: "Data Security & AES-256", implemented: true, score: 0.98, evidenceRefs: ["KMS-KEY-01"] },
      { categoryCode: "DE.CM", function: "DETECT", title: "Continuous Monitoring & SIEM", implemented: true, score: 0.91, evidenceRefs: ["DATADOG-SIEM"] },
      { categoryCode: "RS.MA", function: "RESPOND", title: "Incident Management Runbooks", implemented: true, score: 0.88, evidenceRefs: ["IR-PLAYBOOK"] },
      { categoryCode: "RC.RP", function: "RECOVER", title: "Disaster Recovery Execution", implemented: true, score: 0.90, evidenceRefs: ["DR-TEST-2026"] }
    ];

    const result = mapper.evaluatePosture("vendor-aws-cloud", controls);

    expect(result.overallScore).toBeGreaterThanOrEqual(90);
    expect(result.implementationTier).toBe(4);
    expect(result.supplyChainRiskLevel).toBe("LOW");
    expect(result.unmetControls.length).toBe(0);
    expect(result.attestationToken).toHaveLength(64);
    expect(result.functionBreakdown.GOVERN.score).toBeGreaterThanOrEqual(90);
  });

  it("correctly identifies Tier 1 (Partial) with elevated supply chain risk when Govern is deficient", () => {
    const deficientControls: NistControlEvaluation[] = [
      { categoryCode: "GV.SC", function: "GOVERN", title: "Supply Chain Risk Management", implemented: false, score: 0.20, evidenceRefs: [] },
      { categoryCode: "PR.DS", function: "PROTECT", title: "Basic TLS", implemented: true, score: 0.50, evidenceRefs: ["CERT-01"] },
      { categoryCode: "DE.CM", function: "DETECT", title: "Ad-hoc Log Review", implemented: false, score: 0.30, evidenceRefs: [] }
    ];

    const result = mapper.evaluatePosture("vendor-legacy-saas", deficientControls);

    expect(result.overallScore).toBeLessThan(50);
    expect(result.implementationTier).toBe(1);
    expect(result.supplyChainRiskLevel).toBe("CRITICAL");
    expect(result.unmetControls).toContain("GV.SC");
    expect(result.unmetControls).toContain("PR.DS");
  });

  it("handles empty control set safely with fallback critical tier", () => {
    const result = mapper.evaluatePosture("vendor-unvetted", []);

    expect(result.overallScore).toBe(0);
    expect(result.implementationTier).toBe(1);
    expect(result.supplyChainRiskLevel).toBe("CRITICAL");
    expect(result.attestationToken).toHaveLength(64);
  });
});
