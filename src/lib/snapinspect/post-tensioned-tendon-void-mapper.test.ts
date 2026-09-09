/**
 * src/lib/snapinspect/post-tensioned-tendon-void-mapper.test.ts
 * Unit tests for SNAP-43: Post-Tensioned Concrete Slab Tendon Duct Void Ultrasonic Tomography Mapper.
 */

import { describe, it, expect } from 'vitest';
import { PostTensionedTendonVoidMapper, TendonDuctProfile } from './post-tensioned-tendon-void-mapper';

describe('PostTensionedTendonVoidMapper', () => {
  it('correctly assesses a sound, fully-grouted post-tensioned duct', () => {
    const profile: TendonDuctProfile = {
      duct_id: 'PT-SPAN3-T01',
      duct_type: 'high_density_polyethylene_hdpe',
      design_duct_diameter_mm: 76,
      design_cover_depth_mm: 45,
      duct_length_meters: 12.0,
      strand_count: 12,
      scan_points: [
        { station_meters: 0.0, measured_depth_mm: 46, reflection_amplitude_db: -18.0, phase_inverted: false },
        { station_meters: 1.0, measured_depth_mm: 45, reflection_amplitude_db: -20.0, phase_inverted: false },
        { station_meters: 2.0, measured_depth_mm: 47, reflection_amplitude_db: -16.0, phase_inverted: false },
        { station_meters: 3.0, measured_depth_mm: 45, reflection_amplitude_db: -19.0, phase_inverted: false },
      ],
    };

    const res = PostTensionedTendonVoidMapper.mapTendonVoids(profile);

    expect(res.void_stations_count).toBe(0);
    expect(res.void_percentage_ratio).toBe(0);
    expect(res.structural_hazard_rating).toBe('ACCEPTABLE');
    expect(res.recommended_remediation).toBe('MONITORING_ONLY');
    expect(res.remediation_grout_volume_liters).toBe(0);
    expect(res.audit_token).toMatch(/^PT-TENDON-VOID-[A-F0-9]{16}$/);
  });

  it('detects critical grout void requiring vacuum grouting intervention', () => {
    const profile: TendonDuctProfile = {
      duct_id: 'PT-BRIDGE-HIGH-HIGHWAY-04',
      duct_type: 'corrugated_galvanized_steel',
      design_duct_diameter_mm: 100,
      design_cover_depth_mm: 60,
      duct_length_meters: 20.0,
      strand_count: 19,
      scan_points: [
        { station_meters: 0.0, measured_depth_mm: 60, reflection_amplitude_db: -18.0, phase_inverted: false },
        { station_meters: 1.0, measured_depth_mm: 58, reflection_amplitude_db: -3.0, phase_inverted: true }, // Void
        { station_meters: 2.0, measured_depth_mm: 59, reflection_amplitude_db: -2.5, phase_inverted: true }, // Void
        { station_meters: 3.0, measured_depth_mm: 61, reflection_amplitude_db: -4.0, phase_inverted: true }, // Void
        { station_meters: 4.0, measured_depth_mm: 60, reflection_amplitude_db: -19.0, phase_inverted: false },
      ],
    };

    const res = PostTensionedTendonVoidMapper.mapTendonVoids(profile);

    expect(res.void_stations_count).toBe(3);
    expect(res.void_percentage_ratio).toBe(60.0);
    expect(res.structural_hazard_rating).toBe('CRITICAL_CORROSION_HAZARD');
    expect(res.recommended_remediation).toBe('VACUUM_GROUTING_INTERVENTION');
    expect(res.remediation_grout_volume_liters).toBeGreaterThan(5.0);
  });
});
