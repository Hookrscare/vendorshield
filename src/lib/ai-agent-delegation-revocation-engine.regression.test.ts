import { describe, it, expect } from 'vitest';
import {
  AgentDelegationRevocationEngine,
  DelegationTelemetryEvent,
  RevocationCertificate,
} from './ai-agent-delegation-revocation-engine';

describe('QA-156: Multi-Tenant AI Agent Autonomous Access Delegation Revocation Engine', () => {
  it('registers a delegation grant and allows authorized tool actions within policy boundaries', () => {
    const engine = new AgentDelegationRevocationEngine('test-secret-key-1');
    const grant = engine.registerGrant({
      grantId: 'grant-tenant-alpha-001',
      tenantId: 'tenant-alpha',
      agentId: 'agent-data-analyzer-v1',
      agentName: 'Autonomous Analytics Agent',
      grantedByUserId: 'usr-admin-101',
      authorizedScopes: ['read:analytics', 'export:csv'],
      permittedToolActions: ['query_database', 'render_chart'],
      allowedIpRanges: ['10.0.0.1', '10.0.0.2'],
      maxAnomalyThreshold: 70,
      ttlSeconds: 3600,
    });

    expect(grant.status).toBe('ACTIVE');
    expect(grant.cumulativeAnomalyScore).toBe(0);

    const validEvent: DelegationTelemetryEvent = {
      eventId: 'evt-001',
      grantId: 'grant-tenant-alpha-001',
      tenantId: 'tenant-alpha',
      agentId: 'agent-data-analyzer-v1',
      timestamp: new Date().toISOString(),
      toolActionRequested: 'query_database',
      targetResource: 'analytics_db.views',
      sourceIp: '10.0.0.1',
      scopeRequested: 'read:analytics',
    };

    const result = engine.evaluateAction(validEvent);
    expect(result.allowed).toBe(true);
    expect(result.currentStatus).toBe('ACTIVE');
    expect(result.newAnomalyScore).toBe(0);
    expect(result.revocationTriggered).toBe(false);
  });

  it('detects unpermitted tool action and trips autonomous revocation when anomaly threshold is exceeded', () => {
    const engine = new AgentDelegationRevocationEngine('test-secret-key-2');
    engine.registerGrant({
      grantId: 'grant-risk-test-002',
      tenantId: 'tenant-beta',
      agentId: 'agent-code-helper',
      agentName: 'Code Assistant Agent',
      grantedByUserId: 'usr-admin-102',
      authorizedScopes: ['read:repo'],
      permittedToolActions: ['read_file'],
      allowedIpRanges: ['192.168.1.100'],
      maxAnomalyThreshold: 60,
      ttlSeconds: 7200,
    });

    // 1. First suspicious action: unpermitted tool action (+40 anomaly)
    const event1: DelegationTelemetryEvent = {
      eventId: 'evt-101',
      grantId: 'grant-risk-test-002',
      tenantId: 'tenant-beta',
      agentId: 'agent-code-helper',
      timestamp: new Date().toISOString(),
      toolActionRequested: 'drop_database',
      targetResource: 'postgres.production',
      sourceIp: '192.168.1.100',
    };

    const result1 = engine.evaluateAction(event1);
    expect(result1.allowed).toBe(false);
    expect(result1.newAnomalyScore).toBe(40);
    expect(result1.revocationTriggered).toBe(false);

    // 2. Second suspicious action: scope escalation (+50 anomaly) -> Total 90 >= 60 -> Autonomous Revocation!
    const event2: DelegationTelemetryEvent = {
      eventId: 'evt-102',
      grantId: 'grant-risk-test-002',
      tenantId: 'tenant-beta',
      agentId: 'agent-code-helper',
      timestamp: new Date().toISOString(),
      toolActionRequested: 'read_file',
      targetResource: 'credentials.env',
      sourceIp: '192.168.1.100',
      scopeRequested: 'admin:super_user',
    };

    const result2 = engine.evaluateAction(event2);
    expect(result2.allowed).toBe(false);
    expect(result2.newAnomalyScore).toBe(90);
    expect(result2.revocationTriggered).toBe(true);
    expect(result2.currentStatus).toBe('REVOKED');
    expect(result2.certificate).toBeDefined();
    expect(result2.certificate?.reason).toBe('SCOPE_ESCALATION_ATTEMPT');

    // Verify cryptographic signature of the certificate
    const isValid = engine.verifyCertificate(result2.certificate!);
    expect(isValid).toBe(true);

    // Subsequent events immediately rejected
    const result3 = engine.evaluateAction({
      ...event1,
      eventId: 'evt-103',
      toolActionRequested: 'read_file',
    });
    expect(result3.allowed).toBe(false);
    expect(result3.currentStatus).toBe('REVOKED');
  });

  it('cascades revocation to child sub-agents when parent delegation is revoked', () => {
    const engine = new AgentDelegationRevocationEngine('test-secret-key-3');
    
    // Parent agent grant
    engine.registerGrant({
      grantId: 'grant-parent-001',
      tenantId: 'tenant-gamma',
      agentId: 'agent-lead-orchestrator',
      agentName: 'Lead Orchestrator Agent',
      grantedByUserId: 'usr-admin-103',
      authorizedScopes: ['manage:agents', 'read:data'],
      permittedToolActions: ['spawn_subagent', 'read_data'],
      maxAnomalyThreshold: 50,
      ttlSeconds: 3600,
    });

    // Sub-agent 1 spawned by parent
    engine.registerGrant({
      grantId: 'grant-sub-001',
      parentGrantId: 'grant-parent-001',
      tenantId: 'tenant-gamma',
      agentId: 'agent-sub-worker-1',
      agentName: 'Sub Worker 1',
      grantedByUserId: 'usr-admin-103',
      authorizedScopes: ['read:data'],
      permittedToolActions: ['read_data'],
      maxAnomalyThreshold: 50,
      ttlSeconds: 1800,
    });

    // Sub-agent 2 spawned by parent
    engine.registerGrant({
      grantId: 'grant-sub-002',
      parentGrantId: 'grant-parent-001',
      tenantId: 'tenant-gamma',
      agentId: 'agent-sub-worker-2',
      agentName: 'Sub Worker 2',
      grantedByUserId: 'usr-admin-103',
      authorizedScopes: ['read:data'],
      permittedToolActions: ['read_data'],
      maxAnomalyThreshold: 50,
      ttlSeconds: 1800,
    });

    expect(engine.getGrant('grant-sub-001')?.status).toBe('ACTIVE');
    expect(engine.getGrant('grant-sub-002')?.status).toBe('ACTIVE');

    // Revoke parent agent
    const parentCert = engine.executeRevocation(
      'grant-parent-001',
      'tenant-gamma',
      'ANOMALOUS_TOOL_EXECUTION',
      'AUTONOMOUS_ENGINE'
    );

    expect(parentCert.cascadedChildGrantsRevoked).toContain('grant-sub-001');
    expect(parentCert.cascadedChildGrantsRevoked).toContain('grant-sub-002');
    expect(engine.getGrant('grant-parent-001')?.status).toBe('REVOKED');
    expect(engine.getGrant('grant-sub-001')?.status).toBe('REVOKED');
    expect(engine.getGrant('grant-sub-002')?.status).toBe('REVOKED');
  });

  it('triggers emergency tenant kill-switch and validates SOC 2 audit logs', () => {
    const engine = new AgentDelegationRevocationEngine('test-secret-key-4');

    engine.registerGrant({
      grantId: 'grant-ks-1',
      tenantId: 'tenant-enterprise',
      agentId: 'agent-1',
      agentName: 'Agent 1',
      grantedByUserId: 'usr-admin',
      authorizedScopes: ['read'],
      permittedToolActions: ['read'],
      maxAnomalyThreshold: 80,
      ttlSeconds: 3600,
    });

    engine.registerGrant({
      grantId: 'grant-ks-2',
      tenantId: 'tenant-enterprise',
      agentId: 'agent-2',
      agentName: 'Agent 2',
      grantedByUserId: 'usr-admin',
      authorizedScopes: ['write'],
      permittedToolActions: ['write'],
      maxAnomalyThreshold: 80,
      ttlSeconds: 3600,
    });

    // Another tenant
    engine.registerGrant({
      grantId: 'grant-other-1',
      tenantId: 'tenant-other',
      agentId: 'agent-other',
      agentName: 'Other Agent',
      grantedByUserId: 'usr-other',
      authorizedScopes: ['read'],
      permittedToolActions: ['read'],
      maxAnomalyThreshold: 80,
      ttlSeconds: 3600,
    });

    const revokedCerts = engine.triggerTenantKillSwitch('tenant-enterprise', 'ciso-admin-99');
    expect(revokedCerts.length).toBe(2);
    expect(engine.getGrant('grant-ks-1')?.status).toBe('REVOKED');
    expect(engine.getGrant('grant-ks-2')?.status).toBe('REVOKED');
    expect(engine.getGrant('grant-other-1')?.status).toBe('ACTIVE'); // Isolated!

    const auditLogs = engine.getTenantAuditLogs('tenant-enterprise');
    expect(auditLogs.length).toBeGreaterThan(0);
    expect(auditLogs.some(l => l.event === 'TENANT_KILL_SWITCH_ENGAGED')).toBe(true);
  });
});
