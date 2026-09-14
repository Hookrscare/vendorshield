import { describe, it, expect } from 'vitest';
import {
  EbpfNetworkExfiltrationSentinel,
  EbpfSocketEvent
} from './ebpf-network-exfiltration-sentinel';

describe('QA-194: eBPF Network Packet Interceptor & Exfiltration Sentinel', () => {
  it('clears legitimate authorized egress traffic with verified SNI', () => {
    const event: EbpfSocketEvent = {
      containerId: 'subproc_worker_prod_4',
      subprocessorId: 'subproc_aws_eu',
      destinationIp: '52.95.120.1',
      destinationPort: 443,
      bytesSent: 4096,
      tlsSni: 's3.eu-central-1.amazonaws.com',
      isApprovedEgressHost: true,
      isKnownThreatC2: false
    };

    const res = EbpfNetworkExfiltrationSentinel.inspectSocketEvent(event);

    expect(res.isAllowed).toBe(true);
    expect(res.status).toBe('EBPF_EGRESS_TRAFFIC_CLEARED');
    expect(res.actionTaken).toBe('PASS');
  });

  it('blocks covert C2 communication and triggers kernel socket kill', () => {
    const event: EbpfSocketEvent = {
      containerId: 'compromised_node_9',
      subprocessorId: 'subproc_analytics',
      destinationIp: '185.220.101.5',
      destinationPort: 4444,
      bytesSent: 1024,
      tlsSni: '',
      isApprovedEgressHost: false,
      isKnownThreatC2: true
    };

    const res = EbpfNetworkExfiltrationSentinel.inspectSocketEvent(event);

    expect(res.isAllowed).toBe(false);
    expect(res.status).toBe('CRITICAL_C2_DATA_EXFILTRATION_BLOCKED');
    expect(res.actionTaken).toBe('DROP_SOCKET_AND_ISOLATE');
    expect(res.forensicAlert).toContain('EBPF KERNEL SHUTDOWN');
  });

  it('quarantines unauthorized high-volume data exfiltration burst', () => {
    const event: EbpfSocketEvent = {
      containerId: 'rogue_subproc_extractor',
      subprocessorId: 'subproc_external',
      destinationIp: '198.51.100.22',
      destinationPort: 443,
      bytesSent: 250 * 1024 * 1024, // 250 Megabytes!
      tlsSni: 'unapproved-file-drop.com',
      isApprovedEgressHost: false,
      isKnownThreatC2: false
    };

    const res = EbpfNetworkExfiltrationSentinel.inspectSocketEvent(event);

    expect(res.isAllowed).toBe(false);
    expect(res.status).toBe('ANOMALOUS_HIGH_VOLUME_BURST_QUARANTINED');
    expect(res.actionTaken).toBe('RATE_LIMIT_AND_QUARANTINE');
    expect(res.forensicAlert).toContain('BURST ANOMALY');
  });
});
