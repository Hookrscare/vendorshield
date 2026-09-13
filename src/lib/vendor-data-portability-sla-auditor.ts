/**
 * vendor-data-portability-sla-auditor.ts
 * QA-189: Automated Third-Party Data Sub-Processor Portability & Export SLA Auditor.
 * Part of VendorShield B2B SOC 2 & GDPR Sub-Processor Trust Hub.
 *
 * Sub-processor data export and portability SLA verifier:
 * 1. Validates machine-readable structured export payloads under GDPR Art. 20.
 * 2. Enforces mandatory TLS 1.3 cryptographic transit protocols during bulk export.
 * 3. Audits turnaround turnaround time against agreed vendor exit SLA limits (e.g., 72 hours).
 * 4. Verifies SHA-256 manifest data integrity checksums to prevent truncation.
 */

import crypto from 'crypto';

export interface VendorPortabilityExportRequest {
  exportId: string;
  vendorName: string;
  requestedAtIso: string;
  deliveredAtIso: string;
  slaMaxHours: number; // Contractual SLA (e.g. 72h)
  format: 'json' | 'ndjson' | 'csv' | 'parquet' | 'proprietary_binary';
  transportProtocol: 'TLS_1_3' | 'TLS_1_2' | 'PLAINTEXT_HTTP';
  manifestSha256Expected: string;
  exportedDataPayload: string;
}

export interface PortabilityAuditVerdict {
  exportId: string;
  vendorName: string;
  isCompliant: boolean;
  actualDeliveryHours: number;
  auditStatus: 'PORTABILITY_SLA_COMPLIANT' | 'SLA_BREACH_DELIVERY_OVERDUE' | 'INSECURE_CIPHER_TRANSPORT_REJECTED' | 'INVALID_PROPRIETARY_FORMAT' | 'CORRUPTED_EXPORT_CHECKSUM_MISMATCH';
  complianceNotes: string;
}

export class VendorDataPortabilitySlaAuditor {
  public static auditExportJob(req: VendorPortabilityExportRequest): PortabilityAuditVerdict {
    const reqTime = new Date(req.requestedAtIso).getTime();
    const delivTime = new Date(req.deliveredAtIso).getTime();
    const actualHours = Math.round(((delivTime - reqTime) / (1000 * 60 * 60)) * 10) / 10;

    // 1. Format verification (GDPR Art. 20 structured, commonly used machine-readable format)
    const validFormats = ['json', 'ndjson', 'csv', 'parquet'];
    if (!validFormats.includes(req.format)) {
      return {
        exportId: req.exportId,
        vendorName: req.vendorName,
        isCompliant: false,
        actualDeliveryHours: actualHours,
        auditStatus: 'INVALID_PROPRIETARY_FORMAT',
        complianceNotes: `NON-COMPLIANT: Format '${req.format}' is proprietary and violates GDPR Article 20 machine-readable portability rules.`
      };
    }

    // 2. Transport encryption check
    if (req.transportProtocol !== 'TLS_1_3') {
      return {
        exportId: req.exportId,
        vendorName: req.vendorName,
        isCompliant: false,
        actualDeliveryHours: actualHours,
        auditStatus: 'INSECURE_CIPHER_TRANSPORT_REJECTED',
        complianceNotes: `NON-COMPLIANT: Transport protocol '${req.transportProtocol}' rejected. Bulk export requires TLS 1.3.`
      };
    }

    // 3. Turnaround delivery SLA
    if (actualHours > req.slaMaxHours) {
      return {
        exportId: req.exportId,
        vendorName: req.vendorName,
        isCompliant: false,
        actualDeliveryHours: actualHours,
        auditStatus: 'SLA_BREACH_DELIVERY_OVERDUE',
        complianceNotes: `SLA BREACH: Export took ${actualHours}h, exceeding contracted limit of ${req.slaMaxHours}h.`
      };
    }

    // 4. SHA-256 payload checksum validation
    const actualHash = crypto
      .createHash('sha256')
      .update(req.exportedDataPayload, 'utf-8')
      .digest('hex');

    if (actualHash.toLowerCase() !== req.manifestSha256Expected.toLowerCase()) {
      return {
        exportId: req.exportId,
        vendorName: req.vendorName,
        isCompliant: false,
        actualDeliveryHours: actualHours,
        auditStatus: 'CORRUPTED_EXPORT_CHECKSUM_MISMATCH',
        complianceNotes: `INTEGRITY FAILURE: Checksum mismatch (expected ${req.manifestSha256Expected}, computed ${actualHash}). Data corrupted or truncated.`
      };
    }

    return {
      exportId: req.exportId,
      vendorName: req.vendorName,
      isCompliant: true,
      actualDeliveryHours: actualHours,
      auditStatus: 'PORTABILITY_SLA_COMPLIANT',
      complianceNotes: `SLA Compliant: Machine-readable ${req.format.toUpperCase()} export delivered in ${actualHours}h under TLS 1.3 with validated SHA-256 checksum.`
    };
  }
}
