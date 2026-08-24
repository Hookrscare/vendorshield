export interface ToolkitResource {
  id: string;
  title: string;
  category: "Contract" | "Disclaimer" | "Pricing" | "Notion" | "Email Template";
  description: string;
  badge: string;
  format: string;
  filename: string;
  preview: string;
}

export const INSPECTOR_TOOLKIT_RESOURCES: ToolkitResource[] = [
  {
    id: "pre-inspection-agreement",
    title: "Standard Pre-Inspection Agreement & Limitation of Liability",
    category: "Contract",
    badge: "InterNACHI / ASHI Aligned",
    description:
      "A comprehensive contract covering inspection scope, liability limits, visual exclusions, and client indemnification.",
    format: "Markdown & Text",
    filename: "Pre_Inspection_Agreement_2026.md",
    preview: "Customizable agreement structure with scope, exclusions, liability, dispute resolution, and signature sections.",
  },
  {
    id: "roof-defect-disclaimers",
    title: "50+ Defect & Limitation Clause Library for Inspection Reports",
    category: "Disclaimer",
    badge: "Field-Tested Clauses",
    description:
      "Pre-written clauses for high-liability roofing, electrical, HVAC, crawlspace, moisture, and structural findings.",
    format: "Markdown / Copy-Ready",
    filename: "50_Defect_Disclaimer_Clauses.md",
    preview: "Organized, copy-ready observation, limitation, and recommendation language for common field defects.",
  },
  {
    id: "inspector-pricing-calculator",
    title: "Field Inspector Dynamic Pricing & Fee Rate Matrix",
    category: "Pricing",
    badge: "Revenue Maximizer",
    description:
      "Square-footage formulas, mileage surcharges, hazard premiums, and ancillary-service pricing guidance.",
    format: "JSON & Calculation Model",
    filename: "Inspector_Pricing_Matrix_2026.json",
    preview: "A structured pricing model for base rates, property-age premiums, travel, access hazards, and add-ons.",
  },
  {
    id: "notion-operating-system",
    title: "The Solo Inspector Notion OS Workspace Template",
    category: "Notion",
    badge: "Turnkey Operating System",
    description:
      "A workspace blueprint for client CRM, inspection scheduling, equipment calibration, referrals, and expenses.",
    format: "Notion Blueprint / Markdown",
    filename: "Solo_Inspector_Notion_OS_Architecture.md",
    preview: "Database structures and workflows for running an independent inspection business from one workspace.",
  },
  {
    id: "client-followup-scripts",
    title: "Client Email & 5-Star Google Review Sequences",
    category: "Email Template",
    badge: "5-Star Review Engine",
    description:
      "Email and SMS templates for confirmations, report delivery, contractor referrals, and review requests.",
    format: "Email Copy",
    filename: "Client_Email_Sequences_and_Google_Reviews.md",
    preview: "Ready-to-customize communication sequences covering the customer journey before and after inspection.",
  },
];
