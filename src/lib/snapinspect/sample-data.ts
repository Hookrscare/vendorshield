import { InspectionData } from "./types";

// Clean lightweight inline SVG placeholders for sample photos
const SAMPLE_PHOTO_ROOF = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='400' viewBox='0 0 600 400'><rect width='600' height='400' fill='%231e293b'/><rect x='40' y='60' width='520' height='280' rx='12' fill='%23334155'/><path d='M80 260 L200 160 L320 230 L440 140 L520 220' stroke='%23f59e0b' stroke-width='6' fill='none'/><circle cx='440' cy='140' r='18' fill='%23ef4444' stroke='%23ffffff' stroke-width='3'/><text x='50%25' y='80' fill='%23f8fafc' font-size='20' font-family='sans-serif' font-weight='bold' text-anchor='middle'>ROOF FLASHING DEFECT</text><text x='50%25' y='320' fill='%2394a3b8' font-size='14' font-family='sans-serif' text-anchor='middle'>Asphalt shingle granule loss &amp; unsealed valley</text></svg>";

const SAMPLE_PHOTO_PANEL = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='400' viewBox='0 0 600 400'><rect width='600' height='400' fill='%230f172a'/><rect x='60' y='40' width='480' height='320' rx='8' fill='%231e293b' stroke='%23475569' stroke-width='4'/><rect x='100' y='80' width='160' height='240' fill='%23020617'/><rect x='340' y='80' width='160' height='240' fill='%23020617'/><line x1='180' y1='120' x2='420' y2='120' stroke='%23ef4444' stroke-width='5'/><circle cx='300' cy='120' r='14' fill='%23ef4444'/><text x='50%25' y='340' fill='%23fca5a5' font-size='14' font-family='sans-serif' font-weight='bold' text-anchor='middle'>SAFETY HAZARD: Double Tapped 30A Breaker</text></svg>";

const SAMPLE_PHOTO_HVAC = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='400' viewBox='0 0 600 400'><rect width='600' height='400' fill='%23111827'/><rect x='80' y='60' width='440' height='280' rx='16' fill='%231f2937' stroke='%23374151' stroke-width='3'/><circle cx='300' cy='180' r='70' fill='%23374151' stroke='%2360a5fa' stroke-width='4'/><path d='M300 110 L300 250 M230 180 L370 180' stroke='%2360a5fa' stroke-width='4'/><text x='50%25' y='310' fill='%2393c5fd' font-size='14' font-family='sans-serif' font-weight='bold' text-anchor='middle'>AC CONDENSER: Refrigerant Line Insulation Missing</text></svg>";

