"use client";

import { useEffect, useRef } from "react";

import { Monogram } from "@/components/brand/Monogram";
import { NavLinks } from "@/components/layout/NavLinks";

// Matches Tailwind's `md` breakpoint (768px), where the sidebar takes over.
const DESKTOP_QUERY = "(min-width: 48rem)";

const iconButtonClass =
  "inline-flex size-11 shrink-0 items-center justify-center rounded-control text-text hover:bg-accent-tint focus-visible:outline-2 focus-visible:outline-accent";

/**
 * Menu button and slide-in drawer for screens below 768px. Built on the native
 * <dialog>, which provides focus trapping, Esc to close and the backdrop.
 */
export function MobileNav() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const close = () => dialogRef.current?.close();

  // The drawer is hidden from 768px up, so close it if the window grows past
  // that; otherwise an invisible modal would block the page.
  useEffect(() => {
    const query = window.matchMedia(DESKTOP_QUERY);
    const onChange = (event: MediaQueryListEvent) => {
      if (event.matches) {
        dialogRef.current?.close();
      }
    };
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return (
    <>
      <button
        type="button"
        aria-label="Open menu"
        aria-haspopup="dialog"
        onClick={() => dialogRef.current?.showModal()}
        className={`${iconButtonClass} -ml-2 md:hidden`}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          className="size-6"
        >
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>

      <dialog
        ref={dialogRef}
        aria-label="Menu"
        // A click on the dialog element itself (not its content) is a click on the backdrop.
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            close();
          }
        }}
        className="m-0 h-dvh max-h-none w-72 max-w-[85vw] border-r border-border bg-surface p-0 text-text backdrop:bg-text/40 md:hidden"
      >
        <div className="flex h-full flex-col">
          <div className="flex h-16 shrink-0 items-center gap-3 border-b border-border px-4">
            <Monogram />
            <span className="font-display font-medium">KaLi&apos;s era</span>
            <button
              type="button"
              aria-label="Close menu"
              onClick={close}
              className={`${iconButtonClass} -mr-2 ml-auto`}
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                className="size-6"
              >
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
          <div className="flex flex-1 flex-col overflow-y-auto pt-4">
            <NavLinks onNavigate={close} />
          </div>
        </div>
      </dialog>
    </>
  );
}
