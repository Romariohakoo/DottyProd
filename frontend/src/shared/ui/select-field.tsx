interface SelectFieldProps extends React.ComponentPropsWithRef<"select"> {
  label: string;
  error?: string;
}

export function SelectField({
  label,
  error,
  id,
  ref,
  children,
  className = "",
  "aria-describedby": describedBy,
  ...props
}: SelectFieldProps) {
  const fieldId = id ?? props.name;
  const errorId = fieldId ? `${fieldId}-error` : undefined;
  return (
    <div className="m3-field">
      <label htmlFor={fieldId} className="m3-label">
        {label}
      </label>
      <select
        {...props}
        ref={ref}
        id={fieldId}
        aria-invalid={error ? true : props["aria-invalid"]}
        aria-describedby={
          [describedBy, error ? errorId : undefined]
            .filter(Boolean)
            .join(" ") || undefined
        }
        className={`m3-input ${className}`}
      >
        {children}
      </select>
      {error ? (
        <span id={errorId} role="alert" className="m3-support m3-field-error">
          {error}
        </span>
      ) : null}
    </div>
  );
}
