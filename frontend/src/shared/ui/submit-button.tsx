'use client';

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
      className="mt-2 w-full cursor-pointer rounded-sm border border-ink bg-lime px-5 py-4 text-base font-bold tracking-[0.01em] text-forest shadow-hard transition-all enabled:hover:translate-x-1 enabled:hover:translate-y-1 enabled:hover:shadow-hard-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-forest disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
