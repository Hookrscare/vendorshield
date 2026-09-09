/**
 * QA-146: Real-Time Third-Party Webhook Security & Signature Validation Engine
 * Part of VendorShield B2B Enterprise Compliance Platform.
 *
 * Provides cryptographic validation, replay attack prevention, timestamp tolerance checks,
 * and idempotency tracking for inbound webhooks across external vendor sub-processors,
 * payment gateways, and identity providers.
 */

import crypto from "crypto";

export type WebhookProviderType =
  | "standard_hmac_sha256"
  | "stripe_v1"
  | "svix_v1"
  | "github_sha256";

export interface InboundWebhookHeaders {
  [headerName: string]: string | string[] | undefined;
}

export interface InboundWebhookValidationOptions {
  provider: WebhookProviderType;
  secret: string;
  rawPayload: string | Buffer;
  headers: InboundWebhookHeaders;
  toleranceSeconds?: number; // Default 300s (5 min)
}

export interface InboundWebhookValidationResult {
  isValid: boolean;
  provider: WebhookProviderType;
  eventId?: string;
  timestamp?: number;
  reason?: string;
  auditFingerprint: string;
}

export class InboundWebhookSecurityEngine {
  private static processedEventNonces: Map<string, number> = new Map();
  private static readonly NONCE_PURGE_TTL_MS = 600_000; // 10 minutes

  /**
   * Cleans expired nonces to prevent memory leaks in continuous runtime.
   */
  public static purgeExpiredNonces(): void {
    const now = Date.now();
    for (const [nonce, timestamp] of this.processedEventNonces.entries()) {
      if (now - timestamp > this.NONCE_PURGE_TTL_MS) {
        this.processedEventNonces.delete(nonce);
      }
    }
  }

  /**
   * Resets nonce cache (primarily for isolated test fixtures).
   */
  public static resetNonceCache(): void {
    this.processedEventNonces.clear();
  }

