import Link from "next/link";

export default function SnapInspectPage() {
  return (
    <section className="max-w-4xl mx-auto px-6 py-20 space-y-8">
      <p className="font-mono text-xs uppercase tracking-widest text-amber-300">SnapInspect · Workspace reports</p>
      <h1 className="text-4xl sm:text-6xl font-display font-bold text-white">Inspection notes, photos, and PDF drafts.</h1>
      <p className="text-lg text-gray-300 leading-relaxed">Organize field observations in your browser and export a report. The app starts with example inspection data; review and replace it before preparing a real report.</p>
      <div className="grid sm:grid-cols-2 gap-6">
        <div className="p-6 border border-white/10 rounded-2xl space-y-3"><h2 className="text-xl font-bold">Available locally</h2><p className="text-gray-300">Inspection editing, photo attachments, browser storage, and PDF generation. Speech recognition depends on browser support. Text categorization uses keyword rules and requires your review.</p></div>
        <div className="p-6 border border-amber-400/30 rounded-2xl space-y-3"><h2 className="text-xl font-bold">Current limits</h2><p className="text-gray-300">Signed-in workspace members can save and restore reports up to 3 MB including photos. Owners, admins, and members can create revocable seven-day links to a saved snapshot. Local drafts need an explicit save; queued saves retry on reconnection. Offline behavior depends on browser support. Export backups; unsaved drafts can be lost if browser data is cleared. SnapInspect does not certify inspection findings.</p></div>
      </div>
      <div className="flex flex-wrap gap-4"><Link className="rounded-xl bg-amber-300 px-6 py-3 font-semibold text-gray-950" href="/snapinspect/app">Open inspection workspace</Link><Link className="rounded-xl border border-white/20 px-6 py-3" href="/tools/inspector-calculator">Try fee calculator</Link></div>
      <p id="pricing" className="text-gray-400">Paid SnapInspect plans are unavailable. The inspector toolkit contains editable template files, not legal advice or a certified inspection system.</p>
      <Link href="/capabilities" className="text-cyan-300 underline">View all capability limits</Link>
    </section>
  );
}
