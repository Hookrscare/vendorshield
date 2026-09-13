/**
 * src/lib/snapinspect/bim-ifc-clash-detection-router.ts
 * SNAP-75: Multi-Trade BIM IFC Geometry Model Clash Detection & Punch-List Router.
 *
 * Part of SnapInspect AI Tactical Field CAD & Autonomous Quality Control Suite.
 * Performs 3D geometric interference analysis between federated Building Information Modeling (BIM/IFC)
 * trade layers (Architectural, Structural, MEP Mechanical, Electrical, Plumbing, Fire Sprinklers).
 * Detects hard volumetric collisions and soft clearance violations, computes intersection volumes,
 * determines trade priority hierarchy, and automatically routes prioritized field punch-list action items.
 */

import { createHash } from 'crypto';

export type BimTrade =
  | 'STRUCTURAL'
  | 'ARCHITECTURAL'
  | 'MEP_HVAC'
  | 'MEP_PLUMBING'
  | 'MEP_ELECTRICAL'
  | 'FIRE_PROTECTION';

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
  elementName: string; // e.g., "W14x90 Steel Beam", "24x12 Supply Duct"
  level: string; // e.g., "Level 03"
  boundingBox: BoundingBox3D;
  isLoadBearing: boolean;
  requiredClearanceMeters: number; // e.g. 0.15 m
}

export type ClashType = 'HARD_CLASH' | 'SOFT_CLEARANCE_VIOLATION';
export type ClashSeverity = 'CRITICAL' | 'MAJOR' | 'MODERATE' | 'MINOR';

export interface DetectedClash {
  clashId: string;
  type: ClashType;
  severity: ClashSeverity;
  primaryElement: IfcElement;
  interferingElement: IfcElement;
  overlapVolumeCubicMeters: number;
  minimumSeparationMeters: number;
  responsibleTrade: BimTrade;
  recommendedRelocationVector: { dx: number; dy: number; dz: number };
  punchListDescription: string;
}

export interface BimClashAuditResult {
  projectModelId: string;
  totalElementsEvaluated: number;
  hardClashesCount: number;
  softClearanceViolationsCount: number;
  criticalSeverityCount: number;
  clashes: DetectedClash[];
  isModelApprovedForConstruction: boolean;
  forensicDigest: string;
}

export class BimIfcClashDetectionRouter {
  // Trade precedence hierarchy: Structural takes highest priority (least moveable), followed by Architectural
  private static readonly TRADE_PRIORITY: Record<BimTrade, number> = {
    STRUCTURAL: 100,
    FIRE_PROTECTION: 80, // Slope / head constraints
    MEP_PLUMBING: 70,    // Gravity drainage slope
    MEP_HVAC: 60,        // Large physical dimensions
    ARCHITECTURAL: 50,
    MEP_ELECTRICAL: 40,  // Flexible conduits / cable trays
  };

