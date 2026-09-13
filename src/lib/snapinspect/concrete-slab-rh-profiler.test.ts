import { describe, it, expect } from 'vitest';
import {
  ConcreteSlabRhProfiler,
  ConcreteProbeReading
} from './concrete-slab-rh-profiler';

describe('SNAP-76: Concrete Slab Relative Humidity Profiler', () => {
  it('clears installation when slab RH is safely below adhesive limit', () => {
    const reading: ConcreteProbeReading = {
      probeId: 'probe_fl_ground_01',
      slabThicknessInches: 5.0,
      probeDepthInches: 2.0, // 40% depth compliant
      isElevatedPanDeck: false,
      equilibrationHours: 26.0, // > 24h
      measuredInternalRhPercent: 74.0,
      slabTempCelsius: 21.0,
      adhesiveMaxToleranceRhPercent: 80.0
    };

    const res = ConcreteSlabRhProfiler.profileSlabMoisture(reading);

    expect(res.installationClearance).toBe('CLEARED_FOR_INSTALLATION');
    expect(res.isDepthPlacementCompliant).toBe(true);
    expect(res.depthRatioPercent).toBe(40.0);
    expect(res.mitigationRecommendation).toContain('Cleared for immediate');
  });

  it('detects excess moisture risk when RH breaches threshold', () => {
    const reading: ConcreteProbeReading = {
      probeId: 'probe_fl_ground_wet',
      slabThicknessInches: 6.0,
      probeDepthInches: 2.4, // 40%
      isElevatedPanDeck: false,
      equilibrationHours: 48.0,
      measuredInternalRhPercent: 88.5, // Exceeds 80% limit
      slabTempCelsius: 22.0,
      adhesiveMaxToleranceRhPercent: 80.0
    };

    const res = ConcreteSlabRhProfiler.profileSlabMoisture(reading);

    expect(res.installationClearance).toBe('EXCESS_MOISTURE_DELAMINATION_RISK');
    expect(res.moistureVaporSeverityIndex).toBeGreaterThan(70);
    expect(res.mitigationRecommendation).toContain('CRITICAL');
  });

  it('blocks reading if probe has not reached 24h equilibration threshold', () => {
    const reading: ConcreteProbeReading = {
      probeId: 'probe_fl_premature',
      slabThicknessInches: 5.0,
      probeDepthInches: 2.0,
      isElevatedPanDeck: false,
      equilibrationHours: 6.0, // Under 24h
      measuredInternalRhPercent: 70.0,
      slabTempCelsius: 20.0,
      adhesiveMaxToleranceRhPercent: 80.0
    };

    const res = ConcreteSlabRhProfiler.profileSlabMoisture(reading);

    expect(res.installationClearance).toBe('HOLD_EQUILIBRATION_INCOMPLETE');
    expect(res.mitigationRecommendation).toContain('ASTM F2170 requires 24h equilibration');
  });
});
