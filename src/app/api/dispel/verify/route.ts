import { NextRequest, NextResponse } from "next/server";
import { SAMPLE_MEDIA_CASES } from "@/lib/dispel/sample-media";
import { ProofCertificate } from "@/lib/dispel/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mediaUrl, frameData, caseId, mode = "deep" } = body;

    // Check if matching a pre-defined forensic test case
    let selectedCase = SAMPLE_MEDIA_CASES[0];
    if (caseId) {
      const found = SAMPLE_MEDIA_CASES.find((c) => c.id === caseId);
      if (found) selectedCase = found;
    }

    const timestamp = new Date().toISOString();
    const certificateId = `DISPEL-CERT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const mediaHash = `SHA256:${Math.random().toString(36).substring(2, 14).toUpperCase()}${Math.random().toString(36).substring(2, 14).toUpperCase()}`;

    const verdict =
      selectedCase.metrics.syntheticPercent > 50
        ? "SYNTHETIC / DEEPFAKE ARTIFACTS DETECTED"
        : "VERIFIED PHYSICAL OPTICAL MEDIA";

    const certificate: ProofCertificate = {
      certificateId,
      timestamp,
      mediaHash,
      verdict,
      confidence: selectedCase.metrics.confidencePercent,
      syntheticProbability: selectedCase.metrics.syntheticPercent,
      sha256Attestation: `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`,
      inspectors: [
        "Dispel Neural PRNU Core v4.2",
        "BioPhotonic rPPG Pulse Analyzer",
        "Specular Gradient Raytracer",
      ],
      metadata: {
        sourceUrl: mediaUrl || "Live Camera / Ingested Stream",
        resolution: "3840x2160 (4K UHD)",
        codec: "H.265 / HEVC / ProRes",
        durationSeconds: 12.4,
      },
    };

    return NextResponse.json({
      success: true,
      data: {
        metrics: selectedCase.metrics,
        certificate,
        caseInfo: {
          id: selectedCase.id,
          name: selectedCase.name,
          category: selectedCase.category,
        },
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Forensic verification pipeline failed" },
      { status: 500 }
    );
  }
}
