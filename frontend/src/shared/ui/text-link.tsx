import Link from "next/link";

interface TextLinkProps {
  href: string;
  children: string;
}

export function TextLink({ href, children }: TextLinkProps) {
  return (
    <Link href={href} className="m3-link">
      {children}
    </Link>
  );
}
