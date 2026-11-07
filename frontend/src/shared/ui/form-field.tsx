interface FormFieldProps extends React.ComponentPropsWithRef<"input"> {
  label: string;
  error?: string;
}

export function FormField({
  label,
  error,
  id,
  ref,
  className = "",
  "aria-describedby": describedBy,
  ...inputProps
}: FormFieldProps) {
  const fieldId = id ?? inputProps.name;
  const errorId = fieldId ? `${fieldId}-error` : undefined;
  return (
    <div className="m3-field">
      <label htmlFor={fieldId} className="m3-label">
        {label}
      </label>
      <input
        {...inputProps}
        ref={ref}
        id={fieldId}
        aria-invalid={error ? true : inputProps["aria-invalid"]}
        aria-describedby={
          [describedBy, error ? errorId : undefined]
            .filter(Boolean)
            .join(" ") || undefined
        }
        className={`m3-input ${className}`}
      />
      {error ? (
        <span id={errorId} role="alert" className="m3-support m3-field-error">
          {error}
        </span>
      ) : null}
    </div>
  );
}
