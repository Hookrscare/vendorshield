import { NextRequest, NextResponse } from "next/server";
import { InsForgeRepository } from "@/lib/insforge/repository";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const result = await InsForgeRepository.getPublicCompanyAndVendors(slug);

    if (!result) {
      return NextResponse.json(
        { success: false, error: "Sub-processor register not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: result,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to fetch public disclosure register" },
      { status: 500 }
    );
  }
}
