/**
 * QA-157: Automated Zero-Trust AI Agent Session Ephemeral Key Rotation & Attestation Vault
 * 
 * Provides automated, zero-trust cryptographic session credential generation, rotation,
 * and tamper-evident audit attestation for enterprise autonomous AI agents.
 * 
 * Capabilities:
 * 1. Ephemeral Session Keys: Generates time-bounded HMAC session secrets with max operation quotas.
 * 2. Automatic Key Rotation: Triggers deterministic key rollover when session TTL or max operation count expires.
 * 3. Cryptographic Proof Attestation: Binds each operation with a signed HMAC token.
 * 4. Immutable Rotation Chain: Chains every rotated key into a cryptographic hash ledger.
 * 5. Instant Kill-Switch: Immediately invalidates active ephemeral keys upon security alert.
 */

import { createHmac, randomBytes, createHash } from 'crypto';

export interface EphemeralSessionKey {
  sessionId: string;
  agentId: string;
  tenantId: string;
  keySecret: string;
  issuedAt: number; // epoch ms
  expiresAt: number; // epoch ms
  maxOperations: number;
  operationCount: number;
  status: 'ACTIVE' | 'ROTATED' | 'REVOKED';
  previousKeyHash?: string;
  rotationHash: string;
}

export interface SessionAttestationProof {
  sessionId: string;
  agentId: string;
  tenantId: string;
  actionId: string;
  timestamp: number;
  operationIndex: number;
  signature: string;
}

export class AgentSessionEphemeralKeyVault {
  private activeSessions: Map<string, EphemeralSessionKey> = new Map();
  private sessionHistory: EphemeralSessionKey[] = [];
  private readonly defaultTtlMs: number;
  private readonly defaultMaxOperations: number;

  constructor(defaultTtlSeconds: number = 900, defaultMaxOperations: number = 100) {
    this.defaultTtlMs = defaultTtlSeconds * 1000;
    this.defaultMaxOperations = defaultMaxOperations;
  }

  /**
   * Initializes a new ephemeral session key for an AI agent.
   */
  public createSession(agentId: string, tenantId: string, customTtlSeconds?: number, customMaxOps?: number): EphemeralSessionKey {
    const sessionId = `sess_${randomBytes(12).toString('hex')}`;
    const keySecret = randomBytes(32).toString('hex');
    const now = Date.now();
    const ttlMs = (customTtlSeconds ?? 900) * 1000;
    const maxOps = customMaxOps ?? this.defaultMaxOperations;

    const rotationHash = createHash('sha256')
      .update(`${sessionId}:${agentId}:${tenantId}:${now}:${keySecret}`)
      .digest('hex');

    const sessionKey: EphemeralSessionKey = {
      sessionId,
      agentId,
      tenantId,
      keySecret,
      issuedAt: now,
      expiresAt: now + ttlMs,
      maxOperations: maxOps,
      operationCount: 0,
      status: 'ACTIVE',
      rotationHash,
    };

    this.activeSessions.set(sessionId, sessionKey);
    return { ...sessionKey };
  }

  /**
   * Attests and signs an action performed under the active ephemeral session.
   * Auto-rotates if operation quota or TTL limit is reached.
   */
  public attestAction(sessionId: string, actionId: string): SessionAttestationProof {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found.`);
    }

    if (session.status !== 'ACTIVE') {
      throw new Error(`Session ${sessionId} is ${session.status}.`);
    }

    const now = Date.now();
    if (now >= session.expiresAt) {
      this.rotateSession(sessionId, 'TTL_EXPIRED');
      throw new Error(`Session ${sessionId} expired and has been rotated.`);
    }

    session.operationCount += 1;
    const opIndex = session.operationCount;

    const signature = createHmac('sha256', session.keySecret)
      .update(`${session.tenantId}:${session.agentId}:${sessionId}:${actionId}:${opIndex}:${now}`)
      .digest('hex');

    // Check if max operations reached; if so, trigger rotation
    if (session.operationCount >= session.maxOperations) {
      this.rotateSession(sessionId, 'QUOTA_EXHAUSTED');
    }

    return {
      sessionId,
      agentId: session.agentId,
      tenantId: session.tenantId,
      actionId,
      timestamp: now,
      operationIndex: opIndex,
      signature,
    };
  }

  /**
   * Verifies an attestation proof against the session secret.
   */
  public verifyAttestation(proof: SessionAttestationProof): boolean {
    const session = this.activeSessions.get(proof.sessionId) ||
      this.sessionHistory.find((s) => s.sessionId === proof.sessionId);

    if (!session) return false;

    const expectedSignature = createHmac('sha256', session.keySecret)
      .update(`${proof.tenantId}:${proof.agentId}:${proof.sessionId}:${proof.actionId}:${proof.operationIndex}:${proof.timestamp}`)
      .digest('hex');

    return expectedSignature === proof.signature;
  }

  /**
   * Rotates an active session, chaining the previous key hash into the new key.
   */
  public rotateSession(sessionId: string, reason: string = 'SCHEDULED_ROTATION'): EphemeralSessionKey {
    const current = this.activeSessions.get(sessionId);
    if (!current) {
      throw new Error(`Cannot rotate: session ${sessionId} not found.`);
    }

    current.status = 'ROTATED';
    this.sessionHistory.push({ ...current });
    this.activeSessions.delete(sessionId);

    const newSecret = randomBytes(32).toString('hex');
    const now = Date.now();
    const newSessionId = `sess_${randomBytes(12).toString('hex')}`;

    const newRotationHash = createHash('sha256')
      .update(`${current.rotationHash}:${newSessionId}:${now}:${newSecret}:${reason}`)
      .digest('hex');

    const nextSession: EphemeralSessionKey = {
      sessionId: newSessionId,
      agentId: current.agentId,
      tenantId: current.tenantId,
      keySecret: newSecret,
      issuedAt: now,
      expiresAt: now + this.defaultTtlMs,
      maxOperations: current.maxOperations,
      operationCount: 0,
      status: 'ACTIVE',
      previousKeyHash: current.rotationHash,
      rotationHash: newRotationHash,
    };

    this.activeSessions.set(newSessionId, nextSession);
    return { ...nextSession };
  }

  /**
   * Revokes an active session immediately.
   */
  public revokeSession(sessionId: string): boolean {
    const session = this.activeSessions.get(sessionId);
    if (!session) return false;

    session.status = 'REVOKED';
    this.sessionHistory.push({ ...session });
    this.activeSessions.delete(sessionId);
    return true;
  }

  public getSession(sessionId: string): EphemeralSessionKey | undefined {
    return this.activeSessions.get(sessionId);
  }

  public getRotationLedger(): EphemeralSessionKey[] {
    return [...this.sessionHistory];
  }
}
