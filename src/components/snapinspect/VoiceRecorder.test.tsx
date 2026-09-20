import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { VoiceRecorder } from "./VoiceRecorder";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe("voice input integrity", () => {
  it("does not fabricate a defect when speech recognition is unavailable", () => {
    vi.stubGlobal("SpeechRecognition", undefined);
    vi.stubGlobal("webkitSpeechRecognition", undefined);
    const onTranscriptReady = vi.fn();
    render(<VoiceRecorder onTranscriptReady={onTranscriptReady} />);
    fireEvent.click(screen.getByRole("button", { name: "Start voice dictation" }));
    expect(screen.getByRole("alert").textContent).toContain("unavailable");
    expect(onTranscriptReady).not.toHaveBeenCalled();
  });

  it("does not substitute a sample when recording ends without speech", () => {
    class Recognition { start() {} stop() {} }
    vi.stubGlobal("SpeechRecognition", Recognition);
    const onTranscriptReady = vi.fn();
    render(<VoiceRecorder onTranscriptReady={onTranscriptReady} />);
    fireEvent.click(screen.getByRole("button", { name: "Start voice dictation" }));
    fireEvent.click(screen.getByRole("button", { name: "Finish voice dictation and parse defect" }));
    expect(screen.getByRole("alert").textContent).toContain("No speech was captured");
    expect(onTranscriptReady).not.toHaveBeenCalled();
  });
});
