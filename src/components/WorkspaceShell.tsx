"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ArrowUpRight, Menu, X } from "lucide-react";
const sections = [
  ["01", "Vendor register", "/dashboard"],
  ["02", "Record exports", "/dashboard/audit-export"],
  ["03", "Public disclosure", "/dashboard/embed-code"],
  ["04", "Team & access", "/dashboard/team"],
];
export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [openPath, setOpenPath] = useState<string | null>(null);
  const open = openPath === path;
  return (
    <div className="workspace-shell">
      <header className="workspace-masthead">
        <Link href="/" className="library-brand" aria-label="VendorShield home">
          <span className="brand-symbol" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          VendorShield<span className="brand-period">.</span>
        </Link>
        <span className="workspace-edition">
          THE WORKSPACE / VENDOR RECORDS
        </span>
        <button
          className="workspace-menu"
          aria-label={
            open ? "Close workspace navigation" : "Open workspace navigation"
          }
          aria-expanded={open}
          aria-controls="workspace-navigation"
          onClick={() => setOpenPath(open ? null : path)}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>
      <div className="workspace-frame">
        <aside
          className={`workspace-rail ${open ? "is-open" : ""}`}
          id="workspace-navigation"
        >
          <span className="workspace-caption">Your workspace</span>
          <nav aria-label="Workspace navigation">
            {sections.map(([number, label, href]) => (
              <Link
                key={href}
                href={href}
                aria-current={path === href ? "page" : undefined}
                onClick={() => setOpenPath(null)}
              >
                <span>{number}</span>
                {label}
                <span aria-hidden="true">↗</span>
              </Link>
            ))}
          </nav>
          <div className="workspace-rail-note">
            <span className="workspace-caption">The reference library</span>
            <p>Context for your next vendor review.</p>
            <Link href="/directory">
              Browse the directory <ArrowUpRight size={16} />
            </Link>
          </div>
          <div className="workspace-rail-footer">
            <Link href="/capabilities">Product capabilities ↗</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <small>Records, not independent certification.</small>
          </div>
        </aside>
        <div className="workspace-content">{children}</div>
      </div>
    </div>
  );
}
