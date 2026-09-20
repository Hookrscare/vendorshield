"use client";
import { useRef, useState } from "react";

export function DocumentSculpture({ count }: { count: number }) {
  const stage = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  return (
    <button
      ref={stage}
      type="button"
      className={`document-sculpture ${open ? "is-open" : ""}`}
      aria-label="Explore the layered directory illustration"
      aria-pressed={open}
      onClick={() => setOpen((value) => !value)}
      onPointerMove={(event) => {
        if (
          event.pointerType !== "mouse" ||
          window.matchMedia("(prefers-reduced-motion: reduce)").matches
        )
          return;
        const rect = event.currentTarget.getBoundingClientRect();
        stage.current?.style.setProperty(
          "--tilt-x",
          `${(event.clientY - rect.top - rect.height / 2) / 35}deg`,
        );
        stage.current?.style.setProperty(
          "--tilt-y",
          `${(event.clientX - rect.left - rect.width / 2) / 30}deg`,
        );
      }}
      onPointerLeave={() => {
        stage.current?.style.setProperty("--tilt-x", "0deg");
        stage.current?.style.setProperty("--tilt-y", "0deg");
      }}
    >
      <span className="document-orbit" aria-hidden="true" />
      <span className="document-object" aria-hidden="true">
        <span className="document-leaf leaf-back">
          <i /> <i /> <i />
        </span>
        <span className="document-leaf leaf-middle">
          <i /> <i /> <i />
        </span>
        <span className="document-leaf leaf-front">
          <span className="document-wordmark">V / S</span>
          <span className="document-rule" />
          <span className="document-title">
            The
            <br />
            vendor
            <br />
            <em>index.</em>
          </span>
          <span className="document-folio">
            {String(count).padStart(2, "0")} reference records
            <br />
            Eight disciplines
          </span>
          <span className="document-seal">↗</span>
        </span>
      </span>
      <span className="sculpture-caption">
        {open ? "Click to close the archive" : "Click to open the archive"}
        <span aria-hidden="true"> ↗</span>
      </span>
    </button>
  );
}
