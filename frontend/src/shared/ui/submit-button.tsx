"use client";

interface SubmitButtonProps {
  pending: boolean;
  pendingLabel: string;
  children: string;
}

export function SubmitButton({
  pending,
  pendingLabel,
  children,
}: SubmitButtonProps) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-2 w-full cursor-pointer rounded-lg bg-accent px-5 py-3 text-base font-semibold text-foreground transition-colors enabled:hover:bg-accent/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
