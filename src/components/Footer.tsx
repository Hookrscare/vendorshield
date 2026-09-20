"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
export function Footer() {
  const path = usePathname() || "/";
  if (path.startsWith("/embed") || path.startsWith("/dashboard")) return null;
  const editorial =
    path === "/" || path.startsWith("/directory") || path === "/capabilities";
  return (
    <footer className={`library-footer ${editorial ? "is-paper" : "is-ink"}`}>
      <div className="reference-container">
        <div className="footer-top">
          <div>
            <Link href="/" className="footer-wordmark">
              VendorShield.
            </Link>
            <p>Clarity begins with a good record.</p>
          </div>
          <nav aria-label="Footer navigation">
            <div>
              <h2 className="eyebrow">Workspace</h2>
              <Link href="/dashboard">Vendor register</Link>
              <Link href="/dashboard/audit-export">Record exports</Link>
              <Link href="/dashboard/embed-code">Public disclosure</Link>
            </div>
            <div>
              <h2 className="eyebrow">Reference</h2>
              <Link href="/directory">Vendor directory</Link>
              <Link href="/capabilities">What currently works</Link>
              <Link href="/tools/widget-generator">Widget example</Link>
            </div>
            <div>
              <h2 className="eyebrow">Other products</h2>
              <Link href="/snapinspect">
                SnapInspect <ArrowUpRight size={14} />
              </Link>
              <Link href="/dispel">
                Dispel availability <ArrowUpRight size={14} />
              </Link>
            </div>
          </nav>
        </div>
        <div className="footer-bottom">
          <span>© 2026 VendorShield</span>
          <span>Records, not independent certification.</span>
          <div>
            <Link href="/privacy">Privacy Policy</Link>
            <Link href="/terms">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
