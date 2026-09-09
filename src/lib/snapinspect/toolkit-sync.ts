/**
 * SNAP-04: Digital Inspector Toolkit Notion Blueprint & PDF Contract Sync.
 * Provides programmatic generation of InterNACHI-aligned Pre-Inspection Agreements,
 * field contract PDF exports with signature blocks, and Notion OS database schemas.
 */

import jsPDF from "jspdf";
import crypto from "crypto";
import { INSPECTOR_TOOLKIT_RESOURCES, ToolkitResource } from "./toolkit-data";

export interface InspectorProfile {
  companyName: string;
  inspectorName: string;
  licenseNumber: string;
  phone: string;
  email: string;
  insuranceCarrier?: string;
}

export interface InspectionEngagement {
  clientName: string;
  propertyAddress: string;
  inspectionDate: string;
  inspectionFee: number;
  scopeNotes?: string;
}

export interface NotionSchemaField {
  type: "title" | "rich_text" | "number" | "select" | "multi_select" | "date" | "url" | "checkbox";
  description?: string;
  options?: string[];
}

export interface NotionDatabaseBlueprint {
  title: string;
  description: string;
  properties: Record<string, NotionSchemaField>;
  recommendedViews: string[];
  sampleRecords: Record<string, any>[];
}

/**
 * Compiles a customized InterNACHI/ASHI aligned Pre-Inspection Agreement text.
 */
export function formatPreInspectionContract(
  inspector: InspectorProfile,
  engagement: InspectionEngagement
): string {
  const feeFormatted = `$${engagement.inspectionFee.toFixed(2)}`;
  return `# PRE-INSPECTION AGREEMENT & SCOPE OF WORK

**PARTIES:**
- **Inspection Firm:** ${inspector.companyName} (Lic #${inspector.licenseNumber})
- **Lead Inspector:** ${inspector.inspectorName} (${inspector.phone} | ${inspector.email})
- **Client:** ${engagement.clientName}
- **Property Address:** ${engagement.propertyAddress}
- **Scheduled Date:** ${engagement.inspectionDate}
- **Agreed Fee:** ${feeFormatted}

---

### 1. SCOPE OF INSPECTION
The inspection is a non-invasive, visual examination of the accessible mechanical and structural systems of the subject property as of the date of inspection, adhering to standard InterNACHI and ASHI Standards of Practice.

### 2. EXCLUSIONS & LIMITATIONS
The inspection does NOT include latent, concealed, or inaccessible defects; cosmetic finishes; soil stability; mold, asbestos, radon, or chemical toxins; or low-voltage security/smart systems unless explicitly contracted in writing.

### 3. LIMITATION OF LIABILITY
IT IS UNDERSTOOD AND AGREED THAT THE MAXIMUM LIABILITY INCURRED BY INSPECTION FIRM, ITS EMPLOYEES AND AGENTS ARISING FROM ERRORS, OMISSIONS, OR BREACH OF CONTRACT SHALL BE STRICTLY LIMITED TO THE LIQUIDATED SUM OF THE FEE PAID (${feeFormatted}).

---

**CLIENT SIGNATURE:** __________________________   **DATE:** ____________
**INSPECTOR SIGNATURE:** _______________________   **DATE:** ____________
`;
}

/**
 * Programmatically generates a formal, printable PDF contract for field execution.
 */
