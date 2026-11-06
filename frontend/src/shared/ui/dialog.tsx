'use client';

import { useEffect, useRef } from 'react';

interface DialogProps {
  children: React.ReactNode;
  isDismissable?: boolean;
  labelledBy: string;
  onClose: () => void;
}

export function Dialog({
  children,
  isDismissable = true,
  labelledBy,
  onClose,
}: DialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previouslyFocused =
      document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    const firstFocusable =
      dialog?.querySelector<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
    firstFocusable?.focus();

    const closeOnEscape = (event: KeyboardEvent) => {
      if (isDismissable && event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', closeOnEscape);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener(
        'keydown',
        closeOnEscape,
      );
      document.body.style.overflow = '';
      previouslyFocused?.focus();
    };
  }, [isDismissable, onClose]);

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto overscroll-contain bg-forest/45 p-3 sm:p-5"
      onPointerDown={(event) => {
        if (
          isDismissable &&
          event.target === event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className="max-h-[calc(100dvh-1.5rem)] w-fit min-w-0 max-w-[calc(100dvw-2.25rem)] overflow-x-auto overflow-y-auto overscroll-contain rounded-md border-2 border-forest bg-cream shadow-hard-lg sm:max-h-[calc(100dvh-2.5rem)] sm:max-w-[calc(100dvw-3.25rem)]"
      >
        {children}
      </div>
    </div>
  );
}
