import { describe, it, expect } from 'vitest';
import {
  TbmCutterheadGeotechnicalClassifier,
  TbmCutterheadTelemetry,
  GeotechnicalFaceRadarScan,
} from './tbm-cutterhead-vibration-geotechnical-radar-classifier';

describe('SNAP-86: TbmCutterheadGeotechnicalClassifier Tests', () => {
  const baseTelemetry: TbmCutterheadTelemetry = {
    tbmId: 'TBM-HERRENKNECHT-01',
    chainageMeters: 1420.5,
    cutterheadRpm: 3.2,
    thrustForceKiloNewtons: 18500.0,
    vibrationRmsG: 2.1,
    peakVibrationG: 5.4,
    dominantFrequencyHz: 28.5,
  };

  const baseRadar: GeotechnicalFaceRadarScan = {
    radarLookaheadMeters: 8.0,
    detectedVoidVolumeM3: 0.2,
    dielectricPermittivity: 6.5, // Dry rock
    estimatedRmr: 65, // Good rock mass
  };

  it('classifies stable excavation in uniform rock mass', () => {
    const res = TbmCutterheadGeotechnicalClassifier.classifyFaceExcavation(baseTelemetry, baseRadar);

    expect(res.excavationSafetyStatus).toBe('NORMAL_STABLE_EXCAVATION');
    expect(res.cutterWearRiskScore).toBeLessThan(30);
    expect(res.waterInrushProbability).toBe(0.0);
    expect(res.recommendedThrustAdjustmentPct).toBe(0);
    expect(res.inspectionDigest).toHaveLength(64);
  });

  it('triggers DISC_CUTTER_CHIPPING_WARNING on excessive vibration RMS', () => {
    const highVibrationTelemetry: TbmCutterheadTelemetry = {
      ...baseTelemetry,
      vibrationRmsG: 8.2, // Elevated vibration
      peakVibrationG: 16.5,
    };

    const res = TbmCutterheadGeotechnicalClassifier.classifyFaceExcavation(highVibrationTelemetry, baseRadar);

    expect(res.excavationSafetyStatus).toBe('DISC_CUTTER_CHIPPING_WARNING');
    expect(res.cutterWearRiskScore).toBeGreaterThan(65);
    expect(res.recommendedThrustAdjustmentPct).toBe(-35);
  });

  it('triggers KARST_CAVITY_IMMEDIATE_STOP when radar detects near-face water cavity', () => {
    const cavityRadar: GeotechnicalFaceRadarScan = {
      radarLookaheadMeters: 1.8, // 1.8m ahead!
      detectedVoidVolumeM3: 14.5,
      dielectricPermittivity: 72.0, // Water-bearing void
      estimatedRmr: 18,
    };

    const res = TbmCutterheadGeotechnicalClassifier.classifyFaceExcavation(baseTelemetry, cavityRadar);

    expect(res.excavationSafetyStatus).toBe('KARST_CAVITY_IMMEDIATE_STOP');
    expect(res.waterInrushProbability).toBeGreaterThan(0.7);
    expect(res.recommendedThrustAdjustmentPct).toBe(-100);
  });

  it('rejects invalid negative RPM telemetry', () => {
    expect(() => {
      TbmCutterheadGeotechnicalClassifier.classifyFaceExcavation(
        { ...baseTelemetry, cutterheadRpm: -1.0 },
        baseRadar
      );
    }).toThrow('Invalid TBM mechanical telemetry');
  });
});
