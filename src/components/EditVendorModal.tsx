"use client";

import { useState, useEffect } from "react";
import { X, Save, AlertTriangle } from "lucide-react";
import { Category, DPAStatus, RiskLevel, SecurityCertification, SubProcessorVendor } from "@/lib/types";

interface EditVendorModalProps {
  vendor: SubProcessorVendor | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (id: string, updated: Partial<SubProcessorVendor>) => void;
  onDelete: (id: string) => void;
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

export function EditVendorModal({
  vendor,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
}: EditVendorModalProps) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<Category>("Cloud Infrastructure & Hosting");
  const [description, setDescription] = useState("");
  const [website, setWebsite] = useState("");
  const [dataProcessed, setDataProcessed] = useState("");
  const [dataLocation, setDataLocation] = useState("");
  const [dpaUrl, setDpaUrl] = useState("");
  const [dpaStatus, setDpaStatus] = useState<DPAStatus>("Signed");
  const [riskLevel, setRiskLevel] = useState<RiskLevel>("Low");
  const [certifications, setCertifications] = useState<SecurityCertification[]>([]);
  const [notes, setNotes] = useState("");
  const [lastReviewedDate, setLastReviewedDate] = useState("");
  const [nextReviewDate, setNextReviewDate] = useState("");
  const [isPublic, setIsPublic] = useState(true);

  useEffect(() => {
    if (vendor) {
      setName(vendor.name);
      setCategory(vendor.category);
      setDescription(vendor.description || "");
      setWebsite(vendor.website || "");
      setDataProcessed(vendor.dataProcessed.join(", "));
      setDataLocation(vendor.dataLocation || "");
      setDpaUrl(vendor.dpaUrl || "");
      setDpaStatus(vendor.dpaStatus);
      setRiskLevel(vendor.riskLevel);
      setCertifications(vendor.certifications || []);
      setNotes(vendor.notes || "");
      setLastReviewedDate(vendor.lastReviewedDate || "");
      setNextReviewDate(vendor.nextReviewDate || "");
      setIsPublic(vendor.isPublic);
    }
  }, [vendor]);

  if (!isOpen || !vendor) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate(vendor.id, {
      name,
      category,
      description,
      website,
      dataProcessed: dataProcessed
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      dataLocation,
      dpaUrl,
      dpaStatus,
      riskLevel,
      certifications,
      notes,
      lastReviewedDate,
      nextReviewDate,
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
        <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between bg-gray-950/50">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              Edit Sub-Processor: <span className="text-blue-400">{vendor.name}</span>
            </h3>
            <p className="text-xs text-gray-400">Update compliance status and auditor notes</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">Vendor Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2 bg-gray-950 border border-gray-800 rounded-lg text-sm text-white focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">Category</label>
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">DPA Status</label>
              <select
                value={dpaStatus}
                onChange={(e) => setDpaStatus(e.target.value as DPAStatus)}
                className={`w-full px-3.5 py-2 bg-gray-950 border rounded-lg text-sm font-medium focus:outline-none ${
                  dpaStatus === "Signed"
                    ? "text-emerald-400 border-emerald-900/50"
                    : dpaStatus === "Missing"
                    ? "text-rose-400 border-rose-900/50"
                    : "text-amber-400 border-amber-900/50"
                }`}
              >
                <option value="Signed">Signed (Full Compliance)</option>
                <option value="Under Review">Under Review</option>
                <option value="Standard Terms">Standard Online Terms</option>
                <option value="Missing">Missing (Audit Risk)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">Risk Level</label>
              <select
                value={riskLevel}
                onChange={(e) => setRiskLevel(e.target.value as RiskLevel)}
                className="w-full px-3.5 py-2 bg-gray-950 border border-gray-800 rounded-lg text-sm text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="Low">Low Risk</option>
                <option value="Medium">Medium Risk</option>
                <option value="High">High Risk</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">Data Processed</label>
            <input
              type="text"
              value={dataProcessed}
              onChange={(e) => setDataProcessed(e.target.value)}
              className="w-full px-3.5 py-2 bg-gray-950 border border-gray-800 rounded-lg text-sm text-white focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">Hosting Location</label>
              <input
                type="text"
                value={dataLocation}
                onChange={(e) => setDataLocation(e.target.value)}
                className="w-full px-3.5 py-2 bg-gray-950 border border-gray-800 rounded-lg text-sm text-white focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">DPA / Legal URL</label>
              <input
                type="url"
                value={dpaUrl}
                onChange={(e) => setDpaUrl(e.target.value)}
                className="w-full px-3.5 py-2 bg-gray-950 border border-gray-800 rounded-lg text-sm text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">Last Reviewed</label>
              <input
                type="date"
                value={lastReviewedDate}
                onChange={(e) => setLastReviewedDate(e.target.value)}
                className="w-full px-3.5 py-2 bg-gray-950 border border-gray-800 rounded-lg text-sm text-white focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">Next Review Due</label>
              <input
                type="date"
                value={nextReviewDate}
                onChange={(e) => setNextReviewDate(e.target.value)}
                className="w-full px-3.5 py-2 bg-gray-950 border border-gray-800 rounded-lg text-sm text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">Auditor Notes</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Zero retention confirmed. SOC 2 Type II report downloaded to Google Drive."
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

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="editIsPublic"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="rounded border-gray-800 bg-gray-950 text-blue-600 focus:ring-blue-500 h-4 w-4"
            />
            <label htmlFor="editIsPublic" className="text-xs text-gray-300">
              Visible on public customer-facing sub-processors page
            </label>
          </div>

          <div className="pt-4 border-t border-gray-800 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                if (confirm(`Are you sure you want to remove ${vendor.name} from your register?`)) {
                  onDelete(vendor.id);
                  onClose();
                }
              }}
              className="px-3.5 py-2 text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors border border-rose-900/30"
            >
              Delete Sub-Processor
            </button>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-md shadow-blue-600/20 transition-all flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                Update Register
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
