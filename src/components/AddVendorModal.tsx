"use client";

import { useState } from "react";
import { Sparkles, Plus, Check } from "lucide-react";
import { Category, DPAStatus, RiskLevel, SecurityCertification, SubProcessorVendor } from "@/lib/types";
import { DIRECTORY_VENDORS } from "@/lib/initial-data";
import { AccessibleModal } from "@/components/ui/AccessibleModal";

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
  const [certifications, setCertifications] = useState<SecurityCertification[]>([
    "SOC 2 Type II",
    "GDPR Compliant",
  ]);
  const [notes, setNotes] = useState("");
  const [isPublic, setIsPublic] = useState(true);

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
    <AccessibleModal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Sub-Processor to Register"
      maxWidth="max-w-2xl"
    >
      <div className="space-y-4">
        {/* Tab Switcher */}
        <div className="flex border-b border-white/10 pb-2 gap-4">
          <button
            onClick={() => setActiveTab("directory")}
            className={`pb-2 text-xs font-mono font-semibold border-b-2 flex items-center gap-1.5 transition-all ${
              activeTab === "directory"
                ? "border-cyan-400 text-cyan-300"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            1-Click Directory Import (30+)
          </button>
          <button
            onClick={() => setActiveTab("custom")}
            className={`pb-2 text-xs font-mono font-semibold border-b-2 flex items-center gap-1.5 transition-all ${
              activeTab === "custom"
                ? "border-cyan-400 text-cyan-300"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            Custom Vendor Entry
          </button>
        </div>

        {/* Tab 1: Directory Import */}
        {activeTab === "directory" ? (
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Search pre-indexed vendors (e.g. OpenAI, Stripe, AWS, Resend)..."
              value={searchDir}
              onChange={(e) => setSearchDir(e.target.value)}
              className="w-full px-4 py-2 bg-black/40 border border-white/10 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-cyan-400 placeholder-gray-500"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[360px] overflow-y-auto pr-1">
              {filteredDirectory.map((item) => (
                <div
                  key={item.slug}
                  onClick={() => handleSelectFromDirectory(item.slug)}
                  className="p-3 bg-[#0c1322] border border-white/5 hover:border-cyan-500/50 rounded-xl cursor-pointer transition-all hover:bg-white/[0.04] group flex flex-col justify-between gap-2"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-white group-hover:text-cyan-300 transition-colors text-xs font-sans">
                        {item.name}
                      </h4>
                      <p className="text-[10px] text-gray-400 line-clamp-1">{item.description}</p>
                    </div>
                    <span className="text-[9px] bg-cyan-500/10 text-cyan-300 px-1.5 py-0.5 rounded border border-cyan-500/20 font-mono">
                      {item.category.split(" ")[0]}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1.5 border-t border-white/5 text-[10px] font-mono">
                    <span className="text-emerald-400 flex items-center gap-1">
                      <Check className="w-3 h-3" /> SOC 2 &amp; DPA
                    </span>
                    <span className="text-cyan-400 group-hover:text-cyan-300 font-semibold">
                      + Add
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Tab 2: Custom Form */
          <form onSubmit={handleCustomSubmit} className="space-y-3.5 max-h-[420px] overflow-y-auto pr-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-mono font-semibold text-gray-300 mb-1">
                  Vendor Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Supabase, Mixpanel"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-1.5 bg-black/40 border border-white/10 rounded-lg text-xs text-white focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono font-semibold text-gray-300 mb-1">
                  Category *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as Category)}
                  className="w-full px-3 py-1.5 bg-black/40 border border-white/10 rounded-lg text-xs text-white focus:border-cyan-400 focus:outline-none"
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
              <label className="block text-[11px] font-mono font-semibold text-gray-300 mb-1">
                Description
              </label>
              <input
                type="text"
                placeholder="Brief summary of vendor usage"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-1.5 bg-black/40 border border-white/10 rounded-lg text-xs text-white focus:border-cyan-400 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-mono font-semibold text-gray-300 mb-1">
                  DPA Status *
                </label>
                <select
                  value={dpaStatus}
                  onChange={(e) => setDpaStatus(e.target.value as DPAStatus)}
                  className="w-full px-3 py-1.5 bg-black/40 border border-white/10 rounded-lg text-xs text-white focus:border-cyan-400 focus:outline-none"
                >
                  <option value="Signed">Signed (Full Compliance)</option>
                  <option value="Under Review">Under Review</option>
                  <option value="Standard Terms">Standard Online Terms</option>
                  <option value="Missing">Missing (Action Required)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-mono font-semibold text-gray-300 mb-1">
                  Risk Level *
                </label>
                <select
                  value={riskLevel}
                  onChange={(e) => setRiskLevel(e.target.value as RiskLevel)}
                  className="w-full px-3 py-1.5 bg-black/40 border border-white/10 rounded-lg text-xs text-white focus:border-cyan-400 focus:outline-none"
                >
                  <option value="Low">Low Risk</option>
                  <option value="Medium">Medium Risk</option>
                  <option value="High">High Risk (PII / Financials)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-mono font-semibold text-gray-300 mb-1">
                Security Certifications
              </label>
              <div className="flex flex-wrap gap-1.5">
                {ALL_CERTS.map((cert) => {
                  const active = certifications.includes(cert);
                  return (
                    <button
                      type="button"
                      key={cert}
                      onClick={() => toggleCert(cert)}
                      className={`text-[10px] font-mono px-2 py-0.5 rounded border transition-all ${
                        active
                          ? "bg-cyan-500/20 border-cyan-500 text-cyan-300"
                          : "bg-black/40 border-white/10 text-gray-400 hover:border-white/20"
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
                className="rounded border-white/10 bg-black/40 text-cyan-500 focus:ring-cyan-400 h-4 w-4"
              />
              <label htmlFor="isPublic" className="text-xs text-gray-300 font-mono">
                Display on public <code className="text-cyan-400">/subprocessors</code> page
              </label>
            </div>

            <div className="pt-3 border-t border-white/10 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 text-xs font-mono text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-mono font-bold text-gray-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg shadow-md shadow-cyan-500/20 transition-all"
              >
                Save Sub-Processor
              </button>
            </div>
          </form>
        )}
      </div>
    </AccessibleModal>
  );
}
