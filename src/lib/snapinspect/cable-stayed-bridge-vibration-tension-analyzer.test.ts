import { describe, it, expect } from 'vitest';
import {
  CableStayedBridgeVibrationTensionAnalyzer,
  StayCableProperties,
  WindExcitationConditions
} from './cable-stayed-bridge-vibration-tension-analyzer';

describe('SNAP-58: Cable-Stayed Bridge Stay Cable Vibrational Tension & Wind Buffet Analyzer', () => {
  const analyzer = new CableStayedBridgeVibrationTensionAnalyzer();

  const sampleCable: StayCableProperties = {
    cableId: 'CABLE-SOUTH-P2-STAY12',
    freeLengthM: 150.0,
    linearMassKgPerM: 52.5,
    elasticModulusGpa: 205.0,
    crossSectionAreaMm2: 6800.0,
    outerDiameterMm: 160.0,
    dampingRatio: 0.003, // Typical lightly damped bare stay cable
    nominalDesignTensionKn: 3200.0
  };

  it('inverts modal natural frequencies to estimate tension accurately', () => {
    // Mode 1: ~0.82 Hz, Mode 2: ~1.65 Hz, Mode 3: ~2.47 Hz for ~3200 kN nominal load
    const measuredFrequencies = [0.82, 1.65, 2.47];
    const res = analyzer.estimateTensionFromModes(sampleCable, measuredFrequencies);

    expect(res.modes.length).toBe(3);
    expect(res.tensionKn).toBeGreaterThan(2500);
    expect(res.tensionKn).toBeLessThan(4000);
  });

  it('detects rain-wind induced vibration (RWIV) vulnerability under low Scruton numbers', () => {
    const windRainConditions: WindExcitationConditions = {
      meanWindSpeedMPerSec: 11.5,
      windAngleDeg: 45,
      hasRainfall: true
    };

    const assessment = analyzer.assessCableHealth(sampleCable, [0.82, 1.65], windRainConditions);
    expect(assessment.scrutonNumber).toBeLessThan(75.0);
    expect(assessment.status).toBe('RAIN_WIND_INSTABILITY_WARNING');
    expect(assessment.recommendations.some(r => r.includes('Aeroelastic Instability'))).toBe(true);
  });

  it('triggers alert on excessive tension loss (slack cable risk)', () => {
    // Frequencies dropped significantly (e.g. 0.75 Hz indicates large drop in tension)
    const slackFrequencies = [0.75, 1.50];
    const calmWind: WindExcitationConditions = {
      meanWindSpeedMPerSec: 2.0,
      windAngleDeg: 0,
      hasRainfall: false
    };

    const assessment = analyzer.assessCableHealth(sampleCable, slackFrequencies, calmWind);
    expect(assessment.tensionDeviationPercent).toBeLessThan(-20.0);
    expect(assessment.status).toBe('SLACK_LOSS_OF_TENSION');
    expect(assessment.recommendations.some(r => r.includes('Alert: Cable exhibits severe tension loss'))).toBe(true);
  });
});
