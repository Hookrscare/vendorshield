/**
 * QA-113: Automated Sub-Processor Status Page Uptime & Health Poller
 * Monitors third-party sub-processor status pages (OpenAI, AWS, Anthropic, Stripe, etc.)
 * for active incidents, degraded performance, and uptime SLAs.
 */

import { SubProcessorVendor } from "./types";

export type UptimeStatus =
  | "operational"
  | "degraded_performance"
  | "partial_outage"
  | "major_outage"
  | "unknown";

export interface VendorUptimeCheck {
  vendorSlug: string;
  vendorName: string;
  statusPageUrl: string;
  status: UptimeStatus;
  responseTimeMs: number;
  lastCheckedAt: string;
  activeIncidentTitle?: string;
  error?: string;
}

export interface UptimeSummary {
  checkedCount: number;
  operationalCount: number;
  degradedCount: number;
  outageCount: number;
  averageResponseTimeMs: number;
  results: VendorUptimeCheck[];
}

export const KNOWN_STATUS_PAGES: Record<string, string> = {
  openai: "https://status.openai.com/api/v2/status.json",
  anthropic: "https://status.anthropic.com/api/v2/status.json",
  "amazon-web-services": "https://health.aws.amazon.com",
  stripe: "https://status.stripe.com/api/v2/status.json",
  github: "https://www.githubstatus.com/api/v2/status.json",
  supabase: "https://status.supabase.com/api/v2/status.json",
  datadog: "https://status.datadoghq.com/api/v2/status.json",
  vercel: "https://www.vercel-status.com/api/v2/status.json",
  resend: "https://resend-status.com/api/v2/status.json",
};

/**
 * Parses Atlassian Statuspage JSON API or raw HTML status texts.
 */
export function parseStatusPayload(payload: any): { status: UptimeStatus; incidentTitle?: string } {
  if (!payload) {
    return { status: "unknown" };
  }

  // Atlassian Statuspage.io JSON format
  if (typeof payload === "object" && payload.status?.indicator) {
    const indicator = String(payload.status.indicator).toLowerCase();
    const description = payload.status.description || undefined;

    switch (indicator) {
      case "none":
        return { status: "operational", incidentTitle: description };
      case "minor":
        return { status: "degraded_performance", incidentTitle: description };
      case "major":
        return { status: "partial_outage", incidentTitle: description };
      case "critical":
        return { status: "major_outage", incidentTitle: description };
      default:
        return { status: "operational", incidentTitle: description };
    }
  }

  // String / HTML fallback parsing
  if (typeof payload === "string") {
    const lower = payload.toLowerCase();
    if (lower.includes("major outage") || lower.includes("service outage")) {
      return { status: "major_outage", incidentTitle: "Major service outage reported" };
    }
    if (lower.includes("degraded performance") || lower.includes("partial outage")) {
      return { status: "degraded_performance", incidentTitle: "Degraded performance reported" };
    }
    if (lower.includes("all systems operational") || lower.includes("operational")) {
      return { status: "operational" };
    }
  }

  return { status: "operational" };
}

/**
 * Polls status page for a single vendor with response latency measurement.
 */
export async function pollVendorStatus(
  vendorSlug: string,
  vendorName: string,
  statusPageUrl?: string,
  fetchFn: typeof fetch = fetch
): Promise<VendorUptimeCheck> {
  const url = statusPageUrl || KNOWN_STATUS_PAGES[vendorSlug] || `https://status.${vendorSlug}.com`;
  const startTime = Date.now();

  try {
    const response = await fetchFn(url, {
      method: "GET",
      headers: {
        Accept: "application/json, text/html",
        "User-Agent": "VendorShield-Uptime-Monitor/2.0",
      },
    });

    const elapsedMs = Math.max(1, Date.now() - startTime);

    if (!response.ok && response.status >= 500) {
      return {
        vendorSlug,
        vendorName,
        statusPageUrl: url,
        status: "major_outage",
        responseTimeMs: elapsedMs,
        lastCheckedAt: new Date().toISOString(),
        error: `Status page returned HTTP ${response.status}`,
      };
    }

    let parsedStatus: { status: UptimeStatus; incidentTitle?: string };
    const contentType = response.headers?.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const json = await response.json();
      parsedStatus = parseStatusPayload(json);
    } else {
      const text = await response.text();
      parsedStatus = parseStatusPayload(text);
    }

    return {
      vendorSlug,
      vendorName,
      statusPageUrl: url,
      status: parsedStatus.status,
      responseTimeMs: elapsedMs,
      lastCheckedAt: new Date().toISOString(),
      activeIncidentTitle: parsedStatus.incidentTitle,
    };
  } catch (err: any) {
    const elapsedMs = Math.max(1, Date.now() - startTime);
    return {
      vendorSlug,
      vendorName,
      statusPageUrl: url,
      status: "unknown",
      responseTimeMs: elapsedMs,
      lastCheckedAt: new Date().toISOString(),
      error: err?.message || "Connection timeout or network failure",
    };
  }
}

/**
 * Executes concurrent status polling across sub-processor roster.
 */
export async function pollSubProcessorRoster(
  vendors: { slug: string; name: string; website?: string }[],
  fetchFn: typeof fetch = fetch
): Promise<UptimeSummary> {
  const promises = vendors.map((v) => pollVendorStatus(v.slug, v.name, undefined, fetchFn));
  const results = await Promise.all(promises);

  const operationalCount = results.filter((r) => r.status === "operational").length;
  const degradedCount = results.filter((r) => r.status === "degraded_performance").length;
  const outageCount = results.filter((r) => r.status === "partial_outage" || r.status === "major_outage").length;
  const totalResponseTime = results.reduce((acc, r) => acc + r.responseTimeMs, 0);

  return {
    checkedCount: results.length,
    operationalCount,
    degradedCount,
    outageCount,
    averageResponseTimeMs: results.length > 0 ? Math.round(totalResponseTime / results.length) : 0,
    results,
  };
}
