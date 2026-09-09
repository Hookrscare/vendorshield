/**
 * QA-112: Multi-Tenant DPA Change Notification Webhook Engine
 * Powers automated compliance notifications for GDPR Article 28(2) & SOC 2 CC9.2 sub-processor updates.
 */

import crypto from "crypto";
import { SubProcessorVendor } from "./types";

export type DPAChangeEventType =
  | "subprocessor.added"
  | "subprocessor.modified"
  | "subprocessor.removed"
  | "dpa.terms_updated";

export interface DPAChangeEvent {
  eventId: string;
  tenantId: string;
  eventType: DPAChangeEventType;
  timestamp: string;
  effectiveDate: string; // GDPR requires prior notice window (e.g. 14-30 days)
  vendor: Partial<SubProcessorVendor>;
  changeSummary: string;
}

export interface WebhookEndpoint {
  id: string;
  tenantId: string;
  url: string;
  secret: string; // HMAC secret key
  isActive: boolean;
  subscribedEvents: DPAChangeEventType[];
}

export interface WebhookDeliveryResult {
  deliveryId: string;
  endpointId: string;
  statusCode: number;
  success: boolean;
  attempts: number;
  deliveredAt: string;
  error?: string;
}

/**
 * Generate cryptographically secure HMAC-SHA256 signature header.
 */
export function signWebhookPayload(payload: string, secret: string): string {
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(payload, "utf8");
  return `sha256=${hmac.digest("hex")}`;
}

/**
 * Verify webhook signature with timing-safe buffer comparison to prevent side-channel attacks.
 */
export function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  try {
    const expected = signWebhookPayload(payload, secret);
    const expectedBuf = Buffer.from(expected);
    const actualBuf = Buffer.from(signature);

    if (expectedBuf.length !== actualBuf.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuf, actualBuf);
  } catch {
    return false;
  }
}

/**
 * Construct standard DPA notification payload.
 */
export function createDPAChangeEvent(
  tenantId: string,
  eventType: DPAChangeEventType,
  vendor: Partial<SubProcessorVendor>,
  changeSummary: string,
  effectiveNoticeDays: number = 30
): DPAChangeEvent {
  const now = new Date();
  const effective = new Date(now.getTime() + effectiveNoticeDays * 24 * 60 * 60 * 1000);

  return {
    eventId: `evt_${crypto.randomBytes(12).toString("hex")}`,
    tenantId,
    eventType,
    timestamp: now.toISOString(),
    effectiveDate: effective.toISOString().split("T")[0],
    vendor,
    changeSummary,
  };
}

/**
 * Dispatch webhook notification to tenant endpoint with signature and retry backoff.
 */
export async function dispatchWebhookEvent(
  event: DPAChangeEvent,
  endpoint: WebhookEndpoint,
  fetchFn: typeof fetch = fetch,
  maxAttempts: number = 3
): Promise<WebhookDeliveryResult> {
  const deliveryId = `del_${crypto.randomBytes(10).toString("hex")}`;
  const payloadString = JSON.stringify(event);
  const signature = signWebhookPayload(payloadString, endpoint.secret);

  if (!endpoint.isActive || !endpoint.subscribedEvents.includes(event.eventType)) {
    return {
      deliveryId,
      endpointId: endpoint.id,
      statusCode: 0,
      success: false,
      attempts: 0,
      deliveredAt: new Date().toISOString(),
      error: "Endpoint inactive or unsubscribed from event type",
    };
  }

  let attempts = 0;
  let lastError: string | undefined;

  for (let i = 1; i <= maxAttempts; i++) {
    attempts = i;
    try {
      const response = await fetchFn(endpoint.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "VendorShield-Webhook-Dispatcher/2.0",
          "x-vendorshield-signature": signature,
          "x-vendorshield-event": event.eventType,
          "x-vendorshield-delivery-id": deliveryId,
          "x-vendorshield-timestamp": event.timestamp,
        },
        body: payloadString,
      });

      if (response.ok || (response.status >= 200 && response.status < 300)) {
        return {
          deliveryId,
          endpointId: endpoint.id,
          statusCode: response.status,
          success: true,
          attempts,
          deliveredAt: new Date().toISOString(),
        };
      } else {
        lastError = `HTTP ${response.status}: ${response.statusText || "Delivery failed"}`;
      }
    } catch (err: any) {
      lastError = err?.message || "Network delivery error";
    }
  }

  return {
    deliveryId,
    endpointId: endpoint.id,
    statusCode: 500,
    success: false,
    attempts,
    deliveredAt: new Date().toISOString(),
    error: lastError,
  };
}
