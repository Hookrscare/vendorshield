import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isProductionReadOnlyDemo, readOnlyDemoResponse } from "@/lib/demo-mode";
import { resolveTenantContext } from "@/lib/insforge/context";
import { InsForgeRepository, AuthorizationError } from "@/lib/insforge/repository";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") || undefined;
    const dpaStatus = searchParams.get("dpaStatus") || undefined;
    const search = searchParams.get("search") || undefined;

    const tenantResult = await resolveTenantContext(request);

    if (tenantResult.success) {
      const vendors = await InsForgeRepository.getVendors(tenantResult.context, {
        category,
        dpaStatus,
        search,
      });
      return NextResponse.json({
        success: true,
        data: vendors,
        isDemo: false,
        role: tenantResult.context.role,
      });
    }

    // Anonymous demo fallback
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

    return NextResponse.json({
      success: true,
      data: vendors,
      isDemo: true,
      role: "viewer",
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to fetch vendors" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const tenantResult = await resolveTenantContext(request);

  if (!tenantResult.success) {
    if (isProductionReadOnlyDemo()) return readOnlyDemoResponse();
    return NextResponse.json(
      { success: false, error: "The public dashboard is a read-only product demo." },
      { status: 403 }
    );
  }

  try {
    const body = await request.json().catch(() => null);
    if (!body || !body.name || !body.category) {
      return NextResponse.json(
        { success: false, error: "Name and Category are required" },
        { status: 400 }
      );
    }

    const newVendor = await InsForgeRepository.createVendor(tenantResult.context, body);
    return NextResponse.json({ success: true, data: newVendor }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status }
      );
    }
    return NextResponse.json(
      { success: false, error: "Failed to create vendor" },
      { status: 500 }
    );
  }
}
