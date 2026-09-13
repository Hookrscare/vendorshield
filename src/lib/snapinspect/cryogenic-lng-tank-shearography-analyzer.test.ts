import { describe, it, expect } from 'vitest';
import {
  CryogenicLngTankShearographyAnalyzer,
  type ShearographyPoint
} from './cryogenic-lng-tank-shearography-analyzer';

describe('CryogenicLngTankShearographyAnalyzer (SNAP-68)', () => {
  const analyzer = new CryogenicLngTankShearographyAnalyzer();

  it('evaluates optimal homogeneous Invar membrane under cryogenic conditions', () => {
    const points: ShearographyPoint[] = [];
    for (let x = 0; x <= 100; x += 10) {
      for (let y = 0; y <= 100; y += 10) {
        points.push({
          xMm: x,
          yMm: y,
          phaseGradientRadMm: (Math.random() - 0.5) * 0.01, // Low ambient thermal gradient
          modulationContrast: 0.85,
          surfaceTempK: 111.0,
        });
      }
    }

    const report = analyzer.analyzeShearogram('TANK-MOSS-01', 'INVAR_36', 111.0, points);

    expect(report.tankSegmentId).toBe('TANK-MOSS-01');
    expect(report.membraneIntegrityIndex).toBe(100);
    expect(report.safetyStatus).toBe('OPTIMAL_FULL_CRYOGENIC_CERTIFIED');
    expect(report.boilOffGasRiskLevel).toBe('NOMINAL');
    expect(report.defectsDetected).toHaveLength(0);
    expect(report.inspectionTokenSha256).toHaveLength(64);
  });

  it('identifies critical sub-surface delamination butterfly fringe cluster', () => {
    const points: ShearographyPoint[] = [];
    for (let x = 0; x <= 100; x += 10) {
      for (let y = 0; y <= 100; y += 10) {
        const dist = Math.hypot(x - 50, y - 50);
        const isDefect = dist <= 25.0;
        points.push({
          xMm: x,
          yMm: y,
          // Butterfly fringe: sharp steep displacement derivative across defect boundary
          phaseGradientRadMm: isDefect ? 0.15 : 0.005,
          modulationContrast: 0.90,
          surfaceTempK: 111.0,
        });
      }
    }

    const report = analyzer.analyzeShearogram('TANK-MARK3-02', 'INVAR_36', 111.0, points);

    expect(report.defectsDetected.length).toBeGreaterThan(0);
    expect(report.defectsDetected[0].flawType).toBe('SUB_SURFACE_DELAMINATION');
    expect(report.defectsDetected[0].severity).toBe('CRITICAL');
    expect(report.membraneIntegrityIndex).toBeLessThan(75);
    expect(report.safetyStatus).not.toBe('OPTIMAL_FULL_CRYOGENIC_CERTIFIED');
  });

  it('throws error for empty points array', () => {
    expect(() => {
      analyzer.analyzeShearogram('TANK-ERR', 'INVAR_36', 111.0, []);
    }).toThrow('Valid tankSegmentId and non-empty points array are required.');
  });
});
