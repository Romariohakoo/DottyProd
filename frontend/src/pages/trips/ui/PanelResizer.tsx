"use client";

import { useRef } from "react";

interface PanelResizerProps {
  width: number | null;
  onChange: (width: number | null) => void;
}

const MIN = 360;
const clamp = (value: number, container: number) =>
  Math.round(Math.min(Math.max(value, MIN), container * 0.7));

export function PanelResizer({ width, onChange }: PanelResizerProps) {
  const drag = useRef<{ startX: number; startWidth: number } | null>(null);

  const panelWidth = (element: HTMLElement) =>
    element.closest(".m3-plan")?.querySelector<HTMLElement>(".m3-plan-panel")
      ?.offsetWidth ?? MIN;
  const containerWidth = (element: HTMLElement) =>
    element.closest<HTMLElement>(".m3-plan")?.offsetWidth ?? 1200;

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Ширина плана"
      aria-valuenow={width ?? undefined}
      tabIndex={0}
      className="m3-plan-resizer"
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        drag.current = {
          startX: event.clientX,
          startWidth: panelWidth(event.currentTarget),
        };
        document.body.dataset.resizing = "true";
      }}
      onPointerMove={(event) => {
        if (!drag.current) return;
        onChange(
          clamp(
            drag.current.startWidth + event.clientX - drag.current.startX,
            containerWidth(event.currentTarget),
          ),
        );
      }}
      onPointerUp={(event) => {
        drag.current = null;
        delete document.body.dataset.resizing;
        if (event.currentTarget.hasPointerCapture(event.pointerId))
          event.currentTarget.releasePointerCapture(event.pointerId);
      }}
      onDoubleClick={() => onChange(null)}
      onKeyDown={(event) => {
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
        event.preventDefault();
        const current = width ?? panelWidth(event.currentTarget);
        onChange(
          clamp(
            current + (event.key === "ArrowLeft" ? -40 : 40),
            containerWidth(event.currentTarget),
          ),
        );
      }}
    >
      <span />
    </div>
  );
}
