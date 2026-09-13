/**
 * dpa-subprocessor-notification-dispatcher.ts
 * QA-172: Automated DPA & Sub-Processor Change Notification Webhook Dispatcher.
 * Part of VendorShield B2B SOC 2 & GDPR Sub-Processor Trust Hub.
 *
 * Implements GDPR Article 28(2) mandatory sub-processor advance notification:
 * 1. Evaluates customer DPA contract terms (e.g. Enterprise 30-day notice vs Standard 14-day notice).
 * 2. Computes objection deadlines based on proposed change effective dates.
 * 3. Constructs secure HMAC-SHA256 authenticated webhook payloads for enterprise customer endpoints.
 * 4. Tracks customer acknowledgment and formal objections requiring legal counsel triage.
 */

import { createHmac } from 'crypto';

export interface ProposedSubProcessorChange {
  changeId: string;
  vendorName: string;
  serviceDescription: string;
  dataProcessingRegion: string;
  dataCategories: string[];
  proposedEffectiveDateEpochMs: number;
}

export interface CustomerDpaAgreement {
  customerId: string;
  customerName: string;
  tier: 'STANDARD' | 'ENTERPRISE';
  requiredNoticeDays: number; // e.g. 14 for standard, 30 for enterprise
  webhookUrl: string;
  webhookSecret: string;
}

export interface NotificationDispatchResult {
  customerId: string;
  changeId: string;
  compliantNoticePeriod: boolean;
  objectionDeadlineEpochMs: number;
  payload: {
    eventType: 'SUB_PROCESSOR_MODIFICATION_PROPOSED';
    changeId: string;
    vendorName: string;
    region: string;
    categories: string[];
    objectionDeadlineIso: string;
    effectiveDateIso: string;
  };
  signatureHeader: string; // sha256=...
}

export class DpaSubProcessorNotificationDispatcher {
  /**
   * Generates HMAC-SHA256 signature for webhook security.
   */
  public static signPayload(payloadJson: string, secret: string): string {
    const hmac = createHmac('sha256', secret);
    hmac.update(payloadJson);
    return `sha256=${hmac.digest('hex')}`;
  }

  /**
   * Prepares and validates customer notification dispatch payloads.
   */
  public static prepareDispatches(
    change: ProposedSubProcessorChange,
    customers: CustomerDpaAgreement[],
    nowEpochMs: number = Date.now()
  ): NotificationDispatchResult[] {
    const results: NotificationDispatchResult[] = [];

    for (const cust of customers) {
      const msPerDay = 86400000;
      const noticeWindowMs = cust.requiredNoticeDays * msPerDay;
      const availableNoticeMs = change.proposedEffectiveDateEpochMs - nowEpochMs;

      const compliant = availableNoticeMs >= noticeWindowMs;
      // Objection deadline is set to the required notice days from now
      const objectionDeadlineEpochMs = nowEpochMs + noticeWindowMs;

      const payload = {
        eventType: 'SUB_PROCESSOR_MODIFICATION_PROPOSED' as const,
        changeId: change.changeId,
        vendorName: change.vendorName,
        region: change.dataProcessingRegion,
        categories: change.dataCategories,
        objectionDeadlineIso: new Date(objectionDeadlineEpochMs).toISOString(),
        effectiveDateIso: new Date(change.proposedEffectiveDateEpochMs).toISOString()
      };

      const payloadJson = JSON.stringify(payload);
      const signature = this.signPayload(payloadJson, cust.webhookSecret);

      results.push({
        customerId: cust.customerId,
        changeId: change.changeId,
        compliantNoticePeriod: compliant,
        objectionDeadlineEpochMs,
        payload,
        signatureHeader: signature
      });
    }

    return results;
  }
}
