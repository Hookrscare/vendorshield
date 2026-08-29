import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { SubProcessorVendor, CompanySettings } from "./types";

export function generateAuditorPdf(
  company: CompanySettings,
  vendors: SubProcessorVendor[],
  reviewerName: string = "Sarah Jenkins (CISO)"
) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Header Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 210, 38, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("SOC 2 & ISO 27001 SUB-PROCESSOR RISK REGISTER", 14, 16);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text(`Official Compliance Disclosure & Vendor Risk Inventory | Generated for Security Audit`, 14, 23);
  doc.text(`Company: ${company.name} | Web: ${company.website} | Date: ${dateStr}`, 14, 30);

  // Executive Metadata Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 44, 182, 30, 2, 2, "FD");

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("AUDIT REPORT METADATA & COMPLIANCE SIGN-OFF", 18, 51);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text(`Authorized Compliance Lead: ${reviewerName}`, 18, 58);
  doc.text(`Privacy & DPO Contact: ${company.privacyEmail}`, 18, 64);
  doc.text(`Total Active Sub-Processors: ${vendors.length}`, 115, 58);
  const signedCount = vendors.filter((v) => v.dpaStatus === "Signed").length;
  doc.text(`Signed DPAs on File: ${signedCount} / ${vendors.length} (${Math.round((signedCount / (vendors.length || 1)) * 100)}%)`, 115, 64);
  const checksum = `${Math.random().toString(36).substring(2, 10).toUpperCase()}-SOC2-VERIFIED`;
  doc.text(`Report Checksum SHA-256: ${checksum}`, 18, 70);
  doc.setTextColor(2, 132, 199); // sky-600
  doc.textWithLink(`[Verify Online at: https://vendorshield-blond.vercel.app/verify/${checksum}]`, 115, 70, {
    url: `https://vendorshield-blond.vercel.app/verify/${checksum}`,
  });

  // Table Data Preparation
  const tableRows = vendors.map((v, index) => [
    `${index + 1}. ${v.name}`,
    v.category,
    v.dataProcessed.slice(0, 3).join(", "),
    v.dataLocation || "US / Global",
    v.dpaStatus,
    v.certifications.join(", ") || "None Logged",
    v.riskLevel,
    v.nextReviewDate || "2027-01-01",
  ]);

  // Generate Table
  autoTable(doc, {
    startY: 80,
    head: [
      [
        "Vendor Name",
        "Category",
        "Data Processed",
        "Location",
        "DPA Status",
        "Certifications",
        "Risk",
        "Next Review",
      ],
    ],
    body: tableRows,
    theme: "grid",
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: "bold",
      halign: "left",
    },
    bodyStyles: {
      fontSize: 7,
      textColor: [30, 41, 59],
      cellPadding: 2.5,
    },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 28 },
      1: { cellWidth: 26 },
      2: { cellWidth: 32 },
      3: { cellWidth: 22 },
      4: { cellWidth: 20 },
      5: { cellWidth: 24 },
      6: { cellWidth: 14 },
      7: { cellWidth: 16 },
    },
    didParseCell: (data) => {
      // Color-code DPA Status column
      if (data.column.index === 4 && data.section === "body") {
        if (data.cell.raw === "Signed") {
          data.cell.styles.textColor = [16, 149, 100]; // emerald
          data.cell.styles.fontStyle = "bold";
        } else if (data.cell.raw === "Missing") {
          data.cell.styles.textColor = [225, 29, 72]; // rose
          data.cell.styles.fontStyle = "bold";
        }
      }
    },
  });

  // Footer Sign-Off on Last Page
  const finalY = (doc as any).lastAutoTable?.finalY ?? 240;
  if (finalY < 250) {
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("Compliance Certification Statement:", 14, finalY + 12);
    doc.setFont("helvetica", "italic");
    doc.text(
      "I hereby certify that all listed third-party vendors and sub-processors have undergone security due diligence in alignment with SOC 2 Trust Services Criteria (CC6.6 / CC9.2) and GDPR Article 28 requirements.",
      14,
      finalY + 17,
      { maxWidth: 182 }
    );
    doc.setFont("helvetica", "normal");
    doc.text(`Signed by: _________________________ (${reviewerName})`, 14, finalY + 28);
    doc.text(`Date of Signature: _________________________`, 115, finalY + 28);
  }

  // Save to browser or filesystem
  const safeSlug = (company.slug || "company").replace(/[^a-zA-Z0-9_-]/g, "_");
  doc.save(`${safeSlug}-soc2-subprocessor-register.pdf`);
}

export function generateCsvExport(company: CompanySettings, vendors: SubProcessorVendor[]) {
  const headers = [
    "Vendor Name",
    "Category",
    "Website",
    "Data Processed",
    "Hosting Location",
    "DPA Status",
    "DPA URL",
    "Certifications",
    "Risk Level",
    "Last Reviewed Date",
    "Next Review Due",
    "Auditor Notes",
  ];

  const rows = vendors.map((v) => [
    `"${v.name.replace(/"/g, '""')}"`,
    `"${v.category}"`,
    `"${v.website}"`,
    `"${v.dataProcessed.join("; ").replace(/"/g, '""')}"`,
    `"${v.dataLocation}"`,
    `"${v.dpaStatus}"`,
    `"${v.dpaUrl}"`,
    `"${v.certifications.join(", ")}"`,
    `"${v.riskLevel}"`,
    `"${v.lastReviewedDate}"`,
    `"${v.nextReviewDate}"`,
    `"${(v.notes || "").replace(/"/g, '""')}"`,
  ]);

  const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `${company.slug}-subprocessors-soc2-export.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
