import { DefectClause, InspectionTrade, TradeTemplate } from "./types";

export const TRADE_TEMPLATES: Record<string, TradeTemplate> = {
  residential: {
    id: "residential",
    name: "Residential Home Inspection",
    iconName: "Home",
    standard: "InterNACHI & ASHI SOP 2026 Standards",
    badge: "Residential Standard",
    description: "Complete visual inspection of accessible structural, mechanical, plumbing, electrical, and roofing systems.",
    defaultCategories: [
      "Roofing & Flashings",
      "Exterior & Grading",
      "Electrical Subpanels & Wiring",
      "HVAC & Thermal Comfort",
      "Plumbing & Water Heaters",
      "Structural Foundation & Attic",
      "Interior Doors, Windows & Drywall",
      "Garage & Life Safety Controls",
    ],
    defaultScope:
      "A non-invasive, visual examination of the accessible areas of the residential building designed to identify observed material defects within specific systems and components.",
    disclaimer:
      "This inspection is visual and non-destructive. Concealed components behind finished walls, underground utilities, environmental hazards (radon, mold, lead, asbestos), and systems not energized at time of inspection are excluded under InterNACHI Standards of Practice.",
    defectClauses: [
      {
        id: "res-elec-gfci",
        category: "Electrical Subpanels & Wiring",
        title: "Missing GFCI Protection at Wet Locations",
        description: "Standard receptacles within 6 feet of kitchen sink and bathrooms lack Ground Fault Circuit Interrupter (GFCI) protection.",
        severity: "Safety Hazard",
        actionRecommended: "Replace with certified Class A GFCI outlets or GFCI circuit breakers by a licensed master electrician.",
        typicalCostRange: "$150 - $350",
      },
      {
        id: "res-plumb-tpr",
        category: "Plumbing & Water Heaters",
        title: "Missing TPR Valve Discharge Pipe Extension",
        description: "Water heater Temperature & Pressure Relief (TPR) valve lacks full-length rigid copper or CPVC gravity discharge tube to floor level.",
        severity: "Safety Hazard",
        actionRecommended: "Install continuous 3/4-inch discharge piping terminating within 6 inches of floor drain to mitigate steam hazard.",
        typicalCostRange: "$75 - $150",
      },
      {
        id: "res-roof-granule",
        category: "Roofing & Flashings",
        title: "Architectural Shingle Weathering & Granule Loss",
        description: "South-facing roof plane displays extensive mineral granule depletion and minor cupping, indicating advanced weathering.",
        severity: "Moderate / Maintenance",
        actionRecommended: "Have a licensed roofing contractor perform localized shingle sealing and budget for scheduled replacement.",
        typicalCostRange: "$400 - $1,200",
      },
    ],
  },
  commercial_roof: {
    id: "commercial_roof",
    name: "Commercial Roofing Evaluation",
    iconName: "Building2",
    standard: "ASTM E2018-24 & NRCA Commercial Guidelines",
    badge: "ASTM Commercial Spec",
    description: "Multi-point commercial membrane, metal deck, flashing, and drainage performance evaluation.",
    defaultCategories: [
      "Membrane Surface & Seam Integrity",
      "Ponding Water & Drainage Scuppers",
      "Parapet Walls, Coping & Edge Flashing",
      "Penetration Sleeves & Pitch Pockets",
      "Expansion Joints & Structural Decking",
      "Rooftop HVAC Curb Mounts & Walkways",
    ],
    defaultScope:
      "Visual assessment of commercial low-slope and steep-slope roofing assemblies to determine remaining useful service life, active water intrusion risk, and immediate remedial repair requirements.",
    disclaimer:
      "Roof core sampling, non-destructive moisture meter grid testing, and structural engineering load verifications are outside the scope of this baseline visual evaluation unless specifically commissioned.",
    defectClauses: [
      {
        id: "comm-roof-ponding",
        category: "Ponding Water & Drainage Scuppers",
        title: "Membrane Ponding Beyond 48-Hour Threshold",
        description: "Standing water exceeding 1.5 inches depth observed over 200 sq ft near central drainage scupper 72 hours post-rain event, creating premature UV membrane degradation.",
        severity: "Moderate / Maintenance",
        actionRecommended: "Install tapered polyiso roof insulation crickets or auxiliary roof drain sump to restore positive gravity drainage.",
        typicalCostRange: "$1,800 - $4,500",
      },
      {
        id: "comm-roof-tpo-weld",
        category: "Membrane Surface & Seam Integrity",
        title: "TPO Seam Delamination & Hot-Air Weld Voids",
        description: "Probing identified multiple unbonded lap seam voids along field cross-seams with degraded adhesive and cold-weld detachment.",
        severity: "Urgent Repair",
        actionRecommended: "Clean membrane surface with approved solvent and perform hot-air robotic or hand re-welding with TPO cover strips.",
        typicalCostRange: "$950 - $2,800",
      },
      {
        id: "comm-roof-parapet",
        category: "Parapet Walls, Coping & Edge Flashing",
        title: "Parapet Metal Coping Separation & Missing Cleat",
        description: "Wind uplift displacement observed on west parapet coping cap. Continuous locking cleats missing, allowing moisture ingress into masonry wall cavity.",
        severity: "Urgent Repair",
        actionRecommended: "Re-anchor 24-gauge continuous cleat and re-seat coping metal with approved elastomeric sealants.",
        typicalCostRange: "$1,200 - $3,200",
      },
      {
        id: "comm-roof-pitch-pocket",
        category: "Penetration Sleeves & Pitch Pockets",
        title: "Pitch Pocket Filler Shrinkage & Conduit Separation",
        description: "Mastic filler compound inside conduit pitch pockets has shrunk and cracked, creating direct open pathways for water penetration around RTU electrical lines.",
        severity: "Moderate / Maintenance",
        actionRecommended: "Remove degraded potting material, top off with pourable polyurethane sealant, and install sheet-metal umbrella hoods.",
        typicalCostRange: "$450 - $900",
      },
    ],
  },
  hvac: {
    id: "hvac",
    name: "HVAC System & Mechanical Inspection",
    iconName: "Flame",
    standard: "ACCA Standard 5 (QI) & ASHRAE 62.2",
    badge: "Mechanical Cert",
    description: "Comprehensive heating, cooling, heat pump, refrigeration cycle, and airflow ducting evaluation.",
    defaultCategories: [
      "Condensing Unit & Compressor Health",
      "Furnace / Air Handler & Heat Exchanger",
      "Refrigerant Lines & Operating Delta-T",
      "Ductwork Integrity & Static Pressure",
      "Condensate Drainage & Safety Float Switches",
      "Thermostat Controls & Electrical Contactors",
    ],
    defaultScope:
      "Operational verification and safety check of primary heating, ventilation, and air conditioning equipment under standard ambient operating conditions.",
    disclaimer:
      "Heat exchanger interior crack scope, refrigerant leak dye tests, and duct balance CFM anemometer logging represent specialized diagnostic procedures and require secondary lab testing.",
    defectClauses: [
      {
        id: "hvac-compressor-short-cycle",
        category: "Condensing Unit & Compressor Health",
        title: "Commercial Compressor Rapid Short Cycling",
        description: "Scroll compressor cycling off on high-head pressure switch within 90 seconds of startup. Thermal overload tripping observed under 85°F ambient.",
        severity: "Urgent Repair",
        actionRecommended: "Inspect condenser coil fouling, test run capacitors, and verify expansion valve superheat/subcooling charging.",
        typicalCostRange: "$800 - $2,200",
      },
      {
        id: "hvac-refrigerant-oil-leak",
        category: "Refrigerant Lines & Operating Delta-T",
        title: "Refrigerant Line Flare Fitting Oil Staining",
        description: "Accumulated compressor POE lubricant and dust observed around service port Schrader valves and suction line flare joints, indicating active vapor leak.",
        severity: "Moderate / Maintenance",
        actionRecommended: "Recover refrigerant charge, pressure-test circuit with dry nitrogen (300 PSI), re-flare brass connections, and recharge to factory weight.",
        typicalCostRange: "$650 - $1,600",
      },
      {
        id: "hvac-economizer-damper",
        category: "Thermostat Controls & Electrical Contactors",
        title: "Economizer Outside Air Damper Actuator Seizure",
        description: "Belimo damper actuator seized in 65% open position during mechanical cooling mode, introducing excess outdoor humidity into conditioned supply airstream.",
        severity: "Moderate / Maintenance",
        actionRecommended: "Clean damper mechanical linkage, test 2-10V DC modulation signal, and replace defective 24VAC spring-return actuator.",
        typicalCostRange: "$500 - $1,100",
      },
      {
        id: "hvac-heat-exchanger-crack",
        category: "Furnace / Air Handler & Heat Exchanger",
        title: "Primary Heat Exchanger Stress Fractures",
        description: "Visible hairline fracture and severe oxidation detected along the second burner cell pass. Elevated CO (carbon monoxide) risk to building occupants.",
        severity: "Safety Hazard",
        actionRecommended: "Immediate red-tag lockout of gas supply. Replace furnace heat exchanger assembly or entire air handling unit prior to reactivation.",
        typicalCostRange: "$2,500 - $6,000",
      },
    ],
  },
};

export function getDefectClausesForTrade(trade: InspectionTrade): DefectClause[] {
  const template = TRADE_TEMPLATES[trade] || TRADE_TEMPLATES.residential;
  return template.defectClauses || [];
}

export function findDefectClauseById(clauseId: string): DefectClause | undefined {
  for (const template of Object.values(TRADE_TEMPLATES)) {
    const found = template.defectClauses?.find((c) => c.id === clauseId);
    if (found) return found;
  }
  return undefined;
}
