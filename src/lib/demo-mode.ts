import { NextResponse } from "next/server";

export function isProductionReadOnlyDemo(): boolean {
  return process.env.NODE_ENV === "production";
}

export function readOnlyDemoResponse() {
  return NextResponse.json(
    {
      success: false,
      error: "The public dashboard is a read-only product demo.",
    },
    { status: 403 }
  );
}
