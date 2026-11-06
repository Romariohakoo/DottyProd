interface FormErrorProps {
  children: string;
}

export function FormError({ children }: FormErrorProps) {
  return (
    <p
      role="alert"
      className="rounded-lg border border-muted/60 bg-muted/15 px-4 py-3 text-sm leading-5 text-foreground"
    >
      {children}
    </p>
  );
}
