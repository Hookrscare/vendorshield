import { ForensicMetrics } from "./types";

export interface SampleMediaCase {
  id: string;
  name: string;
  category: "Authentic Optical" | "AI FaceSwap" | "Generative Sora/Gen-3" | "Synthetic Voice/Avatar";
  thumbnailUrl: string;
  sourceDescription: string;
  metrics: ForensicMetrics;
}

export const SAMPLE_MEDIA_CASES: SampleMediaCase[] = [
  {
    id: "sample-authentic-camera",
    name: "Live Broadcast Interview (Sony FX6 4K)",
    category: "Authentic Optical",
    thumbnailUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80",
    sourceDescription: "Physical Sony CMOS sensor capture with continuous spatial PRNU noise & natural subdermal pulse.",
    metrics: {
      confidencePercent: 94,
      syntheticPercent: 3,
      latencyMs: 18,
      tier: "Enterprise Deep",
      prnu: {
        status: "NATURAL",
        noiseResidualStd: 2.4,
        kurtosis: 3.8,
        notes: "Consistent pixel-level hardware sensor fingerprint detected across 240 continuous frames.",
      },
      temporalWarp: {
        status: "COHERENT",
        motionWarpResidual: 4.2,
        shimmer: 0.8,
        notes: "True optical depth field with zero boundary shimmer or GAN warp interpolation.",
      },
      hemodynamics: {
        status: "PULSE_VERIFIED",
        bpmEstimated: 72,
        pulseCoherence: 0.91,
        notes: "Subdermal micro-vascular blood volume pulse (rPPG) detected across forehead and cheek vectors.",
      },
      specularPhysics: {
        status: "SYMMETRIC",
        gradientDivergence: 0.12,
        cornealReflectionMatch: true,
        notes: "Corneal reflections physically aligned with primary key-light vector.",
      },
    },
  },
  {
    id: "sample-faceswap-deepfake",
    name: "Executive Impersonation (SimSwap / RoOP)",
    category: "AI FaceSwap",
    thumbnailUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&auto=format&fit=crop&q=80",
    sourceDescription: "Neural face swap layered over authentic background video.",
    metrics: {
      confidencePercent: 98,
      syntheticPercent: 96,
      latencyMs: 24,
      tier: "Enterprise Deep",
      prnu: {
        status: "SYNTHETIC_GENERATED",
        noiseResidualStd: 0.4,
        kurtosis: 11.2,
        notes: "Severe PRNU noise discontinuity between facial mask boundary and background collar.",
      },
      temporalWarp: {
        status: "DRIFT_DETECTED",
        motionWarpResidual: 18.6,
        shimmer: 8.4,
        notes: "Temporal boundary flicker and jawline warping detected during head rotations.",
      },
      hemodynamics: {
        status: "PHANTOM_BLOOD_FLOW",
        bpmEstimated: undefined,
        pulseCoherence: 0.12,
        notes: "Zero biological hemodynamics. Static synthetic color channels with synthetic noise.",
      },
      specularPhysics: {
        status: "ANOMALOUS_GRADIENT",
        gradientDivergence: 4.8,
        cornealReflectionMatch: false,
        notes: "Left eye pupil specular reflection missing ambient key-light catchlight.",
      },
    },
  },
  {
    id: "sample-sora-generative",
    name: "Full Generative Scene (AI Video Diffusion)",
    category: "Generative Sora/Gen-3",
    thumbnailUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&auto=format&fit=crop&q=80",
    sourceDescription: "Pure text-to-video generative diffusion stream with no physical sensor origin.",
    metrics: {
      confidencePercent: 99,
      syntheticPercent: 99,
      latencyMs: 16,
      tier: "Enterprise Deep",
      prnu: {
        status: "SYNTHETIC_GENERATED",
        noiseResidualStd: 0.1,
        kurtosis: 18.5,
        notes: "Complete absence of silicon PRNU hardware signature. Pure latent diffusion tensor output.",
      },
      temporalWarp: {
        status: "FRAME_INTERPOLATION",
        motionWarpResidual: 22.4,
        shimmer: 14.2,
        notes: "Micro-hallucinations in background textures and progressive structural deformation.",
      },
      hemodynamics: {
        status: "PHANTOM_BLOOD_FLOW",
        bpmEstimated: undefined,
        pulseCoherence: 0.05,
        notes: "No genuine vascular hemoglobin absorption signal found in multi-spectral channels.",
      },
      specularPhysics: {
        status: "IRREGULAR_REFLECTION",
        gradientDivergence: 6.2,
        cornealReflectionMatch: false,
        notes: "Shadow vector angles violate inverse-square optical lighting constraints.",
      },
    },
  },
];
