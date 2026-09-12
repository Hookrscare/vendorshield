/**
 * SNAP-40: Multi-Trade BIM IFC Geometry Model Clash Detection & Punch-List Router.
 * Part of SnapInspect AI Tactical Field Inspection CAD & Mobile Voice AI.
 * 
 * Bridges 3D BIM IFC clash detection directly to jobsite trade subcontractor execution:
 * - Ingests BIM clash results (penetrations and clearance shortfall violations)
 * - Automatically routes work orders to responsible trade subcontractors with trade-specific priority
 * - Establishes strict resolution SLAs (Critical: 24h, Major: 72h, Minor: 7 days)
 * - Tracks subcontractor punch-list lifecycle (DISPATCHED, CONTRACTOR_ACKNOWLEDGED, WORK_COMPLETED, VERIFIED_CLEARANCE)
 * - Re-evaluates post-rectification 3D coordinates to verify physical clearance resolution
 */

import { BIMClashResult, BIMTrade, ClashSeverity, BoundingBox3D } from "./bim-clash-detector";

export type PunchListStatus = 
  | "DISPATCHED" 
  | "CONTRACTOR_ACKNOWLEDGED" 
  | "WORK_COMPLETED" 
  | "VERIFIED_CLEARANCE" 
  | "DISPUTED";

export interface TradeSubcontractorProfile {
  subcontractorId: string;
  companyName: string;
  trade: BIMTrade;
  contactEmail: string;
  leadSuperintendent: string;
  slaMaxResponseHours: number;
}

export interface BIMClashPunchListItem {
  punchId: string;
  clashId: string;
  title: string;
  assignedTrade: BIMTrade;
  responsibleSubcontractorId: string;
  secondarySubcontractorId?: string;
  severity: ClashSeverity;
  resolutionDeadlineIso: string;
  status: PunchListStatus;
  locationCoordinates: [number, number, number];
  remediationInstructions: string;
  dispatchedAtIso: string;
  resolvedAtIso?: string;
}

export interface RouterSummaryReport {
  projectId: string;
  totalPunchItemsCreated: number;
  criticalPunchesCount: number;
  tradeDispatchBreakdown: Record<BIMTrade, number>;
  items: BIMClashPunchListItem[];
  generatedAtIso: string;
}

export class BIMClashPunchListRouter {
  private subcontractorsByTrade: Map<BIMTrade, TradeSubcontractorProfile> = new Map();
  private activePunchItems: Map<string, BIMClashPunchListItem> = new Map();

  public registerSubcontractor(subcontractor: TradeSubcontractorProfile): void {
    this.subcontractorsByTrade.set(subcontractor.trade, subcontractor);
  }

  public routeClashesToPunchList(
    projectId: string,
    clashes: BIMClashResult[],
    baseDate: Date = new Date()
  ): RouterSummaryReport {
    const tradeBreakdown: Record<BIMTrade, number> = {
      STRUCTURAL: 0,
      MEP_HVAC: 0,
      PLUMBING: 0,
      ELECTRICAL: 0,
      ARCHITECTURAL: 0
    };

    let criticalCount = 0;
    const items: BIMClashPunchListItem[] = [];

    for (const clash of clashes) {
      // Primary responsible trade is determined by soft/hard clearance rules:
      // Typically MEP/HVAC or Plumbing yields to Structural, Electrical routes around Ducting
      const primaryTrade = this.determineResponsibleTrade(clash);
      const sub = this.subcontractorsByTrade.get(primaryTrade);
      const subId = sub ? sub.subcontractorId : `UNASSIGNED_${primaryTrade}`;

      tradeBreakdown[primaryTrade] = (tradeBreakdown[primaryTrade] || 0) + 1;
      if (clash.severity === "CRITICAL") {
        criticalCount++;
      }

      const deadlineHours = this.getSlaHoursForSeverity(clash.severity);
      const deadline = new Date(baseDate.getTime() + deadlineHours * 60 * 60 * 1000);

      const punchItem: BIMClashPunchListItem = {
        punchId: `PUNCH-BIM-${clash.clashId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 12)}-${Date.now().toString().slice(-4)}`,
        clashId: clash.clashId,
        title: `[${clash.severity}] Fix ${clash.elementA.trade} vs ${clash.elementB.trade} clash`,
        assignedTrade: primaryTrade,
        responsibleSubcontractorId: subId,
        secondarySubcontractorId: this.subcontractorsByTrade.get(clash.elementA.trade === primaryTrade ? clash.elementB.trade : clash.elementA.trade)?.subcontractorId,
        severity: clash.severity,
        resolutionDeadlineIso: deadline.toISOString(),
        status: "DISPATCHED",
        locationCoordinates: clash.clashCentroid,
        remediationInstructions: this.generateRemediationInstructions(clash, primaryTrade),
        dispatchedAtIso: baseDate.toISOString()
      };

      this.activePunchItems.set(punchItem.punchId, punchItem);
      items.push(punchItem);
    }

    return {
      projectId,
      totalPunchItemsCreated: items.length,
      criticalPunchesCount: criticalCount,
      tradeDispatchBreakdown: tradeBreakdown,
      items,
      generatedAtIso: baseDate.toISOString()
    };
  }

