/**
 * SNAP-42: Ground Penetrating Radar (GPR) Multi-Layer Concrete Rebar & Void Mesh Exporter.
 * Part of SnapInspect AI Tactical Field Inspection CAD & Mobile AI.
 * 
 * Reconstructs 3D multi-layer rebar lattices and subsurface voids from 3D GPR grid surveys.
 * Evaluates structural cover compliance per ACI 318 / Eurocode 2.
 * Exports 3D Wavefront OBJ mesh, CAD SVG sections, and GeoJSON geospatial coordinates.
 */

export interface GprPoint3D {
  xCm: number; // Scan line position along width
  yCm: number; // Scan pass position along length
  zDepthCm: number; // Subsurface depth
}

export interface RebarDetection3D {
  id: string;
  start: GprPoint3D;
  end: GprPoint3D;
  diameterMm: number;
  layer: "TOP_MAT_LONGITUDINAL" | "TOP_MAT_TRANSVERSE" | "BOTTOM_MAT_LONGITUDINAL" | "BOTTOM_MAT_TRANSVERSE";
  corrosionSeverityPercent: number; // 0-100% attenuation loss
}

export interface SubsurfaceVoid3D {
  id: string;
  center: GprPoint3D;
  widthCm: number;
  lengthCm: number;
  heightCm: number;
  confidence: number; // 0.0 - 1.0
}

export interface GprSurveyVolume {
  surveyId: string;
  slabWidthCm: number;
  slabLengthCm: number;
  slabThicknessCm: number;
  minSpecifiedCoverCm: number; // e.g. 3.8 cm (1.5 in per ACI 318)
  rebars: RebarDetection3D[];
  voids: SubsurfaceVoid3D[];
}

export interface MeshExportResult {
  surveyId: string;
  totalRebars: number;
  totalVoids: number;
  topCoverMinCm: number;
  aciCoverCompliant: boolean;
  coverDeficientRebarIds: string[];
  objMesh: string;
  cadSvgSection: string;
  geoJson: Record<string, any>;
}

export class GprMeshExporter {
  /**
   * Evaluates ACI 318 cover depth and exports 3D mesh + CAD formats.
   */
  public static processAndExport(volume: GprSurveyVolume): MeshExportResult {
    const deficientRebars: string[] = [];
    let minTopCover = Number.MAX_VALUE;

    for (const rebar of volume.rebars) {
      const depth = Math.min(rebar.start.zDepthCm, rebar.end.zDepthCm);
      if (depth < minTopCover) {
        minTopCover = depth;
      }
      if (depth < volume.minSpecifiedCoverCm) {
        deficientRebars.push(rebar.id);
      }
    }

    if (volume.rebars.length === 0) {
      minTopCover = 0;
    }

    const aciCoverCompliant = deficientRebars.length === 0;

    // 1. Generate 3D Wavefront OBJ representation
    const objLines: string[] = [
      `# SnapInspect AI GPR 3D Mesh Exporter - Survey ${volume.surveyId}`,
      `o ConcreteSlab`,
      // 8 vertices for concrete slab bounding box
      `v 0.0 0.0 0.0`,
      `v ${volume.slabWidthCm} 0.0 0.0`,
      `v ${volume.slabWidthCm} ${volume.slabLengthCm} 0.0`,
      `v 0.0 ${volume.slabLengthCm} 0.0`,
      `v 0.0 0.0 -${volume.slabThicknessCm}`,
      `v ${volume.slabWidthCm} 0.0 -${volume.slabThicknessCm}`,
      `v ${volume.slabWidthCm} ${volume.slabLengthCm} -${volume.slabThicknessCm}`,
      `v 0.0 ${volume.slabLengthCm} -${volume.slabThicknessCm}`,
      `# Rebar Segments`
    ];

    let vOffset = 9;
    volume.rebars.forEach((rebar, i) => {
      objLines.push(`o Rebar_${rebar.id}`);
      objLines.push(`v ${rebar.start.xCm} ${rebar.start.yCm} -${rebar.start.zDepthCm}`);
      objLines.push(`v ${rebar.end.xCm} ${rebar.end.yCm} -${rebar.end.zDepthCm}`);
      objLines.push(`l ${vOffset} ${vOffset + 1}`);
      vOffset += 2;
    });

    volume.voids.forEach((v) => {
      objLines.push(`o Void_${v.id}`);
      objLines.push(`v ${v.center.xCm} ${v.center.yCm} -${v.center.zDepthCm}`);
      vOffset += 1;
    });

    const objMesh = objLines.join("\n");

    // 2. Generate 2D CAD SVG Section View (X vs Depth)
    const svgWidth = 800;
    const svgHeight = 400;
    const scaleX = svgWidth / Math.max(volume.slabWidthCm, 1);
    const scaleZ = svgHeight / Math.max(volume.slabThicknessCm, 1);

    const svgElements: string[] = [
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgWidth} ${svgHeight}" width="${svgWidth}" height="${svgHeight}">`,
      `<rect width="${svgWidth}" height="${svgHeight}" fill="#1e293b" />`,
      `<text x="20" y="30" fill="#94a3b8" font-family="sans-serif" font-size="14">GPR CAD Section: ${volume.surveyId} | ACI Min Cover: ${volume.minSpecifiedCoverCm}cm</text>`
    ];

