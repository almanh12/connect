import Link from "next/link";
import { ChevronRight } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-[13px] font-normal text-[var(--gray-500)]">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && (
            <ChevronRight className="h-4 w-4 shrink-0 text-[var(--gray-300)]" />
          )}
          {item.href ? (
            <Link
              href={item.href}
              className="text-[var(--gray-500)] hover:text-[var(--deca-blue)] transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <span className="font-medium text-[var(--gray-900)]">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
