"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { signOutAction } from "@/app/actions";

/* ===============================================================
   ACCOUNT MENU
   ===============================================================
   Which account you are signed in as, said out loud.

   The header used to say only "Your plan", which tells you that
   somebody is signed in but not who — and on an app where the plan
   is built from your own weight and goal, signing in as the wrong
   account is a thing you would want to notice immediately rather
   than after reading a week of somebody else's food.

   The initial is drawn from the address rather than fetching the
   Google picture: it needs no remote image, no domain allow-list,
   and it cannot leave someone looking at a broken avatar while the
   thing it is meant to confirm is exactly that they are logged in.
   =============================================================== */

export default function AccountMenu({ email }: { email: string }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Click anywhere else, or press Escape, and it closes — the two ways
  // people expect to dismiss a menu they opened by accident.
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full border border-border bg-surface py-1 pl-1 pr-1 text-sm transition-colors hover:border-accent/50 sm:pr-3"
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold uppercase text-accent-contrast">
          {email.charAt(0)}
        </span>
        {/* The address itself is the point, but it is too long for a
            phone header — there it is the initial alone, and the full
            address waits inside the menu. */}
        <span className="hidden max-w-[14rem] truncate text-muted sm:inline">{email}</span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-border bg-surface shadow-lg"
        >
          <div className="border-b border-border px-4 py-3">
            <p className="text-xs text-muted">Signed in as</p>
            <p className="mt-0.5 truncate text-sm font-medium" title={email}>
              {email}
            </p>
          </div>

          <Link
            href="/today"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block px-4 py-2.5 text-sm transition-colors hover:bg-surface-2"
          >
            Your plan
          </Link>
          <Link
            href="/profile"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block px-4 py-2.5 text-sm transition-colors hover:bg-surface-2"
          >
            Your details
          </Link>

          <form action={signOutAction} className="border-t border-border">
            <button
              type="submit"
              role="menuitem"
              className="w-full px-4 py-2.5 text-left text-sm text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
            >
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
