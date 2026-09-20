"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
export function CapabilityNotice() {
  const path = usePathname() || "/";
  if (path.startsWith("/embed")) return null;
  const editorial =
    path === "/" || path.startsWith("/directory") || path === "/capabilities";
  return (
    <div className={`capability-notice ${editorial ? "is-paper" : "is-ink"}`}>
      <div>
        <span>Built for records. Clear about limits.</span>
        <Link href="/capabilities">
          See what currently works <span aria-hidden="true">↗</span>
        </Link>
      </div>
    </div>
  );
}
