/**
 * Regression Test Suite for QA-172: Automated DPA & Sub-Processor Change Notification Webhook Dispatcher.
 * Part of VendorShield B2B SOC 2 & GDPR Sub-Processor Trust Hub.
 */

import { describe, it, expect } from "vitest";
import {
  SubprocessorChangeNotificationDispatcher,
  type SubProcessorChangeEvent
} from "./subprocessor-change-notification-dispatcher";

describe("QA-172: Sub-Processor Change Notification Dispatcher", () => {
  it("successfully dispatches notice with compliant 30+ day window", () => {
    const event: SubProcessorChangeEvent = {
      changeId: "CHG-2026-004",
      vendorId: "VEN-PINECONE-01",
      vendorName: "Pinecone Vector DB",
      actionType: "ADDITION",
      noticeDispatchedDateIso: "2026-09-01T00:00:00.000Z",
      effectiveDateIso: "2026-10-15T00:00:00.000Z", // 44 days
      dataCategoriesInvolved: ["Vector Embeddings", "Metadata"],
      subProcessorCountry: "US"
    };

    const res = SubprocessorChangeNotificationDispatcher.dispatchChangeNotice("TENANT-ENTERPRISE-A", event, 30);

    expect(res.notificationStatus).toBe("DISPATCHED_PENDING_OBJECTION_WINDOW");
    expect(res.daysNoticeProvided).toBeGreaterThanOrEqual(30);
    expect(res.dispatchDigest).toHaveLength(64);
  });

  it("flags invalid notice when notice window is shorter than DPA mandate", () => {
    const event: SubProcessorChangeEvent = {
      changeId: "CHG-SHORT-001",
      vendorId: "VEN-FAST-01",
      vendorName: "Quick Cloud",
      actionType: "ADDITION",
      noticeDispatchedDateIso: "2026-09-01T00:00:00.000Z",
      effectiveDateIso: "2026-09-10T00:00:00.000Z", // only 9 days
      dataCategoriesInvolved: ["Logs"],
      subProcessorCountry: "DE"
    };

    const res = SubprocessorChangeNotificationDispatcher.dispatchChangeNotice("TENANT-B", event, 30);

    expect(res.notificationStatus).toBe("INVALID_NOTICE_WINDOW_TOO_SHORT");
    expect(res.daysNoticeProvided).toBe(9);
  });
});
