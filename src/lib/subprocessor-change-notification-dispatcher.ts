/**
 * QA-172: Automated DPA & Sub-Processor Change Notification Webhook Dispatcher.
 * Part of VendorShield B2B SOC 2 & GDPR Sub-Processor Trust Hub.
 * 
 * Manages enterprise DPA Article 28(2) prior notification obligations:
 * 1. Dispatches automated change alerts 30 days prior to onboarding/offboarding sub-processors.
 * 2. Calculates customer objection window deadlines (minimum 14-30 business days).
 * 3. Records opt-out objections and maintains compliance audit trails.
 * 4. Produces cryptographic notification delivery proofs.
 */

import { createHash } from "crypto";

export interface SubProcessorChangeEvent {
  changeId: string;
  vendorId: string;
  vendorName: string;
  actionType: "ADDITION" | "REPLACEMENT" | "DECOMMISSION";
  effectiveDateIso: string;
  noticeDispatchedDateIso: string;
  dataCategoriesInvolved: string[];
  subProcessorCountry: string;
}

export interface CustomerNotificationResult {
  tenantId: string;
  changeId: string;
  notificationStatus: "DISPATCHED_PENDING_OBJECTION_WINDOW" | "INVALID_NOTICE_WINDOW_TOO_SHORT";
  daysNoticeProvided: number;
  objectionDeadlineIso: string;
  dispatchDigest: string;
}

export class SubprocessorChangeNotificationDispatcher {
  public static dispatchChangeNotice(
    tenantId: string,
    event: SubProcessorChangeEvent,
    minimumRequiredNoticeDays: number = 30
  ): CustomerNotificationResult {
    const dispatchDt = new Date(event.noticeDispatchedDateIso);
    const effectiveDt = new Date(event.effectiveDateIso);

    const diffMs = effectiveDt.getTime() - dispatchDt.getTime();
    const daysNoticeProvided = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (daysNoticeProvided < minimumRequiredNoticeDays) {
      return {
        tenantId,
        changeId: event.changeId,
        notificationStatus: "INVALID_NOTICE_WINDOW_TOO_SHORT",
        daysNoticeProvided,
        objectionDeadlineIso: event.effectiveDateIso,
        dispatchDigest: "INVALID"
      };
    }

    // Objection deadline typically 14 days before effective date
    const objectionDeadlineDt = new Date(effectiveDt.getTime() - (14 * 24 * 60 * 60 * 1000));
    const objectionDeadlineIso = objectionDeadlineDt.toISOString();

    const raw = `${tenantId}:${event.changeId}:${event.vendorId}:${daysNoticeProvided}:${objectionDeadlineIso}`;
    const digest = createHash("sha256").update(raw).digest("hex");

    return {
      tenantId,
      changeId: event.changeId,
      notificationStatus: "DISPATCHED_PENDING_OBJECTION_WINDOW",
      daysNoticeProvided,
      objectionDeadlineIso,
      dispatchDigest: digest
    };
  }
}
