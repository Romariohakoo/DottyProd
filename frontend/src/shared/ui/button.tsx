interface ButtonProps extends React.ComponentPropsWithRef<"button"> {
  variant?:
    "filled" | "tonal" | "outlined" | "text" | "danger" | "card" | "nav";
}

export function Button({
  variant = "filled",
  className = "",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`m3-button m3-button--${variant} ${className}`}
      {...props}
    />
  );
}
