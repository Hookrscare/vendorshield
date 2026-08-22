export interface PricingTier {
  name: string;
  priceId: string;
  amount: number;
  interval: "month" | "one_time";
  product: string;
}

export const PRICING_TIERS: Record<string, PricingTier> = {
  // VendorShield Tiers
  "vendorshield-startup": {
    name: "VendorShield Startup Plan",
    priceId: process.env.STRIPE_VENDORSHIELD_STARTUP_PRICE_ID || "price_vendorshield_startup_mock",
    amount: 5900, // $59.00
    interval: "month",
    product: "VendorShield",
  },
  "vendorshield-growth": {
    name: "VendorShield Growth Plan",
    priceId: process.env.STRIPE_VENDORSHIELD_GROWTH_PRICE_ID || "price_vendorshield_growth_mock",
    amount: 14900, // $149.00
    interval: "month",
    product: "VendorShield",
  },
  "vendorshield-pso-claim": {
    name: "Directory Verified Profile Claim",
    priceId: process.env.STRIPE_DIRECTORY_CLAIM_PRICE_ID || "price_directory_claim_mock",
    amount: 19900, // $199.00
    interval: "month",
    product: "VendorShield",
  },

  // SnapInspect AI Tiers
  "snapinspect-solo": {
    name: "SnapInspect AI Solo Inspector",
    priceId: process.env.STRIPE_SNAPINSPECT_SOLO_PRICE_ID || "price_snapinspect_solo_mock",
    amount: 4900, // $49.00
    interval: "month",
    product: "SnapInspect AI",
  },
  "snapinspect-team": {
    name: "SnapInspect AI Team (Up to 5 Inspectors)",
    priceId: process.env.STRIPE_SNAPINSPECT_TEAM_PRICE_ID || "price_snapinspect_team_mock",
    amount: 12900, // $129.00
    interval: "month",
    product: "SnapInspect AI",
  },

  // Digital Toolkit One-Off
  "inspector-toolkit": {
    name: "Independent Inspector Business Toolkit (2026 Edition)",
    priceId: process.env.STRIPE_INSPECTOR_TOOLKIT_PRICE_ID || "price_toolkit_mock",
    amount: 4900, // $49.00
    interval: "one_time",
    product: "Digital Toolkit",
  },

  // Dispel Lens Tiers
  "dispel-pro": {
    name: "Dispel Lens Security Pro",
    priceId: process.env.STRIPE_DISPEL_PRO_PRICE_ID || "price_dispel_pro_mock",
    amount: 2900, // $29.00
    interval: "month",
    product: "Dispel Lens",
  },
  "dispel-enterprise": {
    name: "Dispel Lens Enterprise API",
    priceId: process.env.STRIPE_DISPEL_ENTERPRISE_PRICE_ID || "price_dispel_enterprise_mock",
    amount: 29900, // $299.00
    interval: "month",
    product: "Dispel Lens",
  },
};
