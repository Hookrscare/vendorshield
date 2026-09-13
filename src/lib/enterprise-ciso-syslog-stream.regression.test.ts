import { describe, it, expect } from "vitest";
import {
  EnterpriseCisoSyslogStream,
  SyslogFacility,
  SyslogSeverity,
  CisoTelemetryEvent,
} from "./enterprise-ciso-syslog-stream";

describe("QA-163: Enterprise CISO Audit Telemetry Syslog Stream Regression Suite", () => {
  const secretKey = "test-ciso-hmac-master-key-32bytes-secret";

  it("calculates standard RFC 5424 priority accurately", () => {
    const stream = new EnterpriseCisoSyslogStream({ hmacSecretKey: secretKey });
    // Facility AUTHPRIV (10) * 8 + CRITICAL (2) = 82
    expect(stream.calculatePriority(SyslogFacility.AUTHPRIV, SyslogSeverity.CRITICAL)).toBe(82);
    // Facility SECURITY (13) * 8 + NOTICE (5) = 109
    expect(stream.calculatePriority(SyslogFacility.SECURITY, SyslogSeverity.NOTICE)).toBe(109);
  });

  it("formats compliant RFC 5424 syslog packets with structured data", () => {
    const stream = new EnterpriseCisoSyslogStream({
      hmacSecretKey: secretKey,
      hostname: "siem.enterprise.corp",
      appName: "vendorshield-audit",
    });

    const event: CisoTelemetryEvent = {
      eventId: "EVT-9001",
      facility: SyslogFacility.AUTHPRIV,
      severity: SyslogSeverity.WARNING,
      timestamp: "2026-09-13T08:00:00.000Z",
      structuredData: {
        tenantId: "tenant_acme_corp",
        actorId: "usr_sec_admin_42",
        action: "ROTATE_KMS_MASTER_KEY",
        soc2Control: "CC6.1",
        resourceId: "key_arn_aws_001",
        riskScore: 78,
      },
      message: "KMS master key rotation invoked via CISO emergency console",
    };

    const packet = stream.formatRfc5424(event);
    expect(packet.priority).toBe(SyslogFacility.AUTHPRIV * 8 + SyslogSeverity.WARNING);
    expect(packet.rawRfc5424).toContain("<84>1 2026-09-13T08:00:00.000Z siem.enterprise.corp vendorshield-audit");
    expect(packet.rawRfc5424).toContain('[cisoAudit@54321 tenantId="tenant_acme_corp" actorId="usr_sec_admin_42" action="ROTATE_KMS_MASTER_KEY" soc2Control="CC6.1" resourceId="key_arn_aws_001" riskScore="78"]');
    expect(packet.rawRfc5424).toContain("KMS master key rotation invoked via CISO emergency console");
    expect(packet.hmacSignature).toHaveLength(64);
  });

  it("verifies tamper-evident cryptographic hash chains and rejects altered messages", () => {
    const stream = new EnterpriseCisoSyslogStream({ hmacSecretKey: secretKey });

    const initialHash = "0000000000000000000000000000000000000000000000000000000000000000";

    const event1: CisoTelemetryEvent = {
      eventId: "EVT-100",
      facility: SyslogFacility.SECURITY,
      severity: SyslogSeverity.INFORMATIONAL,
      structuredData: {
        tenantId: "tenant_fintech",
        actorId: "officer_alice",
        action: "EXPORT_SOC2_EVIDENCE",
        soc2Control: "CC5.2",
      },
      message: "Evidence package generated for external auditor review",
    };

    const packet1 = stream.formatRfc5424(event1);
    expect(stream.verifyPacket(packet1, initialHash)).toBe(true);

    // Tampered message
    const tamperedPacket = {
      ...packet1,
      rawRfc5424: packet1.rawRfc5424.replace("officer_alice", "malicious_hacker"),
    };
    expect(stream.verifyPacket(tamperedPacket, initialHash)).toBe(false);
  });

  it("buffers telemetry events and flushes cleanly", () => {
    const stream = new EnterpriseCisoSyslogStream({ hmacSecretKey: secretKey, maxBufferSize: 10 });

    for (let i = 0; i < 5; i++) {
      stream.formatRfc5424({
        eventId: `EVT-${i}`,
        facility: SyslogFacility.AUTH,
        severity: SyslogSeverity.INFORMATIONAL,
        structuredData: {
          tenantId: "tenant_test",
          actorId: `usr_${i}`,
          action: "LOGIN",
          soc2Control: "CC6.2",
        },
        message: `User ${i} authenticated successfully`,
      });
    }

    expect(stream.getBufferSize()).toBe(5);
    const flushed = stream.flushBuffer();
    expect(flushed.length).toBe(5);
    expect(stream.getBufferSize()).toBe(0);
  });
});
