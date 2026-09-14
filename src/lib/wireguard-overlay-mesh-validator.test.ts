import { describe, it, expect } from 'vitest';
import {
  WireguardOverlayMeshValidator,
  WireGuardPeerConfig
} from './wireguard-overlay-mesh-validator';

describe('QA-192: WireGuard Overlay Network Mesh Validator', () => {
  it('confirms healthy authenticated WireGuard mesh topology', () => {
    const peers: WireGuardPeerConfig[] = [
      {
        peerId: 'peer_auth0_gateway',
        vendorName: 'Auth0 Identity',
        peerPublicKey: 'fA2b/xYz1234567890abcdefghijklmnopqrstuvw=',
        allowedIps: ['10.200.1.10/32'],
        endpoint: '198.51.100.15:51820',
        latestHandshakeAgeSeconds: 42,
        rxBytes: 1540000,
        txBytes: 1210000,
        persistentKeepaliveSeconds: 25
      },
      {
        peerId: 'peer_datadog_collector',
        vendorName: 'Datadog APM',
        peerPublicKey: 'pQ9r/uVw0987654321fedcba0987654321fedcba987=',
        allowedIps: ['10.200.1.20/32'],
        endpoint: '198.51.100.25:51820',
        latestHandshakeAgeSeconds: 15,
        rxBytes: 890000,
        txBytes: 740000,
        persistentKeepaliveSeconds: 25
      }
    ];

    const res = WireguardOverlayMeshValidator.validateMeshPeers(peers);

    expect(res.isMeshCompliant).toBe(true);
    expect(res.status).toBe('OVERLAY_MESH_HEALTHY_AUTHENTICATED');
    expect(res.affectedPeers.length).toBe(0);
  });

  it('detects CIDR collision between conflicting peer definitions', () => {
    const peers: WireGuardPeerConfig[] = [
      {
        peerId: 'peer_node_a',
        vendorName: 'Vendor A',
        peerPublicKey: 'pubkeyA==',
        allowedIps: ['10.200.5.1/32'],
        endpoint: '1.1.1.1:51820',
        latestHandshakeAgeSeconds: 10,
        rxBytes: 100,
        txBytes: 100,
        persistentKeepaliveSeconds: 25
      },
      {
        peerId: 'peer_node_b',
        vendorName: 'Vendor B',
        peerPublicKey: 'pubkeyB==',
        allowedIps: ['10.200.5.1/32'], // Duplicate CIDR!
        endpoint: '2.2.2.2:51820',
        latestHandshakeAgeSeconds: 10,
        rxBytes: 100,
        txBytes: 100,
        persistentKeepaliveSeconds: 25
      }
    ];

    const res = WireguardOverlayMeshValidator.validateMeshPeers(peers);

    expect(res.isMeshCompliant).toBe(false);
    expect(res.status).toBe('CIDR_MICROSEGMENTATION_COLLISION_DETECTED');
    expect(res.affectedPeers).toContain('peer_node_a');
    expect(res.affectedPeers).toContain('peer_node_b');
  });

  it('flags stale peer with handshake timeout exceeding 180s', () => {
    const peers: WireGuardPeerConfig[] = [
      {
        peerId: 'peer_stale_backup',
        vendorName: 'Snowflake Ingestion',
        peerPublicKey: 'pubkeyC==',
        allowedIps: ['10.200.9.1/32'],
        endpoint: '3.3.3.3:51820',
        latestHandshakeAgeSeconds: 320, // Expired handshake
        rxBytes: 500,
        txBytes: 500,
        persistentKeepaliveSeconds: 25
      }
    ];

    const res = WireguardOverlayMeshValidator.validateMeshPeers(peers);

    expect(res.isMeshCompliant).toBe(false);
    expect(res.status).toBe('CRITICAL_HANDSHAKE_TIMEOUT_STALE_PEER');
    expect(res.affectedPeers).toContain('peer_stale_backup');
  });
});
