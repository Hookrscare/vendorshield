"use client";

import { useState } from "react";
import { DefectPhoto } from "@/lib/snapinspect/types";
import { ImagePlus, Trash2, Camera, Sparkles } from "lucide-react";

interface PhotoUploadProps {
  photos: DefectPhoto[];
  onChange: (photos: DefectPhoto[]) => void;
}

function generatePhotoId(): string {
  return `ph-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
}

const SAMPLE_PHOTO_CHOICES = [
  {
    name: "Roof Shingle / Flashing",
    url: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='400' viewBox='0 0 600 400'><rect width='600' height='400' fill='%231e293b'/><rect x='40' y='60' width='520' height='280' rx='12' fill='%23334155'/><path d='M80 260 L200 160 L320 230 L440 140 L520 220' stroke='%23f59e0b' stroke-width='6' fill='none'/><circle cx='440' cy='140' r='18' fill='%23ef4444' stroke='%23ffffff' stroke-width='3'/><text x='50%25' y='80' fill='%23f8fafc' font-size='20' font-family='sans-serif' font-weight='bold' text-anchor='middle'>ROOF FLASHING DEFECT</text><text x='50%25' y='320' fill='%2394a3b8' font-size='14' font-family='sans-serif' text-anchor='middle'>Asphalt shingle granule loss &amp; unsealed valley</text></svg>",
    caption: "Roof valley flashing lifting with sealant gap",
    annotation: "Red circle marks active water ingress point",
  },
  {
    name: "Electrical Panel Sub-breaker",
    url: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='400' viewBox='0 0 600 400'><rect width='600' height='400' fill='%230f172a'/><rect x='60' y='40' width='480' height='320' rx='8' fill='%231e293b' stroke='%23475569' stroke-width='4'/><rect x='100' y='80' width='160' height='240' fill='%23020617'/><rect x='340' y='80' width='160' height='240' fill='%23020617'/><line x1='180' y1='120' x2='420' y2='120' stroke='%23ef4444' stroke-width='5'/><circle cx='300' cy='120' r='14' fill='%23ef4444'/><text x='50%25' y='340' fill='%23fca5a5' font-size='14' font-family='sans-serif' font-weight='bold' text-anchor='middle'>SAFETY HAZARD: Double Tapped 30A Breaker</text></svg>",
    caption: "Breaker #14 double neutral connection",
    annotation: "Dual conductors on single bus screw",
  },
  {
    name: "HVAC Line Degradation",
    url: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='400' viewBox='0 0 600 400'><rect width='600' height='400' fill='%23111827'/><rect x='80' y='60' width='440' height='280' rx='16' fill='%231f2937' stroke='%23374151' stroke-width='3'/><circle cx='300' cy='180' r='70' fill='%23374151' stroke='%2360a5fa' stroke-width='4'/><path d='M300 110 L300 250 M230 180 L370 180' stroke='%2360a5fa' stroke-width='4'/><text x='50%25' y='310' fill='%2393c5fd' font-size='14' font-family='sans-serif' font-weight='bold' text-anchor='middle'>AC CONDENSER: Refrigerant Line Insulation Missing</text></svg>",
    caption: "Suction line exposed copper without insulation",
    annotation: "Condensation drip causing exterior siding stain",
  },
];

export function PhotoUpload({ photos, onChange }: PhotoUploadProps) {
  const [captionInput, setCaptionInput] = useState("");

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      const newPhoto: DefectPhoto = {
        id: generatePhotoId(),
        url: base64,
        caption: captionInput || file.name.replace(/\.[^/.]+$/, ""),
        annotation: "Field photo capture",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      onChange([...photos, newPhoto]);
      setCaptionInput("");
    };
    reader.readAsDataURL(file);
  };

  const handleAddSample = (sample: typeof SAMPLE_PHOTO_CHOICES[0]) => {
    const newPhoto: DefectPhoto = {
      id: generatePhotoId(),
      url: sample.url,
      caption: sample.caption,
      annotation: sample.annotation,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    onChange([...photos, newPhoto]);
  };

  const handleRemovePhoto = (id: string) => {
    onChange(photos.filter((p) => p.id !== id));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
          <Camera className="w-3.5 h-3.5 text-blue-400" />
          Defect Photos &amp; Visual Evidence ({photos.length})
        </label>
        <span className="text-[11px] text-gray-500">Auto-formatted for client report</span>
      </div>

      {/* Grid of current photos */}
      {photos.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="group relative bg-gray-950 border border-gray-800 rounded-xl overflow-hidden p-2 space-y-2 shadow"
            >
              <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden flex items-center justify-center relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.url}
                  alt={photo.caption}
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => handleRemovePhoto(photo.id)}
                  className="absolute top-2 right-2 p-1.5 bg-red-600/90 hover:bg-red-500 text-white rounded-lg opacity-90 transition-opacity shadow"
                  title="Remove photo"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-1">
                <input
                  type="text"
                  value={photo.caption}
                  onChange={(e) => {
                    const updated = photos.map((p) =>
                      p.id === photo.id ? { ...p, caption: e.target.value } : p
                    );
                    onChange(updated);
                  }}
                  placeholder="Photo caption (e.g. Broken roof ridge shingle)"
                  className="w-full bg-gray-900 border border-gray-800 rounded-md px-2 py-1 text-[11px] text-gray-200 focus:outline-none focus:border-blue-500"
                />
                {photo.annotation && (
                  <div className="text-[10px] text-amber-400/90 font-mono italic">
                    Annotation: {photo.annotation}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Uploader Control */}
      <div className="p-4 bg-gray-950/60 border border-dashed border-gray-800 rounded-2xl space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <label className="w-full sm:w-auto px-4 py-2.5 bg-gray-900 hover:bg-gray-800 border border-gray-700 text-white text-xs font-semibold rounded-xl cursor-pointer flex items-center justify-center gap-2 transition-colors">
            <ImagePlus className="w-4 h-4 text-blue-400" />
            <span>Upload Device Photo</span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          <span className="text-[11px] text-gray-500 text-center sm:text-left">
            Supports direct mobile camera capture or photo gallery
          </span>
        </div>

        {/* Quick Sample Presets */}
        <div className="pt-2 border-t border-gray-800/80">
          <span className="text-[10px] text-gray-400 font-bold uppercase block mb-1.5">
            Or Click a Sample Inspection Photo:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {SAMPLE_PHOTO_CHOICES.map((sample, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleAddSample(sample)}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-300 hover:text-white flex items-center gap-1 transition-colors"
              >
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>+ {sample.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
