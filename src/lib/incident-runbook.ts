/**
 * QA-125: Real-Time Sub-Processor Incident Response Runbook & Notification Flow.
 * Implements ISO 27035 and NIST SP 800-61 aligned security incident response workflows,
 * SLA phase tracking, regulatory disclosure deadlines, and customer advisories.
 */

export type IncidentSeverity = 'SEV0_CRITICAL' | 'SEV1_HIGH' | 'SEV2_MEDIUM' | 'SEV3_LOW';
export type IncidentStage = 'DETECTED' | 'CONTAINMENT' | 'ERADICATION' | 'RECOVERY' | 'POST_MORTEM' | 'RESOLVED';
export type IncidentRole = 'IncidentCommander' | 'SecurityLead' | 'CommunicationsOfficer' | 'LegalCounsel';

export interface RunbookTask {
  id: string;
  stage: IncidentStage;
  title: string;
  description: string;
  assignedRole: IncidentRole;
  slaMinutes: number;
  completed: boolean;
  completedAt?: string;
  completedBy?: string;
}

export interface TimelineEntry {
  timestamp: string;
  note: string;
  author: string;
}

export interface IncidentRecord {
  incidentId: string;
  subProcessorId: string;
  subProcessorName: string;
  title: string;
  severity: IncidentSeverity;
  detectedAt: string;
  currentStage: IncidentStage;
  affectedTenants: string[];
  runbookTasks: RunbookTask[];
  timeline: TimelineEntry[];
  regulatoryNoticeRequired: boolean;
  regulatoryNoticeDeadline: string; // ISO 8601
}

export function generateStandardRunbookTasks(severity: IncidentSeverity): RunbookTask[] {
  const isCritical = severity === 'SEV0_CRITICAL' || severity === 'SEV1_HIGH';
  return [
    {
      id: 'task-detect-01',
      stage: 'DETECTED',
      title: 'Triage & Scope Determination',
      description: 'Confirm breach impact, impacted customer data classes, and isolate compromised sub-processor tenant keys.',
      assignedRole: 'SecurityLead',
      slaMinutes: isCritical ? 15 : 60,
      completed: false
    },
    {
      id: 'task-contain-01',
      stage: 'CONTAINMENT',
      title: 'Revoke Ingest & Sub-Processor API Keys',
      description: 'Sever active OAuth tokens, rotation of webhooks, and boundary firewall isolation.',
      assignedRole: 'SecurityLead',
      slaMinutes: isCritical ? 30 : 120,
      completed: false
    },
    {
      id: 'task-contain-02',
      stage: 'CONTAINMENT',
      title: 'Legal DPA Breach Assessment',
      description: 'Evaluate statutory notification requirements under Article 33 GDPR and HIPAA Security Rule.',
      assignedRole: 'LegalCounsel',
      slaMinutes: isCritical ? 60 : 240,
      completed: false
    },
    {
      id: 'task-eradicate-01',
      stage: 'ERADICATION',
      title: 'Vulnerability Remediation & Attestation',
      description: 'Verify sub-processor vendor deployment of patch, hash verification, and threat actor purge confirmation.',
      assignedRole: 'IncidentCommander',
      slaMinutes: isCritical ? 120 : 480,
      completed: false
    },
    {
      id: 'task-recovery-01',
      stage: 'RECOVERY',
      title: 'Customer Advisory Broadcast',
      description: 'Dispatch customer security notice via automated webhook and verified email channel.',
      assignedRole: 'CommunicationsOfficer',
      slaMinutes: isCritical ? 180 : 720,
      completed: false
    },
    {
      id: 'task-postmortem-01',
      stage: 'POST_MORTEM',
      title: 'Root Cause Analysis & SOC 2 CC7.3 Audit Artifact',
      description: 'Compile immutable timeline, preventative mitigations, and archive signed executive post-mortem.',
      assignedRole: 'IncidentCommander',
      slaMinutes: 1440,
      completed: false
    }
  ];
}

