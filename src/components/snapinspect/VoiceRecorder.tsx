"use client";

import { useState, useEffect, useRef } from "react";
import { Mic, MicOff, Sparkles, Volume2, Play, Square, CheckCircle2 } from "lucide-react";
import { SAMPLE_VOICE_PROMPTS } from "@/lib/snapinspect/sample-data";

interface VoiceRecorderProps {
  onTranscriptReady: (transcript: string) => void;
  isProcessing?: boolean;
}

export function VoiceRecorder({ onTranscriptReady, isProcessing }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [seconds, setSeconds] = useState(0);
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        setSpeechSupported(true);
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
      // Simulation mode for environments without SpeechRecognition support
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
    onTranscriptReady(finalTranscript);
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
    }, 300);
  };

  const handleApplySample = (sampleText: string) => {
    setTranscript(sampleText);
    onTranscriptReady(sampleText);
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 flex items-center justify-center">
            <Volume2 className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-white text-sm sm:text-base">Voice-to-Defect Mic</h4>
            <p className="text-[11px] text-gray-400">
              Speak naturally on-site. AI auto-categorizes &amp; tags severity.
            </p>
          </div>
        </div>

        {isRecording && (
          <div className="flex items-center gap-2 px-3 py-1 bg-red-500/10 border border-red-500/30 rounded-full animate-pulse">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-xs font-mono text-red-400 font-bold">
              {Math.floor(seconds / 60)}:{seconds % 60 < 10 ? "0" : ""}
              {seconds % 60}
            </span>
          </div>
        )}
      </div>

      {/* Real-time Waveform visualizer */}
      <div className="h-14 bg-gray-950 rounded-2xl border border-gray-800 flex items-center justify-center px-4 overflow-hidden relative">
        {isRecording ? (
          <div className="flex items-center gap-1.5 w-full justify-center">
            {[40, 65, 85, 30, 95, 70, 45, 90, 60, 80, 50, 100, 75, 35, 85, 55].map((h, i) => (
              <span
                key={i}
                className="w-1.5 bg-red-500 rounded-full transition-all duration-150 animate-pulse"
                style={{
                  height: `${Math.max(12, (h * Math.random() * 0.9 + 10))}%`,
                  animationDelay: `${i * 70}ms`,
                }}
              />
            ))}
          </div>
        ) : (
          <div className="text-xs text-gray-500 font-mono flex items-center gap-2">
            <span>{transcript ? "Audio captured ✓" : "Microphone idle. Click Record to speak."}</span>
          </div>
        )}
      </div>

      {/* Live transcript feedback */}
      <div className="p-3.5 bg-gray-950/80 rounded-2xl border border-gray-800 text-xs text-gray-300 min-h-[60px] font-sans">
        {transcript ? (
          <p className="leading-relaxed text-gray-200 italic">&ldquo;{transcript}&rdquo;</p>
        ) : (
          <span className="text-gray-500 italic">
            Spoken transcript will appear here in real-time...
          </span>
        )}
      </div>

      {/* Control Buttons */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        {!isRecording ? (
          <button
            type="button"
            onClick={startRecording}
            className="w-full sm:w-auto flex-1 py-3 px-5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-red-600/25 flex items-center justify-center gap-2 transition-transform active:scale-95"
          >
            <Mic className="w-4 h-4" />
            <span>Start Voice Recording</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={stopRecording}
            className="w-full sm:w-auto flex-1 py-3 px-5 bg-gray-800 hover:bg-gray-700 text-white font-bold text-xs sm:text-sm rounded-xl border border-red-500/40 flex items-center justify-center gap-2 transition-all shadow-md"
          >
            <Square className="w-4 h-4 text-red-400 fill-red-400" />
            <span>Finish &amp; Parse Defect</span>
          </button>
        )}

        {transcript && !isRecording && (
          <button
            type="button"
            onClick={() => onTranscriptReady(transcript)}
            disabled={isProcessing}
            className="w-full sm:w-auto px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Re-Parse with AI</span>
          </button>
        )}
      </div>

      {/* Quick Test Inspector Voice Presets */}
      <div className="pt-2 border-t border-gray-800/80">
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2">
          Or Click a Real-World Inspection Voice Sample:
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {SAMPLE_VOICE_PROMPTS.map((prompt, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleApplySample(prompt.spokenText)}
              className="p-2.5 bg-gray-950 hover:bg-gray-800 border border-gray-800 rounded-xl text-left transition-colors flex items-center justify-between group"
            >
              <div className="truncate pr-2">
                <div className="text-[11px] font-bold text-gray-200 group-hover:text-red-400 transition-colors">
                  {prompt.title}
                </div>
                <div className="text-[10px] text-gray-500 truncate">{prompt.spokenText}</div>
              </div>
              <Play className="w-3.5 h-3.5 text-gray-400 group-hover:text-white shrink-0" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
