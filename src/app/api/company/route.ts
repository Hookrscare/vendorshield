import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isProductionReadOnlyDemo, readOnlyDemoResponse } from "@/lib/demo-mode";
import { resolveTenantContext } from "@/lib/insforge/context";
import { InsForgeRepository, AuthorizationError } from "@/lib/insforge/repository";

export async function GET(request: NextRequest) {
  try {
    const tenantResult = await resolveTenantContext(request);

    if (tenantResult.success) {
      const { company, logs } = await InsForgeRepository.getCompanySettings(
        tenantResult.context
      );
      return NextResponse.json({
        success: true,
        data: { company, logs },
        isDemo: false,
        role: tenantResult.context.role,
      });
    }

    // Anonymous demo
    const company = db.getCompany();
    const logs = db.getAuditLogs();
    return NextResponse.json({
      success: true,
      data: { company, logs },
      isDemo: true,
      role: "viewer",
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to fetch company settings" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
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

    const updated = await InsForgeRepository.updateCompanySettings(
      tenantResult.context,
      body
    );

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status }
      );
    }
    return NextResponse.json(
      { success: false, error: "Failed to update company settings" },
      { status: 500 }
    );
  }
}
