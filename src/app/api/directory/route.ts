import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const search = searchParams.get("search");

  let vendors = db.getDirectoryVendors();

  if (category && category !== "All") {
    vendors = vendors.filter((v) => v.category === category);
  }

  if (search) {
    const q = search.toLowerCase();
    vendors = vendors.filter(
      (v) =>
        v.name.toLowerCase().includes(q) ||
        v.description.toLowerCase().includes(q) ||
        v.commonDataProcessed.some((d) => d.toLowerCase().includes(q))
    );
  }

  return NextResponse.json({ success: true, data: vendors, total: vendors.length });
}
