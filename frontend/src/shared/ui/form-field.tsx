'use client';

interface FormFieldProps extends React.ComponentPropsWithRef<'input'> {
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
    <div className="flex flex-col gap-2">
      <label
        htmlFor={fieldId}
        className="text-sm font-semibold tracking-[0.01em] text-forest"
      >
        {label}
      </label>
      <input
        ref={ref}
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className="w-full rounded-sm border border-ink bg-white px-4 py-3 text-base text-ink placeholder:text-ink/45 focus:bg-cream focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-forest"
        {...inputProps}
      />
      {error ? (
        <span
          id={errorId}
          role="alert"
          className="text-sm text-red-700"
        >
          {error}
        </span>
      ) : null}
    </div>
  );
}
