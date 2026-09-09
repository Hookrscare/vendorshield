import { createHash } from 'crypto';

export type AuthorisationType = 'SPECIFIC_WRITTEN' | 'GENERAL_WRITTEN';

export type SubProcessorChangeType = 'ADDITION' | 'REPLACEMENT' | 'REMOVAL';

export type TransferMechanism = 'SCC_MODULE_3' | 'ADEQUACY' | 'BCR' | 'DEROGATION_ART_49' | 'DOMESTIC_EEA';

export type ControllerStatus = 
  | 'PENDING_OBJECTION_WINDOW'
  | 'OBJECTION_SUBMITTED'
  | 'AUTHORIZED_AUTOMATIC'
  | 'EXPLICITLY_APPROVED'
  | 'CONTRACT_TERMINATION_REQUESTED';

export interface SubProcessorDraft {
  id: string;
  name: string;
  changeType: SubProcessorChangeType;
  dataCategories: string[];
  processingLocation: string; // e.g., 'DE', 'US', 'IE'
  isEeaTransfer: boolean;
  transferMechanism: TransferMechanism;
  passThroughDpaSigned: boolean;
  objectionWindowDays?: number; // default 30
}

export interface ControllerRecord {
  customerId: string;
  customerName: string;
  authorisationType: AuthorisationType;
  dpaContractId: string;
  status: ControllerStatus;
  noticeDispatchedAt: string;
  objectionDeadline: string;
  objectionReason?: string;
  objectionTimestamp?: string;
}

export interface Article28Notice {
  noticeId: string;
  createdAt: string;
  subProcessor: SubProcessorDraft;
  art28_4_flowDownCompliant: boolean;
  controllers: Record<string, ControllerRecord>;
  status: 'DISPATCHED' | 'OBJECTION_PERIOD_ACTIVE' | 'CLOSED';
}

export interface ObjectionResolution {
  customerId: string;
  action: 'PROVIDE_ALTERNATIVE' | 'TERMINATE_SERVICE' | 'ENTER_DISCUSSIONS';
  deadline: string;
  notes: string;
}

export class Article28AuthorizationEngine {
  private notices: Map<string, Article28Notice> = new Map();

  /**
   * Dispatches an Article 28(2) notice to controllers informing them of intended changes.
   */
  public initiateChangeNotice(
    subProcessor: SubProcessorDraft,
    customerList: Array<{ customerId: string; customerName: string; authType: AuthorisationType; dpaContractId: string }>,
    noticeDateIso: string
  ): Article28Notice {
    const noticeId = `art28-${Date.now()}-${subProcessor.id}`;
    const windowDays = subProcessor.objectionWindowDays ?? 30;

    const noticeDate = new Date(noticeDateIso);
    const deadlineDate = new Date(noticeDate.getTime() + windowDays * 24 * 60 * 60 * 1000);
    const objectionDeadlineIso = deadlineDate.toISOString();

    // Verify GDPR Article 28(4) pass-through requirements:
    // 1) Pass-through DPA must be signed
    // 2) If international EEA transfer, a recognized transfer mechanism must be present
    const crossBorderValid = !subProcessor.isEeaTransfer || subProcessor.transferMechanism !== 'DEROGATION_ART_49';
    const flowDownCompliant = subProcessor.passThroughDpaSigned && crossBorderValid;

    const controllers: Record<string, ControllerRecord> = {};
    for (const c of customerList) {
      controllers[c.customerId] = {
        customerId: c.customerId,
        customerName: c.customerName,
        authorisationType: c.authType,
        dpaContractId: c.dpaContractId,
        status: c.authType === 'SPECIFIC_WRITTEN' ? 'PENDING_OBJECTION_WINDOW' : 'PENDING_OBJECTION_WINDOW',
        noticeDispatchedAt: noticeDateIso,
        objectionDeadline: objectionDeadlineIso,
      };
    }

    const notice: Article28Notice = {
      noticeId,
      createdAt: noticeDateIso,
      subProcessor,
      art28_4_flowDownCompliant: flowDownCompliant,
      controllers,
      status: 'OBJECTION_PERIOD_ACTIVE',
    };

    this.notices.set(noticeId, notice);
    return notice;
  }

