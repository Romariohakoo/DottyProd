import Link from 'next/link';

interface TextLinkProps {
  href: string;
  children: string;
}

export function TextLink({
  href,
  children,
}: TextLinkProps) {
  return (
    <Link
      href={href}
      className="font-bold text-forest underline decoration-lime decoration-2 underline-offset-4 transition-colors hover:text-ink"
    >
      {children}
    </Link>
  );
}
