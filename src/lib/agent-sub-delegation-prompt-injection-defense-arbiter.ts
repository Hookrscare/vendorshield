/**
 * src/lib/agent-sub-delegation-prompt-injection-defense-arbiter.ts
 * QA-187: Autonomous Third-Party AI Agent Sub-Delegation Prompt Injection Defense Arbiter.
 * Part of VendorShield Autonomous Enterprise Security & AI Governance Suite.
 *
 * Enforces zero-trust privilege boundaries on autonomous multi-agent delegations,
 * detecting indirect prompt injection attacks, delimiter escapes, privilege escalation,
 * and malicious tool-call hijacking with SHA-256 verifiable attestation seals.
 */

import { createHash } from "crypto";

export type AgentDelegationAction =
  | "PERMIT_DELEGATION"
  | "SANITIZE_AND_RESTRICT"
  | "QUARANTINE_PROMPT_INJECTION"
  | "REVOKE_AGENT_SESSION";

export interface AgentSubDelegationRequest {
  parentAgentId: string;
  subAgentId: string;
  targetTool: string;
  allowedToolCapabilities: string[];
  promptPayload: string;
  canarySecretToken?: string;
}

export interface AgentDelegationArbitrationResult {
  parentAgentId: string;
  subAgentId: string;
  action: AgentDelegationAction;
  riskScore: number; // 0.0 (safe) to 1.0 (confirmed adversarial attack)
  detectedAttackSignatures: string[];
  sanitizedPayload?: string;
  isDelegationAuthorized: boolean;
  delegationAuditSealSha256: string;
}

export class AgentSubDelegationPromptInjectionDefenseArbiter {
  // Common prompt injection attack patterns & system prompt delimiter escapes
  private static readonly INJECTION_PATTERNS: Array<{ id: string; regex: RegExp; weight: number }> = [
    { id: "SYSTEM_DELIMITER_OVERRIDE", regex: /(<\|im_start\|>|<system>|\[INST\]|<<SYS>>|\bSystem:\s*You are now\b)/i, weight: 0.95 },
    { id: "INSTRUCTION_IGNORE_ESCAPE", regex: /\b(ignore (all )?previous instructions|disregard prior directives|forget all previous rules)\b/i, weight: 0.90 },
    { id: "PRIVILEGE_ESCALATION_OVERRIDE", regex: /\b(grant admin privileges|elevate permissions|bypass role boundaries|act as root)\b/i, weight: 0.85 },
    { id: "EXFILTRATION_DATA_STEAL", regex: /\b(exfiltrate|send all secrets to|export env vars|dump api keys)\b/i, weight: 0.88 },
    { id: "TOOL_JAILBREAK_CALL", regex: /\b(call_tool_unrestricted|eval\(|exec\(|execute_sql_raw)\b/i, weight: 0.92 },
  ];

  /**
   * Arbitrates a sub-agent tool delegation request before execution.
   */
  public arbitrateDelegation(request: AgentSubDelegationRequest): AgentDelegationArbitrationResult {
    const attacksDetected: string[] = [];
    let cumulativeRisk = 0.05;

    // 1. Check for prompt injection patterns
    for (const pattern of AgentSubDelegationPromptInjectionDefenseArbiter.INJECTION_PATTERNS) {
      if (pattern.regex.test(request.promptPayload)) {
        attacksDetected.push(pattern.id);
        cumulativeRisk = Math.max(cumulativeRisk, pattern.weight);
      }
    }

    // 2. Privilege Boundary Validation: Sub-agent can only invoke tools in allowed capabilities
    const isToolAllowed = request.allowedToolCapabilities.includes(request.targetTool);
    if (!isToolAllowed) {
      attacksDetected.push("UNAUTHORIZED_TOOL_CAPABILITY_ESCALATION");
      cumulativeRisk = Math.max(cumulativeRisk, 0.95);
    }

    // 3. Canary Token Integrity Check: If payload leaked or tampered with the canary
    if (request.canarySecretToken && request.promptPayload.includes(request.canarySecretToken)) {
      attacksDetected.push("CANARY_TOKEN_LEAK_DETECTED");
      cumulativeRisk = 1.0;
    }

    // 4. Action determination
    let action: AgentDelegationAction = "PERMIT_DELEGATION";
    let isAuthorized = true;
    let sanitized: string | undefined = undefined;

    if (cumulativeRisk >= 0.90) {
      action = attacksDetected.includes("CANARY_TOKEN_LEAK_DETECTED")
        ? "REVOKE_AGENT_SESSION"
        : "QUARANTINE_PROMPT_INJECTION";
      isAuthorized = false;
    } else if (cumulativeRisk >= 0.50) {
      action = "SANITIZE_AND_RESTRICT";
      isAuthorized = true;
      // Strip potentially hazardous substrings
      sanitized = request.promptPayload.replace(/(ignore\s+previous|disregard\s+prior)/gi, "[REDACTED]");
    }

    const payloadSeal = `${request.parentAgentId}:${request.subAgentId}:${request.targetTool}:${action}:${cumulativeRisk.toFixed(2)}`;
    const delegationAuditSealSha256 = createHash("sha256").update(payloadSeal).digest("hex");

    return {
      parentAgentId: request.parentAgentId,
      subAgentId: request.subAgentId,
      action,
      riskScore: parseFloat(cumulativeRisk.toFixed(2)),
      detectedAttackSignatures: attacksDetected,
      sanitizedPayload: sanitized,
      isDelegationAuthorized: isAuthorized,
      delegationAuditSealSha256,
    };
  }
}
