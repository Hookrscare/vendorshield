import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const company = db.getCompany();
  // Support slug match or default demo slug
  if (company.slug !== params.slug && params.slug !== "demo" && params.slug !== "acme") {
    // Return company with the requested slug name for demo versatility
  }

  const vendors = db.getVendors().filter((v) => v.isPublic);

  return NextResponse.json({
    success: true,
    data: {
      company: {
        name: company.name,
        slug: company.slug,
        website: company.website,
        privacyEmail: company.privacyEmail,
        dpoName: company.dpoName,
        lastAuditDate: company.lastAuditDate,
      },
      vendors,
      totalCount: vendors.length,
      lastUpdated: new Date().toISOString(),
    },
  });
}
