/**
 * Regression Test Suite for QA-164: Enterprise AI Agent Autonomous Tool Access Delegation & OAuth Token Attestation Vault.
 * Part of VendorShield B2B SOC 2 & GDPR Sub-Processor Trust Hub.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  AgentToolDelegationAttestationVault,
  type ToolExecutionRequest
} from "./agent-tool-delegation-attestation-vault";

describe("QA-164: Agent Tool Delegation Attestation Vault", () => {
  let vault: AgentToolDelegationAttestationVault;

  beforeEach(() => {
    vault = new AgentToolDelegationAttestationVault();
  });

  it("issues a valid scoped delegation token and authorizes legitimate tool executions", () => {
    const grant = vault.issueDelegationGrant(
      "agy-security-scanner",
      "SUBPROC-CLOUDFLARE",
      ["view_file", "run_security_audit"],
      3600
    );

    expect(grant.tokenId).toMatch(/^tok_del_/);
    expect(grant.attestationSignature).toHaveLength(64);
    expect(grant.isRevoked).toBe(false);

    const authReq: ToolExecutionRequest = {
      tokenId: grant.tokenId,
      agentId: "agy-security-scanner",
      toolName: "run_security_audit",
      isMutatingAction: false
    };

    const verdict = vault.authorizeToolExecution(authReq);
    expect(verdict.isAllowed).toBe(true);
    expect(verdict.reason).toBe("AUTHORIZED_LEAST_PRIVILEGE_EXECUTION");
    expect(verdict.auditAttestationHash).toHaveLength(64);
  });

  it("rejects tool execution if the tool is not within the authorized scope", () => {
    const grant = vault.issueDelegationGrant(
      "agy-readonly-bot",
      "SUBPROC-AWS",
      ["view_file", "list_dir"],
      3600
    );

    const authReq: ToolExecutionRequest = {
      tokenId: grant.tokenId,
      agentId: "agy-readonly-bot",
      toolName: "drop_database_tables", // Malicious / out-of-scope!
      isMutatingAction: true
    };

    const verdict = vault.authorizeToolExecution(authReq);
    expect(verdict.isAllowed).toBe(false);
    expect(verdict.reason).toContain("UNAUTHORIZED_TOOL_SCOPE");
  });

  it("immediately denies access when a delegation token is revoked", () => {
    const grant = vault.issueDelegationGrant(
      "agy-compromised-agent",
      "SUBPROC-STRIPE",
      ["create_charge"],
      3600
    );

    vault.revokeDelegationGrant(grant.tokenId, "Suspected credential leakage in agent memory");

    const authReq: ToolExecutionRequest = {
      tokenId: grant.tokenId,
      agentId: "agy-compromised-agent",
      toolName: "create_charge",
      isMutatingAction: true
    };

    const verdict = vault.authorizeToolExecution(authReq);
    expect(verdict.isAllowed).toBe(false);
    expect(verdict.reason).toBe("TOKEN_EXPLICITLY_REVOKED");
  });
});
