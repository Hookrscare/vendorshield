/**
 * Automated SaaS Lead Generator & Outreach Personalizer
 * Generates ready-to-send personalized cold outreach for VendorShield & SnapInspect AI
 */

interface LeadTarget {
  companyName: string;
  contactName: string;
  contactRole: string;
  email: string;
  category: "Seed/Series A SaaS" | "Field Inspection Firm";
  painPoint: string;
  suggestedStackOrTrade: string;
}

const SAMPLE_PROSPECT_PIPELINE: LeadTarget[] = [
  {
    companyName: "NexusAI",
    contactName: "Alex Vance",
    contactRole: "CTO & Co-Founder",
    email: "alex@nexusai.example.com",
    category: "Seed/Series A SaaS",
    painPoint: "Recent launch of LLM agent API requiring new OpenAI/Anthropic DPAs for SOC 2 Type II audit",
    suggestedStackOrTrade: "OpenAI, AWS, Stripe, Supabase, PostHog",
  },
  {
    companyName: "HyperMetrics",
    contactName: "David Chen",
    contactRole: "VP of Engineering",
    email: "david@hypermetrics.example.com",
    category: "Seed/Series A SaaS",
    painPoint: "Public /subprocessors page has not been updated in 9 months, blocking enterprise sales deals",
    suggestedStackOrTrade: "GCP, Datadog, Sentry, Vercel, Resend",
  },
  {
    companyName: "Apex Peak Roof Inspections",
    contactName: "Marcus Sterling",
    contactRole: "Principal Inspector",
    email: "marcus@apexpeakroofs.example.com",
    category: "Field Inspection Firm",
    painPoint: "Spends 2.5 hours per night compiling roof photos and notes into Word templates",
    suggestedStackOrTrade: "Commercial Flat Roof ASTM & Residential Shingle Audits",
  },
  {
    companyName: "Cornerstone Property Certifications",
    contactName: "Brian Keller",
    contactRole: "Lead Home Inspector",
    email: "brian@cornerstoneinspect.example.com",
    category: "Field Inspection Firm",
    painPoint: "Needs standardized InterNACHI defect disclaimer clauses and instant client PDF reports",
    suggestedStackOrTrade: "Residential Home & HVAC Mechanical Inspection",
  },
];

function generatePersonalizedEmail(lead: LeadTarget): string {
  if (lead.category === "Seed/Series A SaaS") {
    return `
================================================================================
TO: ${lead.contactName} <${lead.email}>
SUBJECT: Quick question about ${lead.companyName}'s /subprocessors page & SOC 2 audit
================================================================================
Hi ${lead.contactName.split(" ")[0]},

Noticed ${lead.companyName}'s rapid growth—congrats on the momentum!

Are you currently preparing for an upcoming SOC 2 Type II or ISO 27001 audit cycle?

Most engineering leads spend 20+ hours tracking Data Processing Agreements (DPAs) across tools like ${lead.suggestedStackOrTrade}. When public sub-processor disclosures fall out of sync, enterprise security reviews stall.

We built VendorShield (https://vendorshield-blond.vercel.app) to automate this:
1. 1-Click Register: Pre-indexes 30+ developer APIs (OpenAI, AWS, Stripe, Supabase) with verified DPA links.
2. Embeddable Widget: 1 line of code auto-syncs with your website's /subprocessors page in real time.
3. 1-Click Auditor Pack: Exports official AICPA CC6.6 & CC9.2 signed PDF evidence.

Happy to set you and the ${lead.companyName} engineering team up with free access if you'd find it helpful.

Best regards,
Castro
Founder, VendorShield
`;
  } else {
    return `
================================================================================
TO: ${lead.contactName} <${lead.email}>
SUBJECT: Save 2 hours/day on inspection reports at ${lead.companyName} 📋
================================================================================
Hi ${lead.contactName.split(" ")[0]},

I came across ${lead.companyName}'s work in ${lead.suggestedStackOrTrade}.

Quick question: How many hours do you spend every evening formatting on-site photos and typing up defect notes after a long day in the field?

We built SnapInspect AI (https://vendorshield-blond.vercel.app/snapinspect/app) specifically for independent inspectors:
- Speak your defect observations on-site using voice dictation (it auto-categorizes severity and repair recommendations).
- Attach photos directly on your mobile phone with auto-generated arrow tags.
- Generate and send an official branded PDF inspection report before leaving the property.

You can test the mobile PWA on your phone for free here:
👉 https://vendorshield-blond.vercel.app/snapinspect/app

Hope this saves you some evening hours on your next job!

Best,
Castro
Creator, SnapInspect AI
`;
  }
}

console.log("\n========================================================");
console.log("🎯 AUTOMATED B2B SAAS OUTREACH PIPELINE GENERATOR");
console.log("========================================================\n");

SAMPLE_PROSPECT_PIPELINE.forEach((lead, index) => {
  console.log(`[Lead #${index + 1}: ${lead.companyName} (${lead.category})]`);
  console.log(generatePersonalizedEmail(lead));
});
