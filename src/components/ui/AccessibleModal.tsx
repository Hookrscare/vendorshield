"use client";

import React, { useEffect, useId, useRef } from "react";

interface AccessibleModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export function AccessibleModal({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = "max-w-lg",
}: AccessibleModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    if (!isOpen) return;

    // Save previous active element
    previousFocusRef.current = document.activeElement as HTMLElement;

    // Focus first interactive element within dialog
    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusable?.[0];
    const lastElement = focusable?.[focusable.length - 1];

    firstElement?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }

      if (e.key === "Tab" && focusable && focusable.length > 0) {
        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
      previousFocusRef.current?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md transition-opacity duration-300"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className={`w-full ${maxWidth} bg-[#0a0f1d] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/80 space-y-5 animate-in fade-in zoom-in-95 duration-200`}
      >
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <h2
            id={titleId}
            className="text-lg font-bold text-white font-display tracking-wide"
          >
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors focus-visible:outline-2 focus-visible:outline-blue-500"
          >
            ✕
          </button>
        </div>
        <div className="text-gray-300">{children}</div>
      </div>
    </div>
  );
}
