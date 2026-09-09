/**
 * SNAP-10: Client-Side Offline SVG Floorplan Vector CAD Annotator Engine.
 * Enables zero-latency offline architectural blueprint rendering, defect pin tagging,
 * wall vector dimensioning, and room square footage calculation.
 */

export type WallType = "EXTERIOR_BEARING" | "INTERIOR_PARTITION" | "CURTAIN_WALL" | "FOUNDATION";

export type DefectSeverity = "CRITICAL" | "MAJOR" | "MINOR" | "OBSERVATION";

export interface CADPoint {
  x: number;
  y: number;
}

export interface CADWall {
  id: string;
  start: CADPoint;
  end: CADPoint;
  type: WallType;
  thicknessPx?: number;
}

export interface DefectPin {
  id: string;
  location: CADPoint;
  code: string;
  title: string;
  trade: string;
  severity: DefectSeverity;
  roomName?: string;
  photoCount?: number;
}

export interface CADRoom {
  id: string;
  name: string;
  polygon: CADPoint[];
  fillColor?: string;
}

export interface DimensionLine {
  id: string;
  start: CADPoint;
  end: CADPoint;
  label?: string;
}

export interface FloorplanCADModel {
  id: string;
  propertyAddress: string;
  scalePixelsPerUnit: number; // e.g., 20 pixels = 1 foot (or meter)
  unit: "FT" | "M";
  width: number;
  height: number;
  walls: CADWall[];
  rooms: CADRoom[];
  defectPins: DefectPin[];
  dimensions: DimensionLine[];
}

export interface SvgRenderOptions {
  showGrid?: boolean;
  showWalls?: boolean;
  showRooms?: boolean;
  showDimensions?: boolean;
  showDefectPins?: boolean;
  theme?: "LIGHT" | "DARK" | "BLUEPRINT";
}

const SEVERITY_COLORS: Record<DefectSeverity, { fill: string; stroke: string; text: string }> = {
  CRITICAL: { fill: "#ef4444", stroke: "#991b1b", text: "#ffffff" },
  MAJOR: { fill: "#f59e0b", stroke: "#b45309", text: "#ffffff" },
  MINOR: { fill: "#3b82f6", stroke: "#1d4ed8", text: "#ffffff" },
  OBSERVATION: { fill: "#10b981", stroke: "#047857", text: "#ffffff" }
};

export function calculateDistance(p1: CADPoint, p2: CADPoint): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculates polygon area using the Shoelace formula (Gauss's area formula).
 */
export function calculatePolygonArea(polygon: CADPoint[]): number {
  const n = polygon.length;
  if (n < 3) return 0;

  let area = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += polygon[i].x * polygon[j].y;
    area -= polygon[j].x * polygon[i].y;
  }
  return Math.abs(area) / 2.0;
}

/**
 * Computes physical square footage or square meters from pixel polygon coordinates.
 */
export function computeRoomPhysicalArea(
  polygon: CADPoint[],
  scalePixelsPerUnit: number
): { pixelArea: number; physicalArea: number } {
  const pixelArea = calculatePolygonArea(polygon);
  if (scalePixelsPerUnit <= 0) {
    return { pixelArea, physicalArea: 0 };
  }
  const physicalArea = pixelArea / (scalePixelsPerUnit * scalePixelsPerUnit);
  return {
    pixelArea: Math.round(pixelArea * 100) / 100,
    physicalArea: Math.round(physicalArea * 100) / 100
  };
}

export function findNearbyDefectPins(
  model: FloorplanCADModel,
  target: CADPoint,
  tolerancePx: number = 24
): DefectPin[] {
  return model.defectPins.filter(pin => {
    const dist = calculateDistance(pin.location, target);
    return dist <= tolerancePx;
  });
}

export function upsertDefectPin(
  model: FloorplanCADModel,
  pin: DefectPin
): FloorplanCADModel {
  const existingIdx = model.defectPins.findIndex(p => p.id === pin.id);
  const updatedPins = [...model.defectPins];
  if (existingIdx >= 0) {
    updatedPins[existingIdx] = pin;
  } else {
    updatedPins.push(pin);
  }
  return {
    ...model,
    defectPins: updatedPins
  };
}

