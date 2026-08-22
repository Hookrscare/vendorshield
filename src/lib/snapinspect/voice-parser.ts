import { DefectSeverity } from "./types";

export interface ParsedDefectResult {
  title: string;
  category: string;
  severity: DefectSeverity;
  location: string;
  description: string;
  actionRecommended: string;
  estimatedCost: string;
  rawTranscript: string;
}

export function parseInspectorVoiceTranscript(
  transcript: string,
  trade: string = "residential"
): ParsedDefectResult {
  const lower = transcript.toLowerCase();

  // 1. Determine Severity
  let severity: DefectSeverity = "Moderate / Maintenance";
  if (
    lower.includes("urgent") ||
    lower.includes("emergency") ||
    lower.includes("active leak") ||
    lower.includes("immediate") ||
    lower.includes("failure") ||
    lower.includes("danger")
  ) {
    severity = "Urgent Repair";
  } else if (
    lower.includes("safety") ||
    lower.includes("hazard") ||
    lower.includes("fire risk") ||
    lower.includes("shock") ||
    lower.includes("double tap") ||
    lower.includes("gas leak") ||
    lower.includes("carbon monoxide") ||
    lower.includes("structural crack")
  ) {
    severity = "Safety Hazard";
  } else if (
    lower.includes("minor") ||
    lower.includes("cosmetic") ||
    lower.includes("wear and tear") ||
    lower.includes("paint") ||
    lower.includes("caulk") ||
    lower.includes("insulation wrap") ||
    lower.includes("small")
  ) {
    severity = "Minor / Cosmetic";
  }

  // 2. Determine Category
  let category = "General Observation";
  if (
    lower.includes("roof") ||
    lower.includes("shingle") ||
    lower.includes("flashing") ||
    lower.includes("gutter") ||
    lower.includes("soffit") ||
    lower.includes("membrane")
  ) {
    category =
      trade === "commercial_roof"
        ? "Membrane Surface & Seam Integrity"
        : "Roofing & Flashings";
  } else if (
    lower.includes("electric") ||
    lower.includes("panel") ||
    lower.includes("breaker") ||
    lower.includes("wire") ||
    lower.includes("gfci") ||
    lower.includes("outlet") ||
    lower.includes("neutral")
  ) {
    category = "Electrical Subpanels & Wiring";
  } else if (
    lower.includes("hvac") ||
    lower.includes("furnace") ||
    lower.includes("air condition") ||
    lower.includes("ac ") ||
    lower.includes("condenser") ||
    lower.includes("compressor") ||
    lower.includes("duct") ||
    lower.includes("heat pump")
  ) {
    category =
      trade === "hvac"
        ? "Condensing Unit & Compressor Health"
        : "HVAC & Thermal Comfort";
  } else if (
    lower.includes("plumb") ||
    lower.includes("pipe") ||
    lower.includes("water heater") ||
    lower.includes("drain") ||
    lower.includes("tpr") ||
    lower.includes("leak")
  ) {
    category = "Plumbing & Water Heaters";
  } else if (
    lower.includes("foundation") ||
    lower.includes("attic") ||
    lower.includes("crawlspace") ||
    lower.includes("beam") ||
    lower.includes("joist")
  ) {
    category = "Structural Foundation & Attic";
  } else if (
    lower.includes("exterior") ||
    lower.includes("siding") ||
    lower.includes("grading") ||
    lower.includes("stucco") ||
    lower.includes("deck")
  ) {
    category = "Exterior & Grading";
  }

  // 3. Location extractor
  let location = "Main Structure";
  const locationMatches = [
    { key: "garage", name: "Garage / Main Service Location" },
    { key: "attic", name: "Attic Space / Roof Deck Underside" },
    { key: "basement", name: "Basement / Mechanical Room" },
    { key: "crawlspace", name: "Crawlspace Subfloor Area" },
    { key: "southwest", name: "Southwest Roof Elevation" },
    { key: "northwest", name: "Northwest Elevation" },
    { key: "northeast", name: "Northeast Elevation" },
    { key: "southeast", name: "Southeast Elevation" },
    { key: "kitchen", name: "Kitchen Area" },
    { key: "bathroom", name: "Primary / Secondary Bathroom" },
    { key: "exterior", name: "Exterior Grounds / Envelope" },
    { key: "patio", name: "Rear Patio / Deck Area" },
    { key: "roof", name: "Main Upper Roof Plane" },
  ];

  for (const loc of locationMatches) {
    if (lower.includes(loc.key)) {
      location = loc.name;
      break;
    }
  }

  // 4. Estimate cost extractor
  let estimatedCost = "$200 - $500";
  const costRegex = /(\$?\d{2,5})\s*(dollars|bucks|\$)?/i;
  const match = transcript.match(costRegex);
  if (match) {
    const rawVal = match[1].replace("$", "");
    const num = parseInt(rawVal, 10);
    if (!isNaN(num) && num > 10) {
      estimatedCost = `$${num} - $${Math.round(num * 1.35)}`;
    }
  }

  // 5. Title & Action Recommended
  let title = "Visual Defect Observation";
  let actionRecommended = "Recommend evaluation by licensed trade contractor.";

  if (category.includes("Electrical")) {
    title = "Electrical Panel Deficiency & Code Violation";
    actionRecommended =
      "Have a licensed Master Electrician evaluate and repair circuit panel to current NEC standards.";
  } else if (category.includes("Roofing") || category.includes("Membrane")) {
    title = "Roof Covering Degradation & Flashing Deficiency";
    actionRecommended =
      "Engage a licensed roofing contractor to replace damaged sections and seal perimeter flashings.";
  } else if (category.includes("HVAC") || category.includes("Condensing")) {
    title = "HVAC Mechanical Component Service Required";
    actionRecommended =
      "Service and test HVAC system with a certified mechanical technician.";
  } else if (category.includes("Plumbing")) {
    title = "Plumbing Line / Fixture Deficiency";
    actionRecommended =
      "Engage a licensed master plumber for component repair/replacement.";
  } else if (category.includes("Foundation")) {
    title = "Structural / Substructure Integrity Finding";
    actionRecommended =
      "Consult a licensed structural engineer for geotechnical/foundation stabilization assessment.";
  }

  // Refine title from transcript keywords if specific
  if (lower.includes("double tap")) {
    title = "Double-Tapped Breaker / Neutral Bus Bar";
  } else if (lower.includes("valley") || lower.includes("shingle")) {
    title = "Lifted Shingles & Valley Flashing Erosion";
  } else if (lower.includes("capacitor")) {
    title = "HVAC Compressor Capacitor Bulge / Failure";
  } else if (lower.includes("tpr") || lower.includes("water heater")) {
    title = "Water Heater TPR Relief Discharge Pipe Hazard";
  } else if (lower.includes("ponding")) {
    title = "Commercial Membrane Water Ponding & Stagnation";
  }

  // Capitalize sentence clean description
  const description =
    transcript.charAt(0).toUpperCase() +
    transcript.slice(1).trim() +
    (transcript.endsWith(".") ? "" : ".");

  return {
    title,
    category,
    severity,
    location,
    description,
    actionRecommended,
    estimatedCost,
    rawTranscript: transcript,
  };
}
