import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const dpaStatus = searchParams.get("dpaStatus");
    const search = searchParams.get("search");

    let vendors = db.getVendors();

    if (category && category !== "All") {
      vendors = vendors.filter((v) => v.category === category);
    }

    if (dpaStatus && dpaStatus !== "All") {
      vendors = vendors.filter((v) => v.dpaStatus === dpaStatus);
    }

    if (search) {
      const q = search.toLowerCase();
      vendors = vendors.filter(
        (v) =>
          v.name.toLowerCase().includes(q) ||
          v.description.toLowerCase().includes(q) ||
          v.dataProcessed.some((d) => d.toLowerCase().includes(q))
      );
    }

    return NextResponse.json({ success: true, data: vendors });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to fetch vendors" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.name || !body.category) {
      return NextResponse.json(
        { success: false, error: "Name and Category are required" },
        { status: 400 }
      );
    }

    const newVendor = db.createVendor({
      name: body.name,
      slug: body.slug || body.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      description: body.description || "",
      category: body.category,
      website: body.website || "",
      dataProcessed: Array.isArray(body.dataProcessed)
        ? body.dataProcessed
        : typeof body.dataProcessed === "string"
        ? body.dataProcessed.split(",").map((s: string) => s.trim())
        : [],
      dataLocation: body.dataLocation || "United States",
      dpaUrl: body.dpaUrl || "",
      dpaStatus: body.dpaStatus || "Missing",
      certifications: body.certifications || [],
      riskLevel: body.riskLevel || "Low",
      lastReviewedDate: body.lastReviewedDate || new Date().toISOString().split("T")[0],
      nextReviewDate:
        body.nextReviewDate ||
        new Date(Date.now() + 365 * 86400000).toISOString().split("T")[0],
      notes: body.notes || "",
      isPublic: body.isPublic !== undefined ? body.isPublic : true,
    });

    return NextResponse.json({ success: true, data: newVendor }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to create vendor" },
      { status: 500 }
    );
  }
}
