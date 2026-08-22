export type Category = 
  | "AI & Machine Learning"
  | "Cloud Infrastructure & Hosting"
  | "Database & Storage"
  | "Payment Processing"
  | "Analytics & Observability"
  | "Authentication & Security"
  | "Customer Support & Communication"
  | "Developer Tools & CI/CD";

export type DPAStatus = "Signed" | "Under Review" | "Standard Terms" | "Missing";

export type RiskLevel = "Low" | "Medium" | "High";

export type SecurityCertification = "SOC 2 Type II" | "ISO 27001" | "HIPAA" | "GDPR Compliant" | "PCI-DSS" | "None";

export interface SubProcessorVendor {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: Category;
  website: string;
  logoUrl?: string;
  dataProcessed: string[]; // e.g. ["User Email", "IP Address", "Billing Details"]
  dataLocation: string; // e.g. "United States (US-East)", "European Union (EU-West)"
  dpaUrl: string;
  dpaStatus: DPAStatus;
  certifications: SecurityCertification[];
  riskLevel: RiskLevel;
  lastReviewedDate: string; // YYYY-MM-DD
  nextReviewDate: string; // YYYY-MM-DD
  notes?: string;
  isPublic: boolean; // whether shown on public /subprocessors page
  addedAt: string;
}

export interface DirectoryVendor {
  slug: string;
  name: string;
  category: Category;
  description: string;
  website: string;
  logoText: string;
  dpaUrl: string;
  subprocessorUrl: string;
  certifications: SecurityCertification[];
  headquarters: string;
  commonDataProcessed: string[];
  riskLevel: RiskLevel;
  privacyContact: string;
}

export interface CompanySettings {
  name: string;
  slug: string;
  logoUrl?: string;
  website: string;
  privacyEmail: string;
  dpoName: string;
  lastAuditDate: string;
  autoSyncPublicPage: boolean;
  theme: "light" | "dark" | "system";
  notificationEmail: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  action: "ADDED" | "UPDATED" | "DELETED" | "STATUS_CHANGE" | "EXPORTED";
  vendorName: string;
  details: string;
  actor: string;
}
