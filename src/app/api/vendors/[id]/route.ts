import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isProductionReadOnlyDemo, readOnlyDemoResponse } from "@/lib/demo-mode";
import { resolveTenantContext } from "@/lib/insforge/context";
import { InsForgeRepository, AuthorizationError } from "@/lib/insforge/repository";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const tenantResult = await resolveTenantContext(request);

  if (tenantResult.success) {
    const vendor = await InsForgeRepository.getVendorById(tenantResult.context, id);
    if (!vendor) {
      return NextResponse.json(
        { success: false, error: "Vendor not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, data: vendor });
  }

  // Anonymous demo
  const vendor = db.getVendorById(id);
  if (!vendor) {
    return NextResponse.json(
      { success: false, error: "Vendor not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, data: vendor });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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
    if (!body) {
      return NextResponse.json(
        { success: false, error: "Invalid request body" },
        { status: 400 }
      );
    }

    const updated = await InsForgeRepository.updateVendor(
      tenantResult.context,
      id,
      body
    );

    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Vendor not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status }
      );
    }
    return NextResponse.json(
      { success: false, error: "Failed to update vendor" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const tenantResult = await resolveTenantContext(request);

  if (!tenantResult.success) {
    if (isProductionReadOnlyDemo()) return readOnlyDemoResponse();
    return NextResponse.json(
      { success: false, error: "The public dashboard is a read-only product demo." },
      { status: 403 }
    );
  }

  try {
    const deleted = await InsForgeRepository.deleteVendor(tenantResult.context, id);

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: "Vendor not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: { deleted: true } });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status }
      );
    }
    return NextResponse.json(
      { success: false, error: "Failed to delete vendor" },
      { status: 500 }
    );
  }
}
