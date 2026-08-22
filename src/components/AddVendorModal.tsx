"use client";

import { useState } from "react";
import { X, Sparkles, Plus, Check } from "lucide-react";
import { Category, DPAStatus, RiskLevel, SecurityCertification, SubProcessorVendor } from "@/lib/types";
import { DIRECTORY_VENDORS } from "@/lib/initial-data";

interface AddVendorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (vendor: Omit<SubProcessorVendor, "id" | "addedAt">) => void;
}

const CATEGORIES: Category[] = [
  "AI & Machine Learning",
  "Cloud Infrastructure & Hosting",
  "Database & Storage",
  "Payment Processing",
  "Analytics & Observability",
  "Authentication & Security",
  "Customer Support & Communication",
  "Developer Tools & CI/CD",
];

const ALL_CERTS: SecurityCertification[] = [
  "SOC 2 Type II",
  "ISO 27001",
  "HIPAA",
  "GDPR Compliant",
  "PCI-DSS",
];

export function AddVendorModal({ isOpen, onClose, onAdd }: AddVendorModalProps) {
  const [activeTab, setActiveTab] = useState<"directory" | "custom">("directory");
  const [selectedDirSlug, setSelectedDirSlug] = useState<string>("");
  const [searchDir, setSearchDir] = useState<string>("");

  // Custom form state
  const [name, setName] = useState("");
  const [category, setCategory] = useState<Category>("Cloud Infrastructure & Hosting");
  const [description, setDescription] = useState("");
  const [website, setWebsite] = useState("");
  const [dataProcessed, setDataProcessed] = useState("");
  const [dataLocation, setDataLocation] = useState("United States (US-East)");
  const [dpaUrl, setDpaUrl] = useState("");
  const [dpaStatus, setDpaStatus] = useState<DPAStatus>("Signed");
  const [riskLevel, setRiskLevel] = useState<RiskLevel>("Low");
  const [certifications, setCertifications] = useState<SecurityCertification[]>(["SOC 2 Type II", "GDPR Compliant"]);
  const [notes, setNotes] = useState("");
  const [isPublic, setIsPublic] = useState(true);

  if (!isOpen) return null;

  const filteredDirectory = DIRECTORY_VENDORS.filter(
    (v) =>
      v.name.toLowerCase().includes(searchDir.toLowerCase()) ||
      v.category.toLowerCase().includes(searchDir.toLowerCase())
  );

  const handleSelectFromDirectory = (slug: string) => {
    const dirItem = DIRECTORY_VENDORS.find((v) => v.slug === slug);
    if (!dirItem) return;

    onAdd({
      name: dirItem.name,
      slug: dirItem.slug,
      description: dirItem.description,
      category: dirItem.category,
      website: dirItem.website,
      dataProcessed: dirItem.commonDataProcessed,
      dataLocation: "United States (Multi-Region)",
      dpaUrl: dirItem.dpaUrl,
      dpaStatus: "Signed",
      certifications: dirItem.certifications,
      riskLevel: dirItem.riskLevel,
      lastReviewedDate: new Date().toISOString().split("T")[0],
      nextReviewDate: new Date(Date.now() + 365 * 86400000).toISOString().split("T")[0],
      notes: `Imported from VendorShield Directory. DPO Contact: ${dirItem.privacyContact}`,
      isPublic: true,
    });
    onClose();
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onAdd({
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      description,
      category,
      website,
      dataProcessed: dataProcessed
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      dataLocation,
      dpaUrl,
      dpaStatus,
      certifications,
      riskLevel,
      lastReviewedDate: new Date().toISOString().split("T")[0],
      nextReviewDate: new Date(Date.now() + 365 * 86400000).toISOString().split("T")[0],
      notes,
      isPublic,
    });
    onClose();
  };

  const toggleCert = (cert: SecurityCertification) => {
    if (certifications.includes(cert)) {
      setCertifications(certifications.filter((c) => c !== cert));
    } else {
      setCertifications([...certifications, cert]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between bg-gray-950/50">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-blue-400" />
              Add Sub-Processor to Register
            </h3>
            <p className="text-xs text-gray-400">
              Track DPA status, security controls, and sync with your public page.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-gray-800 bg-gray-950/30 px-6 pt-3 gap-4">
          <button
            onClick={() => setActiveTab("directory")}
            className={`pb-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === "directory"
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            <Sparkles className="w-4 h-4" />
            1-Click Import from Directory (30+)
          </button>
          <button
            onClick={() => setActiveTab("custom")}
            className={`pb-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-all ${
              activeTab === "custom"
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            <Plus className="w-4 h-4" />
            Custom Vendor Entry
          </button>
        </div>

        {/* Tab 1: Directory Import */}
        {activeTab === "directory" ? (
          <div className="p-6 overflow-y-auto space-y-4 flex-1">
            <input
              type="text"
              placeholder="Search pre-indexed vendors (e.g. OpenAI, Stripe, AWS, Resend)..."
              value={searchDir}
              onChange={(e) => setSearchDir(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-950 border border-gray-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500 placeholder-gray-500"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pr-1">
              {filteredDirectory.map((item) => (
                <div
                  key={item.slug}
                  onClick={() => handleSelectFromDirectory(item.slug)}
                  className="p-3.5 bg-gray-950/80 border border-gray-800 hover:border-blue-500/60 rounded-xl cursor-pointer transition-all hover:bg-gray-800/40 group flex flex-col justify-between gap-2"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold text-white group-hover:text-blue-400 transition-colors text-sm">
                        {item.name}
                      </h4>
                      <p className="text-[11px] text-gray-400 line-clamp-1">{item.description}</p>
                    </div>
                    <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded border border-blue-500/20 font-medium">
                      {item.category.split(" ")[0]}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-gray-800/60 text-[11px]">
                    <span className="text-emerald-400 flex items-center gap-1 font-mono">
                      <Check className="w-3 h-3" /> SOC 2 & DPA
                    </span>
                    <button className="text-xs text-blue-400 group-hover:text-blue-300 font-medium flex items-center gap-1">
                      + Add to Register
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Tab 2: Custom Form */
          <form onSubmit={handleCustomSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Vendor / Service Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Supabase, Mixpanel"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-gray-950 border border-gray-800 rounded-lg text-sm text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">Category *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as Category)}
                  className="w-full px-3.5 py-2 bg-gray-950 border border-gray-800 rounded-lg text-sm text-white focus:border-blue-500 focus:outline-none"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">Description</label>
              <input
                type="text"
                placeholder="Brief summary of how this vendor is used in your software"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2 bg-gray-950 border border-gray-800 rounded-lg text-sm text-white focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">Website URL</label>
                <input
                  type="url"
                  placeholder="https://example.com"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="w-full px-3.5 py-2 bg-gray-950 border border-gray-800 rounded-lg text-sm text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Data Processing Location
                </label>
                <input
                  type="text"
                  placeholder="e.g. United States (US-East-1), EU (Frankfurt)"
                  value={dataLocation}
                  onChange={(e) => setDataLocation(e.target.value)}
                  className="w-full px-3.5 py-2 bg-gray-950 border border-gray-800 rounded-lg text-sm text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">DPA Status *</label>
                <select
                  value={dpaStatus}
                  onChange={(e) => setDpaStatus(e.target.value as DPAStatus)}
                  className="w-full px-3.5 py-2 bg-gray-950 border border-gray-800 rounded-lg text-sm text-white focus:border-blue-500 focus:outline-none"
                >
                  <option value="Signed">Signed (Full Compliance)</option>
                  <option value="Under Review">Under Review</option>
                  <option value="Standard Terms">Standard Online Terms</option>
                  <option value="Missing">Missing (Action Required)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">Risk Level *</label>
                <select
                  value={riskLevel}
                  onChange={(e) => setRiskLevel(e.target.value as RiskLevel)}
                  className="w-full px-3.5 py-2 bg-gray-950 border border-gray-800 rounded-lg text-sm text-white focus:border-blue-500 focus:outline-none"
                >
                  <option value="Low">Low Risk</option>
                  <option value="Medium">Medium Risk</option>
                  <option value="High">High Risk (PII / Financials)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Customer Data Processed (comma-separated)
              </label>
              <input
                type="text"
                placeholder="User Email, IP Address, Chat Logs, Billing Token"
                value={dataProcessed}
                onChange={(e) => setDataProcessed(e.target.value)}
                className="w-full px-3.5 py-2 bg-gray-950 border border-gray-800 rounded-lg text-sm text-white focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">DPA / Legal URL</label>
              <input
                type="url"
                placeholder="https://example.com/dpa"
                value={dpaUrl}
                onChange={(e) => setDpaUrl(e.target.value)}
                className="w-full px-3.5 py-2 bg-gray-950 border border-gray-800 rounded-lg text-sm text-white focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">Security Certifications</label>
              <div className="flex flex-wrap gap-2">
                {ALL_CERTS.map((cert) => {
                  const active = certifications.includes(cert);
                  return (
                    <button
                      type="button"
                      key={cert}
                      onClick={() => toggleCert(cert)}
                      className={`text-xs px-2.5 py-1 rounded-md border transition-all ${
                        active
                          ? "bg-blue-600/20 border-blue-500 text-blue-300"
                          : "bg-gray-950 border-gray-800 text-gray-400 hover:border-gray-700"
                      }`}
                    >
                      {active && "✓ "}
                      {cert}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="isPublic"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="rounded border-gray-800 bg-gray-950 text-blue-600 focus:ring-blue-500 h-4 w-4"
              />
              <label htmlFor="isPublic" className="text-xs text-gray-300">
                Display on public <code className="text-blue-400">/subprocessors</code> page
              </label>
            </div>

            <div className="pt-4 border-t border-gray-800 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-md shadow-blue-600/20 transition-all"
              >
                Save Sub-Processor
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