    // Rebar cross sections (circles)
    volume.rebars.forEach((rebar) => {
      const cx = ((rebar.start.xCm + rebar.end.xCm) / 2) * scaleX;
      const cy = ((rebar.start.zDepthCm + rebar.end.zDepthCm) / 2) * scaleZ;
      const isDeficient = deficientRebars.includes(rebar.id);
      const color = isDeficient ? "#ef4444" : "#10b981";
      svgElements.push(`<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="6" fill="${color}" stroke="#ffffff" stroke-width="1.5" />`);
    });

    // Voids (cross-hatched rectangles)
    volume.voids.forEach((vd) => {
      const vx = (vd.center.xCm - vd.widthCm / 2) * scaleX;
      const vy = (vd.center.zDepthCm - vd.heightCm / 2) * scaleZ;
      const vw = vd.widthCm * scaleX;
      const vh = vd.heightCm * scaleZ;
      svgElements.push(`<rect x="${vx.toFixed(1)}" y="${vy.toFixed(1)}" width="${vw.toFixed(1)}" height="${vh.toFixed(1)}" fill="#f59e0b" fill-opacity="0.4" stroke="#f59e0b" stroke-dasharray="4" />`);
    });

    svgElements.push(`</svg>`);
    const cadSvgSection = svgElements.join("\n");

    // 3. GeoJSON feature collection
    const geoJson = {
      type: "FeatureCollection",
      properties: {
        surveyId: volume.surveyId,
        slabDimensionsCm: [volume.slabWidthCm, volume.slabLengthCm, volume.slabThicknessCm],
        aciCoverCompliant,
        topCoverMinCm: Math.round(minTopCover * 10) / 10
      },
      features: [
        ...volume.rebars.map((r) => ({
          type: "Feature",
          properties: {
            id: r.id,
            layer: r.layer,
            diameterMm: r.diameterMm,
            depthCm: r.start.zDepthCm,
            corrosionPercent: r.corrosionSeverityPercent
          },
          geometry: {
            type: "LineString",
            coordinates: [
              [r.start.xCm, r.start.yCm, -r.start.zDepthCm],
              [r.end.xCm, r.end.yCm, -r.end.zDepthCm]
            ]
          }
        })),
        ...volume.voids.map((v) => ({
          type: "Feature",
          properties: {
            id: v.id,
            type: "SubsurfaceVoid",
            confidence: v.confidence,
            dimensionsCm: [v.widthCm, v.lengthCm, v.heightCm]
          },
          geometry: {
            type: "Point",
            coordinates: [v.center.xCm, v.center.yCm, -v.center.zDepthCm]
          }
        }))
      ]
    };

    return {
      surveyId: volume.surveyId,
      totalRebars: volume.rebars.length,
      totalVoids: volume.voids.length,
      topCoverMinCm: Math.round(minTopCover * 10) / 10,
      aciCoverCompliant,
      coverDeficientRebarIds: deficientRebars,
      objMesh,
      cadSvgSection,
      geoJson
    };
  }
}
