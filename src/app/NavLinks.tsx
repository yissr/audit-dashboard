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
  { href: "/periods", label: "Periods" },
];

interface Props {
  simEnabled: boolean;
}

export default function NavLinks({ simEnabled }: Props) {
  const pathname = usePathname();
  const [contactsOpen, setContactsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const contactsActive = contactsLinks.some(({ href }) =>
    pathname.startsWith(href)
  );

  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setContactsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, []);

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

      {/* Contacts dropdown */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setContactsOpen((o) => !o)}
          className={`text-sm px-3 py-1.5 rounded transition-colors flex items-center gap-1 ${
            contactsActive
              ? "bg-white/20 text-white font-medium underline underline-offset-2"
              : "text-blue-100 hover:text-white hover:bg-white/10"
          }`}
        >
          Contacts
          <span className="text-xs opacity-75">▾</span>
        </button>

        {contactsOpen && (
          <div className="absolute left-0 top-full mt-1 z-50 rounded shadow-lg overflow-hidden min-w-[140px] bg-[#1B2A4A] border border-white/10">
            {contactsLinks.map(({ href, label }) => {
              const isActive = pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setContactsOpen(false)}
                  className={`block text-sm px-4 py-2 transition-colors ${
                    isActive
                      ? "bg-white/20 text-white font-medium"
                      : "text-blue-100 hover:text-white hover:bg-white/10"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </div>
        )}
      </div>

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
