"use client";

import { useState, useEffect } from "react";
import { SubProcessorVendor, CompanySettings, AuditLog } from "@/lib/types";
import { VendorStats } from "@/components/VendorStats";
import { VendorTable } from "@/components/VendorTable";
import { AddVendorModal } from "@/components/AddVendorModal";
import { EditVendorModal } from "@/components/EditVendorModal";
import Link from "next/link";
import {
  ShieldCheck,
  Plus,
  FileText,
  Code2,
  ExternalLink,
  History,
  Building,
  Sparkles,
  RefreshCw,
  CheckCircle2,
} from "lucide-react";

export default function DashboardPage() {
  const isReadOnlyDemo = true;
  const [vendors, setVendors] = useState<SubProcessorVendor[]>([]);
  const [company, setCompany] = useState<CompanySettings | null>(null);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"register" | "logs" | "settings">("register");

  // Modal states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<SubProcessorVendor | null>(null);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState<string | null>(null);

  // Settings form state
  const [companyName, setCompanyName] = useState("");
  const [privacyEmail, setPrivacyEmail] = useState("");
  const [dpoName, setDpoName] = useState("");
  const [website, setWebsite] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      const [vRes, cRes] = await Promise.all([
        fetch("/api/vendors"),
        fetch("/api/company"),
      ]);
      const vData = await vRes.json();
      const cData = await cRes.json();

      if (vData.success) setVendors(vData.data);
      if (cData.success) {
        setCompany(cData.data.company);
        setLogs(cData.data.logs || []);
        setCompanyName(cData.data.company.name);
        setPrivacyEmail(cData.data.company.privacyEmail);
        setDpoName(cData.data.company.dpoName);
        setWebsite(cData.data.company.website);
      }
    } catch (err) {
      console.error("Failed to load dashboard data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddVendor = async (newVendor: Omit<SubProcessorVendor, "id" | "addedAt">) => {
    try {
      const res = await fetch("/api/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newVendor),
      });
      const data = await res.json();
      if (data.success) {
        setVendors([data.data, ...vendors]);
        showNotice(`Added ${newVendor.name} to sub-processor register`);
        fetchData();
      }
    } catch (err) {
      console.error("Error adding vendor", err);
    }
  };

  const handleUpdateVendor = async (id: string, updated: Partial<SubProcessorVendor>) => {
    try {
      const res = await fetch(`/api/vendors/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
      const data = await res.json();
      if (data.success) {
        setVendors(vendors.map((v) => (v.id === id ? data.data : v)));
        showNotice(`Updated ${data.data.name} in register`);
        fetchData();
      }
    } catch (err) {
      console.error("Error updating vendor", err);
    }
  };

  const handleDeleteVendor = async (id: string) => {
    try {
      const res = await fetch(`/api/vendors/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setVendors(vendors.filter((v) => v.id !== id));
        showNotice(`Vendor deleted from register`);
        fetchData();
      }
    } catch (err) {
      console.error("Error deleting vendor", err);
    }
  };

  const handleSaveCompanySettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/company", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: companyName,
          privacyEmail,
          dpoName,
          website,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setCompany(data.data);
        showNotice("Company compliance settings updated");
      }
    } catch (err) {
      console.error("Error saving settings", err);
    }
  };

  const showNotice = (msg: string) => {
    setSaveSuccessNotice(msg);
    setTimeout(() => setSaveSuccessNotice(null), 4000);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Success toast notification */}
        {saveSuccessNotice && (
          <div className="fixed bottom-6 right-6 z-50 bg-emerald-950 border border-emerald-500/50 text-emerald-200 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 text-sm animate-in slide-in-from-bottom-4">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{saveSuccessNotice}</span>
          </div>
        )}

        {/* Dashboard Top Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-gray-800">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-400 uppercase tracking-wider mb-1">
              <Building className="w-3.5 h-3.5" />
              <span>{company?.name || "Acme SaaS Inc."} Sub-Processor Register</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Vendor Risk &amp; SOC 2 Compliance Hub
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              Live inventory of 3rd-party SaaS vendors, DPA agreements, and public disclosure sync.
            </p>
          </div>

          {/* Quick Action Navigation */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setIsAddOpen(true)}
              disabled={isReadOnlyDemo}
              title="Editing is disabled in the public demo"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-lg shadow-blue-600/30 transition-all flex items-center gap-1.5 hover:scale-[1.02] disabled:bg-gray-800 disabled:text-gray-500 disabled:shadow-none disabled:hover:scale-100 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
              Read-Only Demo
            </button>

            <Link
              href="/dashboard/audit-export"
              className="px-3.5 py-2 bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-200 hover:text-white font-semibold text-xs sm:text-sm rounded-xl transition-colors flex items-center gap-1.5"
            >
              <FileText className="w-4 h-4 text-emerald-400" />
              Auditor Export
            </Link>

            <Link
              href="/dashboard/embed-code"
              className="px-3.5 py-2 bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-200 hover:text-white font-semibold text-xs sm:text-sm rounded-xl transition-colors flex items-center gap-1.5"
            >
              <Code2 className="w-4 h-4 text-purple-400" />
              Embed Widget
            </Link>

            <Link
              href={`/p/${company?.slug || "acme-saas"}`}
              target="_blank"
              className="px-3.5 py-2 bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-400 hover:text-white text-xs sm:text-sm rounded-xl transition-colors flex items-center gap-1.5"
            >
              <span>Public Page</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        <div
          role="status"
          className="rounded-2xl border border-blue-500/30 bg-blue-500/10 px-5 py-4 text-sm text-blue-100"
        >
          <strong>Public product demo:</strong> all company names, contacts, vendors,
          risk dates, and audit records shown here are sample data. Editing is disabled
          and no customer information is exposed.
        </div>

        {/* Stats Row */}
        <VendorStats vendors={vendors} />

        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-800 gap-6 text-sm font-semibold">
          <button
            onClick={() => setActiveTab("register")}
            className={`pb-3.5 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === "register"
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Active Register ({vendors.length})
          </button>
          <button
            onClick={() => setActiveTab("logs")}
            className={`pb-3.5 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === "logs"
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            <History className="w-4 h-4" />
            SOC 2 Audit Trail ({logs.length})
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`pb-3.5 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === "settings"
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            <Building className="w-4 h-4" />
            Company &amp; Privacy Settings
          </button>
        </div>

        {/* Tab 1: Active Register Table */}
        {activeTab === "register" && (
          <div className="space-y-6">
            <VendorTable
              vendors={vendors}
              onEditVendor={(v) => setEditingVendor(v)}
              onAddClick={() => setIsAddOpen(true)}
              readOnly={isReadOnlyDemo}
            />
          </div>
        )}

        {/* Tab 2: Audit Logs */}
        {activeTab === "logs" && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <History className="w-5 h-5 text-blue-400" />
                Auditable Event Trail
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Timestamped evidence log for SOC 2 Type II and ISO 27001 auditor verification.
              </p>
            </div>

            <div className="divide-y divide-gray-800 max-h-[500px] overflow-y-auto">
              {logs.map((log) => (
                <div key={log.id} className="py-3 flex items-start justify-between text-xs gap-4">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{log.vendorName}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                          log.action === "ADDED"
                            ? "bg-blue-500/20 text-blue-300"
                            : log.action === "DELETED"
                            ? "bg-rose-500/20 text-rose-300"
                            : "bg-amber-500/20 text-amber-300"
                        }`}
                      >
                        {log.action}
                      </span>
                    </div>
                    <p className="text-gray-400">{log.details}</p>
                  </div>
                  <div className="text-right shrink-0 text-gray-500 font-mono text-[11px]">
                    <div>{new Date(log.timestamp).toLocaleDateString()}</div>
                    <div>{log.actor}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Settings */}
        {activeTab === "settings" && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 max-w-2xl space-y-6">
            <div>
              <h3 className="text-base font-bold text-white">Company Compliance Configuration</h3>
              <p className="text-xs text-gray-400 mt-0.5">
                These details are embedded into your public `/subprocessors` portal and audit exports.
              </p>
            </div>

            <form onSubmit={handleSaveCompanySettings} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Legal Entity / Company Name
                </label>
                <input
                  type="text"
                  required
                  value={companyName}
                  disabled={isReadOnlyDemo}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-gray-950 border border-gray-800 rounded-lg text-sm text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">Website</label>
                <input
                  type="url"
                  required
                  value={website}
                  disabled={isReadOnlyDemo}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="w-full px-3.5 py-2 bg-gray-950 border border-gray-800 rounded-lg text-sm text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Data Protection Officer / Security Lead
                  </label>
                  <input
                    type="text"
                    required
                    value={dpoName}
                    disabled={isReadOnlyDemo}
                    onChange={(e) => setDpoName(e.target.value)}
                    className="w-full px-3.5 py-2 bg-gray-950 border border-gray-800 rounded-lg text-sm text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Public Privacy Email Contact
                  </label>
                  <input
                    type="email"
                    required
                    value={privacyEmail}
                    disabled={isReadOnlyDemo}
                    onChange={(e) => setPrivacyEmail(e.target.value)}
                    className="w-full px-3.5 py-2 bg-gray-950 border border-gray-800 rounded-lg text-sm text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-gray-800 flex justify-end">
                <button
                  type="submit"
                  disabled={isReadOnlyDemo}
                  className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-md shadow-blue-600/20 transition-all disabled:bg-gray-800 disabled:text-gray-500 disabled:shadow-none disabled:cursor-not-allowed"
                >
                  {isReadOnlyDemo ? "Sample Settings" : "Save Settings"}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Modals */}
      {!isReadOnlyDemo && (
        <>
          <AddVendorModal
            isOpen={isAddOpen}
            onClose={() => setIsAddOpen(false)}
            onAdd={handleAddVendor}
          />

          <EditVendorModal
            vendor={editingVendor}
            isOpen={!!editingVendor}
            onClose={() => setEditingVendor(null)}
            onUpdate={handleUpdateVendor}
            onDelete={handleDeleteVendor}
          />
        </>
      )}
    </div>
  );
}
