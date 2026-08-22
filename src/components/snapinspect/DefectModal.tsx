"use client";

import { useState } from "react";
import { DefectItem, DefectSeverity } from "@/lib/snapinspect/types";
import { TRADE_TEMPLATES } from "@/lib/snapinspect/templates";
import { parseInspectorVoiceTranscript } from "@/lib/snapinspect/voice-parser";
import { PhotoUpload } from "./PhotoUpload";
import { VoiceRecorder } from "./VoiceRecorder";
import {
  X,
  AlertTriangle,
  Flame,
  Wrench,
  CheckCircle2,
  Mic,
  DollarSign,
  MapPin,
  Tag,
  Sparkles,
} from "lucide-react";

interface DefectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (defect: DefectItem) => void;
  initialDefect?: DefectItem | null;
  trade?: string;
}

export function DefectModal({
  isOpen,
  onClose,
  onSave,
  initialDefect,
  trade = "residential",
}: DefectModalProps) {
  const currentTemplate = TRADE_TEMPLATES[trade] || TRADE_TEMPLATES.residential;

  const [title, setTitle] = useState(initialDefect?.title || "");
  const [category, setCategory] = useState(
    initialDefect?.category || currentTemplate.defaultCategories[0] || "General"
  );
  const [severity, setSeverity] = useState<DefectSeverity>(
    initialDefect?.severity || "Moderate / Maintenance"
  );
  const [location, setLocation] = useState(initialDefect?.location || "");
  const [description, setDescription] = useState(initialDefect?.description || "");
  const [actionRecommended, setActionRecommended] = useState(
    initialDefect?.actionRecommended || ""
  );
  const [estimatedCost, setEstimatedCost] = useState(initialDefect?.estimatedCost || "");
  const [photos, setPhotos] = useState(initialDefect?.photos || []);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);

  if (!isOpen) return null;

  const handleVoiceTranscript = (transcript: string) => {
    const parsed = parseInspectorVoiceTranscript(transcript, trade);
    setTitle(parsed.title);
    setCategory(parsed.category);
    setSeverity(parsed.severity);
    setLocation(parsed.location);
    setDescription(parsed.description);
    setActionRecommended(parsed.actionRecommended);
    setEstimatedCost(parsed.estimatedCost);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    const newDefect: DefectItem = {
      id: initialDefect?.id || `def-${Date.now()}`,
      title: title.trim(),
      category,
      severity,
      location: location.trim() || "Main Structure",
      description: description.trim(),
      actionRecommended:
        actionRecommended.trim() || "Recommend evaluation by licensed trade specialist.",
      estimatedCost: estimatedCost.trim() || "TBD",
      photos,
      createdAt: initialDefect?.createdAt || new Date().toISOString(),
    };

    onSave(newDefect);
    onClose();
  };

  const severityConfigs: Record<
    DefectSeverity,
    { label: string; bg: string; text: string; border: string; icon: any }
  > = {
    "Safety Hazard": {
      label: "Safety Hazard",
      bg: "bg-red-500/10",
      text: "text-red-400",
      border: "border-red-500/30",
      icon: AlertTriangle,
    },
    "Urgent Repair": {
      label: "Urgent Repair",
      bg: "bg-rose-500/10",
      text: "text-rose-400",
      border: "border-rose-500/30",
      icon: Flame,
    },
    "Moderate / Maintenance": {
      label: "Moderate / Maintenance",
      bg: "bg-amber-500/10",
      text: "text-amber-400",
      border: "border-amber-500/30",
      icon: Wrench,
    },
    "Minor / Cosmetic": {
      label: "Minor / Cosmetic",
      bg: "bg-blue-500/10",
      text: "text-blue-400",
      border: "border-blue-500/30",
      icon: CheckCircle2,
    },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-gray-900 border border-gray-800 rounded-3xl w-full max-w-2xl my-8 overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-gray-800 flex items-center justify-between bg-gray-950/60 sticky top-0 z-10">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <span>{initialDefect ? "Edit Defect Finding" : "Log Inspection Defect"}</span>
              <span className="text-xs font-semibold px-2 py-0.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-full">
                AI Voice Enabled
              </span>
            </h3>
            <p className="text-xs text-gray-400">
              Template: {currentTemplate.name} ({currentTemplate.standard})
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Toggle Voice Dictation Card */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                <Mic className="w-3.5 h-3.5 text-red-400" />
                Speech Dictation &amp; Auto-Parser
              </span>
              <button
                type="button"
                onClick={() => setShowVoiceRecorder(!showVoiceRecorder)}
                className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
              >
                {showVoiceRecorder ? "Hide Mic" : "Open Mic & Speak Observation"}
              </button>
            </div>

            {showVoiceRecorder && (
              <VoiceRecorder onTranscriptReady={handleVoiceTranscript} />
            )}
          </div>

          {/* Severity Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">
              Severity Tier <span className="text-red-400">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(
                [
                  "Safety Hazard",
                  "Urgent Repair",
                  "Moderate / Maintenance",
                  "Minor / Cosmetic",
                ] as DefectSeverity[]
              ).map((sev) => {
                const config = severityConfigs[sev];
                const Icon = config.icon;
                const isSelected = severity === sev;
                return (
                  <button
                    key={sev}
                    type="button"
                    onClick={() => setSeverity(sev)}
                    className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                      isSelected
                        ? `${config.bg} ${config.border} ring-2 ring-blue-500/50`
                        : "bg-gray-950/60 border-gray-800 hover:bg-gray-800/40 text-gray-400"
                    }`}
                  >
                    <Icon className={`w-4 h-4 mb-1.5 ${isSelected ? config.text : "text-gray-500"}`} />
                    <span
                      className={`text-xs font-bold ${
                        isSelected ? "text-white" : "text-gray-400"
                      }`}
                    >
                      {config.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title & Category Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-blue-400" />
                Defect Title <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Double Tapped 30A Breaker"
                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                System Category <span className="text-red-400">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
              >
                {currentTemplate.defaultCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
                <option value="Other Finding">Other Finding</option>
              </select>
            </div>
          </div>

          {/* Location & Estimated Cost Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                Physical Location
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Garage North Wall / Attic Southwest"
                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-amber-400" />
                Estimated Repair Range
              </label>
              <input
                type="text"
                value={estimatedCost}
                onChange={(e) => setEstimatedCost(e.target.value)}
                placeholder="e.g. $350 - $600"
                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">
              Detailed Observation Notes <span className="text-red-400">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe exact physical condition, wear, or code violation observed..."
              className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-blue-500 leading-relaxed font-sans"
            />
          </div>

          {/* Action Recommended */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">
              Recommended Contractor Action
            </label>
            <input
              type="text"
              value={actionRecommended}
              onChange={(e) => setActionRecommended(e.target.value)}
              placeholder="e.g. Have a licensed Master Electrician evaluate and repair circuit..."
              className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Photo Upload & Gallery */}
          <PhotoUpload photos={photos} onChange={setPhotos} />

          {/* Actions */}
          <div className="pt-4 border-t border-gray-800 flex items-center justify-end gap-3 sticky bottom-0 bg-gray-900 pb-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold text-xs rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/30 transition-all hover:scale-[1.02] flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4" />
              <span>{initialDefect ? "Update Defect" : "Save to Inspection"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
