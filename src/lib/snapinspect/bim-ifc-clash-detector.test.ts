import { describe, it, expect } from 'vitest';
import {
  BimIfcClashDetector,
  IfcElement
} from './bim-ifc-clash-detector';

describe('SNAP-75: BIM IFC 3D Clash Detector & Punch-List Router', () => {
  it('detects hard structural collision between reinforced concrete beam and HVAC duct', () => {
    const elements: IfcElement[] = [
      {
        guid: 'guid_beam_01',
        trade: 'STRUCTURAL',
        elementName: 'W24x68 Structural Steel Girder',
        isLoadBearing: true,
        requiredClearanceBufferMeters: 0.0,
        bounds: { minX: 0.0, minY: 0.0, minZ: 3.0, maxX: 10.0, maxY: 0.4, maxZ: 3.6 }
      },
      {
        guid: 'guid_duct_01',
        trade: 'HVAC_MECHANICAL',
        elementName: '600x400 Main Supply Air Duct',
        isLoadBearing: false,
        requiredClearanceBufferMeters: 0.1,
        // Penetrating through girder at X = 4.0 to 4.6, Y = -0.1 to 0.5, Z = 3.2 to 3.8
        bounds: { minX: 4.0, minY: -0.1, minZ: 3.2, maxX: 4.6, maxY: 0.5, maxZ: 3.8 }
      }
    ];

    const clashes = BimIfcClashDetector.detectClashes(elements);

    expect(clashes.length).toBe(1);
    expect(clashes[0].clashType).toBe('HARD_STRUCTURAL_COLLISION');
    expect(clashes[0].penetrationVolumeM3).toBeGreaterThan(0.0);
    expect(clashes[0].assignedContractorTrade).toBe('HVAC_MECHANICAL');
    expect(clashes[0].punchListResolutionDirective).toContain('CRITICAL');
  });

  it('detects soft maintenance clearance violation for electrical switchgear', () => {
    const elements: IfcElement[] = [
      {
        guid: 'guid_panel_01',
        trade: 'ELECTRICAL',
        elementName: '480V Main Distribution Switchboard',
        isLoadBearing: false,
        requiredClearanceBufferMeters: 1.0, // NEC 110.26 requires ~1.0m front clearance
        bounds: { minX: 1.0, minY: 0.0, minZ: 0.0, maxX: 2.5, maxY: 0.6, maxZ: 2.2 }
      },
      {
        guid: 'guid_pipe_01',
        trade: 'PLUMBING',
        elementName: '4-inch Chilled Water Return Pipe',
        isLoadBearing: false,
        requiredClearanceBufferMeters: 0.0,
        // Pipe running 0.4m in front of electrical panel (within 1.0m buffer)
        bounds: { minX: 1.5, minY: 0.9, minZ: 1.0, maxX: 2.0, maxY: 1.0, maxZ: 1.1 }
      }
    ];

    const clashes = BimIfcClashDetector.detectClashes(elements);

    expect(clashes.length).toBe(1);
    expect(clashes[0].clashType).toBe('SOFT_MAINTENANCE_CLEARANCE_VIOLATION');
    expect(clashes[0].penetrationVolumeM3).toBe(0.0);
    expect(clashes[0].punchListResolutionDirective).toContain('Maintenance clearance');
  });
});
