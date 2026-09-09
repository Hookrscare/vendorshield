/**
 * SNAP-25: Multi-Trade BIM IFC Geometry Model Clash Detection Viewer.
 * Part of SnapInspect AI Tactical Field Inspection CAD & Mobile Voice AI.
 * Performs 3D spatial bounding-box overlap and clearance clash detection across
 * multi-trade BIM IFC elements (Structural, MEP_HVAC, Plumbing, Electrical, Architectural).
 * Identifies Hard Clashes (geometric penetration) and Soft Clashes (clearance buffer violations),
 * generating BIM Collaboration Format (BCF) compatible issue viewpoints.
 */

export type BIMTrade = "STRUCTURAL" | "MEP_HVAC" | "PLUMBING" | "ELECTRICAL" | "ARCHITECTURAL";

export type ClashType = "HARD_PENETRATION" | "SOFT_CLEARANCE_VIOLATION";

export type ClashSeverity = "CRITICAL" | "MAJOR" | "MINOR" | "TOLERANCE_ACCEPTABLE";

export interface BoundingBox3D {
  minX: number;
  minY: number;
  minZ: number;
  maxX: number;
  maxY: number;
  maxZ: number;
}

export interface BIMElement {
  guid: string;
  name: string;
  ifcType: string; // e.g. "IfcBeam", "IfcDuctSegment", "IfcPipeSegment", "IfcWallStandardCase"
  trade: BIMTrade;
  bbox: BoundingBox3D;
  requiredClearanceMeters?: number; // Clearance buffer around element
}

export interface BIMClashResult {
  clashId: string;
  clashType: ClashType;
  severity: ClashSeverity;
  elementA: BIMElement;
  elementB: BIMElement;
  penetrationDepthMeters: number;
  clearanceShortfallMeters: number;
  clashCentroid: [number, number, number];
  bcfTopic: {
    title: string;
    assignedTrade: BIMTrade;
    priority: "HIGH" | "MEDIUM" | "LOW";
    description: string;
  };
}

export interface BIMClashInspectionReport {
  projectName: string;
  totalElementsEvaluated: number;
  totalClashesFound: number;
  hardClashesCount: number;
  softClashesCount: number;
  criticalSeverityCount: number;
  clashes: BIMClashResult[];
  analyzedAtIso: string;
}

export class BIMClashDetector {
  private readonly penetrationToleranceMeters: number;

  constructor(penetrationToleranceMeters: number = 0.005) {
    // 5mm default physical construction tolerance
    this.penetrationToleranceMeters = penetrationToleranceMeters;
  }

