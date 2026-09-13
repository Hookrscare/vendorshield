import { describe, it, expect, beforeEach } from 'vitest';
import crypto from 'crypto';
import {
  WebhookTurnstileSecurityGateway,
  WebhookPayloadRequest
} from './webhook-turnstile-security-gateway';

describe('QA-187: Webhook Signature & Replay Defense Gateway', () => {
  const SECRET = 'whsec_enterprise_top_secret_key_123';
  const PAYLOAD = JSON.stringify({ type: 'invoice.payment_succeeded', customerId: 'cust_8829' });

  beforeEach(() => {
    WebhookTurnstileSecurityGateway.resetNonceCache();
  });

  it('authorizes valid signed webhook within freshness window', () => {
    const epoch = 1700000000;
    const signedPayload = `${epoch}.${PAYLOAD}`;
    const sig = crypto.createHmac('sha256', SECRET).update(signedPayload, 'utf8').digest('hex');

    const req: WebhookPayloadRequest = {
      eventId: 'evt_stripe_9901',
      payloadJson: PAYLOAD,
      signatureHeader: `t=${epoch},v1=${sig}`,
      signingSecret: SECRET,
      currentEpochSec: epoch + 15 // 15 seconds later
    };

    const res = WebhookTurnstileSecurityGateway.verifyWebhookSignature(req);

    expect(res.isAuthorized).toBe(true);
    expect(res.status).toBe('GATEWAY_AUTHORIZED');
  });

  it('blocks duplicate event nonce replay attacks', () => {
    const epoch = 1700000000;
    const signedPayload = `${epoch}.${PAYLOAD}`;
    const sig = crypto.createHmac('sha256', SECRET).update(signedPayload, 'utf8').digest('hex');

    const req: WebhookPayloadRequest = {
      eventId: 'evt_duplicate_replay',
      payloadJson: PAYLOAD,
      signatureHeader: `t=${epoch},v1=${sig}`,
      signingSecret: SECRET,
      currentEpochSec: epoch + 20
    };

    // First attempt succeeds
    const firstRes = WebhookTurnstileSecurityGateway.verifyWebhookSignature(req);
    expect(firstRes.isAuthorized).toBe(true);

    // Second replay attempt blocked
    const replayRes = WebhookTurnstileSecurityGateway.verifyWebhookSignature(req);
    expect(replayRes.isAuthorized).toBe(false);
    expect(replayRes.status).toBe('DUPLICATE_EVENT_NONCE_REPLAY');
  });

  it('neutralizes expired webhooks with excessive timestamp drift', () => {
    const oldEpoch = 1700000000;
    const signedPayload = `${oldEpoch}.${PAYLOAD}`;
    const sig = crypto.createHmac('sha256', SECRET).update(signedPayload, 'utf8').digest('hex');

    const req: WebhookPayloadRequest = {
      eventId: 'evt_expired',
      payloadJson: PAYLOAD,
      signatureHeader: `t=${oldEpoch},v1=${sig}`,
      signingSecret: SECRET,
      currentEpochSec: oldEpoch + 600 // 10 minutes later (> 300s limit)
    };

    const res = WebhookTurnstileSecurityGateway.verifyWebhookSignature(req);

    expect(res.isAuthorized).toBe(false);
    expect(res.status).toBe('TIMESTAMP_DRIFT_REPLAY_ATTACK');
  });
});
