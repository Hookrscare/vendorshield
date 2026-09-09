/**
 * SNAP-28: Multi-Trade Subcontractor Punch-List Task Assignment Push Notification Dispatcher.
 * Part of SnapInspect AI Tactical Field Inspection CAD & Mobile Voice AI.
 * Automates defect punch-list item creation, trade subcontractor routing, SLA deadline calculation,
 * Web Push (VAPID RFC 8292) payload dispatching, and overdue escalation tracking.
 */

export type SubcontractorTrade =
  | "ROOFING"
  | "HVAC"
  | "PLUMBING"
  | "ELECTRICAL"
  | "STRUCTURAL_CARPENTRY"
  | "FINISH_DRYWALL"
  | "GENERAL_CONTRACTOR";

export type DefectSeverity = "CRITICAL" | "MAJOR" | "MINOR" | "COSMETIC";

export type PunchListStatus =
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "SUBMITTED_FOR_REINSPECTION"
  | "APPROVED_RESOLVED"
  | "ESCALATED_OVERDUE";

export interface FieldDefectInput {
  defectId: string;
  title: string;
  description: string;
  trade: SubcontractorTrade;
  severity: DefectSeverity;
  floorplanCadCoordinates?: { x: number; y: number; floor: string };
  photoUrl?: string;
  assignedSubcontractorId?: string;
  subcontractorPushSubscription?: {
    endpoint: string;
    auth: string;
    p256dh: string;
  };
}

export interface PunchListItem {
  punchId: string;
  defectId: string;
  title: string;
  trade: SubcontractorTrade;
  severity: DefectSeverity;
  slaHours: number;
  assignedAtIso: string;
  dueAtIso: string;
  status: PunchListStatus;
  subcontractorId: string;
  floorplanCoordinates?: { x: number; y: number; floor: string };
  photoUrl?: string;
}

export interface WebPushPayload {
  title: string;
  body: string;
  icon: string;
  badge: string;
  data: {
    punchId: string;
    defectId: string;
    severity: DefectSeverity;
    dueAtIso: string;
    actionUrl: string;
  };
}

export class PunchListDispatcher {
  public static SLA_HOURS_MAP: Record<DefectSeverity, number> = {
    CRITICAL: 24, // 24 hours
    MAJOR: 48,    // 48 hours
    MINOR: 168,   // 7 days
    COSMETIC: 336 // 14 days
  };

  public static createPunchListItem(
    defect: FieldDefectInput,
    assignedAt: Date = new Date()
  ): PunchListItem {
    const slaHours = this.SLA_HOURS_MAP[defect.severity] || 72;
    const dueAt = new Date(assignedAt.getTime() + slaHours * 3600 * 1000);

    return {
      punchId: `punch-${defect.trade.toLowerCase()}-${Date.now().toString(36)}`,
      defectId: defect.defectId,
      title: defect.title,
      trade: defect.trade,
      severity: defect.severity,
      slaHours,
      assignedAtIso: assignedAt.toISOString(),
      dueAtIso: dueAt.toISOString(),
      status: "ASSIGNED",
      subcontractorId: defect.assignedSubcontractorId || `sub-${defect.trade.toLowerCase()}-default`,
      floorplanCoordinates: defect.floorplanCadCoordinates,
      photoUrl: defect.photoUrl,
    };
  }

  public static generateWebPushPayload(item: PunchListItem, siteAddress: string = "Inspection Site"): WebPushPayload {
    const isUrgent = item.severity === "CRITICAL" || item.severity === "MAJOR";
    const title = `${isUrgent ? "🚨 URGENT: " : "📋 "}New Punch Item: ${item.title}`;
    const body = `[${item.trade}] Severity: ${item.severity} at ${siteAddress}. SLA Due: ${new Date(item.dueAtIso).toLocaleDateString()}`;

    return {
      title,
      body,
      icon: "/icons/snapinspect-push-192.png",
      badge: "/icons/snapinspect-badge.png",
      data: {
        punchId: item.punchId,
        defectId: item.defectId,
        severity: item.severity,
        dueAtIso: item.dueAtIso,
        actionUrl: `/snapinspect/punchlist/${item.punchId}`,
      },
    };
  }

  public static evaluateSlaStatus(item: PunchListItem, currentTime: Date = new Date()): PunchListStatus {
    if (item.status === "APPROVED_RESOLVED" || item.status === "SUBMITTED_FOR_REINSPECTION") {
      return item.status;
    }

    const dueEpoch = new Date(item.dueAtIso).getTime();
    if (currentTime.getTime() > dueEpoch) {
      return "ESCALATED_OVERDUE";
    }

    return item.status;
  }

  public static batchDispatch(
    defects: FieldDefectInput[],
    siteAddress: string = "100 Construction Way"
  ): { items: PunchListItem[]; pushNotifications: WebPushPayload[]; overdueCount: number } {
    const items: PunchListItem[] = [];
    const pushNotifications: WebPushPayload[] = [];

    for (const d of defects) {
      const item = this.createPunchListItem(d);
      const push = this.generateWebPushPayload(item, siteAddress);
      items.push(item);
      pushNotifications.push(push);
    }

    const overdue = items.filter((i) => this.evaluateSlaStatus(i) === "ESCALATED_OVERDUE").length;

    return {
      items,
      pushNotifications,
      overdueCount: overdue,
    };
  }
}