  public detectClashes(
    projectName: string,
    elements: BIMElement[]
  ): BIMClashInspectionReport {
    const clashes: BIMClashResult[] = [];
    let hardCount = 0;
    let softCount = 0;
    let criticalCount = 0;

    for (let i = 0; i < elements.length; i++) {
      for (let j = i + 1; j < elements.length; j++) {
        const elA = elements[i];
        const elB = elements[j];

        // Skip clashes between elements of the same identical system if needed, but here we evaluate all multi-element interactions
        const boxA = elA.bbox;
        const boxB = elB.bbox;

        // Check Hard Clash (physical overlap along all 3 axes)
        const overlapX = Math.min(boxA.maxX, boxB.maxX) - Math.max(boxA.minX, boxB.minX);
        const overlapY = Math.min(boxA.maxY, boxB.maxY) - Math.max(boxA.minY, boxB.minY);
        const overlapZ = Math.min(boxA.maxZ, boxB.maxZ) - Math.max(boxA.minZ, boxB.minZ);

        const isHardOverlap = overlapX > 0 && overlapY > 0 && overlapZ > 0;

        if (isHardOverlap) {
          const penetrationDepth = Math.min(overlapX, overlapY, overlapZ);

          if (penetrationDepth > this.penetrationToleranceMeters) {
            hardCount++;
            const isStructuralInvolved = elA.trade === "STRUCTURAL" || elB.trade === "STRUCTURAL";
            const severity: ClashSeverity = isStructuralInvolved && penetrationDepth > 0.05
              ? "CRITICAL"
              : penetrationDepth > 0.02
              ? "MAJOR"
              : "MINOR";

            if (severity === "CRITICAL") criticalCount++;

            const centroidX = (Math.max(boxA.minX, boxB.minX) + Math.min(boxA.maxX, boxB.maxX)) / 2;
            const centroidY = (Math.max(boxA.minY, boxB.minY) + Math.min(boxA.maxY, boxB.maxY)) / 2;
            const centroidZ = (Math.max(boxA.minZ, boxB.minZ) + Math.min(boxA.maxZ, boxB.maxZ)) / 2;

            const nonStructuralTrade = elA.trade !== "STRUCTURAL" ? elA.trade : elB.trade;

            clashes.push({
              clashId: `CLASH-${elA.guid.slice(0, 4)}-${elB.guid.slice(0, 4)}-${clashes.length + 1}`,
              clashType: "HARD_PENETRATION",
              severity,
              elementA: elA,
              elementB: elB,
              penetrationDepthMeters: Number(penetrationDepth.toFixed(4)),
              clearanceShortfallMeters: 0,
              clashCentroid: [
                Number(centroidX.toFixed(3)),
                Number(centroidY.toFixed(3)),
                Number(centroidZ.toFixed(3)),
              ],
              bcfTopic: {
                title: `Hard Clash: ${elA.name} [${elA.trade}] penetrates ${elB.name} [${elB.trade}]`,
                assignedTrade: nonStructuralTrade,
                priority: severity === "CRITICAL" ? "HIGH" : "MEDIUM",
                description: `Physical collision detected with ${Number((penetrationDepth * 1000).toFixed(1))}mm penetration depth. Reroute required.`,
              },
            });
            continue; // Already a hard clash, skip soft check
          }
        }

        // Check Soft / Clearance Clash (expanded bounding box)
        const clearanceA = elA.requiredClearanceMeters || 0;
        const clearanceB = elB.requiredClearanceMeters || 0;
        const requiredBuffer = Math.max(clearanceA, clearanceB);

        if (requiredBuffer > 0) {
          const softOverlapX = Math.min(boxA.maxX + requiredBuffer, boxB.maxX + requiredBuffer) - Math.max(boxA.minX - requiredBuffer, boxB.minX - requiredBuffer);
          const softOverlapY = Math.min(boxA.maxY + requiredBuffer, boxB.maxY + requiredBuffer) - Math.max(boxA.minY - requiredBuffer, boxB.minY - requiredBuffer);
          const softOverlapZ = Math.min(boxA.maxZ + requiredBuffer, boxB.maxZ + requiredBuffer) - Math.max(boxA.minZ - requiredBuffer, boxB.minZ - requiredBuffer);

          if (softOverlapX > 0 && softOverlapY > 0 && softOverlapZ > 0) {
            softCount++;
            const shortfall = requiredBuffer;
            clashes.push({
              clashId: `SOFT-CLASH-${elA.guid.slice(0, 4)}-${elB.guid.slice(0, 4)}-${clashes.length + 1}`,
              clashType: "SOFT_CLEARANCE_VIOLATION",
              severity: "MINOR",
              elementA: elA,
              elementB: elB,
              penetrationDepthMeters: 0,
              clearanceShortfallMeters: Number(shortfall.toFixed(3)),
              clashCentroid: [
                Number(((boxA.minX + boxB.maxX) / 2).toFixed(3)),
                Number(((boxA.minY + boxB.maxY) / 2).toFixed(3)),
                Number(((boxA.minZ + boxB.maxZ) / 2).toFixed(3)),
              ],
              bcfTopic: {
                title: `Soft Clearance Clash: ${elA.name} within buffer of ${elB.name}`,
                assignedTrade: elB.trade,
                priority: "LOW",
                description: `Element encroaches into required ${Number((requiredBuffer * 1000).toFixed(0))}mm clearance zone.`,
              },
            });
          }
        }
      }
    }

    return {
      projectName,
      totalElementsEvaluated: elements.length,
      totalClashesFound: clashes.length,
      hardClashesCount: hardCount,
      softClashesCount: softCount,
      criticalSeverityCount: criticalCount,
      clashes,
      analyzedAtIso: new Date().toISOString(),
    };
  }
}
