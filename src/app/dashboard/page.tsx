"use client";

import { useState, useEffect } from "react";
import { SubProcessorVendor, CompanySettings, AuditLog } from "@/lib/types";
import { VendorStats } from "@/components/VendorStats";
import { VendorTable } from "@/components/VendorTable";
import { AddVendorModal } from "@/components/AddVendorModal";
import { EditVendorModal } from "@/components/EditVendorModal";
import Link from "next/link";
import { Plus, ArrowUpRight } from "lucide-react";

export default function DashboardPage() {
  const [isDemo, setIsDemo] = useState(true);
  const [userRole, setUserRole] = useState<string>("viewer");
  const [vendors, setVendors] = useState<SubProcessorVendor[]>([]);
  const [company, setCompany] = useState<CompanySettings | null>(null);
  const [entitlements, setEntitlements] = useState<{
    isPaid: boolean;
    planName: string;
  } | null>(null);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"register" | "logs" | "settings">(
    "register",
  );

  // Modal states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<SubProcessorVendor | null>(
    null,
  );
  const [saveSuccessNotice, setSaveSuccessNotice] = useState<string | null>(
    null,
  );

  // Settings form state
  const [companyName, setCompanyName] = useState("");
  const [privacyEmail, setPrivacyEmail] = useState("");
  const [dpoName, setDpoName] = useState("");
  const [website, setWebsite] = useState("");

  const isReadOnly = isDemo || userRole === "viewer";
  const canEdit =
    !isDemo &&
    (userRole === "owner" || userRole === "admin" || userRole === "member");
  const canAdmin = !isDemo && (userRole === "owner" || userRole === "admin");

  const fetchData = async () => {
    try {
      setLoading(true);
      setLoadError(false);
      const [vRes, cRes] = await Promise.all([
        fetch("/api/vendors"),
        fetch("/api/company"),
      ]);
      const vData = await vRes.json();
      const cData = await cRes.json();
      if (!vRes.ok || !cRes.ok || !vData.success || !cData.success)
        throw new Error("Workspace unavailable");

      if (vData.success) {
        setVendors(vData.data);
        if (vData.isDemo !== undefined) setIsDemo(vData.isDemo);
        if (vData.role) setUserRole(vData.role);
      }
      if (cData.success && cData.data) {
        setCompany(cData.data.company);
        setLogs(cData.data.logs || []);
        if (cData.data.entitlements) setEntitlements(cData.data.entitlements);
        setCompanyName(cData.data.company?.name || "");
        setPrivacyEmail(cData.data.company?.privacyEmail || "");
        setDpoName(cData.data.company?.dpoName || "");
        setWebsite(cData.data.company?.website || "");
        if (cData.isDemo !== undefined) setIsDemo(cData.isDemo);
        if (cData.role) setUserRole(cData.role);
      }
    } catch (err) {
      console.error("Failed to load dashboard data", err);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddVendor = async (
    newVendor: Omit<SubProcessorVendor, "id" | "addedAt">,
  ) => {
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
      } else {
        showNotice(`Error: ${data.error || "Failed to add vendor"}`);
      }
    } catch (err) {
      console.error("Error adding vendor", err);
      showNotice("Could not save changes. Please try again.");
    }
  };

  const handleUpdateVendor = async (
    id: string,
    updated: Partial<SubProcessorVendor>,
  ) => {
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
      } else {
        showNotice(`Error: ${data.error || "Failed to update vendor"}`);
      }
    } catch (err) {
      console.error("Error updating vendor", err);
      showNotice("Could not save changes. Please try again.");
    }
  };

  const handleDeleteVendor = async (id: string) => {
    try {
      const res = await fetch(`/api/vendors/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setVendors(vendors.filter((v) => v.id !== id));
        showNotice("Vendor deleted from register");
        fetchData();
      } else {
        showNotice(`Error: ${data.error || "Failed to delete vendor"}`);
      }
    } catch (err) {
      console.error("Error deleting vendor", err);
      showNotice("Could not save changes. Please try again.");
    }
  };

  const handleSaveCompanySettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
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
        fetchData();
      } else {
        showNotice(`Error: ${data.error || "Failed to save settings"}`);
      }
    } catch (err) {
      console.error("Error saving settings", err);
      showNotice("Could not save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const showNotice = (msg: string) => {
    setSaveSuccessNotice(msg);
    setTimeout(() => setSaveSuccessNotice(null), 4000);
  };

  return (
    <div className="workspace-page">
      {saveSuccessNotice && (
        <div className="workspace-toast" role="status">
          {saveSuccessNotice}
        </div>
      )}
      <header className="workspace-page-heading">
        <div>
          <p className="workspace-caption">
            {loading
              ? "Opening workspace"
              : company?.name || "Your organization"}{" "}
            {!loading && <>/ {isDemo ? "Sample workspace" : userRole}</>}
          </p>
          <h1>
            Your vendor <em>register.</em>
          </h1>
          <p>Keep the record. Review the details. Share what matters.</p>
        </div>
        <button
          className="ws-button primary"
          onClick={() => setIsAddOpen(true)}
          disabled={isReadOnly || loading}
          title={
            isReadOnly
              ? "Editing requires a member, admin, or owner account"
              : undefined
          }
        >
          <Plus size={17} /> Add vendor
        </button>
      </header>
      {loading ? (
        <div className="workspace-loading" role="status">
          <span>Loading your records…</span>
          <div />
          <div />
          <div />
        </div>
      ) : loadError ? (
        <div className="workspace-empty" role="alert">
          <h2>Your workspace couldn’t load.</h2>
          <p>
            Check your connection and try again. Your records have not changed.
          </p>
          <button className="ws-button" onClick={fetchData}>
            Try again
          </button>
        </div>
      ) : (
        <>
          <div className="workspace-status" role="status">
            <span className="status-dot" />
            {isDemo ? (
              <span>
                <strong>Sample workspace.</strong> Fictional records for
                exploring the product. Editing is disabled.{" "}
                <Link href="/login">Sign in ↗</Link>
              </span>
            ) : (
              <span>
                <strong>
                  {userRole === "viewer"
                    ? "Read-only access."
                    : "Workspace connected."}
                </strong>{" "}
                {userRole === "viewer"
                  ? "Contact an admin to change records."
                  : "Changes are saved to your organization."}{" "}
                Records and certification labels are user-maintained.
              </span>
            )}
          </div>
          <VendorStats vendors={vendors} />
          <div className="workspace-tabs" aria-label="Register sections">
            {(
              [
                ["register", "Vendor records"],
                ["logs", "Activity"],
                ["settings", "Settings & plan"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                aria-pressed={activeTab === key}
                onClick={() => setActiveTab(key)}
              >
                {label}
                {key === "register" && <span>{vendors.length}</span>}
              </button>
            ))}
          </div>
          {activeTab === "register" && (
            <VendorTable
              vendors={vendors}
              onEditVendor={(v) => (canEdit ? setEditingVendor(v) : null)}
              onAddClick={() => (canEdit ? setIsAddOpen(true) : null)}
              readOnly={isReadOnly}
            />
          )}
          {activeTab === "logs" && (
            <section className="workspace-section">
              <div className="section-intro">
                <span className="workspace-caption">02 / Record history</span>
                <h2>Workspace activity</h2>
                <p>Recorded changes to your vendor register.</p>
              </div>
              <div className="activity-list">
                {logs.length ? (
                  logs.map((log) => (
                    <article key={log.id}>
                      <span className="record-action">{log.action}</span>
                      <div>
                        <h3>{log.vendorName}</h3>
                        <p>{log.details}</p>
                        <small>{log.actor}</small>
                      </div>
                      <time dateTime={log.timestamp}>
                        {new Date(log.timestamp).toLocaleDateString()}
                      </time>
                    </article>
                  ))
                ) : (
                  <div className="workspace-empty">
                    <h3>No activity yet.</h3>
                    <p>Changes to your vendor records will appear here.</p>
                  </div>
                )}
              </div>
            </section>
          )}
          {activeTab === "settings" && (
            <section className="workspace-section settings-layout">
              <div className="section-intro">
                <span className="workspace-caption">03 / Organization</span>
                <h2>Company & privacy</h2>
                <p>
                  These details appear on your public disclosure and record
                  exports.
                </p>
                <div className="workspace-plan">
                  <span className="workspace-caption">Current plan</span>
                  <h3>
                    {isDemo
                      ? "Sample workspace"
                      : entitlements?.planName || "Community"}
                  </h3>
                  <p>
                    {entitlements?.isPaid
                      ? "Your account has an active paid entitlement."
                      : "Paid upgrades are currently unavailable."}
                  </p>
                  <Link href="/capabilities">
                    View current capabilities <ArrowUpRight size={14} />
                  </Link>
                </div>
              </div>
              <form
                onSubmit={handleSaveCompanySettings}
                className="workspace-form"
              >
                <label>
                  Company name
                  <input
                    type="text"
                    required
                    value={companyName}
                    disabled={!canAdmin}
                    onChange={(e) => setCompanyName(e.target.value)}
                  />
                </label>
                <label>
                  Website
                  <input
                    type="url"
                    required
                    value={website}
                    disabled={!canAdmin}
                    onChange={(e) => setWebsite(e.target.value)}
                  />
                </label>
                <label>
                  Data protection contact
                  <input
                    type="text"
                    required
                    value={dpoName}
                    disabled={!canAdmin}
                    onChange={(e) => setDpoName(e.target.value)}
                  />
                </label>
                <label>
                  Public privacy email
                  <input
                    type="email"
                    required
                    value={privacyEmail}
                    disabled={!canAdmin}
                    onChange={(e) => setPrivacyEmail(e.target.value)}
                  />
                </label>
                <div className="form-actions">
                  <span>
                    {!canAdmin
                      ? "Only owners and admins can change settings."
                      : "Visible on your public disclosure."}
                  </span>
                  <button
                    type="submit"
                    className="ws-button primary"
                    disabled={!canAdmin || saving}
                  >
                    {saving ? "Saving…" : "Save settings"}
                  </button>
                </div>
              </form>
            </section>
          )}
          <footer className="workspace-page-footer">
            <span>
              {vendors.length} vendor records /{" "}
              {isDemo ? "Sample data" : "Your organization"}
            </span>
            <Link href={`/p/${company?.slug || "acme-saas"}`} target="_blank">
              Public disclosure <ArrowUpRight size={15} />
            </Link>
          </footer>
        </>
      )}
      {canEdit && (
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
