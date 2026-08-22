import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const company = db.getCompany();
  const logs = db.getAuditLogs();
  return NextResponse.json({ success: true, data: { company, logs } });
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const updated = db.updateCompany(body);
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to update company settings" },
      { status: 500 }
    );
  }
}
