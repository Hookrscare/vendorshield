import { describe, it, expect } from 'vitest';
import {
  BridgeDeckGprVelocityAnalyzer,
  GprBridgeDeckScan
} from './bridge-deck-gpr-velocity-analyzer';

describe('SNAP-82: Bridge Deck GPR Wave Velocity Analyzer', () => {
  it('confirms AASHTO compliant rebar cover depth on cured concrete deck', () => {
    // Er = 9.0 -> velocity = 300 / 3 = 100 mm/ns
    // TWTT = 1.2 ns -> depth = (100 * 1.2) / 2 = 60 mm
    const scan: GprBridgeDeckScan = {
      scanId: 'span_2_lane_east_01',
      bridgeComponent: 'Span 2 Driving Surface',
      dielectricPermittivity: 9.0,
      twoWayTravelTimeNs: 1.2,
      minDesignCoverMm: 50.0,
      reflectionAmplitudeDb: -6.5
    };

    const res = BridgeDeckGprVelocityAnalyzer.analyzeDeckScan(scan);

    expect(res.isCompliant).toBe(true);
    expect(res.status).toBe('REBAR_COVER_DEPTH_AASHTO_COMPLIANT');
    expect(res.calculatedVelocityMmPerNs).toBe(100.0);
    expect(res.calculatedCoverDepthMm).toBe(60.0);
  });

  it('detects inadequate shallow rebar cover vulnerable to spalling', () => {
    // Er = 9.0 -> velocity = 100 mm/ns
    // TWTT = 0.6 ns -> depth = (100 * 0.6) / 2 = 30 mm (< 50mm min)
    const scan: GprBridgeDeckScan = {
      scanId: 'abutment_joint_shallow_04',
      bridgeComponent: 'Abutment Approach Slab',
      dielectricPermittivity: 9.0,
      twoWayTravelTimeNs: 0.6,
      minDesignCoverMm: 50.0,
      reflectionAmplitudeDb: -8.0
    };

    const res = BridgeDeckGprVelocityAnalyzer.analyzeDeckScan(scan);

    expect(res.isCompliant).toBe(false);
    expect(res.status).toBe('INADEQUATE_COVER_CORROSION_RISK');
    expect(res.calculatedCoverDepthMm).toBe(30.0);
  });

  it('flags chloride salt saturation and delamination acoustic attenuation', () => {
    // Er = 13.0 (high dielectric due to moisture & deicing salts), attenuation -16 dB
    const scan: GprBridgeDeckScan = {
      scanId: 'pier_cap_delam_09',
      bridgeComponent: 'Pier 4 Overhang',
      dielectricPermittivity: 13.0,
      twoWayTravelTimeNs: 1.5,
      minDesignCoverMm: 50.0,
      reflectionAmplitudeDb: -16.5
    };

    const res = BridgeDeckGprVelocityAnalyzer.analyzeDeckScan(scan);

    expect(res.isCompliant).toBe(false);
    expect(res.status).toBe('CHLORIDE_INTRUSION_DELAMINATION_ALERT');
    expect(res.structuralAssessment).toContain('ASTM D6087');
  });
});
