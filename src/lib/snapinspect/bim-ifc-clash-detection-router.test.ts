import { describe, it, expect } from 'vitest';
import {
  BimIfcClashDetectionRouter,
  IfcElement,
} from './bim-ifc-clash-detection-router';

describe('SNAP-75: BimIfcClashDetectionRouter Tests', () => {
  const router = new BimIfcClashDetectionRouter();

  const structuralBeam: IfcElement = {
    guid: 'BEAM-STR-001',
    trade: 'STRUCTURAL',
    elementName: 'W18x50 Wide Flange Steel Beam',
    level: 'Level 02',
    boundingBox: { minX: 0.0, minY: 0.0, minZ: 3.5, maxX: 10.0, maxY: 0.3, maxZ: 3.9 },
    isLoadBearing: true,
    requiredClearanceMeters: 0.05,
  };

  const collidingHvacDuct: IfcElement = {
    guid: 'DUCT-MEP-001',
    trade: 'MEP_HVAC',
    elementName: '24x12 Galvanized Supply Air Duct',
    level: 'Level 02',
    boundingBox: { minX: 4.0, minY: -1.0, minZ: 3.6, maxX: 4.6, maxY: 1.0, maxZ: 4.0 }, // Overlaps in Z and Y
    isLoadBearing: false,
    requiredClearanceMeters: 0.10,
  };

  const softClearanceCableTray: IfcElement = {
    guid: 'CABLE-ELE-001',
    trade: 'MEP_ELECTRICAL',
    elementName: '12-inch Ladder Cable Tray',
    level: 'Level 02',
    boundingBox: { minX: 0.0, minY: 0.32, minZ: 3.5, maxX: 10.0, maxY: 0.6, maxZ: 3.8 }, // 2 cm gap from beam, required 10 cm
    isLoadBearing: false,
    requiredClearanceMeters: 0.10,
  };

  const clearPlumbingPipe: IfcElement = {
    guid: 'PIPE-PLU-001',
    trade: 'MEP_PLUMBING',
    elementName: '4-inch Sanitary Drain Pipe',
    level: 'Level 02',
    boundingBox: { minX: 0.0, minY: 2.0, minZ: 2.0, maxX: 10.0, maxY: 2.1, maxZ: 2.1 },
    isLoadBearing: false,
    requiredClearanceMeters: 0.05,
  };

  it('detects critical hard clash between structural beam and HVAC duct', () => {
    const result = router.analyzeFederatedModel('BIM-PROJ-METROPOLIS-TOWER', [
      structuralBeam,
      collidingHvacDuct,
    ]);

    expect(result.hardClashesCount).toBe(1);
    expect(result.criticalSeverityCount).toBe(1);
    expect(result.isModelApprovedForConstruction).toBe(false);

    const clash = result.clashes[0];
    expect(clash.type).toBe('HARD_CLASH');
    expect(clash.severity).toBe('CRITICAL');
    expect(clash.responsibleTrade).toBe('MEP_HVAC'); // HVAC must move, not structural beam
    expect(clash.overlapVolumeCubicMeters).toBeGreaterThan(0.0);
    expect(clash.punchListDescription).toContain('MEP_HVAC');
    expect(result.forensicDigest).toHaveLength(64);
  });

  it('detects soft clearance violation without hard intersection', () => {
    const result = router.analyzeFederatedModel('BIM-PROJ-METROPOLIS-TOWER', [
      structuralBeam,
      softClearanceCableTray,
    ]);

    expect(result.hardClashesCount).toBe(0);
    expect(result.softClearanceViolationsCount).toBe(1);
    const clash = result.clashes[0];
    expect(clash.type).toBe('SOFT_CLEARANCE_VIOLATION');
    expect(clash.responsibleTrade).toBe('MEP_ELECTRICAL');
    expect(clash.minimumSeparationMeters).toBeCloseTo(0.02, 2);
  });

  it('approves federated model when all trades have sufficient clearance', () => {
    const result = router.analyzeFederatedModel('BIM-PROJ-METROPOLIS-TOWER', [
      structuralBeam,
      clearPlumbingPipe,
    ]);

    expect(result.hardClashesCount).toBe(0);
    expect(result.softClearanceViolationsCount).toBe(0);
    expect(result.criticalSeverityCount).toBe(0);
    expect(result.isModelApprovedForConstruction).toBe(true);
  });

  it('throws error for fewer than two elements', () => {
    expect(() => {
      router.analyzeFederatedModel('BIM-TEST', [structuralBeam]);
    }).toThrow('at least two IFC elements');
  });
});
