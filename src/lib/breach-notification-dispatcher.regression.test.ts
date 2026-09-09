import { describe, it, expect } from "vitest";
import {
  calculateSLADeadline,
  evaluateSLAStatus,
  generateCustomerDispatch,
  buildIncidentDispatchPlan,
  type SubProcessorIncident,
  type EnterpriseCustomerDPA
} from "./breach-notification-dispatcher";

describe("QA-120: Sub-Processor Breach Notification SLA Dispatcher", () => {
  const baseIncident: SubProcessorIncident = {
    incidentId: "INC-2026-089",
    subProcessorId: "sub-snowflake",
    subProcessorName: "Snowflake Computing Inc.",
    detectedAtIso: "2026-09-07T12:00:00.000Z",
    severity: "P2_HIGH",
    affectedServices: ["Data Warehouse US-East-1", "Query Engine"],
    piiExfiltrated: false,
    incidentSummary: "Unauthorized third-party accessed misconfigured staging database mirror.",
    containmentStatus: "CONTAINED"
  };

  const sampleCustomers: EnterpriseCustomerDPA[] = [
    {
      customerId: "cust-acme",
      customerName: "Acme FinTech Corp",
      securityContactEmail: "ciso@acme.example.com",
      slaTier: "ENTERPRISE_24H",
      subProcessorsInScope: ["sub-snowflake", "sub-aws"]
    },
    {
      customerId: "cust-beta",
      customerName: "Beta Health Inc",
      securityContactEmail: "secops@betahealth.example.com",
      slaTier: "STANDARD_48H",
      subProcessorsInScope: ["sub-snowflake"]
    },
    {
      customerId: "cust-gamma",
      customerName: "Gamma Retail LLC",
      securityContactEmail: "privacy@gamma.example.com",
      slaTier: "STATUTORY_72H",
      subProcessorsInScope: ["sub-sendgrid"] // Not in scope for Snowflake incident
    }
  ];

  it("calculates accurate ISO deadlines based on SLA hours", () => {
    const deadline12 = calculateSLADeadline("2026-09-07T12:00:00.000Z", 12);
    expect(deadline12).toBe("2026-09-08T00:00:00.000Z");

    const deadline24 = calculateSLADeadline("2026-09-07T12:00:00.000Z", 24);
    expect(deadline24).toBe("2026-09-08T12:00:00.000Z");
  });

  it("evaluates SLA status correctly (WITHIN_SLA, EXPIRING_SOON, BREACHED)", () => {
    // 24h SLA from 12:00 -> deadline is 12:00 next day
    // Case 1: Checked 2 hours later (22h left) -> WITHIN_SLA
    const st1 = evaluateSLAStatus("2026-09-07T12:00:00.000Z", 24, "2026-09-07T14:00:00.000Z");
    expect(st1.status).toBe("WITHIN_SLA");
    expect(st1.hoursRemaining).toBe(22);

    // Case 2: Checked 20 hours later (4h left <= 6h) -> EXPIRING_SOON
    const st2 = evaluateSLAStatus("2026-09-07T12:00:00.000Z", 24, "2026-09-08T08:00:00.000Z");
    expect(st2.status).toBe("EXPIRING_SOON");
    expect(st2.hoursRemaining).toBe(4);

    // Case 3: Checked 26 hours later (-2h) -> BREACHED
    const st3 = evaluateSLAStatus("2026-09-07T12:00:00.000Z", 24, "2026-09-08T14:00:00.000Z");
    expect(st3.status).toBe("BREACHED");
    expect(st3.hoursRemaining).toBe(-2);
  });

  it("elevates P1 critical incident to 12h emergency SLA and includes DPA action item", () => {
    const p1Incident: SubProcessorIncident = {
      ...baseIncident,
      severity: "P1_CRITICAL",
      piiExfiltrated: true
    };

    const dispatch = generateCustomerDispatch(
      p1Incident,
      sampleCustomers[1], // Beta Health normally has STANDARD_48H
      "2026-09-07T13:00:00.000Z"
    );

    expect(dispatch.slaTier).toBe("EMERGENCY_12H");
    expect(dispatch.slaHoursAllowed).toBe(12);
    expect(dispatch.hoursRemaining).toBe(11);
    expect(dispatch.notificationPayload.actionItems.some(i => i.includes("GDPR Article 33"))).toBe(true);
    expect(dispatch.notificationPayload.bodyMarkdown).toContain("Confirmed / Likely Impacted");
  });

  it("builds a prioritized incident dispatch plan filtering relevant tenants", () => {
    const plan = buildIncidentDispatchPlan(
      baseIncident,
      sampleCustomers,
      "2026-09-07T14:00:00.000Z" // 2h after detection
    );

    expect(plan.incidentId).toBe("INC-2026-089");
    // Gamma Retail should be excluded because Snowflake is not in scope
    expect(plan.totalCustomersInScope).toBe(2);
    expect(plan.withinSlaCount).toBe(2);
    expect(plan.breachedCount).toBe(0);
    expect(plan.dispatches[0].customerId).toBe("cust-acme"); // 22h remaining vs 46h remaining
  });
});
