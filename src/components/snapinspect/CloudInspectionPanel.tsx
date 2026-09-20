"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { InspectionData } from "@/lib/snapinspect/types";
import { MAX_DOCUMENT_BYTES } from "@/lib/snapinspect/document";

type Workspace = { organization: { id: string; name: string }; userId: string; role: string };
type Saved = { client_id: string; title: string; revision: number; updated_at: string; share_expires_at: string | null };
type Pending = { inspection: InspectionData; revision: number; organizationId: string };

export function CloudInspectionPanel({ inspection, onLoad }: { inspection: InspectionData; onLoad: (value: InspectionData) => void }) {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [saved, setSaved] = useState<Saved[]>([]);
  const [selection, setSelection] = useState("");
  const [message, setMessage] = useState("Checking workspace access…");
  const [busy, setBusy] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [shareConsent, setShareConsent] = useState(false);
  const [revisions, setRevisions] = useState<Record<string, number>>({});
  const [savedContent, setSavedContent] = useState<Record<string, string>>({});
  const lock = useRef(false);
  const storagePrefix = workspace ? `snapinspect_cloud_${workspace.organization.id}_${workspace.userId}` : "";
  const editable = !!workspace && ["owner", "admin", "member"].includes(workspace.role);
  const isSaved = savedContent[inspection.id] === JSON.stringify(inspection);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/snapinspect/inspections", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) { setWorkspace(null); setMessage(body.error || "Sign in to save to a workspace."); return null; }
      setWorkspace({ organization: body.organization, userId: body.userId, role: body.role });
      setSaved(body.data);
      setMessage("Workspace connected. Local drafts are uploaded only when you choose Save.");
      return body as Workspace;
    } catch { setMessage("Offline or server unavailable. Local drafts remain on this device."); return null; }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    setShareUrl(""); setShareConsent(false);
  }, [inspection.id]);
  useEffect(() => {
    setSavedContent({}); setShareUrl(""); setShareConsent(false); setSelection("");
    if (!storagePrefix) { setRevisions({}); return; }
    try {
      setRevisions(JSON.parse(localStorage.getItem(`${storagePrefix}_revisions`) || "{}"));
    } catch { setRevisions({}); }
  }, [storagePrefix]);

  const flushPending = useCallback(async () => {
    if (!workspace || lock.current) return;
    lock.current = true; setBusy(true);
    try {
      // Re-check account identity before uploading a queued private document.
      const access = await fetch("/api/snapinspect/inspections", { cache: "no-store" });
      const current = await access.json();
      if (!access.ok || current.userId !== workspace.userId || current.organization.id !== workspace.organization.id) {
        setMessage("Account or workspace changed. Queued drafts were retained; reconnect before syncing."); return;
      }
      const entries = Object.keys(localStorage).filter(key => key.startsWith(`${storagePrefix}_pending_`));
      for (const key of entries) {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const queued = JSON.parse(raw) as Pending;
        const response = await fetch("/api/snapinspect/inspections", { method: "POST", headers: { "Content-Type": "application/json" }, body: raw });
        const result = await response.json();
        if (!response.ok) { setMessage(result.error || "Save failed. Your queued draft was retained."); return; }
        setRevisions(previous => {
          const next = { ...previous, [queued.inspection.id]: result.data.revision };
          localStorage.setItem(`${storagePrefix}_revisions`, JSON.stringify(next)); return next;
        });
        setSavedContent(previous => ({ ...previous, [queued.inspection.id]: JSON.stringify(queued.inspection) }));
        // Acknowledgement must precede removal; never remove a newer queued edit.
        if (localStorage.getItem(key) === raw) localStorage.removeItem(key);
        setMessage(`Saved “${queued.inspection.title}” to workspace (revision ${result.data.revision}).`);
      }
      const listResponse = await fetch("/api/snapinspect/inspections", { cache: "no-store" });
      if (listResponse.ok) setSaved((await listResponse.json()).data);
    } catch { setMessage("Cloud save could not be confirmed. Queued drafts remain on this device; retry when connected."); }
    finally { lock.current = false; setBusy(false); }
  }, [storagePrefix, workspace]);

  useEffect(() => {
    const retry = () => { void flushPending(); };
    window.addEventListener("online", retry);
    return () => window.removeEventListener("online", retry);
  }, [flushPending]);

  const save = async () => {
    if (!workspace || !editable) return;
    const pending: Pending = { inspection, revision: revisions[inspection.id] || 0, organizationId: workspace.organization.id };
    const raw = JSON.stringify(pending);
    if (new Blob([raw]).size > MAX_DOCUMENT_BYTES) { setMessage("This report exceeds 3 MB. Reduce photos before cloud saving. Your local report is unchanged."); return; }
    try { localStorage.setItem(`${storagePrefix}_pending_${inspection.id}`, raw); }
    catch { setMessage("Device storage is full. Export a PDF or JSON backup before proceeding; the draft was not queued."); return; }
    setShareUrl(""); setShareConsent(false);
    if (!navigator.onLine) { setMessage("Queued on this device. It will retry on reconnection; keep a backup."); return; }
    await flushPending();
  };

  const load = async () => {
    if (!selection || busy) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/snapinspect/inspections/${encodeURIComponent(selection)}`, { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) { setMessage(body.error); return; }
      onLoad(body.inspection);
      setRevisions(previous => {
        const next = { ...previous, [selection]: body.revision };
        localStorage.setItem(`${storagePrefix}_revisions`, JSON.stringify(next)); return next;
      });
      setSavedContent(previous => ({ ...previous, [selection]: JSON.stringify(body.inspection) }));
      setMessage("Cloud copy loaded. Any different local draft was preserved as a separate copy. Pending edits remain queued until you save or keep a separate copy.");
    } catch { setMessage("Could not load cloud copy. Local drafts are unchanged."); }
    finally { setBusy(false); }
  };

  const share = async (revoke: boolean) => {
    if (!workspace || (!revoke && (!shareConsent || !isSaved))) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/snapinspect/inspections/${encodeURIComponent(inspection.id)}/share`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ revision: revisions[inspection.id], organizationId: workspace.organization.id, revoke }) });
      const body = await response.json();
      if (!response.ok) { setMessage(body.error); return; }
      setShareUrl(body.token ? `${window.location.origin}/snapinspect/report#${body.token}` : "");
      setMessage(revoke ? "The previous report link has been revoked." : `Read-only snapshot link created; expires ${new Date(body.expiresAt).toLocaleString()}. Creating a new link replaces the previous one.`);
      setShareConsent(false);
    } catch { setMessage("Could not confirm the sharing change. Retry before distributing a link."); }
    finally { setBusy(false); }
  };

  return (
    <section className="mx-auto max-w-6xl my-4 rounded-2xl border border-cyan-500/30 bg-gray-900 p-5 space-y-3" aria-label="Cloud inspection storage">
      <h2 className="text-lg font-bold">Workspace storage &amp; client report</h2>
      <p className="text-sm text-gray-300">{workspace ? `${workspace.organization.name} · ${workspace.role}` : "Local editing is available without an account."}</p>
      <p role="status" className="text-sm text-cyan-200">{message}</p>
      {!workspace ? <Link href="/login" className="text-cyan-300 underline">Sign in or create a workspace</Link> : <>
        <div className="flex flex-wrap gap-3">
          <button disabled={busy || !editable} onClick={save} className="rounded-lg bg-cyan-500 px-4 py-2 text-gray-950 disabled:opacity-40">Save current report to workspace</button>
          <button disabled={busy || !editable} onClick={() => void flushPending()} className="rounded-lg border border-gray-600 px-4 py-2 disabled:opacity-40">Retry queued saves</button>
          <button disabled={busy} onClick={() => void refresh()} className="rounded-lg border border-gray-600 px-4 py-2">Refresh saved list</button>
        </div>
        <div className="flex flex-wrap gap-3">
          <select aria-label="Saved workspace inspections" value={selection} onChange={event => setSelection(event.target.value)} className="max-w-full bg-gray-950 p-2 rounded-lg"><option value="">Choose a saved inspection</option>{saved.map(item => <option key={item.client_id} value={item.client_id}>{item.title} · revision {item.revision}</option>)}</select>
          <button disabled={busy || !selection} onClick={load} className="rounded-lg border border-gray-600 px-4 py-2 disabled:opacity-40">Load cloud copy</button>
        </div>
        <p className="text-xs text-gray-400">{isSaved ? "Current draft matches the saved snapshot." : "Save the current draft before creating a report link."} Cloud reports are limited to 3 MB including photos. No records are emailed automatically.</p>
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={shareConsent} onChange={event => setShareConsent(event.target.checked)} />Allow anyone with the link to read the saved report, including client/property details and photos, for seven days.</label>
        <div className="flex flex-wrap gap-3"><button disabled={busy || !editable || !isSaved || !shareConsent} onClick={() => void share(false)} className="rounded-lg border border-cyan-400 px-4 py-2 disabled:opacity-40">Create read-only report link</button><button disabled={busy || !editable || !revisions[inspection.id]} onClick={() => void share(true)} className="rounded-lg border border-gray-600 px-4 py-2 disabled:opacity-40">Revoke report link</button></div>
        {shareUrl && <label className="block text-sm">Copy this private link<input aria-label="Client report link" readOnly value={shareUrl} className="mt-1 w-full bg-gray-950 p-3 rounded-lg" onFocus={event => event.currentTarget.select()} /></label>}
      </>}
    </section>
  );
}