  public updatePunchStatus(punchId: string, newStatus: PunchListStatus): boolean {
    const item = this.activePunchItems.get(punchId);
    if (!item) return false;
    item.status = newStatus;
    if (newStatus === "VERIFIED_CLEARANCE" || newStatus === "WORK_COMPLETED") {
      item.resolvedAtIso = new Date().toISOString();
    }
    return true;
  }

  public verifyRectifiedClearance(
    punchId: string,
    newBoxA: BoundingBox3D,
    newBoxB: BoundingBox3D,
    requiredClearanceMeters: number = 0.05
  ): boolean {
    const item = this.activePunchItems.get(punchId);
    if (!item) return false;

    // Check if bounding boxes now have required clearance gap
    const xOverlap = !(newBoxA.maxX + requiredClearanceMeters < newBoxB.minX || newBoxB.maxX + requiredClearanceMeters < newBoxA.minX);
    const yOverlap = !(newBoxA.maxY + requiredClearanceMeters < newBoxB.minY || newBoxB.maxY + requiredClearanceMeters < newBoxA.minY);
    const zOverlap = !(newBoxA.maxZ + requiredClearanceMeters < newBoxB.minZ || newBoxB.maxZ + requiredClearanceMeters < newBoxA.minZ);

    const isClashing = xOverlap && yOverlap && zOverlap;
    if (!isClashing) {
      item.status = "VERIFIED_CLEARANCE";
      item.resolvedAtIso = new Date().toISOString();
      return true;
    }
    return false;
  }

  private determineResponsibleTrade(clash: BIMClashResult): BIMTrade {
    const tradeA = clash.elementA.trade;
    const tradeB = clash.elementB.trade;

    // Structural elements never move; MEP/HVAC, Plumbing, and Electrical must re-route
    if (tradeA === "STRUCTURAL" && tradeB !== "STRUCTURAL") return tradeB;
    if (tradeB === "STRUCTURAL" && tradeA !== "STRUCTURAL") return tradeA;

    // HVAC ducts yield to gravity plumbing drainage
    if (tradeA === "PLUMBING" && tradeB === "MEP_HVAC") return "MEP_HVAC";
    if (tradeB === "PLUMBING" && tradeA === "MEP_HVAC") return "MEP_HVAC";

    // Electrical conduits are flexible and route around everything
    if (tradeA === "ELECTRICAL") return "ELECTRICAL";
    if (tradeB === "ELECTRICAL") return "ELECTRICAL";

    return tradeA;
  }

  private getSlaHoursForSeverity(severity: ClashSeverity): number {
    switch (severity) {
      case "CRITICAL": return 24;
      case "MAJOR": return 72;
      case "MINOR": return 168; // 7 days
      case "TOLERANCE_ACCEPTABLE": return 336; // 14 days
    }
  }

  private generateRemediationInstructions(clash: BIMClashResult, trade: BIMTrade): string {
    const penetration = clash.penetrationDepthMeters.toFixed(3);
    return `Relocate ${trade} run at [${clash.clashCentroid.map(n => n.toFixed(2)).join(", ")}]. Hard clash penetration: ${penetration}m. Coordinate offset with trade partner before field drilling.`;
  }
}
