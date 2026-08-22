import { TradeTemplate } from "./types";

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
  },
};