export function createIncidentRunbook(
  subProcessorId: string,
  subProcessorName: string,
  severity: IncidentSeverity,
  title: string,
  affectedTenants: string[],
  detectedAtIso?: string
): IncidentRecord {
  const detectedAt = detectedAtIso || new Date().toISOString();
  const detectedDate = new Date(detectedAt);
  
  // GDPR Art 33 72-hour regulatory notification deadline for Critical/High
  const deadlineDate = new Date(detectedDate);
  const deadlineHours = (severity === 'SEV0_CRITICAL' || severity === 'SEV1_HIGH') ? 72 : 168;
  deadlineDate.setUTCHours(deadlineDate.getUTCHours() + deadlineHours);

  const tasks = generateStandardRunbookTasks(severity);

  return {
    incidentId: `INC-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
    subProcessorId,
    subProcessorName,
    title,
    severity,
    detectedAt,
    currentStage: 'DETECTED',
    affectedTenants,
    runbookTasks: tasks,
    timeline: [
      {
        timestamp: detectedAt,
        note: `Incident initiated: ${title} (Severity: ${severity})`,
        author: 'SystemAutomator'
      }
    ],
    regulatoryNoticeRequired: severity === 'SEV0_CRITICAL' || severity === 'SEV1_HIGH',
    regulatoryNoticeDeadline: deadlineDate.toISOString()
  };
}

export function completeRunbookTask(
  incident: IncidentRecord,
  taskId: string,
  completedBy: string,
  completionTimestamp?: string
): IncidentRecord {
  const updatedTasks = incident.runbookTasks.map(task => {
    if (task.id === taskId) {
      return {
        ...task,
        completed: true,
        completedAt: completionTimestamp || new Date().toISOString(),
        completedBy
      };
    }
    return task;
  });

  const updatedIncident: IncidentRecord = {
    ...incident,
    runbookTasks: updatedTasks,
    timeline: [
      ...incident.timeline,
      {
        timestamp: completionTimestamp || new Date().toISOString(),
        note: `Task [${taskId}] completed by ${completedBy}`,
        author: completedBy
      }
    ]
  };

  // Check if current stage tasks are all complete, advance stage
  const stageOrder: IncidentStage[] = ['DETECTED', 'CONTAINMENT', 'ERADICATION', 'RECOVERY', 'POST_MORTEM', 'RESOLVED'];
  const currentIdx = stageOrder.indexOf(updatedIncident.currentStage);
  
  if (currentIdx !== -1 && currentIdx < stageOrder.length - 1) {
    const currentStageTasks = updatedIncident.runbookTasks.filter(t => t.stage === updatedIncident.currentStage);
    const allStageComplete = currentStageTasks.length > 0 && currentStageTasks.every(t => t.completed);
    if (allStageComplete) {
      const nextStage = stageOrder[currentIdx + 1];
      updatedIncident.currentStage = nextStage;
      updatedIncident.timeline.push({
        timestamp: completionTimestamp || new Date().toISOString(),
        note: `All tasks in stage [${stageOrder[currentIdx]}] completed. Advanced to [${nextStage}].`,
        author: 'SystemAutomator'
      });
    }
  }

  return updatedIncident;
}

export function generateCustomerSecurityAdvisory(incident: IncidentRecord): string {
  return [
    `# 🛡️ Customer Security Advisory: Sub-Processor Incident Notice`,
    ``,
    `**Incident Reference:** \`${incident.incidentId}\`  `,
    `**Affected Sub-Processor:** **${incident.subProcessorName}**  `,
    `**Severity Classification:** \`${incident.severity}\`  `,
    `**Current Mitigation Phase:** \`${incident.currentStage}\`  `,
    `**Initial Detection:** \`${incident.detectedAt}\`  `,
    ``,
    `---`,
    ``,
    `### 1. Executive Incident Summary`,
    `VendorShield SOC has detected an isolated security anomaly associated with **${incident.subProcessorName}**. Defensive containment protocols have been triggered in accordance with our Vendor Risk Management Framework and Data Processing Addendum (DPA) commitments.`,
    ``,
    `### 2. Immediate Containment Actions Taken`,
    `- Sub-processor ingestion credentials and service tokens rotated.`,
    `- Boundary firewall filtering applied to isolate downstream telemetry.`,
    `- Ongoing validation of data integrity across ${incident.affectedTenants.length} customer workspaces.`,
    ``,
    `### 3. Customer Action Required`,
    `No immediate customer action is required. If your systems connect directly via customer-owned API keys to ${incident.subProcessorName}, please review your internal egress logs.`,
    ``,
    `*Generated automatically by VendorShield B2B Enterprise Compliance Engine.*`
  ].join('\n');
}