export const INITIAL_INSPECTIONS: InspectionData[] = [
  {
    id: "insp-2026-081",
    title: "1482 Crestview Blvd Full Residential Inspection",
    trade: "residential",
    inspectorName: "Marcus Vance, CMI",
    inspectorCompany: "Apex Specialty Inspections LLC",
    inspectorLicense: "InterNACHI #240982-A",
    inspectorPhone: "(555) 392-8190",
    inspectorEmail: "marcus@apexinspections.com",
    clientName: "David & Sarah Jenkins",
    clientEmail: "sarah.jenkins@example.com",
    clientPhone: "(555) 744-1209",
    propertyAddress: "1482 Crestview Blvd, Austin, TX 78704",
    propertySquareFeet: 2850,
    yearBuilt: 2012,
    inspectionDate: "2026-08-22",
    weatherConditions: "78°F, Clear skies, Dry roof surface",
    scopeOfInspection:
      "Comprehensive visual examination of structural framing, electrical subpanels, plumbing distribution, HVAC systems, and roofing envelope in accordance with InterNACHI standards.",
    overallCondition: "Fair / Maintenance Required",
    executiveSummary:
      "Overall structural framing and primary MEP systems are functioning as intended. Two moderate maintenance items and one safety hazard were identified in the electrical panel and exterior roof valley requiring licensed contractor remediation prior to closing.",
    disclaimerAccepted: true,
    status: "draft",
    createdAt: "2026-08-22T08:30:00Z",
    updatedAt: "2026-08-22T10:15:00Z",
    defects: [
      {
        id: "def-001",
        category: "Electrical Subpanels & Wiring",
        title: "Double-Tapped Neutral & Unbonded Ground Bar",
        description:
          "Observed two neutral conductors sharing a single terminal screw on the secondary distribution panel bus bar. This creates a potential overheating and fire hazard under high load.",
        severity: "Safety Hazard",
        location: "Main Service Panel (North Garage Wall)",
        actionRecommended:
          "Have a licensed Master Electrician separate neutral conductors to individual terminal lugs and verify neutral/ground isolation.",
        estimatedCost: "$250 - $450",
        photos: [
          {
            id: "ph-101",
            url: SAMPLE_PHOTO_PANEL,
            caption: "Double-tapped neutral bus bar terminal #14",
            annotation: "Red circle marks dual conductor sharing single slot",
            timestamp: "2026-08-22 09:12 AM",
          },
        ],
        voiceTranscriptRaw:
          "In the garage subpanel, found a double-tapped neutral wire on bar fourteen. Safety hazard. Needs licensed electrician repair about 350 dollars.",
        createdAt: "2026-08-22T09:14:00Z",
      },
      {
        id: "def-002",
        category: "Roofing & Flashings",
        title: "Compromised Valley Flashing & Missing Sealant",
        description:
          "Southwest valley flashing exhibits loose fasteners and cracked polyurethane sealant. Minor granule erosion detected on adjacent architectural shingles.",
        severity: "Moderate / Maintenance",
        location: "Southwest Roof Elevation (Above Patio)",
        actionRecommended:
          "Clean valley trough, apply high-grade UV-resistant roofing mastic, and secure lifted shingle edges.",
        estimatedCost: "$350 - $600",
        photos: [
          {
            id: "ph-102",
            url: SAMPLE_PHOTO_ROOF,
            caption: "Valley flashing lifted along southwest exposure",
            annotation: "Yellow trace highlights void under shingles",
            timestamp: "2026-08-22 09:35 AM",
          },
        ],
        voiceTranscriptRaw:
          "Southwest roof valley has lifted flashing with cracked caulking. Moderate defect. Recommend roofing contractor reseal before winter.",
        createdAt: "2026-08-22T09:38:00Z",
      },
      {
        id: "def-003",
        category: "HVAC & Thermal Comfort",
        title: "Deteriorated Suction Line Insulation",
        description:
          "External vapor line foam insulation on the 4-ton condenser has degraded due to UV exposure, causing condensation drip and minor efficiency loss.",
        severity: "Minor / Cosmetic",
        location: "Exterior AC Condenser Unit #1",
        actionRecommended:
          "Install new 3/4-inch closed-cell foam insulation wrap with UV protective tape.",
        estimatedCost: "$60 - $120",
        photos: [
          {
            id: "ph-103",
            url: SAMPLE_PHOTO_HVAC,
            caption: "UV-degraded foam pipe cover exposing copper pipe",
            annotation: "Arrow points to bare refrigerant copper",
            timestamp: "2026-08-22 09:55 AM",
          },
        ],
        voiceTranscriptRaw:
          "AC unit suction line insulation is flaking off outside. Minor cosmetic maintenance item.",
        createdAt: "2026-08-22T09:58:00Z",
      },
    ],
  },
];

export const SAMPLE_VOICE_PROMPTS = [
  {
    title: "Roof Valley & Flashing Damage",
    trade: "Roofing",
    spokenText:
      "Southwest valley flashing has lifted shingles with severe granule loss and cracked mastic sealant. Safety Hazard. Recommend licensed roofing contractor repair estimated 600 dollars.",
  },
  {
    title: "Electrical Subpanel Double Tap",
    trade: "Electrical",
    spokenText:
      "Found double-tapped 30-amp breaker in the garage main electrical panel with unbonded neutral bar. Safety Hazard. Call master electrician estimated 350 dollars.",
  },
  {
    title: "HVAC Condenser Capacitors",
    trade: "HVAC",
    spokenText:
      "Outdoor compressor run capacitor is bulging on top with low microfarad reading. Urgent Repair. Needs immediate HVAC technician replacement estimated 220 dollars.",
  },
  {
    title: "Plumbing Water Heater TPR Valve",
    trade: "Plumbing",
    spokenText:
      "Water heater temperature pressure relief valve discharge pipe terminates 18 inches above floor without air gap. Moderate Maintenance. Plumber fix estimated 150 dollars.",
  },
];
