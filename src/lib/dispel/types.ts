export type AttestationVerdict = 
  | "VERIFIED PHYSICAL OPTICAL MEDIA"
  | "SYNTHETIC / DEEPFAKE ARTIFACTS DETECTED"
  | "INCONCLUSIVE / LOW RESOLUTION"
  | "ADVERSARIAL MANIPULATION DETECTED";

export type LensFilterMode = 
  | "NORMAL" 
  | "X-RAY VISION" 
  | "SENSOR NOISE" 
  | "ECG PULSE" 
  | "LATTICE" 
  | "PROOF CARD";

export interface ForensicMetrics {
  confidencePercent: number;
  syntheticPercent: number;
  latencyMs: number;
  tier: "Fast Edge" | "Enterprise Deep" | "Forensic Lab";
  
  // Vector 1: Optical & Sensor PRNU
  prnu: {
    status: "NATURAL" | "SUSPICIOUS" | "SYNTHETIC_GENERATED";
    noiseResidualStd: number;
    kurtosis: number;
    notes: string;
  };

  // Vector 2: Temporal Warp Drift
  temporalWarp: {
    status: "COHERENT" | "DRIFT_DETECTED" | "FRAME_INTERPOLATION";
    motionWarpResidual: number;
    shimmer: number;
    notes: string;
  };

  // Vector 3: Biometric Hemodynamics
  hemodynamics: {
    status: "PULSE_VERIFIED" | "NO FACE" | "PHANTOM_BLOOD_FLOW";
    bpmEstimated?: number;
    pulseCoherence?: number;
    notes: string;
  };

  // Vector 4: Lighting & Specular Physics
  specularPhysics: {
    status: "SYMMETRIC" | "ANOMALOUS_GRADIENT" | "IRREGULAR_REFLECTION";
    gradientDivergence: number;
    cornealReflectionMatch: boolean;
    notes: string;
  };
}

export interface ProofCertificate {
  certificateId: string;
  timestamp: string;
  mediaHash: string;
  verdict: AttestationVerdict;
  confidence: number;
  syntheticProbability: number;
  sha256Attestation: string;
  inspectors: string[];
  metadata: {
    sourceUrl?: string;
    resolution: string;
    codec?: string;
    durationSeconds?: number;
  };
}
