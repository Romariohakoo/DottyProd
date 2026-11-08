"use client";

import { useEffect, useRef } from "react";

interface DialogProps {
  children: React.ReactNode;
  isDismissable?: boolean;
  size?: "default" | "medium" | "compact";
  labelledBy: string;
  onClose: () => void;
}

export function Dialog({
  children,
  isDismissable = true,
  size = "default",
  labelledBy,
  onClose,
}: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const backdropPointer = useRef(false);

  useEffect(() => {
    const previouslyFocused = document.activeElement;
    const dialog = dialogRef.current;
    const previousOverflow = document.body.style.overflow;
    dialog?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog?.close();
      document.body.style.overflow = previousOverflow;
      if (
        previouslyFocused instanceof HTMLElement &&
        previouslyFocused.isConnected
      )
        previouslyFocused.focus();
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={labelledBy}
      className={`m3-dialog ${size === "default" ? "" : `m3-dialog--${size}`}`}
      onCancel={(event) => {
        event.preventDefault();
        if (isDismissable) onClose();
      }}
      onPointerDown={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        backdropPointer.current =
          event.target === event.currentTarget &&
          (event.clientX < rect.left ||
            event.clientX > rect.right ||
            event.clientY < rect.top ||
            event.clientY > rect.bottom);
      }}
      onClick={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        if (
          isDismissable &&
          backdropPointer.current &&
          event.target === event.currentTarget &&
          (event.clientX < rect.left ||
            event.clientX > rect.right ||
            event.clientY < rect.top ||
            event.clientY > rect.bottom)
        )
          onClose();
        backdropPointer.current = false;
      }}
    >
      {children}
    </dialog>
  );
}
