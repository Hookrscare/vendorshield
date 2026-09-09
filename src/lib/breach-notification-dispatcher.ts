/**
 * QA-120: Automated B2B Sub-Processor Breach Notification SLA Dispatcher.
 * Enforces GDPR Article 33 (72h supervisory authority SLA) and enterprise DPA
 * contractual notification windows (12h P1 emergency, 24h Enterprise, 48h Standard)
 * when a sub-processor experiences a confirmed security incident.
 */

export type IncidentSeverity = "P1_CRITICAL" | "P2_HIGH" | "P3_MEDIUM" | "P4_LOW";

export type SLATier = "EMERGENCY_12H" | "ENTERPRISE_24H" | "STANDARD_48H" | "STATUTORY_72H";

export type SLAStatus = "WITHIN_SLA" | "EXPIRING_SOON" | "BREACHED";

export interface SubProcessorIncident {
  incidentId: string;
  subProcessorId: string;
  subProcessorName: string;
  detectedAtIso: string;
  severity: IncidentSeverity;
  affectedServices: string[];
  piiExfiltrated: boolean;
  incidentSummary: string;
  containmentStatus: "CONTAINED" | "INVESTIGATING" | "REMEDIATED";
}

export interface EnterpriseCustomerDPA {
  customerId: string;
  customerName: string;
  securityContactEmail: string;
  slaTier: SLATier;
  customSlaHours?: number;
  subProcessorsInScope: string[];
}

export interface CustomerBreachDispatch {
  dispatchId: string;
  incidentId: string;
  customerId: string;
  customerName: string;
  securityContactEmail: string;
  severity: IncidentSeverity;
  slaTier: SLATier;
  slaHoursAllowed: number;
  detectedAtIso: string;
  deadlineIso: string;
  hoursRemaining: number;
  status: SLAStatus;
  notificationPayload: {
    subject: string;
    bodyMarkdown: string;
    actionItems: string[];
    advisoryReference: string;
  };
}

export interface IncidentDispatchPlan {
  incidentId: string;
  subProcessorName: string;
  severity: IncidentSeverity;
  totalCustomersInScope: number;
  withinSlaCount: number;
  expiringSoonCount: number;
  breachedCount: number;
  dispatches: CustomerBreachDispatch[];
}

const SLA_HOURS_MAP: Record<SLATier, number> = {
  EMERGENCY_12H: 12,
  ENTERPRISE_24H: 24,
  STANDARD_48H: 48,
  STATUTORY_72H: 72
};

const MS_PER_HOUR = 60 * 60 * 1000;

export function calculateSLADeadline(detectedAtIso: string, slaHours: number): string {
  const detectedMs = new Date(detectedAtIso).getTime();
  const deadlineMs = detectedMs + slaHours * MS_PER_HOUR;
  return new Date(deadlineMs).toISOString();
}

export function evaluateSLAStatus(
  detectedAtIso: string,
  slaHours: number,
  nowIso?: string
): { deadlineIso: string; hoursRemaining: number; status: SLAStatus } {
  const deadlineIso = calculateSLADeadline(detectedAtIso, slaHours);
  const nowMs = nowIso ? new Date(nowIso).getTime() : Date.now();
  const deadlineMs = new Date(deadlineIso).getTime();

  const diffMs = deadlineMs - nowMs;
  const hoursRemaining = Math.round((diffMs / MS_PER_HOUR) * 10) / 10;

  let status: SLAStatus;
  if (hoursRemaining < 0) {
    status = "BREACHED";
  } else if (hoursRemaining <= 6) {
    status = "EXPIRING_SOON";
  } else {
    status = "WITHIN_SLA";
  }

  return { deadlineIso, hoursRemaining, status };
}

export function generateCustomerDispatch(
  incident: SubProcessorIncident,
  customer: EnterpriseCustomerDPA,
  nowIso?: string
): CustomerBreachDispatch {
  // P1 critical incidents override standard tier to EMERGENCY_12H unless customer tier is even tighter
  let effectiveTier = customer.slaTier;
  if (incident.severity === "P1_CRITICAL") {
    effectiveTier = "EMERGENCY_12H";
  }

  const allowedHours = customer.customSlaHours || SLA_HOURS_MAP[effectiveTier];
  const { deadlineIso, hoursRemaining, status } = evaluateSLAStatus(
    incident.detectedAtIso,
    allowedHours,
    nowIso
  );

  const dispatchId = `DISP-${incident.incidentId}-${customer.customerId}`;
  const subject = `[URGENT SECURITY ADVISORY] Sub-Processor Security Incident Notification: ${incident.subProcessorName}`;

  const bodyMarkdown = `
### Security Incident Notification: ${incident.subProcessorName}

**Customer Organization:** ${customer.customerName}  
**Incident Reference:** \`${incident.incidentId}\`  
**Severity:** \`${incident.severity}\`  
**Containment Status:** \`${incident.containmentStatus}\`  
**SLA Notification Window:** ${allowedHours} Hours (Deadline: \`${deadlineIso}\`)  

#### Incident Overview
${incident.incidentSummary}

- **Affected Sub-Processor Services:** ${incident.affectedServices.join(", ")}
- **PII Exposure Status:** ${incident.piiExfiltrated ? "Confirmed / Likely Impacted" : "No Confirmed PII Exfiltration"}
- **VendorShield Advisory Token:** \`VS-SEC-${incident.incidentId}-${Date.now()}\`
  `.trim();

  const actionItems: string[] = [
    `Notify internal CISO / Privacy team of ${incident.subProcessorName} incident`,
    "Review active data pipelines utilizing affected sub-processor services",
    "Monitor VendorShield Trust Hub portal for ongoing forensic status updates"
  ];

  if (incident.piiExfiltrated) {
    actionItems.unshift("Prepare Data Protection Authority (DPA) GDPR Article 33 provisional notification");
  }

  return {
    dispatchId,
    incidentId: incident.incidentId,
    customerId: customer.customerId,
    customerName: customer.customerName,
    securityContactEmail: customer.securityContactEmail,
    severity: incident.severity,
    slaTier: effectiveTier,
    slaHoursAllowed: allowedHours,
    detectedAtIso: incident.detectedAtIso,
    deadlineIso,
    hoursRemaining,
    status,
    notificationPayload: {
      subject,
      bodyMarkdown,
      actionItems,
      advisoryReference: `VS-SEC-${incident.incidentId}`
    }
  };
}

export function buildIncidentDispatchPlan(
  incident: SubProcessorIncident,
  customerRoster: EnterpriseCustomerDPA[],
  nowIso?: string
): IncidentDispatchPlan {
  const relevantCustomers = customerRoster.filter(c =>
    c.subProcessorsInScope.includes(incident.subProcessorId)
  );

  const dispatches = relevantCustomers.map(c =>
    generateCustomerDispatch(incident, c, nowIso)
  );

  // Sort: Breached first, then Expiring Soon, then ascending by hours remaining
  dispatches.sort((a, b) => a.hoursRemaining - b.hoursRemaining);

  let within = 0;
  let expiring = 0;
  let breached = 0;

  for (const d of dispatches) {
    if (d.status === "WITHIN_SLA") within++;
    else if (d.status === "EXPIRING_SOON") expiring++;
    else breached++;
  }

  return {
    incidentId: incident.incidentId,
    subProcessorName: incident.subProcessorName,
    severity: incident.severity,
    totalCustomersInScope: dispatches.length,
    withinSlaCount: within,
    expiringSoonCount: expiring,
    breachedCount: breached,
    dispatches
  };
}
