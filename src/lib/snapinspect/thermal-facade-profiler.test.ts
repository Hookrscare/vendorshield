import { describe, it, expect } from 'vitest';
import {
  ThermalFacadeProfiler,
  FacadeThermalProbe
} from './thermal-facade-profiler';

describe('SNAP-78: Thermal Drone Facade Profiler', () => {
  it('identifies compliant high-performance curtain-wall assembly', () => {
    // Outdoor 0°C, Indoor 22°C, Exterior surface 0.8°C (well insulated)
    const probe: FacadeThermalProbe = {
      locationId: 'facade_panel_north_04',
      surfaceTempC: 0.8,
      outdoorAmbientTempC: 0.0,
      indoorConditionedTempC: 22.0
    };

    const res = ThermalFacadeProfiler.auditThermalProfile(probe);

    expect(res.isCompliant).toBe(true);
    expect(res.defectClassification).toBe('COMPLIANT_BUILDING_ENVELOPE');
    expect(res.estimatedHeatLossSeverity).toBe('NEGLIGIBLE');
    expect(res.surfaceDeltaC).toBeLessThan(1.5);
  });

  it('detects critical convective air infiltration around window perimeter', () => {
    // Outdoor -2°C, Indoor 21°C, Window head leaking hot indoor air: exterior surface 5.2°C (+7.2°C anomaly)
    const probe: FacadeThermalProbe = {
      locationId: 'window_head_flashing_w12',
      surfaceTempC: 5.2,
      outdoorAmbientTempC: -2.0,
      indoorConditionedTempC: 21.0
    };

    const res = ThermalFacadeProfiler.auditThermalProfile(probe);

    expect(res.isCompliant).toBe(false);
    expect(res.defectClassification).toBe('CRITICAL_AIR_INFILTRATION_LEAK');
    expect(res.estimatedHeatLossSeverity).toBe('SEVERE');
    expect(res.surfaceDeltaC).toBe(7.2);
    expect(res.remedialRecommendation).toContain('CRITICAL');
  });

  it('detects missing mineral wool cavity insulation', () => {
    // Outdoor 2°C, Indoor 22°C, Surface 6.0°C (+4.0°C anomaly)
    const probe: FacadeThermalProbe = {
      locationId: 'stud_cavity_elevation_east_2',
      surfaceTempC: 6.0,
      outdoorAmbientTempC: 2.0,
      indoorConditionedTempC: 22.0
    };

    const res = ThermalFacadeProfiler.auditThermalProfile(probe);

    expect(res.isCompliant).toBe(false);
    expect(res.defectClassification).toBe('MISSING_CAVITY_INSULATION');
    expect(res.surfaceDeltaC).toBe(4.0);
  });
});
