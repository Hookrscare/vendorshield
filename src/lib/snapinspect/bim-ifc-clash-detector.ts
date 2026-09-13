/**
 * bim-ifc-clash-detector.ts
 * SNAP-75: Multi-Trade BIM IFC Geometry Model Clash Detection & Punch-List Router.
 * Part of SnapInspect AI Tactical Field Inspection CAD & BIM Diagnostics.
 *
 * 3D BIM spatial collision and clearance coordination engine:
 * 1. Evaluates 3D Axis-Aligned Bounding Box (AABB) intersection volumes across multi-trade IFC models.
 * 2. Distinguishes hard physical collisions from soft maintenance clearance envelope violations.
 * 3. Quantifies intersection volume (m^3) and penetration severity.
 * 4. Automates trade-specific punch-list ticket routing (Structural vs MEP vs Architectural).
 */

export type BimTrade = 'STRUCTURAL' | 'ARCHITECTURAL' | 'HVAC_MECHANICAL' | 'PLUMBING' | 'ELECTRICAL';

export interface BoundingBox3D {
  minX: number;
  minY: number;
  minZ: number;
  maxX: number;
  maxY: number;
  maxZ: number;
}

export interface IfcElement {
  guid: string;
  trade: BimTrade;
  elementName: string;
  bounds: BoundingBox3D;
  isLoadBearing: boolean;
  requiredClearanceBufferMeters: number; // e.g. 0.9m for electrical access
}

export interface ClashRecord {
  elementGuidA: string;
  elementGuidB: string;
  clashType: 'HARD_STRUCTURAL_COLLISION' | 'HARD_MEP_INTERFERENCE' | 'SOFT_MAINTENANCE_CLEARANCE_VIOLATION';
  penetrationVolumeM3: number;
  assignedContractorTrade: BimTrade;
  punchListResolutionDirective: string;
}

export class BimIfcClashDetector {
  public static detectClashes(elements: IfcElement[]): ClashRecord[] {
    const clashes: ClashRecord[] = [];

    for (let i = 0; i < elements.length; i++) {
      for (let j = i + 1; j < elements.length; j++) {
        const a = elements[i];
        const b = elements[j];

        // 1. Check Hard Collision (Zero clearance overlap)
        const overlapX = Math.max(0, Math.min(a.bounds.maxX, b.bounds.maxX) - Math.max(a.bounds.minX, b.bounds.minX));
        const overlapY = Math.max(0, Math.min(a.bounds.maxY, b.bounds.maxY) - Math.max(a.bounds.minY, b.bounds.minY));
        const overlapZ = Math.max(0, Math.min(a.bounds.maxZ, b.bounds.maxZ) - Math.max(a.bounds.minZ, b.bounds.minZ));

        const isHardOverlap = overlapX > 0.001 && overlapY > 0.001 && overlapZ > 0.001;

        if (isHardOverlap) {
          const volumeM3 = Math.round(overlapX * overlapY * overlapZ * 1000) / 1000;
          const isStructural = a.isLoadBearing || b.isLoadBearing;

          if (isStructural) {
            // Hard structural collision: secondary trade must reroute
            const rerouteTrade = a.isLoadBearing ? b.trade : a.trade;
            clashes.push({
              elementGuidA: a.guid,
              elementGuidB: b.guid,
              clashType: 'HARD_STRUCTURAL_COLLISION',
              penetrationVolumeM3: volumeM3,
              assignedContractorTrade: rerouteTrade,
              punchListResolutionDirective: `CRITICAL: ${a.elementName} collides with load-bearing structural member ${b.elementName} (${volumeM3} m³). Reroute non-structural utility line.`
            });
          } else {
            clashes.push({
              elementGuidA: a.guid,
              elementGuidB: b.guid,
              clashType: 'HARD_MEP_INTERFERENCE',
              penetrationVolumeM3: volumeM3,
              assignedContractorTrade: b.trade,
              punchListResolutionDirective: `MEP Clash between ${a.elementName} and ${b.elementName}. Lower or offset conduit/pipe run.`
            });
          }
          continue;
        }

        // 2. Check Soft Maintenance Clearance Zone
        const maxBuffer = Math.max(a.requiredClearanceBufferMeters, b.requiredClearanceBufferMeters);
        if (maxBuffer > 0) {
          const clearX = Math.max(0, Math.min(a.bounds.maxX + maxBuffer, b.bounds.maxX + maxBuffer) - Math.max(a.bounds.minX - maxBuffer, b.bounds.minX - maxBuffer));
          const clearY = Math.max(0, Math.min(a.bounds.maxY + maxBuffer, b.bounds.maxY + maxBuffer) - Math.max(a.bounds.minY - maxBuffer, b.bounds.minY - maxBuffer));
          const clearZ = Math.max(0, Math.min(a.bounds.maxZ + maxBuffer, b.bounds.maxZ + maxBuffer) - Math.max(a.bounds.minZ - maxBuffer, b.bounds.minZ - maxBuffer));

          // True distance between boxes
          const dx = Math.max(0, Math.max(a.bounds.minX, b.bounds.minX) - Math.min(a.bounds.maxX, b.bounds.maxX));
          const dy = Math.max(0, Math.max(a.bounds.minY, b.bounds.minY) - Math.min(a.bounds.maxY, b.bounds.maxY));
          const dz = Math.max(0, Math.max(a.bounds.minZ, b.bounds.minZ) - Math.min(a.bounds.maxZ, b.bounds.maxZ));
          const actualDistance = Math.sqrt(dx * dx + dy * dy + dz * dz);

          if (actualDistance < maxBuffer) {
            clashes.push({
              elementGuidA: a.guid,
              elementGuidB: b.guid,
              clashType: 'SOFT_MAINTENANCE_CLEARANCE_VIOLATION',
              penetrationVolumeM3: 0.0,
              assignedContractorTrade: b.trade,
              punchListResolutionDirective: `Maintenance clearance of ${maxBuffer}m breached (actual gap: ${Math.round(actualDistance * 100) / 100}m). Relocate adjacent equipment.`
            });
          }
        }
      }
    }

    return clashes;
  }
}
