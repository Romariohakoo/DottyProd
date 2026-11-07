interface StatusMessageProps {
  children: React.ReactNode;
  loading?: boolean;
}

export function StatusMessage({
  children,
  loading = false,
}: StatusMessageProps) {
  return (
    <p role="status" className={`m3-message ${loading ? "m3-loading" : ""}`}>
      {children}
    </p>
  );
}