  /**
   * Validates inbound webhook cryptographic integrity and replay guardrails.
   */
  public static validate(
    options: InboundWebhookValidationOptions
  ): InboundWebhookValidationResult {
    this.purgeExpiredNonces();

    const tolerance = options.toleranceSeconds ?? 300;
    const nowSec = Math.floor(Date.now() / 1000);
    const payloadStr =
      typeof options.rawPayload === "string"
        ? options.rawPayload
        : options.rawPayload.toString("utf-8");

    const auditFingerprint = crypto
      .createHash("sha256")
      .update(`${options.provider}:${payloadStr}`)
      .digest("hex")
      .substring(0, 16);

    switch (options.provider) {
      case "standard_hmac_sha256": {
        const sigHeader = this.getHeader(options.headers, "x-signature-sha256") ||
                          this.getHeader(options.headers, "x-hub-signature-256");
        if (!sigHeader) {
          return {
            isValid: false,
            provider: options.provider,
            reason: "Missing signature header (x-signature-sha256)",
            auditFingerprint,
          };
        }

        const expectedSig = crypto
          .createHmac("sha256", options.secret)
          .update(payloadStr, "utf8")
          .digest("hex");

        const cleanSig = sigHeader.replace(/^sha256=/, "");
        if (!this.timingSafeEqual(cleanSig, expectedSig)) {
          return {
            isValid: false,
            provider: options.provider,
            reason: "Signature mismatch",
            auditFingerprint,
          };
        }

        return {
          isValid: true,
          provider: options.provider,
          auditFingerprint,
        };
      }

      case "github_sha256": {
        const sigHeader = this.getHeader(options.headers, "x-hub-signature-256");
        if (!sigHeader || !sigHeader.startsWith("sha256=")) {
          return {
            isValid: false,
            provider: options.provider,
            reason: "Missing or malformed x-hub-signature-256 header",
            auditFingerprint,
          };
        }

        const expectedSig = crypto
          .createHmac("sha256", options.secret)
          .update(payloadStr, "utf8")
          .digest("hex");

        const actualSig = sigHeader.substring(7);
        if (!this.timingSafeEqual(actualSig, expectedSig)) {
          return {
            isValid: false,
            provider: options.provider,
            reason: "GitHub HMAC signature verification failed",
            auditFingerprint,
          };
        }

        const deliveryId = this.getHeader(options.headers, "x-github-delivery");
        if (deliveryId) {
          if (this.processedEventNonces.has(deliveryId)) {
            return {
              isValid: false,
              provider: options.provider,
              eventId: deliveryId,
              reason: "Replay attack detected: duplicate delivery ID",
              auditFingerprint,
            };
          }
          this.processedEventNonces.set(deliveryId, Date.now());
        }

        return {
          isValid: true,
          provider: options.provider,
          eventId: deliveryId,
          auditFingerprint,
        };
      }

      case "stripe_v1": {
        const sigHeader = this.getHeader(options.headers, "stripe-signature");
        if (!sigHeader) {
          return {
            isValid: false,
            provider: options.provider,
            reason: "Missing stripe-signature header",
            auditFingerprint,
          };
        }

        // Parse t=timestamp,v1=signature
        const items = sigHeader.split(",").map((s) => s.trim());
        let tStr: string | undefined;
        const v1Sigs: string[] = [];

        for (const item of items) {
          const [key, val] = item.split("=");
          if (key === "t") tStr = val;
          else if (key === "v1") v1Sigs.push(val);
        }

        if (!tStr || v1Sigs.length === 0) {
          return {
            isValid: false,
            provider: options.provider,
            reason: "Malformed stripe-signature header structure",
            auditFingerprint,
          };
        }

        const timestamp = parseInt(tStr, 10);
        if (isNaN(timestamp)) {
          return {
            isValid: false,
            provider: options.provider,
            reason: "Invalid timestamp in stripe-signature",
            auditFingerprint,
          };
        }

        // Check tolerance
        if (Math.abs(nowSec - timestamp) > tolerance) {
          return {
            isValid: false,
            provider: options.provider,
            timestamp,
            reason: `Timestamp outside tolerance window (${tolerance}s)`,
            auditFingerprint,
          };
        }

        // Signed payload: `${timestamp}.${payload}`
        const signedPayload = `${tStr}.${payloadStr}`;
        const expectedSig = crypto
          .createHmac("sha256", options.secret)
          .update(signedPayload, "utf8")
          .digest("hex");

        const matches = v1Sigs.some((sig) => this.timingSafeEqual(sig, expectedSig));
        if (!matches) {
          return {
            isValid: false,
            provider: options.provider,
            timestamp,
            reason: "Stripe v1 signature mismatch",
            auditFingerprint,
          };
        }

        const eventNonce = `stripe_${tStr}_${expectedSig.substring(0, 12)}`;
        if (this.processedEventNonces.has(eventNonce)) {
          return {
            isValid: false,
            provider: options.provider,
            reason: "Replay attack detected: duplicate Stripe event signature",
            auditFingerprint,
          };
        }
        this.processedEventNonces.set(eventNonce, Date.now());

        return {
          isValid: true,
          provider: options.provider,
          timestamp,
          auditFingerprint,
        };
      }

      case "svix_v1": {
        const msgId = this.getHeader(options.headers, "webhook-id");
        const msgTimestamp = this.getHeader(options.headers, "webhook-timestamp");
        const msgSignature = this.getHeader(options.headers, "webhook-signature");

        if (!msgId || !msgTimestamp || !msgSignature) {
          return {
            isValid: false,
            provider: options.provider,
            reason: "Missing required Svix headers (webhook-id, webhook-timestamp, webhook-signature)",
            auditFingerprint,
          };
        }

        const timestamp = parseInt(msgTimestamp, 10);
        if (isNaN(timestamp) || Math.abs(nowSec - timestamp) > tolerance) {
          return {
            isValid: false,
            provider: options.provider,
            reason: "Svix webhook-timestamp outside tolerance window",
            auditFingerprint,
          };
        }

        if (this.processedEventNonces.has(msgId)) {
          return {
            isValid: false,
            provider: options.provider,
            eventId: msgId,
            reason: "Replay attack detected: duplicate webhook-id",
            auditFingerprint,
          };
        }

        const toSign = `${msgId}.${msgTimestamp}.${payloadStr}`;
        const cleanSecret = options.secret.startsWith("whsec_")
          ? options.secret.substring(6)
          : options.secret;
        const secretBuf = Buffer.from(cleanSecret, "base64");

        const expectedSig = crypto
          .createHmac("sha256", secretBuf)
          .update(toSign, "utf8")
          .digest("base64");

        const passedSigs = msgSignature.split(" ").map((s) => s.trim().replace(/^v1,/, ""));
        const matches = passedSigs.some((sig) => this.timingSafeEqual(sig, expectedSig));

        if (!matches) {
          return {
            isValid: false,
            provider: options.provider,
            reason: "Svix v1 signature mismatch",
            auditFingerprint,
          };
        }

        this.processedEventNonces.set(msgId, Date.now());

        return {
          isValid: true,
          provider: options.provider,
          eventId: msgId,
          timestamp,
          auditFingerprint,
        };
      }

      default:
        return {
          isValid: false,
          provider: options.provider,
          reason: `Unsupported provider: ${options.provider}`,
          auditFingerprint,
        };
    }
  }

  private static getHeader(headers: InboundWebhookHeaders, name: string): string | undefined {
    const target = name.toLowerCase();
    for (const [key, value] of Object.entries(headers)) {
      if (key.toLowerCase() === target) {
        if (Array.isArray(value)) return value[0];
        return value;
      }
    }
    return undefined;
  }

  private static timingSafeEqual(a: string, b: string): boolean {
    try {
      const bufA = Buffer.from(a);
      const bufB = Buffer.from(b);
      if (bufA.length !== bufB.length) return false;
      return crypto.timingSafeEqual(bufA, bufB);
    } catch {
      return false;
    }
  }
}
