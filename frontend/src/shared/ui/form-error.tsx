interface FormErrorProps {
  children: string;
}

export function FormError({ children }: FormErrorProps) {
  return (
    <p role="alert" className="m3-message m3-message--error">
      {children}
    </p>
  );
}
