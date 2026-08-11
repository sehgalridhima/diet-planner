"use client";

import type { SectionId } from "@/components/PlanView";

/* ===============================================================
   SECTION NAV
   ===============================================================
   One nav, used by the anonymous page and the signed-in one.

   The first version was a column of grey text. It did not read as
   navigation at all: no container, no icons, and inactive items so
   faint they looked disabled. This version gives it a panel to sit
   in, an icon per section so the eye can scan rather than read, and
   an inactive state you can actually see.

   Counts sit in a pill rather than in a monospace font. "7 days" set
   in mono looked like debug output, not like a product.
   =============================================================== */

export type NavItem = { id: SectionId; label: string; hint: string };

/** Simple stroked glyphs — enough to scan by, no icon dependency. */
export function Icon({ id, className }: { id: SectionId; className?: string }) {
  const common = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  switch (id) {
    case "form":
      return (
        <svg {...common}>
          <path d="M20 21a8 8 0 0 0-16 0" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      );
    case "numbers":
      return (
        <svg {...common}>
          <path d="M3 3v18h18" />
          <path d="M7 15l4-5 3 3 4-6" />
        </svg>
      );
    case "diet":
      return (
        <svg {...common}>
          <path d="M4 3v8a3 3 0 0 0 6 0V3" />
          <path d="M7 11v10" />
          <path d="M17 3c-1.5 2-2 4-2 6s.5 3 2 3 2-1 2-3-.5-4-2-6z" />
          <path d="M17 12v9" />
        </svg>
      );
    case "shopping":
      return (
        <svg {...common}>
          <circle cx="9" cy="20" r="1.4" />
          <circle cx="18" cy="20" r="1.4" />
          <path d="M2 3h3l2.6 12.4a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.6L21 7H6" />
        </svg>
      );
    case "training":
      return (
        <svg {...common}>
          <path d="M6.5 6.5v11M17.5 6.5v11" />
          <path d="M3 9.5v5M21 9.5v5" />
          <path d="M6.5 12h11" />
        </svg>
      );
    case "notes":
      return (
        <svg {...common}>
          <path d="M9 3h9a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8z" />
          <path d="M8 12h8M8 16h5" />
        </svg>
      );
    case "recipes":
      return (
        <svg {...common}>
          <path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z" />
          <path d="M8 7h7M8 11h7" />
        </svg>
      );
  }
}

export default function SectionNav({
  items,
  section,
  onSelect,
  footnote,
}: {
  items: NavItem[];
  section: SectionId;
  onSelect: (id: SectionId) => void;
  /** Shown under the list before a plan exists */
  footnote?: string;
}) {
  return (
    <nav aria-label="Sections" className="sm:w-56 sm:shrink-0">
      <div className="sm:sticky sm:top-6">
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:flex-col sm:gap-0.5 sm:overflow-visible sm:rounded-2xl sm:border sm:border-border sm:bg-surface/60 sm:p-2 sm:px-2 sm:pb-2">
          {items.map((item) => {
            const active = section === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelect(item.id)}
                aria-current={active ? "page" : undefined}
                className={`group flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-xl px-3 py-2.5 text-left text-sm transition-colors sm:w-full ${
                  active
                    ? "bg-accent text-accent-contrast"
                    : "text-foreground/75 hover:bg-surface-2 hover:text-foreground"
                }`}
              >
                <Icon
                  id={item.id}
                  className={`h-[1.05rem] w-[1.05rem] shrink-0 ${
                    active ? "opacity-90" : "opacity-55 group-hover:opacity-80"
                  }`}
                />
                <span className={active ? "font-medium" : ""}>{item.label}</span>
                <span
                  className={`ml-auto hidden rounded-full px-1.5 py-0.5 text-[0.68rem] leading-none sm:inline ${
                    active ? "bg-accent-contrast/15" : "bg-surface-2 text-muted"
                  }`}
                >
                  {item.hint}
                </span>
              </button>
            );
          })}
        </div>

        {footnote && (
          <p className="mt-3 hidden px-2 text-xs leading-relaxed text-muted sm:block">
            {footnote}
          </p>
        )}
      </div>
    </nav>
  );
}
