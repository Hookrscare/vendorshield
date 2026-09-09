/**
 * QA-121: Continuous Third-Party Vulnerability & CVE Threat Intelligence Sync Engine.
 * Ingests NVD/CISA KEV vulnerability advisories, maps threats to active vendor rosters,
 * calculates CVSS/EPSS composite risk exposure, and generates SOC 2 CC7.1 compliance alerts.
 */

export type CVSSSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export type ThreatPosture = "HEALTHY_LOW_RISK" | "ACTIONABLE_PATCH_PENDING" | "CRITICAL_EXPLOIT_ALERT";

export interface CVECatalogItem {
  cveId: string;
  vendorName: string;
  affectedProduct: string;
  cvssScore: number; // 0.0 - 10.0
  severity: CVSSSeverity;
  cisaKevExploited: boolean; // Listed on CISA Known Exploited Vulnerabilities
  epssProbability: number; // 0.0 - 1.0
  summary: string;
  patchAvailable: boolean;
  publishedAtIso: string;
}

export interface MonitoredVendor {
  vendorId: string;
  vendorName: string;
  tier: "TIER_1_CRITICAL" | "TIER_2_HIGH" | "TIER_3_MEDIUM_LOW";
  activeProductsUsed: string[];
}

export interface VendorThreatFinding {
  vendorId: string;
  vendorName: string;
  cveId: string;
  cvssScore: number;
  effectiveRiskScore: number;
  cisaKevExploited: boolean;
  patchAvailable: boolean;
  slaRemediationDays: number;
  escalationRequired: boolean;
}

export interface VendorThreatProfile {
  vendorId: string;
  vendorName: string;
  tier: string;
  posture: ThreatPosture;
  compoundRiskScore: number; // 0 - 100
  activeCveCount: number;
  cisaKevCount: number;
  highestCvss: number;
  findings: VendorThreatFinding[];
}

export interface ThreatIntelligenceSyncReport {
  syncTimestampIso: string;
  totalCvesProcessed: number;
  totalVendorsMonitored: number;
  vulnerableVendorsCount: number;
  criticalExploitAlertsCount: number;
  vendorProfiles: VendorThreatProfile[];
  highPriorityEscalations: VendorThreatFinding[];
}

export function classifyCVSS(score: number): CVSSSeverity {
  if (score >= 9.0) return "CRITICAL";
  if (score >= 7.0) return "HIGH";
  if (score >= 4.0) return "MEDIUM";
  return "LOW";
}

export function calculateEffectiveRisk(cve: CVECatalogItem, vendorTier: string): number {
  let base = cve.cvssScore * 10.0; // 0 - 100 scale

  // CISA KEV weaponization penalty (+20 pts)
  if (cve.cisaKevExploited) {
    base += 20.0;
  }

  // High EPSS probability (> 0.25)
  if (cve.epssProbability > 0.25) {
    base += cve.epssProbability * 15.0;
  }

  // Vendor tier multiplier
  if (vendorTier === "TIER_1_CRITICAL") {
    base *= 1.15;
  }

  return Math.min(100.0, Math.round(base * 10) / 10);
}

export function determineRemediationSLA(effectiveRisk: number, cisaKev: boolean): number {
  if (cisaKev || effectiveRisk >= 85.0) return 7;   // 7 days emergency remediation
  if (effectiveRisk >= 70.0) return 15;            // 15 days high severity
  if (effectiveRisk >= 40.0) return 30;            // 30 days medium severity
  return 60;                                       // 60 days low severity
}

export function syncThreatIntelligence(
  cves: CVECatalogItem[],
  vendors: MonitoredVendor[]
): ThreatIntelligenceSyncReport {
  const vendorProfiles: VendorThreatProfile[] = [];
  const allEscalations: VendorThreatFinding[] = [];

  for (const vendor of vendors) {
    const findings: VendorThreatFinding[] = [];
    const lowerVendorName = vendor.vendorName.toLowerCase();
    const lowerProducts = vendor.activeProductsUsed.map(p => p.toLowerCase());

    for (const cve of cves) {
      const matchVendor = lowerVendorName.includes(cve.vendorName.toLowerCase()) ||
                          cve.vendorName.toLowerCase().includes(lowerVendorName);
      const matchProduct = lowerProducts.some(p => p.includes(cve.affectedProduct.toLowerCase()) ||
                                                   cve.affectedProduct.toLowerCase().includes(p));

      if (matchVendor || matchProduct) {
        const effectiveRisk = calculateEffectiveRisk(cve, vendor.tier);
        const slaDays = determineRemediationSLA(effectiveRisk, cve.cisaKevExploited);
        const escalation = cve.cisaKevExploited || effectiveRisk >= 80.0;

        const finding: VendorThreatFinding = {
          vendorId: vendor.vendorId,
          vendorName: vendor.vendorName,
          cveId: cve.cveId,
          cvssScore: cve.cvssScore,
          effectiveRiskScore: effectiveRisk,
          cisaKevExploited: cve.cisaKevExploited,
          patchAvailable: cve.patchAvailable,
          slaRemediationDays: slaDays,
          escalationRequired: escalation
        };

        findings.push(finding);
        if (escalation) {
          allEscalations.push(finding);
        }
      }
    }

    // Determine posture & compound risk
    const cisaCount = findings.filter(f => f.cisaKevExploited).length;
    const highestCvss = findings.reduce((max, f) => Math.max(max, f.cvssScore), 0.0);
    const compoundRisk = findings.reduce((max, f) => Math.max(max, f.effectiveRiskScore), 0.0);

    let posture: ThreatPosture = "HEALTHY_LOW_RISK";
    if (cisaCount > 0 || compoundRisk >= 85.0) {
      posture = "CRITICAL_EXPLOIT_ALERT";
    } else if (findings.length > 0) {
      posture = "ACTIONABLE_PATCH_PENDING";
    }

    vendorProfiles.push({
      vendorId: vendor.vendorId,
      vendorName: vendor.vendorName,
      tier: vendor.tier,
      posture,
      compoundRiskScore: compoundRisk,
      activeCveCount: findings.length,
      cisaKevCount: cisaCount,
      highestCvss,
      findings
    });
  }

  const vulnerableVendors = vendorProfiles.filter(p => p.activeCveCount > 0);
  const criticalAlerts = vendorProfiles.filter(p => p.posture === "CRITICAL_EXPLOIT_ALERT");

  return {
    syncTimestampIso: new Date().toISOString(),
    totalCvesProcessed: cves.length,
    totalVendorsMonitored: vendors.length,
    vulnerableVendorsCount: vulnerableVendors.length,
    criticalExploitAlertsCount: criticalAlerts.length,
    vendorProfiles,
    highPriorityEscalations: allEscalations
  };
}
