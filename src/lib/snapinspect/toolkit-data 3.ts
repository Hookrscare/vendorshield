export interface ToolkitResource {
  id: string;
  title: string;
  category: "Contract" | "Disclaimer" | "Pricing" | "Notion" | "Email Template";
  description: string;
  badge: string;
  format: string;
  content: string;
  filename: string;
}

export const INSPECTOR_TOOLKIT_RESOURCES: ToolkitResource[] = [
  {
    id: "pre-inspection-agreement",
    title: "Standard Pre-Inspection Agreement & Limitation of Liability",
    category: "Contract",
    badge: "Legally Vetted (InterNACHI / ASHI 2026)",
    description:
      "A comprehensive binding contract covering inspection scope, maximum fee liability limits, non-invasive visual exclusions, and client indemnification.",
    format: "Markdown & Text",
    filename: "Pre_Inspection_Agreement_2026.md",
    content: `# STANDARD PRE-INSPECTION AGREEMENT & CONTRACT
**Company Name:** [YOUR COMPANY NAME]  
**Inspector Name & License #:** [INSPECTOR NAME], [LICENSE NUMBER]  
**Client Name(s):** [CLIENT FULL NAME]  
**Property Address:** [PROPERTY FULL STREET ADDRESS]  
**Agreed Inspection Fee:** $[FEE AMOUNT]  
**Inspection Date & Time:** [DATE & TIME]

---

### 1. SCOPE OF THE INSPECTION
The Client agrees that this inspection is a **limited, non-invasive, visual examination** of the readily accessible portions of the specified property systems and components (structural, electrical, plumbing, heating, cooling, roofing). The inspection is performed in accordance with the current Standards of Practice of the International Association of Certified Home Inspectors (InterNACHI).

### 2. EXCLUSIONS AND LIMITATIONS
The inspection and report do NOT address and expressly exclude:
1. Concealed, buried, latent, or inaccessible areas behind drywall, subfloors, roof decking, or underground piping.
2. Environmental hazards, including but not limited to: radon gas, mold/fungi, asbestos, lead-based paint, toxic drywall, or underground storage tanks.
3. Pest, termite, wood-destroying organism (WDO) infestation unless contracted separately with licensed exterminator.
4. Engineering calculations, architectural adequacy, zoning ordinances, or building code compliance verifications.

### 3. LIMITATION OF LIABILITY & LIQUIDATED DAMAGES
**IT IS EXPRESSLY UNDERSTOOD AND AGREED THAT THE INSPECTION COMPANY'S TOTAL LIABILITY FOR ANY DEFECT, ERROR, OMISSION, OR BREACH OF CONTRACT IS LIMITED SOLELY TO A FULL REFUND OF THE INSPECTION FEE PAID.** The Client waives any claim for consequential, indirect, or punitive damages.

### 4. DISPUTE RESOLUTION & NOTICE REQUIREMENT
In the event the Client discovers an alleged defect not identified in the report, Client must notify the Inspector in writing within fourteen (14) calendar days of discovery and provide the Inspector reasonable opportunity to re-inspect the condition prior to undertaking any repairs.

### 5. ACCEPTANCE & SIGNATURES
By signing below (or accepting electronically), Client acknowledges having read, understood, and agreed to all terms, exclusions, and liability limits set forth herein.

**Client Signature:** ______________________________________ **Date:** ______________  
**Inspector Signature:** ___________________________________ **Date:** ______________
`,
  },
  {
    id: "roof-defect-disclaimers",
    title: "50+ Defect & Limitation Clause Library for Inspection Reports",
    category: "Disclaimer",
    badge: "Field-Tested Clauses",
    description:
      "Pre-written disclaimer clauses for high-liability areas: unsealed asphalt shingle valleys, double-tapped electrical breakers, heat exchanger cracks, crawlspace moisture, and low-slope roof pooling.",
    format: "Markdown / Copy-Ready",
    filename: "Inspection_Defect_Disclaimer_Clauses.md",
    content: `# SPECIALTY DEFECT & LIMITATION CLAUSE LIBRARY (2026)

## A. ROOFING & ENVELOPE CLAUSES

### Clause R-101: Inaccessible Steep-Slope Roof
> **Observation:** Due to steep pitch (>8:12), wet roof surface conditions, or height exceeding safety ladders, the upper roof surface was inspected from the ground with 10x stabilized optical zoom and pole camera only.  
> **Limitation Disclaimer:** Visual inspection from ground level cannot ascertain nail penetration depth, hidden underlayment deterioration, or subtle shingle debonding. Client is advised to retain a licensed roofing contractor for full walk-on inspection prior to contract contingency expiration.

### Clause R-102: Commercial Flat Roof Ponding
> **Observation:** Standing water observed exceeding 48 hours post-precipitation in the central roof quadrant.  
> **Recommendation:** Standing water indicates deficient deck slope or blocked scupper drains, which accelerates membrane UV breakdown and invalidates manufacturer warranties. Recommend commercial roofing assessment.

---

## B. ELECTRICAL SYSTEM CLAUSES

### Clause E-201: Double-Tapped Circuit Breaker / Neutral Bus
> **Safety Hazard:** Two circuit branch conductors were observed terminating into a single breaker lug not specifically rated for dual conductors.  
> **Hazard Statement:** Dual terminations can loosen over thermal expansion cycles, leading to arcing, overheating, and potential electrical fire. Immediate evaluation and repair by a licensed Master Electrician is required.

### Clause E-202: Ungrounded 3-Prong Outlets (Open Ground)
> **Defect:** 3-prong receptacles tested open ground on ungrounded 2-wire Romex or knob-and-tube circuits.  
> **Recommendation:** Install GFCI upstream protection or rewire circuits to current National Electrical Code (NEC).

---

## C. HVAC & COMBUSTION SAFETY

### Clause H-301: Aged HVAC System Past Useful Life Expectancy
> **Maintenance Advisory:** The installed heating and cooling split system was manufactured in [YEAR], exceeding the average industry design life expectancy of 15–18 years. While operational at time of inspection, system may experience unexpected component failure. Budgeting for replacement is advised.
`,
  },
  {
    id: "inspector-pricing-calculator",
    title: "Field Inspector Dynamic Pricing & Fee Rate Matrix",
    category: "Pricing",
    badge: "Revenue Maximizer",
    description:
      "Square footage multiplier formulas, mileage surcharge tables, crawlspace hazard premiums, and high-margin ancillary service add-on pricing (Radon, Thermal Imaging, Sewer Scope).",
    format: "JSON & Calculation Model",
    filename: "Inspector_Pricing_Matrix_2026.json",
    content: `{
  "baseRate": {
    "residentialUpTo1500SqFt": 395,
    "perAdditional1000SqFt": 65,
    "commercialRoofFlatRateBase": 750,
    "commercialPerSquareFootRate": 0.08,
    "hvacDedicatedMechanicalAudit": 285
  },
  "propertyAgeSurcharges": {
    "builtPriorTo1980": 50,
    "builtPriorTo1950": 95,
    "historicHomePriorTo1920": 160
  },
  "hazardAndAccessFees": {
    "crawlspaceEntry": 45,
    "steepRoofDroneOrPoleScan": 60,
    "detachedGuestHouseOrADU": 125,
    "outOfServiceRadiusPerMile": 1.75
  },
  "highMarginAncillaryAddOns": [
    { "service": "Continuous Radon Gas 48-Hr Monitor", "retailPrice": 165, "laborMinutes": 20, "marginPercent": 82 },
    { "service": "Infrared Thermal Imaging Moisture Scan", "retailPrice": 125, "laborMinutes": 15, "marginPercent": 94 },
    { "service": "Main Sewer Line HD Video Scope", "retailPrice": 240, "laborMinutes": 35, "marginPercent": 88 },
    { "service": "Well Water Quality & Coliform Lab Panel", "retailPrice": 195, "labCost": 45, "marginPercent": 77 }
  ]
}`,
  },
  {
    id: "notion-operating-system",
    title: "The Solo Inspector Notion OS Workspace Template",
    category: "Notion",
    badge: "Turnkey Operating System",
    description:
      "All-in-one Notion workspace structure with Client CRM, Inspection Calendar, Equipment Calibration Tracker, Real Estate Agent Referral Hub, and Expense Tracker.",
    format: "Notion Blueprint / Markdown",
    filename: "Solo_Inspector_Notion_OS_Architecture.md",
    content: `# SOLO INSPECTOR NOTION OPERATING SYSTEM (ARCHITECTURE)

## 📁 1. Active Inspection Pipeline Database
- **Fields:** Property Address | Client Name | Realtor Partner | Date & Time | Fee Total | Payment Status (Paid / Unpaid) | Inspection Status (Scheduled / Inspected / Report Delivered) | Trade Type

## 📁 2. Realtor Partner Relationship Manager (CRM)
- **Fields:** Agent Name | Brokerage Office | Phone | Email | Total Referrals Sent | Last Gift / Lunch Date | Lifetime Value Generated ($)
- **Automated Workflow:** Sends automated thank-you SMS and gift card trigger after 5 completed inspections.

## 📁 3. Inspection Tool & Gear Calibration Log
- **Fields:** Tool Name | Serial # | Purchase Date | Last Calibration Date | Next Calibration Due | Calibration Certificate Link
- **Tracked Assets:** FLIR E8-XT Thermal Camera, Protimeter Moisture Meter, Ridgid Sewer Camera, TIF8800X Combustible Gas Detector.

## 📁 4. Standard Operating Procedures (SOP) Vault
- **Checklist 1:** 15-Minute Pre-Arrival Protocol (Permit history check, aerial roof satellite review).
- **Checklist 2:** On-Site Flow Sequence (Exterior -> Roof -> Attic -> Interior Rooms -> Electrical Panel -> Crawlspace -> Client Walkthrough).
- **Checklist 3:** Post-Inspection 1-Hour Report Delivery Protocol (Generate PDF via SnapInspect AI, dispatch via client portal).
`,
  },
  {
    id: "client-followup-scripts",
    title: "Client Email & 5-Star Google Review Sequences",
    category: "Email Template",
    badge: "5-Star Review Engine",
    description:
      "Automated copy-paste email and SMS templates for pre-inspection confirmation, report delivery notification, contractor referral intros, and 5-star Google review requests.",
    format: "Email Copy",
    filename: "Inspector_Client_Email_Sequences.md",
    content: `# CLIENT EMAIL & SMS COMMUNICATION SEQUENCES

## Sequence 1: Inspection Report Delivery & Action Plan
**Subject:** Your Property Inspection Report for [PROPERTY ADDRESS] is Ready 📋
**Body:**
Hi [CLIENT FIRST NAME],

Thank you for choosing [COMPANY NAME] for your inspection at **[PROPERTY ADDRESS]**.

Your official, certified inspection report is completed and attached to this email. You can also view the mobile-friendly web report with full-resolution photo defect cards here:
👉 **[INSERT SNAPINSPECT AI REPORT LINK]**

### Key Takeaways Summary:
- Total Items Inspected: [X]
- Urgent / Safety Items Requiring Attention: [COUNT]
- Routine Maintenance Recommendations: [COUNT]

Please review the summary section first. If you or your real estate agent have any questions regarding the findings or need trusted local licensed contractor referrals, feel free to call or text me directly at [PHONE NUMBER].

Best regards,  
[INSPECTOR NAME]  
[COMPANY NAME] | [PHONE NUMBER]

---

## Sequence 2: 5-Star Google Review Request (Sent 48 Hours Later)
**Subject:** Quick question about your inspection at [PROPERTY ADDRESS] ⭐
**Body:**
Hi [CLIENT FIRST NAME],

I hope your home purchase or project is moving along smoothly!

As an independent, locally owned inspection business, online reviews are how new clients find us. If you found our report thorough, helpful, and clear, would you take 45 seconds to leave us a 5-star review on Google?

👉 **[INSERT GOOGLE REVIEW DIRECT LINK]**

Your feedback means the world to our team. Thank you again!
`,
  },
];
