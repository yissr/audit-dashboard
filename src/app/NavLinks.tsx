"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";

const topLinks = [
  { href: "/", label: "Dashboard" },
  { href: "/batches", label: "Batches" },
];

const contactsLinks = [
  { href: "/facilities", label: "Facilities" },
  { href: "/carriers", label: "Carriers" },
];

const adminLinks = [
  { href: "/periods", label: "Periods" },
];

interface Props {
  simEnabled: boolean;
}

function Dropdown({
  label,
  links,
  pathname,
}: {
  label: string;
  links: { href: string; label: string }[];
  pathname: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isActive = links.some(({ href }) => pathname.startsWith(href));

  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={`text-sm px-3 py-1.5 rounded transition-colors flex items-center gap-1 ${
          isActive
            ? "bg-white/20 text-white font-medium underline underline-offset-2"
            : "text-blue-100 hover:text-white hover:bg-white/10"
        }`}
      >
        {label}
        <span className="text-xs opacity-75">▾</span>
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 rounded shadow-lg overflow-hidden min-w-[140px] bg-[#1B2A4A] border border-white/10">
          {links.map(({ href, label: linkLabel }) => {
            const isLinkActive = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={`block text-sm px-4 py-2 transition-colors ${
                  isLinkActive
                    ? "bg-white/20 text-white font-medium"
                    : "text-blue-100 hover:text-white hover:bg-white/10"
                }`}
              >
                {linkLabel}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function NavLinks({ simEnabled }: Props) {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1">
      {topLinks.map(({ href, label }) => {
        const isActive =
          href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`text-sm px-3 py-1.5 rounded transition-colors ${
              isActive
                ? "bg-white/20 text-white font-medium underline underline-offset-2"
                : "text-blue-100 hover:text-white hover:bg-white/10"
            }`}
          >
            {label}
          </Link>
        );
      })}

      <Dropdown label="Contacts" links={contactsLinks} pathname={pathname} />
      <Dropdown label="Admin" links={adminLinks} pathname={pathname} />

      {simEnabled && (
        <Link
          href="/sim-inbox"
          className={`text-sm px-3 py-1.5 rounded transition-colors ${
            pathname.startsWith("/sim-inbox")
              ? "bg-white/20 text-white font-medium underline underline-offset-2"
              : "text-blue-100 hover:text-white hover:bg-white/10"
          }`}
        >
          ⚡ Sim Inbox
        </Link>
      )}
    </nav>
  );
}
