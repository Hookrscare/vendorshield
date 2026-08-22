export type DefectSeverity =
  | "Minor / Cosmetic"
  | "Moderate / Maintenance"
  | "Safety Hazard"
  | "Urgent Repair";

export type InspectionTrade =
  | "residential"
  | "commercial_roof"
  | "hvac"
  | "custom";

export type InspectionCondition =
  | "Good / Pass"
  | "Fair / Maintenance Required"
  | "Poor / Significant Action Needed"
  | "Critical / Safety Hazards";

export interface DefectPhoto {
  id: string;
  url: string;
  caption: string;
  annotation?: string;
  timestamp: string;
}

export interface DefectItem {
  id: string;
  category: string;
  title: string;
  description: string;
  severity: DefectSeverity;
  location: string;
  actionRecommended: string;
  estimatedCost?: string;
  photos: DefectPhoto[];
  voiceTranscriptRaw?: string;
  createdAt: string;
}

export interface InspectionData {
  id: string;
  title: string;
  trade: InspectionTrade;
  inspectorName: string;
  inspectorCompany: string;
  inspectorLicense: string;
  inspectorPhone: string;
  inspectorEmail: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  propertyAddress: string;
  propertySquareFeet?: number;
  yearBuilt?: number;
  inspectionDate: string;
  weatherConditions: string;
  scopeOfInspection: string;
  overallCondition: InspectionCondition;
  executiveSummary: string;
  defects: DefectItem[];
  status: "draft" | "completed" | "sent";
  disclaimerAccepted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TradeTemplate {
  id: InspectionTrade;
  name: string;
  iconName: string;
  standard: string;
  badge: string;
  description: string;
  defaultCategories: string[];
  defaultScope: string;
  disclaimer: string;
}
