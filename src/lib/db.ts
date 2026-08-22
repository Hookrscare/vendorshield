import { SubProcessorVendor, CompanySettings, AuditLog, DirectoryVendor } from "./types";
import { INITIAL_COMPANY, INITIAL_REGISTER_VENDORS, DIRECTORY_VENDORS } from "./initial-data";

// In-memory server store for API routes and local state
let serverVendors: SubProcessorVendor[] = [...INITIAL_REGISTER_VENDORS];
let serverCompany: CompanySettings = { ...INITIAL_COMPANY };
let serverLogs: AuditLog[] = [
  {
    id: "log-1",
    timestamp: new Date().toISOString(),
    action: "ADDED",
    vendorName: "OpenAI",
    details: "Imported from pSEO directory with DPA status: Signed",
    actor: "Sarah Jenkins (CISO)",
  },
  {
    id: "log-2",
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    action: "STATUS_CHANGE",
    vendorName: "Pinecone",
    details: "Marked DPA as Missing - Flagged high risk for SOC 2 auditor review",
    actor: "Sarah Jenkins (CISO)",
  },
];

export const db = {
  getCompany: () => serverCompany,
  updateCompany: (data: Partial<CompanySettings>) => {
    serverCompany = { ...serverCompany, ...data };
    return serverCompany;
  },

  getVendors: () => serverVendors,
  getVendorById: (id: string) => serverVendors.find((v) => v.id === id),
  
  createVendor: (data: Omit<SubProcessorVendor, "id" | "addedAt">) => {
    const newVendor: SubProcessorVendor = {
      ...data,
      id: `v-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      addedAt: new Date().toISOString(),
    };
    serverVendors = [newVendor, ...serverVendors];
    
    // Log action
    db.addAuditLog({
      action: "ADDED",
      vendorName: newVendor.name,
      details: `Added new sub-processor with DPA status: ${newVendor.dpaStatus}`,
      actor: serverCompany.dpoName || "Admin",
    });

    return newVendor;
  },

  updateVendor: (id: string, data: Partial<SubProcessorVendor>) => {
    const index = serverVendors.findIndex((v) => v.id === id);
    if (index === -1) return null;

    const oldVendor = serverVendors[index];
    const updated: SubProcessorVendor = { ...oldVendor, ...data };
    serverVendors[index] = updated;

    db.addAuditLog({
      action: "UPDATED",
      vendorName: updated.name,
      details: `Updated vendor attributes (DPA: ${updated.dpaStatus}, Risk: ${updated.riskLevel})`,
      actor: serverCompany.dpoName || "Admin",
    });

    return updated;
  },

  deleteVendor: (id: string) => {
    const vendor = serverVendors.find((v) => v.id === id);
    if (!vendor) return false;

    serverVendors = serverVendors.filter((v) => v.id !== id);

    db.addAuditLog({
      action: "DELETED",
      vendorName: vendor.name,
      details: `Removed vendor from sub-processor register`,
      actor: serverCompany.dpoName || "Admin",
    });

    return true;
  },

  getAuditLogs: () => serverLogs,
  addAuditLog: (log: Omit<AuditLog, "id" | "timestamp">) => {
    const newLog: AuditLog = {
      ...log,
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toISOString(),
    };
    serverLogs = [newLog, ...serverLogs.slice(0, 49)];
    return newLog;
  },

  getDirectoryVendors: () => DIRECTORY_VENDORS,
  getDirectoryVendorBySlug: (slug: string) =>
    DIRECTORY_VENDORS.find((v) => v.slug === slug),
};
