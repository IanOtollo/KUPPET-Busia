import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface BackLinkProps {
  href: string;
  label: string;
}

/** Standalone top-left back-navigation link, used above PageHeader on sub-pages. */
export function BackLink({ href, label }: BackLinkProps) {
  return (
    <Link
      href={href}
      className="mb-4 inline-flex items-center gap-1.5 text-[15px] font-medium text-[var(--ink-muted)] hover:text-[var(--union)] transition-colors"
    >
      <ArrowLeft className="h-4 w-4" />
      {label}
    </Link>
  );
}
