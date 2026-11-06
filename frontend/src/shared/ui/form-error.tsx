interface FormErrorProps {
  children: string;
}

export function FormError({ children }: FormErrorProps) {
  return (
    <p
      role="alert"
      className="border-l-4 border-red-700 bg-red-50 px-4 py-3 text-sm leading-5 text-red-800"
    >
      {children}
    </p>
  );
}
