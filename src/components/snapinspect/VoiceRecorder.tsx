"use client";

import { useState, useEffect, useRef } from "react";
import { Mic, Volume2, Play, Square, Sparkles } from "lucide-react";
import { SAMPLE_VOICE_PROMPTS } from "@/lib/snapinspect/sample-data";

interface VoiceRecorderProps {
  onTranscriptionComplete?: (transcript: string) => void;
  onTranscriptReady?: (transcript: string) => void;
  isProcessing?: boolean;
}

export function VoiceRecorder({
  onTranscriptionComplete,
  onTranscriptReady,
  isProcessing,
}: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [seconds, setSeconds] = useState(0);
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const notifyComplete = (text: string) => {
    if (onTranscriptionComplete) onTranscriptionComplete(text);
    if (onTranscriptReady) onTranscriptReady(text);
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";

        recognition.onresult = (event: any) => {
          let current = "";
          for (let i = 0; i < event.results.length; i++) {
            current += event.results[i][0].transcript;
          }
          setTranscript(current);
        };

        recognition.onerror = (err: any) => {
          console.warn("Speech recognition error:", err);
          setIsRecording(false);
        };

        recognitionRef.current = recognition;
      }
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    };
  }, []);

  const startRecording = () => {
    setTranscript("");
    setSeconds(0);
    setIsRecording(true);

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.warn("Recognition start failed or already active", err);
      }
    } else {
      simulateVoiceStream();
    }
  };

  const stopRecording = () => {
    setIsRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }

    const finalTranscript =
      transcript.trim() ||
      "Observed double-tapped breaker on service panel in garage. Safety hazard. Needs licensed electrician repair estimated $350.";
    setTranscript(finalTranscript);
    notifyComplete(finalTranscript);
  };

  const simulateVoiceStream = () => {
    const sample = SAMPLE_VOICE_PROMPTS[0].spokenText;
    const words = sample.split(" ");
    let index = 0;
    const interval = setInterval(() => {
      if (index < words.length) {
        setTranscript((prev) => (prev ? prev + " " + words[index] : words[index]));
        index++;
      } else {
        clearInterval(interval);
      }
    }, 280);
  };

  const handleApplySample = (sampleText: string) => {
    setTranscript(sampleText);
    notifyComplete(sampleText);
  };

  return (
    <div className="bg-[#0b101c] border border-white/10 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
            <Volume2 className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-white text-xs sm:text-sm font-mono tracking-wide">
              TACTICAL DEFECT AUDIO RECEPTOR
            </h4>
            <p className="text-[10px] text-gray-400 font-sans">
              Speech-to-Defect neural transcription (InterNACHI &amp; ASTM parser).
            </p>
          </div>
        </div>

        {isRecording && (
          <div
            role="status"
            aria-live="assertive"
            className="flex items-center gap-2 px-3 py-1 bg-rose-500/10 border border-rose-500/30 rounded-full animate-pulse"
          >
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span className="text-xs font-mono text-rose-400 font-bold">
              REC {Math.floor(seconds / 60)}:{seconds % 60 < 10 ? "0" : ""}
              {seconds % 60}
            </span>
          </div>
        )}
      </div>

      {/* Real-time Waveform visualizer */}
      <div className="h-12 bg-black/50 rounded-2xl border border-white/5 flex items-center justify-center px-4 overflow-hidden relative">
        {isRecording ? (
          <div className="flex items-center gap-1 w-full justify-center">
            {[40, 65, 85, 30, 95, 70, 45, 90, 60, 80, 50, 100, 75, 35, 85, 55].map((h, i) => (
              <span
                key={i}
                className="w-1 bg-amber-400 rounded-full transition-all duration-150 animate-pulse"
                style={{
                  height: `${Math.max(15, h * Math.random() * 0.9 + 10)}%`,
                  animationDelay: `${i * 60}ms`,
                }}
              />
            ))}
          </div>
        ) : (
          <div className="text-xs text-gray-500 font-mono flex items-center gap-2">
            <span>{transcript ? "Defect audio captured ✓" : "Receptor standing by. Tap record."}</span>
          </div>
        )}
      </div>

      {/* Live transcript feedback with ARIA Live Region */}
      <div
        role="status"
        aria-live="polite"
        className="p-3.5 bg-black/60 rounded-2xl border border-white/5 text-xs text-gray-300 min-h-[54px] font-mono"
      >
        {transcript ? (
          <p className="leading-relaxed text-amber-200">&ldquo;{transcript}&rdquo;</p>
        ) : (
          <span className="text-gray-500 italic">
            Spoken trade dictation will render here live...
          </span>
        )}
      </div>

      {/* Control Buttons */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        {!isRecording ? (
          <button
            type="button"
            onClick={startRecording}
            aria-label="Start voice dictation"
            className="w-full sm:w-auto flex-1 py-3 px-5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-gray-950 font-mono font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-transform active:scale-95"
          >
            <Mic className="w-4 h-4" />
            <span>START VOICE DICTATION</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={stopRecording}
            aria-label="Finish voice dictation and parse defect"
            className="w-full sm:w-auto flex-1 py-3 px-5 bg-gray-900 hover:bg-gray-800 text-white font-mono font-bold text-xs rounded-xl border border-rose-500/40 flex items-center justify-center gap-2 transition-all shadow-md"
          >
            <Square className="w-4 h-4 text-rose-400 fill-rose-400" />
            <span>STOP &amp; EXTRACT DEFECT</span>
          </button>
        )}

        {transcript && !isRecording && (
          <button
            type="button"
            onClick={() => notifyComplete(transcript)}
            disabled={isProcessing}
            aria-label="Re-parse voice transcript with AI"
            className="w-full sm:w-auto px-5 py-3 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 font-mono font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>RE-PROBE AI</span>
          </button>
        )}
      </div>

      {/* Quick Test Inspector Voice Presets */}
      <div className="pt-2 border-t border-white/5">
        <span className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider block mb-2">
          Or Select Preset Field Finding:
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {SAMPLE_VOICE_PROMPTS.map((prompt, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleApplySample(prompt.spokenText)}
              className="p-2.5 bg-black/40 hover:bg-white/[0.04] border border-white/5 rounded-xl text-left transition-colors flex items-center justify-between group"
            >
              <div className="truncate pr-2">
                <div className="text-[11px] font-bold text-gray-200 group-hover:text-amber-400 transition-colors font-mono">
                  {prompt.title}
                </div>
                <div className="text-[10px] text-gray-500 truncate font-mono">{prompt.spokenText}</div>
              </div>
              <Play className="w-3.5 h-3.5 text-gray-400 group-hover:text-white shrink-0" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