  /**
   * Evaluates cross-trade collisions and clearance violations across an IFC element inventory.
   */
  public analyzeFederatedModel(
    projectModelId: string,
    elements: IfcElement[]
  ): BimClashAuditResult {
    if (!elements || elements.length < 2) {
      throw new Error('Federated model requires at least two IFC elements for clash analysis.');
    }

    const clashes: DetectedClash[] = [];
    const n = elements.length;

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const elA = elements[i];
        const elB = elements[j];

        // Same trade elements on same system typically do not count as multi-trade clashes
        if (elA.trade === elB.trade) continue;

        const clash = this.evaluateElementPair(elA, elB);
        if (clash) {
          clashes.push(clash);
        }
      }
    }

    const hardCount = clashes.filter(c => c.type === 'HARD_CLASH').length;
    const softCount = clashes.filter(c => c.type === 'SOFT_CLEARANCE_VIOLATION').length;
    const criticalCount = clashes.filter(c => c.severity === 'CRITICAL').length;
    const isApproved = criticalCount === 0 && hardCount === 0;

    const rawPayload = `${projectModelId}:${elements.length}:${hardCount}:${softCount}:${criticalCount}:${isApproved}`;
    const digest = createHash('sha256').update(rawPayload).digest('hex');

    return {
      projectModelId,
      totalElementsEvaluated: elements.length,
      hardClashesCount: hardCount,
      softClearanceViolationsCount: softCount,
      criticalSeverityCount: criticalCount,
      clashes,
      isModelApprovedForConstruction: isApproved,
      forensicDigest: digest,
    };
  }

  private evaluateElementPair(elA: IfcElement, elB: IfcElement): DetectedClash | null {
    const boxA = elA.boundingBox;
    const boxB = elB.boundingBox;

    // Check overlap on each axis
    const overlapX = Math.max(0, Math.min(boxA.maxX, boxB.maxX) - Math.max(boxA.minX, boxB.minX));
    const overlapY = Math.max(0, Math.min(boxA.maxY, boxB.maxY) - Math.max(boxA.minY, boxB.minY));
    const overlapZ = Math.max(0, Math.min(boxA.maxZ, boxB.maxZ) - Math.max(boxA.minZ, boxB.minZ));

    const isHardIntersect = overlapX > 0 && overlapY > 0 && overlapZ > 0;

    if (isHardIntersect) {
      const volume = overlapX * overlapY * overlapZ;
      const priorityA = BimIfcClashDetectionRouter.TRADE_PRIORITY[elA.trade];
      const priorityB = BimIfcClashDetectionRouter.TRADE_PRIORITY[elB.trade];

      // Lower priority trade must move / resolve the clash
      const [primary, interfering] = priorityA >= priorityB ? [elA, elB] : [elB, elA];
      const responsibleTrade = interfering.trade;

      // Severity evaluation
      let severity: ClashSeverity = 'MODERATE';
      if (primary.isLoadBearing || volume > 0.05) {
        severity = 'CRITICAL';
      } else if (volume > 0.01) {
        severity = 'MAJOR';
      }

      // Minimal translation vector to separate interfering element
      const shiftZ = boxA.maxZ - boxB.minZ;
      const shiftY = boxA.maxY - boxB.minY;

      return {
        clashId: `CLASH-HARD-${elA.guid.slice(0, 6)}-${elB.guid.slice(0, 6)}`,
        type: 'HARD_CLASH',
        severity,
        primaryElement: primary,
        interferingElement: interfering,
        overlapVolumeCubicMeters: Number(volume.toFixed(4)),
        minimumSeparationMeters: 0.0,
        responsibleTrade,
        recommendedRelocationVector: { dx: 0, dy: 0, dz: Number((-shiftZ - 0.05).toFixed(3)) },
        punchListDescription: `Hard physical collision (${volume.toFixed(3)} m³) between ${primary.trade} ${primary.elementName} and ${interfering.trade} ${interfering.elementName}. Re-route ${interfering.trade} below clearance envelope.`,
      };
    }

    // Soft clearance evaluation
    const reqClearance = Math.max(elA.requiredClearanceMeters, elB.requiredClearanceMeters);
    const gapX = Math.max(0, Math.max(boxA.minX - boxB.maxX, boxB.minX - boxA.maxX));
    const gapY = Math.max(0, Math.max(boxA.minY - boxB.maxY, boxB.minY - boxA.maxY));
    const gapZ = Math.max(0, Math.max(boxA.minZ - boxB.maxZ, boxB.minZ - boxA.maxZ));
    const separationDistance = Math.hypot(gapX, gapY, gapZ);

    if (separationDistance < reqClearance) {
      const priorityA = BimIfcClashDetectionRouter.TRADE_PRIORITY[elA.trade];
      const priorityB = BimIfcClashDetectionRouter.TRADE_PRIORITY[elB.trade];
      const [primary, interfering] = priorityA >= priorityB ? [elA, elB] : [elB, elA];

      return {
        clashId: `CLASH-SOFT-${elA.guid.slice(0, 6)}-${elB.guid.slice(0, 6)}`,
        type: 'SOFT_CLEARANCE_VIOLATION',
        severity: separationDistance < (reqClearance * 0.5) ? 'MAJOR' : 'MINOR',
        primaryElement: primary,
        interferingElement: interfering,
        overlapVolumeCubicMeters: 0.0,
        minimumSeparationMeters: Number(separationDistance.toFixed(3)),
        responsibleTrade: interfering.trade,
        recommendedRelocationVector: { dx: 0, dy: Number((reqClearance - separationDistance + 0.02).toFixed(3)), dz: 0 },
        punchListDescription: `Soft clearance violation: ${interfering.trade} ${interfering.elementName} is ${separationDistance.toFixed(2)} m from ${primary.elementName} (minimum required: ${reqClearance.toFixed(2)} m). Shift away to conform with code.`,
      };
    }

    return null;
  }
}
