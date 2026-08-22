import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { InspectionData } from "./types";
import { TRADE_TEMPLATES } from "./templates";

export function generateInspectionPdf(inspection: InspectionData) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const template = TRADE_TEMPLATES[inspection.trade] || TRADE_TEMPLATES.residential;
  const urgentCount = inspection.defects.filter((d) => d.severity === "Urgent Repair").length;
  const safetyCount = inspection.defects.filter((d) => d.severity === "Safety Hazard").length;
  const moderateCount = inspection.defects.filter((d) => d.severity === "Moderate / Maintenance").length;
  const minorCount = inspection.defects.filter((d) => d.severity === "Minor / Cosmetic").length;

  // Header Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 210, 42, "F");

  // Top accent bar
  doc.setFillColor(239, 68, 68); // Red-500 indicator
  doc.rect(0, 0, 210, 3, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("SNAPINSPECT AI — OFFICIAL PROPERTY INSPECTION REPORT", 14, 16);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text(`Compliance Standard: ${template.standard}`, 14, 23);
  doc.text(`Inspection Title: ${inspection.title}`, 14, 30);
  doc.text(`Report Ref: ${inspection.id.toUpperCase()} | Date: ${inspection.inspectionDate}`, 14, 37);

  // Property & Inspector Information Box
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.roundedRect(14, 46, 182, 38, 2, 2, "FD");

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("PROPERTY & INSPECTOR METADATA", 18, 53);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text(`Inspected Property: ${inspection.propertyAddress}`, 18, 60);
  doc.text(`Client Name: ${inspection.clientName} (${inspection.clientEmail})`, 18, 66);
  doc.text(`Weather / Environment: ${inspection.weatherConditions}`, 18, 72);
  doc.text(`Overall Property Rating: ${inspection.overallCondition}`, 18, 78);

  doc.text(`Inspector: ${inspection.inspectorName}`, 115, 60);
  doc.text(`Company: ${inspection.inspectorCompany}`, 115, 66);
  doc.text(`Credential / License: ${inspection.inspectorLicense}`, 115, 72);
  doc.text(`Contact: ${inspection.inspectorPhone}`, 115, 78);

  // Executive Summary Card
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(148, 163, 184);
  doc.roundedRect(14, 88, 182, 30, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text("EXECUTIVE DEFECT SUMMARY & KEY FINDINGS", 18, 95);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(
    inspection.executiveSummary ||
      "All major accessible systems and assemblies were visually inspected in accordance with standards.",
    18,
    101,
    { maxWidth: 174 }
  );

  // Severity Counters Badges
  doc.setFillColor(254, 226, 226); // red-100
  doc.roundedRect(18, 110, 38, 6, 1, 1, "F");
  doc.setTextColor(185, 28, 28);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text(`Urgent: ${urgentCount}`, 20, 114);

  doc.setFillColor(254, 243, 199); // amber-100
  doc.roundedRect(60, 110, 42, 6, 1, 1, "F");
  doc.setTextColor(180, 83, 9);
  doc.text(`Safety Hazards: ${safetyCount}`, 62, 114);

  doc.setFillColor(224, 231, 255); // indigo-100
  doc.roundedRect(106, 110, 40, 6, 1, 1, "F");
  doc.setTextColor(67, 56, 202);
  doc.text(`Moderate: ${moderateCount}`, 108, 114);

  doc.setFillColor(241, 245, 249); // slate-100
  doc.roundedRect(150, 110, 36, 6, 1, 1, "F");
  doc.setTextColor(71, 85, 105);
  doc.text(`Minor / Wear: ${minorCount}`, 152, 114);

  // Defect Table
  const tableRows = inspection.defects.map((d, index) => [
    `${index + 1}. ${d.title}\n[${d.category}]`,
    d.location,
    d.severity,
    `${d.description}\n\nRecommended Action:\n${d.actionRecommended}`,
    d.estimatedCost || "TBD",
    d.photos.length > 0 ? `${d.photos.length} Photo(s)` : "None",
  ]);

  autoTable(doc, {
    startY: 122,
    head: [
      [
        "Item & Category",
        "Location",
        "Severity Tier",
        "Defect Observation & Contractor Action",
        "Est. Range",
        "Evidence",
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
      0: { fontStyle: "bold", cellWidth: 38 },
      1: { cellWidth: 26 },
      2: { cellWidth: 26, fontStyle: "bold" },
      3: { cellWidth: 56 },
      4: { cellWidth: 18, fontStyle: "bold" },
      5: { cellWidth: 18 },
    },
    didParseCell: (data) => {
      // Color-code Severity Column
      if (data.column.index === 2 && data.section === "body") {
        const val = String(data.cell.raw);
        if (val.includes("Urgent") || val.includes("Safety")) {
          data.cell.styles.textColor = [225, 29, 72]; // red
        } else if (val.includes("Moderate")) {
          data.cell.styles.textColor = [217, 119, 6]; // amber
        } else {
          data.cell.styles.textColor = [100, 116, 139]; // slate
        }
      }
    },
  });

  // Photo Section / Disclaimers on Subsequent Pages
  const finalY = (doc as any).lastAutoTable?.finalY || 200;

  if (finalY > 220) {
    doc.addPage();
    drawFooterAndDisclaimer(doc, 20, template.disclaimer, inspection.inspectorName);
  } else {
    drawFooterAndDisclaimer(doc, finalY + 10, template.disclaimer, inspection.inspectorName);
  }

  // Save report file
  const filename = `${inspection.id}-${inspection.trade}-inspection-report.pdf`;
  doc.save(filename);
}

function drawFooterAndDisclaimer(
  doc: jsPDF,
  startY: number,
  disclaimer: string,
  inspectorName: string
) {
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, startY, 182, 38, 2, 2, "FD");

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("LIMITATION OF LIABILITY & SCOPE DISCLAIMER", 18, startY + 6);

  doc.setFont("helvetica", "italic");
  doc.setFontSize(6.8);
  doc.setTextColor(100, 116, 139);
  doc.text(disclaimer, 18, startY + 12, { maxWidth: 174 });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  doc.text(
    `Certified Inspector Signature: ___________________________ (${inspectorName})`,
    18,
    startY + 32
  );
  doc.text(`Official Seal & Verification Timestamp: ${new Date().toISOString()}`, 115, startY + 32);
}
