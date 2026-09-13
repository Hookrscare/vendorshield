import { describe, it, expect } from 'vitest';
import {
  CfrdExtensometerLeakagePredictor,
  CfrdDamConditions,
  JointExtensometer3D,
  DownstreamWeirTelemetry
} from './cfrd-extensometer-leakage-predictor';

describe('SNAP-70: CfrdExtensometerLeakagePredictor Tests', () => {
  const predictor = new CfrdExtensometerLeakagePredictor();

  const mockDam: CfrdDamConditions = {
    damId: 'DAM-CFRD-AGUA-RICA-01',
    damHeightMeters: 145.0,
    currentReservoirHeadMeters: 138.5,
    concreteCompressiveStrengthMpa: 35.0
  };

  it('evaluates safe hermetic joint conditions under design displacement', () => {
    const extensometers: JointExtensometer3D[] = [
      {
        sensorId: 'EXT-PERIM-L04',
        jointType: 'PERIMETRIC_PLINTH',
        elevationMeters: 420.0,
        normalOpeningMm: 4.2,
        tangentialShearMm: 3.1,
        settlementOffsetMm: 2.0,
        maxDesignWaterstopShearMm: 25.0 // resultant = ~5.6mm, strain = ~0.22
      }
    ];

    const weir: DownstreamWeirTelemetry = {
      weirId: 'WEIR-TOE-01',
      measuredFlowLitersPerSec: 12.5,
      baselineNominalFlowLitersPerSec: 12.0,
      turbidityNtu: 0.8,
      electricConductivityUsCm: 210.0
    };

    const res = predictor.evaluateDamJointIntegrity(mockDam, extensometers, weir);
    expect(res.hazardLevel).toBe('SAFE_HERMETIC');
    expect(res.internalPipingDetected).toBe(false);
    expect(res.waterstopStrainRatio).toBeLessThan(0.5);
    expect(res.auditDigest).toHaveLength(12);
  });

  it('detects critical piping emergency when turbidity spikes with excessive shear', () => {
    const extensometers: JointExtensometer3D[] = [
      {
        sensorId: 'EXT-PERIM-R08',
        jointType: 'PERIMETRIC_PLINTH',
        elevationMeters: 380.0,
        normalOpeningMm: 24.0,
        tangentialShearMm: 22.0,
        settlementOffsetMm: 15.0,
        maxDesignWaterstopShearMm: 25.0 // resultant > 35mm, strain > 1.4
      }
    ];

    const weir: DownstreamWeirTelemetry = {
      weirId: 'WEIR-TOE-01',
      measuredFlowLitersPerSec: 94.0, // High discharge
      baselineNominalFlowLitersPerSec: 15.0,
      turbidityNtu: 18.5, // Severe fines migration
      electricConductivityUsCm: 550.0
    };

    const res = predictor.evaluateDamJointIntegrity(mockDam, extensometers, weir);
    expect(res.hazardLevel).toBe('CRITICAL_PIPING_EMERGENCY');
    expect(res.internalPipingDetected).toBe(true);
    expect(res.engineeringRecommendations.some(r => r.includes('emergency spillway'))).toBe(true);
  });

  it('raises error when no extensometers are provided', () => {
    const weir: DownstreamWeirTelemetry = {
      weirId: 'WEIR-TOE-01',
      measuredFlowLitersPerSec: 10.0,
      baselineNominalFlowLitersPerSec: 10.0,
      turbidityNtu: 1.0,
      electricConductivityUsCm: 200.0
    };

    expect(() => predictor.evaluateDamJointIntegrity(mockDam, [], weir)).toThrow();
  });
});
