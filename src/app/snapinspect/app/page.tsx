"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Camera,
  Mic,
  FileText,
  Plus,
  Trash2,
  Edit2,
  Download,
  Share2,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Wrench,
  Building2,
  Home,
  Layers,
  Sparkles,
  MapPin,
  Calendar,
  User,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import {
  InspectionData,
  DefectItem,
  InspectionTrade,
  DefectSeverity,
} from "@/lib/snapinspect/types";
import { TRADE_TEMPLATES } from "@/lib/snapinspect/templates";
import { INITIAL_INSPECTIONS } from "@/lib/snapinspect/sample-data";
import { DefectModal } from "@/components/snapinspect/DefectModal";
import { VoiceRecorder } from "@/components/snapinspect/VoiceRecorder";
import { parseInspectorVoiceTranscript } from "@/lib/snapinspect/voice-parser";
import { generateInspectionPdf } from "@/lib/snapinspect/pdf-generator";

export default function SnapInspectAppPage() {
  const [inspections, setInspections] = useState<InspectionData[]>(INITIAL_INSPECTIONS);
  const [activeInspectionId, setActiveInspectionId] = useState<string>(
    INITIAL_INSPECTIONS[0]?.id || "insp-2026-081"
  );
  const [activeTab, setActiveTab] = useState<"defects" | "setup" | "preview">("defects");
  const [selectedSeverityFilter, setSelectedSeverityFilter] = useState<string>("all");
  const [isDefectModalOpen, setIsDefectModalOpen] = useState(false);
  const [editingDefect, setEditingDefect] = useState<DefectItem | null>(null);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Load from localStorage if available
  useEffect(() => {
    try {
      const saved = localStorage.getItem("snapinspect_data_v1");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setInspections(parsed);
          setActiveInspectionId(parsed[0].id);
        }
      }
    } catch (e) {
      console.warn("Could not load from localStorage", e);
    }
  }, []);

  // Save to localStorage
  const saveInspections = (newInspections: InspectionData[]) => {
    setInspections(newInspections);
    try {
      localStorage.setItem("snapinspect_data_v1", JSON.stringify(newInspections));
    } catch (e) {}
  };

  const activeInspection =
    inspections.find((i) => i.id === activeInspectionId) || inspections[0];
  const activeTemplate =
    TRADE_TEMPLATES[activeInspection.trade] || TRADE_TEMPLATES.residential;

  // Handlers
  const handleUpdateInspection = (fields: Partial<InspectionData>) => {
    const updated = inspections.map((i) =>
      i.id === activeInspection.id
        ? { ...i, ...fields, updatedAt: new Date().toISOString() }
        : i
    );
    saveInspections(updated);
  };

  const handleSaveDefect = (defect: DefectItem) => {
    const existingIndex = activeInspection.defects.findIndex((d) => d.id === defect.id);
    let newDefects: DefectItem[];
    if (existingIndex >= 0) {
      newDefects = activeInspection.defects.map((d) => (d.id === defect.id ? defect : d));
    } else {
      newDefects = [defect, ...activeInspection.defects];
    }
    handleUpdateInspection({ defects: newDefects });
  };

  const handleDeleteDefect = (defectId: string) => {
    const newDefects = activeInspection.defects.filter((d) => d.id !== defectId);
    handleUpdateInspection({ defects: newDefects });
  };

  const handleVoiceQuickDefect = (transcript: string) => {
    const parsed = parseInspectorVoiceTranscript(transcript, activeInspection.trade);
    const newDefect: DefectItem = {
      id: `def-${Date.now()}`,
      title: parsed.title,
      category: parsed.category,
      severity: parsed.severity,
      location: parsed.location,
      description: parsed.description,
      actionRecommended: parsed.actionRecommended,
      estimatedCost: parsed.estimatedCost,
      photos: [],
      voiceTranscriptRaw: transcript,
      createdAt: new Date().toISOString(),
    };
    handleSaveDefect(newDefect);
    setShowVoiceRecorder(false);
  };

  const handleCreateNewInspection = () => {
    const newId = `insp-${Date.now().toString().slice(-6)}`;
    const newInspection: InspectionData = {
      id: newId,
      title: "New Property Inspection",
      trade: "residential",
      inspectorName: activeInspection.inspectorName || "Marcus Vance, CMI",
      inspectorCompany: activeInspection.inspectorCompany || "Apex Specialty Inspections LLC",
      inspectorLicense: activeInspection.inspectorLicense || "InterNACHI #240982-A",
      inspectorPhone: activeInspection.inspectorPhone || "(555) 392-8190",
      inspectorEmail: activeInspection.inspectorEmail || "marcus@apexinspections.com",
      clientName: "New Client",
      clientEmail: "client@example.com",
      clientPhone: "(555) 000-0000",
      propertyAddress: "100 Main St, Austin, TX",
      propertySquareFeet: 2400,
      yearBuilt: 2018,
      inspectionDate: new Date().toISOString().split("T")[0],
      weatherConditions: "72°F, Sunny, Dry",
      scopeOfInspection: TRADE_TEMPLATES.residential.defaultScope,
      overallCondition: "Good / Pass",
      executiveSummary: "Visual examination completed in accordance with standards.",
      defects: [],
      status: "draft",
      disclaimerAccepted: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const updated = [newInspection, ...inspections];
    saveInspections(updated);
    setActiveInspectionId(newId);
    setActiveTab("setup");
  };

  const handleExportPdf = () => {
    setIsGeneratingPdf(true);
    try {
      generateInspectionPdf(activeInspection);
    } catch (e) {
      console.error("PDF generation failed", e);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleCopyShareLink = () => {
    navigator.clipboard.writeText(
      window.location.origin + `/snapinspect/app?report=${activeInspection.id}`
    );
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Defect filtering
  const filteredDefects = activeInspection.defects.filter((d) => {
    if (selectedSeverityFilter === "all") return true;
    return d.severity === selectedSeverityFilter;
  });

  const urgentCount = activeInspection.defects.filter((d) => d.severity === "Urgent Repair").length;
  const safetyCount = activeInspection.defects.filter((d) => d.severity === "Safety Hazard").length;
  const moderateCount = activeInspection.defects.filter((d) => d.severity === "Moderate / Maintenance").length;
  const minorCount = activeInspection.defects.filter((d) => d.severity === "Minor / Cosmetic").length;

  return (
    <div className="bg-gray-950 text-gray-100 min-h-screen pb-20">
      {/* Mobile Top Bar & App Header */}
      <div className="sticky top-16 z-30 bg-gray-900/95 backdrop-blur-md border-b border-gray-800 px-4 sm:px-6 py-3">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          {/* Active Inspection Selector */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center text-white shrink-0 shadow-md">
              <Camera className="w-5 h-5" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <select
                  aria-label="Active inspection"
                  value={activeInspectionId}
                  onChange={(e) => setActiveInspectionId(e.target.value)}
                  className="min-w-0 flex-1 sm:flex-none bg-transparent text-sm sm:text-base font-bold text-white focus:outline-none cursor-pointer truncate sm:max-w-xs"
                >
                  {inspections.map((insp) => (
                    <option key={insp.id} value={insp.id} className="bg-gray-900 text-white">
                      {insp.title} ({insp.inspectionDate})
                    </option>
                  ))}
                </select>
                <span className="text-[10px] uppercase font-semibold bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full shrink-0">
                  {activeTemplate.badge}
                </span>
              </div>
              <p className="text-xs text-gray-400 truncate">{activeInspection.propertyAddress}</p>
            </div>
          </div>

          {/* Quick Actions Header */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            <button
              onClick={handleCreateNewInspection}
              className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-semibold rounded-xl border border-gray-700 flex items-center gap-1 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Job</span>
            </button>

            <button
              onClick={handleExportPdf}
              disabled={isGeneratingPdf}
              className="px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-red-600/30 flex items-center gap-1.5 transition-transform active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isGeneratingPdf ? "Building PDF..." : "Export Client PDF"}</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation Navigation Bar */}
        <div className="max-w-6xl mx-auto flex items-center gap-2 mt-3 pt-2 border-t border-gray-800/80">
          <button
            onClick={() => setActiveTab("defects")}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === "defects"
                ? "bg-red-600 text-white shadow-md shadow-red-600/20"
                : "text-gray-400 hover:text-white hover:bg-gray-800/60"
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Defect Register ({activeInspection.defects.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("setup")}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === "setup"
                ? "bg-red-600 text-white shadow-md shadow-red-600/20"
                : "text-gray-400 hover:text-white hover:bg-gray-800/60"
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Property &amp; Client Setup</span>
          </button>

          <button
            onClick={() => setActiveTab("preview")}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === "preview"
                ? "bg-red-600 text-white shadow-md shadow-red-600/20"
                : "text-gray-400 hover:text-white hover:bg-gray-800/60"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Report Overview &amp; Disclaimers</span>
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        {/* ================= TAB 1: DEFECT REGISTER ================= */}
        {activeTab === "defects" && (
          <div className="space-y-6">
            {/* Quick KPI Severity Summary Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <button
                onClick={() => setSelectedSeverityFilter(selectedSeverityFilter === "Urgent Repair" ? "all" : "Urgent Repair")}
                className={`p-3.5 rounded-2xl border text-left transition-all ${
                  selectedSeverityFilter === "Urgent Repair"
                    ? "bg-rose-950/50 border-rose-500 text-white ring-2 ring-rose-500/30"
                    : "bg-gray-900 border-gray-800 text-gray-400 hover:bg-gray-800/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-rose-400 uppercase">Urgent Repairs</span>
                  <Flame className="w-4 h-4 text-rose-400" />
                </div>
                <div className="text-2xl font-extrabold text-white mt-1">{urgentCount}</div>
              </button>

              <button
                onClick={() => setSelectedSeverityFilter(selectedSeverityFilter === "Safety Hazard" ? "all" : "Safety Hazard")}
                className={`p-3.5 rounded-2xl border text-left transition-all ${
                  selectedSeverityFilter === "Safety Hazard"
                    ? "bg-red-950/50 border-red-500 text-white ring-2 ring-red-500/30"
                    : "bg-gray-900 border-gray-800 text-gray-400 hover:bg-gray-800/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-red-400 uppercase">Safety Hazards</span>
                  <AlertTriangle className="w-4 h-4 text-red-400" />
                </div>
                <div className="text-2xl font-extrabold text-white mt-1">{safetyCount}</div>
              </button>

              <button
                onClick={() => setSelectedSeverityFilter(selectedSeverityFilter === "Moderate / Maintenance" ? "all" : "Moderate / Maintenance")}
                className={`p-3.5 rounded-2xl border text-left transition-all ${
                  selectedSeverityFilter === "Moderate / Maintenance"
                    ? "bg-amber-950/50 border-amber-500 text-white ring-2 ring-amber-500/30"
                    : "bg-gray-900 border-gray-800 text-gray-400 hover:bg-gray-800/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-amber-400 uppercase">Moderate</span>
                  <Wrench className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-2xl font-extrabold text-white mt-1">{moderateCount}</div>
              </button>

              <button
                onClick={() => setSelectedSeverityFilter(selectedSeverityFilter === "Minor / Cosmetic" ? "all" : "Minor / Cosmetic")}
                className={`p-3.5 rounded-2xl border text-left transition-all ${
                  selectedSeverityFilter === "Minor / Cosmetic"
                    ? "bg-blue-950/50 border-blue-500 text-white ring-2 ring-blue-500/30"
                    : "bg-gray-900 border-gray-800 text-gray-400 hover:bg-gray-800/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-blue-400 uppercase">Minor / Wear</span>
                  <CheckCircle2 className="w-4 h-4 text-blue-400" />
                </div>
                <div className="text-2xl font-extrabold text-white mt-1">{minorCount}</div>
              </button>
            </div>

            {/* Voice Dictation Drawer / Button */}
            <div className="bg-gray-900 border border-gray-800 rounded-3xl p-4 sm:p-6 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 flex items-center justify-center">
                    <Mic className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm sm:text-base">
                      On-Site Voice Dictation
                    </h3>
                    <p className="text-xs text-gray-400">
                      Speak defect details directly into your device to instantly create and categorize defects.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => setShowVoiceRecorder(!showVoiceRecorder)}
                    className="flex-1 sm:flex-none px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-md"
                  >
                    <Mic className="w-3.5 h-3.5" />
                    <span>{showVoiceRecorder ? "Close Mic" : "Open Voice Dictation"}</span>
                  </button>

                  <button
                    onClick={() => {
                      setEditingDefect(null);
                      setIsDefectModalOpen(true);
                    }}
                    className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-semibold rounded-xl border border-gray-700 flex items-center gap-1.5 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Manual Add</span>
                  </button>
                </div>
              </div>

              {showVoiceRecorder && (
                <div className="pt-2 animate-in fade-in duration-200">
                  <VoiceRecorder onTranscriptReady={handleVoiceQuickDefect} />
                </div>
              )}
            </div>

            {/* Filter pills & Count */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Filter Findings:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {["all", "Safety Hazard", "Urgent Repair", "Moderate / Maintenance", "Minor / Cosmetic"].map((f) => (
                    <button
                      key={f}
                      onClick={() => setSelectedSeverityFilter(f)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                        selectedSeverityFilter === f
                          ? "bg-white text-gray-950 font-bold"
                          : "bg-gray-900 border border-gray-800 text-gray-400 hover:text-white"
                      }`}
                    >
                      {f === "all" ? "All Severities" : f}
                    </button>
                  ))}
                </div>
              </div>

              <span className="text-xs text-gray-500">
                Showing {filteredDefects.length} of {activeInspection.defects.length} items
              </span>
            </div>

            {/* Defect Cards List */}
            {filteredDefects.length === 0 ? (
              <div className="p-12 text-center bg-gray-900/50 border border-dashed border-gray-800 rounded-3xl space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-gray-800 text-gray-500 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-white text-sm">No defect findings match this filter</h4>
                <p className="text-xs text-gray-400 max-w-sm mx-auto">
                  Click &ldquo;Open Voice Dictation&rdquo; above or &ldquo;Manual Add&rdquo; to log your first field observation.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredDefects.map((defect, index) => {
                  const isSafety = defect.severity === "Safety Hazard";
                  const isUrgent = defect.severity === "Urgent Repair";
                  const isModerate = defect.severity === "Moderate / Maintenance";

                  const badgeClass = isSafety || isUrgent
                    ? "bg-red-500/10 text-red-400 border-red-500/20"
                    : isModerate
                    ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                    : "bg-blue-500/10 text-blue-400 border-blue-500/20";

                  return (
                    <div
                      key={defect.id}
                      className="bg-gray-900 border border-gray-800 rounded-3xl p-5 sm:p-6 space-y-4 shadow-lg hover:border-gray-700 transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-gray-800/80 pb-3">
                        <div className="flex items-center gap-2.5">
                          <span className="w-6 h-6 rounded-lg bg-gray-800 text-gray-300 text-xs font-mono font-bold flex items-center justify-center">
                            #{index + 1}
                          </span>
                          <span className="text-xs font-semibold text-blue-400">
                            {defect.category}
                          </span>
                          <span className="text-gray-600">•</span>
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-emerald-400" />
                            {defect.location}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${badgeClass}`}
                          >
                            {defect.severity}
                          </span>

                          <button
                            onClick={() => {
                              setEditingDefect(defect);
                              setIsDefectModalOpen(true);
                            }}
                            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                            title="Edit defect"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDeleteDefect(defect.id)}
                            className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-800 rounded-lg transition-colors"
                            title="Delete defect"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Defect Title & Description */}
                      <div className="space-y-1.5">
                        <h4 className="font-extrabold text-white text-base sm:text-lg">
                          {defect.title}
                        </h4>
                        <p className="text-xs sm:text-sm text-gray-300 leading-relaxed font-sans">
                          {defect.description}
                        </p>
                      </div>

                      {/* Contractor Recommendation & Estimated Cost */}
                      <div className="p-3.5 bg-gray-950 rounded-2xl border border-gray-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                        <div className="space-y-0.5">
                          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                            Recommended Action:
                          </span>
                          <p className="text-gray-300 font-medium">{defect.actionRecommended}</p>
                        </div>

                        {defect.estimatedCost && (
                          <div className="sm:text-right shrink-0">
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                              Est. Repair Cost:
                            </span>
                            <div className="font-mono font-bold text-amber-400 text-sm">
                              {defect.estimatedCost}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Photo Gallery preview if any */}
                      {defect.photos.length > 0 && (
                        <div className="pt-2 space-y-2">
                          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                            <Camera className="w-3 h-3 text-blue-400" />
                            Attached Photos ({defect.photos.length})
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {defect.photos.map((ph) => (
                              <div
                                key={ph.id}
                                className="bg-gray-950 rounded-xl border border-gray-800 p-2 space-y-1.5"
                              >
                                <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden flex items-center justify-center">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={ph.url}
                                    alt={ph.caption}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <div className="text-[11px] text-gray-300 font-medium truncate">
                                  {ph.caption}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 2: PROPERTY SETUP ================= */}
        {activeTab === "setup" && (
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
            <div>
              <h3 className="text-xl font-bold text-white">Inspection Job &amp; Client Details</h3>
              <p className="text-xs text-gray-400">
                Configure property parameters, client contact info, and industry compliance standard.
              </p>
            </div>

            {/* Trade Selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                Inspection Trade &amp; Compliance Standard
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {Object.values(TRADE_TEMPLATES).map((tmpl) => {
                  const isSelected = activeInspection.trade === tmpl.id;
                  return (
                    <button
                      key={tmpl.id}
                      type="button"
                      onClick={() =>
                        handleUpdateInspection({
                          trade: tmpl.id,
                          scopeOfInspection: tmpl.defaultScope,
                        })
                      }
                      className={`p-4 rounded-2xl border text-left transition-all ${
                        isSelected
                          ? "bg-red-950/30 border-red-500 ring-2 ring-red-500/30 text-white"
                          : "bg-gray-950 border-gray-800 text-gray-400 hover:bg-gray-800/40"
                      }`}
                    >
                      <div className="font-bold text-sm text-white">{tmpl.name}</div>
                      <div className="text-[11px] text-red-400 font-mono mt-0.5">{tmpl.standard}</div>
                      <p className="text-[11px] text-gray-400 mt-2 leading-relaxed">
                        {tmpl.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Inspection Title & Address */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                  Report Title
                </label>
                <input
                  type="text"
                  value={activeInspection.title}
                  onChange={(e) => handleUpdateInspection({ title: e.target.value })}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                  Property Street Address
                </label>
                <input
                  type="text"
                  value={activeInspection.propertyAddress}
                  onChange={(e) => handleUpdateInspection({ propertyAddress: e.target.value })}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-red-500"
                />
              </div>
            </div>

            {/* Client Info */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                  Client Name(s)
                </label>
                <input
                  type="text"
                  value={activeInspection.clientName}
                  onChange={(e) => handleUpdateInspection({ clientName: e.target.value })}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                  Client Email Address
                </label>
                <input
                  type="email"
                  value={activeInspection.clientEmail}
                  onChange={(e) => handleUpdateInspection({ clientEmail: e.target.value })}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                  Inspection Date
                </label>
                <input
                  type="date"
                  value={activeInspection.inspectionDate}
                  onChange={(e) => handleUpdateInspection({ inspectionDate: e.target.value })}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-red-500"
                />
              </div>
            </div>

            {/* Inspector Credentials */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-gray-800">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                  Inspector Name &amp; Credential
                </label>
                <input
                  type="text"
                  value={activeInspection.inspectorName}
                  onChange={(e) => handleUpdateInspection({ inspectorName: e.target.value })}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                  Company Name
                </label>
                <input
                  type="text"
                  value={activeInspection.inspectorCompany}
                  onChange={(e) => handleUpdateInspection({ inspectorCompany: e.target.value })}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                  State License / InterNACHI ID
                </label>
                <input
                  type="text"
                  value={activeInspection.inspectorLicense}
                  onChange={(e) => handleUpdateInspection({ inspectorLicense: e.target.value })}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-red-500"
                />
              </div>
            </div>

            {/* Scope & Weather */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                Weather &amp; Environmental Conditions
              </label>
              <input
                type="text"
                value={activeInspection.weatherConditions}
                onChange={(e) => handleUpdateInspection({ weatherConditions: e.target.value })}
                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-red-500"
              />
            </div>
          </div>
        )}

        {/* ================= TAB 3: REPORT PREVIEW & DISCLAIMERS ================= */}
        {activeTab === "preview" && (
          <div className="space-y-6">
            {/* Header Banner & PDF Download bar */}
            <div className="bg-gradient-to-r from-red-950/40 via-gray-900 to-gray-900 border-2 border-red-500/40 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xl">
              <div>
                <span className="text-xs uppercase font-bold text-red-400 tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Client Deliverable Ready
                </span>
                <h3 className="text-2xl font-extrabold text-white mt-1">
                  {activeInspection.title}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {activeInspection.propertyAddress} • {activeInspection.defects.length} defect items logged
                </p>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  onClick={handleCopyShareLink}
                  className="flex-1 sm:flex-none px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-bold rounded-xl border border-gray-700 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Share2 className="w-4 h-4" />
                  <span>{copiedLink ? "Link Copied! ✓" : "Copy Client Link"}</span>
                </button>

                <button
                  onClick={handleExportPdf}
                  disabled={isGeneratingPdf}
                  className="flex-1 sm:flex-none px-6 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-red-600/30 flex items-center justify-center gap-1.5 transition-transform active:scale-95"
                >
                  <Download className="w-4 h-4" />
                  <span>{isGeneratingPdf ? "Generating..." : "Download Official PDF"}</span>
                </button>
              </div>
            </div>

            {/* Executive Summary editor */}
            <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 space-y-3">
              <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                Executive Condition Summary (Included on PDF Page 1)
              </label>
              <textarea
                rows={3}
                value={activeInspection.executiveSummary}
                onChange={(e) => handleUpdateInspection({ executiveSummary: e.target.value })}
                className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-red-500 leading-relaxed font-sans"
              />
            </div>

            {/* Legal Disclaimer Box */}
            <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 space-y-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <h4 className="font-bold text-white text-sm">
                  Limitation of Liability &amp; InterNACHI Disclaimer
                </h4>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed italic bg-gray-950 p-4 rounded-xl border border-gray-800">
                &ldquo;{activeTemplate.disclaimer}&rdquo;
              </p>
              <div className="flex items-center gap-2 text-xs text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  Inspector Sign-off verified for {activeInspection.inspectorName} ({activeInspection.inspectorCompany})
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Defect Modal */}
      <DefectModal
        isOpen={isDefectModalOpen}
        onClose={() => {
          setIsDefectModalOpen(false);
          setEditingDefect(null);
        }}
        onSave={handleSaveDefect}
        initialDefect={editingDefect}
        trade={activeInspection.trade}
      />
    </div>
  );
}