export function generateFloorplanSvgMarkup(
  model: FloorplanCADModel,
  options: SvgRenderOptions = {}
): string {
  const {
    showGrid = true,
    showWalls = true,
    showRooms = true,
    showDimensions = true,
    showDefectPins = true,
    theme = "BLUEPRINT"
  } = options;

  const bgFill = theme === "BLUEPRINT" ? "#0f172a" : theme === "DARK" ? "#18181b" : "#ffffff";
  const gridStroke = theme === "BLUEPRINT" ? "rgba(56, 189, 248, 0.08)" : theme === "DARK" ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)";
  const wallBearingStroke = theme === "BLUEPRINT" ? "#38bdf8" : theme === "DARK" ? "#e4e4e7" : "#0f172a";
  const wallPartitionStroke = theme === "BLUEPRINT" ? "#94a3b8" : theme === "DARK" ? "#71717a" : "#64748b";
  const textPrimary = theme === "LIGHT" ? "#0f172a" : "#f8fafc";
  const textSecondary = theme === "LIGHT" ? "#64748b" : "#94a3b8";

  const svgParts: string[] = [];
  svgParts.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${model.width} ${model.height}" width="100%" height="100%" style="background-color: ${bgFill}; font-family: ui-sans-serif, system-ui, sans-serif;">`);

  // Defs & Markers
  svgParts.push(`  <defs>`);
  if (showGrid) {
    svgParts.push(`    <pattern id="cad-grid" width="40" height="40" patternUnits="userSpaceOnUse">`);
    svgParts.push(`      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="${gridStroke}" stroke-width="1"/>`);
    svgParts.push(`    </pattern>`);
  }
  svgParts.push(`    <marker id="dim-arrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">`);
  svgParts.push(`      <circle cx="3" cy="3" r="2" fill="${wallPartitionStroke}"/>`);
  svgParts.push(`    </marker>`);
  svgParts.push(`  </defs>`);

  // Background & Grid
  svgParts.push(`  <rect width="${model.width}" height="${model.height}" fill="${bgFill}"/>`);
  if (showGrid) {
    svgParts.push(`  <rect width="${model.width}" height="${model.height}" fill="url(#cad-grid)"/>`);
  }

  // Rooms Polygon layer
  if (showRooms && model.rooms.length > 0) {
    svgParts.push(`  <!-- Rooms Layer -->`);
    for (const room of model.rooms) {
      if (room.polygon.length < 3) continue;
      const pointsAttr = room.polygon.map(p => `${p.x},${p.y}`).join(" ");
      const fill = room.fillColor || (theme === "BLUEPRINT" ? "rgba(14, 165, 233, 0.08)" : "rgba(244, 244, 245, 0.4)");
      svgParts.push(`  <polygon points="${pointsAttr}" fill="${fill}" stroke="none"/>`);

      // Centroid for Room Label
      const cx = room.polygon.reduce((acc, p) => acc + p.x, 0) / room.polygon.length;
      const cy = room.polygon.reduce((acc, p) => acc + p.y, 0) / room.polygon.length;
      const { physicalArea } = computeRoomPhysicalArea(room.polygon, model.scalePixelsPerUnit);

      svgParts.push(`  <text x="${cx}" y="${cy - 6}" font-size="12" font-weight="600" fill="${textPrimary}" text-anchor="middle">${room.name}</text>`);
      svgParts.push(`  <text x="${cx}" y="${cy + 10}" font-size="10" font-family="monospace" fill="${textSecondary}" text-anchor="middle">${physicalArea} sq ${model.unit.toLowerCase()}</text>`);
    }
  }

  // Walls Layer
  if (showWalls && model.walls.length > 0) {
    svgParts.push(`  <!-- Walls Layer -->`);
    for (const wall of model.walls) {
      const stroke = wall.type === "EXTERIOR_BEARING" || wall.type === "FOUNDATION" ? wallBearingStroke : wallPartitionStroke;
      const strokeWidth = wall.thicknessPx || (wall.type === "EXTERIOR_BEARING" ? 6 : 3);
      svgParts.push(`  <line x1="${wall.start.x}" y1="${wall.start.y}" x2="${wall.end.x}" y2="${wall.end.y}" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linecap="round"/>`);
    }
  }

  // Dimensions Layer
  if (showDimensions && model.dimensions.length > 0) {
    svgParts.push(`  <!-- Dimensions Layer -->`);
    for (const dim of model.dimensions) {
      const distPx = calculateDistance(dim.start, dim.end);
      const physicalDist = model.scalePixelsPerUnit > 0 ? (distPx / model.scalePixelsPerUnit).toFixed(1) : distPx.toFixed(0);
      const label = dim.label || `${physicalDist} ${model.unit}`;
      const mx = (dim.start.x + dim.end.x) / 2;
      const my = (dim.start.y + dim.end.y) / 2 - 4;

      svgParts.push(`  <line x1="${dim.start.x}" y1="${dim.start.y}" x2="${dim.end.x}" y2="${dim.end.y}" stroke="${wallPartitionStroke}" stroke-width="1.5" stroke-dasharray="4 2" marker-start="url(#dim-arrow)" marker-end="url(#dim-arrow)"/>`);
      svgParts.push(`  <text x="${mx}" y="${my}" font-size="10" font-family="monospace" fill="${textSecondary}" text-anchor="middle">${label}</text>`);
    }
  }

  // Defect Pins Layer
  if (showDefectPins && model.defectPins.length > 0) {
    svgParts.push(`  <!-- Defect Pins Layer -->`);
    for (const pin of model.defectPins) {
      const colors = SEVERITY_COLORS[pin.severity] || SEVERITY_COLORS.OBSERVATION;
      const r = 10;
      const pinLabel = pin.code.includes("-") ? pin.code.split("-")[0] : pin.code.slice(0, 4);
      svgParts.push(`  <g class="defect-pin" data-id="${pin.id}" transform="translate(${pin.location.x}, ${pin.location.y})">`);
      svgParts.push(`    <circle r="${r + 4}" fill="${colors.fill}" opacity="0.25"/>`);
      svgParts.push(`    <circle r="${r}" fill="${colors.fill}" stroke="${colors.stroke}" stroke-width="2"/>`);
      svgParts.push(`    <text y="3" font-size="9" font-weight="700" fill="${colors.text}" text-anchor="middle">${pinLabel}</text>`);
      svgParts.push(`  </g>`);
    }
  }

  svgParts.push(`</svg>`);
  return svgParts.join("\n");
}
