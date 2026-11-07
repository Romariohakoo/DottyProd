import { Button } from "./button";

interface SubmitButtonProps {
  pending: boolean;
  disabled?: boolean;
  pendingLabel: string;
  children: string;
}

export function SubmitButton({
  pending,
  disabled = false,
  pendingLabel,
  children,
}: SubmitButtonProps) {
  return (
    <Button
      type="submit"
      disabled={pending || disabled}
      aria-busy={pending}
      className={`mt-2 w-full ${pending ? "m3-loading" : ""}`}
    >
      <span role={pending ? "status" : undefined}>
        {pending ? pendingLabel : children}
      </span>
    </Button>
  );
}