  /**
   * Handles customer controller objection under Article 28(2).
   */
  public submitObjection(
    noticeId: string,
    customerId: string,
    reason: string,
    timestampIso: string
  ): { success: boolean; controller: ControllerRecord; resolution: ObjectionResolution } {
    const notice = this.notices.get(noticeId);
    if (!notice) {
      throw new Error(`Notice ${noticeId} not found`);
    }

    const controller = notice.controllers[customerId];
    if (!controller) {
      throw new Error(`Controller ${customerId} not in notice recipients`);
    }

    const objectionTime = new Date(timestampIso);
    const deadline = new Date(controller.objectionDeadline);

    if (objectionTime > deadline) {
      throw new Error(`Objection submitted after deadline ${controller.objectionDeadline}`);
    }

    controller.status = 'OBJECTION_SUBMITTED';
    controller.objectionReason = reason;
    controller.objectionTimestamp = timestampIso;

    // Standard Art 28 resolution path
    const resolution: ObjectionResolution = {
      customerId,
      action: controller.authorisationType === 'SPECIFIC_WRITTEN' ? 'PROVIDE_ALTERNATIVE' : 'ENTER_DISCUSSIONS',
      deadline: new Date(objectionTime.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      notes: `Controller exercised right to object pursuant to GDPR Art. 28(2) and DPA ${controller.dpaContractId}.`,
    };

    return { success: true, controller, resolution };
  }

  /**
   * Finalizes authorizations once the objection window passes.
   * Under General Authorisation, silence constitutes automatic authorization.
   * Under Specific Authorisation, explicit sign-off is required.
   */
  public finalizeAuthorizations(noticeId: string, currentDateIso: string): Article28Notice {
    const notice = this.notices.get(noticeId);
    if (!notice) {
      throw new Error(`Notice ${noticeId} not found`);
    }

    const now = new Date(currentDateIso);

    for (const id of Object.keys(notice.controllers)) {
      const c = notice.controllers[id];
      if (c.status === 'PENDING_OBJECTION_WINDOW') {
        const deadline = new Date(c.objectionDeadline);
        if (now >= deadline) {
          if (c.authorisationType === 'GENERAL_WRITTEN') {
            c.status = 'AUTHORIZED_AUTOMATIC';
          } else {
            // Specific written remains unapproved until explicit execution
            c.status = 'PENDING_OBJECTION_WINDOW';
          }
        }
      }
    }

    const allResolved = Object.values(notice.controllers).every(
      (c) => c.status === 'AUTHORIZED_AUTOMATIC' || c.status === 'EXPLICITLY_APPROVED' || c.status === 'OBJECTION_SUBMITTED'
    );

    if (allResolved) {
      notice.status = 'CLOSED';
    }

    return notice;
  }

  /**
   * Generates a tamper-evident audit certificate for Article 28 compliance records.
   */
  public generateAuditCertificate(noticeId: string): {
    noticeId: string;
    subProcessor: string;
    totalControllers: number;
    authorizedCount: number;
    objectionsCount: number;
    art28_4_compliant: boolean;
    auditDigestSha256: string;
  } {
    const notice = this.notices.get(noticeId);
    if (!notice) {
      throw new Error(`Notice ${noticeId} not found`);
    }

    const controllers = Object.values(notice.controllers);
    const authorized = controllers.filter(
      (c) => c.status === 'AUTHORIZED_AUTOMATIC' || c.status === 'EXPLICITLY_APPROVED'
    ).length;
    const objections = controllers.filter((c) => c.status === 'OBJECTION_SUBMITTED').length;

    const payload = JSON.stringify({
      noticeId: notice.noticeId,
      subProcessorId: notice.subProcessor.id,
      art28_4: notice.art28_4_flowDownCompliant,
      total: controllers.length,
      authorized,
      objections,
      timestamp: notice.createdAt,
    });

    const hash = createHash('sha256').update(payload).digest('hex');

    return {
      noticeId: notice.noticeId,
      subProcessor: notice.subProcessor.name,
      totalControllers: controllers.length,
      authorizedCount: authorized,
      objectionsCount: objections,
      art28_4_compliant: notice.art28_4_flowDownCompliant,
      auditDigestSha256: hash,
    };
  }
}
