import crypto from 'crypto';

export type DpaBreachType =
  | 'unauthorized_subprocessor_addition'
  | 'cross_border_data_exfiltration'
  | 'unencrypted_pii_storage'
  | 'retention_period_exceeded'
  | 'audit_right_denial';

export type InjunctionSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface DpaBreachEvent {
  vendorId: string;
  vendorName: string;
  dpaContractId: string;
  breachType: DpaBreachType;
  details: string;
  timestamp: string;
}

export interface InjunctionDispatchNotice {
  noticeId: string;
  dpaContractId: string;
  vendorId: string;
  severity: InjunctionSeverity;
  demandedRemediations: string[];
  freezeApiAccess: boolean;
  curePeriodHours: number;
  digitalSignatureSha256: string;
  dispatchedAt: string;
}

export class EnterpriseDpaInjunctionDispatcher {
  private signingSecret: string;

  constructor(signingSecret = 'dpa-legal-vault-secret') {
    this.signingSecret = signingSecret;
  }

  public assessSeverity(breachType: DpaBreachType): InjunctionSeverity {
    switch (breachType) {
      case 'cross_border_data_exfiltration':
      case 'unencrypted_pii_storage':
        return 'CRITICAL';
      case 'unauthorized_subprocessor_addition':
      case 'audit_right_denial':
        return 'HIGH';
      case 'retention_period_exceeded':
        return 'MEDIUM';
      default:
        return 'LOW';
    }
  }

  public evaluateAndDispatch(event: DpaBreachEvent): InjunctionDispatchNotice {
    const severity = this.assessSeverity(event.breachType);
    const noticeId = `INJ-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;

    const demandedRemediations: string[] = [];
    let freezeApiAccess = false;
    let curePeriodHours = 72; // Default Standard cure period

    if (severity === 'CRITICAL') {
      freezeApiAccess = true;
      curePeriodHours = 24;
      demandedRemediations.push('Immediate emergency egress API credential revocation and token escrow suspension');
      demandedRemediations.push('Submit cryptographic proof of data deletion or perimeter containment within 24 hours');
    } else if (severity === 'HIGH') {
      freezeApiAccess = false;
      curePeriodHours = 48;
      demandedRemediations.push('Cease unauthorized data flows to unvetted sub-processor entities');
      demandedRemediations.push('Provide executed SCC/DPA addendum and SOC 2 Type II audit telemetry');
    } else {
      curePeriodHours = 72;
      demandedRemediations.push('Purge out-of-retention data sets and issue formal Certificate of Destruction');
    }

    const payload = `${noticeId}:${event.dpaContractId}:${event.vendorId}:${severity}:${curePeriodHours}`;
    const digitalSignatureSha256 = crypto
      .createHmac('sha256', this.signingSecret)
      .update(payload)
      .digest('hex');

    return {
      noticeId,
      dpaContractId: event.dpaContractId,
      vendorId: event.vendorId,
      severity,
      demandedRemediations,
      freezeApiAccess,
      curePeriodHours,
      digitalSignatureSha256,
      dispatchedAt: new Date().toISOString(),
    };
  }

  public verifyNoticeSignature(notice: InjunctionDispatchNotice): boolean {
    const payload = `${notice.noticeId}:${notice.dpaContractId}:${notice.vendorId}:${notice.severity}:${notice.curePeriodHours}`;
    const expected = crypto
      .createHmac('sha256', this.signingSecret)
      .update(payload)
      .digest('hex');
    return expected === notice.digitalSignatureSha256;
  }
}
