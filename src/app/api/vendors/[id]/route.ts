import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isProductionReadOnlyDemo, readOnlyDemoResponse } from "@/lib/demo-mode";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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
  if (isProductionReadOnlyDemo()) return readOnlyDemoResponse();

  const { id } = await params;

  try {
    const body = await request.json();
    const updated = db.updateVendor(id, body);
    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Vendor not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
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
  if (isProductionReadOnlyDemo()) return readOnlyDemoResponse();

  const { id } = await params;

  try {
    const deleted = db.deleteVendor(id);
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: "Vendor not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, message: "Vendor deleted" });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to delete vendor" },
      { status: 500 }
    );
  }
}
