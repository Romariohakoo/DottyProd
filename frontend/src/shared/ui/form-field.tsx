"use client";

interface FormFieldProps extends React.ComponentPropsWithRef<"input"> {
  label: string;
  error?: string;
}

export function FormField({
  label,
  error,
  id,
  ref,
  ...inputProps
}: FormFieldProps) {
  const fieldId = id ?? inputProps.name;
  const errorId = fieldId ? `${fieldId}-error` : undefined;

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <label htmlFor={fieldId} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <input
        ref={ref}
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className="w-full min-w-0 rounded-lg border border-muted/60 bg-background px-4 py-3 text-base text-foreground outline-none transition-colors placeholder:text-foreground/45 focus:border-accent focus:ring-2 focus:ring-accent/40 aria-invalid:border-muted aria-invalid:ring-2 aria-invalid:ring-muted/30"
        {...inputProps}
      />
      {error ? (
        <span id={errorId} role="alert" className="text-sm text-foreground/80">
          {error}
        </span>
      ) : null}
    </div>
  );
}