export function generateContractPdf(
  inspector: InspectorProfile,
  engagement: InspectionEngagement
): { filename: string; pdfBytes: string; checksum: string } {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Header Banner
  doc.setFillColor(30, 41, 59); // slate-800
  doc.rect(0, 0, pageWidth, 28, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(inspector.companyName.toUpperCase(), 14, 12);

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text(
    `PRE-INSPECTION AGREEMENT • LIC #${inspector.licenseNumber} • TEL: ${inspector.phone} • ${inspector.email}`,
    14,
    19
  );

  // Engagement Details Table Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, 34, pageWidth - 28, 30, 2, 2, "FD");

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.text("ENGAGEMENT PARTICULARS", 18, 40);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text(`Client Name: ${engagement.clientName}`, 18, 46);
  doc.text(`Property Address: ${engagement.propertyAddress}`, 18, 52);
  doc.text(`Scheduled Date: ${engagement.inspectionDate}`, 18, 58);

  doc.text(`Inspection Fee: $${engagement.inspectionFee.toFixed(2)}`, 110, 46);
  doc.text(`Lead Inspector: ${inspector.inspectorName}`, 110, 52);
  doc.text(`Standards: InterNACHI / ASHI Aligned`, 110, 58);

  // Contract Clauses
  let y = 72;
  const sections = [
    {
      title: "1. SCOPE OF INSPECTION",
      body: "The inspection is a visual, non-invasive examination of readily accessible systems (roofing, exterior, structural frame, electrical, heating, cooling, plumbing, insulation, and interior). It represents property condition solely at the time of inspection.",
    },
    {
      title: "2. SPECIFIC EXCLUSIONS",
      body: "Concealed structural members, sub-surface plumbing/sewer lines, environmental contaminants (radon, mold, lead paint, asbestos), low-voltage wiring, solar systems, swimming pools, and cosmetic items are strictly excluded.",
    },
    {
      title: "3. LIMITATION OF LIABILITY & LIQUIDATED DAMAGES",
      body: `CLIENT AGREES THAT THE MAXIMUM CUMULATIVE LIABILITY OF THE INSPECTOR AND COMPANY FOR ANY CLAIMS, DISPUTES, ERRORS, OR OMISSIONS SHALL BE STRICTLY LIMITED TO A REFUND OF THE ACTUAL INSPECTION FEE PAID ($${engagement.inspectionFee.toFixed(2)}).`,
    },
    {
      title: "4. DISPUTE RESOLUTION",
      body: "Any unresolved controversy or claim shall be submitted to binding arbitration under the rules of the American Arbitration Association prior to commencing legal action.",
    },
  ];

  for (const s of sections) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(s.title, 14, y);
    y += 4.5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    const splitBody = doc.splitTextToSize(s.body, pageWidth - 28);
    doc.text(splitBody, 14, y);
    y += splitBody.length * 3.8 + 4;
  }

  // Signature Block
  const sigBoxY = pageHeight - 48;
  doc.setDrawColor(203, 213, 225);
  doc.line(14, sigBoxY, pageWidth - 14, sigBoxY);

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("CLIENT ACCEPTANCE & SIGNATURE", 14, sigBoxY + 8);
  doc.text("INSPECTOR SIGNATURE", 110, sigBoxY + 8);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text("Signature: _________________________________", 14, sigBoxY + 20);
  doc.text(`Date: ${engagement.inspectionDate}`, 14, sigBoxY + 28);

  doc.text("Signature: _________________________________", 110, sigBoxY + 20);
  doc.text(`Date: ${engagement.inspectionDate}`, 110, sigBoxY + 28);

  // Security Verification Checksum
  const checksumPayload = `${inspector.licenseNumber}:${engagement.propertyAddress}:${engagement.inspectionFee}`;
  const checksum = `SNAP-CONTRACT-${crypto.createHash("sha256").update(checksumPayload).digest("hex").substring(0, 10).toUpperCase()}`;

  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text(`Digital Verification Hash: ${checksum}`, 14, pageHeight - 6);

  const cleanSlug = engagement.clientName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const filename = `${cleanSlug}-pre-inspection-agreement.pdf`;

  return {
    filename,
    pdfBytes: doc.output(),
    checksum,
  };
}

/**
 * Returns structured Notion OS blueprint architecture for the solo inspector workspace.
 */
export function getNotionWorkspaceBlueprints(): Record<string, NotionDatabaseBlueprint> {
  return {
    inspectionPipeline: {
      title: "Active Inspection Orders",
      description: "Core operating database tracking inspections from booking through report delivery.",
      properties: {
        Property: { type: "title", description: "Street address or MLS ID" },
        Client: { type: "rich_text", description: "Client full name & phone" },
        Status: {
          type: "select",
          options: ["Scheduled", "On-Site / In-Progress", "Report Drafting", "Delivered", "Invoiced", "Paid"],
        },
        InspectionDate: { type: "date", description: "Date and time on site" },
        Fee: { type: "number", description: "Total inspection fee" },
        ReportUrl: { type: "url", description: "Secure link to finished PDF report" },
        AgreementSigned: { type: "checkbox", description: "Pre-inspection agreement signed" },
      },
      recommendedViews: ["Today's Schedule (Calendar)", "Pending Reports (Board)", "Unpaid Invoices (Table)"],
      sampleRecords: [
        {
          Property: "742 Evergreen Terrace, Springfield",
          Client: "Homer Simpson (555-7334)",
          Status: "Delivered",
          Fee: 495.0,
          AgreementSigned: true,
        },
      ],
    },
    equipmentLog: {
      title: "Field Equipment & Calibration Register",
      description: "Tracks inspection tools, moisture meters, thermal cameras, and calibration dates.",
      properties: {
        ToolName: { type: "title", description: "Brand & model name" },
        Category: {
          type: "select",
          options: ["Thermal Imaging", "Moisture Meter", "Gas Detector", "Drone / Aerial", "Electrical Tester"],
        },
        SerialNumber: { type: "rich_text" },
        LastCalibrationDate: { type: "date" },
        NextCalibrationDue: { type: "date" },
        OperationalStatus: { type: "select", options: ["Active / Calibrated", "Requires Calibration", "Retired"] },
      },
      recommendedViews: ["Calibration Due (Table)", "By Category (Board)"],
      sampleRecords: [
        {
          ToolName: "FLIR E8-XT Infrared Camera",
          Category: "Thermal Imaging",
          OperationalStatus: "Active / Calibrated",
        },
      ],
    },
  };
}
